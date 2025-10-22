'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X, Save } from 'lucide-react';

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

interface OfferingModalProps {
  domain: {
    _id: string;
    domainName: string;
  };
  offering: PublisherOffering;
  index: number;
  onClose: () => void;
  onSave: (domainId: string, offeringIndex: number, offering: PublisherOffering) => void;
  onApprove: (domainId: string, offeringIndex: number) => void;
  onReject: (domainId: string, offeringIndex: number) => void;
}

export default function OfferingModal({
  domain,
  offering,
  index,
  onClose,
  onSave,
  onApprove,
  onReject
}: OfferingModalProps) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<PublisherOffering>(offering);

  useEffect(() => {
    setEdited(offering);
  }, [offering]);

  const handleSave = () => {
    onSave(domain._id, index, edited);
    setEditing(false);
  };

  const updateField = (field: keyof PublisherOffering, value: any) => {
    setEdited(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Publisher Offering Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">{domain.domainName} - Offering #{index + 1}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEdited(offering);
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Publisher Info */}
          <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 mb-1">Publisher Name</div>
              <div className="text-sm font-medium text-gray-900">{edited.publisherName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Publisher Email</div>
              <div className="text-sm font-medium text-gray-900">{edited.publisherEmail || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Publisher ID</div>
              <div className="text-xs font-mono text-gray-700">{edited.publisherId || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-700 mb-2 block">Admin Approval</label>
                {editing ? (
                  <select
                    value={edited.adminApproved === true ? 'true' : edited.adminApproved === false ? 'false' : 'null'}
                    onChange={(e) => updateField('adminApproved', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  >
                    <option value="null">Pending</option>
                    <option value="true">Approved</option>
                    <option value="false">Rejected</option>
                  </select>
                ) : (
                  <>
                    {edited.adminApproved === true && <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>}
                    {edited.adminApproved === false && <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>}
                    {(edited.adminApproved === null || edited.adminApproved === undefined) && <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Pending</span>}
                  </>
                )}
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-700 mb-2 block">Active Status</label>
                {editing ? (
                  <select
                    value={edited.isActive ? 'true' : 'false'}
                    onChange={(e) => updateField('isActive', e.target.value === 'true')}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${edited.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {edited.isActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
            </div>

            {/* Rejection Reason */}
            {edited.adminApproved === false && edited.adminRejectionReason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <label className="text-xs font-semibold text-red-900 mb-1 block">Rejection Reason</label>
                <p className="text-sm text-red-700">{edited.adminRejectionReason}</p>
              </div>
            )}
          </div>

          {/* Services & Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Services & Pricing</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Guest Post */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-900">
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={edited.guestPostEnabled}
                        onChange={(e) => updateField('guestPostEnabled', e.target.checked)}
                        className="rounded"
                      />
                    ) : null}
                    Guest Post
                    {!editing && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${edited.guestPostEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {edited.guestPostEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </label>
                </div>
                {edited.guestPostEnabled && (
                  editing ? (
                    <input
                      type="number"
                      value={edited.guestPostPrice || ''}
                      onChange={(e) => updateField('guestPostPrice', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                      placeholder="Price"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">${edited.guestPostPrice}</div>
                  )
                )}
              </div>

              {/* Link Insertion */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-900">
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={edited.linkInsertionEnabled}
                        onChange={(e) => updateField('linkInsertionEnabled', e.target.checked)}
                        className="rounded"
                      />
                    ) : null}
                    Link Insertion
                    {!editing && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${edited.linkInsertionEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {edited.linkInsertionEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </label>
                </div>
                {edited.linkInsertionEnabled && (
                  editing ? (
                    <input
                      type="number"
                      value={edited.linkInsertionPrice || ''}
                      onChange={(e) => updateField('linkInsertionPrice', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                      placeholder="Price"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">${edited.linkInsertionPrice}</div>
                  )
                )}
              </div>

              {/* Content Writing */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-900">
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={edited.contentWritingEnabled}
                        onChange={(e) => updateField('contentWritingEnabled', e.target.checked)}
                        className="rounded"
                      />
                    ) : null}
                    Content Writing
                    {!editing && (
                      <>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${edited.contentWritingEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {edited.contentWritingEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {edited.contentWritingEnabled && (
                          <span className="text-xs text-gray-600">
                            {edited.contentWritingIncluded ? '• Included' : '• Additional fee'}
                          </span>
                        )}
                      </>
                    )}
                  </label>
                </div>
                {edited.contentWritingEnabled && (
                  <>
                    {editing ? (
                      <>
                        <input
                          type="number"
                          value={edited.contentWritingPrice || ''}
                          onChange={(e) => updateField('contentWritingPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg mb-2"
                          placeholder="Price"
                        />
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={edited.contentWritingIncluded}
                            onChange={(e) => updateField('contentWritingIncluded', e.target.checked)}
                            className="rounded"
                          />
                          Included in price
                        </label>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-gray-900">${edited.contentWritingPrice}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements & Restrictions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Domain Type</label>
                {editing ? (
                  <select
                    value={edited.domainType || ''}
                    onChange={(e) => updateField('domainType', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  >
                    <option value="">Select type</option>
                    <option value="owner">Owner</option>
                    <option value="reseller">Reseller</option>
                  </select>
                ) : (
                  <div className="text-sm text-gray-900 capitalize">{edited.domainType || 'N/A'}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Turnaround Time (days)</label>
                {editing ? (
                  <input
                    type="number"
                    value={edited.turnaroundTimeDays || ''}
                    onChange={(e) => updateField('turnaroundTimeDays', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  />
                ) : (
                  <div className="text-sm text-gray-900">{edited.turnaroundTimeDays || 'N/A'} days</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Max Outbound Links</label>
                {editing ? (
                  <input
                    type="number"
                    value={edited.maxOutboundLinks || ''}
                    onChange={(e) => updateField('maxOutboundLinks', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  />
                ) : (
                  <div className="text-sm text-gray-900">{edited.maxOutboundLinks || 'N/A'}</div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Allowed Link Types</label>
                {editing ? (
                  <input
                    type="text"
                    value={edited.allowedLinkTypes?.join(', ') || ''}
                    onChange={(e) => updateField('allowedLinkTypes', e.target.value.split(',').map(s => s.trim()))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    placeholder="e.g., dofollow, nofollow"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {edited.allowedLinkTypes?.map((type, i) => (
                      <span key={i} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Prohibited Niches</label>
                {editing ? (
                  <textarea
                    value={edited.prohibitedNiches?.join('\n') || ''}
                    onChange={(e) => updateField('prohibitedNiches', e.target.value.split('\n'))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    rows={3}
                    placeholder="One per line"
                  />
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-2 bg-red-50 border border-red-200 rounded-lg">
                    {edited.prohibitedNiches?.join('\n') || 'None'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Content Requirements</label>
                {editing ? (
                  <textarea
                    value={edited.contentRequirements || ''}
                    onChange={(e) => updateField('contentRequirements', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    rows={2}
                  />
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-2 bg-gray-50 rounded-lg">
                    {edited.contentRequirements || 'None'}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Example Posts</label>
                {editing ? (
                  <textarea
                    value={edited.examplePosts || ''}
                    onChange={(e) => updateField('examplePosts', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    rows={2}
                    placeholder="URLs, one per line"
                  />
                ) : (
                  <div className="text-sm text-gray-700 break-all p-2 bg-gray-50 rounded-lg">
                    {edited.examplePosts || 'None'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {!editing && (edited.adminApproved === null || edited.adminApproved === undefined) && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  onApprove(domain._id, index);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Offering
              </button>
              <button
                onClick={() => {
                  onReject(domain._id, index);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Reject Offering
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
