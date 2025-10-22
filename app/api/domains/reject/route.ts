import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('domains')
      .update({ verificationStatus: 'rejected' })
      .eq('_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject domain' },
      { status: 500 }
    );
  }
}
