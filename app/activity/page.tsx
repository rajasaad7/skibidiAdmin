'use client';

import React, { useEffect, useState } from 'react';
import { Users, Globe, ShoppingCart, Link as LinkIcon, Target, Activity, TrendingUp, CheckCircle, Package, RefreshCw } from 'lucide-react';

interface ActivityData {
  newUsers: { count: number; data: any[] };
  newDomains: { count: number; data: any[] };
  newOrders: { count: number; data: any[] };
  activeUsers: { count: number; data: any[] };
  newLinks: { count: number; data: any[] };
  newKeywords: { count: number; data: any[] };
  newProjects: { count: number; data: any[] };
  completedOrders: { count: number; data: any[] };
  newMarketplaceOrders: { count: number; data: any[] };
  totals: {
    users: number;
    domains: number;
    links: number;
    keywords: number;
  };
}

export default function TodayActivityPage() {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const fetchActivity = async () => {
    try {
      const response = await fetch('/api/activity/today');
      const data = await response.json();
      if (data.success) {
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivity();
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading today's activity...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Failed to load activity data</p>
      </div>
    );
  }

  const activityCards = [
    {
      id: 'newUsers',
      title: 'New Users',
      count: activity.newUsers.count,
      icon: Users,
      color: 'blue',
      data: activity.newUsers.data,
      total: activity.totals.users,
    },
    {
      id: 'activeUsers',
      title: 'Active Users Today',
      count: activity.activeUsers.count,
      icon: Activity,
      color: 'green',
      data: activity.activeUsers.data,
    },
    {
      id: 'newLinks',
      title: 'New Links',
      count: activity.newLinks.count,
      icon: LinkIcon,
      color: 'purple',
      data: activity.newLinks.data,
      total: activity.totals.links,
    },
    {
      id: 'newKeywords',
      title: 'New Keywords',
      count: activity.newKeywords.count,
      icon: Target,
      color: 'pink',
      data: activity.newKeywords.data,
      total: activity.totals.keywords,
    },
    {
      id: 'newDomains',
      title: 'New Domains',
      count: activity.newDomains.count,
      icon: Globe,
      color: 'indigo',
      data: activity.newDomains.data,
      total: activity.totals.domains,
    },
    {
      id: 'newOrders',
      title: 'New Subscription Orders',
      count: activity.newOrders.count,
      icon: ShoppingCart,
      color: 'orange',
      data: activity.newOrders.data,
    },
    {
      id: 'completedOrders',
      title: 'Completed Orders',
      count: activity.completedOrders.count,
      icon: CheckCircle,
      color: 'teal',
      data: activity.completedOrders.data,
    },
    {
      id: 'newMarketplaceOrders',
      title: 'New Marketplace Orders',
      count: activity.newMarketplaceOrders.count,
      icon: Package,
      color: 'cyan',
      data: activity.newMarketplaceOrders.data,
    },
    {
      id: 'newProjects',
      title: 'New Projects',
      count: activity.newProjects.count,
      icon: TrendingUp,
      color: 'amber',
      data: activity.newProjects.data,
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Today's Activity</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="text-gray-600">Real-time overview of all activities happening on the platform today</p>
        <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {activityCards.map((card) => {
          const Icon = card.icon;
          const colors = colorClasses[card.color];

          return (
            <div
              key={card.id}
              className={`${colors.bg} border ${colors.border} rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200`}
              onClick={() => setActiveSection(activeSection === card.id ? null : card.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${colors.text}`}>{card.count}</div>
                  {card.total !== undefined && (
                    <div className="text-xs text-gray-500">of {card.total} total</div>
                  )}
                </div>
              </div>
              <h3 className={`text-sm font-semibold ${colors.text}`}>{card.title}</h3>
              {card.count > 0 && (
                <p className="text-xs text-gray-600 mt-2">Click to view details</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Section */}
      {activeSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {activityCards.find(c => c.id === activeSection)?.title} Details
            </h2>
            <button
              onClick={() => setActiveSection(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="overflow-x-auto">
            {activeSection === 'newUsers' && activity.newUsers.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newUsers.data.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'activeUsers' && activity.activeUsers.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.activeUsers.data.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.lastActive).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newLinks' && activity.newLinks.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newLinks.data.map((link) => (
                    <tr key={link._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-blue-600 hover:underline">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.url.length > 60 ? link.url.substring(0, 60) + '...' : link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{link.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(link.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newKeywords' && activity.newKeywords.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newKeywords.data.map((keyword) => (
                    <tr key={keyword._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{keyword.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{keyword.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(keyword.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newDomains' && activity.newDomains.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newDomains.data.map((domain) => (
                    <tr key={domain._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{domain.domainName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{domain.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          domain.verificationStatus === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {domain.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(domain.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newOrders' && activity.newOrders.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newOrders.data.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.planName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.currency} {order.unitPrice}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'completedOrders' && activity.completedOrders.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.completedOrders.data.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.planName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newMarketplaceOrders' && activity.newMarketplaceOrders.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newMarketplaceOrders.data.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.domains?.domainName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">USD {order.totalPrice}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSection === 'newProjects' && activity.newProjects.data.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activity.newProjects.data.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(project.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activityCards.find(c => c.id === activeSection)?.data.length === 0 && (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
