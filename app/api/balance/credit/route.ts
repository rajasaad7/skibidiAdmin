import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';

// Manual buyer wallet credit (e.g. the buyer paid by bank transfer outside the
// app). The middleware exempts all /api/* routes, so every handler here MUST
// re-check auth explicitly. Super admins only: this moves money.
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

const PAYMENT_METHODS = ['bank_transfer', 'paypal', 'crypto', 'other'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'bank transfer',
  paypal: 'PayPal',
  crypto: 'crypto',
  other: 'manual payment',
};

// Resolve "@" input as email, otherwise users._id. Returns at most 2 rows so an
// ambiguous email (should never happen, emails are unique) is detectable.
async function resolveUser(userInput: string) {
  const byEmail = userInput.includes('@');
  let query = supabase.from('users').select('_id, email, fullName, isSuspended');
  query = byEmail ? query.ilike('email', userInput) : query.eq('_id', userInput);
  const { data: matches, error } = await query.limit(2);
  if (error) return { error: error.message, status: 500 as const };
  if (!matches || matches.length === 0) {
    return {
      error: byEmail ? 'No user found with that email' : 'No user found with that id',
      status: 404 as const,
    };
  }
  if (matches.length > 1) {
    return { error: 'More than one user matched, use the user id instead', status: 409 as const };
  }
  return { user: matches[0] };
}

// GET ?q=<email or users._id>: preview the target before crediting
// (name, email, current wallet balance).
export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json({ success: false, error: 'q is required' }, { status: 400 });
  }

  const resolved = await resolveUser(q);
  if ('error' in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }

  const { data: balanceRow, error: balErr } = await supabase
    .from('user_balances')
    .select('balance, "totalAdded"')
    .eq('userId', resolved.user._id)
    .maybeSingle();
  if (balErr) {
    return NextResponse.json({ success: false, error: balErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: {
      _id: resolved.user._id,
      email: resolved.user.email,
      fullName: resolved.user.fullName,
      isSuspended: !!resolved.user.isSuspended,
      balance: Number(balanceRow?.balance || 0),
      totalAdded: Number(balanceRow?.totalAdded || 0),
    },
  });
}

// POST { userId: email or users._id, amount, method, reference?, note?, requestId }
// Credits the wallet through the atomic + idempotent admin_credit_user_balance
// RPC (SECURITY DEFINER, service_role only). requestId is generated once per
// modal open on the client so a double-click / retry never double-credits.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userInput = typeof body.userId === 'string' ? body.userId.trim() : '';
    const amount = Number(body.amount);
    const method: PaymentMethod = PAYMENT_METHODS.includes(body.method) ? body.method : 'other';
    const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 200) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';

    if (!userInput) {
      return NextResponse.json({ success: false, error: 'User email or id is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (amount > 100000) {
      return NextResponse.json({ success: false, error: 'Amount exceeds the single-credit cap ($100,000)' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) {
      return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
    }
    // Money is stored with 2 decimals; reject sub-cent input instead of silently rounding.
    const rounded = Math.round(amount * 100) / 100;
    if (Math.abs(rounded - amount) > 1e-9) {
      return NextResponse.json({ success: false, error: 'Amount can have at most 2 decimal places' }, { status: 400 });
    }

    const resolved = await resolveUser(userInput);
    if ('error' in resolved) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
    }
    const user = resolved.user;

    const adminEmail = await getAdminEmail();
    const description = `Balance top-up via ${METHOD_LABELS[method]} (added by Linkwatcher)${reference ? ` · Ref ${reference}` : ''}`;

    const { data, error } = await supabase.rpc('admin_credit_user_balance', {
      p_user_id: user._id,
      p_amount: rounded,
      p_description: description,
      p_metadata: {
        requestId,
        paymentMethod: method,
        reference: reference || null,
        note: note || null,
        adminEmail,
        creditedAt: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('admin_credit_user_balance error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to credit balance' },
        { status: 500 }
      );
    }

    const result = (data || {}) as {
      alreadyApplied?: boolean;
      transactionId?: string;
      amount?: number;
      balanceBefore?: number;
      balanceAfter?: number;
    };

    return NextResponse.json({
      success: true,
      alreadyApplied: !!result.alreadyApplied,
      transactionId: result.transactionId || null,
      user: { _id: user._id, email: user.email, fullName: user.fullName },
      amount: Number(result.amount ?? rounded),
      balanceBefore: Number(result.balanceBefore ?? 0),
      balanceAfter: Number(result.balanceAfter ?? 0),
    });
  } catch (e) {
    console.error('Balance credit POST error:', e);
    return NextResponse.json({ success: false, error: 'Failed to credit balance' }, { status: 500 });
  }
}
