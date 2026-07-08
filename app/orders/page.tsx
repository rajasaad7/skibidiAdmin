'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Edit2, X, Trash2, MessageCircle, Send, XCircle, Sparkles, HelpCircle, Pause, ArrowRight, Copy } from 'lucide-react';
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
  coinpaymentsTransactionId?: string;
  balanceUsed?: number;
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
  // Article (content-writing) sub-flow timestamps
  articleSubmittedAt?: string;
  articleApprovedAt?: string;
  articleRevisionRequestedAt?: string;
  // Remarks
  rejectionReason?: string;
  refundReason?: string;
  refundedAmount?: number;
  refundRequestedAt?: string;
  refundedAt?: string;
  // Clarification (buyer/publisher Q&A) - denormalized on the order
  clarificationStatus?: string;
  clarificationCount?: number;
  openClarificationId?: string;
  lastClarificationAt?: string;
  publisherUnseenAnswer?: boolean;
  // Verification
  manualVerified?: boolean;
  // How the order was placed: 'browse' | 'featured' | 'assistant'
  orderSource?: string;
  // Relations
  domains?: {
    domainName: string;
  };
  buyer?: {
    fullName: string;
    email: string;
    contactDetails?: ContactDetails | null;
  };
  seller?: {
    fullName: string;
    email: string;
    contactDetails?: ContactDetails | null;
  };
}

interface ContactDetails {
  type: string;
  value: string;
  updatedAt: string;
}

interface ClarificationParty {
  fullName: string;
  email: string;
}

interface Clarification {
  _id: string;
  roundNumber: number;
  status: string; // 'open' | 'answered'
  question: string;
  answer?: string | null;
  statusBeforeFreeze?: string | null;
  pausedMs?: number | null;
  requirementChanges?: Record<string, unknown> | null;
  askedAt?: string | null;
  answeredAt?: string | null;
  questionSeenAt?: string | null;
  answerSeenAt?: string | null;
  askedBy?: ClarificationParty | null;
  answeredBy?: ClarificationParty | null;
}

// Admin-facing status labels. Kept in sync with the app's order state machine
// (src/lib/orders/stateMachine.js). Admin uses the neutral, non-role label so a
// status reads the same regardless of which side placed the order.
const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  article_writing: 'Article Writing',
  article_submitted: 'Article Submitted',
  article_revision_requested: 'Article Revision Requested',
  article_approved: 'Article Approved',
  accepted: 'Accepted',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  revision_requested: 'Revision Requested',
  clarification_requested: 'Clarification Requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refund_requested: 'Refund Requested',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

