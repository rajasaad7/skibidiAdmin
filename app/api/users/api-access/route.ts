import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';
import { sendTrueEmailer, formatApiAccessEnabledEmail } from '@/lib/email';

// Partner API access per user (super_admin only; the middleware exempts /api/*).
//
// GET  ?userId=&page=&limit=&keyId=&type=
//      -> { enabled, grantedAt, grantedBy, keys[], stats, orders[], events[], eventsPagination }
//      keyId may be "__account__" for events without a key (admin enable/disable).
// POST { userId, enabled } -> enable (stamps grantedAt/By, emails the user) or
//      disable (also revokes every active key so stolen keys die with it).
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

const EVENT_TYPES = [
  'key.created', 'key.revoked',
  'auth.ip_rejected', 'auth.scope_rejected', 'auth.expired',
  'order.placed', 'order.cap_hit',
  'admin.enabled', 'admin.disabled',
];

export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const userId = sp.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '25', 10) || 25));
  const keyId = sp.get('keyId')?.trim() || '';
  const type = sp.get('type')?.trim() || '';
  if (keyId && keyId !== '__account__' && !/^[A-Za-z0-9_-]{1,80}$/.test(keyId)) {
    return NextResponse.json({ error: 'Invalid keyId' }, { status: 400 });
  }
  if (type && !EVENT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    let eventsQuery = supabase
      .from('marketplace_api_key_events')
      .select('_id, keyId, type, ip, detail, createdAt', { count: 'exact' })
      .eq('userId', userId);
    if (keyId === '__account__') eventsQuery = eventsQuery.is('keyId', null);
    else if (keyId) eventsQuery = eventsQuery.eq('keyId', keyId);
    if (type) eventsQuery = eventsQuery.eq('type', type);
    const offset = (page - 1) * limit;

    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [
      { data: user, error: userErr },
      { data: keys },
      { data: events, count: eventsTotal },
      { data: orders },
      { data: paidApiOrders },
      { count: apiOrdersCount },
    ] = await Promise.all([
      supabase.from('users').select('_id, apiAccessEnabled, apiAccessGrantedAt, apiAccessGrantedBy').eq('_id', userId).maybeSingle(),
      supabase.from('marketplace_api_keys')
        .select('_id, name, keyPrefix, scopes, ipAllowlist, dailySpendCapUsd, maxOrderUsd, expiresAt, createdAt, lastUsedAt, lastUsedIp, revokedAt, revokedBy')
        .eq('userId', userId).order('createdAt', { ascending: false }).limit(50),
      eventsQuery.order('createdAt', { ascending: false }).range(offset, offset + limit - 1),
      supabase.from('marketplace_orders')
        .select('_id, orderNumber, status, totalPrice, createdAt, paidAt, completedAt, metadata, domains(domainName)')
        .eq('buyerId', userId).eq('orderSource', 'api').order('createdAt', { ascending: false }).limit(50),
      supabase.from('marketplace_orders')
        .select('totalPrice, paidAt, metadata')
        .eq('buyerId', userId).eq('orderSource', 'api').not('paidAt', 'is', null),
      supabase.from('marketplace_orders')
        .select('_id', { count: 'exact', head: true })
        .eq('buyerId', userId).eq('orderSource', 'api'),
    ]);
    if (userErr) throw userErr;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const paid = (paidApiOrders || []) as Array<{ totalPrice: string | number; paidAt: string; metadata: any }>;
    const spend24hByKey: Record<string, number> = {};
    let spend24h = 0;
    let spendTotal = 0;
    for (const o of paid) {
      const amount = Number(o.totalPrice) || 0;
      spendTotal += amount;
      // paidAt is stored as UTC without a zone marker; treat it as UTC.
      const paidIso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(o.paidAt) ? o.paidAt : `${o.paidAt.replace(' ', 'T')}Z`;
      if (paidIso >= since24h) {
        spend24h += amount;
        const k = o.metadata?.apiKeyId;
        if (k) spend24hByKey[k] = (spend24hByKey[k] || 0) + amount;
      }
    }
    const keyRows = (keys || []).map((k: any) => ({ ...k, spend24h: spend24hByKey[k._id] || 0 }));
    const activeKeys = keyRows.filter((k: any) => !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length;
    const lastUsedAt = keyRows.reduce((m: string | null, k: any) => (k.lastUsedAt && (!m || k.lastUsedAt > m) ? k.lastUsedAt : m), null);

    const total = eventsTotal || 0;
    return NextResponse.json({
      success: true,
      enabled: !!user.apiAccessEnabled,
      grantedAt: user.apiAccessGrantedAt || null,
      grantedBy: user.apiAccessGrantedBy || null,
      keys: keyRows,
      stats: {
        activeKeys,
        revokedKeys: keyRows.filter((k: any) => k.revokedAt).length,
        apiOrders: apiOrdersCount || 0,
        spend24h: Math.round(spend24h * 100) / 100,
        spendTotal: Math.round(spendTotal * 100) / 100,
        lastUsedAt,
      },
      orders: orders || [],
      events: events || [],
      eventsPagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      eventTypes: EVENT_TYPES,
    });
  } catch (error: any) {
    console.error('api-access GET failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load API access' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const enabled = body.enabled === true;
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const adminEmail = await getAdminEmail();

    const { data: user, error: userErr } = await supabase
      .from('users').select('_id, email, fullName, isSuspended, apiAccessEnabled').eq('_id', userId).maybeSingle();
    if (userErr) throw userErr;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (enabled) {
      if (user.isSuspended) {
        return NextResponse.json({ error: 'Cannot enable API access on a suspended account' }, { status: 409 });
      }
      const { error: updErr } = await supabase
        .from('users')
        .update({ apiAccessEnabled: true, apiAccessGrantedAt: new Date().toISOString(), apiAccessGrantedBy: adminEmail })
        .eq('_id', userId);
      if (updErr) throw updErr;

      await supabase.rpc('api_log_event', {
        p_key_id: null, p_user_id: userId, p_type: 'admin.enabled', p_ip: null, p_detail: { by: adminEmail },
      });

      let emailSent = false;
      if (user.email) {
        try {
          await sendTrueEmailer({
            to: [{ email: user.email, name: user.fullName || undefined }],
            subject: 'Partner API access is enabled on your LinkWatcher account',
            senderName: 'LinkWatcher Marketplace',
            senderEmail: 'marketplace@linkwatcher.io',
            replyTo: 'support@linkwatcher.io',
            htmlContent: formatApiAccessEnabledEmail({ fullName: user.fullName }),
          });
          emailSent = true;
        } catch (mailErr) {
          console.error('API access enabled email failed (non-blocking):', mailErr);
        }
      }
      return NextResponse.json({ success: true, enabled: true, emailSent });
    }

    const { error: updErr } = await supabase
      .from('users').update({ apiAccessEnabled: false }).eq('_id', userId);
    if (updErr) throw updErr;
    const { data: revoked, error: revErr } = await supabase
      .from('marketplace_api_keys')
      .update({ revokedAt: new Date().toISOString(), revokedBy: adminEmail })
      .eq('userId', userId)
      .is('revokedAt', null)
      .select('_id');
    if (revErr) throw revErr;

    await supabase.rpc('api_log_event', {
      p_key_id: null, p_user_id: userId, p_type: 'admin.disabled', p_ip: null,
      p_detail: { by: adminEmail, revokedKeys: (revoked || []).length },
    });

    return NextResponse.json({ success: true, enabled: false, revokedKeys: (revoked || []).length });
  } catch (error: any) {
    console.error('api-access POST failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update API access' }, { status: 500 });
  }
}
