import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    // Get stats using RPC (much faster for large datasets)
    const { data: statsData, error: statsError } = await supabase.rpc('get_domain_stats');
    console.log('RPC stats response:', statsData);
    console.log('RPC stats error:', statsError);
    const stats = statsData || {
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      domainsWithOwner: 0,
      domainsWithReseller: 0
    };

    // Build query
    let query = supabase
      .from('domains')
      .select(`
        _id,
        domainName,
        url,
        verificationStatus,
        guestPostPrice,
        linkInsertionPrice,
        contentWritingPrice,
        contentWritingIncluded,
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
        minWordCount,
        maxWordCount,
        turnaroundTimeDays,
        contentRequirements,
        prohibitedNiches,
        allowedLinkTypes,
        maxOutboundLinks,
        domainType,
        createdAt,
        userId,
        isActive,
        isFeatured,
        publisherOfferings,
        domain_categories(name)
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
    if (status && status !== 'all') {
      filteredDomains = filteredDomains.filter(domain => {
        const offerings = domain.publisherOfferings || [];

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
      domain.publisherOfferings?.forEach((offering: any) => {
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

    // Enrich publisherOfferings with user data using the map
    const enrichedDomains = (data || []).map(domain => {
      if (!domain.publisherOfferings || domain.publisherOfferings.length === 0) {
        return domain;
      }

      const enrichedOfferings = domain.publisherOfferings.map((offering: any) => {
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

    return NextResponse.json({
      success: true,
      domains: domainsWithCounts,
      stats,
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
