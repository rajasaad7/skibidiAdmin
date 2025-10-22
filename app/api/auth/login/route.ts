import { NextRequest, NextResponse } from 'next/server';
import { setAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const validEmail = process.env.SUPER_ADMIN_EMAIL;
    const validPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (email === validEmail && password === validPassword) {
      await setAuth(email);
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
