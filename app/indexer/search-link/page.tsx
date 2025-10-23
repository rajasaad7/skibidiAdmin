'use client';

import React, { useState } from 'react';
import { Search, ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface LinkData {
  _id: string;
  url: string;
  status: string;
  submittedAt: string;
  indexedAt: string | null;
  lastChecked: string | null;
  checkCount: number;
  errorMessage: string | null;
  createdAt: string;
  dripFeedDays: number | null;
  credits_used: number;
  campaignId: string;
  referenceTask?: {
    name: string;
    taskId: string;
  };
  campaign?: {
    name: string;
    userId: string;
    workspaceId: string;
  };
  user?: {
    fullName: string;
    email: string;
  };
}

interface SpeedyIndexReport {
  taskId: string;
  taskTitle: string;
  taskSize: number;
  taskProcessedCount: number;
  isIndexed: boolean;
  indexedData: {
    url: string;
    title?: string;
  } | null;
  unindexedData: {
    url: string;
    error_code?: number;
  } | null;
}

export default function SearchLinkPage() {
  const [searchUrl, setSearchUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [speedyIndexReport, setSpeedyIndexReport] = useState<SpeedyIndexReport | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!searchUrl.trim()) return;

    setSearching(true);
    setNotFound(false);
    setLinkData(null);
    setSpeedyIndexReport(null);

    try {
      const response = await fetch('/api/indexer/search-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: searchUrl.trim() })
      });

      const data = await response.json();

      if (data.success && data.found) {
        setLinkData(data.link);
        setSpeedyIndexReport(data.speedyIndexReport);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error searching link:', error);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

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

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg";
    switch (status) {
      case 'indexed':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="w-5 h-5" /> Indexed Successfully
          </span>
        );
      case 'error':
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <XCircle className="w-5 h-5" /> Failed
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-orange-100 text-orange-800`}>
            <Clock className="w-5 h-5" /> Pending
          </span>
        );
      case 'submitted':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <Clock className="w-5 h-5" /> Submitted to SpeedyIndex
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <AlertCircle className="w-5 h-5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/indexer"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Indexer</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search Link Status</h1>
          <p className="text-sm text-gray-600 mt-1">Check the indexation status of any submitted link</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter URL to search
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchUrl}
            onChange={(e) => setSearchUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="https://example.com/page"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchUrl.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Loading State */}
      {searching && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">Searching...</div>
        </div>
      )}

      {/* Not Found */}
      {notFound && !searching && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Link Not Found</h3>
              <p className="text-sm text-yellow-800">
                This URL was not found in our system. It may not have been submitted for indexing yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Link Data */}
      {linkData && !searching && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Link Status</h2>
              {getStatusBadge(linkData.status)}
            </div>

            {/* URL */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-600 block mb-2">URL</label>
              <a
                href={linkData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {linkData.url}
              </a>
            </div>

            {/* Error Message */}
            {linkData.errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="text-sm font-medium text-red-900 block mb-2">Error Message</label>
                <p className="text-sm text-red-800">{linkData.errorMessage}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Submitted</label>
                <p className="text-sm font-medium text-gray-900">{formatDate(linkData.submittedAt)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Indexed At</label>
                <p className="text-sm font-medium text-gray-900">{formatDate(linkData.indexedAt)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Check Count</label>
                <p className="text-sm font-medium text-gray-900">{linkData.checkCount}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Credits Used</label>
                <p className="text-sm font-medium text-gray-900">{linkData.credits_used}</p>
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          {linkData.campaign && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Campaign Name</label>
                  <Link
                    href={`/indexer/${linkData.campaignId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {linkData.campaign.name}
                  </Link>
                </div>
                {linkData.user && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">User</label>
                    <p className="text-sm text-gray-900">
                      {linkData.user.fullName} ({linkData.user.email})
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SpeedyIndex Task Info */}
          {linkData.referenceTask && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SpeedyIndex Task</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Task Name</label>
                  <p className="text-sm text-gray-900">{linkData.referenceTask.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Task ID</label>
                  <p className="text-sm text-gray-900 font-mono">{linkData.referenceTask.taskId}</p>
                </div>
              </div>
            </div>
          )}

          {/* SpeedyIndex Response Details */}
          {speedyIndexReport && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SpeedyIndex Response</h3>

              {speedyIndexReport.isIndexed ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">Successfully Indexed by Google</p>
                      <p className="text-sm text-green-800 mt-1">
                        This link was found in Google's search results
                      </p>
                    </div>
                  </div>
                  {speedyIndexReport.indexedData?.title && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <label className="text-xs font-medium text-green-900 block mb-1">Search Result Title</label>
                      <p className="text-sm text-green-800">{speedyIndexReport.indexedData.title}</p>
                    </div>
                  )}
                </div>
              ) : speedyIndexReport.unindexedData ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Not Indexed by Google</p>
                      <p className="text-sm text-red-800 mt-1">
                        SpeedyIndex attempted to index this link but it's not showing in Google search results
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <label className="text-xs font-medium text-red-900 block mb-1">Error Code</label>
                    <p className="text-sm text-red-800">
                      {speedyIndexReport.unindexedData.error_code === -1 && (
                        <span className="font-medium">Meta tag 'noindex' found on the page</span>
                      )}
                      {speedyIndexReport.unindexedData.error_code === 0 && (
                        <span>No errors found - The link is valid but not indexed yet</span>
                      )}
                      {speedyIndexReport.unindexedData.error_code &&
                       speedyIndexReport.unindexedData.error_code !== 0 &&
                       speedyIndexReport.unindexedData.error_code !== -1 && (
                        <span className="font-medium">HTTP {speedyIndexReport.unindexedData.error_code} Error -
                          {speedyIndexReport.unindexedData.error_code === 404 && ' Page not found'}
                          {speedyIndexReport.unindexedData.error_code === 502 && ' Bad Gateway'}
                          {speedyIndexReport.unindexedData.error_code === 503 && ' Service Unavailable'}
                          {speedyIndexReport.unindexedData.error_code === 410 && ' Page Gone'}
                          {![404, 502, 503, 410].includes(speedyIndexReport.unindexedData.error_code) && ' Server Error'}
                        </span>
                      )}
                    </p>
                    <div className="mt-3 text-xs text-red-700 space-y-1">
                      <p className="font-medium">Common reasons for not being indexed:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Page returned an error (404, 502, etc.)</li>
                        <li>noindex meta tag present on the page</li>
                        <li>Page blocked by robots.txt</li>
                        <li>Low quality or duplicate content</li>
                        <li>Page requires time for Google to crawl</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">No detailed response available from SpeedyIndex yet.</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
                <p>Task: {speedyIndexReport.taskTitle}</p>
                <p>Processed: {speedyIndexReport.taskProcessedCount} / {speedyIndexReport.taskSize} links</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Link Created</p>
                  <p className="text-xs text-gray-600">{formatDate(linkData.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted to SpeedyIndex</p>
                  <p className="text-xs text-gray-600">{formatDate(linkData.submittedAt)}</p>
                </div>
              </div>
              {linkData.lastChecked && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Checked</p>
                    <p className="text-xs text-gray-600">{formatDate(linkData.lastChecked)}</p>
                  </div>
                </div>
              )}
              {linkData.indexedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Successfully Indexed</p>
                    <p className="text-xs text-gray-600">{formatDate(linkData.indexedAt)}</p>
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
