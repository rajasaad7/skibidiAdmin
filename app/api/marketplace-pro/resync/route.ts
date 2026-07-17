import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';

// The middleware exempts all /api/* routes, so every handler here MUST
// re-check auth explicitly. Never rely on the middleware.
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

// This repo has no Dodo SDK/client, so we do a minimal REST fetch. Endpoint
// and payload shape verified against the dodopayments SDK the app repo uses:
// GET {base}/subscriptions/{subscription_id} with Bearer auth, where base is
// https://live.dodopayments.com (live_mode) or https://test.dodopayments.com
// (test_mode / sandbox). Response carries status, next_billing_date and
// cancel_at_next_billing_date.
const DODO_BASE_URLS = {
  live: 'https://live.dodopayments.com',
  sandbox: 'https://test.dodopayments.com',
} as const;

// Dodo subscription statuses: pending | active | on_hold | cancelled |
// failed | expired. 'pending' has no local equivalent, so on pending we
// keep the local status untouched and only sync the other fields.
const DODO_STATUS_MAP: Record<string, string> = {
  active: 'active',
  on_hold: 'past_due',
  failed: 'past_due',
  cancelled: 'cancelled',
  expired: 'expired',
};

interface DodoSubscription {
  subscription_id: string;
  status: string;
  next_billing_date?: string | null;
  current_period_end?: string | null;
  cancel_at_next_billing_date?: boolean | null;
}

interface LocalSubscription {
  _id: string;
  userId: string;
  source: string;
  status: string;
  dodoSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
}

// POST: force-sync a local Dodo subscription row from the Dodo API.
// Body: { userId } OR { dodoSubscriptionId }. Records a synthetic
// admin_resync row in marketplace_pro_events for auditability.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const dodoSubscriptionId = typeof body.dodoSubscriptionId === 'string' ? body.dodoSubscriptionId.trim() : '';

    if (!userId && !dodoSubscriptionId) {
      return NextResponse.json({ error: 'userId or dodoSubscriptionId is required' }, { status: 400 });
    }

    // Locate the local Dodo-sourced subscription row.
    let query = supabase
      .from('marketplace_pro_subscriptions')
      .select('_id, "userId", source, status, "dodoSubscriptionId", "currentPeriodEnd", "cancelAtPeriodEnd"')
      .eq('source', 'dodo')
      .order('updatedAt', { ascending: false })
      .limit(1);
    query = dodoSubscriptionId
      ? query.eq('dodoSubscriptionId', dodoSubscriptionId)
      : query.eq('userId', userId);

    const { data: rows, error: findErr } = await query;
    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    const sub = (rows?.[0] || null) as LocalSubscription | null;
    if (!sub) {
      return NextResponse.json({ error: 'No Dodo-sourced subscription found' }, { status: 404 });
    }
    if (!sub.dodoSubscriptionId) {
      return NextResponse.json({ error: 'Local row has no dodoSubscriptionId to sync from' }, { status: 400 });
    }

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      // TODO: set DODO_PAYMENTS_API_KEY (and optionally
      // NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT=sandbox for test mode) in this
      // admin deployment to enable manual resync.
      return NextResponse.json(
        { error: 'Manual resync not configured: DODO_PAYMENTS_API_KEY is not set in this admin environment' },
        { status: 501 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT === 'sandbox'
      ? DODO_BASE_URLS.sandbox
      : DODO_BASE_URLS.live;

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(sub.dodoSubscriptionId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
    } catch (fetchErr) {
      console.error('Dodo resync fetch failed:', fetchErr);
      return NextResponse.json({ error: 'Could not reach the Dodo API (timeout or network error)' }, { status: 502 });
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: 'Dodo does not know this subscription id; local row left unchanged' },
        { status: 404 }
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Dodo API error (HTTP ${res.status})` }, { status: 502 });
    }

    const remote = (await res.json()) as DodoSubscription;
    const mappedStatus = DODO_STATUS_MAP[remote.status] || null;
    const periodEnd = remote.next_billing_date || remote.current_period_end || null;
    const cancelAtPeriodEnd = remote.cancel_at_next_billing_date === true;

    const update: Record<string, unknown> = {
      cancelAtPeriodEnd,
      updatedAt: new Date().toISOString(),
    };
    if (mappedStatus) update.status = mappedStatus;
    if (periodEnd) update.currentPeriodEnd = periodEnd;
    // A confirmed-healthy subscription no longer needs a payment grace window.
    if (mappedStatus === 'active') update.graceUntil = null;

    const { error: updErr } = await supabase
      .from('marketplace_pro_subscriptions')
      .update(update)
      .eq('_id', sub._id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Synthetic audit event so the resync shows up in the user's event log.
    const { error: eventErr } = await supabase.from('marketplace_pro_events').insert({
      userId: sub.userId,
      dodoSubscriptionId: sub.dodoSubscriptionId,
      provider: 'dodo',
      providerEventId: `admin_resync:${sub._id}:${Date.now()}`,
      providerEventAt: new Date().toISOString(),
      eventType: 'admin_resync',
      payloadSummary: {
        resyncedBy: await getAdminEmail(),
        remoteStatus: remote.status,
        previousStatus: sub.status,
        appliedStatus: mappedStatus || sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
      },
      processingStatus: 'processed',
    });
    if (eventErr) {
      // The sync itself succeeded; just log the missing audit row.
      console.error('Marketplace Pro resync: audit event insert failed:', eventErr.message);
    }

    return NextResponse.json({
      success: true,
      remoteStatus: remote.status,
      previousStatus: sub.status,
      status: mappedStatus || sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
    });
  } catch (e) {
    console.error('Marketplace Pro resync error:', e);
    return NextResponse.json({ error: 'Failed to resync subscription' }, { status: 500 });
  }
}
