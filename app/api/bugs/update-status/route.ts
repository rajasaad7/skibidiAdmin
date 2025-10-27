import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bugId, status, priority } = body;

    if (!bugId) {
      return NextResponse.json(
        { success: false, error: 'Bug ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .update(updateData)
      .eq('id', bugId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      bug: data
    });
  } catch (error) {
    console.error('Error updating bug report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bug report' },
      { status: 500 }
    );
  }
}
