import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/kyc-check/update-status
// Body: { taskId, status: 'completed' | 'active', reviewNote? }
// 'completed' approves the KYC; 'active' sends it back to the publisher for re-submission.
export async function POST(request: NextRequest) {
  try {
    const { taskId, status, reviewNote } = await request.json();

    if (!taskId || !['completed', 'active'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const updateData: any = {
      status,
      reviewNote: reviewNote || null,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
    };
    // Sending back for changes keeps the prior documents intact; the publisher
    // adds MORE files per the note (submissions are append-only). We only flip the
    // status back to 'active' and attach the note.

    const { data, error } = await supabase
      .from('publisher_kyc_tasks')
      .update(updateData)
      .eq('_id', taskId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, task: data });
  } catch (error: any) {
    console.error('Error updating KYC task:', error);
    return NextResponse.json({ success: false, error: 'Failed to update KYC task' }, { status: 500 });
  }
}
