import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('domains')
      .update({ verificationStatus: 'verified' })
      .eq('_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve domain' },
      { status: 500 }
    );
  }
}
