'use client';

import { useState } from 'react';
import { Globe, ShoppingCart, Users, DollarSign, TrendingUp, Link, Target, Eye, AlertCircle, Crown } from 'lucide-react';
import DashboardViewToggle from './DashboardViewToggle';

interface MonitoringStats {
  totalLinks: number;
  activeLinks: number;
  disabledLinks: number;
  totalKeywords: number;
  activeKeywords: number;
  disabledKeywords: number;
  totalProjects: number;
  activeProjects: number;
  inactiveProjects: number;
  disabledProjects: number;
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  totalWorkspaces: number;
  foundLinks: number;
  indexedLinks: number;
  issueLinks: number;
  topRankKeywords: number;
  usersWithMostLinks: Array<{ userId: string; fullName: string; email: string; linkCount: number }>;
  projectsWithMostLinks: Array<{ projectId: string; projectName: string; linkCount: number }>;
  recentActivity: {
    linksAddedToday: number;
    keywordsAddedToday: number;
    linksAddedThisWeek: number;
    keywordsAddedThisWeek: number;
    usersAddedToday: number;
  };
}

interface MarketplaceStats {
  domains: { total: number; pending: number; verified: number; rejected: number };
  totalOrders: number;
  totalUsers: number;
  revenue: { total: number; platform: number };
  ordersByStatus: { pending: number; active: number; completed: number; cancelled: number };
  topPublishers: Array<{ id: string; name: string; email: string; earnings: number }>;
  categoryDistribution: Array<[string, number]>;
}

