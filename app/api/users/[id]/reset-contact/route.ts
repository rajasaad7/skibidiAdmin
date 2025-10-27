import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ contactDetails: null })
      .eq('_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Contact details reset successfully',
      user: data
    });
  } catch (error) {
    console.error('Error resetting contact details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset contact details' },
      { status: 500 }
    );
  }
}