function statusLabel(status: string): string {
  return (
    STATUS_LABELS[status] ||
    status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'accepted':
    case 'in_progress':
    case 'article_approved':
      return 'bg-blue-100 text-blue-800';
    case 'submitted':
    case 'article_submitted':
      return 'bg-purple-100 text-purple-800';
    case 'clarification_requested':
      return 'bg-amber-100 text-amber-800';
    case 'revision_requested':
    case 'article_revision_requested':
    case 'refund_requested':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    case 'disputed':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-orange-100 text-orange-800';
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [serviceTypeFilters, setServiceTypeFilters] = useState<string[]>(['guest_post', 'link_insertion', 'featured_domain']);
  const [stats, setStats] = useState({ all: 0, paid: 0, overdue: 0, accepted: 0, submitted: 0, completed: 0, refunded: 0 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [contactModal, setContactModal] = useState<{ name: string; contactDetails: ContactDetails } | null>(null);

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

  // Payment fields are read from the loaded order (editingOrder) and shown
  // read-only; they are never edited here, so no local state is kept for them.

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

  // Modal data loading (when opening a row's details)
  const [modalLoading, setModalLoading] = useState(false);

  // Clarification (buyer/publisher Q&A) thread for the open order
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [clarificationsLoading, setClarificationsLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/orders/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const url = `/api/orders?page=${page}${statusParam}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 when filter changes
  }, [filter]);

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, [filter, page]);

  const toggleServiceTypeFilter = (type: string) => {
    setServiceTypeFilters(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Calculate TAT remaining
  const calculateTATRemaining = (order: Order) => {
    if (!order.deadlineAt) return null;

    const now = new Date();
    const deadline = new Date(order.deadlineAt);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    const isOverdue = diffMs < 0;
    const isUrgent = !isOverdue && diffHours < 24; // Less than 24 hours remaining
    const isWarning = !isOverdue && diffHours >= 24 && diffHours < 48; // 24-48 hours

    return {
      isOverdue,
      isUrgent,
      isWarning,
      diffMs,
      diffHours: Math.abs(diffHours),
      diffDays: Math.abs(diffDays),
      remainingHours: Math.abs(remainingHours),
      formattedTime: isOverdue
        ? `${Math.abs(diffDays)} days ${Math.abs(remainingHours)} hours overdue`
        : diffDays > 0
          ? `${diffDays} days ${remainingHours} hours remaining`
          : `${Math.abs(diffHours)} hours remaining`
    };
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return stats.all;
    if (status === 'paid') return stats.paid;
    if (status === 'overdue') return stats.overdue;
    if (status === 'accepted') return stats.accepted;
    if (status === 'submitted') return stats.submitted;
    if (status === 'completed') return stats.completed;
    if (status === 'refunded') return stats.refunded;
    return 0;
  };

  const getFilteredOrders = () => {
    let filteredOrders = orders;

    // Apply service type filter
    if (serviceTypeFilters.length > 0) {
      filteredOrders = filteredOrders.filter(order => serviceTypeFilters.includes(order.serviceType));
    }

    return filteredOrders;
  };

  const populateOrderForm = (order: Order) => {
    setEditingOrder(order);
    setServiceType(order.serviceType);
    setBuyerId(order.buyerId);
    setPublisherId(order.publisherId);
    setDomainId(order.domainId);
    setNewStatus(order.status);
    setBasePrice(order.basePrice?.toString() || '');
    setPlatformFee(order.platformFee?.toString() || '');
    setTotalPrice(order.totalPrice?.toString() || '');
    setPublisherEarnings(order.publisherEarnings?.toString() || '');
    setContentWritingFee(order.contentWritingFee?.toString() || '');
    setRequestContentWriting(order.requestContentWriting || false);
    setArticleTitle(order.articleTitle || '');
    setArticleContent(order.articleContent || '');
    setSpecialRequirements(order.specialRequirements || '');
    setTargetUrl(order.targetUrl || '');
    setAnchorText(order.anchorText || '');
    setGoogleDocsLink(order.googleDocsLink || '');
    setPublishedUrl(order.publishedUrl || '');
    setCompletionNotes(order.completionNotes || '');
    setAdminRemarks('');
    setRefundAmount('');
    setIsEditMode(false);
    setDomainName('');
    setBuyerName('');
    setPublisherName('');
  };

  const fetchClarifications = async (orderId: string) => {
    setClarificationsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/clarifications`);
      const data = await response.json();
      if (data.success) {
        setClarifications(data.clarifications || []);
      } else {
        setClarifications([]);
      }
    } catch (error) {
      console.error('Error loading clarifications:', error);
      setClarifications([]);
    } finally {
      setClarificationsLoading(false);
    }
  };

  const openOrderModal = async (order: Order) => {
    // Show modal immediately with the lightweight row data so the user gets feedback,
    // then fetch full details in the background.
    setEditingOrder(order);
    setModalLoading(true);
    setClarifications([]);
    // The buyer/publisher Q&A thread loads in parallel with the order details.
    fetchClarifications(order._id);
    try {
      const response = await fetch(`/api/orders/${order._id}`);
      const data = await response.json();
      if (data.success && data.order) {
        populateOrderForm(data.order);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setModalLoading(false);
    }
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

      // Payment fields are display-only (set by the payment providers) and are
      // intentionally never included in the update payload.

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
        fetchStats();
        fetchOrders();

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
    setClarifications([]);
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
        fetchStats();
        fetchOrders();
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

  const handleManualVerifiedToggle = async (orderId: string, currentValue: boolean | undefined) => {
    try {
      const newValue = !currentValue;
      const response = await fetch('/api/orders/manual-verified', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          manualVerified: newValue,
        }),
      });

      if (response.ok) {
        // Update local state
        if (editingOrder) {
          setEditingOrder({ ...editingOrder, manualVerified: newValue });
        }
        setOrders(orders.map(o =>
          o._id === orderId ? { ...o, manualVerified: newValue } : o
        ));
        toast.success(`Manual verification ${newValue ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update manual verification');
      }
    } catch (error) {
      console.error('Error updating manual verification:', error);
      toast.error('Error updating manual verification');
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
    { value: 'clarification_requested', label: 'Clarification Requested' },
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
              fetchStats();
              fetchOrders();
            }}
            className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 text-xs md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {['all', 'paid', 'overdue', 'accepted', 'submitted', 'completed', 'refunded'].map((status) => (
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
                      <div className="flex items-center gap-2">
                        <span>{order.orderNumber}</span>
                        {order.orderSource === 'assistant' && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-700"
                            title="Placed via AI assistant"
                          >
                            <Sparkles className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.domains?.domainName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.serviceType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      {order.status === 'clarification_requested' && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                          <HelpCircle className="w-3 h-3" />
                          Delivery paused · awaiting buyer
                        </span>
                      )}
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
                          onClick={() => openOrderModal(order)}
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{((page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
                        if (!editingOrder) return;
                        setIsRefreshing(true);
                        try {
                          const response = await fetch(`/api/orders/${editingOrder._id}`);
                          const data = await response.json();
                          if (data.success && data.order) {
                            populateOrderForm(data.order);
                            fetchClarifications(editingOrder._id);
                            toast.success('Order data refreshed!');
                          } else {
                            toast.error('Failed to refresh order data');
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

            {modalLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm">Loading order details...</p>
              </div>
            ) : (
            <>
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
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between gap-2">
                        <span className="truncate">
                          {editingOrder.seller ? `${editingOrder.seller.fullName} (${editingOrder.seller.email})` : publisherName || 'N/A'}
                        </span>
                        {editingOrder.seller?.contactDetails && (
                          <button
                            type="button"
                            onClick={() => setContactModal({
                              name: editingOrder.seller!.fullName,
                              contactDetails: editingOrder.seller!.contactDetails!,
                            })}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition shrink-0"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Contact
                          </button>
                        )}
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

                  {/* Manual Verified Toggle */}
                  <div className="col-span-2 flex items-center justify-between border-t pt-3 mt-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Manual Verification
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Mark this order as manually verified
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleManualVerifiedToggle(editingOrder._id, editingOrder.manualVerified)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        editingOrder.manualVerified ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={editingOrder.manualVerified || false}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editingOrder.manualVerified ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* TAT (Turnaround Time) Status. Shown only for working statuses
                  where the delivery clock is actually ticking. It is hidden
                  while frozen for clarification (the DB deadline is stale then)
                  and for terminal / pre-work statuses. */}
              {editingOrder.deadlineAt && !editingOrder.completedAt &&
               ['paid', 'accepted', 'in_progress', 'article_writing', 'article_approved', 'revision_requested', 'submitted'].includes(editingOrder.status) &&
               (() => {
                const tatInfo = calculateTATRemaining(editingOrder);
                if (!tatInfo) return null;

                const bgColor = tatInfo.isOverdue
                  ? 'bg-red-50'
                  : tatInfo.isUrgent
                    ? 'bg-orange-50'
                    : tatInfo.isWarning
                      ? 'bg-yellow-50'
                      : 'bg-green-50';

                const textColor = tatInfo.isOverdue
                  ? 'text-red-900'
                  : tatInfo.isUrgent
                    ? 'text-orange-900'
                    : tatInfo.isWarning
                      ? 'text-yellow-900'
                      : 'text-green-900';

                const badgeColor = tatInfo.isOverdue
                  ? 'bg-red-100 text-red-800'
                  : tatInfo.isUrgent
                    ? 'bg-orange-100 text-orange-800'
                    : tatInfo.isWarning
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800';

                return (
                  <div className={`${bgColor} rounded-lg p-4 border-2 ${tatInfo.isOverdue ? 'border-red-300' : tatInfo.isUrgent ? 'border-orange-300' : tatInfo.isWarning ? 'border-yellow-300' : 'border-green-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-sm font-semibold ${textColor}`}>
                        {tatInfo.isOverdue ? '⚠️ TAT OVERDUE' : '⏰ TAT Remaining'}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${badgeColor}`}>
                        {tatInfo.isOverdue ? 'OVERDUE' : tatInfo.isUrgent ? 'URGENT' : tatInfo.isWarning ? 'WARNING' : 'ON TRACK'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${textColor}`}>Deadline:</span>
                        <span className={`text-sm ${textColor}`}>
                          {new Date(editingOrder.deadlineAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${textColor}`}>
                          {tatInfo.isOverdue ? 'Overdue by:' : 'Time Remaining:'}
                        </span>
                        <span className={`text-lg font-bold ${textColor}`}>
                          {tatInfo.formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

              {/* Payment Information (read-only - set by the payment providers, never edited here) */}
              {(() => {
                const method = editingOrder?.paymentMethod || '';
                const methodLabels: Record<string, string> = {
                  stripe: 'Stripe',
                  coinpayments: 'CoinPayments',
                  paypal: 'PayPal',
                  balance: 'Balance',
                  manual: 'Manual',
                  // Legacy provider (decommissioned); shown neutrally so old orders
                  // still render an identifiable method without surfacing the name.
                  paddle: 'Card (legacy)',
                };
                const methodLabel = methodLabels[method] || (method ? method : 'Not set');

                const statusLabels: Record<string, string> = {
                  pending: 'Pending',
                  completed: 'Completed',
                  failed: 'Failed',
                  refunded: 'Refunded',
                };
                const status = editingOrder?.paymentStatus || '';
                const statusLabel = statusLabels[status] || (status ? status : 'Pending');

                // Only the transaction reference that matches the actual method.
                let txnLabel: string | null = null;
                let txnValue: string | null = null;
                if (method === 'coinpayments' && editingOrder?.coinpaymentsTransactionId) {
                  txnLabel = 'CoinPayments Invoice / Transaction ID';
                  txnValue = editingOrder.coinpaymentsTransactionId;
                } else if (method === 'stripe' && editingOrder?.stripeTransactionId) {
                  txnLabel = 'Stripe Transaction ID';
                  txnValue = editingOrder.stripeTransactionId;
                } else if (method === 'paddle' && editingOrder?.paddleTransactionId) {
                  txnLabel = 'Transaction ID';
                  txnValue = editingOrder.paddleTransactionId;
                }

                const showBalanceUsed =
                  editingOrder?.balanceUsed != null && Number(editingOrder.balanceUsed) > 0;

                const ReadOnlyValue = ({
                  label,
                  value,
                  copyable = false,
                }: {
                  label: string;
                  value: string;
                  copyable?: boolean;
                }) => (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
                    <div className="flex items-stretch gap-2">
                      <div className="flex-1 px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg break-all">
                        {value}
                      </div>
                      {copyable && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                            toast.success('Copied to clipboard!');
                          }}
                          title="Copy ID"
                          aria-label="Copy ID"
                          className="flex-shrink-0 px-3 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );

                return (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <ReadOnlyValue label="Payment Method" value={methodLabel} />
                      <ReadOnlyValue label="Payment Status" value={statusLabel} />
                      {txnLabel && txnValue && (
                        <div className="col-span-2">
                          <ReadOnlyValue label={txnLabel} value={txnValue} copyable />
                        </div>
                      )}
                      {showBalanceUsed && (
                        <ReadOnlyValue
                          label="Balance Used"
                          value={`$${Number(editingOrder!.balanceUsed).toFixed(2)}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

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

              {/* Clarifications (buyer / publisher Q&A) */}
              {(clarificationsLoading || clarifications.length > 0 || editingOrder.status === 'clarification_requested') && (
                <div className="border border-amber-200 rounded-lg p-4 space-y-3 bg-amber-50/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      Clarifications
                      {clarifications.length > 0 && (
                        <span className="text-xs font-normal text-gray-500">
                          ({clarifications.length} of {3} rounds used)
                        </span>
                      )}
                    </h4>
                    {editingOrder.status === 'clarification_requested' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        <Pause className="w-3 h-3" />
                        Delivery clock paused
                      </span>
                    )}
                  </div>

                  {editingOrder.status === 'clarification_requested' && (
                    <p className="text-xs text-amber-800">
                      The publisher asked the buyer a question and the delivery clock is frozen. It resumes when the buyer answers. Admins do not answer on the buyer&apos;s behalf; use the contact button or change the status manually if you need to intervene.
                    </p>
                  )}

                  {clarificationsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading conversation...
                    </div>
                  ) : clarifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No clarification rounds on this order.</p>
                  ) : (
                    <div className="space-y-3">
                      {clarifications.map((round) => (
                        <div
                          key={round._id}
                          className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                                {round.roundNumber}
                              </span>
                              <span className="text-xs font-medium text-gray-700">Round {round.roundNumber}</span>
                              <span
                                className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                  round.status === 'open'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {round.status === 'open' ? 'Awaiting answer' : 'Answered'}
                              </span>
                            </div>
                            {round.statusBeforeFreeze && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                <Pause className="w-3 h-3" />
                                Frozen from {statusLabel(round.statusBeforeFreeze)}
                              </span>
                            )}
                          </div>

                          {/* Question (asked by the publisher) */}
                          <div className="rounded-md bg-blue-50 border border-blue-100 p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-semibold text-blue-800">
                                Publisher{round.askedBy ? ` · ${round.askedBy.fullName}` : ''} asked
                              </span>
                              {round.askedAt && (
                                <span className="text-[11px] text-blue-600">
                                  {new Date(round.askedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{round.question}</p>
                          </div>

                          {/* Answer (given by the buyer) */}
                          {round.answer ? (
                            <div className="rounded-md bg-green-50 border border-green-100 p-2.5 ml-4">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[11px] font-semibold text-green-800">
                                  Buyer{round.answeredBy ? ` · ${round.answeredBy.fullName}` : ''} replied
                                </span>
                                {round.answeredAt && (
                                  <span className="text-[11px] text-green-600">
                                    {new Date(round.answeredAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{round.answer}</p>
                            </div>
                          ) : (
                            <div className="ml-4 text-xs text-amber-700 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              Waiting for the buyer to reply
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

              {/* Timestamps - full order lifecycle, in chronological order.
                  Only present values render. */}
              {(() => {
                const stamps: { label: string; value?: string }[] = [
                  { label: 'Created', value: editingOrder.createdAt },
                  { label: 'Paid', value: editingOrder.paidAt },
                  { label: 'Article Submitted', value: editingOrder.articleSubmittedAt },
                  { label: 'Article Revision Requested', value: editingOrder.articleRevisionRequestedAt },
                  { label: 'Article Approved', value: editingOrder.articleApprovedAt },
                  { label: 'Accepted', value: editingOrder.acceptedAt },
                  { label: 'Last Clarification', value: editingOrder.lastClarificationAt },
                  { label: 'Submitted', value: editingOrder.submittedAt },
                  { label: 'Revision Requested', value: editingOrder.revisionRequestedAt },
                  { label: 'Rejected', value: editingOrder.rejectedAt },
                  { label: 'Refund Requested', value: editingOrder.refundRequestedAt },
                  { label: 'Refunded', value: editingOrder.refundedAt },
                  { label: 'Completed', value: editingOrder.completedAt },
                ].filter((s) => s.value);

                if (stamps.length === 0) return null;

                return (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Timestamps</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {stamps.map((s) => (
                        <div key={s.label}>
                          <span className="text-blue-800 font-medium">{s.label}:</span>
                          <span className="text-blue-700 ml-2">{new Date(s.value as string).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
            </>
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
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{statusLabel(deletingOrder.status)}</span></div>
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

      {/* Contact Details Modal */}
      {contactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Contact Details</h3>
              </div>
              <button
                onClick={() => setContactModal(null)}
                className="text-white hover:text-gray-200 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">Publisher</div>
                  <div className="text-base font-semibold text-gray-900">{contactModal.name}</div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Contact Type</div>
                    <div className="flex items-center gap-2">
                      {contactModal.contactDetails.type === 'whatsapp' ? (
                        <>
                          <MessageCircle className="w-5 h-5 text-green-600" />
                          <span className="text-lg font-semibold text-gray-900">WhatsApp</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 text-blue-600" />
                          <span className="text-lg font-semibold text-gray-900">Telegram</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">Contact Value</div>
                  <div className="text-lg font-mono font-semibold text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
                    {contactModal.contactDetails.value}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Updated</div>
                  <div className="text-sm text-gray-700">
                    {new Date(contactModal.contactDetails.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {contactModal.contactDetails.type === 'whatsapp' ? (
                  <a
                    href={`https://wa.me/${contactModal.contactDetails.value.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Send WhatsApp Message
                  </a>
                ) : (
                  <a
                    href={`https://t.me/${contactModal.contactDetails.value.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <Send className="w-5 h-5" />
                    Send Telegram Message
                  </a>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contactModal.contactDetails.value);
                    toast.success('Copied to clipboard!');
                  }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
