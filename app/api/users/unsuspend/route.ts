import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user suspension status - set to false and clear reason and timestamp
    const { data, error } = await supabase
      .from('users')
      .update({
        "isSuspended": false,
        "suspensionReason": null,
        "suspendedAt": null,
      })
      .eq('_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error unsuspending user:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsuspend user' },
      { status: 500 }
    );
  }
}
