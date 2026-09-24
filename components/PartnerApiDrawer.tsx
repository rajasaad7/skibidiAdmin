'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, KeyRound, ChevronDown, ChevronLeft, ChevronRight, ShieldAlert, ShoppingCart, Activity, Clock } from 'lucide-react';

// Side drawer with everything about one user's Partner API usage: grant
// status, keys (with 24h spend), orders placed through the API, and a
// filterable, paginated event log. Reads GET /api/users/api-access.

type ApiKey = {
  _id: string; name: string; keyPrefix: string; scopes: string[]; ipAllowlist: string[];
  dailySpendCapUsd: number | string; maxOrderUsd: number | string; expiresAt: string | null;
  createdAt: string; lastUsedAt: string | null; lastUsedIp: string | null; revokedAt: string | null; revokedBy: string | null;
  spend24h: number;
};
type ApiEvent = { _id: string; keyId: string | null; type: string; ip: string | null; detail: any; createdAt: string };
type ApiOrder = { _id: string; orderNumber: string; status: string; totalPrice: number | string; createdAt: string; paidAt: string | null; completedAt: string | null; metadata: any; domains?: { domainName?: string } | null };
type Payload = {
  enabled: boolean; grantedAt: string | null; grantedBy: string | null; keys: ApiKey[];
  stats: { activeKeys: number; revokedKeys: number; apiOrders: number; spend24h: number; spendTotal: number; lastUsedAt: string | null };
  orders: ApiOrder[]; events: ApiEvent[]; eventsPagination: { page: number; limit: number; total: number; totalPages: number }; eventTypes: string[];
};

const EVENT_LABELS: Record<string, string> = {
  'key.created': 'Key created',
  'key.revoked': 'Key revoked',
  'auth.ip_rejected': 'Blocked: IP not in allowlist',
  'auth.scope_rejected': 'Blocked: missing scope',
  'auth.expired': 'Blocked: key expired',
  'order.placed': 'Order placed',
  'order.cap_hit': 'Order blocked by spend cap',
  'admin.enabled': 'API access enabled (admin)',
  'admin.disabled': 'API access disabled (admin)',
};
const EVENT_TONE: Record<string, string> = {
  'auth.ip_rejected': 'bg-red-100 text-red-800',
  'auth.scope_rejected': 'bg-red-100 text-red-800',
  'auth.expired': 'bg-orange-100 text-orange-800',
  'order.cap_hit': 'bg-orange-100 text-orange-800',
  'order.placed': 'bg-green-100 text-green-800',
  'key.created': 'bg-blue-100 text-blue-800',
  'key.revoked': 'bg-gray-200 text-gray-800',
  'admin.enabled': 'bg-blue-100 text-blue-800',
  'admin.disabled': 'bg-gray-200 text-gray-800',
};
const ORDER_TONE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800', paid: 'bg-blue-100 text-blue-800', accepted: 'bg-blue-100 text-blue-800',
  submitted: 'bg-purple-100 text-purple-800', revision_requested: 'bg-orange-100 text-orange-800',
  clarification_requested: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-200 text-gray-800', cancelled: 'bg-red-100 text-red-800', disputed: 'bg-rose-100 text-rose-800',
};

const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : 'Never');
const money = (v: number | string | null | undefined) => `$${(Number(v) || 0).toFixed(2)}`;

function StyledSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full pl-3 pr-9 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function KeyStatus({ k }: { k: ApiKey }) {
  if (k.revokedAt) return <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-red-100 text-red-800">Revoked</span>;
  if (k.expiresAt && new Date(k.expiresAt) < new Date()) return <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-orange-100 text-orange-800">Expired</span>;
  return <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-green-100 text-green-800">Active</span>;
}

