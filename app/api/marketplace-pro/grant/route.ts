import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';
import { sendTrueEmailer, formatProGrantedEmail } from '@/lib/email';

// The middleware exempts all /api/* routes, so every handler here MUST
// re-check auth explicitly. Never rely on the middleware.
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

// POST: grant Marketplace Pro to a user via the admin_grant_marketplace_pro
// RPC. Body: { userId, source: 'promo' | 'admin', until: ISO date }, where
// userId accepts either a users._id or the user's email (anything containing
// "@" is treated as an email and resolved to the id here).
// The grantedBy audit field always comes from the admin session cookie.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userInput = typeof body.userId === 'string' ? body.userId.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim() : '';
    let until = typeof body.until === 'string' ? body.until.trim() : '';

    if (!userInput) {
      return NextResponse.json({ error: 'User email or id is required' }, { status: 400 });
    }
    if (source !== 'promo' && source !== 'admin') {
      return NextResponse.json({ error: 'source must be promo or admin' }, { status: 400 });
    }
    if (!until) {
      return NextResponse.json({ error: 'until date is required' }, { status: 400 });
    }

    // A bare YYYY-MM-DD from a date picker means "through that day" (UTC).
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

    // Resolve the target user: an "@" means email (case-insensitive exact
    // match), anything else is treated as a users._id. Friendly errors either way.
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

    // Warn before granting to a user who already has Pro through a PAID source
    // (their own Dodo subscription, or Pro bundled with a paid monitoring plan):
    // the grant would be redundant. The admin can resend with confirm: true to
    // proceed anyway. Best effort: a resolver failure never blocks the grant.
    if (body.confirm !== true) {
      const { data: resolved, error: resolveErr } = await supabase.rpc('resolve_marketplace_pro', {
        p_user_id: user._id,
      });
      if (resolveErr) {
        console.error('resolve_marketplace_pro pre-grant check failed:', resolveErr.message);
      } else {
        const pro = resolved as { isPro?: boolean; source?: string | null; until?: string | null } | null;
        if (pro?.isPro && (pro.source === 'subscription' || pro.source === 'plan')) {
          const untilText = pro.until
            ? new Date(pro.until).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })
            : null;
          const warning =
            pro.source === 'subscription'
              ? `${user.email} already has an active PAID Pro subscription${untilText ? ` (current period ends ${untilText} UTC)` : ''}. A grant is redundant.`
              : `${user.email} already gets Pro bundled with a paid monitoring plan. A grant is redundant.`;
          return NextResponse.json(
            { requiresConfirmation: true, warning, proSource: pro.source, proUntil: pro.until, userEmail: user.email },
            { status: 409 }
          );
        }
      }
    }

    const { data, error } = await supabase.rpc('admin_grant_marketplace_pro', {
      p_user_id: user._id,
      p_source: source,
      p_until: untilDate.toISOString(),
      p_granted_by: await getAdminEmail(),
    });

    if (error) {
      console.error('admin_grant_marketplace_pro failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as { success?: boolean; subscriptionId?: string; error?: string } | null;
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Grant failed' }, { status: 400 });
    }

    // Notify the user, best effort: a failed email must never fail the grant.
    // Same template + sender identity as the app's Pro lifecycle emails.
    let emailSent = false;
    if (user.email) {
      const untilText = untilDate.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
      const emailRes = await sendTrueEmailer({
        to: [{ email: user.email, ...(user.fullName ? { name: user.fullName } : {}) }],
        subject: 'You have been granted Marketplace Pro',
        htmlContent: formatProGrantedEmail({ fullName: user.fullName, untilText }),
        // marketplace@ instead of no-reply@: no-reply senders skew Gmail toward
        // the Promotions tab, and this is an account notice the user must see.
        senderName: 'Linkwatcher Marketplace',
        senderEmail: 'marketplace@linkwatcher.io',
      }).catch((e) => {
        console.error('Pro granted email failed:', e);
        return { success: false as const };
      });
      emailSent = emailRes?.success === true;
    }

    return NextResponse.json({ success: true, subscriptionId: result.subscriptionId, userEmail: user.email, emailSent });
  } catch (e) {
    console.error('Marketplace Pro grant error:', e);
    return NextResponse.json({ error: 'Failed to grant Pro' }, { status: 500 });
  }
}
