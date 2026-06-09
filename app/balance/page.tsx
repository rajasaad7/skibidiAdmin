'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, User, AlertCircle, RotateCcw, ShoppingCart, Plus, Trash2, Check, X, Pencil } from 'lucide-react';

interface BuyerBalance {
  _id: string;
  fullName: string;
  email: string;
  balance: number;
  totalAdded: number;
  totalSpent: number;
  totalRefunded: number;
  unclaimedRefunds: number;
  activeOrders: number;
  totalBalance: number;
  updatedAt: string | null;
}

interface BalanceStats {
  totalBalance: number;
  totalAdded: number;
  totalSpent: number;
  totalUnclaimedRefunds: number;
  activeOrdersBalance: number;
  activeOrdersCount: number;
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

interface AccountBalanceRow {
  _id: string;
  platform: string;
  amount: number;
}

interface SurplusSummary {
  buyerBalance: number;
  publisherBalance: number;
  totalOwed: number;
  totalInAccount: number;
  net: number;
}

export default function BalancePage() {
  const [tab, setTab] = useState<'buyers' | 'publishers' | 'surplus'>('buyers');
  const [search, setSearch] = useState('');

  // Buyers state
  const [buyers, setBuyers] = useState<BuyerBalance[]>([]);
  const [buyerStats, setBuyerStats] = useState<BalanceStats>({
    totalBalance: 0,
    totalAdded: 0,
    totalSpent: 0,
    totalUnclaimedRefunds: 0,
    activeOrdersBalance: 0,
    activeOrdersCount: 0,
    buyersCount: 0,
  });
  const [buyersLoading, setBuyersLoading] = useState(true);

  // Publishers state
  const [publishers, setPublishers] = useState<PublisherEarnings[]>([]);
  const [publishersLoading, setPublishersLoading] = useState(true);

  // Surplus state
  const [surplusSummary, setSurplusSummary] = useState<SurplusSummary>({
    buyerBalance: 0,
    publisherBalance: 0,
    totalOwed: 0,
    totalInAccount: 0,
    net: 0,
  });
  const [surplusRows, setSurplusRows] = useState<AccountBalanceRow[]>([]);
  const [surplusLoading, setSurplusLoading] = useState(true);
  const [savingRow, setSavingRow] = useState(false);
  // Add-account modal inputs
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [newAmount, setNewAmount] = useState('');
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlatform, setEditPlatform] = useState('');
  const [editAmount, setEditAmount] = useState('');

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

  const fetchSurplus = async () => {
    setSurplusLoading(true);
    try {
      const response = await fetch('/api/balance/surplus');
      const data = await response.json();
      if (data.success) {
        setSurplusSummary(data.summary);
        setSurplusRows(data.rows);
      }
    } catch (error) {
      console.error('Error fetching surplus data:', error);
    } finally {
      setSurplusLoading(false);
    }
  };

