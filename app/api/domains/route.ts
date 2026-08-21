import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const uncategorized = searchParams.get('uncategorized') === 'true';
  const updateRequests = searchParams.get('updateRequests') === 'true';
  const offset = (page - 1) * limit;

  try {
    // If ID is provided, fetch single domain by ID
    if (id) {
      const { data, error } = await supabase
        .from('domains')
        .select('_id, domainName')
        .eq('_id', id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        domains: data ? [data] : []
      });
    }
    // Get stats using RPC (much faster for large datasets)
    const { data: statsData, error: statsError } = await supabase.rpc('get_domain_stats');
    // RPC returns an array with one row, so we need to get the first element
    const statsRow = statsData && statsData.length > 0 ? statsData[0] : null;
    const stats = statsRow || {
      total: 0,
      pending: 0,
      rejected: 0,
      domainsWithOwner: 0,
      domainsWithReseller: 0,
      updateRequests: 0
    };

    // Use RPC for efficient filtering when status filter is applied
    let paginatedDomains: any[] = [];
    let totalCount = 0;

    if (status && status !== 'all') {
      // Use RPC function for efficient server-side filtering
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_filtered_domains_by_status', {
        filter_status: status,
        search_term: search && search.trim() ? search.trim() : null,
        is_uncategorized: uncategorized,
        has_update_requests: updateRequests,
        page_num: page,
        page_limit: limit
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      // Extract domain IDs and total count from RPC result
      const domainIds = rpcResult?.map((r: any) => r.domain_id) || [];
      totalCount = rpcResult && rpcResult.length > 0 ? rpcResult[0].total_count : 0;

      if (domainIds.length === 0) {
        return NextResponse.json({
          success: true,
          domains: [],
          stats: {
            ...stats,
            uncategorized: 0
          },
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }

      // Fetch full domain data for the filtered IDs
      const { data, error } = await supabase
        .from('domains')
        .select(`
          _id,
          domainName,
          url,
          verificationStatus,
          domainRating,
          domainAuthority,
          pageAuthority,
          trustFlow,
          citationFlow,
          spamScore,
          organicTraffic,
          referringDomains,
          categoryId,
          description,
          language,
          country,
          domainType,
          createdAt,
          userId,
          isActive,
          isFeatured,
          editHistory,
          prohibitedNiche,
          prohibitedNicheReason,
          prohibitedNicheSource,
          prohibitedNicheDetectedAt,
          domain_categories(name)
        `)
        .in('_id', domainIds)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      paginatedDomains = data || [];
    } else {
      // No status filter, use regular query
      let query = supabase
        .from('domains')
        .select(`
          _id,
          domainName,
          url,
          verificationStatus,
          domainRating,
          domainAuthority,
          pageAuthority,
          trustFlow,
          citationFlow,
          spamScore,
          organicTraffic,
          referringDomains,
          categoryId,
          description,
          language,
          country,
          domainType,
          createdAt,
          userId,
          isActive,
          isFeatured,
          editHistory,
          prohibitedNiche,
          prohibitedNicheReason,
          prohibitedNicheSource,
          prohibitedNicheDetectedAt,
          domain_categories(name)
        `);

      // Apply search filter
      if (search && search.trim()) {
        query = query.ilike('domainName', `%${search.trim()}%`);
      }

      // Apply uncategorized filter
      if (uncategorized) {
        query = query.eq('categoryId', 'b396a018-9721-4aff-b554-5acd46b098d3');
      }

      // Apply update requests filter
      if (updateRequests) {
        query = query.eq('"updateStats"', true);
      }

      query = query.order('createdAt', { ascending: false });

      // Get total count for filtered results
      let countQuery = supabase
        .from('domains')
        .select('_id', { count: 'exact', head: true });

      if (search && search.trim()) {
        countQuery = countQuery.ilike('domainName', `%${search.trim()}%`);
      }

      if (uncategorized) {
        countQuery = countQuery.eq('categoryId', 'b396a018-9721-4aff-b554-5acd46b098d3');
      }

      if (updateRequests) {
        countQuery = countQuery.eq('"updateStats"', true);
      }

      const { count, error: countError } = await countQuery;

      if (countError && countError.code !== 'PGRST116') {
        console.error('Count error:', countError);
      }

      totalCount = count || 0;

      // Apply pagination at database level
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;
      paginatedDomains = data || [];
    }

    // Now fetch offerings only for the paginated results
    const domainIds = (paginatedDomains || []).map(d => d._id);

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
    const offeringsMap = new Map<string, any[]>();
    (offeringsData || []).forEach(offering => {
      const domainId = offering.domainId;
      if (!offeringsMap.has(domainId)) {
        offeringsMap.set(domainId, []);
      }
      offeringsMap.get(domainId)!.push(offering);
    });

    // Attach offerings to domains
    const filteredData = (paginatedDomains || []).map(domain => ({
      ...domain,
      domain_offerings: offeringsMap.get(domain._id) || []
    }));

    // Collect all unique publisher IDs from filtered data
    const publisherIds = new Set<string>();
    (filteredData || []).forEach(domain => {
      domain.domain_offerings?.forEach((offering: any) => {
        if (offering.publisherId) {
          publisherIds.add(offering.publisherId);
        }
      });
    });

    // Fetch all users in one query (only for paginated results)
    const { data: usersData } = publisherIds.size > 0 ? await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', Array.from(publisherIds)) : { data: [] };

    // Create a map for quick lookup
    const usersMap = new Map(
      (usersData || []).map(user => [user._id, user])
    );

    // Enrich domain_offerings with user data
    const enrichedDomains = (filteredData || []).map(domain => {
      if (!domain.domain_offerings || domain.domain_offerings.length === 0) {
        return {
          ...domain,
          publisherOfferings: []
        };
      }

      const enrichedOfferings = domain.domain_offerings.map((offering: any) => {
        if (!offering.publisherId) {
          return offering;
        }

        const userData = usersMap.get(offering.publisherId);
        return {
          ...offering,
          publisherName: userData?.fullName || null,
          publisherEmail: userData?.email || null
        };
      });

      return {
        ...domain,
        publisherOfferings: enrichedOfferings
      };
    });

    // Add offering counts to each domain
    const domainsWithCounts = enrichedDomains.map(domain => {
      const offerings = domain.publisherOfferings || [];
      return {
        ...domain,
        totalOfferings: offerings.length,
        pendingOfferings: offerings.filter((o: any) => o.adminApproved === null || o.adminApproved === undefined || o.adminApproved === '').length,
        verifiedOfferings: offerings.filter((o: any) => o.adminApproved === true).length,
        rejectedOfferings: offerings.filter((o: any) => o.adminApproved === false).length
      };
    });

    // Get uncategorized count (efficient query)
    const { count: uncategorizedCount } = await supabase
      .from('domains')
      .select('_id', { count: 'exact', head: true })
      .eq('categoryId', 'b396a018-9721-4aff-b554-5acd46b098d3');

    return NextResponse.json({
      success: true,
      domains: domainsWithCounts,
      stats: {
        ...stats,
        uncategorized: uncategorizedCount || 0
      },
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}
