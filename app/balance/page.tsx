'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, User, AlertCircle, RotateCcw } from 'lucide-react';

interface BuyerBalance {
  _id: string;
  fullName: string;
  email: string;
  balance: number;
  totalAdded: number;
  totalSpent: number;
  totalRefunded: number;
  unclaimedRefunds: number;
  totalBalance: number;
  updatedAt: string | null;
}

interface BalanceStats {
  totalBalance: number;
  totalAdded: number;
  totalSpent: number;
  totalUnclaimedRefunds: number;
  buyersCount: number;
}

interface PublisherEarnings {
  _id: string;
  fullName: string;
  email: string;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  completedOrders: number;
  pendingOrders: number;
  pendingEarnings: number;
  hasOpenRequest: boolean;
}

export default function BalancePage() {
  const [tab, setTab] = useState<'buyers' | 'publishers'>('buyers');
  const [search, setSearch] = useState('');

  // Buyers state
  const [buyers, setBuyers] = useState<BuyerBalance[]>([]);
  const [buyerStats, setBuyerStats] = useState<BalanceStats>({
    totalBalance: 0,
    totalAdded: 0,
    totalSpent: 0,
    totalUnclaimedRefunds: 0,
    buyersCount: 0,
  });
  const [buyersLoading, setBuyersLoading] = useState(true);

  // Publishers state
  const [publishers, setPublishers] = useState<PublisherEarnings[]>([]);
  const [publishersLoading, setPublishersLoading] = useState(true);

  const fetchBuyers = async () => {
    setBuyersLoading(true);
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      if (data.success) {
        setBuyers(data.buyers);
        setBuyerStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching buyer balances:', error);
    } finally {
      setBuyersLoading(false);
    }
  };

  const fetchPublishers = async () => {
    setPublishersLoading(true);
    try {
      const response = await fetch('/api/payouts/earnings');
      const data = await response.json();
      if (data.success) {
        setPublishers(data.publishers);
      }
    } catch (error) {
      console.error('Error fetching publisher earnings:', error);
    } finally {
      setPublishersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'buyers') {
      fetchBuyers();
    } else {
      fetchPublishers();
    }
  }, [tab]);

  const matchesSearch = (name: string, email: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (name || '').toLowerCase().includes(q) || (email || '').toLowerCase().includes(q);
  };

  const filteredBuyers = buyers.filter((b) => matchesSearch(b.fullName, b.email));

  // Publishers who hold a balance but have NOT submitted a payout request yet.
  const pendingPublishers = publishers.filter(
    (p) => p.pendingPayout > 0 && !p.hasOpenRequest
  );
  const filteredPublishers = pendingPublishers.filter((p) =>
    matchesSearch(p.fullName, p.email)
  );

  const publisherStats = {
    // Sum of the table's "Total" column = available balance + pending earnings.
    totalOwed: pendingPublishers.reduce((sum, p) => sum + p.pendingPayout + p.pendingEarnings, 0),
    totalAvailable: pendingPublishers.reduce((sum, p) => sum + p.pendingPayout, 0),
    totalPending: pendingPublishers.reduce((sum, p) => sum + p.pendingEarnings, 0),
    publishersCount: pendingPublishers.length,
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Balances</h1>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('buyers')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              tab === 'buyers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Buyers
          </button>
          <button
            onClick={() => setTab('publishers')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              tab === 'publishers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Publishers
          </button>
        </div>
      </div>

      {tab === 'buyers' ? (
        <>
          {/* Buyer Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total (Balance + Refunds)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(buyerStats.totalBalance + buyerStats.totalUnclaimedRefunds).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Wallet Balance</p>
                  <p className="text-2xl font-bold text-gray-900">${buyerStats.totalBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Unclaimed Refunds</p>
                  <p className="text-2xl font-bold text-gray-900">${buyerStats.totalUnclaimedRefunds.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Buyers with Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{buyerStats.buyersCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full md:w-96 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Buyers Balance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Buyer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Wallet Balance</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Unclaimed Refunds</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredBuyers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No buyers with claimable balance found
                      </td>
                    </tr>
                  ) : (
                    filteredBuyers.map((buyer) => (
                      <tr key={buyer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{buyer.fullName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{buyer.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          {buyer.balance > 0 ? (
                            <span className="font-semibold text-green-600">${buyer.balance.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {buyer.unclaimedRefunds > 0 ? (
                            <span className="font-semibold text-amber-600">${buyer.unclaimedRefunds.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-900">${buyer.totalBalance.toFixed(2)}</span>
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
          {/* Publisher Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total (Balance + Pending)</p>
                  <p className="text-2xl font-bold text-gray-900">${publisherStats.totalOwed.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">${publisherStats.totalAvailable.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Pending Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">${publisherStats.totalPending.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Publishers with Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{publisherStats.publishersCount}</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Publishers holding a balance who have not submitted a payout request yet.
          </p>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full md:w-96 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Publishers Balance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Publisher</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Available Balance</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Pending Earnings</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {publishersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredPublishers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No publishers with an unclaimed balance
                      </td>
                    </tr>
                  ) : (
                    filteredPublishers.map((publisher) => (
                      <tr key={publisher._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{publisher.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{publisher.email}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-red-600">
                            ${publisher.pendingPayout.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {publisher.pendingEarnings > 0 ? (
                            <span className="font-semibold text-amber-600">
                              ${publisher.pendingEarnings.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-900">
                            ${(publisher.pendingPayout + publisher.pendingEarnings).toFixed(2)}
                          </span>
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
