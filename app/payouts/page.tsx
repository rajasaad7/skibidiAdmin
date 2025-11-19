'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, DollarSign, User, TrendingUp, AlertCircle } from 'lucide-react';

interface PublisherEarnings {
  _id: string;
  fullName: string;
  email: string;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  completedOrders: number;
  pendingOrders: number;
}

interface PayoutStats {
  totalOwed: number;
  totalPaid: number;
  publishersCount: number;
  pendingOrdersValue: number;
}

interface Payout {
  _id: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: string;
  processedAt?: string;
  transactionId?: string;
  notes?: string;
  user?: {
    _id: string;
    email: string;
    fullName: string;
  };
}

export default function PayoutsPage() {
  const [view, setView] = useState<'earnings' | 'requests'>('earnings');

  // Earnings state
  const [publishers, setPublishers] = useState<PublisherEarnings[]>([]);
  const [earningsStats, setEarningsStats] = useState<PayoutStats>({
    totalOwed: 0,
    totalPaid: 0,
    publishersCount: 0,
    pendingOrdersValue: 0
  });
  const [earningsFilter, setEarningsFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Payout requests state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pendingCount: 0,
    pendingAmount: 0,
    completedCount: 0,
    completedAmount: 0,
    failed: 0
  });

  const fetchPublisherEarnings = async () => {
    try {
      const response = await fetch('/api/payouts/earnings');
      const data = await response.json();
      if (data.success) {
        setPublishers(data.publishers);
        setEarningsStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching publisher earnings:', error);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/payouts'
        : `/api/payouts?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPayouts(data.payouts);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'earnings') {
      fetchPublisherEarnings();
    } else {
      fetchPayouts();
    }
  }, [view, filter]);

  const handleRefresh = () => {
    if (view === 'earnings') {
      fetchPublisherEarnings();
    } else {
      fetchPayouts();
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    try {
      const response = await fetch('/api/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, transactionId, notes })
      });
      if (response.ok) {
        setProcessingId(null);
        setTransactionId('');
        setNotes('');
        fetchPayouts();
      }
    } catch (error) {
      console.error('Error marking payout as paid:', error);
    }
  };

  const handleMarkAsFailed = async (payoutId: string, reason: string) => {
    if (!reason) {
      alert('Please provide a reason for failure');
      return;
    }
    try {
      const response = await fetch('/api/payouts/mark-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, reason })
      });
      if (response.ok) {
        fetchPayouts();
      }
    } catch (error) {
      console.error('Error marking payout as failed:', error);
    }
  };

  const getFilteredPublishers = () => {
    if (earningsFilter === 'pending') {
      return publishers.filter(p => p.pendingPayout > 0);
    } else if (earningsFilter === 'paid') {
      return publishers.filter(p => p.paidOut > 0);
    }
    return publishers;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Publisher Payouts</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('earnings')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                view === 'earnings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setView('requests')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                view === 'requests'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {view === 'earnings' ? (
        <>
          {/* Earnings Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Total Owed</p>
                  <p className="text-2xl font-bold text-red-700">${earningsStats.totalOwed.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Paid Out</p>
                  <p className="text-2xl font-bold text-green-700">${earningsStats.totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Active Publishers</p>
                  <p className="text-2xl font-bold text-blue-700">{earningsStats.publishersCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending Orders Value</p>
                  <p className="text-2xl font-bold text-yellow-700">${earningsStats.pendingOrdersValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setEarningsFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                earningsFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Publishers ({publishers.length})
            </button>
            <button
              onClick={() => setEarningsFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                earningsFilter === 'pending'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              With Pending ({publishers.filter(p => p.pendingPayout > 0).length})
            </button>
            <button
              onClick={() => setEarningsFilter('paid')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                earningsFilter === 'paid'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Paid Before ({publishers.filter(p => p.paidOut > 0).length})
            </button>
          </div>

          {/* Publishers Earnings Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Publisher</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Earnings</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Pending Payout</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Already Paid</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Completed</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {publishers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No publishers found
                      </td>
                    </tr>
                  ) : (
                    getFilteredPublishers().map((publisher) => (
                      <tr key={publisher._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{publisher.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {publisher.email}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-900">
                            ${publisher.totalEarnings.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {publisher.pendingPayout > 0 ? (
                            <span className="font-semibold text-red-600">
                              ${publisher.pendingPayout.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {publisher.paidOut > 0 ? (
                            <span className="font-semibold text-green-600">
                              ${publisher.paidOut.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {publisher.completedOrders}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {publisher.pendingOrders > 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {publisher.pendingOrders}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Payout Requests Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Pending Payouts</div>
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">${stats.pendingAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">{stats.pendingCount} requests</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Completed</div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">${stats.completedAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">{stats.completedCount} payouts</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Failed</div>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.failed}</div>
              <div className="text-sm text-gray-600">payouts</div>
            </div>
          </div>

          {/* Payout Request Filters */}
          <div className="mb-6 flex gap-2">
            {['pending', 'completed', 'failed', 'all'].map((status) => (
              <button
                key={`filter-${status}`}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Payouts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Publisher</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Requested</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Processed</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No payouts found
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payout.user?.fullName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">{payout.user?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-lg font-semibold text-gray-900">
                          ${payout.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payout.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {payout.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              {processingId === payout._id ? (
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    placeholder="Transaction ID (optional)"
                                    className="px-2 py-1 text-xs border border-gray-300 rounded"
                                  />
                                  <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notes (optional)"
                                    className="px-2 py-1 text-xs border border-gray-300 rounded"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleMarkAsPaid(payout._id)}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => {
                                        setProcessingId(null);
                                        setTransactionId('');
                                        setNotes('');
                                      }}
                                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setProcessingId(payout._id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                    title="Mark as Paid"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Reason for failure:');
                                      if (reason) handleMarkAsFailed(payout._id, reason);
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Mark as Failed"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
