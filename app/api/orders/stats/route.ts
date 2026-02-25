import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Use RPC function for maximum performance
    const { data, error } = await supabase.rpc('get_order_stats');

    if (error) throw error;

    // RPC returns array with one row
    const statsRow = data && data.length > 0 ? data[0] : null;

    const stats = {
      all: Number(statsRow?.total || 0),
      paid: Number(statsRow?.paid || 0),
      in_progress: Number(statsRow?.in_progress || 0),
      submitted: Number(statsRow?.submitted || 0),
      completed: Number(statsRow?.completed || 0),
      cancelled: Number(statsRow?.cancelled || 0),
      refunded: Number(statsRow?.refunded || 0),
      guest_post: Number(statsRow?.guest_post || 0),
      link_insertion: Number(statsRow?.link_insertion || 0),
      featured_domain: Number(statsRow?.featured_domain || 0)
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
