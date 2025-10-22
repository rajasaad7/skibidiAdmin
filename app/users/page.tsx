'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, User, Mail, Calendar, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  googleId?: string;
  twitterId?: string;
  createdAt: string;
  lastActive?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    paidUsers: 0,
    freeUsers: 0,
    newToday: 0,
    advertisers: 0,
    publishers: 0
  });

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
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Auth Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Active</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                        <div className="font-medium text-gray-900">{user.fullName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isEmailVerified ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.googleId && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Google
                          </span>
                        )}
                        {user.twitterId && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
                            Twitter
                          </span>
                        )}
                        {!user.googleId && !user.twitterId && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Email
                          </span>
                        )}
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
                      <button
                        onClick={() => router.push(`/users/${user._id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
                        title="View user details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
