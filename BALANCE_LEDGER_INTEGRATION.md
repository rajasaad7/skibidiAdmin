# Super Admin - Balance Ledger Integration Guide

## Overview
The super admin payout system has been updated to integrate with the new enterprise-grade balance ledger system. This ensures complete audit trail and accurate balance tracking.

## What Changed

### Files Modified

1. **`/lib/publisherBalanceHelper.ts`** (NEW)
   - Helper library for balance operations
   - Functions: `getPublisherBalance()`, `creditEarning()`, `processPayout()`, `refundPayout()`
   - Provides TypeScript interface to the balance ledger system

2. **`/app/api/payouts/mark-paid/route.ts`**
   - **Before**: Only updated payout status to 'completed'
   - **After**: Same behavior (balance already deducted when payout was requested)
   - **Note**: Added documentation explaining that balance was already deducted

3. **`/app/api/payouts/mark-failed/route.ts`**
   - **Before**: Only updated payout status to 'failed'
   - **After**: Also refunds the full amount (including fee) back to publisher's balance
   - **Benefit**: When payout fails, publisher automatically gets their money back

4. **`/app/api/payouts/earnings/route.ts`**
   - **Before**: Calculated earnings from `marketplace_orders` table
   - **After**: Uses `publisher_balances` table (source of truth)
   - **Benefits**:
     - Faster queries (no complex aggregations)
     - More accurate (includes all transactions, not just orders)
     - Includes fees and refunds in calculations

## How It Works Now

### Payout Flow

1. **Publisher Requests Payout** (Main App)
   - Publisher enters amount (e.g., $22.50)
   - System calculates fee ($2 if under $25)
   - Balance is immediately deducted:
     - Payout transaction: -$20.50 (what they receive)
     - Fee transaction: -$2.00 (processing fee)
   - Payout record created with status: 'pending'

2. **Admin Marks as Paid** (Super Admin)
   - Admin clicks green checkmark
   - Optionally enters transaction ID and notes
   - Payout status changed to 'completed'
   - **No balance change** (already deducted)

3. **Admin Marks as Failed** (Super Admin)
   - Admin clicks red X and enters reason
   - Payout status changed to 'failed'
   - **Full amount refunded** back to publisher balance
   - Refund transaction created in ledger

### Earnings Dashboard

The earnings tab now shows:
- **Total Earnings**: From `publisher_balances.totalEarned`
- **Pending Payout**: From `publisher_balances.currentBalance` (available balance)
- **Already Paid**: From `publisher_balances.totalWithdrawn`

This is more accurate than before because it includes:
- All completed orders (earnings)
- All successful payouts (withdrawn)
- All fees charged
- All refunds issued

## Database Structure

### publisher_balances
```sql
- userId: TEXT (FK to users)
- currentBalance: NUMERIC(10,2)     -- Available for withdrawal
- totalEarned: NUMERIC(10,2)        -- Lifetime earnings
- totalWithdrawn: NUMERIC(10,2)     -- Lifetime payouts
- totalFees: NUMERIC(10,2)          -- Total fees paid
- totalRefunded: NUMERIC(10,2)      -- Total refunds received
```

### publisher_balance_transactions
```sql
- userId: TEXT
- type: VARCHAR(50)                 -- 'earning', 'payout', 'fee', 'refund'
- amount: NUMERIC(10,2)             -- Positive for credits, negative for debits
- balanceBefore: NUMERIC(10,2)      -- Balance snapshot before
- balanceAfter: NUMERIC(10,2)       -- Balance snapshot after
- relatedOrderId: TEXT (nullable)
- relatedPayoutId: TEXT (nullable)
- description: TEXT
- metadata: JSONB                   -- Additional info
```

## Testing the Integration

### Test Scenario 1: Mark Payout as Paid
1. Go to super admin → Payouts → Requests tab
2. Find a pending payout
3. Click green checkmark
4. Enter transaction ID (optional)
5. Click Confirm
6. **Expected**: Payout status becomes "completed", balance stays the same

### Test Scenario 2: Mark Payout as Failed
1. Go to super admin → Payouts → Requests tab
2. Find a pending payout
3. Click red X
4. Enter failure reason
5. Click OK
6. **Expected**:
   - Payout status becomes "failed"
   - Publisher's balance increases by the payout amount
   - Publisher can see refund in their transaction history

### Test Scenario 3: View Earnings
1. Go to super admin → Payouts → Earnings tab
2. **Expected**:
   - Total Owed = Sum of all current balances
   - Total Paid Out = Sum of all withdrawals
   - Values should match the new balance ledger

## Troubleshooting

### Publisher balance doesn't match expected value
1. Run this SQL in Supabase to verify:
```sql
SELECT
  userId,
  currentBalance,
  totalEarned,
  totalWithdrawn,
  totalFees
FROM publisher_balances
WHERE userId = 'USER_ID_HERE';
```

2. Check transaction history:
```sql
SELECT
  type,
  amount,
  balanceBefore,
  balanceAfter,
  description,
  createdAt
FROM publisher_balance_transactions
WHERE userId = 'USER_ID_HERE'
ORDER BY createdAt DESC
LIMIT 20;
```

### Payout failed but balance not refunded
- The refund happens automatically when marking as failed
- Check server logs for errors
- If needed, manually run refund:
```sql
SELECT update_publisher_balance(
  'USER_ID',
  'refund',
  22.50,  -- Amount to refund
  NULL,   -- No order ID
  'PAYOUT_ID',
  'Manual refund for failed payout',
  '{}'
);
```

## Benefits of New System

1. **Complete Audit Trail**: Every balance change is recorded
2. **Accurate Balances**: Single source of truth (publisher_balances table)
3. **Fee Tracking**: Separate transactions for fees
4. **Automatic Refunds**: Failed payouts automatically return funds
5. **Better Reporting**: Easy to generate financial reports
6. **Scalable**: Handles millions of transactions efficiently

## Migration Notes

- Existing payout data was migrated to the new system
- All historical earnings and payouts are in the ledger
- Old calculation method (from orders) is no longer used
- Super admin now reads directly from `publisher_balances` table

## Support

If you encounter any issues:
1. Check the server logs for errors
2. Verify database connectivity
3. Run balance integrity check for specific user
4. Contact development team with user ID and error details