  const addRow = async () => {
    if (!newPlatform.trim() || savingRow) return;
    setSavingRow(true);
    try {
      const response = await fetch('/api/balance/surplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: newPlatform.trim(), amount: Number(newAmount || 0) }),
      });
      const data = await response.json();
      if (data.success) {
        setNewPlatform('');
        setNewAmount('');
        setAddModalOpen(false);
        await fetchSurplus();
      }
    } catch (error) {
      console.error('Error adding row:', error);
    } finally {
      setSavingRow(false);
    }
  };

  const startEdit = (row: AccountBalanceRow) => {
    setEditingId(row._id);
    setEditPlatform(row.platform);
    setEditAmount(String(row.amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPlatform('');
    setEditAmount('');
  };

  const saveEdit = async (id: string) => {
    if (savingRow) return;
    setSavingRow(true);
    try {
      const response = await fetch('/api/balance/surplus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, platform: editPlatform.trim(), amount: Number(editAmount || 0) }),
      });
      const data = await response.json();
      if (data.success) {
        cancelEdit();
        await fetchSurplus();
      }
    } catch (error) {
      console.error('Error saving row:', error);
    } finally {
      setSavingRow(false);
    }
  };

  const deleteRow = async (id: string) => {
    if (savingRow) return;
    setSavingRow(true);
    try {
      const response = await fetch(`/api/balance/surplus?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) await fetchSurplus();
    } catch (error) {
      console.error('Error deleting row:', error);
    } finally {
      setSavingRow(false);
    }
  };

  useEffect(() => {
    if (tab === 'buyers') {
      fetchBuyers();
    } else if (tab === 'publishers') {
      fetchPublishers();
    } else {
      fetchSurplus();
    }
  }, [tab]);

  const matchesSearch = (name: string, email: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (name || '').toLowerCase().includes(q) || (email || '').toLowerCase().includes(q);
  };

  const filteredBuyers = buyers.filter((b) => matchesSearch(b.fullName, b.email));

  // Largest account by amount, for the "Money We Hold" card breakdown.
  const topAccount = surplusRows.length
    ? surplusRows.reduce((max, r) => (Number(r.amount) > Number(max.amount) ? r : max))
    : null;

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
          <button
            onClick={() => setTab('surplus')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              tab === 'surplus'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Surplus
          </button>
        </div>
      </div>

      {tab === 'buyers' ? (
        <>
          {/* Buyer Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(buyerStats.totalBalance + buyerStats.totalUnclaimedRefunds + buyerStats.activeOrdersBalance).toFixed(2)}
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
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Active Orders Balance</p>
                  <p className="text-2xl font-bold text-gray-900">${buyerStats.activeOrdersBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{buyerStats.activeOrdersCount} in progress</p>
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
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Active Orders</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredBuyers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                          {buyer.activeOrders > 0 ? (
                            <span className="font-semibold text-indigo-600">${buyer.activeOrders.toFixed(2)}</span>
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
      ) : tab === 'publishers' ? (
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
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredPublishers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
      ) : (
        <>
          {/* Surplus / reconciliation */}
          {/* Reconciliation summary — what we owe vs what we hold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {/* Owed side */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Money We Owe</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Buyer balance</span>
                  <span className="font-medium text-gray-900">${surplusSummary.buyerBalance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Publisher balance</span>
                  <span className="font-medium text-gray-900">${surplusSummary.publisherBalance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Total owed</span>
                  <span className="text-lg font-bold text-red-600">${surplusSummary.totalOwed.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Hold side */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Money We Hold</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Accounts tracked</span>
                  <span className="font-medium text-gray-900">{surplusRows.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Largest account</span>
                  <span className="font-medium text-gray-900">
                    {topAccount ? `${topAccount.platform} · $${Number(topAccount.amount).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Total in account</span>
                  <span className="text-lg font-bold text-blue-600">${surplusSummary.totalInAccount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Net */}
            <div className={`rounded-xl p-5 border ${surplusSummary.net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${surplusSummary.net >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-4 h-4 ${surplusSummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <p className="text-sm font-semibold text-gray-900">Net Position</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total in account</span>
                  <span className="font-medium text-gray-900">${surplusSummary.totalInAccount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total owed</span>
                  <span className="font-medium text-gray-900">− ${surplusSummary.totalOwed.toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between pt-2.5 border-t ${surplusSummary.net >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                  <span className="text-sm font-semibold text-gray-900">
                    {surplusSummary.net >= 0 ? 'Surplus' : 'Shortfall'}
                  </span>
                  <span className={`text-lg font-bold ${surplusSummary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {surplusSummary.net < 0 ? '-' : ''}${Math.abs(surplusSummary.net).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Accounts table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Bank &amp; Platform Accounts</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manually track the cash you hold in each account.</p>
              </div>
              <button
                onClick={() => {
                  setNewPlatform('');
                  setNewAmount('');
                  setAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Platform</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {surplusLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : surplusRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        No accounts yet. Click &quot;Add Account&quot; to start tracking your balances.
                      </td>
                    </tr>
                  ) : (
                    surplusRows.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50">
                        {editingId === row._id ? (
                          <>
                            <td className="px-6 py-3">
                              <input
                                type="text"
                                value={editPlatform}
                                onChange={(e) => setEditPlatform(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(row._id)}
                                className="w-full px-3 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => saveEdit(row._id)}
                                  disabled={savingRow}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 font-medium text-gray-900">{row.platform}</td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                              ${Number(row.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startEdit(row)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteRow(row._id)}
                                  disabled={savingRow}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {!surplusLoading && surplusRows.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-6 py-4 font-bold text-gray-900">Total</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ${surplusSummary.totalInAccount.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Add Account modal */}
          {addModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Add Account</h3>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
                    <input
                      type="text"
                      autoFocus
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      placeholder="e.g. ENBD, PayPal, Stripe"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addRow()}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addRow}
                    disabled={savingRow || !newPlatform.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Add Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
