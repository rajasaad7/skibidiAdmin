'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Edit3, Search, User, Crown, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import OfferingModal from '@/components/OfferingModal';

interface PublisherOffering {
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  domainType?: string;
  publisherId?: string;
  publisherName?: string | null;
  publisherEmail?: string | null;
  guestPostEnabled?: boolean;
  linkInsertionEnabled?: boolean;
  guestPostPrice?: number;
  linkInsertionPrice?: number;
  contentWritingPrice?: number;
  contentWritingEnabled?: boolean;
  contentWritingIncluded?: boolean;
  turnaroundTimeDays?: number;
  maxOutboundLinks?: number;
  allowedLinkTypes?: string[];
  prohibitedNiches?: string[];
  contentRequirements?: string;
  examplePosts?: string | null;
  adminApproved?: boolean | null;
  adminRejectionReason?: string;
}

interface Domain {
  _id: string;
  domainName: string;
  verificationStatus: string;
  guestPostPrice: number;
  domainRating: number;
  domainAuthority: number;
  spamScore?: number;
  organicTraffic?: number;
  categoryId: string;
  createdAt: string;
  userId: string;
  isActive: boolean;
  publisherOfferings: PublisherOffering[];
  totalOfferings: number;
  pendingOfferings: number;
  verifiedOfferings: number;
  rejectedOfferings: number;
  domain_categories?: { name: string } | null;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });
  const [editingSEO, setEditingSEO] = useState<string | null>(null);
  const [seoMetrics, setSeoMetrics] = useState({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
  const [viewingOffering, setViewingOffering] = useState<{ domain: Domain; offering: PublisherOffering; index: number } | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      params.append('page', page.toString());

      const url = `/api/domains?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setDomains(data.domains);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [filter, page]);

  const handleApproveOffering = async (domainId: string, offeringIndex: number) => {
    try {
      const response = await fetch('/api/domains/approve-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error approving offering:', error);
    }
  };

  const handleRejectOffering = async (domainId: string, offeringIndex: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch('/api/domains/reject-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex, reason })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error rejecting offering:', error);
    }
  };

  const handleUpdateSEO = async (domainId: string) => {
    try {
      const metrics: any = {};
      if (seoMetrics.domainRating) metrics.domainRating = Number(seoMetrics.domainRating);
      if (seoMetrics.domainAuthority) metrics.domainAuthority = Number(seoMetrics.domainAuthority);
      if (seoMetrics.spamScore) metrics.spamScore = Number(seoMetrics.spamScore);
      if (seoMetrics.organicTraffic) metrics.organicTraffic = Number(seoMetrics.organicTraffic);

      const response = await fetch('/api/domains/update-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, seoMetrics: metrics })
      });
      if (response.ok) {
        setEditingSEO(null);
        setSeoMetrics({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
        fetchDomains();
      }
    } catch (error) {
      console.error('Error updating SEO metrics:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) return;
    try {
      const response = await fetch('/api/domains/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const handleSaveOffering = async (domainId: string, offeringIndex: number, offering: PublisherOffering) => {
    try {
      const response = await fetch('/api/domains/update-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex, offering })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error updating offering:', error);
    }
  };

  return (
    <>
      {viewingOffering && (
        <OfferingModal
          domain={viewingOffering.domain}
          offering={viewingOffering.offering}
          index={viewingOffering.index}
          onClose={() => setViewingOffering(null)}
          onSave={handleSaveOffering}
          onApprove={handleApproveOffering}
          onReject={handleRejectOffering}
        />
      )}

      {/* Old modal code replaced by OfferingModal component */}
      {false && viewingOffering && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Publisher Offering Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewingOffering.domain.domainName} - Offering #{viewingOffering.index + 1}</p>
              </div>
              <div className="flex items-center gap-2">
                {!editingOffering && (
                  <button
                    onClick={startEditingOffering}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewingOffering(null);
                    setEditingOffering(false);
                    setEditedOffering(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Admin Approval</span>
                    {viewingOffering.offering.adminApproved === true && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                    {viewingOffering.offering.adminApproved === false && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                    {(viewingOffering.offering.adminApproved === null || viewingOffering.offering.adminApproved === undefined) && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Active Status</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingOffering.offering.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingOffering.offering.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {viewingOffering.offering.adminRejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm font-medium text-red-900">Rejection Reason:</span>
                    <p className="text-sm text-red-700 mt-1">{viewingOffering.offering.adminRejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Services & Pricing */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Services & Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Guest Post</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingOffering.offering.guestPostEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingOffering.offering.guestPostEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {viewingOffering.offering.guestPostEnabled && (
                      <div className="text-2xl font-bold text-gray-900">${viewingOffering.offering.guestPostPrice}</div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Link Insertion</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingOffering.offering.linkInsertionEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingOffering.offering.linkInsertionEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {viewingOffering.offering.linkInsertionEnabled && (
                      <div className="text-2xl font-bold text-gray-900">${viewingOffering.offering.linkInsertionPrice}</div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Content Writing</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingOffering.offering.contentWritingEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingOffering.offering.contentWritingEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {viewingOffering.offering.contentWritingEnabled && (
                      <>
                        <div className="text-2xl font-bold text-gray-900">${viewingOffering.offering.contentWritingPrice}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {viewingOffering.offering.contentWritingIncluded ? 'Included in price' : 'Additional fee'}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <span className="text-sm font-medium text-gray-900">Domain Type</span>
                    <div className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                      {viewingOffering.offering.domainType || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements & Restrictions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Requirements & Restrictions</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Turnaround Time:</span>
                    <span className="ml-2 text-sm text-gray-700">{viewingOffering.offering.turnaroundTimeDays || 'N/A'} days</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Max Outbound Links:</span>
                    <span className="ml-2 text-sm text-gray-700">{viewingOffering.offering.maxOutboundLinks || 'N/A'}</span>
                  </div>

                  {viewingOffering.offering.allowedLinkTypes && viewingOffering.offering.allowedLinkTypes.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 mb-2">Allowed Link Types:</div>
                      <div className="flex flex-wrap gap-2">
                        {viewingOffering.offering.allowedLinkTypes.map((type, i) => (
                          <span key={i} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingOffering.offering.prohibitedNiches && viewingOffering.offering.prohibitedNiches.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-sm font-medium text-red-900 mb-2">Prohibited Niches:</div>
                      <div className="text-sm text-red-700 whitespace-pre-wrap">
                        {viewingOffering.offering.prohibitedNiches.join('\n')}
                      </div>
                    </div>
                  )}

                  {viewingOffering.offering.contentRequirements && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 mb-2">Content Requirements:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {viewingOffering.offering.contentRequirements}
                      </div>
                    </div>
                  )}

                  {viewingOffering.offering.examplePosts && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 mb-2">Example Posts:</div>
                      <div className="text-sm text-gray-700 break-all">
                        {viewingOffering.offering.examplePosts}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Metadata</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Publisher ID:</span>
                    <div className="text-xs text-gray-700 mt-1 font-mono break-all">{viewingOffering.offering.publisherId || 'N/A'}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Created:</span>
                    <div className="text-sm text-gray-700 mt-1">
                      {viewingOffering.offering.createdAt ? new Date(viewingOffering.offering.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Updated:</span>
                    <div className="text-sm text-gray-700 mt-1">
                      {viewingOffering.offering.updatedAt ? new Date(viewingOffering.offering.updatedAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {(viewingOffering.offering.adminApproved === null || viewingOffering.offering.adminApproved === undefined) && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleApproveOffering(viewingOffering.domain._id, viewingOffering.index);
                      setViewingOffering(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Offering
                  </button>
                  <button
                    onClick={() => {
                      handleRejectOffering(viewingOffering.domain._id, viewingOffering.index);
                      setViewingOffering(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Offering
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Domain Management</h1>
        <button
          onClick={fetchDomains}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border-2 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Total Domains</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Pending Approval</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Verified</div>
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {['all', 'pending', 'verified', 'rejected'].map((status) => (
            <button
              key={`filter-${status}`}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Domains List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : domains.filter(domain =>
            domain.domainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            domain.domain_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            No domains found
          </div>
        ) : (
          domains.filter(domain =>
            domain.domainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            domain.domain_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((domain) => (
            <div key={domain._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Domain Row */}
              <div className="p-4">
                <div className="flex items-center">
                  {/* Domain Name and Category */}
                  <div className="w-64 flex-shrink-0">
                    <h3 className="text-base font-semibold text-gray-900">{domain.domainName}</h3>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 mt-1">
                      {domain.domain_categories?.name || 'Uncategorized'}
                    </span>
                  </div>

                  {/* Stats - Centered */}
                  <div className="flex-1 flex items-center justify-center gap-8">
                    {/* DR */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">DR</div>
                      <div className="text-base font-bold text-blue-600">{domain.domainRating || 'N/A'}</div>
                    </div>

                    {/* DA */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">DA</div>
                      <div className="text-base font-bold text-blue-600">{domain.domainAuthority || 'N/A'}</div>
                    </div>

                    {/* Traffic */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">Traffic</div>
                      <div className="text-base font-bold text-green-600">{domain.organicTraffic || 'N/A'}</div>
                    </div>

                    {/* SS */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">SS</div>
                      <div className="text-base font-bold text-gray-900">
                        {domain.spamScore || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Publisher Buttons - Right Side */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {domain.publisherOfferings.map((offering, index) => {
                      const isOwner = offering.domainType === 'owner';
                      const isReseller = offering.domainType === 'reseller';

                      // Count owners and resellers separately
                      const ownerCount = domain.publisherOfferings
                        .slice(0, index)
                        .filter(o => o.domainType === 'owner').length + 1;
                      const resellerCount = domain.publisherOfferings
                        .slice(0, index)
                        .filter(o => o.domainType === 'reseller').length + 1;

                      let statusColor = '';
                      if (isOwner) {
                        statusColor = offering.adminApproved === true ? 'bg-blue-600 hover:bg-blue-700' :
                                     offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                     'bg-yellow-500 hover:bg-yellow-600';
                      } else if (isReseller) {
                        statusColor = offering.adminApproved === true ? 'bg-purple-600 hover:bg-purple-700' :
                                     offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                     'bg-yellow-500 hover:bg-yellow-600';
                      } else {
                        statusColor = offering.adminApproved === true ? 'bg-green-500 hover:bg-green-600' :
                                     offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                     'bg-yellow-500 hover:bg-yellow-600';
                      }

                      const Icon = isOwner ? Crown : isReseller ? Users : User;
                      const prefix = isOwner ? 'O' : isReseller ? 'R' : 'P';
                      const number = isOwner ? ownerCount : isReseller ? resellerCount : index + 1;

                      return (
                        <button
                          key={`pub-${index}`}
                          onClick={() => setViewingOffering({ domain, offering, index })}
                          className={`flex items-center gap-1 px-2.5 py-1.5 ${statusColor} text-white text-xs font-medium rounded-lg transition`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {prefix}{number}
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingSEO(editingSEO === domain._id ? null : domain._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Update SEO Metrics"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(domain._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SEO Metrics Editor */}
                {editingSEO === domain._id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Update SEO Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        type="number"
                        placeholder={`DR (${domain.domainRating || 'N/A'})`}
                        value={seoMetrics.domainRating}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, domainRating: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`DA (${domain.domainAuthority || 'N/A'})`}
                        value={seoMetrics.domainAuthority}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, domainAuthority: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`SS (${domain.spamScore || 'N/A'})`}
                        value={seoMetrics.spamScore}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, spamScore: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`Traffic (${domain.organicTraffic || 'N/A'})`}
                        value={seoMetrics.organicTraffic}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, organicTraffic: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleUpdateSEO(domain._id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setEditingSEO(null);
                          setSeoMetrics({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
                        }}
                        className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} domains
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white font-medium'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
