'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Calendar, Link as LinkIcon, Target, Globe, ShoppingCart, DollarSign, CreditCard, Package, ExternalLink, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface LinkData {
  _id: string;
  url: string;
  disabled: boolean;
  createdAt: string;
  stats?: any;
  indexedStats?: any;
  projectId: string;
  projects?: { name: string };
}

interface KeywordData {
  _id: string;
  keyword: string;
  disabled: boolean;
  createdAt: string;
  projectId: string;
  projects?: { name: string };
}

interface ProjectData {
  _id: string;
  name: string;
  disabled: boolean;
  disabledLastActive: boolean;
  createdAt: string;
  workspaceId: string;
  workspaces?: { name: string };
}

interface OrderData {
  _id: string;
  planName: string;
  status: string;
  unitPrice: string;
  currency: string;
  nextBillDate?: string;
  createdAt: string;
}

interface MarketplaceOrderData {
  _id: string;
  totalPrice: string;
  platformFee: string;
  publisherEarnings: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  serviceType: string;
  domainId: string;
  domains?: { domainName: string };
  buyerId?: string;
  users?: { fullName: string };
  orderType?: string;
}

interface DomainData {
  _id: string;
  domainName: string;
  verificationStatus: string;
  createdAt: string;
  publisherOfferings: any[];
  categoryId?: string;
  domain_categories?: { name: string };
}

