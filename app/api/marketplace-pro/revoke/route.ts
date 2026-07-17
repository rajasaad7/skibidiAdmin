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

// POST: revoke a Marketplace Pro subscription via the
// admin_revoke_marketplace_pro RPC. Body: { subscriptionId, reason }.
// The revokedBy audit field always comes from the admin session cookie.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'A revoke reason is required' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('admin_revoke_marketplace_pro', {
      p_subscription_id: subscriptionId,
      p_reason: reason,
      p_revoked_by: await getAdminEmail(),
    });

    if (error) {
      console.error('admin_revoke_marketplace_pro failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as { success?: boolean; userId?: string; error?: string } | null;
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Revoke failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: result.userId });
  } catch (e) {
    console.error('Marketplace Pro revoke error:', e);
    return NextResponse.json({ error: 'Failed to revoke Pro' }, { status: 500 });
  }
}
