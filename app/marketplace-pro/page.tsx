'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Crown, RefreshCw, Search, Plus, X, ShieldAlert, Ban, ScrollText,
  RotateCw, ExternalLink, ChevronDown, TrendingUp,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface ProSubscription {
  _id: string;
  userId: string;
  source: string;
  status: string;
  dodoSubscriptionId: string | null;
  dodoCustomerId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  graceUntil: string | null;
  revokedBy: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  userFullName: string | null;
  isSuspended: boolean;
  weeklyManualUnlocks: number;
  // Status the entitlement resolver actually applies: 'expired' when the
  // period/grace wall has passed even if the stored status still says active.
  effectiveStatus: string;
  // Monitoring plan on the org this user owns (null if they own no workspace).
  monitoringPlan: { name: string; provider: string | null; grantUntil: string | null } | null;
}

interface ProEvent {
  _id: string;
  userId: string;
  dodoSubscriptionId: string | null;
  provider: string | null;
  providerEventId: string | null;
  providerEventAt: string | null;
  eventType: string;
  payloadSummary: Record<string, unknown> | null;
  processingStatus: string | null;
  createdAt: string;
}

const STATUSES = ['active', 'past_due', 'cancelled', 'expired', 'revoked'];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  past_due: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-500',
  revoked: 'bg-red-50 text-red-700',
};

const SOURCE_STYLES: Record<string, string> = {
  dodo: 'bg-blue-50 text-blue-700',
  promo: 'bg-purple-50 text-purple-700',
  admin: 'bg-indigo-50 text-indigo-700',
  wallet: 'bg-teal-50 text-teal-700',
};

