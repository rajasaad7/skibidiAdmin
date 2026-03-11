import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  try {
    const body = await request.json();
    const { isSuspended } = body;

    if (typeof isSuspended !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isSuspended must be a boolean' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update({ isSuspended })
      .eq('_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  try {
    // First get user's workspaces
    const workspaceMembersRes = await supabase
      .from('workspace_members')
      .select('workspaceId')
      .eq('userId', userId);

    const workspaceIds = (workspaceMembersRes.data || []).map(m => m.workspaceId);

    const [
      userRes,
      linksRes,
      linksDataRes,
      activeLinksRes,
      keywordsRes,
      keywordsDataRes,
      activeKeywordsRes,
      projectsRes,
      workspacesRes,
      subscriptionRes,
      subscriptionHistoryRes,
      marketplaceOrdersRes,
      marketplaceOrdersDataRes,
      completedOrdersRes,
      publisherOrdersDataRes,
      domainsRes,
      publisherDomainsRes,
      verifiedDomainsRes,
      earningsRes
    ] = await Promise.all([
      // Get user details
      supabase.from('users').select('*').eq('_id', userId).single(),

      // Get links stats
      supabase.from('links').select('_id', { count: 'exact', head: true }).eq('userId', userId),
      // Get all links with full details
      supabase.from('links').select('_id, url, disabled, createdAt, stats, indexedStats, projectId, projects(name)').eq('userId', userId).order('createdAt', { ascending: false }),
      supabase.from('links').select('_id', { count: 'exact', head: true }).eq('userId', userId).neq('disabled', true),

      // Get keywords stats
      supabase.from('keywords').select('_id', { count: 'exact', head: true }).eq('userId', userId),
      // Get all keywords with full details
      supabase.from('keywords').select('_id, keyword, disabled, createdAt, projectId, projects(name)').eq('userId', userId).order('createdAt', { ascending: false }),
      supabase.from('keywords').select('_id', { count: 'exact', head: true }).eq('userId', userId).or('disabled.is.null,disabled.eq.false'),

      // Get projects stats (through workspaces)
      workspaceIds.length > 0
        ? supabase.from('projects').select('_id, name, website, disabled, disabledLastActive, createdAt, workspaceId, workspaces(name)').in('workspaceId', workspaceIds).order('createdAt', { ascending: false })
        : Promise.resolve({ data: [] }),

      // Get workspaces count
      supabase.from('workspace_members').select('workspaceId', { count: 'exact', head: true }).eq('userId', userId),

      // Get subscription info (latest active order)
      supabase.from('orders').select('*').eq('userId', userId).eq('status', 'active').order('createdAt', { ascending: false }).limit(1).single(),
      // Get all subscription history
      supabase.from('orders').select('*').eq('userId', userId).order('createdAt', { ascending: false }),

      // Get marketplace orders (as buyer)
      supabase.from('marketplace_orders').select('_id, totalPrice, status').eq('buyerId', userId),
      // Get marketplace orders with full details (as buyer)
      supabase.from('marketplace_orders').select('_id, totalPrice, platformFee, publisherEarnings, status, createdAt, updatedAt, serviceType, domainId, domains(domainName), orderType:buyerId').eq('buyerId', userId).order('createdAt', { ascending: false }),
      supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }).eq('buyerId', userId).eq('status', 'completed'),

      // Get marketplace orders (as publisher/seller)
      supabase.from('marketplace_orders').select('_id, totalPrice, platformFee, publisherEarnings, status, createdAt, updatedAt, serviceType, domainId, domains(domainName), buyerId').eq('publisherId', userId).order('createdAt', { ascending: false }),

      // Get domains owned by user
      supabase.from('domains').select('_id').eq('userId', userId),
      // Get domain offerings where user is publisher (includes reseller domains)
      supabase.from('domain_offerings').select('"domainId"').eq('"publisherId"', userId),
      // Get domains with full details - will be fetched after we combine domain IDs
      Promise.resolve({ data: [] }), // Placeholder, will fetch after combining IDs
      supabase.from('domains').select('_id', { count: 'exact', head: true }).eq('userId', userId).eq('verificationStatus', 'verified'),

      // Get earnings (as publisher)
      supabase.from('marketplace_orders').select('publisherEarnings').eq('publisherId', userId).eq('status', 'completed')
    ]);

    if (userRes.error) throw userRes.error;

    // Calculate active projects
    const allProjects = projectsRes.data || [];
    const activeProjectsCount = allProjects.filter((p: any) =>
      p.disabled !== true && p.disabledLastActive !== true
    ).length;

    // Calculate marketplace stats
    const totalOrders = marketplaceOrdersRes.data?.length || 0;
    const completedOrders = completedOrdersRes.count || 0;
    const totalSpent = (marketplaceOrdersRes.data || []).reduce((sum, order) =>
      sum + Number(order.totalPrice || 0), 0
    );

    const totalEarnings = (earningsRes.data || []).reduce((sum, order: any) =>
      sum + Number(order.publisherEarnings || 0), 0
    );

    // Combine domain IDs from both owned domains and domain offerings where user is publisher
    const ownedDomainIds = (domainsRes.data || []).map((d: any) => d._id);
    const publisherDomainIds = (publisherDomainsRes.data || []).map((d: any) => d.domainId);
    const allDomainIds = [...new Set([...ownedDomainIds, ...publisherDomainIds])];

    // Fetch full domain details for all domains
    let domainsWithDetails: any[] = [];
    if (allDomainIds.length > 0) {
      const { data: domainsData } = await supabase
        .from('domains')
        .select('_id, domainName, verificationStatus, createdAt, categoryId, domain_categories(name), userId')
        .in('_id', allDomainIds)
        .order('createdAt', { ascending: false });
      domainsWithDetails = domainsData || [];
    }

    // Fetch domain offerings from the separate table
    const domainIds = allDomainIds;
    let offeringsMap = new Map<string, any[]>();

    if (domainIds.length > 0) {
      const { data: offeringsData } = await supabase
        .from('domain_offerings')
        .select(`
          _id,
          "domainId",
          "domainType",
          "publisherId",
          "guestPostEnabled",
          "linkInsertionEnabled",
          "contentWritingEnabled",
          "guestPostPrice",
          "linkInsertionPrice",
          "contentWritingIncluded",
          "contentWritingPrice",
          "minWordCount",
          "maxWordCount",
          "turnaroundTimeDays",
          "contentRequirements",
          "prohibitedNiches",
          "allowedLinkTypes",
          "maxOutboundLinks",
          "examplePosts",
          "searchEngineIndexed",
          "isActive",
          "adminApproved",
          "adminRejectionReason",
          "createdAt",
          "updatedAt"
        `)
        .in('"domainId"', domainIds)
        .order('createdAt', { ascending: true });

      // Create a map of offerings by domainId
      (offeringsData || []).forEach((offering: any) => {
        const domainId = offering.domainId;
        if (!offeringsMap.has(domainId)) {
          offeringsMap.set(domainId, []);
        }
        offeringsMap.get(domainId)!.push(offering);
      });
    }

    // Count verified domains (domains with at least one approved offering)
    let verifiedDomainsCount = 0;
    domainsWithDetails.forEach((domain: any) => {
      const offerings = offeringsMap.get(domain._id) || [];
      if (offerings.some((o: any) => o.adminApproved === true)) {
        verifiedDomainsCount++;
      }
    });

    // Fetch buyer names for publisher orders
    const publisherOrders = publisherOrdersDataRes.data || [];
    const buyerIds = publisherOrders.map((order: any) => order.buyerId).filter(Boolean);

    let buyersMap = new Map();
    if (buyerIds.length > 0) {
      const { data: buyersData } = await supabase
        .from('users')
        .select('_id, fullName')
        .in('_id', buyerIds);

      buyersMap = new Map((buyersData || []).map(user => [user._id, user]));
    }

    // Add buyer names to publisher orders
    const publisherOrdersWithBuyers = publisherOrders.map((order: any) => ({
      ...order,
      users: buyersMap.get(order.buyerId) ? { fullName: buyersMap.get(order.buyerId).fullName } : null
    }));

    // Attach offerings to domains
    const domainsWithOfferings = domainsWithDetails.map((domain: any) => ({
      ...domain,
      publisherOfferings: offeringsMap.get(domain._id) || []
    }));

    return NextResponse.json({
      success: true,
      details: {
        user: userRes.data,
        stats: {
          totalLinks: linksRes.count || 0,
          activeLinks: activeLinksRes.count || 0,
          disabledLinks: (linksRes.count || 0) - (activeLinksRes.count || 0),
          totalKeywords: keywordsRes.count || 0,
          activeKeywords: activeKeywordsRes.count || 0,
          disabledKeywords: (keywordsRes.count || 0) - (activeKeywordsRes.count || 0),
          totalProjects: projectsRes.data?.length || 0,
          activeProjects: activeProjectsCount,
          totalWorkspaces: workspacesRes.count || 0
        },
        subscription: subscriptionRes.data || null,
        marketplace: {
          totalOrders,
          completedOrders,
          totalSpent,
          totalDomains: allDomainIds.length,
          verifiedDomains: verifiedDomainsCount,
          totalEarnings
        },
        // Detailed data for tables
        links: linksDataRes.data || [],
        keywords: keywordsDataRes.data || [],
        projects: projectsRes.data || [],
        subscriptionHistory: subscriptionHistoryRes.data || [],
        marketplaceOrdersBuyer: marketplaceOrdersDataRes.data || [],
        marketplaceOrdersPublisher: publisherOrdersWithBuyers,
        domains: domainsWithOfferings
      }
    });
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    console.error('Error details:', error?.message, error?.details, error?.hint);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user details', details: error?.message },
      { status: 500 }
    );
  }
}
