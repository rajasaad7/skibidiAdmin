import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all completed orders with publisher info (exclude featured_domain)
    const { data: completedOrders, error: completedError } = await supabase
      .from('marketplace_orders')
      .select(`
        _id,
        publisherId,
        totalPrice,
        "publisherEarnings",
        status,
        serviceType,
        seller:users!publisherId(
          _id,
          fullName,
          email
        )
      `)
      .eq('status', 'completed')
      .neq('serviceType', 'featured_domain');

    if (completedError) throw completedError;

    // Get all pending/in-progress orders (exclude featured_domain)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('marketplace_orders')
      .select(`
        _id,
        publisherId,
        totalPrice,
        "publisherEarnings",
        status,
        serviceType
      `)
      .in('status', ['paid', 'accepted', 'in_progress', 'submitted'])
      .neq('serviceType', 'featured_domain');

    if (pendingError) throw pendingError;

    // Get all completed payout requests
    const { data: completedPayouts, error: payoutsError } = await supabase
      .from('publisher_payouts')
      .select('userId, amount')
      .eq('status', 'completed');

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
    }

    // Aggregate earnings by publisher
    const publisherMap = new Map<string, {
      _id: string;
      fullName: string;
      email: string;
      totalEarnings: number;
      pendingPayout: number;
      paidOut: number;
      completedOrders: number;
      pendingOrders: number;
    }>();

    // Process completed orders
    (completedOrders || []).forEach((order: any) => {
      if (!order.publisherId || !order.seller) return;

      const existing = publisherMap.get(order.publisherId);
      // Publisher gets the publisherEarnings amount
      const publisherShare = Number(order.publisherEarnings || 0);

      if (existing) {
        existing.totalEarnings += publisherShare;
        existing.completedOrders += 1;
      } else {
        publisherMap.set(order.publisherId, {
          _id: order.seller._id,
          fullName: order.seller.fullName,
          email: order.seller.email,
          totalEarnings: publisherShare,
          pendingPayout: 0,
          paidOut: 0,
          completedOrders: 1,
          pendingOrders: 0
        });
      }
    });

    // Process pending orders
    (pendingOrders || []).forEach((order: any) => {
      if (!order.publisherId) return;

      const existing = publisherMap.get(order.publisherId);

      if (existing) {
        existing.pendingOrders += 1;
      }
    });

    // Calculate paid out amounts from completed payouts
    const paidOutMap = new Map<string, number>();
    (completedPayouts || []).forEach((payout: any) => {
      const current = paidOutMap.get(payout.userId) || 0;
      paidOutMap.set(payout.userId, current + Number(payout.amount || 0));
    });

    // Calculate pending payouts
    publisherMap.forEach((publisher, publisherId) => {
      const paidOut = paidOutMap.get(publisherId) || 0;
      publisher.paidOut = paidOut;
      publisher.pendingPayout = publisher.totalEarnings - paidOut;
    });

    // Convert to array and sort by pending payout (descending)
    const publishers = Array.from(publisherMap.values())
      .filter(p => p.completedOrders > 0)
      .sort((a, b) => b.pendingPayout - a.pendingPayout);

    // Calculate stats
    const stats = {
      totalOwed: publishers.reduce((sum, p) => sum + p.pendingPayout, 0),
      totalPaid: publishers.reduce((sum, p) => sum + p.paidOut, 0),
      publishersCount: publishers.length,
      pendingOrdersValue: (pendingOrders || []).reduce((sum: number, o: any) => sum + Number(o.publisherEarnings || 0), 0)
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
