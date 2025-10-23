import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    // Get all organization credits with pagination
    const { data: orgCredits, error, count } = await supabase
      .from('indexer_organization_credits')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get organization details (names)
    const orgIds = orgCredits?.map(org => org.organization_id) || [];

    console.log('Sample org credit:', orgCredits?.[0]);
    console.log('Organization IDs:', orgIds.slice(0, 3));

    const { data: orgs } = await supabase
      .from('organizations')
      .select('_id, name')
      .in('_id', orgIds);

    console.log('Found organizations:', orgs?.slice(0, 3));

    const orgsMap = new Map(orgs?.map(o => [o._id, o]) || []);

    // Get workspaces for all organizations
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('_id, organizationId')
      .in('organizationId', orgIds);

    // Get campaigns for all workspaces
    const workspaceIds = workspaces?.map(w => w._id) || [];
    const { data: campaigns } = await supabase
      .from('indexer_campaigns')
      .select('workspaceId')
      .in('workspaceId', workspaceIds);

    // Create workspace to organization map
    const workspaceOrgMap = new Map(workspaces?.map(w => [w._id, w.organizationId]) || []);

    // Create a map of organization ID to campaign count
    const campaignCountMap = new Map();
    campaigns?.forEach(campaign => {
      const orgId = workspaceOrgMap.get(campaign.workspaceId);
      if (orgId) {
        campaignCountMap.set(orgId, (campaignCountMap.get(orgId) || 0) + 1);
      }
    });

    // Enrich organizations with campaign counts and names
    const enrichedOrganizations = orgCredits?.map(orgCredit => ({
      _id: orgCredit.organization_id,
      name: orgsMap.get(orgCredit.organization_id)?.name || 'Unknown',
      current_balance: orgCredit.current_balance || 0,
      total_purchased: orgCredit.total_purchased || 0,
      total_used: orgCredit.total_used || 0,
      campaign_count: campaignCountMap.get(orgCredit.organization_id) || 0
    })) || [];

    // Get overall stats
    const [
      totalOrgsRes,
      totalCampaignsRes,
      creditsRes
    ] = await Promise.all([
      supabase.from('indexer_organization_credits').select('_id', { count: 'exact', head: true }),
      supabase.from('indexer_campaigns').select('_id', { count: 'exact', head: true }),
      supabase.from('indexer_organization_credits').select('current_balance, total_used'),
    ]);

    const totalCredits = (creditsRes.data || []).reduce((sum, org) => sum + (org.current_balance || 0), 0);
    const totalUsedCredits = (creditsRes.data || []).reduce((sum, org) => sum + (org.total_used || 0), 0);

    const stats = {
      totalOrganizations: totalOrgsRes.count || 0,
      totalCampaigns: totalCampaignsRes.count || 0,
      totalCredits,
      totalUsedCredits
    };

    return NextResponse.json({
      success: true,
      organizations: enrichedOrganizations,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
