'use client';

import React, { useEffect, useState } from 'react';
import { Users, Globe, ShoppingCart, Link as LinkIcon, Target, Activity, TrendingUp, CheckCircle, Package, RefreshCw, Zap, DollarSign, FolderOpen, Copy, ExternalLink, Info } from 'lucide-react';

interface ActivityData {
  newUsers: { count: number };
  newDomains: { count: number };
  newOrders: { count: number };
  activeUsers: { count: number };
  newLinks: { count: number };
  newKeywords: { count: number };
  newProjects: { count: number };
  completedOrders: { count: number };
  newMarketplaceOrders: { count: number };
  indexerLinksSubmitted: { count: number };
  indexerCreditsPurchased: { count: number };
  indexerCampaignsCreated: { count: number };
  totals: {
    users: number;
    domains: number;
    links: number;
    keywords: number;
    indexerLinks: number;
    indexerCampaigns: number;
  };
}

export default function TodayActivityPage() {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<Record<string, any[]>>({});
  const [sectionLoading, setSectionLoading] = useState<string | null>(null);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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

  const fetchSection = async (sectionId: string, force = false) => {
    if (!force && sectionData[sectionId]) return;
    setSectionLoading(sectionId);
    try {
      const response = await fetch(`/api/activity/today/${sectionId}`);
      const data = await response.json();
      if (data.success) {
        setSectionData((prev) => ({ ...prev, [sectionId]: data.data || [] }));
      }
    } catch (error) {
      console.error(`Error fetching section ${sectionId}:`, error);
    } finally {
      setSectionLoading(null);
    }
  };

  const handleCardClick = (cardId: string, count: number) => {
    if (activeSection === cardId) {
      setActiveSection(null);
      return;
    }
    setActiveSection(cardId);
    if (count > 0) {
      fetchSection(cardId);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSectionData({});
    if (activeSection) {
      fetchSection(activeSection, true);
    }
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
      total: activity.totals.users,
    },
    {
      id: 'activeUsers',
      title: 'Active Users Today',
      count: activity.activeUsers.count,
      icon: Activity,
      color: 'green',
    },
    {
      id: 'newLinks',
      title: 'New Links',
      count: activity.newLinks.count,
      icon: LinkIcon,
      color: 'purple',
      total: activity.totals.links,
    },
    {
      id: 'newKeywords',
      title: 'New Keywords',
      count: activity.newKeywords.count,
      icon: Target,
      color: 'pink',
      total: activity.totals.keywords,
    },
    {
      id: 'newDomains',
      title: 'New Domains',
      count: activity.newDomains.count,
      icon: Globe,
      color: 'indigo',
      total: activity.totals.domains,
    },
    {
      id: 'newOrders',
      title: 'New Subscription Orders',
      count: activity.newOrders.count,
      icon: ShoppingCart,
      color: 'orange',
    },
    {
      id: 'completedOrders',
      title: 'Completed Orders',
      count: activity.completedOrders.count,
      icon: CheckCircle,
      color: 'teal',
    },
    {
      id: 'newMarketplaceOrders',
      title: 'New Marketplace Orders',
      count: activity.newMarketplaceOrders.count,
      icon: Package,
      color: 'cyan',
    },
    {
      id: 'newProjects',
      title: 'New Projects',
      count: activity.newProjects.count,
      icon: TrendingUp,
      color: 'amber',
    },
    {
      id: 'indexerLinksSubmitted',
      title: 'Indexer Links Submitted',
      count: activity.indexerLinksSubmitted.count,
      icon: Zap,
      color: 'violet',
      total: activity.totals.indexerLinks,
    },
    {
      id: 'indexerCreditsPurchased',
      title: 'Indexer Credits Bought',
      count: activity.indexerCreditsPurchased.count,
      icon: DollarSign,
      color: 'emerald',
    },
    {
      id: 'indexerCampaignsCreated',
      title: 'Indexer Campaigns Created',
      count: activity.indexerCampaignsCreated.count,
      icon: FolderOpen,
      color: 'sky',
      total: activity.totals.indexerCampaigns,
    },
  ];

  const currentSectionData: any[] = activeSection ? sectionData[activeSection] || [] : [];
  const isSectionLoading = sectionLoading === activeSection;

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
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Activity className="w-5 h-5 md:w-8 md:h-8 text-blue-600" />
            <h1 className="text-lg md:text-3xl font-bold text-gray-900">Today's Activity</h1>
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
        <p className="hidden md:block text-gray-600">Real-time overview of all activities happening on the platform today</p>
        <p className="hidden md:block text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {activityCards.map((card) => {
          const Icon = card.icon;
          const colors = colorClasses[card.color];

          return (
            <div
              key={card.id}
              className={`${colors.bg} border ${colors.border} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200`}
              onClick={() => handleCardClick(card.id, card.count)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${colors.text}`}>{card.count}</div>
                  {card.total !== undefined && (
                    <div className="text-xs text-gray-500">of {card.total} total</div>
                  )}
                </div>
              </div>
              <h3 className={`text-xs font-semibold ${colors.text}`}>{card.title}</h3>
              {card.count > 0 && (
                <p className="text-xs text-gray-600 mt-1">Click to view details</p>
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

          <div className="overflow-x-auto overflow-y-visible">
            {isSectionLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            )}
            {!isSectionLoading && activeSection === 'newUsers' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {user.fullName}
                          {user.UTM && (user.UTM.utm_source || user.UTM.gclid || user.UTM.fbclid || user.UTM.ttclid || user.UTM.twclid || user.UTM.msclkid || user.UTM.li_fat_id) && (
                            <div className="relative group">
                              <Info className="w-4 h-4 text-purple-500 cursor-help" />
                              <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[9999] min-w-max">
                                <div className="absolute bottom-full left-4 mb-[-4px] w-2 h-2 bg-gray-900 rotate-45"></div>
                                <div className="space-y-1">
                                  <div className="font-semibold text-purple-300 border-b border-gray-700 pb-1 mb-1">Traffic Source</div>
                                  {user.UTM.utm_source && (
                                    <div><span className="text-gray-400">Source:</span> {user.UTM.utm_source}</div>
                                  )}
                                  {user.UTM.utm_medium && (
                                    <div><span className="text-gray-400">Medium:</span> {user.UTM.utm_medium}</div>
                                  )}
                                  {user.UTM.utm_campaign && (
                                    <div><span className="text-gray-400">Campaign:</span> {user.UTM.utm_campaign}</div>
                                  )}
                                  {user.UTM.utm_term && (
                                    <div><span className="text-gray-400">Term:</span> {user.UTM.utm_term}</div>
                                  )}
                                  {user.UTM.utm_content && (
                                    <div><span className="text-gray-400">Content:</span> {user.UTM.utm_content}</div>
                                  )}
                                  {(user.UTM.gclid || user.UTM.gbraid || user.UTM.wbraid) && (
                                    <div className="font-semibold text-blue-300 pt-1 mt-1">Google Ads</div>
                                  )}
                                  {user.UTM.gclid && (
                                    <div><span className="text-gray-400">GCLID:</span> {user.UTM.gclid.substring(0, 20)}...</div>
                                  )}
                                  {user.UTM.gad_campaignid && (
                                    <div><span className="text-gray-400">Campaign ID:</span> {user.UTM.gad_campaignid}</div>
                                  )}
                                  {user.UTM.fbclid && (
                                    <>
                                      <div className="font-semibold text-blue-400 border-t border-gray-700 pt-1 mt-1">Facebook Ads</div>
                                      <div><span className="text-gray-400">FBCLID:</span> {user.UTM.fbclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM.ttclid && (
                                    <>
                                      <div className="font-semibold text-pink-300 border-t border-gray-700 pt-1 mt-1">TikTok Ads</div>
                                      <div><span className="text-gray-400">TTCLID:</span> {user.UTM.ttclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM.twclid && (
                                    <>
                                      <div className="font-semibold text-sky-300 border-t border-gray-700 pt-1 mt-1">Twitter Ads</div>
                                      <div><span className="text-gray-400">TWCLID:</span> {user.UTM.twclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM.msclkid && (
                                    <>
                                      <div className="font-semibold text-cyan-300 border-t border-gray-700 pt-1 mt-1">Microsoft Ads</div>
                                      <div><span className="text-gray-400">MSCLKID:</span> {user.UTM.msclkid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM.li_fat_id && (
                                    <>
                                      <div className="font-semibold text-blue-300 border-t border-gray-700 pt-1 mt-1">LinkedIn Ads</div>
                                      <div><span className="text-gray-400">LI_FAT_ID:</span> {user.UTM.li_fat_id.substring(0, 20)}...</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'activeUsers' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.lastActive).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'newLinks' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Website</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((link) => (
                    <tr key={link._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <span className="text-blue-600" title={link.url}>
                          {link.url.length > 30 ? link.url.substring(0, 30) + '...' : link.url}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{link.projects?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{link.projects?.website || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{link.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(link.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Link
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'newKeywords' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((keyword) => (
                    <tr key={keyword._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{keyword.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{keyword.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(keyword.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'newDomains' && currentSectionData.length > 0 && (
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
                  {currentSectionData.map((domain) => (
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

            {!isSectionLoading && activeSection === 'newOrders' && currentSectionData.length > 0 && (
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
                  {currentSectionData.map((order) => (
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

            {!isSectionLoading && activeSection === 'completedOrders' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.planName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.users?.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'newMarketplaceOrders' && currentSectionData.length > 0 && (
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
                  {currentSectionData.map((order) => (
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

            {!isSectionLoading && activeSection === 'newProjects' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Website</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Workspace</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{project.website || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{project.workspace?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(project.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'indexerLinksSubmitted' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((link) => (
                    <tr key={link._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <span className="text-blue-600" title={link.url}>
                          {link.url.length > 30 ? link.url.substring(0, 30) + '...' : link.url}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {link.campaign?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">{link.user?.fullName || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{link.user?.email || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          link.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : link.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(link.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => window.open(`https://www.google.com/search?q=site:${encodeURIComponent(link.url)}`, '_blank')}
                          className="p-1 hover:bg-gray-100 rounded transition"
                          title="Check if indexed in Google"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'indexerCreditsPurchased' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Credits</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Purchased At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.organizations?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        +{transaction.credits}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(transaction.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && activeSection === 'indexerCampaignsCreated' && currentSectionData.length > 0 && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Campaign Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentSectionData.map((campaign) => (
                    <tr key={campaign._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{campaign.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">{campaign.users?.fullName || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{campaign.users?.email || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(campaign.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isSectionLoading && currentSectionData.length === 0 && (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
