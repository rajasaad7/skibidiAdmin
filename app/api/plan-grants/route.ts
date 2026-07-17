import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';
import { sendTrueEmailer, formatPlanGrantedEmail } from '@/lib/email';

// The middleware exempts all /api/* routes, so every handler here MUST
// re-check auth explicitly. Never rely on the middleware.
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

const FREE_PLAN_KEYS = ['free-plan', 'price_free', '00f05224-a50b-464a-9563-77a5eef4f469'];

// GET: the paid plans for the grant picker + currently active admin plan grants.
export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [plansRes, grantsRes] = await Promise.all([
      supabase
        .from('plans')
        .select('paddleId, displayName, price, type, internalId')
        .neq('type', 'free')
        .order('internalId', { ascending: true }),
      supabase
        .from('organizations')
        .select('_id, name, billingMeta, updatedAt')
        .eq('billingMeta->>paymentProvider', 'admin_grant')
        .order('updatedAt', { ascending: false })
        .limit(100),
    ]);

    if (plansRes.error) {
      return NextResponse.json({ error: plansRes.error.message }, { status: 500 });
    }

    const grants = (grantsRes.data || []).map((org) => ({
      orgId: org._id,
      orgName: org.name,
      planName: org.billingMeta?.grantedPlanName || null,
      grantUntil: org.billingMeta?.grantUntil || null,
      grantedBy: org.billingMeta?.grantedBy || null,
      ownerEmail: org.billingMeta?.grantedToEmail || null,
    }));

    return NextResponse.json({ plans: plansRes.data || [], grants });
  } catch (e) {
    console.error('Plan grants GET error:', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

// POST: grant a monitoring plan to the org OWNED by a user, until a date.
// Body: { userId: email or users._id, planPaddleId, until: ISO date }.
// Writes billingMeta with paymentProvider 'admin_grant'; the daily
// expire_monitoring_plan_grants() pg_cron job reverts the org to Free after
// grantUntil passes. Never overwrites a live paid Stripe/Dodo subscription.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userInput = typeof body.userId === 'string' ? body.userId.trim() : '';
    const planPaddleId = typeof body.planPaddleId === 'string' ? body.planPaddleId.trim() : '';
    let until = typeof body.until === 'string' ? body.until.trim() : '';

    if (!userInput) {
      return NextResponse.json({ error: 'User email or id is required' }, { status: 400 });
    }
    if (!planPaddleId) {
      return NextResponse.json({ error: 'A plan is required' }, { status: 400 });
    }
    if (!until) {
      return NextResponse.json({ error: 'until date is required' }, { status: 400 });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      until = `${until}T23:59:59Z`;
    }
    const untilDate = new Date(until);
    if (isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: 'until is not a valid date' }, { status: 400 });
    }
    if (untilDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'until must be in the future' }, { status: 400 });
    }

    // Validate the plan against the real plans table (paddleId is the key the
    // app's plan resolution uses for non-Stripe/non-Dodo planIds).
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('paddleId, displayName, price, type')
      .eq('paddleId', planPaddleId)
      .neq('type', 'free')
      .maybeSingle();
    if (planErr) {
      return NextResponse.json({ error: planErr.message }, { status: 500 });
    }
    if (!plan) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    // Resolve the target user: "@" means email, otherwise users._id.
    const byEmail = userInput.includes('@');
    let query = supabase.from('users').select('_id, email, fullName');
    query = byEmail ? query.ilike('email', userInput) : query.eq('_id', userInput);
    const { data: matches, error: userErr } = await query.limit(2);
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }
    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: byEmail ? 'No user found with that email' : 'No user found with that id' },
        { status: 404 }
      );
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: 'Multiple users match that email; grant by user id instead' },
        { status: 400 }
      );
    }
    const user = matches[0];

    // The org the user OWNS (same join the Pro entitlement resolver uses).
    const { data: memberships, error: memErr } = await supabase
      .from('workspace_members')
      .select('workspaceId, workspaces!inner(organizationId)')
      .eq('userId', user._id)
      .eq('role', 'super_admin')
      .limit(1);
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }
    const orgId = (memberships?.[0]?.workspaces as { organizationId?: string } | null)?.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'This user does not own a workspace, so there is no organization to grant a plan to' }, { status: 400 });
    }

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('_id, billingMeta')
      .eq('_id', orgId)
      .maybeSingle();
    if (orgErr || !org) {
      return NextResponse.json({ error: orgErr?.message || 'Organization not found' }, { status: 500 });
    }

    // Never overwrite a live paid subscription from a real provider: that
    // customer is being billed and their billingMeta belongs to the webhook.
    const bm = (org.billingMeta || {}) as Record<string, unknown>;
    const provider = String(bm.paymentProvider || '');
    const status = String(bm.status || '');
    const currentPlanId = String(bm.planId || '');
    const hasPaidPlanId = !!currentPlanId && !FREE_PLAN_KEYS.includes(currentPlanId);
    if (['stripe', 'dodopayments'].includes(provider) && ['active', 'past_due'].includes(status) && hasPaidPlanId) {
      return NextResponse.json(
        { error: 'This user has a live paid subscription; granting would clash with their billing. Manage it through the provider instead.' },
        { status: 409 }
      );
    }

    const { error: updateErr } = await supabase
      .from('organizations')
      .update({
        billingMeta: {
          ...bm,
          status: 'active',
          pastDue: null,
          retries: null,
          planId: plan.paddleId,
          paymentProvider: 'admin_grant',
          grantUntil: untilDate.toISOString(),
          grantedBy: await getAdminEmail(),
          grantedAt: new Date().toISOString(),
          grantedPlanName: `${plan.displayName} (${plan.type})`,
          grantedToEmail: user.email,
        },
        updatedAt: new Date().toISOString(),
      })
      .eq('_id', orgId);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Granting a plan re-activates monitoring that a downgrade paused (same as
    // the paid-upgrade webhooks). Best effort: the grant stands even if this fails.
    try {
      const { data: orgWorkspaces } = await supabase
        .from('workspaces')
        .select('_id')
        .eq('organizationId', orgId);
      const wsIds = (orgWorkspaces || []).map((w) => w._id);
      if (wsIds.length) {
        await supabase
          .from('projects')
          .update({ disabled: false, updatedAt: new Date().toISOString() })
          .in('workspaceId', wsIds);
      }
    } catch (reenableError) {
      console.error('Plan grant project re-enable failed:', reenableError);
    }

    // Notify the user, best effort: a failed email must never fail the grant.
    let emailSent = false;
    if (user.email) {
      const untilText = untilDate.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
      const emailRes = await sendTrueEmailer({
        to: [{ email: user.email, ...(user.fullName ? { name: user.fullName } : {}) }],
        subject: `You have been granted the ${plan.displayName} plan`,
        htmlContent: formatPlanGrantedEmail({
          fullName: user.fullName,
          planName: plan.displayName,
          untilText,
        }),
        // Monitoring-product email: plain Linkwatcher sender name. The address
        // stays marketplace@ (verified sender that reliably lands in the inbox).
        senderName: 'Linkwatcher',
        senderEmail: 'marketplace@linkwatcher.io',
      }).catch((e) => {
        console.error('Plan granted email failed:', e);
        return { success: false as const };
      });
      emailSent = emailRes?.success === true;
    }

    return NextResponse.json({
      success: true,
      orgId,
      planName: plan.displayName,
      userEmail: user.email,
      emailSent,
    });
  } catch (e) {
    console.error('Plan grant error:', e);
    return NextResponse.json({ error: 'Failed to grant plan' }, { status: 500 });
  }
}
