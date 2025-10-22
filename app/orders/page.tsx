'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Edit2 } from 'lucide-react';

interface Order {
  _id: string;
  orderId: string;
  buyerId: string;
  publisherId: string;
  domainId: string;
  status: string;
  totalPrice: number;
  serviceType: string;
  createdAt: string;
  domain?: {
    domain: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [revisionRemarks, setRevisionRemarks] = useState<string>('');

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
    fetchOrders();
  }, [filter]);

  const handleUpdateStatus = async (orderId: string) => {
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          revisionRemarks: newStatus === 'revision_requested' ? revisionRemarks : undefined
        })
      });
      if (response.ok) {
        setEditingOrder(null);
        setNewStatus('');
        setRevisionRemarks('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const statusOptions = [
    'pending_payment',
    'paid',
    'in_progress',
    'submitted',
    'revision_requested',
    'completed',
    'cancelled',
    'refunded'
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'paid', 'in_progress', 'submitted', 'completed', 'cancelled', 'refunded'].map((status) => (
          <button
            key={`filter-${status}`}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.domain?.domain || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.serviceType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </td>
                    <td className="px-6 py-4">
                      {editingOrder === order._id ? (
                        <div className="space-y-2">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="">Select status</option>
                            {statusOptions.map(status => (
                              <option key={status} value={status}>
                                {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </option>
                            ))}
                          </select>
                          {newStatus === 'revision_requested' && (
                            <textarea
                              value={revisionRemarks}
                              onChange={(e) => setRevisionRemarks(e.target.value)}
                              placeholder="Revision remarks..."
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              rows={2}
                            />
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(order._id)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrder(null);
                                setNewStatus('');
                                setRevisionRemarks('');
                              }}
                              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'paid' || order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {order.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                          onClick={() => {
                            setEditingOrder(order._id);
                            setNewStatus(order.status);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Status"
                        >
                          <Edit2 className="w-4 h-4" />
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
    </div>
  );
}
