import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('publisher_payouts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user data for each payout
    const payoutsWithUsers = await Promise.all(
      (data || []).map(async (payout) => {
        if (payout.userId) {
          const { data: userData } = await supabase
            .from('users')
            .select('_id, email, fullName')
            .eq('_id', payout.userId)
            .single();
          return { ...payout, user: userData };
        }
        return payout;
      })
    );

    // Get stats
    const [totalRes, pendingRes, completedRes, failedRes] = await Promise.all([
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }),
      supabase.from('publisher_payouts').select('amount').eq('status', 'pending'),
      supabase.from('publisher_payouts').select('amount').eq('status', 'completed'),
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    const pendingAmount = (pendingRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedAmount = (completedRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      payouts: payoutsWithUsers,
      stats: {
        total: totalRes.count || 0,
        pendingCount: pendingRes.data?.length || 0,
        pendingAmount: pendingAmount,
        completedCount: completedRes.data?.length || 0,
        completedAmount: completedAmount,
        failed: failedRes.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
