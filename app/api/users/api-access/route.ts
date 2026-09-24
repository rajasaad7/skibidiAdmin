import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole, getAdminEmail } from '@/lib/auth';
import { sendTrueEmailer, formatApiAccessEnabledEmail } from '@/lib/email';

// Partner API access toggle (per user). The middleware exempts /api/*, so this
// handler re-checks auth itself and is super_admin only.
//
// GET  ?userId=   -> { enabled, grantedAt, grantedBy, keys[], events[] }
// POST { userId, enabled } -> enable (stamps grantedAt/By, emails the user) or
//      disable (also revokes every active key so stolen keys die with it).
async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = request.nextUrl.searchParams.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  try {
    const [{ data: user, error: userErr }, { data: keys }, { data: events }] = await Promise.all([
      supabase.from('users').select('_id, apiAccessEnabled, apiAccessGrantedAt, apiAccessGrantedBy').eq('_id', userId).maybeSingle(),
      supabase.from('marketplace_api_keys')
        .select('_id, name, keyPrefix, scopes, ipAllowlist, dailySpendCapUsd, maxOrderUsd, expiresAt, createdAt, lastUsedAt, lastUsedIp, revokedAt, revokedBy')
        .eq('userId', userId).order('createdAt', { ascending: false }).limit(50),
      supabase.from('marketplace_api_key_events')
        .select('_id, keyId, type, ip, detail, createdAt')
        .eq('userId', userId).order('createdAt', { ascending: false }).limit(30),
    ]);
    if (userErr) throw userErr;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({
      success: true,
      enabled: !!user.apiAccessEnabled,
      grantedAt: user.apiAccessGrantedAt || null,
      grantedBy: user.apiAccessGrantedBy || null,
      keys: keys || [],
      events: events || [],
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

    // Disable: flag off + revoke every active key.
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
