import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayISO = last24Hours.toISOString();

    const [
      newUsersRes,
      newDomainsRes,
      newOrdersRes,
      activeUsersRes,
      newLinksRes,
      newKeywordsRes,
      newProjectsRes,
      completedOrdersRes,
      newMarketplaceOrdersRes,
      totalUsersRes,
      totalDomainsRes,
      totalLinksRes,
      totalKeywordsRes,
      indexerLinksSubmittedRes,
      indexerCreditsPurchasedSumRes,
      indexerCampaignsCreatedRes,
      totalIndexerLinksRes,
      totalIndexerCampaignsRes,
    ] = await Promise.all([
      supabase.from('users').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('domains').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('orders').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('users').select('_id', { count: 'exact', head: true }).gte('lastActive', todayISO),
      supabase.from('links').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('keywords').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('projects').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('orders').select('_id', { count: 'exact', head: true }).gte('updatedAt', todayISO).eq('status', 'completed'),
      supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),

      supabase.from('users').select('_id', { count: 'exact', head: true }),
      supabase.from('domains').select('_id', { count: 'exact', head: true }),
      supabase.from('links').select('_id', { count: 'exact', head: true }),
      supabase.from('keywords').select('_id', { count: 'exact', head: true }),

      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).gte('createdAt', todayISO),
      supabase.from('indexer_credit_transactions').select('credits').eq('transaction_type', 'purchase').gte('created_at', todayISO),
      supabase.from('indexer_campaigns').select('_id', { count: 'exact', head: true }).gte('created_at', todayISO),

      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }),
      supabase.from('indexer_campaigns').select('_id', { count: 'exact', head: true }),
    ]);

    const totalCreditsPurchased = (indexerCreditsPurchasedSumRes.data || [])
      .reduce((sum: number, t: any) => sum + (t.credits || 0), 0);

    return NextResponse.json({
      success: true,
      activity: {
        newUsers: { count: newUsersRes.count || 0 },
        newDomains: { count: newDomainsRes.count || 0 },
        newOrders: { count: newOrdersRes.count || 0 },
        activeUsers: { count: activeUsersRes.count || 0 },
        newLinks: { count: newLinksRes.count || 0 },
        newKeywords: { count: newKeywordsRes.count || 0 },
        newProjects: { count: newProjectsRes.count || 0 },
        completedOrders: { count: completedOrdersRes.count || 0 },
        newMarketplaceOrders: { count: newMarketplaceOrdersRes.count || 0 },
        indexerLinksSubmitted: { count: indexerLinksSubmittedRes.count || 0 },
        indexerCreditsPurchased: { count: totalCreditsPurchased },
        indexerCampaignsCreated: { count: indexerCampaignsCreatedRes.count || 0 },
        totals: {
          users: totalUsersRes.count || 0,
          domains: totalDomainsRes.count || 0,
          links: totalLinksRes.count || 0,
          keywords: totalKeywordsRes.count || 0,
          indexerLinks: totalIndexerLinksRes.count || 0,
          indexerCampaigns: totalIndexerCampaignsRes.count || 0,
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching today\'s activity counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today\'s activity' },
      { status: 500 }
    );
  }
}
