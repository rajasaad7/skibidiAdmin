'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, DollarSign, Eye, Copy, Check, X } from 'lucide-react';

interface PaymentDetails {
  paypalEmail?: string | null;
  iban?: string | null;
  bankName?: string | null;
  swiftCode?: string | null;
  accountHolderName?: string | null;
  [key: string]: any;
}

// Mirrors the publisher_payout_methods table.
interface PayoutMethod {
  _id: string;
  type: string;
  label?: string | null;
  beneficiaryType?: string | null;
  accountHolderName?: string | null;
  currency?: string | null;
  bankCountry?: string | null;
  idDocType?: string | null;
  idDocNumber?: string | null;
  dateOfBirth?: string | null;
  companyName?: string | null;
  businessRegNumber?: string | null;
  taxId?: string | null;
  salesTaxNumber?: string | null;
  iban?: string | null;
  accountNumber?: string | null;
  swiftBic?: string | null;
  routingNumber?: string | null;
  sortCode?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  bankAddress?: string | null;
  accountType?: string | null;
  paypalEmail?: string | null;
  payoneerEmail?: string | null;
  [key: string]: any;
}

interface BillingInfo {
  fullName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  [key: string]: any;
}

interface ContactDetails {
  type?: string | null;
  value?: string | null;
  updatedAt?: string | null;
  [key: string]: any;
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
  paymentMethod?: string | null;
  paymentDetails?: PaymentDetails | null;
  payoutMethod?: PayoutMethod | null;
  payoutFee?: number | null;
  amountReceived?: string | number | null;
  user?: {
    _id: string;
    email: string;
    fullName: string;
    billingInfo?: BillingInfo | null;
    contactDetails?: ContactDetails | null;
  };
}

