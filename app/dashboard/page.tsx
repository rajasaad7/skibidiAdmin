import { supabase } from '@/lib/supabase';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

// Tiered marketplace fee per completed order.
// - Featured Domain orders: full totalPrice goes to the marketplace.
// - basePrice < 20: $2.50 buyer flat + 2.5% seller of basePrice
// - basePrice 20–100: $5 flat ($2.50 each side)
// - basePrice > 100: 5% of basePrice (2.5% each side)
function calcMarketplaceFee(order: { basePrice: number | null; totalPrice: number | null; serviceType: string | null }) {
  if (order.serviceType === 'featured_domain') {
    return Number(order.totalPrice || 0);
  }
  const base = Number(order.basePrice || 0);
  if (base <= 0) return 0;
  if (base < 20) return 2.5 + 0.025 * base;
  if (base <= 100) return 5;
  return 0.05 * base;
}

async function getMarketplaceStats() {
  try {
    const orderCount = (build: (q: any) => any) =>
      build(supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStartIso = monthStart.toISOString();
    const lastMonthStartIso = lastMonthStart.toISOString();

    const [
      domainStatsRes,
      ordersRes,
      usersRes,
      thisMonthOrdersRes,
      lastMonthOrdersRes,
      pendingOrdersRes,
      activeOrdersRes,
      completedOrdersRes,
      cancelledOrdersRes,
      topPublishersRes,
      categoryStatsRes
    ] = await Promise.all([
      // Use RPC for domain stats
      supabase.rpc('get_domain_stats'),

      // Total orders
      supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }),

      // Total users
      supabase.from('users').select('_id', { count: 'exact', head: true }),

      // Completed orders this month (by completedAt; NOT NULL guaranteed for completed orders)
      supabase.from('marketplace_orders')
        .select('basePrice, totalPrice, serviceType, completedAt')
        .eq('status', 'completed')
        .gte('completedAt', monthStartIso),

      // Completed orders last month (>= last month start, < this month start)
      supabase.from('marketplace_orders')
        .select('basePrice, totalPrice, serviceType, completedAt')
        .eq('status', 'completed')
        .gte('completedAt', lastMonthStartIso)
        .lt('completedAt', monthStartIso),

      // Order status counts across the full table
      orderCount((q) => q.in('status', ['pending_payment', 'payment_processing'])),
      orderCount((q) => q.in('status', ['paid', 'in_progress', 'accepted', 'submitted'])),
      orderCount((q) => q.eq('status', 'completed')),
      orderCount((q) => q.in('status', ['cancelled', 'refunded'])),

      // Top publishers by earnings
      supabase.from('marketplace_orders')
        .select('publisherId, publisherEarnings')
        .eq('status', 'completed')
        .order('createdAt', { ascending: false })
        .limit(1000),

      // Domain categories distribution (all verified domains)
      supabase.from('domains')
        .select('categoryId, domain_categories(name)')
        .eq('verificationStatus', 'verified')
        .limit(10000)
    ]);

    // RPC returns an array of rows; unwrap the first row.
    const domainStatsRow = Array.isArray(domainStatsRes.data)
      ? domainStatsRes.data[0]
      : domainStatsRes.data;
    const domainStats = {
      total: Number(domainStatsRow?.total || 0),
      pending: Number(domainStatsRow?.pending || 0),
      verified: Number(domainStatsRow?.verified || 0),
      rejected: Number(domainStatsRow?.rejected || 0),
    };

    const sumMarketplaceFee = (rows: any[] | null) =>
      (rows || []).reduce((sum, o) => sum + calcMarketplaceFee(o), 0);

    const marketplaceFeeThisMonth = sumMarketplaceFee(thisMonthOrdersRes.data);
    const marketplaceFeeLastMonth = sumMarketplaceFee(lastMonthOrdersRes.data);

    const ordersByStatus = {
      pending: pendingOrdersRes.count || 0,
      active: activeOrdersRes.count || 0,
      completed: completedOrdersRes.count || 0,
      cancelled: cancelledOrdersRes.count || 0,
    };

    // Top publishers
    const publisherEarnings = (topPublishersRes.data || []).reduce((acc: any, order) => {
      const id = order.publisherId;
      if (!acc[id]) acc[id] = 0;
      acc[id] += Number(order.publisherEarnings || 0);
      return acc;
    }, {});

    // Get top 5 publisher IDs
    const topPublisherIds = Object.entries(publisherEarnings)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    // Fetch publisher names
    const { data: publishersData } = await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', topPublisherIds);

    const publishersMap = new Map((publishersData || []).map(user => [user._id, user]));

    // Category distribution
    const categoryCount = (categoryStatsRes.data || []).reduce((acc: any, domain: any) => {
      const cat = domain.domain_categories?.name || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return {
      domains: domainStats,
      totalOrders: ordersRes.count || 0,
      totalUsers: usersRes.count || 0,
      marketplaceFee: {
        thisMonth: marketplaceFeeThisMonth,
        lastMonth: marketplaceFeeLastMonth,
      },
      ordersByStatus,
      topPublishers: Object.entries(publisherEarnings)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, earnings]) => ({
          id,
          name: publishersMap.get(id)?.fullName || 'Unknown',
          email: publishersMap.get(id)?.email || '',
          earnings: Number(earnings)
        })),
      categoryDistribution: Object.entries(categoryCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .map(([name, count]) => [name, Number(count)] as [string, number]),
    };
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    return {
      domains: { total: 0, pending: 0, verified: 0, rejected: 0 },
      totalOrders: 0,
      totalUsers: 0,
      marketplaceFee: { thisMonth: 0, lastMonth: 0 },
      ordersByStatus: { pending: 0, active: 0, completed: 0, cancelled: 0 },
      topPublishers: [],
      categoryDistribution: [],
    };
  }
}

