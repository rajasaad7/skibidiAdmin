'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BadgeCheck, RefreshCw, Eye, ExternalLink, CheckCircle, Clock, Hourglass, X, FileText, Plus } from 'lucide-react';

interface KycUser {
  _id: string;
  email: string;
  fullName: string;
}

interface KycFile {
  _id: string;
  label: string | null;
  fileName: string | null;
  mimeType: string | null;
  round: number;
  createdAt: string;
  url: string | null;
}

interface KycTask {
  _id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  taskType: string;
  submittedCountry: string | null;
  submittedDocType: string | null;
  submittedDocNumber: string | null;
  submittedAddress: string | null;
  submittedAt: string | null;
  createdAt: string;
  reviewNote: string | null;
  user: KycUser | null;
  files: KycFile[];
}

const TEMPLATES = [
  { id: 'basic_kyc', label: 'Basic KYC (ID verification)' },
  { id: 'proof_of_address', label: 'Proof of Address' },
];

const STATUS_LABEL: Record<string, string> = {
  in_review: 'In Review',
  active: 'Awaiting Submission',
  completed: 'Approved',
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_review: 'bg-amber-50 text-amber-700',
    active: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function KycCheckPage() {
  const [tasks, setTasks] = useState<KycTask[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ in_review: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('in_review');
  const [selected, setSelected] = useState<KycTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  // Initiate-KYC modal state
  const [creating, setCreating] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createTemplate, setCreateTemplate] = useState('basic_kyc');
  const [createBusy, setCreateBusy] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kyc-check?status=${filter}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setCounts(data.counts || {});
      }
    } catch (e) {
      console.error('Error fetching KYC submissions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  const updateStatus = async (taskId: string, status: 'completed' | 'active') => {
    try {
      setSaving(true);
      const res = await fetch('/api/kyc-check/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, reviewNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Update failed');
      toast.success(status === 'completed' ? 'KYC approved' : 'Sent back to publisher');
      setSelected(null);
      setReviewNote('');
      fetchTasks();
    } catch (e: any) {
      toast.error(e.message || 'Could not update');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (t: KycTask) => {
    setSelected(t);
    setReviewNote(t.reviewNote || '');
  };

  const createTask = async () => {
    if (!createEmail.trim()) {
      toast.error('Enter the user email.');
      return;
    }
    try {
      setCreateBusy(true);
      const res = await fetch('/api/kyc-check/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createEmail.trim(), taskType: createTemplate }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not create task');
      toast.success(`KYC task created for ${data.task.user?.email || createEmail}`);
      setCreating(false);
      setCreateEmail('');
      setCreateTemplate('basic_kyc');
      fetchTasks();
    } catch (e: any) {
      toast.error(e.message || 'Could not create task');
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-7 h-7 text-blue-600" />
          <h1 className="text-lg md:text-3xl font-bold text-gray-900">KYC Check</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            Initiate KYC
          </button>
          <button
            onClick={fetchTasks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">In Review</div>
            <Hourglass className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.in_review || 0}</div>
          <div className="text-sm text-gray-600">awaiting your approval</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Awaiting Submission</div>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.active || 0}</div>
          <div className="text-sm text-gray-600">publisher action needed</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Approved</div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.completed || 0}</div>
          <div className="text-sm text-gray-600">verified publishers</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['in_review', 'active', 'completed', 'all'].map((status) => (
          <button
            key={`filter-${status}`}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status === 'in_review' ? 'In Review' : status === 'active' ? 'Awaiting Submission' : status === 'completed' ? 'Approved' : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Publisher</th>
                <th className="px-6 py-3">Document</th>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Submitted</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No KYC submissions in this view.</td></tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50 text-sm">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{t.user?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{t.user?.email || t.userId}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {t.submittedDocType ? t.submittedDocType.replace(/_/g, ' ') : '--'}
                      {t.submittedDocNumber && <div className="text-xs text-gray-500">{t.submittedDocNumber}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{t.submittedCountry || '--'}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {t.submittedAt ? format(new Date(t.submittedAt), 'MMM d, yyyy h:mm a') : '--'}
                    </td>
                    <td className="px-6 py-4"><StatusPill status={t.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">KYC Submission</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Publisher */}
              <div>
                <div className="text-sm font-semibold text-gray-900">{selected.user?.fullName || 'Unknown'}</div>
                <div className="text-sm text-gray-500">{selected.user?.email || selected.userId}</div>
                <div className="mt-1"><StatusPill status={selected.status} /></div>
              </div>

              {/* Task template + description */}
              <div className="text-sm">
                <div className="text-gray-500">Task</div>
                <div className="font-medium text-gray-900">{selected.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{TEMPLATES.find((t) => t.id === selected.taskType)?.label || selected.taskType}</div>
              </div>

              {/* Details grid (varies by template) */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selected.taskType === 'proof_of_address' ? (
                  <>
                    <div><div className="text-gray-500">Country</div><div className="font-medium text-gray-900">{selected.submittedCountry || '--'}</div></div>
                    <div className="col-span-2"><div className="text-gray-500">Address</div><div className="font-medium text-gray-900 whitespace-pre-line">{selected.submittedAddress || '--'}</div></div>
                  </>
                ) : (
                  <>
                    <div><div className="text-gray-500">Country</div><div className="font-medium text-gray-900">{selected.submittedCountry || '--'}</div></div>
                    <div><div className="text-gray-500">Document type</div><div className="font-medium text-gray-900 capitalize">{selected.submittedDocType?.replace(/_/g, ' ') || '--'}</div></div>
                    <div><div className="text-gray-500">Document number</div><div className="font-medium text-gray-900">{selected.submittedDocNumber || '--'}</div></div>
                  </>
                )}
                <div><div className="text-gray-500">Submitted</div><div className="font-medium text-gray-900">{selected.submittedAt ? format(new Date(selected.submittedAt), 'MMM d, yyyy h:mm a') : '--'}</div></div>
              </div>

              {/* Documents (all rounds, append-only) */}
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Documents ({selected.files?.length || 0})</div>
                <div className="flex flex-wrap gap-2">
                  {selected.files && selected.files.length > 0 ? (
                    selected.files.map((f) => (
                      <DocButton
                        key={f._id}
                        href={f.url || '#'}
                        label={`${f.fileName || (f.label || 'document').replace(/_/g, ' ')}${f.round > 1 ? ` (round ${f.round})` : ''}`}
                        pdf={f.mimeType === 'application/pdf'}
                      />
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No documents uploaded yet.</span>
                  )}
                </div>
              </div>

              {/* Review note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review note (optional)</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note (shown to the publisher if you send it back)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              {selected.status !== 'completed' && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => updateStatus(selected._id, 'completed')}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Approve & complete'}
                  </button>
                  <button
                    onClick={() => updateStatus(selected._id, 'active')}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                  >
                    Send back for changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initiate KYC modal */}
      {creating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Initiate KYC</h3>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={createTemplate}
                  onChange={(e) => setCreateTemplate(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="publisher@example.com"
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">The user must already have an account.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={createTask}
                  disabled={createBusy}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                >
                  {createBusy ? 'Creating...' : 'Create task'}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  disabled={createBusy}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocButton({ href, label, pdf }: { href: string; label: string; pdf?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition"
    >
      {pdf ? <FileText className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
      {label}
      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
    </a>
  );
}
