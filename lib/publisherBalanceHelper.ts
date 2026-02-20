/**
 * Publisher Balance Helper
 * Enterprise-grade balance management system with full audit trail
 */

import { supabase } from '@/lib/supabase';

/**
 * Get publisher balance
 * @param userId - Publisher user ID
 * @returns Balance information
 */
export async function getPublisherBalance(userId: string) {
  const { data, error } = await supabase
    .from('publisher_balances')
    .select('*')
    .eq('userId', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Balance doesn't exist, create it
    const { data: newBalance, error: createError } = await supabase
      .from('publisher_balances')
      .insert({
        userId: userId,
        currentBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalFees: 0,
        totalRefunded: 0
      })
      .select()
      .single();

    if (createError) throw createError;
    return newBalance;
  }

  if (error) throw error;
  return data;
}

/**
 * Credit earning to publisher balance
 * @param userId - Publisher user ID
 * @param amount - Amount to credit
 * @param orderId - Related order ID
 * @param description - Transaction description
 * @param metadata - Additional metadata
 * @returns Transaction ID
 */
export async function creditEarning(
  userId: string,
  amount: number,
  orderId: string,
  description: string | null = null,
  metadata: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('update_publisher_balance', {
    p_user_id: userId,
    p_transaction_type: 'earning',
    p_amount: parseFloat(amount.toString()),
    p_description: description || `Earning from order`,
    p_order_id: orderId,
    p_payout_id: null,
    p_metadata: metadata
  });

  if (error) throw error;
  return data; // Returns transaction ID
}

/**
 * Process payout (debit balance and record fee)
 * NOTE: This should only be called when payout request is created, NOT when marking as paid
 * @param userId - Publisher user ID
 * @param requestedAmount - Amount user wants to withdraw from their balance (e.g., $10)
 * @param payoutFee - Fee charged for payout (e.g., $2)
 * @param payoutId - Related payout ID
 * @param description - Transaction description
 * @param metadata - Additional metadata
 * @returns { payoutTransactionId, feeTransactionId, amountReceived }
 *
 * Example: User requests $10 withdrawal with $2 fee
 * - Amount to receive: $8 ($10 - $2)
 * - Balance deduction: $10 total (payout: -$8, fee: -$2)
 * - Creates payout transaction: -$8 (what they receive)
 * - Creates fee transaction: -$2 (processing fee)
 * - DB stores: amount=$10, payoutFee=$2, amountReceived=$8
 */
export async function processPayout(
  userId: string,
  requestedAmount: number,
  payoutFee: number,
  payoutId: string,
  description: string | null = null,
  metadata: Record<string, any> = {}
) {
  try {
    const amountToReceive = parseFloat(requestedAmount.toString()) - parseFloat(payoutFee.toString());

    // Deduct what user will actually receive
    const { data: payoutTxId, error: payoutError } = await supabase.rpc('update_publisher_balance', {
      p_user_id: userId,
      p_transaction_type: 'payout',
      p_amount: -amountToReceive,
      p_description: description || `Payout withdrawal - $${amountToReceive.toFixed(2)} to be sent`,
      p_order_id: null,
      p_payout_id: payoutId,
      p_metadata: {
        ...metadata,
        requestedAmount,
        payoutFee,
        amountReceived: amountToReceive
      }
    });

    if (payoutError) throw payoutError;

    let feeTxId = null;

    // Deduct fee separately
    if (payoutFee > 0) {
      const { data: feeTxIdData, error: feeError } = await supabase.rpc('update_publisher_balance', {
        p_user_id: userId,
        p_transaction_type: 'fee',
        p_amount: -parseFloat(payoutFee.toString()),
        p_description: `Payout processing fee ($${payoutFee.toFixed(2)})`,
        p_order_id: null,
        p_payout_id: payoutId,
        p_metadata: {
          ...metadata,
          feeAmount: payoutFee,
          relatedPayoutTxId: payoutTxId,
          relatedToRequestedAmount: requestedAmount
        }
      });

      if (feeError) console.error('Error recording fee transaction:', feeError);
      feeTxId = feeTxIdData;
    }

    return {
      payoutTransactionId: payoutTxId,
      feeTransactionId: feeTxId,
      amountReceived: amountToReceive
    };
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
}

/**
 * Process refund (credit balance)
 * Used when a payout is marked as failed to return funds to publisher
 * @param userId - Publisher user ID
 * @param requestedAmount - Full amount that was requested (includes fee)
 * @param payoutFee - Fee that was charged
 * @param payoutId - Related payout ID
 * @param description - Transaction description
 * @param metadata - Additional metadata
 * @returns Transaction ID
 *
 * Example: Refund failed $10 withdrawal ($8 payout + $2 fee)
 * - Creates refund transaction: +$10
 * - Returns full amount back to balance
 */
export async function refundPayout(
  userId: string,
  requestedAmount: number,
  payoutFee: number,
  payoutId: string,
  description: string | null = null,
  metadata: Record<string, any> = {}
) {
  // Refund the full requested amount (payout + fee)
  const fullRefund = parseFloat(requestedAmount.toString());

  const { data, error } = await supabase.rpc('update_publisher_balance', {
    p_user_id: userId,
    p_transaction_type: 'refund',
    p_amount: fullRefund,
    p_description: description || `Payout failed - $${fullRefund.toFixed(2)} returned to balance`,
    p_order_id: null,
    p_payout_id: payoutId,
    p_metadata: {
      ...metadata,
      refundedAmount: fullRefund,
      originalPayoutFee: payoutFee
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Get balance transactions history
 * @param userId - Publisher user ID
 * @param options - Query options
 * @returns Transactions data
 */
export async function getBalanceTransactions(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } = {}
) {
  const {
    limit = 50,
    offset = 0,
    type = null,
    startDate = null,
    endDate = null
  } = options;

  let query = supabase
    .from('publisher_balance_transactions')
    .select('*', { count: 'exact' })
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq('type', type);
  }

  if (startDate) {
    query = query.gte('createdAt', startDate);
  }

  if (endDate) {
    query = query.lte('createdAt', endDate);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    transactions: data,
    total: count,
    limit,
    offset
  };
}

/**
 * Verify balance integrity
 * @param userId - Publisher user ID
 * @returns True if balance is correct
 */
export async function verifyBalanceIntegrity(userId: string) {
  const balance = await getPublisherBalance(userId);

  // Sum all transactions
  const { data: transactions } = await supabase
    .from('publisher_balance_transactions')
    .select('amount')
    .eq('userId', userId);

  const calculatedBalance = transactions?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

  const isValid = Math.abs(parseFloat(balance.currentBalance) - calculatedBalance) < 0.01; // 1 cent tolerance

  if (!isValid) {
    console.error('Balance integrity check failed!', {
      userId,
      recordedBalance: balance.currentBalance,
      calculatedBalance,
      difference: parseFloat(balance.currentBalance) - calculatedBalance
    });
  }

  return isValid;
}
