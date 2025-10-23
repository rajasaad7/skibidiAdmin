import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;
  const resolvedParams = await params;
  const organizationId = resolvedParams.id;

  try {
    // Get organization credits
    const { data: orgCredit, error: orgError } = await supabase
      .from('indexer_organization_credits')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (orgError) throw orgError;

    // Get organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('_id, name')
      .eq('_id', organizationId)
      .single();

    const organization = {
      _id: organizationId,
      name: org?.name || 'Unknown',
      current_balance: orgCredit?.current_balance || 0,
      total_purchased: orgCredit?.total_purchased || 0,
      total_used: orgCredit?.total_used || 0
    };

    // Get workspaces for this organization
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('_id')
      .eq('organizationId', organizationId);

    const workspaceIds = workspaces?.map(w => w._id) || [];

    console.log('Workspace IDs for org:', workspaceIds.slice(0, 3));

    // Get campaigns for these workspaces with pagination
    const { data: campaigns, error: campaignsError, count } = await supabase
      .from('indexer_campaigns')
      .select('*', { count: 'exact' })
      .in('workspaceId', workspaceIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (campaignsError) {
      console.error('Campaigns error:', campaignsError);
      throw campaignsError;
    }

    // Get link counts for each campaign
    const campaignIds = campaigns?.map(c => c._id) || [];

    const { data: links } = await supabase
      .from('tool_index_links')
      .select('campaignId')
      .in('campaignId', campaignIds);

    // Create a map of campaign ID to link count
    const linkCountMap = new Map();
    links?.forEach(link => {
      const campId = link.campaignId;
      linkCountMap.set(campId, (linkCountMap.get(campId) || 0) + 1);
    });

    // Enrich campaigns with link counts
    const enrichedCampaigns = campaigns?.map(campaign => ({
      ...campaign,
      link_count: linkCountMap.get(campaign._id) || 0
    })) || [];

    // Get campaign count for this organization
    const { count: campaignCount } = await supabase
      .from('indexer_campaigns')
      .select('_id', { count: 'exact', head: true })
      .in('workspaceId', workspaceIds);

    const organizationWithCount = {
      ...organization,
      campaign_count: campaignCount || 0
    };

    return NextResponse.json({
      success: true,
      organization: organizationWithCount,
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching organization details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization details' },
      { status: 500 }
    );
  }
}
