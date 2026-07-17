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

// POST: grant Marketplace Pro to a user via the admin_grant_marketplace_pro
// RPC. Body: { userId, source: 'promo' | 'admin', until: ISO date }.
// The grantedBy audit field always comes from the admin session cookie.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim() : '';
    let until = typeof body.until === 'string' ? body.until.trim() : '';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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

    // Friendly error when the user id does not exist.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('_id, email')
      .eq('_id', userId)
      .maybeSingle();
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: 'No user found with that id' }, { status: 404 });
    }

    const { data, error } = await supabase.rpc('admin_grant_marketplace_pro', {
      p_user_id: userId,
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

    return NextResponse.json({ success: true, subscriptionId: result.subscriptionId });
  } catch (e) {
    console.error('Marketplace Pro grant error:', e);
    return NextResponse.json({ error: 'Failed to grant Pro' }, { status: 500 });
  }
}