interface UserDetails {
  user: {
    _id: string;
    fullName: string;
    email: string;
    isEmailVerified: boolean;
    googleId?: string;
    twitterId?: string;
    createdAt: string;
    lastActive?: string;
  };
  stats: {
    totalLinks: number;
    activeLinks: number;
    disabledLinks: number;
    totalKeywords: number;
    activeKeywords: number;
    disabledKeywords: number;
    totalProjects: number;
    activeProjects: number;
    totalWorkspaces: number;
  };
  subscription?: {
    planName: string;
    status: string;
    unitPrice: string;
    currency: string;
    nextBillDate?: string;
    createdAt: string;
  };
  marketplace: {
    totalOrders: number;
    completedOrders: number;
    totalSpent: number;
    totalDomains: number;
    verifiedDomains: number;
    totalEarnings: number;
  };
  links: LinkData[];
  keywords: KeywordData[];
  projects: ProjectData[];
  subscriptionHistory: OrderData[];
  marketplaceOrdersBuyer: MarketplaceOrderData[];
  marketplaceOrdersPublisher: MarketplaceOrderData[];
  domains: DomainData[];
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('links');
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);
  const [linkFormData, setLinkFormData] = useState({
    url: '',
    disabled: false,
    projectId: ''
  });
  const [editingKeyword, setEditingKeyword] = useState<KeywordData | null>(null);
  const [keywordFormData, setKeywordFormData] = useState({
    keyword: '',
    disabled: false,
    projectId: ''
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        if (data.success) {
          setDetails(data.details);
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [userId]);

  const handleEditLink = (link: LinkData) => {
    setEditingLink(link);
    setLinkFormData({
      url: link.url,
      disabled: link.disabled,
      projectId: link.projectId
    });
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    try {
      const response = await fetch(`/api/links/${editingLink._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkFormData)
      });

      if (response.ok) {
        // Refresh the user details
        const detailsResponse = await fetch(`/api/users/${userId}`);
        const data = await detailsResponse.json();
        if (data.success) {
          setDetails(data.details);
        }
        setEditingLink(null);
        alert('Link updated successfully!');
      } else {
        alert('Failed to update link');
      }
    } catch (error) {
      console.error('Error updating link:', error);
      alert('Error updating link');
    }
  };

  const handleDeleteLink = async () => {
    if (!editingLink) return;

    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/links/${editingLink._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the user details
        const detailsResponse = await fetch(`/api/users/${userId}`);
        const data = await detailsResponse.json();
        if (data.success) {
          setDetails(data.details);
        }
        setEditingLink(null);
        alert('Link deleted successfully!');
      } else {
        alert('Failed to delete link');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link');
    }
  };

  const handleEditKeyword = (keyword: KeywordData) => {
    setEditingKeyword(keyword);
    setKeywordFormData({
      keyword: keyword.keyword,
      disabled: keyword.disabled,
      projectId: keyword.projectId
    });
  };

  const handleUpdateKeyword = async () => {
    if (!editingKeyword) return;

    try {
      const response = await fetch(`/api/keywords/${editingKeyword._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordFormData)
      });

      if (response.ok) {
        // Refresh the user details
        const detailsResponse = await fetch(`/api/users/${userId}`);
        const data = await detailsResponse.json();
        if (data.success) {
          setDetails(data.details);
        }
        setEditingKeyword(null);
        alert('Keyword updated successfully!');
      } else {
        alert('Failed to update keyword');
      }
    } catch (error) {
      console.error('Error updating keyword:', error);
      alert('Error updating keyword');
    }
  };

  const handleDeleteKeyword = async () => {
    if (!editingKeyword) return;

    if (!confirm('Are you sure you want to delete this keyword? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/keywords/${editingKeyword._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the user details
        const detailsResponse = await fetch(`/api/users/${userId}`);
        const data = await detailsResponse.json();
        if (data.success) {
          setDetails(data.details);
        }
        setEditingKeyword(null);
        alert('Keyword deleted successfully!');
      } else {
        alert('Failed to delete keyword');
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      alert('Error deleting keyword');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">User not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{details.user.fullName}</h2>
                {details.subscription && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-purple-100 text-purple-800">
                    {details.subscription.planName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <Mail className="w-4 h-4" />
                {details.user.email}
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(details.user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            {details.user.isEmailVerified ? (
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                Verified
              </span>
            ) : (
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                Unverified
              </span>
            )}
            <div className="text-sm text-gray-500 mt-2">
              Last active: {details.user.lastActive ? new Date(details.user.lastActive).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Activity Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Activity Overview</h3>
            <p className="text-sm text-gray-600 mt-0.5">Detailed breakdown of user engagement and performance</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-700 border border-gray-200">
              Total Workspaces: <span className="font-bold text-gray-900">{details.stats.totalWorkspaces}</span>
            </span>
            {details.subscription ? (
              <div className="relative group">
                <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-xs font-semibold text-white cursor-help">
                  {details.subscription.planName} • {details.subscription.currency} {(Number(details.subscription.unitPrice) / 100).toFixed(2)}/mo
                </span>
                {/* Tooltip */}
                <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="space-y-2">
                    <div className="flex justify-between pb-2 border-b border-gray-700">
                      <span className="text-gray-400">Plan</span>
                      <span className="font-semibold">{details.subscription.planName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="font-semibold capitalize text-green-400">{details.subscription.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price</span>
                      <span className="font-semibold">{details.subscription.currency} {(Number(details.subscription.unitPrice) / 100).toFixed(2)}</span>
                    </div>
                    {details.subscription.nextBillDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Next Billing</span>
                        <span className="font-semibold">{new Date(details.subscription.nextBillDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Subscribed</span>
                      <span className="font-semibold">{new Date(details.subscription.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            ) : (
              <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 border border-gray-200">
                Free Plan
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Links Progress */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Links Health</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-gray-900">{details.stats.totalLinks}</span>
                <span className="text-xs text-gray-500">total</span>
              </div>
              {details.stats.totalLinks > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${(details.stats.activeLinks / details.stats.totalLinks) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 font-semibold">{Math.round((details.stats.activeLinks / details.stats.totalLinks) * 100)}% active</span>
                    <span className="text-red-600">{details.stats.disabledLinks} disabled</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Keywords Progress */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Keywords Health</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-gray-900">{details.stats.totalKeywords}</span>
                <span className="text-xs text-gray-500">total</span>
              </div>
              {details.stats.totalKeywords > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                      style={{ width: `${(details.stats.activeKeywords / details.stats.totalKeywords) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-600 font-semibold">{Math.round((details.stats.activeKeywords / details.stats.totalKeywords) * 100)}% active</span>
                    <span className="text-red-600">{details.stats.disabledKeywords} disabled</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Projects Status */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Projects Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-gray-900">{details.stats.totalProjects}</span>
                <span className="text-xs text-gray-500">total</span>
              </div>
              {details.stats.totalProjects > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${(details.stats.activeProjects / details.stats.totalProjects) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600 font-semibold">{Math.round((details.stats.activeProjects / details.stats.totalProjects) * 100)}% active</span>
                    <span className="text-gray-600">{details.stats.totalProjects - details.stats.activeProjects} inactive</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Marketplace Orders */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Marketplace Orders</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm text-gray-600">Total Orders</span>
                <span className="text-2xl font-bold text-gray-900">{details.marketplaceOrdersBuyer.length + details.marketplaceOrdersPublisher.length}</span>
              </div>
              {(details.marketplaceOrdersBuyer.length + details.marketplaceOrdersPublisher.length) > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all"
                      style={{ width: `${(details.marketplaceOrdersBuyer.length / (details.marketplaceOrdersBuyer.length + details.marketplaceOrdersPublisher.length)) * 100}%` }}
                    ></div>
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                      style={{ width: `${(details.marketplaceOrdersPublisher.length / (details.marketplaceOrdersBuyer.length + details.marketplaceOrdersPublisher.length)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-600 font-semibold">{details.marketplaceOrdersBuyer.length}</span>
                      <span className="text-gray-500">As Buyer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-semibold">{details.marketplaceOrdersPublisher.length}</span>
                      <span className="text-gray-500">As Seller</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Orders</div>
              <div className="text-lg font-bold text-gray-900">{details.marketplace.totalOrders}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Completed</div>
              <div className="text-lg font-bold text-green-600">{details.marketplace.completedOrders}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Domains</div>
              <div className="text-lg font-bold text-gray-900">{details.marketplace.totalDomains}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Verified</div>
              <div className="text-lg font-bold text-green-600">{details.marketplace.verifiedDomains}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Active Links</div>
              <div className="text-lg font-bold text-blue-600">{details.stats.activeLinks}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Active Keywords</div>
              <div className="text-lg font-bold text-purple-600">{details.stats.activeKeywords}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { id: 'links', label: 'Links', count: details.links.length },
              { id: 'keywords', label: 'Keywords', count: details.keywords.length },
              { id: 'projects', label: 'Projects', count: details.projects.length },
              { id: 'subscriptions', label: 'Subscriptions', count: details.subscriptionHistory.length },
              { id: 'orders', label: 'Marketplace Orders', count: (details.marketplaceOrdersBuyer.length + details.marketplaceOrdersPublisher.length) },
              { id: 'domains', label: 'Domains', count: details.domains.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Links Tab */}
          {activeTab === 'links' && (
            <div className="overflow-x-auto">
              {details.links.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No links found</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Found</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Indexed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.links.map((link) => (
                      <tr key={link._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            {link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{link.projects?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {link.disabled ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Disabled</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {link.stats?.found ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {link.indexedStats?.indexed ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(link.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditLink(link)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                              title="Edit link details"
                            >
                              <Edit className="w-3 h-3" />
                              Details
                            </button>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                              title="Open link in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className="overflow-x-auto">
              {details.keywords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No keywords found</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Keyword</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.keywords.map((keyword) => (
                      <tr key={keyword._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{keyword.keyword}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{keyword.projects?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {keyword.disabled ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Disabled</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(keyword.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditKeyword(keyword)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                              title="Edit keyword details"
                            >
                              <Edit className="w-3 h-3" />
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="overflow-x-auto">
              {details.projects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No projects found</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Project Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Workspace</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.projects.map((project) => (
                      <tr key={project._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{project.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{project.workspaces?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {project.disabled ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Disabled</span>
                          ) : project.disabledLastActive ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Inactive</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(project.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Project ID:</span>
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{project._id.substring(0, 8)}...</code>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              {details.subscriptionHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No subscription history found</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Next Bill Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Order ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.subscriptionHistory.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.planName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {order.currency} {(Number(order.unitPrice) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {order.nextBillDate ? new Date(order.nextBillDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{order._id.substring(0, 12)}...</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Marketplace Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              {/* As Buyer Section */}
              {details.marketplaceOrdersBuyer.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">As Buyer ({details.marketplaceOrdersBuyer.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Service Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Total Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Platform Fee</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {details.marketplaceOrdersBuyer.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.domains?.domainName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.serviceType.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">${Number(order.totalPrice).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">${Number(order.platformFee).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'in_progress' || order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* As Publisher Section */}
              {details.marketplaceOrdersPublisher.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">As Publisher ({details.marketplaceOrdersPublisher.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Buyer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Service Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Total Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Earnings</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {details.marketplaceOrdersPublisher.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.domains?.domainName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.users?.fullName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.serviceType.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">${Number(order.totalPrice).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">${Number(order.publisherEarnings).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'in_progress' || order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {details.marketplaceOrdersBuyer.length === 0 && details.marketplaceOrdersPublisher.length === 0 && (
                <p className="text-gray-500 text-center py-8">No marketplace orders found</p>
              )}
            </div>
          )}

          {/* Domains Tab */}
          {activeTab === 'domains' && (
            <div className="overflow-x-auto">
              {details.domains.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No domains found</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Verification</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Offerings</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.domains.map((domain) => (
                      <tr key={domain._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <a href={`https://${domain.domainName}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            {domain.domainName}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{domain.domain_categories?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            domain.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                            domain.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {domain.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{domain.publisherOfferings?.length || 0} offerings</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(domain.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={`https://${domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                            title="Open domain in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Visit
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Link Edit Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Link</h3>
              <button
                onClick={() => setEditingLink(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* URL Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkFormData.url}
                  onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/page"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select
                  value={linkFormData.projectId}
                  onChange={(e) => setLinkFormData({ ...linkFormData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project</option>
                  {details?.projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name} ({project.workspaces?.name || 'No workspace'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkFormData.disabled}
                    onChange={(e) => setLinkFormData({ ...linkFormData, disabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Disable link {linkFormData.disabled && <span className="text-red-600">(Warning: Link will be disabled)</span>}
                  </span>
                </label>
              </div>

              {/* Link Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(editingLink.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Found:</span>
                  <span className="font-medium">
                    {editingLink.stats?.found ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-gray-400">✗ No</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Indexed:</span>
                  <span className="font-medium">
                    {editingLink.indexedStats?.indexed ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-gray-400">✗ No</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Link ID:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded border">{editingLink._id}</code>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={handleDeleteLink}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Link
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Update Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Edit Modal */}
      {editingKeyword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Keyword</h3>
              <button
                onClick={() => setEditingKeyword(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Keyword Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword
                </label>
                <input
                  type="text"
                  value={keywordFormData.keyword}
                  onChange={(e) => setKeywordFormData({ ...keywordFormData, keyword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter keyword"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select
                  value={keywordFormData.projectId}
                  onChange={(e) => setKeywordFormData({ ...keywordFormData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project</option>
                  {details?.projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name} ({project.workspaces?.name || 'No workspace'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keywordFormData.disabled}
                    onChange={(e) => setKeywordFormData({ ...keywordFormData, disabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Disable keyword {keywordFormData.disabled && <span className="text-red-600">(Warning: Keyword will be disabled)</span>}
                  </span>
                </label>
              </div>

              {/* Keyword Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(editingKeyword.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Keyword ID:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded border">{editingKeyword._id}</code>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={handleDeleteKeyword}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Keyword
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingKeyword(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateKeyword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Update Keyword
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
