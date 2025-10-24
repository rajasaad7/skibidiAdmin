'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
}

interface DomainEditModalProps {
  domain: Domain;
  onClose: () => void;
  onSave: (updatedDomain: Partial<Domain>) => Promise<void>;
}

export default function DomainEditModal({ domain, onClose, onSave }: DomainEditModalProps) {
  const [formData, setFormData] = useState<Partial<Domain>>({});
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize form data with domain values
    setFormData({
      domainName: domain.domainName,
      url: domain.url,
      categoryId: domain.categoryId,
      description: domain.description,
      language: domain.language,
      country: domain.country,
      domainRating: domain.domainRating,
      domainAuthority: domain.domainAuthority,
      pageAuthority: domain.pageAuthority,
      trustFlow: domain.trustFlow,
      citationFlow: domain.citationFlow,
      organicTraffic: domain.organicTraffic,
      referringDomains: domain.referringDomains,
      spamScore: domain.spamScore,
      guestPostPrice: domain.guestPostPrice,
      linkInsertionPrice: domain.linkInsertionPrice,
      contentWritingIncluded: domain.contentWritingIncluded,
      contentWritingPrice: domain.contentWritingPrice,
      minWordCount: domain.minWordCount,
      maxWordCount: domain.maxWordCount,
      turnaroundTimeDays: domain.turnaroundTimeDays,
      contentRequirements: domain.contentRequirements,
      prohibitedNiches: domain.prohibitedNiches,
      allowedLinkTypes: domain.allowedLinkTypes,
      maxOutboundLinks: domain.maxOutboundLinks,
      verificationStatus: domain.verificationStatus,
      isActive: domain.isActive,
      isFeatured: domain.isFeatured,
      domainType: domain.domainType,
    });

    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.categories);
        }
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, [domain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving domain:', error);
      alert('Failed to save domain');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Domain, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">Edit Domain</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name</label>
                <input
                  type="text"
                  value={formData.domainName || ''}
                  onChange={(e) => handleChange('domainName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => handleChange('url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => handleChange('categoryId', e.target.value || null)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Type</label>
                <select
                  value={formData.domainType || 'owner'}
                  onChange={(e) => handleChange('domainType', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                >
                  <option value="owner">Owner</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <input
                  type="text"
                  value={formData.language || ''}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                <select
                  value={formData.verificationStatus || 'pending'}
                  onChange={(e) => handleChange('verificationStatus', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured || false}
                    onChange={(e) => handleChange('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured</span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={3}
              />
            </div>
          </div>

          {/* SEO Metrics */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">SEO Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating</label>
                <input
                  type="number"
                  value={formData.domainRating || 0}
                  onChange={(e) => handleChange('domainRating', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Authority</label>
                <input
                  type="number"
                  value={formData.domainAuthority || 0}
                  onChange={(e) => handleChange('domainAuthority', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Authority</label>
                <input
                  type="number"
                  value={formData.pageAuthority || 0}
                  onChange={(e) => handleChange('pageAuthority', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spam Score</label>
                <input
                  type="number"
                  value={formData.spamScore || 0}
                  onChange={(e) => handleChange('spamScore', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trust Flow</label>
                <input
                  type="number"
                  value={formData.trustFlow || 0}
                  onChange={(e) => handleChange('trustFlow', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citation Flow</label>
                <input
                  type="number"
                  value={formData.citationFlow || 0}
                  onChange={(e) => handleChange('citationFlow', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organic Traffic</label>
                <input
                  type="number"
                  value={formData.organicTraffic || 0}
                  onChange={(e) => handleChange('organicTraffic', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referring Domains</label>
                <input
                  type="number"
                  value={formData.referringDomains || 0}
                  onChange={(e) => handleChange('referringDomains', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Pricing</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Post Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.guestPostPrice || ''}
                  onChange={(e) => handleChange('guestPostPrice', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Insertion Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.linkInsertionPrice || ''}
                  onChange={(e) => handleChange('linkInsertionPrice', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Writing Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.contentWritingPrice || ''}
                  onChange={(e) => handleChange('contentWritingPrice', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.contentWritingIncluded || false}
                  onChange={(e) => handleChange('contentWritingIncluded', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Content Writing Included</span>
              </label>
            </div>
          </div>

          {/* Content Requirements */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Content Requirements</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Word Count</label>
                <input
                  type="number"
                  value={formData.minWordCount || 500}
                  onChange={(e) => handleChange('minWordCount', parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Word Count</label>
                <input
                  type="number"
                  value={formData.maxWordCount || 2000}
                  onChange={(e) => handleChange('maxWordCount', parseInt(e.target.value) || 2000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround Days</label>
                <input
                  type="number"
                  value={formData.turnaroundTimeDays || 7}
                  onChange={(e) => handleChange('turnaroundTimeDays', parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Outbound Links</label>
                <input
                  type="number"
                  value={formData.maxOutboundLinks || 2}
                  onChange={(e) => handleChange('maxOutboundLinks', parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="1"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Requirements</label>
              <textarea
                value={formData.contentRequirements || ''}
                onChange={(e) => handleChange('contentRequirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
