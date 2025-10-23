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
  const campaignId = resolvedParams.id;

  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('indexer_campaigns')
      .select('*')
      .eq('_id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    console.log('Campaign from DB:', campaign);
    console.log('Campaign referenceTask:', campaign?.referenceTask);

    // Get user details
    if (campaign.userId) {
      const { data: user } = await supabase
        .from('users')
        .select('_id, fullName, email')
        .eq('_id', campaign.userId)
        .single();

      campaign.user = user;
    }

    // Get organization ID through workspace
    if (campaign.workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('organizationId')
        .eq('_id', campaign.workspaceId)
        .single();

      campaign.organizationId = workspace?.organizationId;
    }

    // Get links for this campaign with pagination
    const { data: links, error: linksError, count } = await supabase
      .from('tool_index_links')
      .select('*', { count: 'exact' })
      .eq('campaignId', campaignId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (linksError) throw linksError;

    console.log('Sample link from DB:', links?.[0]);
    console.log('Sample link referenceTask:', links?.[0]?.referenceTask);

    // Parse referenceTask from JSON string to object
    const parsedLinks = links?.map(link => {
      if (link.referenceTask && typeof link.referenceTask === 'string') {
        try {
          link.referenceTask = JSON.parse(link.referenceTask);
        } catch (e) {
          console.error('Error parsing referenceTask:', e);
        }
      }
      return link;
    }) || [];

    // Get campaign stats - completed if indexedAt is not null
    const [
      totalLinksRes,
      completedLinksRes,
      submittedLinksRes,
      pendingLinksRes
    ] = await Promise.all([
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).eq('campaignId', campaignId),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).eq('campaignId', campaignId).not('indexedAt', 'is', null),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('status', 'submitted'),
      supabase.from('tool_index_links').select('_id', { count: 'exact', head: true }).eq('campaignId', campaignId).eq('status', 'pending'),
    ]);

    const stats = {
      totalLinks: totalLinksRes.count || 0,
      completedLinks: completedLinksRes.count || 0,
      submittedLinks: submittedLinksRes.count || 0,
      pendingLinks: pendingLinksRes.count || 0
    };

    return NextResponse.json({
      success: true,
      campaign,
      links: parsedLinks,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}