export default function PayoutsPage() {
  // Payout requests state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
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

  // Payment details modal
  const [detailsPayout, setDetailsPayout] = useState<Payout | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<'approve' | 'complete' | 'processing' | 'reject' | null>(null);

  const closeDetailsModal = () => {
    setDetailsPayout(null);
    setTransactionId('');
    setNotes('');
    setRejectionReason('');
    setActionLoading(null);
  };

  // A pending payout that has been waiting more than 7 days is flagged "overdue".
  // This is a display-only label — the DB status stays "pending" until an admin
  // explicitly moves it to "processing". Distinct from the real "processing" status.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const getDisplayStatus = (payout: Payout) => {
    if (
      payout.status === 'pending' &&
      Date.now() - new Date(payout.createdAt).getTime() >= SEVEN_DAYS_MS
    ) {
      return 'overdue';
    }
    return payout.status;
  };

  const copyValue = async (key: string, value: string) => {
    // IBANs are commonly stored with spaces for readability; strip them on copy
    // so the clipboard value is paste-ready into banking forms.
    const toCopy = key === 'iban' ? value.replace(/\s+/g, '') : value;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Human-readable label for a payout method type.
  const methodTypeLabel = (type?: string | null) => {
    switch ((type || '').toLowerCase()) {
      case 'bank':
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'paypal':
        return 'PayPal';
      case 'payoneer':
        return 'Payoneer';
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    }
  };

  type Field = { label: string; key: string; value: string | null | undefined; copyable?: boolean };

  // Build the list of fields to show for a payout, choosing only the ones
  // relevant to the method type and hiding empties. Prefers the linked
  // publisher_payout_methods row, falling back to the legacy paymentDetails blob.
  const getMethodFields = (payout: Payout): Field[] => {
    const m = payout.payoutMethod;
    const fields: Field[] = [];

    if (m) {
      const type = (m.type || '').toLowerCase();
      const common: Field[] = [
        { label: 'Account Holder', key: 'accountHolderName', value: m.accountHolderName, copyable: true },
        { label: 'Beneficiary Type', key: 'beneficiaryType', value: m.beneficiaryType },
        { label: 'Company Name', key: 'companyName', value: m.companyName, copyable: true },
        { label: 'Currency', key: 'currency', value: m.currency },
      ];

      if (type === 'paypal') {
        fields.push({ label: 'PayPal Email', key: 'paypalEmail', value: m.paypalEmail, copyable: true });
        fields.push(...common);
      } else if (type === 'payoneer') {
        fields.push({ label: 'Payoneer Email', key: 'payoneerEmail', value: m.payoneerEmail, copyable: true });
        fields.push(...common);
      } else {
        // Treat everything else as a bank account.
        fields.push(...common);
        fields.push(
          { label: 'Bank Name', key: 'bankName', value: m.bankName, copyable: true },
          { label: 'Branch Name', key: 'branchName', value: m.branchName, copyable: true },
          { label: 'Bank Address', key: 'bankAddress', value: m.bankAddress, copyable: true },
          { label: 'Bank Country', key: 'bankCountry', value: m.bankCountry },
          { label: 'Account Type', key: 'accountType', value: m.accountType },
          { label: 'IBAN', key: 'iban', value: m.iban, copyable: true },
          { label: 'Account Number', key: 'accountNumber', value: m.accountNumber, copyable: true },
          { label: 'SWIFT / BIC', key: 'swiftBic', value: m.swiftBic, copyable: true },
          { label: 'Routing Number', key: 'routingNumber', value: m.routingNumber, copyable: true },
          { label: 'Sort Code', key: 'sortCode', value: m.sortCode, copyable: true },
          { label: 'IFSC', key: 'ifsc', value: m.ifsc, copyable: true },
        );
      }

      // Tax / identity details apply to any method type.
      fields.push(
        { label: 'Tax ID', key: 'taxId', value: m.taxId, copyable: true },
        { label: 'Sales Tax Number', key: 'salesTaxNumber', value: m.salesTaxNumber, copyable: true },
        { label: 'Business Reg. Number', key: 'businessRegNumber', value: m.businessRegNumber, copyable: true },
        { label: 'ID Document', key: 'idDoc', value: m.idDocNumber ? `${m.idDocType ? m.idDocType + ': ' : ''}${m.idDocNumber}` : null, copyable: true },
        { label: 'Date of Birth', key: 'dateOfBirth', value: m.dateOfBirth },
      );
    } else {
      // Legacy fallback: the old paymentDetails JSONB blob.
      const pd = payout.paymentDetails || {};
      fields.push(
        { label: 'PayPal Email', key: 'paypalEmail', value: pd.paypalEmail, copyable: true },
        { label: 'Account Holder', key: 'accountHolderName', value: pd.accountHolderName, copyable: true },
        { label: 'Bank Name', key: 'bankName', value: pd.bankName, copyable: true },
        { label: 'IBAN', key: 'iban', value: pd.iban, copyable: true },
        { label: 'SWIFT / BIC', key: 'swiftCode', value: pd.swiftCode, copyable: true },
      );
    }

    return fields.filter((f) => f.value && String(f.value).trim() !== '');
  };

  // Build the requesting publisher's billing info fields (generic but ordered).
  const getBillingFields = (billing?: BillingInfo | null): Field[] => {
    if (!billing) return [];
    const ordered: { label: string; key: string }[] = [
      { label: 'Full Name', key: 'fullName' },
      { label: 'Address', key: 'address' },
      { label: 'City', key: 'city' },
      { label: 'State', key: 'state' },
      { label: 'Postal Code', key: 'postalCode' },
      { label: 'Country', key: 'country' },
      { label: 'Tax ID', key: 'taxId' },
    ];
    // Keys we never want to surface in the UI.
    const hidden = new Set(['updatedAt', 'usTaxEligible']);

    const seen = new Set(ordered.map((o) => o.key));
    const fields: Field[] = ordered.map((o) => ({
      label: o.label,
      key: o.key,
      value: billing[o.key],
      copyable: true,
    }));

    // Render any unexpected keys generically so nothing is silently dropped.
    Object.keys(billing).forEach((k) => {
      if (seen.has(k) || hidden.has(k)) return;
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
      fields.push({ label, key: k, value: billing[k], copyable: true });
    });

    return fields.filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== '');
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
    fetchPayouts();
  }, [filter]);

  const handleRefresh = () => {
    fetchPayouts();
  };

  const handleMarkAsProcessing = async (payoutId: string) => {
    setActionLoading('processing');
    try {
      const response = await fetch('/api/payouts/mark-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId })
      });
      if (response.ok) {
        closeDetailsModal();
        fetchPayouts();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to update payout status');
      }
    } catch (error) {
      console.error('Error marking payout as processing:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    // Reuse the same endpoint for both the pending fast-path and the
    // processing -> completed transition; the label differs by current status.
    setActionLoading(detailsPayout?.status === 'processing' ? 'complete' : 'approve');
    try {
      const response = await fetch('/api/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, transactionId, notes })
      });
      if (response.ok) {
        closeDetailsModal();
        fetchPayouts();
      }
    } catch (error) {
      console.error('Error marking payout as paid:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsFailed = async (payoutId: string, reason: string) => {
    if (!reason) {
      alert('Please provide a reason for rejection');
      return;
    }
    setActionLoading('reject');
    try {
      const response = await fetch('/api/payouts/mark-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, reason })
      });
      if (response.ok) {
        closeDetailsModal();
        fetchPayouts();
      }
    } catch (error) {
      console.error('Error marking payout as failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Payout Requests</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

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
            {['active', 'pending', 'processing', 'completed', 'failed', 'all'].map((status) => (
              <button
                key={`filter-${status}`}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status === 'active' ? 'Needs Action' : status.charAt(0).toUpperCase() + status.slice(1)}
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
                          {(() => {
                            const display = getDisplayStatus(payout);
                            const cls =
                              display === 'completed' ? 'bg-green-100 text-green-800' :
                              display === 'processing' ? 'bg-blue-100 text-blue-800' :
                              display === 'overdue' ? 'bg-amber-100 text-amber-800' :
                              display === 'pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800';
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>
                                {display}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDetailsPayout(payout)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

      {detailsPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payout Details</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {detailsPayout.user?.fullName || 'Unknown'} · ${detailsPayout.amount.toFixed(2)} ·{' '}
                  {(() => {
                    const display = getDisplayStatus(detailsPayout);
                    const cls =
                      display === 'completed' ? 'bg-green-100 text-green-800' :
                      display === 'processing' ? 'bg-blue-100 text-blue-800' :
                      display === 'overdue' ? 'bg-amber-100 text-amber-800' :
                      display === 'pending' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800';
                    return (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${cls}`}>
                        {display}
                      </span>
                    );
                  })()}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* LEFT: Requesting publisher's billing & contact info */}
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Billing Information</h4>
                  <div className="space-y-3">
                    {(() => {
                      const billingFields = getBillingFields(detailsPayout.user?.billingInfo);
                      if (billingFields.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                            No billing information on file.
                          </p>
                        );
                      }
                      return billingFields.map((f) => (
                        <div key={f.key} className="border border-gray-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            {f.label}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-gray-900 break-all">{f.value}</div>
                            {f.copyable && (
                              <button
                                onClick={() => copyValue(`billing-${f.key}`, String(f.value))}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                                title="Copy"
                              >
                                {copiedKey === `billing-${f.key}` ? (
                                  <><Check className="w-3.5 h-3.5" /> Copied</>
                                ) : (
                                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Account / contact */}
                <div className="border-t border-gray-200 pt-5 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Account</h4>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-900 break-all">{detailsPayout.user?.email || '—'}</div>
                      {detailsPayout.user?.email && (
                        <button
                          onClick={() => copyValue('account-email', String(detailsPayout.user?.email))}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                          title="Copy"
                        >
                          {copiedKey === 'account-email' ? (
                            <><Check className="w-3.5 h-3.5" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {detailsPayout.user?.contactDetails?.value && (
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {detailsPayout.user.contactDetails.type
                          ? detailsPayout.user.contactDetails.type.charAt(0).toUpperCase() + detailsPayout.user.contactDetails.type.slice(1)
                          : 'Contact'}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-900 break-all">{detailsPayout.user.contactDetails.value}</div>
                        <button
                          onClick={() => copyValue('contact', String(detailsPayout.user?.contactDetails?.value))}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                          title="Copy"
                        >
                          {copiedKey === 'contact' ? (
                            <><Check className="w-3.5 h-3.5" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Payout method details + actions */}
              <div className="p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Payout Method</h4>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                    {methodTypeLabel(detailsPayout.payoutMethod?.type || detailsPayout.paymentMethod)}
                  </span>
                </div>
                {/* Amount summary including fee */}
                <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                  <div className="border border-gray-200 rounded-lg p-2">
                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Amount</div>
                    <div className="text-sm font-semibold text-gray-900">${detailsPayout.amount.toFixed(2)}</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-2">
                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fee</div>
                    <div className="text-sm font-semibold text-gray-900">${Number(detailsPayout.payoutFee || 0).toFixed(2)}</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-2 bg-green-50 border-green-200">
                    <div className="text-[10px] font-medium text-green-600 uppercase tracking-wide">Receives</div>
                    <div className="text-sm font-semibold text-green-700">
                      ${Number(detailsPayout.amountReceived ?? (detailsPayout.amount - Number(detailsPayout.payoutFee || 0))).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const populated = getMethodFields(detailsPayout);

                    if (populated.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                          No payment details on file.
                        </p>
                      );
                    }

                    return populated.map((f) => (
                      <div key={f.key} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          {f.label}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-gray-900 break-all font-mono">{f.value}</div>
                          {f.copyable && (
                            <button
                              onClick={() => copyValue(f.key, String(f.value))}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                              title="Copy"
                            >
                              {copiedKey === f.key ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {detailsPayout.status === 'pending' ? (
                <div className="border-t border-gray-200 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Start Processing</h4>
                    <p className="text-xs text-gray-500 mb-2">
                      Mark this request as in progress while you make the transfer.
                    </p>
                    <button
                      onClick={() => handleMarkAsProcessing(detailsPayout._id)}
                      disabled={actionLoading !== null}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {actionLoading === 'processing' ? 'Updating…' : 'Mark as Processing'}
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Approve &amp; Mark Paid</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleMarkAsPaid(detailsPayout._id)}
                        disabled={actionLoading !== null}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading === 'approve' ? 'Approving…' : 'Approve & Mark Paid'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Reject Payout</h4>
                    <div className="space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (required)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        onClick={() => handleMarkAsFailed(detailsPayout._id, rejectionReason.trim())}
                        disabled={actionLoading !== null || !rejectionReason.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {actionLoading === 'reject' ? 'Rejecting…' : 'Reject Payout'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : detailsPayout.status === 'processing' ? (
                <div className="border-t border-gray-200 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Complete Payout</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleMarkAsPaid(detailsPayout._id)}
                        disabled={actionLoading !== null}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading === 'complete' ? 'Completing…' : 'Mark as Completed'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Reject Payout</h4>
                    <div className="space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (required)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        onClick={() => handleMarkAsFailed(detailsPayout._id, rejectionReason.trim())}
                        disabled={actionLoading !== null || !rejectionReason.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {actionLoading === 'reject' ? 'Rejecting…' : 'Reject Payout'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                (detailsPayout.transactionId || detailsPayout.notes) && (
                  <div className="border-t border-gray-200 pt-5 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Processing Info</h4>
                    {detailsPayout.transactionId && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Transaction ID:</span> {detailsPayout.transactionId}
                      </p>
                    )}
                    {detailsPayout.notes && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Notes:</span> {detailsPayout.notes}
                      </p>
                    )}
                  </div>
                )
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
