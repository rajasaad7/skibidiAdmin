import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole } from '@/lib/auth';

// The middleware exempts all /api/* routes, so every handler here MUST
// re-check auth explicitly. Never rely on the middleware.
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

interface SubscriptionRow {
  _id: string;
  userId: string;
  source: string;
  status: string;
  dodoSubscriptionId: string | null;
  dodoCustomerId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  graceUntil: string | null;
  revokedBy: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  _id: string;
  email: string | null;
  fullName: string | null;
  isSuspended: boolean | null;
}

const VALID_STATUSES = ['active', 'past_due', 'cancelled', 'expired', 'revoked'];

// planIds that mean the org is on Free (paddleId of the Free plan + legacy keys).
const FREE_PLAN_KEYS = ['free-plan', 'price_free', 'free', '00f05224-a50b-464a-9563-77a5eef4f469'];

interface MonitoringPlan {
  name: string;
  provider: string | null;
  grantUntil: string | null;
}

// Monitoring plan per user: the plan on the org each user OWNS. Mirrors the
// app's resolvePlanFromBillingMeta id mapping: pdt_ resolves in dodo_plans,
// price_ in stripe_plans, anything else in plans.paddleId. Soft signal: any
// failure here must not break the subscriptions list, so errors log and the
// affected users just get no plan shown.
async function fetchMonitoringPlans(userIds: string[]): Promise<Map<string, MonitoringPlan>> {
  const planByUser = new Map<string, MonitoringPlan>();
  if (userIds.length === 0) return planByUser;

  try {
    const { data: memberships, error: memErr } = await supabase
      .from('workspace_members')
      .select('"userId", workspaces!inner(organizationId)')
      .eq('role', 'super_admin')
      .in('userId', userIds);
    if (memErr) throw new Error(memErr.message);

    const orgIdByUser = new Map<string, string>();
    for (const m of (memberships || []) as { userId: string; workspaces: { organizationId?: string } | null }[]) {
      const orgId = m.workspaces?.organizationId;
      if (orgId && !orgIdByUser.has(m.userId)) orgIdByUser.set(m.userId, orgId);
    }
    const orgIds = Array.from(new Set(orgIdByUser.values()));
    if (orgIds.length === 0) return planByUser;

    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('_id, "billingMeta"')
      .in('_id', orgIds);
    if (orgErr) throw new Error(orgErr.message);

    const metaByOrg = new Map<string, Record<string, unknown>>();
    const paidPlanIds = new Set<string>();
    for (const org of (orgs || []) as { _id: string; billingMeta: Record<string, unknown> | null }[]) {
      const bm = org.billingMeta || {};
      metaByOrg.set(org._id, bm);
      const planId = typeof bm.planId === 'string' ? bm.planId : '';
      if (planId && !FREE_PLAN_KEYS.includes(planId)) paidPlanIds.add(planId);
    }

    const ids = Array.from(paidPlanIds);
    const dodoIds = ids.filter((id) => id.startsWith('pdt_'));
    const stripeIds = ids.filter((id) => id.startsWith('price_'));
    const paddleIds = ids.filter((id) => !id.startsWith('pdt_') && !id.startsWith('price_'));

    const nameById = new Map<string, string>();
    // dodo_plans displayName already carries the interval ("Freelancer Monthly");
    // plans/stripe_plans need it appended from type.
    const withInterval = (displayName: string, type: string | null) =>
      type === 'monthly' ? `${displayName} Monthly` : type === 'yearly' ? `${displayName} Yearly` : displayName;

    const [dodoRes, stripeRes, paddleRes] = await Promise.all([
      dodoIds.length
        ? supabase.from('dodo_plans').select('"dodoId", "displayName"').in('dodoId', dodoIds)
        : Promise.resolve({ data: [], error: null }),
      stripeIds.length
        ? supabase.from('stripe_plans').select('"stripeId", "displayName", type').in('stripeId', stripeIds)
        : Promise.resolve({ data: [], error: null }),
      paddleIds.length
        ? supabase.from('plans').select('"paddleId", "displayName", type').in('paddleId', paddleIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const row of (dodoRes.data || []) as { dodoId: string; displayName: string }[]) {
      nameById.set(row.dodoId, row.displayName);
    }
    for (const row of (stripeRes.data || []) as { stripeId: string; displayName: string; type: string | null }[]) {
      nameById.set(row.stripeId, withInterval(row.displayName, row.type));
    }
    for (const row of (paddleRes.data || []) as { paddleId: string; displayName: string; type: string | null }[]) {
      nameById.set(row.paddleId, withInterval(row.displayName, row.type));
    }

    for (const [userId, orgId] of orgIdByUser) {
      const bm = metaByOrg.get(orgId) || {};
      const planId = typeof bm.planId === 'string' ? bm.planId : '';
      if (!planId || FREE_PLAN_KEYS.includes(planId)) {
        planByUser.set(userId, { name: 'Free', provider: null, grantUntil: null });
        continue;
      }
      planByUser.set(userId, {
        name: nameById.get(planId) || 'Unknown plan',
        provider: typeof bm.paymentProvider === 'string' ? bm.paymentProvider : null,
        grantUntil: typeof bm.grantUntil === 'string' ? bm.grantUntil : null,
      });
    }
  } catch (e) {
    console.error('Marketplace Pro list: monitoring plan lookup failed:', e);
  }
  return planByUser;
}

// The stored status can go stale: nothing flips a lapsed promo/admin grant to
// 'expired' in the table because entitlement is resolved by timestamp wall.
// Report what the resolver would actually decide so the UI never shows a
// dead grant as active.
function effectiveStatus(s: SubscriptionRow): string {
  if (!['active', 'past_due', 'cancelled'].includes(s.status)) return s.status;
  const walls = [s.currentPeriodEnd, s.graceUntil]
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime())
    .filter((t) => !isNaN(t));
  if (walls.length > 0 && Math.max(...walls) < Date.now()) return 'expired';
  return s.status;
}

// GET: list Marketplace Pro subscriptions joined with the owning user, plus
// each user's manual domain-unlock count over the last 7 days (abuse signal).
// Optional filters: ?search=<email or name fragment> and ?status=<status>.
export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // Strip characters that would break the PostgREST or() filter syntax.
    const search = (searchParams.get('search') || '').trim().replace(/[,()]/g, '');
    const status = (searchParams.get('status') || '').trim();

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    // When searching, resolve matching user ids first (email or name).
    let userIdFilter: string[] | null = null;
    if (search) {
      const { data: matched, error: searchErr } = await supabase
        .from('users')
        .select('_id')
        .or(`email.ilike.%${search}%,fullName.ilike.%${search}%`)
        .limit(300);

      if (searchErr) {
        return NextResponse.json({ error: searchErr.message }, { status: 500 });
      }
      userIdFilter = (matched || []).map((u: { _id: string }) => u._id);
      if (userIdFilter.length === 0) {
        return NextResponse.json({ subscriptions: [] });
      }
    }

    let query = supabase
      .from('marketplace_pro_subscriptions')
      .select('_id, "userId", source, status, "dodoSubscriptionId", "dodoCustomerId", "currentPeriodEnd", "cancelAtPeriodEnd", "graceUntil", "revokedBy", "revokedReason", "createdAt", "updatedAt"')
      .order('createdAt', { ascending: false })
      .limit(500);

    if (status) query = query.eq('status', status);
    if (userIdFilter) query = query.in('userId', userIdFilter);

    const { data: subs, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (subs || []) as SubscriptionRow[];
    const userIds = Array.from(new Set(rows.map((s) => s.userId).filter(Boolean)));

    // Attach user identity + weekly manual unlock counts + monitoring plan.
    const usersById = new Map<string, UserRow>();
    const unlockCounts = new Map<string, number>();
    let plansByUser = new Map<string, MonitoringPlan>();

    if (userIds.length > 0) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [usersRes, unlocksRes, fetchedPlans] = await Promise.all([
        supabase
          .from('users')
          .select('_id, email, "fullName", "isSuspended"')
          .in('_id', userIds),
        supabase
          .from('marketplace_domain_unlocks')
          .select('"userId"')
          .eq('source', 'manual')
          .gt('createdAt', weekAgo)
          .in('userId', userIds)
          .limit(20000),
        fetchMonitoringPlans(userIds),
      ]);
      plansByUser = fetchedPlans;

      if (usersRes.error) {
        return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
      }
      for (const u of (usersRes.data || []) as UserRow[]) {
        usersById.set(u._id, u);
      }

      // Unlock counts are a soft abuse signal; a failure here should not
      // break the whole list, so log and continue with zeros.
      if (unlocksRes.error) {
        console.error('Marketplace Pro list: unlock count query failed:', unlocksRes.error.message);
      } else {
        for (const row of (unlocksRes.data || []) as { userId: string }[]) {
          unlockCounts.set(row.userId, (unlockCounts.get(row.userId) || 0) + 1);
        }
      }
    }

    const subscriptions = rows.map((s) => {
      const user = usersById.get(s.userId);
      return {
        ...s,
        effectiveStatus: effectiveStatus(s),
        userEmail: user?.email || null,
        userFullName: user?.fullName || null,
        isSuspended: user?.isSuspended === true,
        weeklyManualUnlocks: unlockCounts.get(s.userId) || 0,
        monitoringPlan: plansByUser.get(s.userId) || null,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error('Marketplace Pro list error:', e);
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
  }
}
