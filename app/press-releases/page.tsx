'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Globe, Plus, Search, RefreshCw, Edit, Trash2, Eye, X, Check, Link as LinkIcon, FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react';

type Tab = 'orders' | 'domains';

interface PressReleaseOrder {
  _id: string;
  orderId: string;
  buyerId: string;
  publisherId: string | null;
  pressReleaseDomainId: string;
  company: string;
  targetUrl: string;
  anchorText: string | null;
  articleTitle: string | null;
  articleContent: string | null;
  googleDocsLink: string | null;
  requestContentWriting: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  preferredPublishDate: string | null;
  specialRequirements: string | null;
  images: any;
  basePrice: number;
  contentWritingFee: number;
  platformFee: number;
  totalPrice: number;
  publisherEarnings: number;
  paymentProvider: string;
  paymentStatus: string;
  paidAt: string | null;
  status: string;
  publishedUrl: string | null;
  publishedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  deadlineAt: string | null;
  revisionRequested: boolean;
  revisionRequestedAt: string | null;
  revisionNotes: string | null;
  revisionCount: number;
  articleWritingStartedAt: string | null;
  articleSubmittedAt: string | null;
  articleRevisionRequestedAt: string | null;
  articleApprovedAt: string | null;
  articleGoogleDocsLink: string | null;
  articleRevisionNotes: string | null;
  articleRevisionCount: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
  refundStatus: string | null;
  refundedAmount: number | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface PressReleaseDomain {
  _id: string;
  domainName: string;
  url: string;
  price: number;
  category: string[];
  description: string | null;
  domainAuthority: number | null;
  domainRating: number | null;
  monthlyTraffic: number | null;
  country: string | null;
  language: string;
  turnaroundTimeDays: number;
  isActive: boolean;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PressReleasesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<PressReleaseOrder[]>([]);
  const [domains, setDomains] = useState<PressReleaseDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PressReleaseOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingDomain, setEditingDomain] = useState<PressReleaseDomain | null>(null);
  const [showEditDomainModal, setShowEditDomainModal] = useState(false);

  // Form states for order updates
  const [publishedUrl, setPublishedUrl] = useState('');
  const [articleGoogleDocsLink, setArticleGoogleDocsLink] = useState('');

  // Form states for domain
  const [domainForm, setDomainForm] = useState({
    domainName: '',
    url: '',
    price: '',
    category: '',
    description: '',
    domainAuthority: '',
    domainRating: '',
    monthlyTraffic: '',
    country: '',
    language: '',
    turnaroundTimeDays: '',
    isActive: true
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/press-releases/orders');
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/press-releases/domains');
      const data = await response.json();
      if (data.success) {
        setDomains(data.domains);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchDomains();
    }
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'pending_payment': 'bg-red-100 text-red-800 border border-red-200',
      'paid': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      'article_writing': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      'article_submitted': 'bg-purple-100 text-purple-800 border border-purple-200',
      'article_revision_requested': 'bg-orange-100 text-orange-800 border border-orange-200',
      'article_approved': 'bg-teal-100 text-teal-800 border border-teal-200',
      'accepted': 'bg-blue-100 text-blue-800 border border-blue-200',
      'rejected': 'bg-red-100 text-red-800 border border-red-200',
      'in_progress': 'bg-amber-100 text-amber-800 border border-amber-200',
      'submitted': 'bg-purple-100 text-purple-800 border border-purple-200',
      'completed': 'bg-green-100 text-green-800 border border-green-200',
      'revision_requested': 'bg-orange-100 text-orange-800 border border-orange-200',
      'cancelled': 'bg-red-100 text-red-800 border border-red-200',
      'refunded': 'bg-gray-100 text-gray-800 border border-gray-200',
      'refund_requested': 'bg-orange-100 text-orange-800 border border-orange-200',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const filteredOrders = orders.filter(order =>
    order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDomains = domains.filter(domain =>
    domain.domainName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openOrderModal = (order: PressReleaseOrder) => {
    setSelectedOrder(order);
    setPublishedUrl(order.publishedUrl || '');
    setArticleGoogleDocsLink(order.articleGoogleDocsLink || '');
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
    setPublishedUrl('');
    setArticleGoogleDocsLink('');
  };

  const updateOrderStatus = async (action: string, data?: any) => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/press-releases/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          action,
          ...data
        })
      });

