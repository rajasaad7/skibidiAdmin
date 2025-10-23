'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, DollarSign } from 'lucide-react';

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
    fetchPayouts();
  }, [filter]);

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

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Publisher Payouts</h1>
        <button
          onClick={fetchPayouts}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
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

      {/* Filters */}
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
    </div>
  );
}