export default function DashboardContent({
  monitoringStats,
  marketplaceStats
}: {
  monitoringStats: MonitoringStats;
  marketplaceStats: MarketplaceStats;
}) {
  const [view, setView] = useState<'monitoring' | 'marketplace'>('monitoring');

  const monitoringCards = [
    {
      title: 'Total Links',
      value: monitoringStats.totalLinks,
      icon: Link,
      color: 'bg-blue-500',
      breakdown: [
        { label: 'Active', value: monitoringStats.activeLinks },
        { label: 'Disabled', value: monitoringStats.disabledLinks }
      ]
    },
    {
      title: 'Total Keywords',
      value: monitoringStats.totalKeywords,
      icon: Target,
      color: 'bg-purple-500',
      breakdown: [
        { label: 'Active', value: monitoringStats.activeKeywords },
        { label: 'Disabled', value: monitoringStats.disabledKeywords }
      ]
    },
    {
      title: 'Total Projects',
      value: monitoringStats.totalProjects,
      icon: Globe,
      color: 'bg-green-500',
      breakdown: [
        { label: 'Active', value: monitoringStats.activeProjects },
        { label: 'Inactive', value: monitoringStats.inactiveProjects }
      ]
    },
    {
      title: 'Total Users',
      value: monitoringStats.totalUsers,
      icon: Users,
      color: 'bg-orange-500',
      breakdown: [
        { label: 'Paid', value: monitoringStats.paidUsers },
        { label: 'Free', value: monitoringStats.freeUsers }
      ]
    },
  ];

  const marketplaceCards = [
    {
      title: 'Total Domains',
      value: marketplaceStats.domains.total,
      icon: Globe,
      color: 'bg-blue-500',
      breakdown: [
        { label: 'Verified', value: marketplaceStats.domains.verified },
        { label: 'Pending', value: marketplaceStats.domains.pending }
      ]
    },
    {
      title: 'Total Revenue',
      value: `$${marketplaceStats.revenue.total.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
      breakdown: [
        { label: 'Platform Fee', value: `$${marketplaceStats.revenue.platform.toLocaleString()}` }
      ]
    },
    {
      title: 'Total Orders',
      value: marketplaceStats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      breakdown: [
        { label: 'Completed', value: marketplaceStats.ordersByStatus.completed },
        { label: 'Active', value: marketplaceStats.ordersByStatus.active }
      ]
    },
    {
      title: 'Total Users',
      value: marketplaceStats.totalUsers,
      icon: Users,
      color: 'bg-orange-500',
      breakdown: [
        { label: 'New Today', value: monitoringStats.recentActivity.usersAddedToday }
      ]
    },
  ];

  const cards = view === 'monitoring' ? monitoringCards : marketplaceCards;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {view === 'monitoring'
              ? 'Overview of link monitoring and keyword tracking'
              : 'Overview of your marketplace metrics'}
          </p>
        </div>
        <DashboardViewToggle onViewChange={setView} />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-gray-600 text-sm font-medium mb-2">{card.title}</h3>
                  <p className="text-3xl font-bold text-gray-900">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                </div>
                <div className={`${card.color} bg-opacity-10 p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              {card.breakdown && card.breakdown.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {card.breakdown.map((item, index) => {
                    // Determine color based on label
                    let dotColor = 'bg-gray-400';
                    let textColor = 'text-gray-700';

                    if (item.label === 'Active' || item.label === 'Verified' || item.label === 'Completed') {
                      dotColor = 'bg-green-500';
                      textColor = 'text-green-700';
                    } else if (item.label === 'Disabled' || item.label === 'Rejected' || item.label === 'Cancelled') {
                      dotColor = 'bg-red-500';
                      textColor = 'text-red-700';
                    } else if (item.label === 'Inactive') {
                      dotColor = 'bg-orange-500';
                      textColor = 'text-orange-700';
                    } else if (item.label === 'Pending') {
                      dotColor = 'bg-yellow-500';
                      textColor = 'text-yellow-700';
                    } else if (item.label === 'New Today' || item.label === 'Paid') {
                      dotColor = 'bg-blue-500';
                      textColor = 'text-blue-700';
                    } else if (item.label === 'Free') {
                      dotColor = 'bg-green-500';
                      textColor = 'text-green-700';
                    }

                    return (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                        <span className={`text-sm font-semibold ${textColor}`}>
                          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                        </span>
                        <span className="text-xs text-gray-500">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monitoring View */}
      {view === 'monitoring' && (
        <>
          {/* Secondary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Link Status Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Link className="w-4 h-4" />
                Link Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Links</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${monitoringStats.totalLinks > 0 ? (monitoringStats.activeLinks / monitoringStats.totalLinks * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.activeLinks}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Disabled Links</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500 rounded-full"
                        style={{ width: `${monitoringStats.totalLinks > 0 ? (monitoringStats.disabledLinks / monitoringStats.totalLinks * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.disabledLinks}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Found Links</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${monitoringStats.activeLinks > 0 ? (monitoringStats.foundLinks / monitoringStats.activeLinks * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.foundLinks}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Indexed Links</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${monitoringStats.activeLinks > 0 ? (monitoringStats.indexedLinks / monitoringStats.activeLinks * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.indexedLinks}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Issues</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${monitoringStats.activeLinks > 0 ? (monitoringStats.issueLinks / monitoringStats.activeLinks * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.issueLinks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workspace Activity */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Workspace Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Workspaces</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.totalWorkspaces}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Paid Organizations</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${monitoringStats.totalWorkspaces > 0 ? (monitoringStats.paidUsers / monitoringStats.totalWorkspaces * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.paidUsers}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Projects</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.totalProjects}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Projects</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${monitoringStats.totalProjects > 0 ? (monitoringStats.activeProjects / monitoringStats.totalProjects * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.activeProjects}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Inactive Projects</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${monitoringStats.totalProjects > 0 ? (monitoringStats.inactiveProjects / monitoringStats.totalProjects * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{monitoringStats.inactiveProjects}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Users by Links */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Users with Most Links
              </h3>
              <div className="space-y-3">
                {monitoringStats.usersWithMostLinks.length > 0 ? (
                  monitoringStats.usersWithMostLinks.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs font-semibold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">{user.fullName}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{user.linkCount} links</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Top Projects */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Projects with Most Links
              </h3>
              <div className="space-y-3">
                {monitoringStats.projectsWithMostLinks.length > 0 ? (
                  monitoringStats.projectsWithMostLinks.map((project, index) => (
                    <div key={project.projectId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded text-xs font-semibold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-700">{project.projectName}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{project.linkCount} links</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Marketplace View */}
      {view === 'marketplace' && (
        <>
          {/* Secondary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Domain Status Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Domain Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Verified</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${marketplaceStats.domains.total > 0 ? (marketplaceStats.domains.verified / marketplaceStats.domains.total * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.domains.verified}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${marketplaceStats.domains.total > 0 ? (marketplaceStats.domains.pending / marketplaceStats.domains.total * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.domains.pending}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${marketplaceStats.domains.total > 0 ? (marketplaceStats.domains.rejected / marketplaceStats.domains.total * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.domains.rejected}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${marketplaceStats.totalOrders > 0 ? (marketplaceStats.ordersByStatus.completed / marketplaceStats.totalOrders * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.ordersByStatus.completed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${marketplaceStats.totalOrders > 0 ? (marketplaceStats.ordersByStatus.active / marketplaceStats.totalOrders * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.ordersByStatus.active}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${marketplaceStats.totalOrders > 0 ? (marketplaceStats.ordersByStatus.pending / marketplaceStats.totalOrders * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.ordersByStatus.pending}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${marketplaceStats.totalOrders > 0 ? (marketplaceStats.ordersByStatus.cancelled / marketplaceStats.totalOrders * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">{marketplaceStats.ordersByStatus.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top Domain Categories
              </h3>
              <div className="space-y-3">
                {marketplaceStats.categoryDistribution.length > 0 ? (
                  marketplaceStats.categoryDistribution.map(([category, count]: any, index) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs font-semibold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-700">{category}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No categories data</p>
                )}
              </div>
            </div>

            {/* Top Publishers */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Top Publishers by Earnings
              </h3>
              <div className="space-y-3">
                {marketplaceStats.topPublishers.length > 0 ? (
                  marketplaceStats.topPublishers.map((publisher, index) => (
                    <div key={publisher.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded text-xs font-semibold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 font-medium">{publisher.name}</span>
                          <span className="text-xs text-gray-500">{publisher.email}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-600">${Number(publisher.earnings).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No publisher earnings data</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