async function getMonitoringStats() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      linksRes,
      keywordsRes,
      projectsRes,
      workspacesRes,
      usersRes,
      monitoringRes,
      linksAddedTodayRes,
      linksAddedWeekRes,
      keywordsAddedTodayRes,
      keywordsAddedWeekRes,
      usersAddedTodayRes
    ] = await Promise.all([
      // Total links
      supabase.from('links').select('_id', { count: 'exact', head: true }),

      // Total keywords
      supabase.from('keywords').select('_id', { count: 'exact', head: true }),

      // Total projects
      supabase.from('projects').select('_id', { count: 'exact', head: true }),

      // Total workspaces
      supabase.from('workspaces').select('_id', { count: 'exact', head: true }),

      // Total users
      supabase.from('users').select('_id', { count: 'exact', head: true }),

      // Every breakdown computed in SQL (links active/paused/disabled + found/indexed/
      // issues, projects active/inactive/disabled, keywords, paid orgs/users, top-5
      // users + projects). Replaces the old length-of-RPC-result and .limit(10000)
      // fetches, which PostgREST capped at 1000 rows (Active links was pinned at 1,000,
      // projects at ~1,000), and the legacy Paddle `orders` table for "paid users".
      supabase.rpc('admin_dashboard_monitoring_stats'),

      // Links added today
      supabase.from('links')
        .select('_id', { count: 'exact', head: true })
        .gte('createdAt', today.toISOString()),

      // Links added this week
      supabase.from('links')
        .select('_id', { count: 'exact', head: true })
        .gte('createdAt', weekAgo.toISOString()),

      // Keywords added today
      supabase.from('keywords')
        .select('_id', { count: 'exact', head: true })
        .gte('createdAt', today.toISOString()),

      // Keywords added this week
      supabase.from('keywords')
        .select('_id', { count: 'exact', head: true })
        .gte('createdAt', weekAgo.toISOString()),

      // Users added today
      supabase.from('users')
        .select('_id', { count: 'exact', head: true })
        .gte('createdAt', today.toISOString()),
    ]);

    // Counters from the SQL RPC (exact, no row cap). Link states sum to total:
    // active = what the engine monitors (link + project enabled, project has a website),
    // paused = project disabledLastActive (inactivity pause), disabled = everything else.
    if (monitoringRes.error) {
      console.error('admin_dashboard_monitoring_stats error:', monitoringRes.error);
    }
    const m = (monitoringRes.data || {}) as {
      links?: { total?: number; active?: number; paused?: number; disabled?: number; found?: number; indexed?: number; issues?: number };
      projects?: { total?: number; active?: number; inactive?: number; disabled?: number };
      keywords?: { total?: number; active?: number; disabled?: number };
      paidOrganizations?: number;
      paidUsers?: number;
      topUsers?: Array<{ userId: string; fullName: string | null; email: string | null; linkCount: number }>;
      topProjects?: Array<{ projectId: string; projectName: string | null; projectWebsite: string | null; linkCount: number }>;
    };
    const linkStats = m.links || {};
    const projectStats = m.projects || {};
    const keywordStats = m.keywords || {};

    const foundLinks = Number(linkStats.found || 0);
    const indexedLinks = Number(linkStats.indexed || 0);
    const issueLinks = Number(linkStats.issues || 0);
    const activeLinksCount = Number(linkStats.active || 0);
    const pausedLinksCount = Number(linkStats.paused || 0);
    const disabledLinksCount = Number(linkStats.disabled || 0);
    const activeKeywordsCount = Number(keywordStats.active || 0);
    const disabledKeywordsCount = Number(keywordStats.disabled || 0);

    // Projects: active = not disabled and not disabledLastActive,
    // inactive = disabledLastActive (auto-paused), disabled = disabled
    const activeProjectsCount = Number(projectStats.active || 0);
    const inactiveProjectsCount = Number(projectStats.inactive || 0);
    const disabledProjectsCount = Number(projectStats.disabled || 0);

    // Top users / projects by active-link count (grouped in SQL, names joined there)
    const usersWithMostLinks = (m.topUsers || []).map(u => ({
      userId: u.userId,
      fullName: u.fullName || 'Unknown',
      email: u.email || '',
      linkCount: Number(u.linkCount || 0)
    }));

    const projectsWithMostLinks = (m.topProjects || []).map(p => ({
      projectId: p.projectId,
      projectName: p.projectName || 'Unknown',
      projectWebsite: p.projectWebsite || null,
      linkCount: Number(p.linkCount || 0)
    }));

    // Top ranking keywords (rank <= 3): exact count, not a capped row fetch
    const { count: topRankCount } = await supabase
      .from('keywords')
      .select('_id', { count: 'exact', head: true })
      .lte('position', 3);

    // Paid users = owners (super_admin) of organizations whose billingMeta resolves to a
    // live non-free plan (Stripe / Dodo / admin grant). The old code read the legacy
    // Paddle `orders` table, which nothing has written to since Paddle was removed.
    const paidUsersCount = Number(m.paidUsers || 0);
    const freeUsersCount = Math.max(0, (usersRes.count || 0) - paidUsersCount);

    return {
      totalLinks: linksRes.count || 0,
      activeLinks: activeLinksCount,
      pausedLinks: pausedLinksCount,
      disabledLinks: disabledLinksCount,
      totalKeywords: keywordsRes.count || 0,
      activeKeywords: activeKeywordsCount,
      disabledKeywords: disabledKeywordsCount,
      totalProjects: projectsRes.count || 0,
      activeProjects: activeProjectsCount,
      inactiveProjects: inactiveProjectsCount,
      disabledProjects: disabledProjectsCount,
      totalUsers: usersRes.count || 0,
      paidUsers: paidUsersCount,
      paidOrganizations: Number(m.paidOrganizations || 0),
      freeUsers: freeUsersCount,
      totalWorkspaces: workspacesRes.count || 0,
      foundLinks,
      indexedLinks,
      issueLinks,
      topRankKeywords: topRankCount || 0,
      usersWithMostLinks,
      projectsWithMostLinks,
      recentActivity: {
        linksAddedToday: linksAddedTodayRes.count || 0,
        keywordsAddedToday: keywordsAddedTodayRes.count || 0,
        linksAddedThisWeek: linksAddedWeekRes.count || 0,
        keywordsAddedThisWeek: keywordsAddedWeekRes.count || 0,
        usersAddedToday: usersAddedTodayRes.count || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    return {
      totalLinks: 0,
      activeLinks: 0,
      pausedLinks: 0,
      disabledLinks: 0,
      totalKeywords: 0,
      activeKeywords: 0,
      disabledKeywords: 0,
      totalProjects: 0,
      activeProjects: 0,
      inactiveProjects: 0,
      disabledProjects: 0,
      totalUsers: 0,
      paidUsers: 0,
      paidOrganizations: 0,
      freeUsers: 0,
      totalWorkspaces: 0,
      foundLinks: 0,
      indexedLinks: 0,
      issueLinks: 0,
      topRankKeywords: 0,
      usersWithMostLinks: [],
      projectsWithMostLinks: [],
      recentActivity: {
        linksAddedToday: 0,
        keywordsAddedToday: 0,
        linksAddedThisWeek: 0,
        keywordsAddedThisWeek: 0,
        usersAddedToday: 0,
      },
    };
  }
}

export default async function DashboardPage() {
  const [monitoringStats, marketplaceStats] = await Promise.all([
    getMonitoringStats(),
    getMarketplaceStats()
  ]);

  return (
    <DashboardContent
      monitoringStats={monitoringStats}
      marketplaceStats={marketplaceStats}
    />
  );
}