export default function PartnerApiDrawer({ userId, userName, open, onClose }: { userId: string; userName: string; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'keys' | 'orders' | 'events'>('overview');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventKey, setEventKey] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventPage, setEventPage] = useState(1);
  const [eventLimit, setEventLimit] = useState('25');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ userId, page: String(eventPage), limit: eventLimit });
      if (eventKey) qs.set('keyId', eventKey);
      if (eventType) qs.set('type', eventType);
      const res = await fetch(`/api/users/api-access?${qs.toString()}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (error) {
      console.error('Error loading partner API details:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, eventPage, eventLimit, eventKey, eventType]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const keyName = (id: string | null) => (id ? data?.keys.find((k) => k._id === id)?.name || 'deleted key' : null);
  const stats = data?.stats;

  const tabs: Array<{ id: typeof tab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'keys', label: 'Keys', count: data?.keys.length },
    { id: 'orders', label: 'API orders', count: stats?.apiOrders },
    { id: 'events', label: 'Events', count: data?.eventsPagination.total },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <aside data-testid="partner-api-drawer" className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><KeyRound className="w-5 h-5 text-blue-600" /> Partner API · {userName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {data ? (data.enabled
                ? `Enabled ${data.grantedAt ? new Date(data.grantedAt).toLocaleDateString() : ''}${data.grantedBy ? ` by ${data.grantedBy}` : ''}`
                : 'Not enabled') : 'Loading...'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {t.label}{t.count != null ? <span className="ml-1.5 text-xs text-gray-400">{t.count}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!data ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : tab === 'overview' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Active keys', value: String(stats?.activeKeys ?? 0), icon: KeyRound },
                  { label: 'API orders', value: String(stats?.apiOrders ?? 0), icon: ShoppingCart },
                  { label: 'Spend last 24h', value: money(stats?.spend24h), icon: Clock },
                  { label: 'Spend total', value: money(stats?.spendTotal), icon: Activity },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><tile.icon className="w-3.5 h-3.5" /> {tile.label}</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{tile.value}</div>
                  </div>
                ))}
              </div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-gray-500">Status</dt><dd className="text-gray-900 font-medium">{data.enabled ? 'Enabled' : 'Not enabled'}</dd>
                <dt className="text-gray-500">Granted</dt><dd className="text-gray-900">{data.grantedAt ? `${fmt(data.grantedAt)} by ${data.grantedBy || 'unknown'}` : 'Never'}</dd>
                <dt className="text-gray-500">Revoked keys</dt><dd className="text-gray-900">{stats?.revokedKeys ?? 0}</dd>
                <dt className="text-gray-500">Last API use</dt><dd className="text-gray-900">{fmt(stats?.lastUsedAt)}</dd>
              </dl>
              {data.keys.some((k) => !k.revokedAt && (!k.ipAllowlist || k.ipAllowlist.length === 0) && k.scopes?.includes('orders:write')) && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>This user has an active key that can place orders without an IP allowlist. Consider asking them to restrict it.</span>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Latest events</h4>
                <ul className="divide-y text-sm">
                  {data.events.slice(0, 6).map((ev) => (
                    <li key={ev._id} className="py-2 flex justify-between gap-3">
                      <span><span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md mr-2 ${EVENT_TONE[ev.type] || 'bg-gray-100 text-gray-700'}`}>{EVENT_LABELS[ev.type] || ev.type}</span>{keyName(ev.keyId) ? <span className="text-gray-500">{keyName(ev.keyId)}</span> : null}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(ev.createdAt)}</span>
                    </li>
                  ))}
                  {data.events.length === 0 && <li className="py-2 text-gray-500">No events yet.</li>}
                </ul>
              </div>
            </div>
          ) : tab === 'keys' ? (
            data.keys.length === 0 ? <p className="text-sm text-gray-500">No API keys created.</p> : (
              <div className="space-y-3">
                {data.keys.map((k) => (
                  <div key={k._id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{k.name}</div>
                        <div className="font-mono text-xs text-gray-500">{k.keyPrefix}...</div>
                      </div>
                      <KeyStatus k={k} />
                    </div>
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                      <dt className="text-gray-500">Scopes</dt><dd className="md:col-span-2 font-mono text-gray-800">{(k.scopes || []).join(', ')}</dd>
                      <dt className="text-gray-500">Caps</dt><dd className="md:col-span-2 text-gray-800">{money(k.maxOrderUsd)} per order, {money(k.dailySpendCapUsd)} per 24h</dd>
                      <dt className="text-gray-500">Spend last 24h</dt><dd className="md:col-span-2 text-gray-800">{money(k.spend24h)}</dd>
                      <dt className="text-gray-500">IP allowlist</dt><dd className="md:col-span-2 text-gray-800">{k.ipAllowlist?.length ? k.ipAllowlist.join(', ') : <span className="text-amber-600">Any IP</span>}</dd>
                      <dt className="text-gray-500">Created</dt><dd className="md:col-span-2 text-gray-800">{fmt(k.createdAt)}</dd>
                      <dt className="text-gray-500">Expires</dt><dd className="md:col-span-2 text-gray-800">{k.expiresAt ? fmt(k.expiresAt) : 'Never'}</dd>
                      <dt className="text-gray-500">Last used</dt><dd className="md:col-span-2 text-gray-800">{fmt(k.lastUsedAt)}{k.lastUsedIp ? ` from ${k.lastUsedIp}` : ''}</dd>
                      {k.revokedAt && (<><dt className="text-gray-500">Revoked</dt><dd className="md:col-span-2 text-gray-800">{fmt(k.revokedAt)} by {k.revokedBy || 'unknown'}</dd></>)}
                    </dl>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'orders' ? (
            data.orders.length === 0 ? <p className="text-sm text-gray-500">No orders placed through the API.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4 font-medium">Order</th>
                      <th className="py-2 pr-4 font-medium">Domain</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Total</th>
                      <th className="py-2 pr-4 font-medium">Key</th>
                      <th className="py-2 pr-4 font-medium">Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o._id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-900 whitespace-nowrap">{o.orderNumber}</td>
                        <td className="py-2 pr-4 text-gray-800">{o.domains?.domainName || '-'}</td>
                        <td className="py-2 pr-4"><span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md ${ORDER_TONE[o.status] || 'bg-gray-100 text-gray-700'}`}>{o.status.replace(/_/g, ' ')}</span></td>
                        <td className="py-2 pr-4 text-gray-800 whitespace-nowrap">{money(o.totalPrice)}</td>
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{keyName(o.metadata?.apiKeyId) || '-'}</td>
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmt(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.orders.length >= 50 && <p className="text-xs text-gray-400 mt-2">Showing the latest 50. Use the Orders page for the full list.</p>}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StyledSelect value={eventKey} onChange={(v) => { setEventPage(1); setEventKey(v); }}>
                  <option value="">All keys</option>
                  <option value="__account__">Account events (no key)</option>
                  {data.keys.map((k) => <option key={k._id} value={k._id}>{k.name}{k.revokedAt ? ' (revoked)' : ''}</option>)}
                </StyledSelect>
                <StyledSelect value={eventType} onChange={(v) => { setEventPage(1); setEventType(v); }}>
                  <option value="">All event types</option>
                  {data.eventTypes.map((t) => <option key={t} value={t}>{EVENT_LABELS[t] || t}</option>)}
                </StyledSelect>
                <StyledSelect value={eventLimit} onChange={(v) => { setEventPage(1); setEventLimit(v); }}>
                  {['10', '25', '50', '100'].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </StyledSelect>
              </div>
              {loading ? <p className="text-sm text-gray-500">Loading...</p> : data.events.length === 0 ? (
                <p className="text-sm text-gray-500">No events match.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {data.events.map((ev) => (
                    <li key={ev._id} className="py-2.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md mr-2 ${EVENT_TONE[ev.type] || 'bg-gray-100 text-gray-700'}`}>{EVENT_LABELS[ev.type] || ev.type}</span>
                        {keyName(ev.keyId) ? <span className="text-gray-700">{keyName(ev.keyId)}</span> : <span className="text-gray-400">account</span>}
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {ev.detail?.orderNumber && <span>order {ev.detail.orderNumber}</span>}
                          {ev.detail?.scope && <span>scope {ev.detail.scope}</span>}
                          {ev.detail?.kind && <span>{ev.detail.kind === 'daily' ? '24h cap' : 'per-order cap'}</span>}
                          {ev.detail?.totalPrice != null && <span>{money(ev.detail.totalPrice)}</span>}
                          {ev.detail?.by && <span>by {ev.detail.by}</span>}
                          {ev.detail?.revokedKeys != null && <span>{ev.detail.revokedKeys} key(s) revoked</span>}
                          {ev.detail?.name && ev.type === 'key.created' && <span>scopes {(ev.detail.scopes || []).join(', ')}</span>}
                          {ev.detail?.ipAllowlist?.length ? <span>allowlist {ev.detail.ipAllowlist.join(', ')}</span> : null}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(ev.createdAt)}{ev.ip ? ` · ${ev.ip}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
              {data.eventsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
                  <span>Page {data.eventsPagination.page} of {data.eventsPagination.totalPages} · {data.eventsPagination.total} events</span>
                  <div className="flex gap-2">
                    <button disabled={loading || eventPage <= 1} onClick={() => setEventPage((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /> Prev</button>
                    <button disabled={loading || eventPage >= data.eventsPagination.totalPages} onClick={() => setEventPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next <ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
