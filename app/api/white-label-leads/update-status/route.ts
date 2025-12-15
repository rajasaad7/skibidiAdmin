import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { leadId, status } = await request.json();

    if (!leadId || !status) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and status are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('white_label_leads')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      lead: data
    });
  } catch (error) {
    console.error('Error updating white label lead status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update white label lead status' },
      { status: 500 }
    );
  }
}
