'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, ExternalLink, Zap, Users, X, Pencil, Check } from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

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

interface Stats {
  totalOrganizations: number;
  totalCredits: number;
  totalUsedCredits: number;
  totalCampaigns: number;
}

interface SpeedyIndexBalance {
  google_indexer?: number;
  google_checker?: number;
}

export default function IndexerPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 0,
    totalCredits: 0,
    totalUsedCredits: 0,
    totalCampaigns: 0
  });
  const [speedyIndexBalance, setSpeedyIndexBalance] = useState<SpeedyIndexBalance | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/indexer/organizations?page=${page}`);
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.organizations);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeedyIndexBalance = async () => {
    try {
      const response = await fetch('/api/indexer/speedyindex-balance');
      const data = await response.json();
      if (data.success && data.balance) {
        setSpeedyIndexBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching SpeedyIndex balance:', error);
    }
  };

  const startEditingBalance = () => {
    setBalanceInput(
      speedyIndexBalance?.google_indexer !== undefined
        ? String(speedyIndexBalance.google_indexer)
        : ''
    );
    setEditingBalance(true);
  };

  const saveBalance = async () => {
    const value = Number(balanceInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }
    setSavingBalance(true);
    try {
      const response = await fetch('/api/indexer/speedyindex-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: value }),
      });
      const data = await response.json();
      if (data.success && data.balance) {
        setSpeedyIndexBalance(data.balance);
        setEditingBalance(false);
        toast.success('Sinbyte balance updated');
      } else {
        toast.error(data.error || 'Failed to update balance');
      }
    } catch (error) {
      console.error('Error updating Sinbyte balance:', error);
      toast.error('Failed to update balance');
    } finally {
      setSavingBalance(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchSpeedyIndexBalance();
  }, [page]);

  const getFilteredOrganizations = () => {
    return organizations.filter(org =>
      org.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

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
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Indexer Management</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/indexer/search-link"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Search className="w-4 h-4" />
            Search Link
          </Link>
          <Link
            href="/indexer/speedyindex-tasks"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            SpeedyIndex Tasks
          </Link>
          <button
            onClick={() => {
              fetchOrganizations();
              fetchSpeedyIndexBalance();
            }}
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
          <div className="text-sm text-gray-600 mb-1">Organizations</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalOrganizations}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Campaigns</div>
          <div className="text-2xl font-bold text-purple-600">{stats.totalCampaigns}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-600">Sinbyte API</div>
            {!editingBalance && (
              <button
                onClick={startEditingBalance}
                className="text-gray-400 hover:text-blue-600 transition"
                title="Update Sinbyte balance"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {editingBalance ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                autoFocus
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveBalance();
                  if (e.key === 'Escape') setEditingBalance(false);
                }}
                className="w-full min-w-0 px-2 py-1 text-lg font-bold border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={saveBalance}
                disabled={savingBalance}
                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 shrink-0"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingBalance(false)}
                disabled={savingBalance}
                className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50 shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className={`text-2xl font-bold ${
              speedyIndexBalance?.google_indexer !== undefined && speedyIndexBalance.google_indexer < 0
                ? 'text-red-600'
                : 'text-blue-700'
            }`}>
              {speedyIndexBalance?.google_indexer !== undefined
                ? speedyIndexBalance.google_indexer.toLocaleString()
                : '-'}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Client Credits</div>
          <div className="text-2xl font-bold text-green-600">{stats.totalCredits}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : getFilteredOrganizations().length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No organizations found
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 pr-4" style={{ minWidth: '150px' }}>
                  <span className="text-xs font-semibold text-gray-900 uppercase">Organization Name</span>
                </div>
                <div className="flex items-center justify-center gap-8 flex-shrink-0">
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Campaigns</span>
                  </div>
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Credits</span>
                  </div>
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Used</span>
                  </div>
                  <div className="text-center w-32">
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Actions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {getFilteredOrganizations().map((org) => (
                <div key={org._id} className="px-4 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    {/* Organization Name */}
                    <div className="flex-1 pr-4" style={{ minWidth: '150px' }}>
                      <div className="font-medium text-gray-900">{org.name}</div>
                    </div>

                    {/* Stats - Right aligned */}
                    <div className="flex items-center justify-center gap-8 flex-shrink-0">
                      <div className="text-center w-32">
                        <span className="text-sm font-semibold text-gray-900">{org.campaign_count || 0}</span>
                      </div>
                      <div className="text-center w-32">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                          <Zap className="w-4 h-4" />
                          {org.current_balance}
                        </span>
                      </div>
                      <div className="text-center w-32">
                        <span className="text-sm text-gray-600">{org.total_used}</span>
                      </div>
                      <div className="text-center w-32">
                        <Link
                          href={`/indexer/organizations/${org._id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          View
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
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total organizations)
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
