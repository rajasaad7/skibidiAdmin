import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { payoutId, reason } = await request.json();

    const { error } = await supabase
      .from('publisher_payouts')
      .update({
        status: 'failed',
        notes: reason,
        processedAt: new Date().toISOString()
      })
      .eq('_id', payoutId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking payout as failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark payout as failed' },
      { status: 500 }
    );
  }
}
