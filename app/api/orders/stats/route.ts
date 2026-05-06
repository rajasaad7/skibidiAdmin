import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const nowIso = new Date().toISOString();
    const terminalStatuses = ['pending_payment', 'completed', 'refunded', 'cancelled'];

    const countQuery = (build: (q: any) => any) =>
      build(supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }));

    const [
      allRes,
      paidRes,
      overdueRes,
      acceptedRes,
      submittedRes,
      completedRes,
      refundedRes,
      guestPostRes,
      linkInsertionRes,
      featuredDomainRes,
    ] = await Promise.all([
      countQuery((q) => q),
      countQuery((q) => q.eq('status', 'paid')),
      countQuery((q) => q.lt('deadlineAt', nowIso).not('status', 'in', `(${terminalStatuses.join(',')})`)),
      countQuery((q) => q.eq('status', 'accepted')),
      countQuery((q) => q.eq('status', 'submitted')),
      countQuery((q) => q.eq('status', 'completed')),
      countQuery((q) => q.eq('status', 'refunded')),
      countQuery((q) => q.eq('serviceType', 'guest_post')),
      countQuery((q) => q.eq('serviceType', 'link_insertion')),
      countQuery((q) => q.eq('serviceType', 'featured_domain')),
    ]);

    const stats = {
      all: allRes.count || 0,
      paid: paidRes.count || 0,
      overdue: overdueRes.count || 0,
      accepted: acceptedRes.count || 0,
      submitted: submittedRes.count || 0,
      completed: completedRes.count || 0,
      refunded: refundedRes.count || 0,
      guest_post: guestPostRes.count || 0,
      link_insertion: linkInsertionRes.count || 0,
      featured_domain: featuredDomainRes.count || 0,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order stats' },
      { status: 500 }
    );
  }
}
