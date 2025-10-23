'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Edit2, X } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber: string;
  buyerId: string;
  publisherId: string;
  domainId: string;
  status: string;
  totalPrice: number;
  serviceType: string;
  createdAt: string;
  publishedUrl?: string;
  completionNotes?: string;
  rejectionReason?: string;
  refundReason?: string;
  domains?: {
    domainName: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [serviceTypeFilters, setServiceTypeFilters] = useState<string[]>(['guest_post', 'link_insertion', 'featured_domain']);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [publishedUrl, setPublishedUrl] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');

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

    try {
      const payload: any = {
        orderId: editingOrder._id,
        status: newStatus,
      };

      // Add relevant fields based on status
      if (newStatus === 'revision_requested' && adminRemarks) {
        payload.rejectionReason = adminRemarks;
      }
      if (newStatus === 'rejected' && adminRemarks) {
        payload.rejectionReason = adminRemarks;
      }
      if (newStatus === 'completed') {
        if (publishedUrl) payload.publishedUrl = publishedUrl;
        if (adminRemarks) payload.completionNotes = adminRemarks;
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
        setEditingOrder(null);
        setNewStatus('');
        setAdminRemarks('');
        setPublishedUrl('');
        setRefundAmount('');
        fetchOrders();
        fetchAllOrders();
        alert('Order status updated successfully!');
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  };

  const statusOptions = [
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'paid', label: 'Paid' },
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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <div className="flex items-center gap-2">
          {['guest_post', 'link_insertion', 'featured_domain'].map((type) => (
            <button
              key={`service-${type}`}
              onClick={() => toggleServiceTypeFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                            setNewStatus(order.status);
                            setAdminRemarks('');
                            setPublishedUrl(order.publishedUrl || '');
                            setRefundAmount('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                          title="Manage Order"
                        >
                          <Edit2 className="w-3 h-3" />
                          Manage
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Manage Order - {editingOrder.orderNumber}</h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Order Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Domain:</span>
                  <span className="font-medium">{editingOrder.domains?.domainName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{editingOrder.serviceType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Price:</span>
                  <span className="font-medium">${editingOrder.totalPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    editingOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    editingOrder.status === 'paid' || editingOrder.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {editingOrder.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Published URL (for completed status) */}
              {newStatus === 'completed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Published URL
                  </label>
                  <input
                    type="url"
                    value={publishedUrl}
                    onChange={(e) => setPublishedUrl(e.target.value)}
                    placeholder="https://example.com/published-article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Refund Amount (for refunded/refund_requested status) */}
              {(newStatus === 'refunded' || newStatus === 'refund_requested') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Admin Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    newStatus === 'completed' ? 'Add any completion notes...' :
                    newStatus === 'refunded' || newStatus === 'refund_requested' ? 'Explain the reason for refund...' :
                    'Add any admin notes or remarks...'
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {(newStatus === 'revision_requested' || newStatus === 'rejected') && (
                  <p className="text-xs text-gray-500 mt-1">Required for this status</p>
                )}
              </div>

              {/* Existing Remarks Display */}
              {(editingOrder.completionNotes || editingOrder.rejectionReason || editingOrder.refundReason) && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-900">Previous Remarks:</h4>
                  {editingOrder.completionNotes && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-800">Completion Notes:</span>
                      <p className="text-blue-700 mt-1">{editingOrder.completionNotes}</p>
                    </div>
                  )}
                  {editingOrder.rejectionReason && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-800">Rejection Reason:</span>
                      <p className="text-blue-700 mt-1">{editingOrder.rejectionReason}</p>
                    </div>
                  )}
                  {editingOrder.refundReason && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-800">Refund Reason:</span>
                      <p className="text-blue-700 mt-1">{editingOrder.refundReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={!newStatus || ((newStatus === 'revision_requested' || newStatus === 'rejected') && !adminRemarks)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
