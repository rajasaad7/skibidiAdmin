import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    // List view only needs the columns shown in the table; avoid select * and avoid
    // loading heavy text columns (articleContent, completionNotes, etc.) per row.
    let query = supabase
      .from('marketplace_orders')
      .select(`
        _id,
        orderNumber,
        status,
        serviceType,
        totalPrice,
        createdAt,
        deadlineAt,
        completedAt,
        manualVerified,
        domainId,
        domains!domainId(domainName)
      `, { count: 'exact' })
      .order('createdAt', { ascending: false });

    if (status === 'overdue') {
      const nowIso = new Date().toISOString();
      const terminalStatuses = ['pending_payment', 'completed', 'refunded', 'cancelled'];
      query = query
        .lt('deadlineAt', nowIso)
        .not('status', 'in', `(${terminalStatuses.join(',')})`);
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      orders: orders || [],
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
