import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, status } = body;

    if (!contactId || !status) {
      return NextResponse.json(
        { success: false, error: 'Contact ID and status are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contacts')
      .update({ status })
      .eq('_id', contactId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      contact: data
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact status' },
      { status: 500 }
    );
  }
}
