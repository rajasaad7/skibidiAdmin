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

// GET: list the Marketplace Pro provider/admin events for one user,
// newest first, capped at 100. Query: ?userId=<users._id>.
export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = (searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('marketplace_pro_events')
      .select('_id, "userId", "dodoSubscriptionId", provider, "providerEventId", "providerEventAt", "eventType", "payloadSummary", "processingStatus", "createdAt"')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (e) {
    console.error('Marketplace Pro events error:', e);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}
