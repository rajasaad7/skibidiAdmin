import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('domains')
      .delete()
      .eq('_id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}
