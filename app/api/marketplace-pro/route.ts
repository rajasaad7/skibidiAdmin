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

    // Attach user identity + weekly manual unlock counts.
    const usersById = new Map<string, UserRow>();
    const unlockCounts = new Map<string, number>();

    if (userIds.length > 0) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [usersRes, unlocksRes] = await Promise.all([
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
      ]);

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
        userEmail: user?.email || null,
        userFullName: user?.fullName || null,
        isSuspended: user?.isSuspended === true,
        weeklyManualUnlocks: unlockCounts.get(s.userId) || 0,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error('Marketplace Pro list error:', e);
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
  }
}
