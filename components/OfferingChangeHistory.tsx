'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, History, AlertTriangle, CheckCircle, XCircle, Maximize2, Minimize2 } from 'lucide-react';

// Mirrors the entries written by the app's domains PUT route (src/lib/marketplace/offeringDiff.js)
export interface OfferingEditHistoryChange {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

export interface OfferingEditHistoryEntry {
  at: string;
  publisherId?: string;
  reviewed?: boolean;
  reviewedAt?: string;
  reviewOutcome?: 'approved' | 'rejected';
  changes: OfferingEditHistoryChange[];
}

// Legacy domain-level history (single overwritten object, pre 2026-09-09)
export interface LegacyDomainEditHistory {
  changes: string[];
  timestamp: string;
  publisherId: string;
}

interface Props {
  entries?: OfferingEditHistoryEntry[] | null;
  legacy?: LegacyDomainEditHistory | null;
  categoryNames?: Record<string, string>;
}

const MONEY_FIELDS = new Set(['guestPostPrice', 'linkInsertionPrice', 'contentWritingPrice']);
const LONG_TEXT_THRESHOLD = 90;
const LIST_PREVIEW_ITEMS = 2;

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function formatScalar(value: unknown, field: string, categoryNames?: Record<string, string>): string {
  if (isEmpty(value)) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field === 'categoryId' && typeof value === 'string') return categoryNames?.[value] || value;
  if (MONEY_FIELDS.has(field) && typeof value === 'number') return `$${value}`;
  return String(value);
}

function hasMore(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > LIST_PREVIEW_ITEMS;
  return typeof value === 'string' && value.length > LONG_TEXT_THRESHOLD;
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** One value cell: scalar, or a list/long text that can be enlarged when it has more data. */
function ValueCell({
  value,
  field,
  tone,
  expanded,
  otherList,
  categoryNames
}: {
  value: unknown;
  field: string;
  tone: 'from' | 'to';
  expanded: boolean;
  otherList?: unknown;
  categoryNames?: Record<string, string>;
}) {
  const base = tone === 'from' ? 'text-gray-600' : 'text-gray-900 font-medium';

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={`${base} italic`}>None</span>;
    const other = Array.isArray(otherList) ? new Set(otherList.map(String)) : new Set<string>();
    const items = expanded ? value : value.slice(0, LIST_PREVIEW_ITEMS);
    return (
      <div className="space-y-0.5">
        {items.map((item, i) => {
          const s = String(item);
          const diffMark = other.size > 0 && !other.has(s);
          const cls = diffMark
            ? tone === 'from'
              ? 'text-red-700 line-through decoration-red-400'
              : 'text-green-700'
            : base;
          return (
            <div key={i} className={`${cls} break-all leading-snug`}>
              {s}
            </div>
          );
        })}
        {!expanded && value.length > LIST_PREVIEW_ITEMS && (
          <div className="text-[11px] text-gray-400">+{value.length - LIST_PREVIEW_ITEMS} more</div>
        )}
      </div>
    );
  }

  const text = formatScalar(value, field, categoryNames);
  if (typeof value === 'string' && value.length > LONG_TEXT_THRESHOLD && !expanded) {
    return <span className={`${base} break-words`}>{text.slice(0, LONG_TEXT_THRESHOLD)}…</span>;
  }
  return <span className={`${base} whitespace-pre-wrap break-words`}>{text}</span>;
}

