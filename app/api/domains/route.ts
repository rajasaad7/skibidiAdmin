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
    console.log('RPC stats response:', statsData);
    console.log('RPC stats error:', statsError);
    // RPC returns an array with one row, so we need to get the first element
    const statsRow = statsData && statsData.length > 0 ? statsData[0] : null;
    const stats = statsRow || {
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      domainsWithOwner: 0,
      domainsWithReseller: 0
    };

    // Build query - join with domain_offerings table
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
        domain_categories(name),
        domain_offerings(
          _id,
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
        )
      `);

    // Apply search filter if provided
    if (search && search.trim()) {
      query = query.ilike('domainName', `%${search.trim()}%`);
    }

    query = query.order('createdAt', { ascending: false });

    const { data: allDomains, error } = await query;

    if (error) throw error;

    // Filter domains based on status BEFORE pagination
    let filteredDomains = allDomains || [];

    // Apply uncategorized filter if requested
    if (uncategorized) {
      filteredDomains = filteredDomains.filter(domain =>
        domain.categoryId === 'b396a018-9721-4aff-b554-5acd46b098d3'
      );
    }

    if (status && status !== 'all') {
      filteredDomains = filteredDomains.filter(domain => {
        const offerings = domain.domain_offerings || [];

        if (status === 'pending') {
          return offerings.some((o: any) => o.adminApproved === null || o.adminApproved === undefined || o.adminApproved === '');
        } else if (status === 'verified') {
          return offerings.some((o: any) => o.adminApproved === true);
        } else if (status === 'rejected') {
          return offerings.some((o: any) => o.adminApproved === false);
        }
        return true;
      });
    }

    // Get total count for filtered results
    const totalCount = filteredDomains.length;

    // Apply pagination to filtered results
    const data = filteredDomains.slice(offset, offset + limit);

    // Collect all unique publisher IDs from current page
    const publisherIds = new Set<string>();
    (data || []).forEach(domain => {
      domain.domain_offerings?.forEach((offering: any) => {
        if (offering.publisherId) {
          publisherIds.add(offering.publisherId);
        }
      });
    });

    // Fetch all users in one query
    const { data: usersData } = await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', Array.from(publisherIds));

    // Create a map for quick lookup
    const usersMap = new Map(
      (usersData || []).map(user => [user._id, user])
    );

    // Enrich domain_offerings with user data using the map
    const enrichedDomains = (data || []).map(domain => {
      if (!domain.domain_offerings || domain.domain_offerings.length === 0) {
        return {
          ...domain,
          publisherOfferings: [] // Keep backward compatibility
        };
      }

      // IMPORTANT: Sort offerings by createdAt to match the order used in approve-offering API
      const sortedOfferings = [...domain.domain_offerings].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB; // Ascending order (oldest first)
      });

      const enrichedOfferings = sortedOfferings.map((offering: any) => {
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
        publisherOfferings: enrichedOfferings // Map to old name for backward compatibility
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

    // Calculate uncategorized count from all domains
    const uncategorizedCount = (allDomains || []).filter(domain =>
      domain.categoryId === 'b396a018-9721-4aff-b554-5acd46b098d3'
    ).length;

    return NextResponse.json({
      success: true,
      domains: domainsWithCounts,
      stats: {
        ...stats,
        uncategorized: uncategorizedCount
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
