import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const filter = searchParams.get('filter');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  try {
    // If ID is provided, fetch single user by ID
    if (id) {
      const { data, error } = await supabase
        .from('users')
        .select('_id, fullName, email')
        .eq('_id', id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        users: data ? [data] : []
      });
    }

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalRes,
      todayRes,
      activeOrdersRes,
      marketplaceOrdersRes,
      domainsRes
    ] = await Promise.all([
      supabase.from('users').select('_id', { count: 'exact', head: true }),
      supabase.from('users').select('_id', { count: 'exact', head: true }).gte('createdAt', today.toISOString()),
      // Get active orders (paid subscriptions) - orders table has userId field
      supabase.from('orders').select('userId').eq('status', 'active'),
      // Get users with marketplace orders (advertisers)
      supabase.from('marketplace_orders').select('buyerId'),
      // Get users with domains (publishers)
      supabase.from('domains').select('userId')
    ]);

    // Calculate paid users - users who have active subscription orders
    const paidUserIds = new Set<string>();
    (activeOrdersRes.data || []).forEach((order: any) => {
      if (order.userId) {
        paidUserIds.add(order.userId);
      }
    });

    // Count valid advertisers (users with at least 1 marketplace order)
    const advertiserIds = new Set((marketplaceOrdersRes.data || []).map((order: any) => order.buyerId).filter(Boolean));

    // Count valid publishers (users with at least 1 domain)
    const publisherIds = new Set((domainsRes.data || []).map((domain: any) => domain.userId).filter(Boolean));

    const paidUsersCount = paidUserIds.size;
    const totalCount = totalRes.count || 0;
    const freeUsersCount = totalCount - paidUsersCount;

    // Use RPC to get users with link counts for efficient sorting
    const offset = (page - 1) * limit;

    // Build filter conditions for RPC
    let filterCondition = '';
    if (filter === 'paid' && paidUserIds.size > 0) {
      const ids = Array.from(paidUserIds).map(id => `'${id}'`).join(',');
      filterCondition = `AND u._id IN (${ids})`;
    } else if (filter === 'free') {
      const ids = Array.from(paidUserIds).map(id => `'${id}'`).join(',');
      filterCondition = ids.length > 0 ? `AND u._id NOT IN (${ids})` : '';
    } else if (filter === 'new_today') {
      filterCondition = `AND u."createdAt" >= '${today.toISOString()}'`;
    } else if (filter === 'advertisers' && advertiserIds.size > 0) {
      const ids = Array.from(advertiserIds).map(id => `'${id}'`).join(',');
      filterCondition = `AND u._id IN (${ids})`;
    } else if (filter === 'publishers' && publisherIds.size > 0) {
      const ids = Array.from(publisherIds).map(id => `'${id}'`).join(',');
      filterCondition = `AND u._id IN (${ids})`;
    }

    // Build search condition
    let searchCondition = '';
    if (search) {
      searchCondition = `AND (u."fullName" ILIKE '%${search}%' OR u.email ILIKE '%${search}%')`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (sortBy === 'linksCount') {
      orderByClause = `"linksCount" ${sortOrder === 'asc' ? 'ASC' : 'DESC'}, u."createdAt" DESC`;
    } else if (sortBy === 'createdAt') {
      orderByClause = `u."createdAt" ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    } else if (sortBy === 'lastActive') {
      orderByClause = `u."lastActive" ${sortOrder === 'asc' ? 'ASC NULLS FIRST' : 'DESC NULLS LAST'}`;
    } else {
      orderByClause = 'u."createdAt" DESC';
    }

    // Call RPC to get users with link counts
    const { data: usersWithCounts, error: rpcError } = await supabase.rpc('get_users_with_link_counts', {
      p_limit: limit,
      p_offset: offset,
      p_filter_condition: filterCondition,
      p_search_condition: searchCondition,
      p_order_by: orderByClause
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw rpcError;
    }

    // Get total count for pagination
    const { data: countData, error: countError } = await supabase.rpc('get_users_count', {
      p_filter_condition: filterCondition,
      p_search_condition: searchCondition
    });

    if (countError) {
      console.error('Count Error:', countError);
      throw countError;
    }

    const total = countData || 0;
    const totalPages = Math.ceil(total / limit);
    const paginatedUsers = usersWithCounts || [];

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      stats: {
        total: totalCount,
        paidUsers: paidUsersCount,
        freeUsers: freeUsersCount,
        newToday: todayRes.count || 0,
        advertisers: advertiserIds.size,
        publishers: publisherIds.size
      },
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
