import { supabase } from '@/lib/supabase';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

async function getMarketplaceStats() {
  try {
    const [
      domainStatsRes,
      ordersRes,
      usersRes,
      revenueRes,
      recentOrdersRes,
      topPublishersRes,
      categoryStatsRes
    ] = await Promise.all([
      // Use RPC for domain stats
      supabase.rpc('get_domain_stats'),

      // Total orders
      supabase.from('marketplace_orders').select('_id', { count: 'exact', head: true }),

      // Total users
      supabase.from('users').select('_id', { count: 'exact', head: true }),

      // Total revenue (sum of all completed orders)
      supabase.from('marketplace_orders')
        .select('totalPrice, platformFee')
        .eq('status', 'completed'),

      // Recent orders for activity
      supabase.from('marketplace_orders')
        .select('status')
        .order('createdAt', { ascending: false })
        .limit(100),

      // Top publishers by earnings
      supabase.from('marketplace_orders')
        .select('publisherId, publisherEarnings')
        .eq('status', 'completed')
        .order('createdAt', { ascending: false })
        .limit(1000),

      // Domain categories distribution
      supabase.from('domains')
        .select('categoryId, domain_categories(name)')
        .limit(1000)
    ]);

    const domainStats = domainStatsRes.data || { total: 0, pending: 0, verified: 0, rejected: 0 };

    // Calculate revenue
    const totalRevenue = (revenueRes.data || []).reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const platformRevenue = (revenueRes.data || []).reduce((sum, order) => sum + Number(order.platformFee || 0), 0);

    // Order status breakdown
    const orders = recentOrdersRes.data || [];
    const ordersByStatus = {
      pending: orders.filter(o => o.status === 'pending_payment' || o.status === 'payment_processing').length,
      active: orders.filter(o => o.status === 'paid' || o.status === 'in_progress').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length,
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
    const categoryCount = (categoryStatsRes.data || []).reduce((acc: any, domain) => {
      const cat = domain.domain_categories?.[0]?.name || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return {
      domains: domainStats,
      totalOrders: ordersRes.count || 0,
      totalUsers: usersRes.count || 0,
      revenue: {
        total: totalRevenue,
        platform: platformRevenue,
      },
      ordersByStatus,
      topPublishers: Object.entries(publisherEarnings)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, earnings]) => ({
          id,
          name: publishersMap.get(id)?.fullName || 'Unknown',
          email: publishersMap.get(id)?.email || '',
          earnings
        })),
      categoryDistribution: Object.entries(categoryCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    return {
      domains: { total: 0, pending: 0, verified: 0, rejected: 0 },
      totalOrders: 0,
      totalUsers: 0,
      revenue: { total: 0, platform: 0 },
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
      activeLinksRes,
      disabledLinksRes,
      activeKeywordsRes,
      disabledKeywordsRes,
      activeProjectsRes,
      disabledProjectsRes,
      linkStatsRes,
      topUsersRes,
      topProjectsRes,
      linksAddedTodayRes,
      linksAddedWeekRes,
      keywordsAddedTodayRes,
      keywordsAddedWeekRes,
      usersAddedTodayRes,
      activeOrdersRes
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

      // Get active links using RPC (same as old super admin)
      supabase.rpc('get_active_links_with_active_projects', { p_limit: 10000 }),

      // Placeholder for disabled count - will be calculated
      Promise.resolve({ count: 0 }),

      // Active keywords
      supabase.from('keywords')
        .select('_id', { count: 'exact', head: true })
        .or('disabled.is.null,disabled.eq.false'),

      // Disabled keywords
      supabase.from('keywords')
        .select('_id', { count: 'exact', head: true })
        .eq('disabled', true),

      // Active projects (both disabled and disabledLastActive are false/null)
      supabase.from('projects')
        .select('_id, disabled, disabledLastActive', { count: 'exact' }),

      // This will be calculated from the data above
      supabase.from('projects')
        .select('_id', { count: 'exact', head: true })
        .eq('disabled', true),

      // Link stats (found, indexed, issues) - only active links
      supabase.from('links')
        .select('stats, indexedStats, disabled, projectId, projects(disabled)')
        .or('disabled.is.null,disabled.eq.false')
        .limit(10000),

      // Top users by link count (active links only)
      supabase.from('links')
        .select('userId, disabled, projectId, projects(disabled)')
        .or('disabled.is.null,disabled.eq.false')
        .limit(10000),

      // Top projects by link count (active links only)
      supabase.from('links')
        .select('projectId, disabled, projects(disabled)')
        .or('disabled.is.null,disabled.eq.false')
        .limit(10000),

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

      // Get active orders (paid subscriptions) - orders table has userId field
      supabase.from('orders')
        .select('userId')
        .eq('status', 'active'),
    ]);

    // Calculate link stats from active links only
    const links = linkStatsRes.data || [];

    const foundLinks = links.filter(l => l.stats?.found === true).length;
    const indexedLinks = links.filter(l => l.indexedStats?.indexed === true).length;
    const issueLinks = links.filter(l => l.stats?.status && l.stats.status !== 'success' && l.stats.status !== 'pending').length;

    // Calculate link counts using RPC (matching old super admin logic)
    const activeLinksCount = activeLinksRes.data?.length || 0;
    const totalLinksCount = linksRes.count || 0;
    const disabledLinksCount = totalLinksCount - activeLinksCount;
    const activeKeywordsCount = activeKeywordsRes.count || 0;
    const disabledKeywordsCount = disabledKeywordsRes.count || 0;

    // Calculate project stats (matching old super admin logic)
    // Active: disabled=false AND disabledLastActive=false
    // Inactive: disabledLastActive=true (but disabled=false)
    const allProjects = activeProjectsRes.data || [];
    const activeProjectsCount = allProjects.filter((p: any) =>
      p.disabled !== true && p.disabledLastActive !== true
    ).length;
    const inactiveProjectsCount = allProjects.filter((p: any) =>
      p.disabled !== true && p.disabledLastActive === true
    ).length;
    const disabledProjectsCount = disabledProjectsRes.count || 0;

    // Calculate top users (only active links)
    const userCounts: Record<string, number> = {};
    (topUsersRes.data || []).forEach(link => {
      if (link.userId) {
        userCounts[link.userId] = (userCounts[link.userId] || 0) + 1;
      }
    });

    const topUserIds = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId);

    // Fetch user details
    const { data: usersData } = await supabase
      .from('users')
      .select('_id, fullName, email')
      .in('_id', topUserIds);

    const usersMap = new Map((usersData || []).map(user => [user._id, user]));

    const usersWithMostLinks = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        userId,
        fullName: usersMap.get(userId)?.fullName || 'Unknown',
        email: usersMap.get(userId)?.email || '',
        linkCount: count
      }));

    // Calculate top projects (only active links)
    const projectCounts: Record<string, number> = {};
    (topProjectsRes.data || []).forEach(link => {
      if (link.projectId) {
        projectCounts[link.projectId] = (projectCounts[link.projectId] || 0) + 1;
      }
    });

    const topProjectIds = Object.entries(projectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([projectId]) => projectId);

    // Fetch project details
    const { data: projectsData } = await supabase
      .from('projects')
      .select('_id, name')
      .in('_id', topProjectIds);

    const projectsMap = new Map((projectsData || []).map(project => [project._id, project]));

    const projectsWithMostLinks = Object.entries(projectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([projectId, count]) => ({
        projectId,
        projectName: projectsMap.get(projectId)?.name || 'Unknown',
        linkCount: count
      }));

    // Get top ranking keywords (rank <= 3)
    const { data: topRankData } = await supabase
      .from('keywords')
      .select('position')
      .lte('position', 3)
      .limit(1000);

    // Calculate paid users - users who have active subscription orders
    const paidUserIds = new Set<string>();
    (activeOrdersRes.data || []).forEach((order: any) => {
      if (order.userId) {
        paidUserIds.add(order.userId);
      }
    });

    const paidUsersCount = paidUserIds.size;
    const freeUsersCount = (usersRes.count || 0) - paidUsersCount;

    return {
      totalLinks: linksRes.count || 0,
      activeLinks: activeLinksCount,
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
      freeUsers: freeUsersCount,
      totalWorkspaces: workspacesRes.count || 0,
      foundLinks,
      indexedLinks,
      issueLinks,
      topRankKeywords: topRankData?.length || 0,
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
