import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { payoutId, transactionId, notes } = await request.json();

    const updateData: any = {
      status: 'completed',
      processedAt: new Date().toISOString()
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('publisher_payouts')
      .update(updateData)
      .eq('_id', payoutId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking payout as paid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark payout as paid' },
      { status: 500 }
    );
  }
}
