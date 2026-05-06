import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabase
      .from('marketplace_orders')
      .select(`
        *,
        domains!domainId(domainName)
      `)
      .eq('_id', id)
      .single();

    if (error || !order) {
      console.error('Error fetching order:', error);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const userIds: string[] = [];
    if (order.buyerId) userIds.push(order.buyerId);
    if (order.publisherId) userIds.push(order.publisherId);

    let buyer = null;
    let seller = null;

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('_id, fullName, email')
        .in('_id', userIds);

      const usersMap = new Map(
        (usersData || []).map((u) => [u._id, u])
      );

      buyer = order.buyerId ? usersMap.get(order.buyerId) || null : null;
      seller = order.publisherId ? usersMap.get(order.publisherId) || null : null;
    }

    return NextResponse.json({
      success: true,
      order: { ...order, buyer, seller },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('marketplace_orders')
      .delete()
      .eq('_id', id);

    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
