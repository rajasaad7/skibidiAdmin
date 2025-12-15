'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Mail, User, Building2, Calendar, Phone, CheckCircle2, Ban, Clock, Star } from 'lucide-react';

interface WhiteLabelLead {
  id: string;
  name: string;
  email: string;
  agency_name: string;
  links_per_month: number;
  niche_type: string;
  phone: string;
  telegram: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function WhiteLabelLeadsPage() {
  const [leads, setLeads] = useState<WhiteLabelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<WhiteLabelLead | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    converted: 0,
    rejected: 0,
    this_week: 0
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = '/api/white-label-leads';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching white label leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const response = await fetch('/api/white-label-leads/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead(data.lead);
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      contacted: { color: 'bg-blue-100 text-blue-800', icon: Phone },
      converted: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      rejected: { color: 'bg-red-100 text-red-800', icon: Ban },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getNicheBadge = (niche: string) => {
    const nicheConfig = {
      general: { color: 'bg-gray-100 text-gray-800' },
      competitive: { color: 'bg-orange-100 text-orange-800' },
      premium: { color: 'bg-purple-100 text-purple-800' },
    };
    const config = nicheConfig[niche as keyof typeof nicheConfig] || nicheConfig.general;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {niche}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">White Label Leads</h1>
        <button
          onClick={fetchLeads}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'all' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total Leads</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'pending' ? 'border-yellow-600 ring-2 ring-yellow-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md border-gray-200`}
        >
          <div className="text-sm text-gray-600 mb-1">This Week</div>
          <div className="text-2xl font-bold text-green-600">{stats.this_week}</div>
        </button>
        <button
          onClick={() => setStatusFilter('converted')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'converted' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Converted</div>
          <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Leads
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('contacted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'contacted'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-4 h-4" />
          Contacted
        </button>
        <button
          onClick={() => setStatusFilter('converted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'converted'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Converted
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'rejected'
              ? 'bg-red-100 text-red-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Ban className="w-4 h-4" />
          Rejected
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeout(fetchLeads, 0);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Lead</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Agency</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Links/Month</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Niche</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="font-medium text-gray-900">{lead.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        {lead.agency_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lead.links_per_month}
                    </td>
                    <td className="px-6 py-4">
                      {getNicheBadge(lead.niche_type)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Name</h3>
                  <p className="text-sm text-gray-900">{selectedLead.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                  {getStatusBadge(selectedLead.status)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Email</h3>
                <a href={`mailto:${selectedLead.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                  {selectedLead.email}
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Agency Name</h3>
                  <p className="text-sm text-gray-900">{selectedLead.agency_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Niche Type</h3>
                  {getNicheBadge(selectedLead.niche_type)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Links Per Month</h3>
                  <p className="text-sm text-gray-900">{selectedLead.links_per_month}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Phone</h3>
                  <p className="text-sm text-gray-900">{selectedLead.phone}</p>
                </div>
              </div>

              {selectedLead.telegram && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Telegram</h3>
                  <p className="text-sm text-gray-900">{selectedLead.telegram}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Submitted</h3>
                <p className="text-sm text-gray-900">
                  {new Date(selectedLead.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateLeadStatus(selectedLead.id, 'contacted')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Mark as Contacted
                </button>
                <button
                  onClick={() => updateLeadStatus(selectedLead.id, 'converted')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Mark as Converted
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
