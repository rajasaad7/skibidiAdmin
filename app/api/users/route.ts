import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const filter = searchParams.get('filter');

  try {

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

    // Build user query based on filter
    let userQuery = supabase
      .from('users')
      .select('_id, fullName, email, isEmailVerified, googleId, twitterId, createdAt, lastActive')
      .order('createdAt', { ascending: false });

    // Apply filters
    if (filter === 'paid') {
      userQuery = userQuery.in('_id', Array.from(paidUserIds));
    } else if (filter === 'free') {
      const freeUserIds = Array.from(
        new Set(
          (await supabase.from('users').select('_id')).data?.map(u => u._id) || []
        )
      ).filter(id => !paidUserIds.has(id));
      userQuery = userQuery.in('_id', freeUserIds);
    } else if (filter === 'new_today') {
      userQuery = userQuery.gte('createdAt', today.toISOString());
    } else if (filter === 'advertisers') {
      userQuery = userQuery.in('_id', Array.from(advertiserIds));
    } else if (filter === 'publishers') {
      userQuery = userQuery.in('_id', Array.from(publisherIds));
    }

    // Apply search
    if (search) {
      userQuery = userQuery.or(`fullName.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Limit results
    userQuery = userQuery.limit(100);

    const { data, error } = await userQuery;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: data,
      stats: {
        total: totalCount,
        paidUsers: paidUsersCount,
        freeUsers: freeUsersCount,
        newToday: todayRes.count || 0,
        advertisers: advertiserIds.size,
        publishers: publisherIds.size
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
