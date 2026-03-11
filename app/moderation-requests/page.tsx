'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Clock, CheckCircle2, User, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';

interface ModerationRequest {
  _id: string;
  linkId: string;
  requestedBy: string;
  requestedAt: string;
  notes: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  link?: {
    _id: string;
    url: string;
    projectId: string;
    projects: {
      _id: string;
      name: string;
      website: string;
    } | null;
  } | null;
  reporter?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  reviewer?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
}

export default function ModerationRequestsPage() {
  const [requests, setRequests] = useState<ModerationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ModerationRequest | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    reviewed: 0,
    total: 0
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = '/api/moderation-requests';
      const params = new URLSearchParams();

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching moderation requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const updateRequestStatus = async (requestId: string, status: string, adminNotes?: string) => {
    try {
      const response = await fetch('/api/moderation-requests/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, status, adminNotes }),
      });

      const data = await response.json();
      if (data.success) {
        fetchRequests();
        if (selectedRequest?._id === requestId) {
          setSelectedRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Error updating moderation request status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      reviewed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
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

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Link Moderation Requests</h1>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          onClick={() => setStatusFilter('reviewed')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'reviewed' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Reviewed</div>
          <div className="text-2xl font-bold text-green-600">{stats.reviewed}</div>
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            statusFilter === 'all' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
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
          All Requests
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
          onClick={() => setStatusFilter('reviewed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'reviewed'
              ? 'bg-green-100 text-green-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Reviewed
        </button>
      </div>

      {/* Moderation Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Link</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reported By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Notes</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Requested</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No moderation requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {request.link ? (
                        <div className="max-w-sm space-y-2">
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">Backlink URL:</div>
                            <a
                              href={request.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{request.link.url}</span>
                            </a>
                          </div>
                          {request.link.projects && (
                            <div>
                              <div className="text-xs text-gray-500 font-medium mb-1">Project:</div>
                              <a
                                href={request.link.projects.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{request.link.projects.website}</span>
                              </a>
                              <div className="text-xs text-gray-400 mt-0.5">{request.link.projects.name}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Link not found</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {request.reporter ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.reporter.fullName}</div>
                          <div className="text-xs text-gray-500">{request.reporter.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 truncate">
                          {request.notes || 'No notes provided'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedRequest(request)}
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

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Moderation Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Link Information</h3>
                {selectedRequest.link ? (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <div className="text-xs text-gray-600 font-medium mb-1">Backlink URL:</div>
                      <a
                        href={selectedRequest.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2 break-all"
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        {selectedRequest.link.url}
                      </a>
                    </div>
                    {selectedRequest.link.projects && (
                      <div>
                        <div className="text-xs text-gray-600 font-medium mb-1">Project Website:</div>
                        <a
                          href={selectedRequest.link.projects.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 hover:text-green-800 flex items-center gap-2 break-all"
                        >
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                          {selectedRequest.link.projects.website}
                        </a>
                        <div className="text-xs text-gray-500 mt-1">
                          Project: {selectedRequest.link.projects.name}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Link ID: {selectedRequest.linkId}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    Link not found or has been deleted
                  </p>
                )}
              </div>

              {selectedRequest.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">User Notes</h3>
                  <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded-lg">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Reported By</h3>
                  {selectedRequest.reporter ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedRequest.reporter.fullName}</div>
                      <div className="text-xs text-gray-500">{selectedRequest.reporter.email}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unknown</span>
                  )}
                </div>
              </div>

              {selectedRequest.reviewedBy && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Reviewed By</h3>
                  {selectedRequest.reviewer ? (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{selectedRequest.reviewer.fullName}</div>
                      <div className="text-xs text-gray-500">{selectedRequest.reviewer.email}</div>
                      {selectedRequest.reviewedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reviewed at: {new Date(selectedRequest.reviewedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unknown</span>
                  )}
                </div>
              )}

              {selectedRequest.adminNotes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Admin Notes</h3>
                  <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">
                    {selectedRequest.adminNotes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Requested At</h3>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRequest.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Last Updated</h3>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRequest.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Review Request</h3>
                  <div className="space-y-3">

                    {/* Quick Reply Buttons */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-2 block">Quick Replies:</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "The backlink does not exist on this URL.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                        >
                          No Backlink
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "The backlink exists but our scraper couldn't detect it. We've optimized the configuration for this domain.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                        >
                          Scraper Optimized
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "Please contact live support for further clarification on this backlink.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition"
                        >
                          Contact Support
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "The backlink was found successfully. Issue has been resolved.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                        >
                          Resolved
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "The page structure has changed. We're updating our detection system.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition"
                        >
                          Page Changed
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "The backlink URL has been redirected. Please verify the final destination.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition"
                        >
                          Redirected
                        </button>
                        <button
                          onClick={() => {
                            const textarea = document.getElementById('adminNotes') as HTMLTextAreaElement;
                            textarea.value = "This page requires JavaScript to load content. Configuration updated.";
                            textarea.focus();
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
                        >
                          JS Required
                        </button>
                      </div>
                    </div>

                    {/* Admin Notes Textarea */}
                    <div>
                      <label htmlFor="adminNotes" className="text-xs font-medium text-gray-600 mb-2 block">Admin Notes:</label>
                      <textarea
                        id="adminNotes"
                        placeholder="Add admin notes or use quick replies above..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        rows={4}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={() => {
                        const adminNotes = (document.getElementById('adminNotes') as HTMLTextAreaElement).value;
                        updateRequestStatus(selectedRequest._id, 'reviewed', adminNotes);
                        setSelectedRequest(null);
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Mark as Reviewed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
