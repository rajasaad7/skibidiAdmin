import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all counts in parallel for better performance
    const [contactsResult, bugsResult, statsResult, payoutsResult] = await Promise.all([
      // Get count of new contacts (status = 'new' or 'pending')
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.new,status.eq.pending,status.is.null'),

      // Get count of open bug reports (status = 'open')
      supabase
        .from('bug_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open'),

      // Get domain stats using RPC function (same as domains page)
      supabase.rpc('get_domain_stats'),

      // Get count of pending payouts (status = 'pending' or 'requested')
      supabase
        .from('publisher_payouts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing'])
    ]);

    if (contactsResult.error) {
      console.error('Contacts error:', contactsResult.error);
    }
    if (bugsResult.error) {
      console.error('Bugs error:', bugsResult.error);
    }
    if (statsResult.error) {
      console.error('Stats error:', statsResult.error);
    }
    if (payoutsResult.error) {
      console.error('Payouts error:', payoutsResult.error);
    }

    const stats = statsResult.data || { pending: 0 };

    return NextResponse.json({
      success: true,
      notifications: {
        newContacts: contactsResult.count || 0,
        newBugs: bugsResult.count || 0,
        pendingDomains: stats.pending || 0,
        pendingPayouts: payoutsResult.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
