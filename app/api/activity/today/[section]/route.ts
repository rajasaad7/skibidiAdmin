import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { section } = await params;
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayISO = last24Hours.toISOString();

    let data: any[] = [];

    switch (section) {
      case 'newUsers': {
        const res = await supabase
          .from('users')
          .select('_id, fullName, email, createdAt, "UTM"')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newDomains': {
        const res = await supabase
          .from('domains')
          .select('_id, domainName, verificationStatus, createdAt, users:users!domains_userId_fkey(fullName)')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newOrders': {
        const res = await supabase
          .from('orders')
          .select('_id, planName, status, unitPrice, currency, createdAt, users(fullName)')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'activeUsers': {
        const res = await supabase
          .from('users')
          .select('_id, fullName, email, lastActive')
          .gte('lastActive', todayISO)
          .order('lastActive', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newLinks': {
        const res = await supabase
          .from('links')
          .select('_id, url, createdAt, users(fullName), projects(name, website)')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newKeywords': {
        const res = await supabase
          .from('keywords')
          .select('_id, keyword, createdAt, users(fullName)')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newProjects': {
        const res = await supabase
          .from('projects')
          .select('_id, name, website, createdAt, workspaceId')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        const projects = res.data || [];

        const workspaceIds = Array.from(
          new Set(projects.map((p: any) => p.workspaceId).filter(Boolean))
        );
        let workspaceMap: Record<string, { name: string }> = {};
        if (workspaceIds.length > 0) {
          const { data: workspaces } = await supabase
            .from('workspaces')
            .select('_id, name')
            .in('_id', workspaceIds);
          (workspaces || []).forEach((w: any) => {
            workspaceMap[w._id] = { name: w.name };
          });
        }

        data = projects.map((p: any) => ({
          ...p,
          workspace: p.workspaceId ? workspaceMap[p.workspaceId] || null : null,
        }));
        break;
      }

      case 'completedOrders': {
        const res = await supabase
          .from('orders')
          .select('_id, planName, status, updatedAt, users(fullName)')
          .gte('updatedAt', todayISO)
          .eq('status', 'completed')
          .order('updatedAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'newMarketplaceOrders': {
        const res = await supabase
          .from('marketplace_orders')
          .select('_id, totalPrice, status, createdAt, domains(domainName)')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'indexerLinksSubmitted': {
        const res = await supabase
          .from('tool_index_links')
          .select('_id, url, status, createdAt, campaignId, userId')
          .gte('createdAt', todayISO)
          .order('createdAt', { ascending: false });
        const links = res.data || [];

        const campaignIds = Array.from(
          new Set(links.map((l: any) => l.campaignId).filter(Boolean))
        );
        const userIds = Array.from(
          new Set(links.map((l: any) => l.userId).filter(Boolean))
        );

        let campaignMap: Record<string, { name: string }> = {};
        let userMap: Record<string, { fullName: string; email: string }> = {};

        const lookups: PromiseLike<any>[] = [];
        if (campaignIds.length > 0) {
          lookups.push(
            supabase
              .from('indexer_campaigns')
              .select('_id, name')
              .in('_id', campaignIds)
              .then(({ data: campaigns }) => {
                (campaigns || []).forEach((c: any) => {
                  campaignMap[c._id] = { name: c.name };
                });
              })
          );
        }
        if (userIds.length > 0) {
          lookups.push(
            supabase
              .from('users')
              .select('_id, fullName, email')
              .in('_id', userIds)
              .then(({ data: users }) => {
                (users || []).forEach((u: any) => {
                  userMap[u._id] = { fullName: u.fullName, email: u.email };
                });
              })
          );
        }
        await Promise.all(lookups);

        data = links.map((l: any) => ({
          ...l,
          campaign: l.campaignId ? campaignMap[l.campaignId] || null : null,
          user: l.userId ? userMap[l.userId] || null : null,
        }));
        break;
      }

      case 'indexerCreditsPurchased': {
        const res = await supabase
          .from('indexer_credit_transactions')
          .select('_id, credits, organization_id, created_at, organizations(name)')
          .eq('transaction_type', 'purchase')
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false });
        data = res.data || [];
        break;
      }

      case 'indexerCampaignsCreated': {
        const res = await supabase
          .from('indexer_campaigns')
          .select('_id, name, userId, created_at')
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false });
        const campaigns = res.data || [];

        const userIds = Array.from(
          new Set(campaigns.map((c: any) => c.userId).filter(Boolean))
        );
        let userMap: Record<string, { fullName: string; email: string }> = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('_id, fullName, email')
            .in('_id', userIds);
          (users || []).forEach((u: any) => {
            userMap[u._id] = { fullName: u.fullName, email: u.email };
          });
        }

        data = campaigns.map((c: any) => ({
          ...c,
          users: c.userId ? userMap[c.userId] || null : null,
        }));
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown section: ${section}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching activity section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity section' },
      { status: 500 }
    );
  }
}