      const result = await response.json();
      if (result.success) {
        await fetchOrders();
        if (result.order) {
          setSelectedOrder(result.order);
        }
        alert('Order updated successfully');
      } else {
        alert('Error updating order: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartWriting = () => {
    updateOrderStatus('start_writing');
  };

  const handleSubmitArticle = () => {
    if (!articleGoogleDocsLink.trim()) {
      alert('Please enter the Google Docs link for the article');
      return;
    }
    updateOrderStatus('submit_article', { articleGoogleDocsLink });
  };

  const handleApproveArticle = () => {
    updateOrderStatus('approve_article');
  };

  const handleSubmitPublished = () => {
    if (!publishedUrl.trim()) {
      alert('Please enter the published URL');
      return;
    }
    updateOrderStatus('submit_published', { publishedUrl });
  };

  const handleCompleteOrder = () => {
    if (!confirm('Mark this order as completed?')) return;
    updateOrderStatus('complete_order');
  };

  // Domain management functions
  const resetDomainForm = () => {
    setDomainForm({
      domainName: '',
      url: '',
      price: '',
      category: '',
      description: '',
      domainAuthority: '',
      domainRating: '',
      monthlyTraffic: '',
      country: '',
      language: '',
      turnaroundTimeDays: '',
      isActive: true
    });
  };

  const handleAddDomain = async () => {
    try {
      setUpdating(true);
      const payload = {
        domainName: domainForm.domainName,
        url: domainForm.url,
        price: parseFloat(domainForm.price),
        category: domainForm.category ? domainForm.category.split(',').map(c => c.trim()).filter(c => c) : [],
        description: domainForm.description || null,
        domainAuthority: domainForm.domainAuthority ? parseInt(domainForm.domainAuthority) : null,
        domainRating: domainForm.domainRating ? parseInt(domainForm.domainRating) : null,
        monthlyTraffic: domainForm.monthlyTraffic ? parseInt(domainForm.monthlyTraffic) : null,
        country: domainForm.country || null,
        language: domainForm.language || 'en',
        turnaroundTimeDays: domainForm.turnaroundTimeDays ? parseInt(domainForm.turnaroundTimeDays) : 7,
        isActive: domainForm.isActive
      };

      const response = await fetch('/api/press-releases/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        alert('Domain added successfully');
        setShowAddDomainModal(false);
        resetDomainForm();
        fetchDomains();
      } else {
        alert('Error adding domain: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      alert('Error adding domain');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditDomain = (domain: PressReleaseDomain) => {
    setEditingDomain(domain);
    setDomainForm({
      domainName: domain.domainName,
      url: domain.url,
      price: domain.price.toString(),
      category: Array.isArray(domain.category) ? domain.category.join(', ') : '',
      description: domain.description || '',
      domainAuthority: domain.domainAuthority?.toString() || '',
      domainRating: domain.domainRating?.toString() || '',
      monthlyTraffic: domain.monthlyTraffic?.toString() || '',
      country: domain.country || '',
      language: domain.language || '',
      turnaroundTimeDays: domain.turnaroundTimeDays.toString(),
      isActive: domain.isActive
    });
    setShowEditDomainModal(true);
  };

  const handleUpdateDomain = async () => {
    if (!editingDomain) return;

    try {
      setUpdating(true);
      const payload = {
        _id: editingDomain._id,
        domainName: domainForm.domainName,
        url: domainForm.url,
        price: parseFloat(domainForm.price),
        category: domainForm.category ? domainForm.category.split(',').map(c => c.trim()).filter(c => c) : [],
        description: domainForm.description || null,
        domainAuthority: domainForm.domainAuthority ? parseInt(domainForm.domainAuthority) : null,
        domainRating: domainForm.domainRating ? parseInt(domainForm.domainRating) : null,
        monthlyTraffic: domainForm.monthlyTraffic ? parseInt(domainForm.monthlyTraffic) : null,
        country: domainForm.country || null,
        language: domainForm.language || 'en',
        turnaroundTimeDays: domainForm.turnaroundTimeDays ? parseInt(domainForm.turnaroundTimeDays) : 7,
        isActive: domainForm.isActive
      };

      const response = await fetch('/api/press-releases/domains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        alert('Domain updated successfully');
        setShowEditDomainModal(false);
        setEditingDomain(null);
        resetDomainForm();
        fetchDomains();
      } else {
        alert('Error updating domain: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating domain:', error);
      alert('Error updating domain');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/press-releases/domains?_id=${domainId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        alert('Domain deleted successfully');
        fetchDomains();
      } else {
        alert('Error deleting domain: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert('Error deleting domain');
    }
  };

  return (
    <>
      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Order Details - {selectedOrder.orderId}</h3>
              <button
                onClick={closeOrderModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Company</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.company}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Order Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedOrder.paymentStatus)}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </p>
                </div>
                {selectedOrder.paidAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Paid At</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.paidAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Target URL</label>
                  <p className="mt-1 text-sm text-blue-600 break-all">{selectedOrder.targetUrl}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Anchor Text</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.anchorText || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.contactEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.contactPhone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Content Writing Requested</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.requestContentWriting ? 'Yes' : 'No'}</p>
                </div>
                {selectedOrder.preferredPublishDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Publish Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.preferredPublishDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Pricing Information */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Pricing Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Base Price</label>
                    <p className="mt-1 text-sm text-gray-900">${selectedOrder.basePrice}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Content Writing Fee</label>
                    <p className="mt-1 text-sm text-gray-900">${selectedOrder.contentWritingFee}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Platform Fee</label>
                    <p className="mt-1 text-sm text-gray-900">${selectedOrder.platformFee}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Price</label>
                    <p className="mt-1 text-sm font-semibold text-green-600">${selectedOrder.totalPrice}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Publisher Earnings</label>
                    <p className="mt-1 text-sm font-semibold text-blue-600">${selectedOrder.publisherEarnings}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Provider</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrder.paymentProvider}</p>
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              {selectedOrder.specialRequirements && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">Special Requirements</label>
                  <div className="mt-1 text-sm text-gray-900 p-3 bg-yellow-50 border border-yellow-200 rounded-lg whitespace-pre-wrap">
                    {selectedOrder.specialRequirements}
                  </div>
                </div>
              )}

              {/* Images */}
              {selectedOrder.images && Array.isArray(selectedOrder.images) && selectedOrder.images.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">Attached Images ({selectedOrder.images.length})</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedOrder.images.map((image: any, index: number) => (
                      <a
                        key={index}
                        href={typeof image === 'string' ? image : image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        Image {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Information */}
              {(selectedOrder.revisionRequested || selectedOrder.revisionCount > 0) && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Revision History</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Revision Count</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedOrder.revisionCount}</p>
                    </div>
                    {selectedOrder.revisionRequestedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Last Revision Requested</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.revisionRequestedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.revisionNotes && (
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-700">Revision Notes</label>
                      <div className="mt-1 text-sm text-gray-900 p-3 bg-orange-50 border border-orange-200 rounded-lg whitespace-pre-wrap">
                        {selectedOrder.revisionNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Article Revision Information */}
              {selectedOrder.requestContentWriting && (selectedOrder.articleRevisionCount > 0 || selectedOrder.articleRevisionNotes) && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Article Revision History</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Article Revision Count</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedOrder.articleRevisionCount}</p>
                    </div>
                    {selectedOrder.articleRevisionRequestedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Last Article Revision Requested</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.articleRevisionRequestedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.articleRevisionNotes && (
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-700">Article Revision Notes</label>
                      <div className="mt-1 text-sm text-gray-900 p-3 bg-orange-50 border border-orange-200 rounded-lg whitespace-pre-wrap">
                        {selectedOrder.articleRevisionNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Info */}
              {selectedOrder.cancelledAt && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-red-600 mb-3">Cancellation Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cancelled At</label>
                      <p className="mt-1 text-sm text-gray-900">{new Date(selectedOrder.cancelledAt).toLocaleString()}</p>
                    </div>
                    {selectedOrder.refundStatus && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Refund Status</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedOrder.refundStatus}</p>
                      </div>
                    )}
                    {selectedOrder.refundedAmount && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Refunded Amount</label>
                        <p className="mt-1 text-sm text-red-600 font-semibold">${selectedOrder.refundedAmount}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.cancellationReason && (
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-700">Cancellation Reason</label>
                      <div className="mt-1 text-sm text-gray-900 p-3 bg-red-50 border border-red-200 rounded-lg whitespace-pre-wrap">
                        {selectedOrder.cancellationReason}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Order Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedOrder.articleWritingStartedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileEdit className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600">Writing Started:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.articleWritingStartedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.articleSubmittedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">Article Submitted:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.articleSubmittedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.articleApprovedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Article Approved:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.articleApprovedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.submittedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-600">Submitted for Publishing:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.submittedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.publishedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Published:</span>
                      <span className="text-gray-900">{new Date(selectedOrder.publishedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* User Provided Content (when content writing not requested) */}
              {!selectedOrder.requestContentWriting && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900">User Provided Content</h4>

                  {selectedOrder.articleTitle && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Article Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedOrder.articleTitle}</p>
                    </div>
                  )}

                  {selectedOrder.articleContent && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Article Content</label>
                      <div className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {selectedOrder.articleContent}
                      </div>
                    </div>
                  )}

                  {selectedOrder.googleDocsLink && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Google Docs Link</label>
                      <a
                        href={selectedOrder.googleDocsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:underline break-all block"
                      >
                        {selectedOrder.googleDocsLink}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Article Google Docs Link (for content writing requested) */}
              {selectedOrder.requestContentWriting && selectedOrder.articleGoogleDocsLink && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">Article Google Docs (Admin Created)</label>
                  <a
                    href={selectedOrder.articleGoogleDocsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:underline break-all block"
                  >
                    {selectedOrder.articleGoogleDocsLink}
                  </a>
                </div>
              )}

              {/* Published URL */}
              {selectedOrder.publishedUrl && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">Published URL</label>
                  <a
                    href={selectedOrder.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:underline break-all block"
                  >
                    {selectedOrder.publishedUrl}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Actions</h4>

                {/* Start Writing Article */}
                {selectedOrder.requestContentWriting && !selectedOrder.articleWritingStartedAt && (
                  <button
                    onClick={handleStartWriting}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    <FileEdit className="w-4 h-4" />
                    Start Writing Article
                  </button>
                )}

                {/* Submit Article (First submission or resubmission after article revision) */}
                {selectedOrder.requestContentWriting && selectedOrder.articleWritingStartedAt && (!selectedOrder.articleSubmittedAt || selectedOrder.status === 'article_revision_requested') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Article Google Docs Link</label>
                    <input
                      type="url"
                      value={articleGoogleDocsLink}
                      onChange={(e) => setArticleGoogleDocsLink(e.target.value)}
                      placeholder="https://docs.google.com/document/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSubmitArticle}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {selectedOrder.status === 'article_revision_requested' ? 'Resubmit Updated Article' : 'Submit Article for Review'}
                    </button>
                  </div>
                )}

                {/* Approve Article */}
                {selectedOrder.requestContentWriting && selectedOrder.articleSubmittedAt && !selectedOrder.articleApprovedAt && selectedOrder.status !== 'article_revision_requested' && (
                  <button
                    onClick={handleApproveArticle}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve Article
                  </button>
                )}

                {/* Submit Published URL (First submission or resubmission after revision) */}
                {(!selectedOrder.requestContentWriting || selectedOrder.articleApprovedAt) && (!selectedOrder.publishedUrl || selectedOrder.status === 'revision_requested') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Published URL</label>
                    <input
                      type="url"
                      value={publishedUrl}
                      onChange={(e) => setPublishedUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSubmitPublished}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                    >
                      <LinkIcon className="w-4 h-4" />
                      {selectedOrder.status === 'revision_requested' ? 'Submit Work Again' : 'Submit Published Link'}
                    </button>
                  </div>
                )}

                {/* Complete Order */}
                {selectedOrder.publishedUrl && selectedOrder.status !== 'completed' && selectedOrder.status !== 'revision_requested' && (
                  <button
                    onClick={handleCompleteOrder}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-200">
              <button
                onClick={closeOrderModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-lg md:text-3xl font-bold text-gray-900">Press Release Management</h1>
          <button
            onClick={() => activeTab === 'orders' ? fetchOrders() : fetchDomains()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === 'domains'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="w-5 h-5" />
            PR Domains
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        {activeTab === 'domains' && (
          <button
            onClick={() => setShowAddDomainModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </button>
        )}
      </div>

      {/* Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Total Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Created</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.orderId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.company}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">${order.totalPrice}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Domains Table */}
      {activeTab === 'domains' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filteredDomains.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No domains found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Domain Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">DR</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">DA</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Traffic</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDomains.map((domain) => (
                    <tr key={domain._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{domain.domainName}</div>
                        <div className="text-xs text-gray-500">{domain.url}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">${domain.price}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-medium">{domain.domainRating || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-medium">{domain.domainAuthority || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium">{domain.monthlyTraffic || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{domain.country || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          domain.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {domain.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditDomain(domain)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Domain"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(domain._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Domain"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* Add Domain Modal */}
      {showAddDomainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New PR Domain</h2>
              <button
                onClick={() => {
                  setShowAddDomainModal(false);
                  resetDomainForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
                  <input
                    type="text"
                    value={domainForm.domainName}
                    onChange={(e) => setDomainForm({ ...domainForm, domainName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input
                    type="url"
                    value={domainForm.url}
                    onChange={(e) => setDomainForm({ ...domainForm, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    value={domainForm.price}
                    onChange={(e) => setDomainForm({ ...domainForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (comma-separated)</label>
                  <input
                    type="text"
                    value={domainForm.category}
                    onChange={(e) => setDomainForm({ ...domainForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Technology, Business, News"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={domainForm.description}
                    onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the domain..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating (DR)</label>
                  <input
                    type="number"
                    value={domainForm.domainRating}
                    onChange={(e) => setDomainForm({ ...domainForm, domainRating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Authority (DA)</label>
                  <input
                    type="number"
                    value={domainForm.domainAuthority}
                    onChange={(e) => setDomainForm({ ...domainForm, domainAuthority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Traffic</label>
                  <input
                    type="number"
                    value={domainForm.monthlyTraffic}
                    onChange={(e) => setDomainForm({ ...domainForm, monthlyTraffic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={domainForm.country}
                    onChange={(e) => setDomainForm({ ...domainForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <input
                    type="text"
                    value={domainForm.language}
                    onChange={(e) => setDomainForm({ ...domainForm, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround Days</label>
                  <input
                    type="number"
                    value={domainForm.turnaroundTimeDays}
                    onChange={(e) => setDomainForm({ ...domainForm, turnaroundTimeDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="7"
                    min="1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={domainForm.isActive}
                    onChange={(e) => setDomainForm({ ...domainForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Domain</label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddDomainModal(false);
                  resetDomainForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDomain}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Domain Modal */}
      {showEditDomainModal && editingDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit PR Domain</h2>
              <button
                onClick={() => {
                  setShowEditDomainModal(false);
                  setEditingDomain(null);
                  resetDomainForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
                  <input
                    type="text"
                    value={domainForm.domainName}
                    onChange={(e) => setDomainForm({ ...domainForm, domainName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input
                    type="url"
                    value={domainForm.url}
                    onChange={(e) => setDomainForm({ ...domainForm, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    value={domainForm.price}
                    onChange={(e) => setDomainForm({ ...domainForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (comma-separated)</label>
                  <input
                    type="text"
                    value={domainForm.category}
                    onChange={(e) => setDomainForm({ ...domainForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Technology, Business, News"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={domainForm.description}
                    onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the domain..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating (DR)</label>
                  <input
                    type="number"
                    value={domainForm.domainRating}
                    onChange={(e) => setDomainForm({ ...domainForm, domainRating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Authority (DA)</label>
                  <input
                    type="number"
                    value={domainForm.domainAuthority}
                    onChange={(e) => setDomainForm({ ...domainForm, domainAuthority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Traffic</label>
                  <input
                    type="number"
                    value={domainForm.monthlyTraffic}
                    onChange={(e) => setDomainForm({ ...domainForm, monthlyTraffic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={domainForm.country}
                    onChange={(e) => setDomainForm({ ...domainForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <input
                    type="text"
                    value={domainForm.language}
                    onChange={(e) => setDomainForm({ ...domainForm, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround Days</label>
                  <input
                    type="number"
                    value={domainForm.turnaroundTimeDays}
                    onChange={(e) => setDomainForm({ ...domainForm, turnaroundTimeDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="7"
                    min="1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActiveEdit"
                    checked={domainForm.isActive}
                    onChange={(e) => setDomainForm({ ...domainForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-700">Active Domain</label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditDomainModal(false);
                  setEditingDomain(null);
                  resetDomainForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDomain}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Update Domain
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
