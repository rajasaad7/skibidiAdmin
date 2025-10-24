'use client';

import { useEffect, useState } from 'react';
import { Users, Eye, MousePointer, Activity, Globe, Clock, Smartphone, Monitor } from 'lucide-react';

interface ActiveSession {
  sessionId: string;
  userId: string;
  isActive: boolean;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  currentPage: string | null;
  currentPath: string | null;
  pageTitle: string | null;
  location: {
    country: string | null;
    language: string | null;
  } | null;
  device: {
    screenWidth: number | null;
    screenHeight: number | null;
    viewport: {
      width: number;
      height: number;
    } | null;
  };
  activity: {
    clickCount: number;
    scrollDepth: number;
    lastEvent: string | null;
    lastEventTime: string | null;
  };
  recentEvents: Array<{
    type: string;
    timestamp: string;
    data: any;
    url: string;
    path: string;
  }>;
}

interface AnalyticsData {
  sessions: ActiveSession[];
  stats: {
    activeUsers: number;
    totalEvents: number;
    pageviews: number;
    clicks: number;
    topPages: Array<{ path: string; count: number }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/analytics/active-users');
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchData();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getDeviceType = (userAgent: string) => {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  };

  const getBrowser = (userAgent: string) => {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    return 'Other';
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor active users and their behavior</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data?.stats.activeUsers || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Page Views</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data?.stats.pageviews || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data?.stats.clicks || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <MousePointer className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data?.stats.totalEvents || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Users List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Active Users</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {data?.sessions && data.sessions.length > 0 ? (
                data.sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => setSelectedSession(session)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                      selectedSession?.sessionId === session.sessionId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-gray-900">
                            {session.pageTitle || 'Unknown Page'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{session.currentPath || '/'}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            {getDeviceType(session.userAgent) === 'Mobile' ? (
                              <Smartphone className="w-3 h-3" />
                            ) : (
                              <Monitor className="w-3 h-3" />
                            )}
                            {getDeviceType(session.userAgent)}
                          </span>
                          <span>{getBrowser(session.userAgent)}</span>
                          <span>{session.location?.language || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{getTimeAgo(session.lastActivity)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">{session.activity.clickCount} clicks</span>
                          <span className="text-xs text-gray-600">{session.activity.scrollDepth}% scroll</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No active users at the moment</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* User Details */}
          {selectedSession && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Current Page</p>
                  <p className="font-medium text-gray-900 break-words">{selectedSession.pageTitle}</p>
                </div>
                <div>
                  <p className="text-gray-500">URL</p>
                  <p className="font-medium text-gray-900 text-xs break-all">{selectedSession.currentPage}</p>
                </div>
                <div>
                  <p className="text-gray-500">Device</p>
                  <p className="font-medium text-gray-900">
                    {selectedSession.device.screenWidth}x{selectedSession.device.screenHeight}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Last Activity</p>
                  <p className="font-medium text-gray-900">{getTimeAgo(selectedSession.lastActivity)}</p>
                </div>
              </div>

              {/* Recent Events */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Events</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedSession.recentEvents.slice(0, 10).map((event, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">{event.type}</span>
                        <span className="text-gray-500">{getTimeAgo(event.timestamp)}</span>
                      </div>
                      {event.data && Object.keys(event.data).length > 0 && (
                        <p className="text-gray-600 mt-1 truncate">{JSON.stringify(event.data)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Pages */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
            <div className="space-y-3">
              {data?.stats.topPages && data.stats.topPages.length > 0 ? (
                data.stats.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{page.path}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 ml-2">{page.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No page data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
