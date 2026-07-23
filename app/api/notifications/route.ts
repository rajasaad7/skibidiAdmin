import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all counts in parallel for better performance
    const [contactsResult, bugsResult, statsResult, payoutsResult, processingPayoutsResult, moderationRequestsResult, sinbyteBalanceResult] = await Promise.all([
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

      // Overdue payouts: pending requests older than 7 days that still need action
      supabase
        .from('publisher_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Payouts already marked as processing — these still need to be completed
      supabase
        .from('publisher_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing'),

      // Get count of pending moderation requests (status = 'pending')
      supabase
        .from('moderation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Get the manually-set / auto-decremented Sinbyte indexer balance
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'sinbyte_indexer_balance')
        .maybeSingle()
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
    if (processingPayoutsResult.error) {
      console.error('Processing payouts error:', processingPayoutsResult.error);
    }
    if (moderationRequestsResult.error) {
      console.error('Moderation requests error:', moderationRequestsResult.error);
    }
    if (sinbyteBalanceResult.error) {
      console.error('Sinbyte balance error:', sinbyteBalanceResult.error);
    }

    const sinbyteBalanceRaw = sinbyteBalanceResult.data?.value;
    const sinbyteBalance = sinbyteBalanceRaw ? parseFloat(sinbyteBalanceRaw) : null;
    const lowSinbyteBalance =
      sinbyteBalance !== null && Number.isFinite(sinbyteBalance) && sinbyteBalance < 500;

    // RPC returns an array with one row, so we need to get the first element
    const statsRow = statsResult.data && statsResult.data.length > 0 ? statsResult.data[0] : null;
    const stats = statsRow || { pending: 0, updateRequests: 0 };

    return NextResponse.json({
      success: true,
      notifications: {
        newContacts: contactsResult.count || 0,
        newBugs: bugsResult.count || 0,
        pendingDomains: stats.pending || 0,
        updateRequests: stats.updateRequests || 0,
        pendingPayouts: (payoutsResult.count || 0) + (processingPayoutsResult.count || 0),
        pendingModerationRequests: moderationRequestsResult.count || 0,
        lowSinbyteBalance,
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
