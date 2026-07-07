'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, User, Mail, Calendar, Eye, BadgeCheck, Info, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, LogIn, Copy, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  googleId?: string;
  twitterId?: string;
  createdAt: string;
  lastActive?: string;
  linksCount?: number;
  UTM?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    utm_id?: string;
    // Ad platform tracking
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    gad_source?: string;
    gad_campaignid?: string;
    fbclid?: string;
    ttclid?: string;
    twclid?: string;
    msclkid?: string;
    li_fat_id?: string;
    ref?: string;
    referrer?: string;
    // First-touch / last-touch attribution (organic + referral signups carry
    // these even when there is no tagged utm_source, e.g. a claude.ai referral)
    ft_utm_source?: string;
    ft_referrer?: string;
    ft_landing?: string;
    ft_ts?: string;
    lt_referrer?: string;
    lt_landing?: string;
    lt_ts?: string;
  } | null;
  contactDetails?: {
    type: string;
    value: string;
    updatedAt: string;
  } | null;
}

type UTMData = NonNullable<User['UTM']>;

// Whether a user carries any meaningful attribution worth surfacing. Includes
// referral / organic signups (ft_referrer, landing) - not just tagged campaigns
// or paid-ad clicks - so a claude.ai referral (no utm_source) still shows.
function hasAttribution(utm?: User['UTM']): boolean {
  if (!utm) return false;
  return Boolean(
    utm.utm_source ||
    utm.ft_utm_source ||
    utm.utm_medium ||
    utm.utm_campaign ||
    utm.gclid ||
    utm.gbraid ||
    utm.wbraid ||
    utm.fbclid ||
    utm.ttclid ||
    utm.twclid ||
    utm.msclkid ||
    utm.li_fat_id ||
    utm.ref ||
    utm.referrer ||
    utm.ft_referrer ||
    utm.lt_referrer ||
    utm.ft_landing ||
    utm.lt_landing
  );
}

