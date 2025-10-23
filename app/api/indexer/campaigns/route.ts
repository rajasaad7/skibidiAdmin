import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    // Get all campaigns with link counts
    const { data: campaigns, error, count } = await supabase
      .from('indexer_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    console.log('Sample campaign data:', campaigns?.[0]);
    console.log('Total campaigns found:', campaigns?.length);

    // Get user IDs from campaigns - handle both snake_case and camelCase
    const userIds = [...new Set(campaigns?.map(c => c.userId || c.user_id).filter(Boolean) || [])];

    // Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', userIds);

    const usersMap = new Map(users?.map(u => [u._id, u]) || []);

    // Enrich campaigns with user data - handle both snake_case and camelCase
    const enrichedCampaigns = campaigns?.map(campaign => ({
      ...campaign,
      user: usersMap.get(campaign.userId || campaign.user_id)
    })) || [];

    console.log('Enriched campaigns sample:', enrichedCampaigns?.[0]);

    // Get overall stats - indexed if indexedAt is not null
    const [
      totalLinksRes,
      indexedLinksRes,
      pendingLinksRes,
      errorLinksRes,
      creditsRes
    ] = await Promise.all([
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).not('indexedAt', 'is', null),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).is('indexedAt', null).in('status', ['pending', 'submitted']),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).in('status', ['error', 'failed']),
      supabase.from('tool_index_links').select('credits_used'),
    ]);

    const totalCreditsUsed = (creditsRes.data || []).reduce((sum, link) => sum + (link.credits_used || 0), 0);

    const stats = {
      totalCampaigns: count || 0,
      totalLinks: totalLinksRes.count || 0,
      indexedLinks: indexedLinksRes.count || 0,
      pendingLinks: pendingLinksRes.count || 0,
      errorLinks: errorLinksRes.count || 0,
      totalCreditsUsed
    };

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
