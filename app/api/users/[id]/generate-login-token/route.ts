import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAuth } from '@/lib/auth';
import { randomBytes } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('_id, email, "fullName"')
      .eq('_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    const tokenId = `alt_${Date.now()}_${randomBytes(8).toString('hex')}`;

    // Token expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store the token in the database
    const { error: insertError } = await supabase
      .from('adminLoginTokens')
      .insert({
        id: tokenId,
        userId: user._id,
        token: token,
        expiresAt: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error creating login token:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create login token' },
        { status: 500 }
      );
    }

    // Return the token and login URL
    const loginUrl = `https://app.linkwatcher.io/admin-login?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      loginUrl,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Error generating login token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
