import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    // Build optimized query - newest orders first, paginated at DB level
    let query = supabase
      .from('marketplace_orders')
      .select(`
        *,
        domains!domainId(domainName)
      `, { count: 'exact' })
      .order('createdAt', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) throw error;

    // Fetch user data separately for better performance
    const userIds = new Set<string>();
    (orders || []).forEach(order => {
      if (order.buyerId) userIds.add(order.buyerId);
      if (order.publisherId) userIds.add(order.publisherId);
    });

    const { data: usersData } = userIds.size > 0 ? await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', Array.from(userIds)) : { data: [] };

    // Create user map
    const usersMap = new Map(
      (usersData || []).map(user => [user._id, user])
    );

    // Enrich orders with user data
    const enrichedOrders = (orders || []).map(order => ({
      ...order,
      buyer: order.buyerId ? usersMap.get(order.buyerId) : null,
      seller: order.publisherId ? usersMap.get(order.publisherId) : null
    }));

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
