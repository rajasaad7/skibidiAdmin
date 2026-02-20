import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { refundPayout } from '@/lib/publisherBalanceHelper';

/**
 * Mark payout as failed and refund the amount back to publisher's balance
 * When a payout fails, we need to credit the amount back to the publisher
 */
export async function POST(request: NextRequest) {
  try {
    const { payoutId, reason } = await request.json();

    // First, get the payout details
    const { data: payout, error: fetchError } = await supabase
      .from('publisher_payouts')
      .select('"userId", amount, "payoutFee"')
      .eq('_id', payoutId)
      .single();

    if (fetchError) throw fetchError;
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Update payout status to failed
    const { error: updateError } = await supabase
      .from('publisher_payouts')
      .update({
        status: 'failed',
        notes: reason,
        "processedAt": new Date().toISOString()
      })
      .eq('_id', payoutId);

    if (updateError) throw updateError;

    // Refund the full amount (including fee) back to publisher's balance
    try {
      const requestedAmount = Number(payout.amount || 0);
      const fee = Number(payout.payoutFee || 0);

      await refundPayout(
        payout.userId,
        requestedAmount,
        fee,
        payoutId,
        `Payout failed: ${reason}`,
        { failureReason: reason, originalAmount: requestedAmount, originalFee: fee }
      );
    } catch (balanceError) {
      console.error('Error refunding balance:', balanceError);
      // Don't fail the request if balance refund fails - payout is already marked as failed
      // Admin can manually fix the balance if needed
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking payout as failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark payout as failed' },
      { status: 500 }
    );
  }
}
