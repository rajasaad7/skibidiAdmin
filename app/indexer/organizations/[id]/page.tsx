'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft, Zap, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Campaign {
  _id: string;
  name: string;
  link_count: number;
  created_at: string;
}

interface Organization {
  _id: string;
  name: string;
  current_balance: number;
  total_purchased: number;
  total_used: number;
  campaign_count: number;
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchOrganizationDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/indexer/organizations/${organizationId}?page=${page}`);
      const data = await response.json();
      if (data.success) {
        setOrganization(data.organization);
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching organization details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationDetails();
  }, [organizationId, page]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/indexer"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Organizations</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{organization?.name || 'Organization Details'}</h1>
          </div>
          <button
            onClick={fetchOrganizationDetails}
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
          <div className="text-sm text-gray-600 mb-1">Total Campaigns</div>
          <div className="text-2xl font-bold text-blue-600">{organization?.campaign_count || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
            <Zap className="w-5 h-5" />
            {organization?.current_balance || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Purchased</div>
          <div className="text-2xl font-bold text-purple-600">{organization?.total_purchased || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Used</div>
          <div className="text-2xl font-bold text-orange-600">{organization?.total_used || 0}</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No campaigns found for this organization
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 pr-4" style={{ minWidth: '150px' }}>
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Campaign Name</span>
                </div>
                <div className="flex items-center justify-center gap-8 flex-shrink-0">
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Links</span>
                  </div>
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Created</span>
                  </div>
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Actions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {campaigns.map((campaign) => (
                <div key={campaign._id} className="px-4 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    {/* Campaign Name */}
                    <div className="flex-1 pr-4" style={{ minWidth: '150px' }}>
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </div>

                    {/* Stats - Right aligned */}
                    <div className="flex items-center justify-center gap-8 flex-shrink-0">
                      <div className="text-center w-32">
                        <span className="text-sm font-semibold text-gray-900">{campaign.link_count || 0}</span>
                      </div>
                      <div className="text-center w-32">
                        <span className="text-xs text-gray-600">{formatDate(campaign.created_at)}</span>
                      </div>
                      <div className="text-center w-32">
                        <Link
                          href={`/indexer/${campaign._id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          View Links
                        </Link>
                      </div>
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
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total campaigns)
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
    </div>
  );
}
