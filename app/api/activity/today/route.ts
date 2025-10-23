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
      indexerCreditsPurchasedRes,
      indexerCampaignsCreatedRes,
      totalIndexerLinksRes,
      totalIndexerCampaignsRes,
    ] = await Promise.all([
      // New users today
      supabase.from('users').select('_id, fullName, email, createdAt').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New domains today
      supabase.from('domains').select('_id, domainName, verificationStatus, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New subscription orders today
      supabase.from('orders').select('_id, planName, status, unitPrice, currency, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Users active today (last active today)
      supabase.from('users').select('_id, fullName, email, lastActive').gte('lastActive', todayISO).order('lastActive', { ascending: false }),

      // New links today
      supabase.from('links').select('_id, url, createdAt, users!inner(fullName), projects(name, website)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New keywords today
      supabase.from('keywords').select('_id, keyword, createdAt, users!inner(fullName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // New projects today
      supabase.from('projects').select('_id, name, website, createdAt, workspaceId').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Completed orders today
      supabase.from('orders').select('_id, planName, status, updatedAt, users!inner(fullName)').gte('updatedAt', todayISO).eq('status', 'completed').order('updatedAt', { ascending: false }),

      // New marketplace orders today
      supabase.from('marketplace_orders').select('_id, totalPrice, status, createdAt, domains(domainName)').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Totals for comparison
      supabase.from('users').select('_id', { count: 'exact', head: true }),
      supabase.from('domains').select('_id', { count: 'exact', head: true }),
      supabase.from('links').select('_id', { count: 'exact', head: true }),
      supabase.from('keywords').select('_id', { count: 'exact', head: true }),

      // Indexer links submitted today
      supabase.from('tool_index_links').select('_id, url, status, createdAt, campaignId, userId').gte('createdAt', todayISO).order('createdAt', { ascending: false }),

      // Indexer credits purchased today
      supabase.from('indexer_credit_transactions').select('_id, credits, organization_id, created_at, organizations(name)').eq('transaction_type', 'purchase').gte('created_at', todayISO).order('created_at', { ascending: false }),

      // Indexer campaigns created today
      supabase.from('indexer_campaigns').select('_id, name, userId, created_at, users!inner(fullName, email)').gte('created_at', todayISO).order('created_at', { ascending: false }),

      // Totals for indexer
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }),
      supabase.from('indexer_campaigns').select('_id', { count: 'exact', head: true }),
    ]);

    // Calculate total credits purchased today
    const totalCreditsPurchased = (indexerCreditsPurchasedRes.data || [])
      .reduce((sum, transaction) => sum + (transaction.credits || 0), 0);

    // Enrich indexer links with campaign and user data
    const enrichedIndexerLinks = await Promise.all(
      (indexerLinksSubmittedRes.data || []).map(async (link: any) => {
        const enrichedLink: any = { ...link };

        // Get campaign name
        if (link.campaignId) {
          const { data: campaign } = await supabase
            .from('indexer_campaigns')
            .select('name')
            .eq('_id', link.campaignId)
            .single();
          enrichedLink.campaign = campaign;
        }

        // Get user info
        if (link.userId) {
          const { data: user } = await supabase
            .from('users')
            .select('fullName, email')
            .eq('_id', link.userId)
            .single();
          enrichedLink.user = user;
        }

        return enrichedLink;
      })
    );

    console.log('Projects response error:', newProjectsRes.error);
    console.log('Raw projects data:', newProjectsRes.data?.length, 'projects');
    console.log('Sample project:', newProjectsRes.data?.[0]);

    // Enrich projects with workspace and user data
    const enrichedProjects = await Promise.all(
      (newProjectsRes.data || []).map(async (project: any) => {
        const enrichedProject: any = { ...project };

        // Get workspace name
        if (project.workspaceId) {
          try {
            const { data: workspace } = await supabase
              .from('workspaces')
              .select('name')
              .eq('_id', project.workspaceId)
              .single();

            enrichedProject.workspace = workspace;
          } catch (error) {
            console.error('Error fetching workspace:', error);
          }
        }

        return enrichedProject;
      })
    );

    console.log('Enriched projects:', enrichedProjects.length);
    console.log('Sample enriched project:', enrichedProjects[0]);

    return NextResponse.json({
      success: true,
      activity: {
        newUsers: {
          count: newUsersRes.data?.length || 0,
          data: newUsersRes.data || []
        },
        newDomains: {
          count: newDomainsRes.data?.length || 0,
          data: newDomainsRes.data || []
        },
        newOrders: {
          count: newOrdersRes.data?.length || 0,
          data: newOrdersRes.data || []
        },
        activeUsers: {
          count: activeUsersRes.data?.length || 0,
          data: activeUsersRes.data || []
        },
        newLinks: {
          count: newLinksRes.data?.length || 0,
          data: newLinksRes.data || []
        },
        newKeywords: {
          count: newKeywordsRes.data?.length || 0,
          data: newKeywordsRes.data || []
        },
        newProjects: {
          count: enrichedProjects.length,
          data: enrichedProjects
        },
        completedOrders: {
          count: completedOrdersRes.data?.length || 0,
          data: completedOrdersRes.data || []
        },
        newMarketplaceOrders: {
          count: newMarketplaceOrdersRes.data?.length || 0,
          data: newMarketplaceOrdersRes.data || []
        },
        indexerLinksSubmitted: {
          count: enrichedIndexerLinks.length,
          data: enrichedIndexerLinks
        },
        indexerCreditsPurchased: {
          count: totalCreditsPurchased,
          data: indexerCreditsPurchasedRes.data || []
        },
        indexerCampaignsCreated: {
          count: indexerCampaignsCreatedRes.data?.length || 0,
          data: indexerCampaignsCreatedRes.data || []
        },
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
    console.error('Error fetching today\'s activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today\'s activity' },
      { status: 500 }
    );
  }
}