function fmt(d: string | null) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_STYLES[source] || 'bg-gray-100 text-gray-600'}`}>
      {source}
    </span>
  );
}

export default function MarketplaceProPage() {
  const [subscriptions, setSubscriptions] = useState<ProSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'subscriptions' | 'abuse'>('subscriptions');

  // Grant modal
  const [showGrant, setShowGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: '', source: 'promo', until: '' });
  const [granting, setGranting] = useState(false);

  // Monitoring plan grant modal (same flow, but grants a monitoring PLAN to the
  // user's owned org via /api/plan-grants; auto-reverts to Free after the date)
  const [showPlanGrant, setShowPlanGrant] = useState(false);
  const [planGrantForm, setPlanGrantForm] = useState({ userId: '', planPaddleId: '', until: '' });
  const [planGranting, setPlanGranting] = useState(false);
  const [planOptions, setPlanOptions] = useState<{ paddleId: string; displayName: string; price: number; type: string }[]>([]);

  const openPlanGrant = async () => {
    setShowPlanGrant(true);
    if (!planOptions.length) {
      try {
        const res = await fetch('/api/plan-grants');
        const json = await res.json();
        if (res.ok && Array.isArray(json.plans)) setPlanOptions(json.plans);
      } catch {
        // The select shows a loading placeholder; submit will surface errors
      }
    }
  };

  const submitPlanGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanGranting(true);
    try {
      const res = await fetch('/api/plan-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planGrantForm),
      });
      const json = await res.json();
      if (res.ok) {
        const who = json.userEmail ? `${json.planName} granted to ${json.userEmail}` : 'Plan granted';
        toast.success(json.emailSent ? `${who} · notification email sent` : `${who} · email NOT sent`);
        setShowPlanGrant(false);
        setPlanGrantForm({ userId: '', planPaddleId: '', until: '' });
      } else {
        toast.error(json.error || 'Plan grant failed');
      }
    } catch {
      toast.error('Plan grant failed');
    } finally {
      setPlanGranting(false);
    }
  };

  // Revoke modal
  const [revokeTarget, setRevokeTarget] = useState<ProSubscription | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Events panel
  const [eventsTarget, setEventsTarget] = useState<ProSubscription | null>(null);
  const [events, setEvents] = useState<ProEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const fetchSubscriptions = async (searchValue = search, statusValue = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) params.set('search', searchValue.trim());
      if (statusValue) params.set('status', statusValue);
      const res = await fetch(`/api/marketplace-pro?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setSubscriptions(json.subscriptions || []);
      else toast.error(json.error || 'Failed to load subscriptions');
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubscriptions();
  };

  const submitGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGranting(true);
    try {
      const res = await fetch('/api/marketplace-pro/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grantForm),
      });
      const json = await res.json();
      if (res.ok) {
        const who = json.userEmail ? `Pro granted to ${json.userEmail}` : 'Pro granted';
        toast.success(json.emailSent ? `${who} · notification email sent` : `${who} · email NOT sent`);
        setShowGrant(false);
        setGrantForm({ userId: '', source: 'promo', until: '' });
        fetchSubscriptions();
      } else {
        toast.error(json.error || 'Grant failed');
      }
    } catch {
      toast.error('Grant failed');
    } finally {
      setGranting(false);
    }
  };

  const submitRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch('/api/marketplace-pro/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: revokeTarget._id, reason: revokeReason }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Subscription revoked');
        setRevokeTarget(null);
        setRevokeReason('');
        fetchSubscriptions();
      } else {
        toast.error(json.error || 'Revoke failed');
      }
    } catch {
      toast.error('Revoke failed');
    } finally {
      setRevoking(false);
    }
  };

  const resync = async (sub: ProSubscription) => {
    setResyncingId(sub._id);
    try {
      const body = sub.dodoSubscriptionId
        ? { dodoSubscriptionId: sub.dodoSubscriptionId }
        : { userId: sub.userId };
      const res = await fetch('/api/marketplace-pro/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Synced from Dodo: ${json.remoteStatus} (local: ${json.status})`);
        fetchSubscriptions();
      } else {
        toast.error(json.error || 'Resync failed');
      }
    } catch {
      toast.error('Resync failed');
    } finally {
      setResyncingId(null);
    }
  };

  const openEvents = async (sub: ProSubscription) => {
    setEventsTarget(sub);
    setEvents([]);
    setEventsLoading(true);
    try {
      const res = await fetch(`/api/marketplace-pro/events?userId=${encodeURIComponent(sub.userId)}`);
      const json = await res.json();
      if (res.ok) setEvents(json.events || []);
      else toast.error(json.error || 'Failed to load events');
    } catch {
      toast.error('Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  };

  const abuseRows = useMemo(
    () => [...subscriptions].sort((a, b) => b.weeklyManualUnlocks - a.weeklyManualUnlocks),
    [subscriptions]
  );

  const activeCount = subscriptions.filter((s) => (s.effectiveStatus || s.status) === 'active').length;
  const pastDueCount = subscriptions.filter((s) => (s.effectiveStatus || s.status) === 'past_due').length;
  const weeklyUnlockTotal = subscriptions.reduce((sum, s) => sum + s.weeklyManualUnlocks, 0);

  const unlockTone = (n: number) =>
    n >= 50 ? 'text-red-600 font-semibold' : n >= 20 ? 'text-amber-600 font-semibold' : 'text-gray-600';

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" /> Paid Plans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Marketplace Pro subscriptions and monitoring plan grants: grant, revoke, Dodo resyncs and unlock abuse signals.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchSubscriptions()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={openPlanGrant}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <TrendingUp className="w-4 h-4" /> Grant Plan
          </button>
          <button
            onClick={() => setShowGrant(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" /> Grant Pro
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Subscriptions</p>
          <p className="text-2xl font-semibold text-gray-900">{subscriptions.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Past Due</p>
          <p className="text-2xl font-semibold text-amber-600">{pastDueCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Manual Unlocks (7d)</p>
          <p className="text-2xl font-semibold text-gray-900">{weeklyUnlockTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('subscriptions')}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              tab === 'subscriptions' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setTab('abuse')}
            className={`px-4 py-1.5 text-sm rounded-md transition flex items-center gap-1.5 ${
              tab === 'abuse' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Abuse
          </button>
        </div>

        <form onSubmit={submitSearch} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            />
          </div>
          <button type="submit" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white">
            Search
          </button>
        </form>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {tab === 'abuse' && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-3 flex-wrap">
          <span>
            Sorted by manual domain unlocks in the last 7 days. Cross-reference heavy unlockers
            with device fingerprints before acting.
          </span>
          <Link href="/risk-control" className="inline-flex items-center gap-1 font-medium text-amber-900 hover:underline whitespace-nowrap">
            Open Risk Control <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && subscriptions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading...</div>
        ) : subscriptions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No Pro subscriptions match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Monitoring Plan</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Period End</th>
                  <th className="px-5 py-3 font-medium text-right">Unlocks (7d)</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'abuse' ? abuseRows : subscriptions).map((s) => (
                  <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {s.userFullName || 'Unknown user'}
                        {s.isSuspended && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{s.userEmail || s.userId}</div>
                    </td>
                    <td className="px-5 py-3">
                      {s.monitoringPlan ? (
                        <div>
                          <span className={s.monitoringPlan.name === 'Free' ? 'text-gray-500' : 'font-medium text-gray-900'}>
                            {s.monitoringPlan.name}
                          </span>
                          {s.monitoringPlan.provider === 'admin_grant' && s.monitoringPlan.grantUntil && (
                            <div className="text-[11px] text-gray-400">grant until {fmt(s.monitoringPlan.grantUntil)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No workspace</span>
                      )}
                    </td>
                    <td className="px-5 py-3"><SourceBadge source={s.source} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={s.effectiveStatus || s.status} />
                        {s.effectiveStatus === 'expired' && s.status !== 'expired' && (
                          <span className="text-[10px] text-gray-400">was {s.status}</span>
                        )}
                        {s.cancelAtPeriodEnd && (s.effectiveStatus || s.status) === 'active' && (
                          <span className="text-[10px] text-gray-400">ends at period end</span>
                        )}
                      </div>
                      {s.status === 'revoked' && s.revokedReason && (
                        <div className="text-[11px] text-gray-400 mt-0.5 max-w-[220px] truncate" title={s.revokedReason}>
                          {s.revokedBy}: {s.revokedReason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{fmt(s.currentPeriodEnd)}</td>
                    <td className={`px-5 py-3 text-right ${unlockTone(s.weeklyManualUnlocks)}`}>
                      {s.weeklyManualUnlocks}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEvents(s)}
                          title="View event log"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                        {s.source === 'dodo' && (
                          <button
                            onClick={() => resync(s)}
                            disabled={resyncingId === s._id}
                            title="Resync from Dodo"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-50"
                          >
                            <RotateCw className={`w-4 h-4 ${resyncingId === s._id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {['active', 'past_due', 'cancelled'].includes(s.status) && (
                          <button
                            onClick={() => { setRevokeTarget(s); setRevokeReason(''); }}
                            title="Revoke Pro"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant modal */}
      {showGrant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowGrant(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" /> Grant Marketplace Pro
              </h2>
              <button onClick={() => setShowGrant(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">User email or ID</label>
                <input
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="user@example.com or users._id"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Source</label>
                  <div className="relative">
                    <select
                      value={grantForm.source}
                      onChange={(e) => setGrantForm({ ...grantForm, source: e.target.value })}
                      className="appearance-none w-full pl-3.5 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white cursor-pointer"
                    >
                      <option value="promo">promo</option>
                      <option value="admin">admin</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Until</label>
                  <input
                    type="date"
                    value={grantForm.until}
                    onChange={(e) => setGrantForm({ ...grantForm, until: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Pro access lasts through the chosen day (UTC). The grant is recorded with your admin email.
              </p>

              <button
                type="submit"
                disabled={granting}
                className="w-full bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
              >
                {granting ? 'Granting...' : 'Grant Pro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Monitoring plan grant modal */}
      {showPlanGrant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPlanGrant(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Grant Monitoring Plan
              </h2>
              <button onClick={() => setShowPlanGrant(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPlanGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">User email or ID</label>
                <input
                  value={planGrantForm.userId}
                  onChange={(e) => setPlanGrantForm({ ...planGrantForm, userId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="user@example.com or users._id"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Plan</label>
                <div className="relative">
                  <select
                    value={planGrantForm.planPaddleId}
                    onChange={(e) => setPlanGrantForm({ ...planGrantForm, planPaddleId: e.target.value })}
                    required
                    className="appearance-none w-full pl-3.5 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                  >
                    <option value="" disabled>{planOptions.length ? 'Choose a plan' : 'Loading plans...'}</option>
                    {planOptions.map((p) => (
                      <option key={p.paddleId} value={p.paddleId}>
                        {p.displayName} · ${p.price}/{p.type === 'monthly' ? 'mo' : 'yr'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Until</label>
                <input
                  type="date"
                  value={planGrantForm.until}
                  onChange={(e) => setPlanGrantForm({ ...planGrantForm, until: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                The user&apos;s workspace runs on this plan through the chosen day (UTC), then automatically
                returns to Free. Marketplace Pro is included while it is active. The user gets a
                notification email, and users with a live paid subscription cannot be granted over.
              </p>

              <button
                type="submit"
                disabled={planGranting}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {planGranting ? 'Granting...' : 'Grant Plan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Revoke modal */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRevokeTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" /> Revoke Pro
              </h2>
              <button onClick={() => setRevokeTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Revoking Pro for <span className="font-medium text-gray-900">{revokeTarget.userEmail || revokeTarget.userId}</span>.
              Access is removed immediately and the reason is stored on the subscription.
            </p>

            <form onSubmit={submitRevoke} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason (required)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  placeholder="e.g. refund issued, abuse of manual unlocks"
                />
              </div>
              <button
                type="submit"
                disabled={revoking || !revokeReason.trim()}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {revoking ? 'Revoking...' : 'Revoke Pro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Events panel */}
      {eventsTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEventsTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-blue-600" /> Pro Event Log
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {eventsTarget.userEmail || eventsTarget.userId} · newest first, last 100
                </p>
              </div>
              <button onClick={() => setEventsTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              {eventsLoading ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No events recorded for this user.</div>
              ) : (
                <ul className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev._id} className="border border-gray-100 rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{ev.eventType}</span>
                          {ev.provider && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                              {ev.provider}
                            </span>
                          )}
                          {ev.processingStatus && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              ev.processingStatus === 'processed'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}>
                              {ev.processingStatus}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">{fmt(ev.providerEventAt || ev.createdAt)}</span>
                      </div>
                      {ev.providerEventId && (
                        <div className="text-[11px] text-gray-400 font-mono mt-1 truncate" title={ev.providerEventId}>
                          {ev.providerEventId}
                        </div>
                      )}
                      {ev.payloadSummary && Object.keys(ev.payloadSummary).length > 0 && (
                        <pre className="mt-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2.5 overflow-x-auto">
                          {JSON.stringify(ev.payloadSummary, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
