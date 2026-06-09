import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Buyers with claimable money: a wallet balance (user_balances) and/or
 * refunds they can still claim from rejected orders.
 *
 * "Unclaimed refunds" = sum of totalPrice for the buyer's orders with
 * status 'rejected' that have not yet been refunded (refundedAt IS NULL).
 * "Total balance" per buyer = wallet balance + unclaimed refunds.
 */
export async function GET() {
  try {
    // Wallet balances (only those holding money; refund-only buyers are merged in below).
    const { data: balances, error: balancesError } = await supabase
      .from('user_balances')
      .select(`
        "userId",
        balance,
        "totalAdded",
        "totalSpent",
        "totalRefunded",
        "updatedAt",
        user:users!"userId"(
          _id,
          fullName,
          email
        )
      `)
      .gt('balance', 0);

    if (balancesError) throw balancesError;

    // Rejected, not-yet-refunded orders — the refunds a buyer can still claim.
    const { data: rejectedOrders, error: rejectedError } = await supabase
      .from('marketplace_orders')
      .select('"buyerId", "totalPrice"')
      .eq('status', 'rejected')
      .is('refundedAt', null);

    if (rejectedError) throw rejectedError;

    // Active (in-flight) orders — money buyers have committed but that hasn't
    // yet been completed and released to publishers. Once an order is
    // completed it moves over to the Publishers tab.
    const { data: activeOrders, error: activeError } = await supabase
      .from('marketplace_orders')
      .select('"buyerId", "totalPrice"')
      .in('status', ['paid', 'accepted', 'submitted', 'in_progress']);

    if (activeError) throw activeError;

    const activeOrdersBalance = (activeOrders || []).reduce(
      (sum: number, o: any) => sum + Number(o.totalPrice || 0),
      0
    );
    const activeOrdersCount = (activeOrders || []).length;

    // Per-buyer active-orders total, so each row can show its in-flight money.
    const activeByBuyer = new Map<string, number>();
    (activeOrders || []).forEach((o: any) => {
      if (!o.buyerId) return;
      activeByBuyer.set(
        o.buyerId,
        (activeByBuyer.get(o.buyerId) || 0) + Number(o.totalPrice || 0)
      );
    });

    const refundsByBuyer = new Map<string, number>();
    (rejectedOrders || []).forEach((o: any) => {
      if (!o.buyerId) return;
      refundsByBuyer.set(
        o.buyerId,
        (refundsByBuyer.get(o.buyerId) || 0) + Number(o.totalPrice || 0)
      );
    });

    // Build the buyer map keyed by userId, seeded from wallet balances.
    const buyerMap = new Map<string, any>();
    (balances || []).forEach((b: any) => {
      if (!b.user) return;
      buyerMap.set(b.userId, {
        _id: b.userId,
        fullName: b.user.fullName,
        email: b.user.email,
        balance: Number(b.balance || 0),
        totalAdded: Number(b.totalAdded || 0),
        totalSpent: Number(b.totalSpent || 0),
        totalRefunded: Number(b.totalRefunded || 0),
        unclaimedRefunds: 0,
        activeOrders: 0,
        updatedAt: b.updatedAt,
      });
    });

    // Fetch user info for refund-only / active-order-only buyers not already in the map.
    const missingBuyerIds = Array.from(
      new Set([...refundsByBuyer.keys(), ...activeByBuyer.keys()])
    ).filter((id) => !buyerMap.has(id));
    if (missingBuyerIds.length > 0) {
      const { data: extraUsers, error: usersError } = await supabase
        .from('users')
        .select('_id, fullName, email')
        .in('_id', missingBuyerIds);

      if (usersError) throw usersError;

      (extraUsers || []).forEach((u: any) => {
        buyerMap.set(u._id, {
          _id: u._id,
          fullName: u.fullName,
          email: u.email,
          balance: 0,
          totalAdded: 0,
          totalSpent: 0,
          totalRefunded: 0,
          unclaimedRefunds: 0,
          activeOrders: 0,
          updatedAt: null,
        });
      });
    }

    // Apply unclaimed refunds and per-buyer active-order totals.
    refundsByBuyer.forEach((amount, buyerId) => {
      const buyer = buyerMap.get(buyerId);
      if (buyer) buyer.unclaimedRefunds = amount;
    });
    activeByBuyer.forEach((amount, buyerId) => {
      const buyer = buyerMap.get(buyerId);
      if (buyer) buyer.activeOrders = amount;
    });

    const buyers = Array.from(buyerMap.values())
      .map((b) => ({
        ...b,
        totalBalance: b.balance + b.unclaimedRefunds + b.activeOrders,
      }))
      .filter((b) => b.totalBalance > 0)
      .sort((a, b) => b.totalBalance - a.totalBalance);

    const stats = {
      totalBalance: buyers.reduce((sum, b) => sum + b.balance, 0),
      totalAdded: buyers.reduce((sum, b) => sum + b.totalAdded, 0),
      totalSpent: buyers.reduce((sum, b) => sum + b.totalSpent, 0),
      totalUnclaimedRefunds: buyers.reduce((sum, b) => sum + b.unclaimedRefunds, 0),
      activeOrdersBalance,
      activeOrdersCount,
      buyersCount: buyers.length,
    };

    return NextResponse.json({ success: true, buyers, stats });
  } catch (error: any) {
    console.error('Error fetching buyer balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buyer balances' },
      { status: 500 }
    );
  }
}
