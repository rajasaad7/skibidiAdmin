'use client';

import { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Users, Copy, Check, X, Link as LinkIcon,
  Power, KeyRound, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_AFFILIATE_BASE_URL || 'https://www.linkwatcher.io';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  utmSource: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  totalReferred: number;
  verifiedReferred: number;
  last30Days: number;
}

function fmt(d: string | null) {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // create form
  const [form, setForm] = useState({ name: '', email: '', utmSource: '', password: '', commissionRate: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAffiliates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates');
      const json = await res.json();
      if (json.success) setAffiliates(json.affiliates);
      else toast.error(json.error || 'Failed to load');
    } catch {
      toast.error('Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAffiliates(); }, []);

  const createAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, commissionRate: form.commissionRate || 0 }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.emailSent) toast.success('Affiliate created. Welcome email with login details sent.');
        else toast('Affiliate created, but the welcome email could not be sent. Share the login details manually.', { icon: '⚠️', duration: 6000 });
        setShowCreate(false);
        setForm({ name: '', email: '', utmSource: '', password: '', commissionRate: '' });
        fetchAffiliates();
      } else {
        toast.error(json.error || 'Failed to create');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: Affiliate) => {
    const res = await fetch('/api/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, isActive: !a.isActive }),
    });
    if (res.ok) {
      toast.success(a.isActive ? 'Affiliate disabled' : 'Affiliate enabled');
      fetchAffiliates();
    } else {
      toast.error('Update failed');
    }
  };

  const resetPassword = async (a: Affiliate) => {
    const password = window.prompt(`New password for ${a.name} (min 6 chars):`);
    if (!password) return;
    if (password.length < 6) { toast.error('Password too short'); return; }
    const res = await fetch('/api/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, password }),
    });
    if (res.ok) toast.success('Password reset. The affiliate will be asked to choose a new one on next login.');
    else toast.error('Reset failed');
  };

  const copyLink = async (a: Affiliate) => {
    const link = `${BASE_URL}/?utm_source=${encodeURIComponent(a.utmSource)}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(a.id);
    toast.success('Link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalReferred = affiliates.reduce((s, a) => s + a.totalReferred, 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Affiliates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage partners and track signups attributed via <span className="font-mono">utm_source</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAffiliates}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> New Affiliate
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Affiliates</p>
          <p className="text-2xl font-semibold text-gray-900">{affiliates.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-semibold text-gray-900">{affiliates.filter((a) => a.isActive).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Referred Users</p>
          <p className="text-2xl font-semibold text-gray-900">{totalReferred.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && affiliates.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : affiliates.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No affiliates yet. Create your first partner.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">utm_source</th>
                  <th className="px-5 py-3 font-medium text-right">Referred</th>
                  <th className="px-5 py-3 font-medium text-right">Verified</th>
                  <th className="px-5 py-3 font-medium text-right">30d</th>
                  <th className="px-5 py-3 font-medium text-right">Comm.</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!a.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-500">{a.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs px-2 py-1 bg-gray-100 rounded">{a.utmSource}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{a.totalReferred}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{a.verifiedReferred}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{a.last30Days}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{a.commissionRate}%</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{fmt(a.lastLoginAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copyLink(a)} title="Copy referral link"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-600">
                          {copiedId === a.id ? <Check className="w-4 h-4 text-emerald-600" /> : <LinkIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={() => resetPassword(a)} title="Reset password"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleActive(a)} title={a.isActive ? 'Disable' : 'Enable'}
                          className={`p-1.5 rounded-lg hover:bg-gray-100 ${a.isActive ? 'text-gray-500 hover:text-red-600' : 'text-emerald-600'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> New Affiliate
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createAffiliate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Partner name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email (login)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="partner@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">utm_source (attribution key)</label>
                <input value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value.replace(/\s/g, '') })} required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  placeholder="e.g. yash" />
                <p className="text-[11px] text-gray-400 mt-1">
                  Their link will be <span className="font-mono">?utm_source={form.utmSource || '...'}</span> — must be unique, no spaces.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="min 6 chars" />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Commission %</label>
                  <input type="number" min="0" step="0.1" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? 'Creating…' : 'Create Affiliate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
