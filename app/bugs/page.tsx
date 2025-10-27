'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Bug, AlertCircle, Clock, CheckCircle2, AlertTriangle, User, Calendar, ExternalLink } from 'lucide-react';

interface BugReport {
  id: string;
  user_id: string | null;
  error_message: string | null;
  error_stack: string | null;
  component_stack: string | null;
  page_url: string;
  user_agent: string | null;
  browser_info: any;
  user_description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  users?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
}

export default function BugReportsPage() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    high_priority: 0
  });

  const fetchBugs = async () => {
    setLoading(true);
    try {
      let url = '/api/bugs';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setBugs(data.bugs);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching bug reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [statusFilter, priorityFilter]);

  const updateBugStatus = async (bugId: string, status: string) => {
    try {
      const response = await fetch('/api/bugs/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bugId, status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchBugs();
        if (selectedBug?.id === bugId) {
          setSelectedBug(data.bug);
        }
      }
    } catch (error) {
      console.error('Error updating bug status:', error);
    }
  };

  const updateBugPriority = async (bugId: string, priority: string) => {
    try {
      const response = await fetch('/api/bugs/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bugId, priority }),
      });

      const data = await response.json();
      if (data.success) {
        fetchBugs();
        if (selectedBug?.id === bugId) {
          setSelectedBug(data.bug);
        }
      }
    } catch (error) {
      console.error('Error updating bug priority:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800' },
      medium: { color: 'bg-blue-100 text-blue-800' },
      high: { color: 'bg-orange-100 text-orange-800' },
      critical: { color: 'bg-red-100 text-red-800' },
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <AlertTriangle className="w-3 h-3" />
        {priority}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Bug Reports</h1>
        <button
          onClick={fetchBugs}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setStatusFilter('open')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'open' ? 'border-red-600 ring-2 ring-red-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Open</div>
          <div className="text-2xl font-bold text-red-600">{stats.open}</div>
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'in_progress' ? 'border-yellow-600 ring-2 ring-yellow-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'resolved' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'all' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">High Priority</div>
          <div className="text-2xl font-bold text-orange-600">{stats.high_priority}</div>
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
          All Bugs
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'open'
              ? 'bg-red-100 text-red-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Open
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'in_progress'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          In Progress
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'resolved'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Resolved
        </button>
      </div>

      {/* Bug Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Error</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Page URL</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : bugs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No bug reports found
                  </td>
                </tr>
              ) : (
                bugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <Bug className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 truncate">
                            {bug.error_message || 'No error message'}
                          </div>
                          {bug.user_description && (
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {bug.user_description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {bug.users ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bug.users.fullName}</div>
                          <div className="text-xs text-gray-500">{bug.users.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={bug.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-xs">{bug.page_url}</span>
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={bug.status}
                        onChange={(e) => updateBugStatus(bug.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={bug.priority}
                        onChange={(e) => updateBugPriority(bug.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(bug.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedBug(bug)}
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

      {/* Bug Detail Modal */}
      {selectedBug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Bug Report Details</h2>
              <button
                onClick={() => setSelectedBug(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Message</h3>
                <p className="text-sm text-gray-900 bg-red-50 p-3 rounded-lg">
                  {selectedBug.error_message || 'No error message'}
                </p>
              </div>

              {selectedBug.user_description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">User Description</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedBug.user_description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                  {getStatusBadge(selectedBug.status)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Priority</h3>
                  {getPriorityBadge(selectedBug.priority)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Page URL</h3>
                <a
                  href={selectedBug.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {selectedBug.page_url}
                </a>
              </div>

              {selectedBug.error_stack && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Stack</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {selectedBug.error_stack}
                  </pre>
                </div>
              )}

              {selectedBug.component_stack && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Component Stack</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {selectedBug.component_stack}
                  </pre>
                </div>
              )}

              {selectedBug.browser_info && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Browser Info</h3>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedBug.browser_info, null, 2)}
                  </pre>
                </div>
              )}

              {selectedBug.user_agent && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">User Agent</h3>
                  <p className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedBug.user_agent}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Created At</h3>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedBug.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedBug.resolved_at && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Resolved At</h3>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedBug.resolved_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
