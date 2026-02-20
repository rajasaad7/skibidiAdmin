import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('publisher_payouts')
      .select('*')
      .order('"createdAt"', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user data for each payout and calculate amountReceived
    const payoutsWithUsers = await Promise.all(
      (data || []).map(async (payout) => {
        let userData = null;
        if (payout.userId) {
          const { data: user } = await supabase
            .from('users')
            .select('_id, email, fullName')
            .eq('_id', payout.userId)
            .single();
          userData = user;
        }

        // Calculate amountReceived if not already set
        const amount = Number(payout.amount || 0);
        const fee = Number(payout.payoutFee || 0);
        const amountReceived = payout.amountReceived ? Number(payout.amountReceived) : (amount - fee);

        return {
          ...payout,
          user: userData,
          amountReceived: amountReceived.toFixed(2)
        };
      })
    );

    // Get stats - use amountReceived for accurate amounts
    const [totalRes, pendingRes, completedRes, failedRes] = await Promise.all([
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }),
      supabase.from('publisher_payouts').select('amount, "payoutFee", "amountReceived"').eq('status', 'pending'),
      supabase.from('publisher_payouts').select('amount, "payoutFee", "amountReceived"').eq('status', 'completed'),
      supabase.from('publisher_payouts').select('_id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    // Calculate total amounts that will be/were actually paid out (amountReceived)
    const pendingAmount = (pendingRes.data || []).reduce((sum, p) => {
      const received = p.amountReceived ? Number(p.amountReceived) : (Number(p.amount || 0) - Number(p.payoutFee || 0));
      return sum + received;
    }, 0);

    const completedAmount = (completedRes.data || []).reduce((sum, p) => {
      const received = p.amountReceived ? Number(p.amountReceived) : (Number(p.amount || 0) - Number(p.payoutFee || 0));
      return sum + received;
    }, 0);

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
