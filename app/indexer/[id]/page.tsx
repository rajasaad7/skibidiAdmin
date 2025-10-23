'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ReferenceTask {
  name: string;
  taskId: string;
}

interface IndexerLink {
  _id: string;
  url: string;
  status: string;
  submittedAt: string;
  indexedAt: string | null;
  lastChecked: string | null;
  checkCount: number;
  errorMessage: string | null;
  createdAt: string;
  created_at?: string;
  dripFeedDays: number | null;
  credits_used: number;
  referenceTask?: ReferenceTask;
}

interface Campaign {
  _id: string;
  name: string;
  userId: string;
  workspaceId: string;
  organizationId: string;
  organization_id?: string;
  linkCount: number;
  status: string;
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
  referenceTask?: ReferenceTask;
  user?: {
    fullName: string;
    email: string;
  };
}

interface CampaignStats {
  totalLinks: number;
  completedLinks: number;
  pendingLinks: number;
  submittedLinks: number;
}

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [links, setLinks] = useState<IndexerLink[]>([]);
  const [stats, setStats] = useState<CampaignStats>({
    totalLinks: 0,
    completedLinks: 0,
    pendingLinks: 0,
    submittedLinks: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [selectedLink, setSelectedLink] = useState<IndexerLink | null>(null);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/indexer/campaigns/${campaignId}?page=${page}`);
      const data = await response.json();
      if (data.success) {
        console.log('Campaign data:', data.campaign);
        console.log('organizationId:', data.campaign?.organizationId);
        console.log('organization_id:', data.campaign?.organization_id);
        console.log('Has referenceTask?', !!data.campaign?.referenceTask);
        console.log('Sample link:', data.links?.[0]);
        console.log('Sample link referenceTask:', data.links?.[0]?.referenceTask);
        setCampaign(data.campaign);
        setLinks(data.links);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId, page]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'indexed':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>
          {getStatusIcon(status)} Indexed
        </span>;
      case 'error':
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>
          {getStatusIcon(status)} Error
        </span>;
      case 'pending':
        return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>
          {getStatusIcon(status)} Pending
        </span>;
      case 'submitted':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
          {getStatusIcon(status)} Submitted
        </span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
          {getStatusIcon(status)} {status}
        </span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={(campaign?.organizationId || campaign?.organization_id) ? `/indexer/organizations/${campaign.organizationId || campaign.organization_id}` : '/indexer'}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Organization</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign?.name || 'Campaign Details'}</h1>
            {campaign?.user && (
              <p className="text-sm text-gray-600 mt-1">
                By {campaign.user.fullName} ({campaign.user.email})
              </p>
            )}
          </div>
          <button
            onClick={fetchCampaignDetails}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Links</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalLinks}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.completedLinks}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Submitted</div>
          <div className="text-2xl font-bold text-purple-600">{stats.submittedLinks}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pendingLinks}</div>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No links found in this campaign
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 pr-4" style={{ minWidth: '200px' }}>
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">URL</span>
                </div>
                <div className="w-32 text-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Status</span>
                </div>
                <div className="w-24 text-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Checks</span>
                </div>
                <div className="w-40 text-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Submitted</span>
                </div>
                <div className="w-40 text-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Indexed</span>
                </div>
                <div className="w-16 text-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Info</span>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {links.map((link) => (
                <div key={link._id} className="px-4 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    {/* URL */}
                    <div className="flex-1 pr-4" style={{ minWidth: '200px' }}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{link.url}</span>
                      </a>
                      {link.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={link.errorMessage}>
                          {link.errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-32 flex justify-center flex-shrink-0">
                      {getStatusBadge(link.status)}
                    </div>

                    {/* Check Count */}
                    <div className="w-24 text-center flex-shrink-0">
                      <span className="text-sm text-gray-900">{link.checkCount}</span>
                    </div>

                    {/* Submitted At */}
                    <div className="w-40 text-center flex-shrink-0">
                      <span className="text-xs text-gray-600">{formatDate(link.submittedAt)}</span>
                    </div>

                    {/* Indexed At */}
                    <div className="w-40 text-center flex-shrink-0">
                      <span className="text-xs text-gray-600">{formatDate(link.indexedAt)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-16 flex justify-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => window.open(`https://www.google.com/search?q=site:${encodeURIComponent(link.url)}`, '_blank')}
                        className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg transition"
                        title="Check if indexed in Google"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedLink(link)}
                        className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                        title="View Reference Task"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total links)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reference Task Info Modal */}
      {selectedLink && selectedLink.referenceTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedLink(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Reference Task Information</h2>
              <button
                onClick={() => setSelectedLink(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">URL</label>
                <p className="text-gray-900 mt-1 text-sm break-all">{selectedLink.url}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Task Name</label>
                <p className="text-gray-900 mt-1">{selectedLink.referenceTask.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Task ID</label>
                <p className="text-gray-900 mt-1 font-mono text-sm">{selectedLink.referenceTask.taskId}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLink(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
