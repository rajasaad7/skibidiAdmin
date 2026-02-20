import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Get publisher earnings from the new balance ledger system
 * This replaces the old method of calculating from orders
 */
export async function GET() {
  try {
    // Get all publisher balances with user information
    const { data: balances, error: balancesError } = await supabase
      .from('publisher_balances')
      .select(`
        "userId",
        "currentBalance",
        "totalEarned",
        "totalWithdrawn",
        "totalFees",
        user:users!"userId"(
          _id,
          fullName,
          email
        )
      `);

    if (balancesError) throw balancesError;

    // Get pending orders count per publisher
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('marketplace_orders')
      .select(`
        _id,
        "publisherId",
        "publisherEarnings",
        status,
        serviceType
      `)
      .in('status', ['paid', 'accepted', 'in_progress', 'submitted'])
      .neq('serviceType', 'featured_domain');

    if (pendingError) throw pendingError;

    // Get completed orders count per publisher
    const { data: completedOrders, error: completedError } = await supabase
      .from('marketplace_orders')
      .select(`
        _id,
        "publisherId",
        status,
        serviceType
      `)
      .eq('status', 'completed')
      .neq('serviceType', 'featured_domain');

    if (completedError) throw completedError;

    // Count pending and completed orders by publisher
    const pendingOrdersMap = new Map<string, number>();
    const completedOrdersMap = new Map<string, number>();

    (pendingOrders || []).forEach((order: any) => {
      if (!order.publisherId) return;
      pendingOrdersMap.set(order.publisherId, (pendingOrdersMap.get(order.publisherId) || 0) + 1);
    });

    (completedOrders || []).forEach((order: any) => {
      if (!order.publisherId) return;
      completedOrdersMap.set(order.publisherId, (completedOrdersMap.get(order.publisherId) || 0) + 1);
    });

    // Map balances to publisher info
    const publishers = (balances || [])
      .map((balance: any) => {
        if (!balance.user) return null;

        return {
          _id: balance.userId,
          fullName: balance.user.fullName,
          email: balance.user.email,
          totalEarnings: Number(balance.totalEarned || 0),
          pendingPayout: Number(balance.currentBalance || 0), // Available balance = pending payout
          paidOut: Number(balance.totalWithdrawn || 0),
          completedOrders: completedOrdersMap.get(balance.userId) || 0,
          pendingOrders: pendingOrdersMap.get(balance.userId) || 0
        };
      })
      .filter((p: any) => p !== null)
      .sort((a: any, b: any) => b.pendingPayout - a.pendingPayout);

    // Calculate pending orders value
    const pendingOrdersValue = (pendingOrders || []).reduce((sum: number, o: any) =>
      sum + Number(o.publisherEarnings || 0), 0
    );

    // Calculate stats
    const stats = {
      totalOwed: publishers.reduce((sum: number, p: any) => sum + p.pendingPayout, 0),
      totalPaid: publishers.reduce((sum: number, p: any) => sum + p.paidOut, 0),
      publishersCount: publishers.length,
      pendingOrdersValue
    };

    return NextResponse.json({
      success: true,
      publishers,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching publisher earnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch publisher earnings' },
      { status: 500 }
    );
  }
}
