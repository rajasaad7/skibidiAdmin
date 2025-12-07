'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Edit2, X, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Order {
  _id: string;
  orderNumber: string;
  buyerId: string;
  publisherId: string;
  domainId: string;
  status: string;
  serviceType: string;
  // Price fields
  basePrice: number;
  platformFee: number;
  totalPrice: number;
  publisherEarnings: number;
  contentWritingFee?: number;
  requestContentWriting?: boolean;
  // Payment fields
  paymentMethod?: string;
  paymentStatus?: string;
  paddleTransactionId?: string;
  stripeTransactionId?: string;
  stripeSessionId?: string;
  paidAt?: string;
  // Dates
  createdAt: string;
  updatedAt?: string;
  // Buyer submission fields
  articleTitle?: string;
  articleContent?: string;
  specialRequirements?: string;
  targetUrl?: string;
  anchorText?: string;
  googleDocsLink?: string;
  // Seller submission fields
  publishedUrl?: string;
  completionNotes?: string;
  submittedAt?: string;
  // Status timestamps
  acceptedAt?: string;
  rejectedAt?: string;
  revisionRequestedAt?: string;
  completedAt?: string;
  deadlineAt?: string;
  // Remarks
  rejectionReason?: string;
  refundReason?: string;
  refundedAmount?: number;
  refundRequestedAt?: string;
  refundedAt?: string;
  // Relations
  domains?: {
    domainName: string;
  };
  buyer?: {
    fullName: string;
    email: string;
  };
  seller?: {
    fullName: string;
    email: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [serviceTypeFilters, setServiceTypeFilters] = useState<string[]>(['guest_post', 'link_insertion', 'featured_domain']);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Core order fields
  const [serviceType, setServiceType] = useState<string>('');
  const [buyerId, setBuyerId] = useState<string>('');
  const [publisherId, setPublisherId] = useState<string>('');
  const [domainId, setDomainId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('');

  // Price fields
  const [basePrice, setBasePrice] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [publisherEarnings, setPublisherEarnings] = useState<string>('');
  const [contentWritingFee, setContentWritingFee] = useState<string>('');
  const [requestContentWriting, setRequestContentWriting] = useState<boolean>(false);

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [paddleTransactionId, setPaddleTransactionId] = useState<string>('');
  const [stripeTransactionId, setStripeTransactionId] = useState<string>('');
  const [stripeSessionId, setStripeSessionId] = useState<string>('');

  // Buyer content fields
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleContent, setArticleContent] = useState<string>('');
  const [specialRequirements, setSpecialRequirements] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [anchorText, setAnchorText] = useState<string>('');
  const [googleDocsLink, setGoogleDocsLink] = useState<string>('');

  // Seller fields
  const [publishedUrl, setPublishedUrl] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('');

  // Admin remarks
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  // Edit mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Name lookups for verification
  const [domainName, setDomainName] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [publisherName, setPublisherName] = useState<string>('');

  // Delete modal
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (data.success) {
        setAllOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching all orders:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/orders'
        : `/api/orders?status=${filter}`;
      const response = await fetch(url);
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

  useEffect(() => {
    fetchAllOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const toggleServiceTypeFilter = (type: string) => {
    setServiceTypeFilters(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const getStatusCount = (status: string) => {
    let filteredOrders = allOrders;

    // Apply service type filter
    if (serviceTypeFilters.length > 0) {
      filteredOrders = filteredOrders.filter(order => serviceTypeFilters.includes(order.serviceType));
    }

    if (status === 'all') return filteredOrders.length;
    return filteredOrders.filter(order => order.status === status).length;
  };

  const getFilteredOrders = () => {
    let filteredOrders = orders;

    // Apply service type filter
    if (serviceTypeFilters.length > 0) {
      filteredOrders = filteredOrders.filter(order => serviceTypeFilters.includes(order.serviceType));
    }

    return filteredOrders;
  };

  const handleUpdateStatus = async () => {
    if (!editingOrder || !newStatus) return;

    setIsSaving(true);
    try {
      const payload: any = {
        orderId: editingOrder._id,
        status: newStatus,
      };

      // Core order fields
      if (serviceType !== editingOrder.serviceType) payload.serviceType = serviceType;
      if (buyerId !== editingOrder.buyerId) payload.buyerId = buyerId;
      if (publisherId !== editingOrder.publisherId) payload.publisherId = publisherId;
      if (domainId !== editingOrder.domainId) payload.domainId = domainId;

      // Price fields
      if (basePrice !== editingOrder.basePrice?.toString()) payload.basePrice = parseFloat(basePrice);
      if (platformFee !== editingOrder.platformFee?.toString()) payload.platformFee = parseFloat(platformFee);
      if (totalPrice !== editingOrder.totalPrice?.toString()) payload.totalPrice = parseFloat(totalPrice);
      if (publisherEarnings !== editingOrder.publisherEarnings?.toString()) payload.publisherEarnings = parseFloat(publisherEarnings);
      if (contentWritingFee !== (editingOrder.contentWritingFee?.toString() || '')) payload.contentWritingFee = contentWritingFee ? parseFloat(contentWritingFee) : null;
      if (requestContentWriting !== editingOrder.requestContentWriting) payload.requestContentWriting = requestContentWriting;

      // Payment fields
      if (paymentMethod !== (editingOrder.paymentMethod || '')) payload.paymentMethod = paymentMethod;
      if (paymentStatus !== (editingOrder.paymentStatus || '')) payload.paymentStatus = paymentStatus;
      if (paddleTransactionId !== (editingOrder.paddleTransactionId || '')) payload.paddleTransactionId = paddleTransactionId;
      if (stripeTransactionId !== (editingOrder.stripeTransactionId || '')) payload.stripeTransactionId = stripeTransactionId;
      if (stripeSessionId !== (editingOrder.stripeSessionId || '')) payload.stripeSessionId = stripeSessionId;

      // Buyer content fields
      if (articleTitle !== (editingOrder.articleTitle || '')) payload.articleTitle = articleTitle;
      if (articleContent !== (editingOrder.articleContent || '')) payload.articleContent = articleContent;
      if (specialRequirements !== (editingOrder.specialRequirements || '')) payload.specialRequirements = specialRequirements;
      if (targetUrl !== (editingOrder.targetUrl || '')) payload.targetUrl = targetUrl;
      if (anchorText !== (editingOrder.anchorText || '')) payload.anchorText = anchorText;
      if (googleDocsLink !== (editingOrder.googleDocsLink || '')) payload.googleDocsLink = googleDocsLink;

      // Seller fields
      if (publishedUrl !== (editingOrder.publishedUrl || '')) payload.publishedUrl = publishedUrl;
      if (completionNotes !== (editingOrder.completionNotes || '')) payload.completionNotes = completionNotes;

      // Add relevant fields based on status
      if (newStatus === 'revision_requested' && adminRemarks) {
        payload.rejectionReason = adminRemarks;
      }
      if (newStatus === 'rejected' && adminRemarks) {
        payload.rejectionReason = adminRemarks;
      }
      if (newStatus === 'completed' && adminRemarks) {
        payload.completionNotes = completionNotes || adminRemarks;
      }
      if (newStatus === 'refunded' || newStatus === 'refund_requested') {
        if (adminRemarks) payload.refundReason = adminRemarks;
        if (refundAmount) payload.refundedAmount = parseFloat(refundAmount);
      }

      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Update the editingOrder object with new values
        const updatedOrder = { ...editingOrder };
        if (payload.serviceType) updatedOrder.serviceType = payload.serviceType;
        if (payload.buyerId) updatedOrder.buyerId = payload.buyerId;
        if (payload.publisherId) updatedOrder.publisherId = payload.publisherId;
        if (payload.domainId) updatedOrder.domainId = payload.domainId;
        if (payload.status) updatedOrder.status = payload.status;
        if (payload.basePrice) updatedOrder.basePrice = payload.basePrice;
        if (payload.platformFee) updatedOrder.platformFee = payload.platformFee;
        if (payload.totalPrice) updatedOrder.totalPrice = payload.totalPrice;
        if (payload.publisherEarnings) updatedOrder.publisherEarnings = payload.publisherEarnings;
        setEditingOrder(updatedOrder);

        // Refresh the domain and user names if IDs were changed
        if (payload.domainId) {
          await fetchDomainName(domainId);
        }
        if (payload.buyerId) {
          await fetchUserName(buyerId, 'buyer');
        }
        if (payload.publisherId) {
          await fetchUserName(publisherId, 'publisher');
        }

        // Refresh order lists in background
        fetchOrders();
        fetchAllOrders();

        setIsEditMode(false);
        setIsSaving(false);
        toast.success('Order updated successfully!');
      } else {
        setIsSaving(false);
        toast.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setIsSaving(false);
      toast.error('Error updating order');
    }
  };

  const fetchDomainName = async (id: string) => {
    if (!id || id.trim() === '') {
      setDomainName('');
      return;
    }
    try {
      const response = await fetch(`/api/domains?id=${id}`);
      const data = await response.json();
      if (data.success && data.domains && data.domains.length > 0) {
        setDomainName(data.domains[0].domainName);
      } else {
        setDomainName('❌ Domain not found');
      }
    } catch (error) {
      setDomainName('❌ Error fetching domain');
    }
  };

  const fetchUserName = async (id: string, type: 'buyer' | 'publisher') => {
    if (!id || id.trim() === '') {
      if (type === 'buyer') setBuyerName('');
      else setPublisherName('');
      return;
    }
    try {
      const response = await fetch(`/api/users?id=${id}`);
      const data = await response.json();
      if (data.success && data.users && data.users.length > 0) {
        const userName = `${data.users[0].fullName} (${data.users[0].email})`;
        if (type === 'buyer') setBuyerName(userName);
        else setPublisherName(userName);
      } else {
        if (type === 'buyer') setBuyerName('❌ User not found');
        else setPublisherName('❌ User not found');
      }
    } catch (error) {
      if (type === 'buyer') setBuyerName('❌ Error fetching user');
      else setPublisherName('❌ Error fetching user');
    }
  };

  const resetFormFields = () => {
    setEditingOrder(null);
    setServiceType('');
    setBuyerId('');
    setPublisherId('');
    setDomainId('');
    setNewStatus('');
    setBasePrice('');
    setPlatformFee('');
    setTotalPrice('');
    setPublisherEarnings('');
    setContentWritingFee('');
    setRequestContentWriting(false);
    setPaymentMethod('');
    setPaymentStatus('');
    setPaddleTransactionId('');
    setStripeTransactionId('');
    setStripeSessionId('');
    setArticleTitle('');
    setArticleContent('');
    setSpecialRequirements('');
    setTargetUrl('');
    setAnchorText('');
    setGoogleDocsLink('');
    setPublishedUrl('');
    setCompletionNotes('');
    setAdminRemarks('');
    setRefundAmount('');
    setIsEditMode(false);
    setDomainName('');
    setBuyerName('');
    setPublisherName('');
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/orders/${deletingOrder._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeletingOrder(null);
        fetchOrders();
        fetchAllOrders();
        toast.success('Order deleted successfully!');
      } else {
        toast.error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error deleting order');
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'paid', label: 'Paid' },
    { value: 'article_writing', label: 'Article Writing' },
    { value: 'article_submitted', label: 'Article Submitted' },
    { value: 'article_revision_requested', label: 'Article Revision Requested' },
    { value: 'article_approved', label: 'Article Approved' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'revision_requested', label: 'Revision Requested' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refund_requested', label: 'Refund Requested' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'disputed', label: 'Disputed' },
  ];

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-lg md:text-3xl font-bold text-gray-900">Order Management</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {['guest_post', 'link_insertion', 'featured_domain'].map((type) => (
            <button
              key={`service-${type}`}
              onClick={() => toggleServiceTypeFilter(type)}
              className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-xs md:text-base font-medium transition ${
                serviceTypeFilters.includes(type)
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
          <button
            onClick={() => {
              fetchOrders();
              fetchAllOrders();
            }}
            className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 text-xs md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {['all', 'paid', 'in_progress', 'submitted', 'completed', 'cancelled', 'refunded'].map((status) => (
          <button
            key={`filter-${status}`}
            onClick={() => setFilter(status)}
            className={`p-4 rounded-xl font-medium transition border-2 ${
              filter === status
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${filter === status ? 'text-white' : 'text-blue-600'}`}>
                {getStatusCount(status)}
              </div>
              <div className="text-sm">
                {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Domain</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Service</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : getFilteredOrders().length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                getFilteredOrders().map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.domains?.domainName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.serviceType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'paid' || order.status === 'in_progress' || order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                        order.status === 'revision_requested' || order.status === 'refund_requested' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {order.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ${order.totalPrice?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            // Core fields
                            setServiceType(order.serviceType);
                            setBuyerId(order.buyerId);
                            setPublisherId(order.publisherId);
                            setDomainId(order.domainId);
                            setNewStatus(order.status);
                            // Price fields
                            setBasePrice(order.basePrice.toString());
                            setPlatformFee(order.platformFee.toString());
                            setTotalPrice(order.totalPrice.toString());
                            setPublisherEarnings(order.publisherEarnings.toString());
                            setContentWritingFee(order.contentWritingFee?.toString() || '');
                            setRequestContentWriting(order.requestContentWriting || false);
                            // Payment fields
                            setPaymentMethod(order.paymentMethod || 'paddle');
                            setPaymentStatus(order.paymentStatus || 'pending');
                            setPaddleTransactionId(order.paddleTransactionId || '');
                            setStripeTransactionId(order.stripeTransactionId || '');
                            setStripeSessionId(order.stripeSessionId || '');
                            // Buyer content
                            setArticleTitle(order.articleTitle || '');
                            setArticleContent(order.articleContent || '');
                            setSpecialRequirements(order.specialRequirements || '');
                            setTargetUrl(order.targetUrl || '');
                            setAnchorText(order.anchorText || '');
                            setGoogleDocsLink(order.googleDocsLink || '');
                            // Seller fields
                            setPublishedUrl(order.publishedUrl || '');
                            setCompletionNotes(order.completionNotes || '');
                            // Admin
                            setAdminRemarks('');
                            setRefundAmount('');
                            // Edit mode
                            setIsEditMode(false);
                            // Clear fetched names - we'll use the order object data instead
                            setDomainName('');
                            setBuyerName('');
                            setPublisherName('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                          title="Manage Order"
                        >
                          <Edit2 className="w-3 h-3" />
                          Manage
                        </button>
                        <button
                          onClick={() => setDeletingOrder(order)}
                          className="inline-flex items-center p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Order Management Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Manage Order - {editingOrder.orderNumber}</h3>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <>
                    <button
                      onClick={async () => {
                        setIsRefreshing(true);
                        try {
                          // Refresh order data from database
                          const response = await fetch('/api/orders');
                          const data = await response.json();
                          if (data.success) {
                            const refreshedOrder = data.orders.find((o: Order) => o._id === editingOrder._id);
                            if (refreshedOrder) {
                              setEditingOrder(refreshedOrder);
                              // Update all form fields with fresh data
                              setServiceType(refreshedOrder.serviceType);
                              setBuyerId(refreshedOrder.buyerId);
                              setPublisherId(refreshedOrder.publisherId);
                              setDomainId(refreshedOrder.domainId);
                              setNewStatus(refreshedOrder.status);
                              setBasePrice(refreshedOrder.basePrice.toString());
                              setPlatformFee(refreshedOrder.platformFee.toString());
                              setTotalPrice(refreshedOrder.totalPrice.toString());
                              setPublisherEarnings(refreshedOrder.publisherEarnings.toString());
                              setContentWritingFee(refreshedOrder.contentWritingFee?.toString() || '');
                              setRequestContentWriting(refreshedOrder.requestContentWriting || false);
                              setPaymentMethod(refreshedOrder.paymentMethod || 'paddle');
                              setPaymentStatus(refreshedOrder.paymentStatus || 'pending');
                              setPaddleTransactionId(refreshedOrder.paddleTransactionId || '');
                              setStripeTransactionId(refreshedOrder.stripeTransactionId || '');
                              setStripeSessionId(refreshedOrder.stripeSessionId || '');
                              setArticleTitle(refreshedOrder.articleTitle || '');
                              setArticleContent(refreshedOrder.articleContent || '');
                              setSpecialRequirements(refreshedOrder.specialRequirements || '');
                              setTargetUrl(refreshedOrder.targetUrl || '');
                              setAnchorText(refreshedOrder.anchorText || '');
                              setGoogleDocsLink(refreshedOrder.googleDocsLink || '');
                              setPublishedUrl(refreshedOrder.publishedUrl || '');
                              setCompletionNotes(refreshedOrder.completionNotes || '');
                              setDomainName('');
                              setBuyerName('');
                              setPublisherName('');
                              toast.success('Order data refreshed!');
                            }
                          }
                        } catch (error) {
                          toast.error('Failed to refresh order data');
                        } finally {
                          setIsRefreshing(false);
                        }
                      }}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel Edit
                  </button>
                )}
                <button
                  onClick={resetFormFields}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Core Order Details */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Core Order Details</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type
                    </label>
                    {!isEditMode ? (
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                        {serviceType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </div>
                    ) : (
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="guest_post">Guest Post</option>
                        <option value="link_insertion">Link Insertion</option>
                        <option value="featured_domain">Featured Domain</option>
                        <option value="press_release">Press Release</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain
                    </label>
                    {!isEditMode ? (
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                        {editingOrder.domains?.domainName || domainName || 'N/A'}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={domainId}
                          onChange={(e) => {
                            setDomainId(e.target.value);
                            fetchDomainName(e.target.value);
                          }}
                          placeholder="Paste domain ID..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {domainName && (
                          <p className={`mt-1 text-xs ${domainName.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>
                            {domainName}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buyer
                    </label>
                    {!isEditMode ? (
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                        {editingOrder.buyer ? `${editingOrder.buyer.fullName} (${editingOrder.buyer.email})` : buyerName || 'N/A'}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={buyerId}
                          onChange={(e) => {
                            setBuyerId(e.target.value);
                            fetchUserName(e.target.value, 'buyer');
                          }}
                          placeholder="Paste buyer ID..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {buyerName && (
                          <p className={`mt-1 text-xs ${buyerName.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>
                            {buyerName}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Publisher
                    </label>
                    {!isEditMode ? (
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                        {editingOrder.seller ? `${editingOrder.seller.fullName} (${editingOrder.seller.email})` : publisherName || 'N/A'}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={publisherId}
                          onChange={(e) => {
                            setPublisherId(e.target.value);
                            fetchUserName(e.target.value, 'publisher');
                          }}
                          placeholder="Paste publisher ID..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {publisherName && (
                          <p className={`mt-1 text-xs ${publisherName.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>
                            {publisherName}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Pricing Information</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={platformFee}
                      onChange={(e) => setPlatformFee(e.target.value)}
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Publisher Earnings
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={publisherEarnings}
                      onChange={(e) => setPublisherEarnings(e.target.value)}
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Writing Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={contentWritingFee}
                      onChange={(e) => setContentWritingFee(e.target.value)}
                      placeholder="0.00"
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="requestContentWriting"
                      checked={requestContentWriting}
                      onChange={(e) => setRequestContentWriting(e.target.checked)}
                      disabled={!isEditMode}
                      className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor="requestContentWriting" className="ml-2 text-sm font-medium text-gray-700">
                      Request Content Writing
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Information</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="paddle">Paddle</option>
                      <option value="stripe">Stripe</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      disabled={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paddle Transaction ID
                    </label>
                    <input
                      type="text"
                      value={paddleTransactionId}
                      onChange={(e) => setPaddleTransactionId(e.target.value)}
                      placeholder="txn_..."
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stripe Transaction ID
                    </label>
                    <input
                      type="text"
                      value={stripeTransactionId}
                      onChange={(e) => setStripeTransactionId(e.target.value)}
                      placeholder="pi_..."
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stripe Session ID
                    </label>
                    <input
                      type="text"
                      value={stripeSessionId}
                      onChange={(e) => setStripeSessionId(e.target.value)}
                      placeholder="cs_..."
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* Buyer Submitted Content */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Buyer Submitted Content</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Article Title
                  </label>
                  <input
                    type="text"
                    value={articleTitle}
                    onChange={(e) => setArticleTitle(e.target.value)}
                    placeholder="Article title..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Article Content
                  </label>
                  <textarea
                    value={articleContent}
                    onChange={(e) => setArticleContent(e.target.value)}
                    placeholder="Full article content..."
                    rows={6}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target URL
                    </label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/target-page"
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anchor Text
                    </label>
                    <input
                      type="text"
                      value={anchorText}
                      onChange={(e) => setAnchorText(e.target.value)}
                      placeholder="Anchor text for the link..."
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Docs Link
                  </label>
                  <input
                    type="url"
                    value={googleDocsLink}
                    onChange={(e) => setGoogleDocsLink(e.target.value)}
                    placeholder="https://docs.google.com/document/..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requirements
                  </label>
                  <textarea
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    placeholder="Any special instructions or requirements..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Seller Submitted Content */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Seller Submission</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Published URL
                  </label>
                  <input
                    type="url"
                    value={publishedUrl}
                    onChange={(e) => setPublishedUrl(e.target.value)}
                    placeholder="https://example.com/published-article"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Completion Notes
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Notes about the completed work..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {editingOrder.submittedAt && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Submitted At:</span> {new Date(editingOrder.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Status Management */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Status Management</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refund Amount */}
                {(newStatus === 'refunded' || newStatus === 'refund_requested') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      readOnly={!isEditMode}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isEditMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                )}

                {/* Admin Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Remarks
                    {(newStatus === 'revision_requested' || newStatus === 'rejected') && (
                      <span className="text-red-600 ml-1">*</span>
                    )}
                  </label>
                  <textarea
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder={
                      newStatus === 'revision_requested' ? 'Explain what needs to be revised...' :
                      newStatus === 'rejected' ? 'Explain the reason for rejection...' :
                      newStatus === 'refunded' || newStatus === 'refund_requested' ? 'Explain the reason for refund...' :
                      'Add any admin notes or remarks...'
                    }
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Timestamps */}
              {(editingOrder.acceptedAt || editingOrder.rejectedAt || editingOrder.revisionRequestedAt || editingOrder.completedAt) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Timestamps</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {editingOrder.acceptedAt && (
                      <div>
                        <span className="text-blue-800 font-medium">Accepted:</span>
                        <span className="text-blue-700 ml-2">{new Date(editingOrder.acceptedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {editingOrder.rejectedAt && (
                      <div>
                        <span className="text-blue-800 font-medium">Rejected:</span>
                        <span className="text-blue-700 ml-2">{new Date(editingOrder.rejectedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {editingOrder.revisionRequestedAt && (
                      <div>
                        <span className="text-blue-800 font-medium">Revision Requested:</span>
                        <span className="text-blue-700 ml-2">{new Date(editingOrder.revisionRequestedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {editingOrder.completedAt && (
                      <div>
                        <span className="text-blue-800 font-medium">Completed:</span>
                        <span className="text-blue-700 ml-2">{new Date(editingOrder.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previous Remarks */}
              {(editingOrder.rejectionReason || editingOrder.refundReason) && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">Previous Remarks</h4>
                  <div className="space-y-2">
                    {editingOrder.rejectionReason && (
                      <div className="text-sm">
                        <span className="font-medium text-yellow-800">Rejection Reason:</span>
                        <p className="text-yellow-700 mt-1">{editingOrder.rejectionReason}</p>
                      </div>
                    )}
                    {editingOrder.refundReason && (
                      <div className="text-sm">
                        <span className="font-medium text-yellow-800">Refund Reason:</span>
                        <p className="text-yellow-700 mt-1">{editingOrder.refundReason}</p>
                      </div>
                    )}
                    {editingOrder.refundedAmount && (
                      <div className="text-sm">
                        <span className="font-medium text-yellow-800">Refunded Amount:</span>
                        <span className="text-yellow-700 ml-2">${editingOrder.refundedAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isEditMode && (
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={isSaving || !newStatus || ((newStatus === 'revision_requested' || newStatus === 'rejected') && !adminRemarks)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Order</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Are you sure you want to delete order <span className="font-semibold">{deletingOrder.orderNumber}</span>? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  <div><span className="text-gray-500">Domain:</span> <span className="font-medium">{deletingOrder.domains?.domainName || 'N/A'}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="font-medium">${deletingOrder.totalPrice?.toFixed(2)}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{deletingOrder.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setDeletingOrder(null)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