function ChangeRow({ change, categoryNames }: { change: OfferingEditHistoryChange; categoryNames?: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = hasMore(change.from) || hasMore(change.to);
  const isList = Array.isArray(change.from) || Array.isArray(change.to);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => expandable && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left ${expandable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
        aria-expanded={expandable ? expanded : undefined}
      >
        <span className="text-xs font-semibold text-gray-800">{change.label}</span>
        {expandable && (
          <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 flex-shrink-0">
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            {expanded ? 'Collapse' : 'Show all'}
          </span>
        )}
      </button>
      <div className={`grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-3 px-3 pb-2.5 text-sm ${expanded ? 'max-h-80 overflow-y-auto' : ''}`}>
        <div className="rounded-md bg-red-50/70 border border-red-100 px-2.5 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-red-500 mb-0.5">Before</div>
          <ValueCell value={change.from} field={change.field} tone="from" expanded={expanded} otherList={isList ? change.to : undefined} categoryNames={categoryNames} />
        </div>
        <div className="hidden md:flex items-center justify-center text-gray-400 text-xs">→</div>
        <div className="rounded-md bg-green-50/70 border border-green-100 px-2.5 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-green-600 mb-0.5">After</div>
          <ValueCell value={change.to} field={change.field} tone="to" expanded={expanded} otherList={isList ? change.from : undefined} categoryNames={categoryNames} />
        </div>
      </div>
    </div>
  );
}

function EntryBlock({ entry, categoryNames }: { entry: OfferingEditHistoryEntry; categoryNames?: Record<string, string> }) {
  const outcome = entry.reviewed ? entry.reviewOutcome : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span className="font-medium text-gray-700">Edited {formatDate(entry.at)}</span>
        {entry.publisherId && <span className="font-mono">publisher {entry.publisherId.substring(0, 8)}…</span>}
        <span>{entry.changes.length} field{entry.changes.length === 1 ? '' : 's'} changed</span>
        {outcome === 'approved' && (
          <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle className="w-3 h-3" /> approved {formatDate(entry.reviewedAt)}</span>
        )}
        {outcome === 'rejected' && (
          <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="w-3 h-3" /> rejected {formatDate(entry.reviewedAt)}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {entry.changes.map((c, i) => (
          <ChangeRow key={`${c.field}-${i}`} change={c} categoryNames={categoryNames} />
        ))}
      </div>
    </div>
  );
}

/**
 * Change history shown at the top of the admin offering modal.
 * - "Pending review" = entries the publisher made since the last admin decision (open by default).
 * - "Previously reviewed" = older entries, collapsed by default.
 * - Each change row enlarges on click when the value has more data (long text / long URL lists).
 */
export default function OfferingChangeHistory({ entries, legacy, categoryNames }: Props) {
  const list = Array.isArray(entries) ? entries.filter((e) => e && Array.isArray(e.changes) && e.changes.length > 0) : [];
  const pending = list.filter((e) => !e.reviewed);
  const reviewed = list.filter((e) => e.reviewed);

  const [pendingOpen, setPendingOpen] = useState(true);
  const [reviewedOpen, setReviewedOpen] = useState(false);

  if (list.length === 0) {
    if (!legacy || !Array.isArray(legacy.changes) || legacy.changes.length === 0) return null;
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs font-semibold text-blue-900 mb-1">Recent changes (legacy record)</div>
        <div className="text-sm text-blue-800">{legacy.changes.join(', ')}</div>
        <div className="text-xs text-blue-600 mt-1">
          Modified on {formatDate(legacy.timestamp)} by publisher {legacy.publisherId?.substring(0, 8)}…
        </div>
      </div>
    );
  }

  const pendingFieldCount = pending.reduce((n, e) => n + e.changes.length, 0);

  return (
    <div className="space-y-2">
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setPendingOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-amber-100/60"
            aria-expanded={pendingOpen}
          >
            <span className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-900">Changes awaiting review</span>
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-semibold">
                {pendingFieldCount} field{pendingFieldCount === 1 ? '' : 's'} · {pending.length} edit{pending.length === 1 ? '' : 's'}
              </span>
            </span>
            {pendingOpen ? <ChevronDown className="w-4 h-4 text-amber-700" /> : <ChevronRight className="w-4 h-4 text-amber-700" />}
          </button>
          {pendingOpen && (
            <div className="px-3 pb-3 space-y-3 max-h-[45vh] overflow-y-auto">
              <p className="text-[11px] text-amber-800">
                Compare each Before / After. Approving or rejecting this offering marks all of these as reviewed.
              </p>
              {pending.map((entry, i) => (
                <EntryBlock key={`${entry.at}-${i}`} entry={entry} categoryNames={categoryNames} />
              ))}
            </div>
          )}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setReviewedOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-100"
            aria-expanded={reviewedOpen}
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Previously reviewed changes</span>
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[11px] font-semibold">{reviewed.length}</span>
            </span>
            {reviewedOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          {reviewedOpen && (
            <div className="px-3 pb-3 space-y-3 max-h-[40vh] overflow-y-auto">
              {reviewed.map((entry, i) => (
                <EntryBlock key={`${entry.at}-${i}`} entry={entry} categoryNames={categoryNames} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
