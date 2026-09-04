import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabase } from '@/lib/supabase';
import { checkAuth, getUserRole } from '@/lib/auth';
import { hashPassword } from '@/lib/affiliate-auth';
import { getAffiliateStats } from '@/lib/affiliate-stats';
import { sendTrueEmailer, formatAffiliateWelcomeEmail } from '@/lib/email';

// Temporary password for a new affiliate: 12 chars from an alphabet without
// look-alikes (0/O, 1/l/I), emailed to the partner who must change it on first
// login. Never chosen by the admin.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generateTemporaryPassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i++) out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  return out;
}

async function requireSuperAdmin() {
  const ok = await checkAuth();
  if (!ok) return false;
  const role = await getUserRole();
  return role === 'super_admin';
}

// GET: list all affiliates with their live referral counts.
export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('affiliates')
    .select('id, name, email, "utmSource", "commissionRate", "isActive", "createdAt", "lastLoginAt"')
    .order('createdAt', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach referral totals per affiliate.
  const affiliates = await Promise.all(
    (data || []).map(async (a: any) => {
      try {
        const stats = await getAffiliateStats(a.utmSource);
        return { ...a, totalReferred: stats.total, verifiedReferred: stats.verified, last30Days: stats.last30Days };
      } catch {
        return { ...a, totalReferred: 0, verifiedReferred: 0, last30Days: 0 };
      }
    })
  );

  return NextResponse.json({ success: true, affiliates });
}

// POST: create a new affiliate.
export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const utmSource = String(body.utmSource || '').trim();
    const commissionRate = Number(body.commissionRate) || 0;

    if (!name || !email || !utmSource) {
      return NextResponse.json({ error: 'Name, email and utm_source are required' }, { status: 400 });
    }
    const password = generateTemporaryPassword();
    if (/\s/.test(utmSource)) {
      return NextResponse.json({ error: 'utm_source cannot contain spaces' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        name,
        email,
        utmSource,
        commissionRate,
        // Legacy scrypt column (kept non-null for back-compat). The bcrypt hash
        // set below via the DB RPC is the source of truth the partner portal
        // verifies against.
        passwordHash: hashPassword(password),
      })
      .select('id, name, email, "utmSource", "commissionRate", "isActive", "createdAt"')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An affiliate with that email or utm_source already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Set the bcrypt password in Postgres (what the affiliate portal logs in with).
    const { error: pwErr } = await supabase.rpc('set_affiliate_password', {
      p_affiliate_id: data.id,
      p_password: password,
    });
    if (pwErr) {
      // Roll back the affiliate so we don't leave one that can't log in.
      await supabase.from('affiliates').delete().eq('id', data.id);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // Welcome email with the portal login link + initial credentials. Best
    // effort: the affiliate exists either way, the UI reports whether it went out.
    let emailSent = false;
    try {
      const result = await sendTrueEmailer({
        to: [{ email, name }],
        subject: 'Welcome to the LinkWatcher Affiliate Program',
        htmlContent: formatAffiliateWelcomeEmail({ name, email, password }),
        senderName: 'Linkwatcher Affiliates',
        senderEmail: 'no-reply@linkwatcher.io',
        replyTo: 'support@linkwatcher.io',
      });
      emailSent = !!result.success;
      if (!result.success) console.error('Affiliate welcome email failed:', result.error);
    } catch (e) {
      console.error('Affiliate welcome email error:', e);
    }

    // If the email did not go out the admin has no other way to see the temporary
    // password, so return it (once) for manual hand-off; never on success.
    return NextResponse.json({
      success: true,
      affiliate: data,
      emailSent,
      ...(emailSent ? {} : { temporaryPassword: password }),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create affiliate' }, { status: 500 });
  }
}

// PATCH: update an affiliate (toggle active, reset password, edit commission/name).
export async function PATCH(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const update: Record<string, any> = {};
    if (typeof body.isActive === 'boolean') update.isActive = body.isActive;
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (body.commissionRate !== undefined) update.commissionRate = Number(body.commissionRate) || 0;

    const resetPassword = typeof body.password === 'string' && body.password;
    if (resetPassword && body.password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (resetPassword) {
      // Keep the legacy scrypt column in sync; bcrypt (set below) is the source
      // of truth the partner portal logs in with.
      update.passwordHash = hashPassword(body.password);
    }

    if (Object.keys(update).length === 0 && !resetPassword) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from('affiliates').update(update).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (resetPassword) {
      const { error: pwErr } = await supabase.rpc('set_affiliate_password', {
        p_affiliate_id: id,
        p_password: body.password,
      });
      if (pwErr) return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update affiliate' }, { status: 500 });
  }
}