// Best-effort readable origin from a URL/host string (drops protocol + path).
function prettyHost(value?: string): string {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState({
    total: 0,
    paidUsers: 0,
    freeUsers: 0,
    newToday: 0,
    advertisers: 0,
    publishers: 0
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUrl, setLoginUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = '/api/users';
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (activeFilter !== 'all') {
        params.append('filter', activeFilter);
      }

      params.append('page', page.toString());
      params.append('limit', '50');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeFilter, page, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleLogin = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/generate-login-token`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success && data.loginUrl) {
        setLoginUrl(data.loginUrl);
        setShowLoginModal(true);
        setCopied(false);
        toast.success(`Login link generated for ${userName}`);
      } else {
        toast.error(data.error || 'Failed to generate login link');
      }
    } catch (error) {
      console.error('Error generating login link:', error);
      toast.error('Failed to generate login link');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div>
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Admin Login Access</h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-5">
              Copy this secure link and paste it in an <strong>incognito window</strong>. The link expires in 5 minutes for security.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Secure Login URL
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 break-all max-h-24 overflow-y-auto">
                  {loginUrl}
                </div>
                <button
                  onClick={handleCopyUrl}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all shadow-md flex-shrink-0 ${
                    copied
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-amber-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">Security Notice</p>
                  <p className="text-sm text-amber-800">
                    This link provides full access to the user's account. Use incognito mode to prevent session conflicts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'all' ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </button>
        <button
          onClick={() => setActiveFilter('paid')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'paid' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Paid Users</div>
          <div className="text-2xl font-bold text-blue-600">{stats.paidUsers}</div>
        </button>
        <button
          onClick={() => setActiveFilter('free')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'free' ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Free Users</div>
          <div className="text-2xl font-bold text-green-600">{stats.freeUsers}</div>
        </button>
        <button
          onClick={() => setActiveFilter('new_today')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'new_today' ? 'border-purple-600 ring-2 ring-purple-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">New Today</div>
          <div className="text-2xl font-bold text-purple-600">{stats.newToday}</div>
        </button>
        <button
          onClick={() => setActiveFilter('advertisers')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'advertisers' ? 'border-orange-600 ring-2 ring-orange-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Valid Advertisers</div>
          <div className="text-2xl font-bold text-orange-600">{stats.advertisers}</div>
        </button>
        <button
          onClick={() => setActiveFilter('publishers')}
          className={`bg-white rounded-lg shadow-sm p-4 border transition text-left hover:shadow-md ${
            activeFilter === 'publishers' ? 'border-teal-600 ring-2 ring-teal-600' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Valid Publishers</div>
          <div className="text-2xl font-bold text-teal-600">{stats.publishers}</div>
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
              placeholder="Search by name or email..."
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
                setTimeout(fetchUsers, 0);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  <button
                    onClick={() => handleSort('linksCount')}
                    className="flex items-center gap-1 hover:text-blue-600 transition"
                  >
                    Links
                    {sortBy === 'linksCount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 hover:text-blue-600 transition"
                  >
                    Created
                    {sortBy === 'createdAt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  <button
                    onClick={() => handleSort('lastActive')}
                    className="flex items-center gap-1 hover:text-blue-600 transition"
                  >
                    Last Active
                    {sortBy === 'lastActive' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-40" />
                    )}
                  </button>
                </th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{user.fullName.split(' ')[0]}</div>
                          {hasAttribution(user.UTM) && (
                            <div className="relative group">
                              <Info className="w-4 h-4 text-purple-500 cursor-help" />
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 min-w-max">
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[-4px] w-2 h-2 bg-gray-900 rotate-45"></div>
                                <div className="space-y-1 max-w-xs whitespace-normal break-words">
                                  {/* Referral / origin - present even when there is no tagged
                                      campaign (organic + referral signups). */}
                                  {(user.UTM!.ft_referrer || user.UTM!.lt_referrer || user.UTM!.ft_landing || user.UTM!.lt_landing || user.UTM!.ref) && (
                                    <>
                                      <div className="font-semibold text-emerald-300 border-b border-gray-700 pb-1 mb-1">Referral / Origin</div>
                                      {(user.UTM!.ft_referrer || user.UTM!.referrer) && (
                                        <div><span className="text-gray-400">Referrer:</span> {prettyHost(user.UTM!.ft_referrer || user.UTM!.referrer)}</div>
                                      )}
                                      {user.UTM!.lt_referrer && user.UTM!.lt_referrer !== user.UTM!.ft_referrer && (
                                        <div><span className="text-gray-400">Last referrer:</span> {prettyHost(user.UTM!.lt_referrer)}</div>
                                      )}
                                      {user.UTM!.ref && (
                                        <div><span className="text-gray-400">Ref:</span> {user.UTM!.ref}</div>
                                      )}
                                      {user.UTM!.ft_landing && (
                                        <div><span className="text-gray-400">Landing:</span> {user.UTM!.ft_landing.replace(/^https?:\/\//, '').replace(/^www\./, '')}</div>
                                      )}
                                      {user.UTM!.ft_ts && (
                                        <div><span className="text-gray-400">First touch:</span> {new Date(user.UTM!.ft_ts).toLocaleString()}</div>
                                      )}
                                    </>
                                  )}
                                  {(user.UTM!.utm_source || user.UTM!.ft_utm_source || user.UTM!.utm_medium || user.UTM!.utm_campaign || user.UTM!.utm_term || user.UTM!.utm_content) && (
                                    <div className="font-semibold text-purple-300 border-b border-gray-700 pb-1 mb-1 pt-1">Campaign</div>
                                  )}
                                  {(user.UTM!.utm_source || user.UTM!.ft_utm_source) && (
                                    <div><span className="text-gray-400">Source:</span> {user.UTM!.utm_source || user.UTM!.ft_utm_source}</div>
                                  )}
                                  {user.UTM!.utm_medium && (
                                    <div><span className="text-gray-400">Medium:</span> {user.UTM!.utm_medium}</div>
                                  )}
                                  {user.UTM!.utm_campaign && (
                                    <div><span className="text-gray-400">Campaign:</span> {user.UTM!.utm_campaign}</div>
                                  )}
                                  {user.UTM!.utm_term && (
                                    <div><span className="text-gray-400">Term:</span> {user.UTM!.utm_term}</div>
                                  )}
                                  {user.UTM!.utm_content && (
                                    <div><span className="text-gray-400">Content:</span> {user.UTM!.utm_content}</div>
                                  )}
                                  {(user.UTM!.gclid || user.UTM!.gbraid || user.UTM!.wbraid) && (
                                    <div className="font-semibold text-blue-300 pt-1 mt-1">Google Ads</div>
                                  )}
                                  {user.UTM!.gclid && (
                                    <div><span className="text-gray-400">GCLID:</span> {user.UTM!.gclid.substring(0, 20)}...</div>
                                  )}
                                  {user.UTM!.gad_campaignid && (
                                    <div><span className="text-gray-400">Campaign ID:</span> {user.UTM!.gad_campaignid}</div>
                                  )}
                                  {user.UTM!.fbclid && (
                                    <>
                                      <div className="font-semibold text-blue-400 border-t border-gray-700 pt-1 mt-1">Facebook Ads</div>
                                      <div><span className="text-gray-400">FBCLID:</span> {user.UTM!.fbclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM!.ttclid && (
                                    <>
                                      <div className="font-semibold text-pink-300 border-t border-gray-700 pt-1 mt-1">TikTok Ads</div>
                                      <div><span className="text-gray-400">TTCLID:</span> {user.UTM!.ttclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM!.twclid && (
                                    <>
                                      <div className="font-semibold text-sky-300 border-t border-gray-700 pt-1 mt-1">Twitter Ads</div>
                                      <div><span className="text-gray-400">TWCLID:</span> {user.UTM!.twclid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM!.msclkid && (
                                    <>
                                      <div className="font-semibold text-cyan-300 border-t border-gray-700 pt-1 mt-1">Microsoft Ads</div>
                                      <div><span className="text-gray-400">MSCLKID:</span> {user.UTM!.msclkid.substring(0, 20)}...</div>
                                    </>
                                  )}
                                  {user.UTM!.li_fat_id && (
                                    <>
                                      <div className="font-semibold text-blue-300 border-t border-gray-700 pt-1 mt-1">LinkedIn Ads</div>
                                      <div><span className="text-gray-400">LI_FAT_ID:</span> {user.UTM!.li_fat_id.substring(0, 20)}...</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {user.contactDetails && (
                            <div className="relative group">
                              <BadgeCheck className="w-4 h-4 text-blue-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                <div className="font-semibold mb-1">{user.contactDetails.type === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</div>
                                <div>{user.contactDetails.value}</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.linksCount || 0}</span>
                        <span className="text-gray-500 text-xs">links</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/users/${user._id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                          title="View user details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                        <button
                          onClick={() => handleLogin(user._id, user.fullName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition"
                          title="Login as user"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Login
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (pagination.totalPages <= 7) return true;
                    if (p === 1 || p === pagination.totalPages) return true;
                    if (p >= page - 1 && p <= page + 1) return true;
                    if (p === 2 && page > 3) return 'ellipsis-start';
                    if (p === pagination.totalPages - 1 && page < pagination.totalPages - 2) return 'ellipsis-end';
                    return false;
                  })
                  .map((p) => {
                    if (typeof p === 'string') {
                      return <span key={p} className="px-2 text-gray-400">...</span>;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          page === p
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  page === pagination.totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
