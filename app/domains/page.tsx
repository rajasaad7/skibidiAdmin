'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Edit3, Search, User, Crown, Users, ChevronLeft, ChevronRight, Download, CheckCircle, XCircle, AlertCircle, X, Edit } from 'lucide-react';
import OfferingModal from '@/components/OfferingModal';
import DomainEditModal from '@/components/DomainEditModal';

interface PublisherOffering {
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  domainType?: string;
  publisherId?: string;
  publisherName?: string | null;
  publisherEmail?: string | null;
  guestPostEnabled?: boolean;
  linkInsertionEnabled?: boolean;
  guestPostPrice?: number;
  linkInsertionPrice?: number;
  contentWritingPrice?: number;
  contentWritingEnabled?: boolean;
  contentWritingIncluded?: boolean;
  turnaroundTimeDays?: number;
  maxOutboundLinks?: number;
  allowedLinkTypes?: string[];
  prohibitedNiches?: string[];
  contentRequirements?: string;
  examplePosts?: string | null;
  adminApproved?: boolean | null;
  adminRejectionReason?: string;
}

interface Domain {
  _id: string;
  domainName: string;
  url: string;
  userId: string;
  categoryId: string | null;
  description: string | null;
  language: string;
  country: string;
  domainRating: number;
  domainAuthority: number;
  pageAuthority: number;
  trustFlow: number;
  citationFlow: number;
  organicTraffic: number;
  referringDomains: number;
  spamScore: number;
  guestPostPrice: number | null;
  linkInsertionPrice: number | null;
  contentWritingIncluded: boolean;
  contentWritingPrice: number | null;
  minWordCount: number;
  maxWordCount: number;
  turnaroundTimeDays: number;
  contentRequirements: string;
  prohibitedNiches: string[] | null;
  allowedLinkTypes: string[] | null;
  maxOutboundLinks: number;
  verificationStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  domainType: string;
  createdAt: string;
  publisherOfferings: PublisherOffering[];
  totalOfferings: number;
  pendingOfferings: number;
  verifiedOfferings: number;
  rejectedOfferings: number;
  domain_categories?: { name: string } | null;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0, domainsWithOwner: 0, domainsWithReseller: 0 });
  const [editingSEO, setEditingSEO] = useState<string | null>(null);
  const [seoMetrics, setSeoMetrics] = useState({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
  const [viewingOffering, setViewingOffering] = useState<{ domain: Domain; offering: PublisherOffering; index: number } | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; updatedCount: number; errors?: string[]; totalProcessed: number } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'file' | 'paste'>('file');
  const [pastedData, setPastedData] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<{ domainName: string; dr: string; da: string; traffic: string; spamScore: string }[]>([]);
  const [hoveredOffering, setHoveredOffering] = useState<{ domainId: string; index: number } | null>(null);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [publisherPages, setPublisherPages] = useState<Record<string, number>>({});

  const fetchDomains = async () => {
    setLoading(true);
    try {
      // Fetch filtered domains for display
      const params = new URLSearchParams();
      if (filter !== 'all' && filter !== 'with_owner' && filter !== 'reseller_only') {
        params.append('status', filter);
      }
      params.append('page', page.toString());

      // Add search query to params
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const url = `/api/domains?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setDomains(data.domains);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [filter, page]);

  const handleApproveOffering = async (domainId: string, offeringIndex: number) => {
    try {
      const response = await fetch('/api/domains/approve-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error approving offering:', error);
    }
  };

  const handleRejectOffering = async (domainId: string, offeringIndex: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch('/api/domains/reject-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex, reason })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error rejecting offering:', error);
    }
  };

  const handleUpdateSEO = async (domainId: string) => {
    try {
      const metrics: any = {};
      if (seoMetrics.domainRating) metrics.domainRating = Number(seoMetrics.domainRating);
      if (seoMetrics.domainAuthority) metrics.domainAuthority = Number(seoMetrics.domainAuthority);
      if (seoMetrics.spamScore) metrics.spamScore = Number(seoMetrics.spamScore);
      if (seoMetrics.organicTraffic) metrics.organicTraffic = Number(seoMetrics.organicTraffic);

      const response = await fetch('/api/domains/update-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, seoMetrics: metrics })
      });
      if (response.ok) {
        setEditingSEO(null);
        setSeoMetrics({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
        fetchDomains();
      }
    } catch (error) {
      console.error('Error updating SEO metrics:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) return;
    try {
      const response = await fetch('/api/domains/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const handleSaveDomain = async (updatedDomain: Partial<Domain>) => {
    if (!editingDomain) return;

    try {
      const response = await fetch('/api/domains/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDomain._id, ...updatedDomain })
      });

      if (response.ok) {
        fetchDomains();
        setEditingDomain(null);
      } else {
        throw new Error('Failed to update domain');
      }
    } catch (error) {
      console.error('Error updating domain:', error);
      throw error;
    }
  };

  const handleSaveOffering = async (domainId: string, offeringIndex: number, offering: PublisherOffering) => {
    try {
      const response = await fetch('/api/domains/update-offering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, offeringIndex, offering })
      });
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Error updating offering:', error);
    }
  };

  const getFilteredDomains = () => {
    let filtered = domains;

    // Apply owner/reseller filters client-side
    if (filter === 'with_owner') {
      filtered = filtered.filter(domain =>
        domain.publisherOfferings.some(o => o.domainType === 'owner')
      );
    } else if (filter === 'reseller_only') {
      filtered = filtered.filter(domain =>
        domain.publisherOfferings.some(o => o.domainType === 'reseller') &&
        !domain.publisherOfferings.some(o => o.domainType === 'owner')
      );
    }

    return filtered;
  };

  const toggleSelectDomain = (domainId: string) => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainId)) {
        newSet.delete(domainId);
      } else {
        newSet.add(domainId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filteredDomains = getFilteredDomains();
    if (selectedDomains.size === filteredDomains.length) {
      setSelectedDomains(new Set());
    } else {
      setSelectedDomains(new Set(filteredDomains.map(d => d._id)));
    }
  };

  const handleBulkApprove = async () => {
    const selectedDomainsList = domains.filter(d => selectedDomains.has(d._id));

    if (selectedDomainsList.length === 0) {
      alert('Please select at least one domain');
      return;
    }

    if (!confirm(`Are you sure you want to approve all pending publisher offerings for ${selectedDomainsList.length} selected domain(s)?`)) {
      return;
    }

    try {
      const updates: { domainId: string; offeringIndex: number }[] = [];
      selectedDomainsList.forEach(domain => {
        domain.publisherOfferings.forEach((offering, index) => {
          if (offering.adminApproved === null || offering.adminApproved === undefined) {
            updates.push({
              domainId: domain._id,
              offeringIndex: index
            });
          }
        });
      });

      if (updates.length === 0) {
        alert('No pending offerings found in selected domains');
        return;
      }

      const promises = updates.map(update =>
        fetch('/api/domains/approve-offering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      );

      await Promise.all(promises);
      alert(`Successfully approved ${updates.length} pending offering(s)`);
      fetchDomains();
      setSelectedDomains(new Set());
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Error approving offerings');
    }
  };

  const handleBulkReject = async () => {
    const selectedDomainsList = domains.filter(d => selectedDomains.has(d._id));

    if (selectedDomainsList.length === 0) {
      alert('Please select at least one domain');
      return;
    }

    const reason = prompt('Enter rejection reason for all pending offerings:');
    if (!reason) return;

    try {
      const updates: { domainId: string; offeringIndex: number; reason: string }[] = [];
      selectedDomainsList.forEach(domain => {
        domain.publisherOfferings.forEach((offering, index) => {
          if (offering.adminApproved === null || offering.adminApproved === undefined) {
            updates.push({
              domainId: domain._id,
              offeringIndex: index,
              reason: reason
            });
          }
        });
      });

      if (updates.length === 0) {
        alert('No pending offerings found in selected domains');
        return;
      }

      const promises = updates.map(update =>
        fetch('/api/domains/reject-offering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })
      );

      await Promise.all(promises);
      alert(`Successfully rejected ${updates.length} pending offering(s)`);
      fetchDomains();
      setSelectedDomains(new Set());
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      alert('Error rejecting offerings');
    }
  };

  const exportToCSV = () => {
    const filteredDomains = getFilteredDomains();
    const domainsToExport = filteredDomains.filter(d => selectedDomains.has(d._id));

    if (domainsToExport.length === 0) {
      alert('Please select at least one domain to export');
      return;
    }

    // Create CSV content
    const headers = ['Domain Name', 'DR', 'DA', 'Spam Score', 'Traffic'];
    const rows = domainsToExport.map(domain => [
      domain.domainName,
      domain.domainRating || '',
      domain.domainAuthority || '',
      domain.spamScore || '',
      domain.organicTraffic || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `domains_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setPastedData(text);

    // Parse the pasted data
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    const rows = lines.map(line => {
      const values = line.split('\t').map(v => v.trim());
      return {
        domainName: values[0] || '',
        dr: values[1] || '',
        da: values[2] || '',
        spamScore: values[3] || '',
        traffic: values[4] || ''
      };
    });

    setParsedRows(rows);
  };

  const handleBulkUpdate = async () => {
    if (parsedRows.length === 0) return;

    setUploadingCSV(true);

    try {
      const updates = parsedRows.map(row => {
        const update: any = { domainName: row.domainName };

        if (row.dr && row.dr.trim() !== '' && !isNaN(Number(row.dr))) {
          update.domainRating = Number(row.dr);
        }
        if (row.da && row.da.trim() !== '' && !isNaN(Number(row.da))) {
          update.domainAuthority = Number(row.da);
        }
        if (row.traffic && row.traffic.trim() !== '' && !isNaN(Number(row.traffic))) {
          update.organicTraffic = Number(row.traffic);
        }
        if (row.spamScore && row.spamScore.trim() !== '' && !isNaN(Number(row.spamScore))) {
          update.spamScore = Number(row.spamScore);
        }

        return update;
      }).filter(update => Object.keys(update).length > 1); // Only include updates with data

      if (updates.length === 0) {
        setUploadResult({
          success: false,
          updatedCount: 0,
          errors: ['No valid updates found. Make sure you have domain names and at least one metric with values.'],
          totalProcessed: 0
        });
        setUploadingCSV(false);
        setShowImportModal(false);
        return;
      }

      const response = await fetch('/api/domains/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          updatedCount: result.updatedCount || 0,
          errors: result.errors,
          totalProcessed: updates.length
        });
        fetchDomains();
      } else {
        setUploadResult({
          success: false,
          updatedCount: 0,
          errors: [result.error || 'Failed to update domains'],
          totalProcessed: updates.length
        });
      }

      setShowImportModal(false);
      setPastedData('');
      setParsedRows([]);
    } catch (error) {
      console.error('Error processing data:', error);
      setUploadResult({
        success: false,
        updatedCount: 0,
        errors: ['Error processing data'],
        totalProcessed: 0
      });
      setShowImportModal(false);
    } finally {
      setUploadingCSV(false);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Find column indices - flexible matching
      const domainNameIdx = headers.findIndex(h => h.toLowerCase().includes('domain'));
      const drIdx = headers.findIndex(h => h.toUpperCase() === 'DR');
      const daIdx = headers.findIndex(h => h.toUpperCase() === 'DA');
      const trafficIdx = headers.findIndex(h => h.toLowerCase().includes('traffic'));
      const spamScoreIdx = headers.findIndex(h => h.toLowerCase().includes('spam'));

      if (domainNameIdx === -1) {
        setUploadResult({
          success: false,
          updatedCount: 0,
          errors: ['CSV must contain a column with "Domain" in the name (e.g., "Domain Name")'],
          totalProcessed: 0
        });
        setUploadingCSV(false);
        return;
      }

      const updates = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const domainName = values[domainNameIdx];

        if (!domainName) continue;

        const update: any = { domainName };

        // Only include non-empty values and valid numbers
        if (drIdx !== -1 && values[drIdx] && values[drIdx] !== 'N/A' && values[drIdx].trim() !== '') {
          const val = Number(values[drIdx]);
          if (!isNaN(val)) update.domainRating = val;
        }
        if (daIdx !== -1 && values[daIdx] && values[daIdx] !== 'N/A' && values[daIdx].trim() !== '') {
          const val = Number(values[daIdx]);
          if (!isNaN(val)) update.domainAuthority = val;
        }
        if (trafficIdx !== -1 && values[trafficIdx] && values[trafficIdx] !== 'N/A' && values[trafficIdx].trim() !== '') {
          const val = Number(values[trafficIdx]);
          if (!isNaN(val)) update.organicTraffic = val;
        }
        if (spamScoreIdx !== -1 && values[spamScoreIdx] && values[spamScoreIdx] !== 'N/A' && values[spamScoreIdx].trim() !== '') {
          const val = Number(values[spamScoreIdx]);
          if (!isNaN(val)) update.spamScore = val;
        }

        // Only add if there are fields to update beyond domain name
        if (Object.keys(update).length > 1) {
          updates.push(update);
        }
      }

      if (updates.length === 0) {
        setUploadResult({
          success: false,
          updatedCount: 0,
          errors: ['No valid updates found in CSV. Make sure you have Domain Name column and at least one metric (DR, DA, Traffic, Spam Score) with values.'],
          totalProcessed: 0
        });
        setUploadingCSV(false);
        return;
      }

      // Send bulk update to API
      const response = await fetch('/api/domains/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          updatedCount: result.updatedCount || 0,
          errors: result.errors,
          totalProcessed: updates.length
        });
        fetchDomains();
      } else {
        setUploadResult({
          success: false,
          updatedCount: 0,
          errors: [result.error || 'Failed to update domains'],
          totalProcessed: updates.length
        });
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      setUploadResult({
        success: false,
        updatedCount: 0,
        errors: ['Error processing CSV file'],
        totalProcessed: 0
      });
    } finally {
      setUploadingCSV(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <>
      {viewingOffering && (
        <OfferingModal
          domain={viewingOffering.domain}
          offering={viewingOffering.offering}
          index={viewingOffering.index}
          onClose={() => setViewingOffering(null)}
          onSave={handleSaveOffering}
          onApprove={handleApproveOffering}
          onReject={handleRejectOffering}
        />
      )}

      {editingDomain && (
        <DomainEditModal
          domain={editingDomain}
          onClose={() => setEditingDomain(null)}
          onSave={handleSaveDomain}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Update Domains</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPastedData('');
                  setParsedRows([]);
                  setImportType('file');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Import Type Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setImportType('file')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    importType === 'file'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Upload CSV File
                </button>
                <button
                  onClick={() => setImportType('paste')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    importType === 'paste'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Paste from Spreadsheet
                </button>
              </div>

              {importType === 'file' ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Upload a CSV file with domain data</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer">
                    <Download className="w-4 h-4" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        handleCSVUpload(e);
                        setShowImportModal(false);
                      }}
                      disabled={uploadingCSV}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 text-sm font-medium mb-2">How to use:</p>
                    <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                      <li>Copy data from Google Sheets or Excel in this order: <strong>Domain Name, DR, DA, Spam Score, Traffic</strong></li>
                      <li>Click in the text area below and paste (Ctrl+V / Cmd+V)</li>
                      <li>Review the parsed data in the table</li>
                      <li>Click "Update Domains" to apply changes</li>
                    </ol>
                  </div>

                  <textarea
                    placeholder="Click here and paste your data from Google Sheets (Ctrl+V / Cmd+V)..."
                    onPaste={handlePaste}
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                  />

                  {parsedRows.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Domain Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">DR</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">DA</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Spam Score</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Traffic</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {parsedRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{row.domainName}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{row.dr}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{row.da}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{row.spamScore}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{row.traffic}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600">{parsedRows.length} row(s) ready to update</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {importType === 'paste' && parsedRows.length > 0 && (
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setPastedData('');
                    setParsedRows([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  disabled={uploadingCSV}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={uploadingCSV}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {uploadingCSV ? 'Updating...' : 'Update Domains'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
      {uploadResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {uploadResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {uploadResult.success ? 'Import Successful' : 'Import Failed'}
                </h3>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-1">Total Processed</div>
                  <div className="text-2xl font-bold text-blue-900">{uploadResult.totalProcessed}</div>
                </div>
                <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-sm mb-1 ${uploadResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    Updated Successfully
                  </div>
                  <div className={`text-2xl font-bold ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {uploadResult.updatedCount}
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {uploadResult.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-900 font-medium">
                        Successfully updated {uploadResult.updatedCount} domain{uploadResult.updatedCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        SEO metrics have been updated for the matched domains.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-900 font-medium mb-2">
                        {uploadResult.errors.length} Warning{uploadResult.errors.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {uploadResult.errors.map((error, idx) => (
                          <p key={idx} className="text-yellow-700 text-sm">
                            • {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-200">
              <button
                onClick={() => setUploadResult(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Old modal code replaced by OfferingModal component */}

      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Domain Management</h1>
        <button
          onClick={fetchDomains}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards - Now Clickable Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total Domains</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'pending' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Pending Approval</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'verified' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Verified</div>
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'rejected' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </button>
        <button
          onClick={() => setFilter('with_owner')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'with_owner' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">With Owner</div>
          <div className="text-2xl font-bold text-blue-600">{stats.domainsWithOwner}</div>
        </button>
        <button
          onClick={() => setFilter('reseller_only')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition hover:shadow-md text-left ${
            filter === 'reseller_only' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Reseller Only</div>
          <div className="text-2xl font-bold text-purple-600">{stats.domainsWithReseller}</div>
        </button>
      </div>

      {/* Search on left, bulk operations on right */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Left side: Search only */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains (press Enter)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1); // Reset to page 1 on search
                fetchDomains();
              }
            }}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Right side: All buttons */}
        <div className="flex items-center gap-2">
          {selectedDomains.size > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedDomains.size} selected
              </span>
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All Pending
              </button>
              <button
                onClick={handleBulkReject}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                <XCircle className="w-4 h-4" />
                Reject All Pending
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportType('paste');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Download className="w-4 h-4" />
            Bulk Update
          </button>
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : getFilteredDomains().length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No domains found
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center">
                {/* Select All Checkbox */}
                <div className="flex-shrink-0 mr-3">
                  <input
                    type="checkbox"
                    checked={getFilteredDomains().length > 0 && selectedDomains.size === getFilteredDomains().length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Domain Name */}
                <div className="w-64 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-900 uppercase">Domain Name</span>
                </div>

                {/* Stats - Centered */}
                <div className="flex-1 flex items-center justify-center gap-8">
                  <div className="text-center w-16">
                    <span className="text-xs font-semibold text-gray-900 uppercase">DR</span>
                  </div>
                  <div className="text-center w-16">
                    <span className="text-xs font-semibold text-gray-900 uppercase">DA</span>
                  </div>
                  <div className="text-center w-20">
                    <span className="text-xs font-semibold text-gray-900 uppercase">Traffic</span>
                  </div>
                  <div className="text-center w-16">
                    <span className="text-xs font-semibold text-gray-900 uppercase">SS</span>
                  </div>
                </div>

                {/* Publishers */}
                <div className="flex-shrink-0 text-center" style={{ minWidth: '200px' }}>
                  <span className="text-xs font-semibold text-gray-900 uppercase">Publishers</span>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 text-center" style={{ minWidth: '120px' }}>
                  <span className="text-xs font-semibold text-gray-900 uppercase">Actions</span>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 overflow-visible">
              {getFilteredDomains().map((domain) => (
            <div key={domain._id}>
              {/* Domain Row */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mr-3">
                    <input
                      type="checkbox"
                      checked={selectedDomains.has(domain._id)}
                      onChange={() => toggleSelectDomain(domain._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Domain Name and Category */}
                  <div className="w-64 flex-shrink-0">
                    <h3 className="text-base font-semibold text-gray-900">{domain.domainName}</h3>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 mt-1">
                      {domain.domain_categories?.name || 'Uncategorized'}
                    </span>
                  </div>

                  {/* Stats - Centered */}
                  <div className="flex-1 flex items-center justify-center gap-8">
                    {/* DR */}
                    <div className="text-center w-16">
                      <div className="text-base font-bold text-blue-600">{domain.domainRating || 'N/A'}</div>
                    </div>

                    {/* DA */}
                    <div className="text-center w-16">
                      <div className="text-base font-bold text-blue-600">{domain.domainAuthority || 'N/A'}</div>
                    </div>

                    {/* Traffic */}
                    <div className="text-center w-20">
                      <div className="text-base font-bold text-green-600">{domain.organicTraffic || 'N/A'}</div>
                    </div>

                    {/* SS */}
                    <div className="text-center w-16">
                      <div className="text-base font-bold text-gray-900">
                        {domain.spamScore || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Publisher Buttons - Right Side with Carousel */}
                  <div className="flex items-center gap-1 flex-shrink-0 justify-center" style={{ minWidth: '200px' }}>
                    {(() => {
                      const currentPage = publisherPages[domain._id] || 0;
                      const itemsPerPage = 2;
                      const totalPages = Math.ceil(domain.publisherOfferings.length / itemsPerPage);
                      const startIndex = currentPage * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const visibleOfferings = domain.publisherOfferings.slice(startIndex, endIndex);

                      return (
                        <>
                          {/* Previous Button */}
                          {domain.publisherOfferings.length > itemsPerPage && (
                            <button
                              onClick={() => setPublisherPages(prev => ({
                                ...prev,
                                [domain._id]: currentPage > 0 ? currentPage - 1 : totalPages - 1
                              }))}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                              title="Previous"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Publishers */}
                          <div className="flex items-center gap-2">
                            {visibleOfferings.map((offering, visibleIndex) => {
                              const index = startIndex + visibleIndex;
                              const isOwner = offering.domainType === 'owner';
                              const isReseller = offering.domainType === 'reseller';

                              // Count owners and resellers separately
                              const ownerCount = domain.publisherOfferings
                                .slice(0, index)
                                .filter(o => o.domainType === 'owner').length + 1;
                              const resellerCount = domain.publisherOfferings
                                .slice(0, index)
                                .filter(o => o.domainType === 'reseller').length + 1;

                              let statusColor = '';
                              if (isOwner) {
                                statusColor = offering.adminApproved === true ? 'bg-blue-600 hover:bg-blue-700' :
                                             offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                             'bg-yellow-500 hover:bg-yellow-600';
                              } else if (isReseller) {
                                statusColor = offering.adminApproved === true ? 'bg-purple-600 hover:bg-purple-700' :
                                             offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                             'bg-yellow-500 hover:bg-yellow-600';
                              } else {
                                statusColor = offering.adminApproved === true ? 'bg-green-500 hover:bg-green-600' :
                                             offering.adminApproved === false ? 'bg-red-500 hover:bg-red-600' :
                                             'bg-yellow-500 hover:bg-yellow-600';
                              }

                              const Icon = isOwner ? Crown : isReseller ? Users : User;
                              const prefix = isOwner ? 'O' : isReseller ? 'R' : 'P';
                              const number = isOwner ? ownerCount : isReseller ? resellerCount : index + 1;

                              const isHovered = hoveredOffering?.domainId === domain._id && hoveredOffering?.index === index;

                              return (
                                <div key={`pub-${index}`} className="relative">
                                  <button
                                    onClick={() => setViewingOffering({ domain, offering, index })}
                                    onMouseEnter={() => setHoveredOffering({ domainId: domain._id, index })}
                                    onMouseLeave={() => setHoveredOffering(null)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 ${statusColor} text-white text-xs font-medium rounded-lg transition`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    {prefix}{number}
                                  </button>

                                  {/* Tooltip */}
                                  {isHovered && (
                                    <div className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 w-64 pointer-events-none">
                                      <div className="space-y-1.5">
                                        <div className="font-semibold text-sm border-b border-gray-700 pb-1.5 mb-1.5">
                                          {offering.domainType === 'owner' ? 'Owner' : offering.domainType === 'reseller' ? 'Reseller' : 'Publisher'}
                                        </div>
                                        <div>
                                          <span className="text-gray-400">Name:</span> {offering.publisherName || 'N/A'}
                                        </div>
                                        <div>
                                          <span className="text-gray-400">Email:</span> {offering.publisherEmail || 'N/A'}
                                        </div>
                                        {offering.guestPostEnabled && (
                                          <div>
                                            <span className="text-gray-400">Guest Post:</span> ${offering.guestPostPrice || 'N/A'}
                                          </div>
                                        )}
                                        {offering.linkInsertionEnabled && (
                                          <div>
                                            <span className="text-gray-400">Link Insertion:</span> ${offering.linkInsertionPrice || 'N/A'}
                                          </div>
                                        )}
                                        {offering.contentWritingEnabled && (
                                          <div>
                                            <span className="text-gray-400">Content Writing:</span> ${offering.contentWritingPrice || 'N/A'}
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-gray-400">Status:</span>{' '}
                                          <span className={offering.adminApproved === true ? 'text-green-400' : offering.adminApproved === false ? 'text-red-400' : 'text-yellow-400'}>
                                            {offering.adminApproved === true ? 'Approved' : offering.adminApproved === false ? 'Rejected' : 'Pending'}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Arrow */}
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Next Button */}
                          {domain.publisherOfferings.length > itemsPerPage && (
                            <button
                              onClick={() => setPublisherPages(prev => ({
                                ...prev,
                                [domain._id]: currentPage < totalPages - 1 ? currentPage + 1 : 0
                              }))}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                              title="Next"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0 justify-center" style={{ minWidth: '120px' }}>
                    <button
                      onClick={() => setEditingSEO(editingSEO === domain._id ? null : domain._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Update SEO Metrics"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(domain._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingDomain(domain)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Edit Domain"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SEO Metrics Editor */}
                {editingSEO === domain._id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Update SEO Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        type="number"
                        placeholder={`DR (${domain.domainRating || 'N/A'})`}
                        value={seoMetrics.domainRating}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, domainRating: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`DA (${domain.domainAuthority || 'N/A'})`}
                        value={seoMetrics.domainAuthority}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, domainAuthority: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`SS (${domain.spamScore || 'N/A'})`}
                        value={seoMetrics.spamScore}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, spamScore: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder={`Traffic (${domain.organicTraffic || 'N/A'})`}
                        value={seoMetrics.organicTraffic}
                        onChange={(e) => setSeoMetrics({ ...seoMetrics, organicTraffic: e.target.value })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleUpdateSEO(domain._id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setEditingSEO(null);
                          setSeoMetrics({ domainRating: '', domainAuthority: '', spamScore: '', organicTraffic: '' });
                        }}
                        className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} domains
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white font-medium'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
