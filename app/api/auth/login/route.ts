import { NextRequest, NextResponse } from 'next/server';
import { setAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Check super admin credentials
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (email === superAdminEmail && password === superAdminPassword) {
      await setAuth(email, 'super_admin');
      return NextResponse.json({ success: true });
    }

    // Check colleague credentials
    const colleagueEmail = process.env.COLLEAGUE_ADMIN_EMAIL;
    const colleaguePassword = process.env.COLLEAGUE_ADMIN_PASSWORD;

    if (email === colleagueEmail && password === colleaguePassword) {
      await setAuth(email, 'colleague');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
