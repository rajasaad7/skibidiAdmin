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

interface DodoPayment {
  payment_id: string;
  status: string;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  invoice_id?: string | null;
  invoice_url?: string | null;
  subscription_id?: string | null;
}

// GET {base}/payments?subscription_id=... (shape verified against the Dodo
// API: items[] of payment_id, status, total_amount (minor units), currency,
// created_at, invoice_id, invoice_url). Inserts a marketplace_pro_receipts
// row for every succeeded payment the table does not know yet. Returns the
// number of rows added; never throws (the status sync already succeeded).
async function backfillReceipts(
  baseUrl: string,
  apiKey: string,
  sub: LocalSubscription
): Promise<number> {
  try {
    const url = `${baseUrl}/payments?subscription_id=${encodeURIComponent(sub.dodoSubscriptionId as string)}&page_size=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('Marketplace Pro resync: payments list failed HTTP', res.status);
      return 0;
    }
    const json = (await res.json()) as { items?: DodoPayment[] };
    const paid = (json.items || []).filter(
      (p) => p && p.payment_id && p.status === 'succeeded' && typeof p.total_amount === 'number'
    );
    if (paid.length === 0) return 0;

    const { data: existing, error: exErr } = await supabase
      .from('marketplace_pro_receipts')
      .select('"providerPaymentId"')
      .eq('provider', 'dodo')
      .in('providerPaymentId', paid.map((p) => p.payment_id));
    if (exErr) {
      console.error('Marketplace Pro resync: receipts lookup failed:', exErr.message);
      return 0;
    }
    const known = new Set((existing || []).map((r: { providerPaymentId: string }) => r.providerPaymentId));
    const rows = paid
      .filter((p) => !known.has(p.payment_id))
      .map((p) => ({
        userId: sub.userId,
        subscriptionId: sub._id,
        provider: 'dodo',
        providerPaymentId: p.payment_id,
        providerInvoiceId: p.invoice_id || null,
        amountMinor: Math.max(0, Math.round(p.total_amount as number)),
        currency: String(p.currency || 'USD').toUpperCase(),
        receiptUrl: p.invoice_url || `${baseUrl}/invoices/payments/${p.payment_id}`,
        paidAt: p.created_at || new Date().toISOString(),
      }));
    if (rows.length === 0) return 0;

    const { error: insErr } = await supabase
      .from('marketplace_pro_receipts')
      .upsert(rows, { onConflict: 'provider,providerPaymentId', ignoreDuplicates: true });
    if (insErr) {
      console.error('Marketplace Pro resync: receipts insert failed:', insErr.message);
      return 0;
    }
    return rows.length;
  } catch (e) {
    console.error('Marketplace Pro resync: receipt backfill error:', e);
    return 0;
  }
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

    // Backfill missing receipts from Dodo's payment list for this subscription.
    // Covers a payment.succeeded webhook that was missed or arrived out of
    // order (the initial payment of a new sub is stamped 1s BEFORE its
    // subscription.active event, which used to drop the receipt). Idempotent:
    // the (provider, providerPaymentId) unique index ignores existing rows.
    const receiptsAdded = await backfillReceipts(baseUrl, apiKey, sub);

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
        receiptsAdded,
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
      receiptsAdded,
    });
  } catch (e) {
    console.error('Marketplace Pro resync error:', e);
    return NextResponse.json({ error: 'Failed to resync subscription' }, { status: 500 });
  }
}
