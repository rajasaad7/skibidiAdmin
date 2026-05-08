import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { refundPayout } from '@/lib/publisherBalanceHelper';

/**
 * Mark a payout as failed and refund the deducted amount (payout + fee)
 * back to the publisher's balance.
 *
 * Order of operations: refund first, then flip status to 'failed'. If the
 * refund fails the payout stays in its prior state so an admin can retry,
 * rather than ending up marked failed with no money returned to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const payoutId = typeof body?.payoutId === 'string' ? body.payoutId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!payoutId) {
      return NextResponse.json(
        { success: false, error: 'payoutId is required' },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'reason is required' },
        { status: 400 }
      );
    }

    const { data: payout, error: fetchError } = await supabase
      .from('publisher_payouts')
      .select('"userId", amount, "payoutFee", status, "payoutTransactionId", "feeTransactionId"')
      .eq('_id', payoutId)
      .single();

    if (fetchError) throw fetchError;
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.status === 'failed') {
      return NextResponse.json(
        { success: false, error: 'Payout is already marked as failed' },
        { status: 400 }
      );
    }
    if (payout.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot fail a completed payout' },
        { status: 400 }
      );
    }

    // Source of truth for what was actually deducted is the ledger, not the
    // payout row's amount/payoutFee columns (legacy rows may have payoutFee=0
    // even when a fee transaction was written).
    const txIds = [payout.payoutTransactionId, payout.feeTransactionId].filter(Boolean);

    let actualPayoutDeducted = 0;
    let actualFeeDeducted = 0;

    if (txIds.length > 0) {
      const { data: txs, error: txError } = await supabase
        .from('publisher_balance_transactions')
        .select('_id, amount')
        .in('_id', txIds);

      if (txError) throw txError;

      for (const tx of txs || []) {
        const abs = Math.abs(Number(tx.amount || 0));
        if (tx._id === payout.feeTransactionId) {
          actualFeeDeducted += abs;
        } else if (tx._id === payout.payoutTransactionId) {
          actualPayoutDeducted += abs;
        }
      }
    }

    const ledgerTotal = actualPayoutDeducted + actualFeeDeducted;
    // Fall back to row columns only when no ledger transactions were linked.
    const totalToRefund = ledgerTotal > 0
      ? ledgerTotal
      : Number(payout.amount || 0) + Number(payout.payoutFee || 0);

    if (totalToRefund <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount could not be determined' },
        { status: 422 }
      );
    }

    await refundPayout(
      payout.userId,
      totalToRefund,
      actualFeeDeducted || Number(payout.payoutFee || 0),
      payoutId,
      `Payout failed: ${reason}`,
      {
        failureReason: reason,
        refundedTotal: totalToRefund,
        refundedPayoutPortion: actualPayoutDeducted,
        refundedFeePortion: actualFeeDeducted,
        source: ledgerTotal > 0 ? 'ledger' : 'columns'
      }
    );

    const { error: updateError } = await supabase
      .from('publisher_payouts')
      .update({
        status: 'failed',
        notes: reason,
        processedAt: new Date().toISOString()
      })
      .eq('_id', payoutId);

    if (updateError) {
      // Refund already credited. Surface the error so an admin can reconcile.
      console.error('Payout refunded but status update failed:', {
        payoutId,
        userId: payout.userId,
        refundedTotal: totalToRefund,
        error: updateError
      });
      throw updateError;
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
