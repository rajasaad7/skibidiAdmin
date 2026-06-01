import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Move a payout from "pending" to "processing".
 * No balance changes here — the balance was already deducted when the
 * payout request was created. This is purely a status transition the admin
 * uses to mark a request as in progress while making the transfer.
 */
export async function POST(request: NextRequest) {
  try {
    const { payoutId } = await request.json();

    if (!payoutId) {
      return NextResponse.json(
        { success: false, error: 'payoutId is required' },
        { status: 400 }
      );
    }

    // Only pending payouts can move to processing.
    const { data: payout, error: fetchError } = await supabase
      .from('publisher_payouts')
      .select('_id, status')
      .eq('_id', payoutId)
      .single();

    if (fetchError) throw fetchError;
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot move a ${payout.status} payout to processing` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('publisher_payouts')
      .update({ status: 'processing' })
      .eq('_id', payoutId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking payout as processing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark payout as processing' },
      { status: 500 }
    );
  }
}
