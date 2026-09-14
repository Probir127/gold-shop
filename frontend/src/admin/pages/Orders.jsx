import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getOrders, updateOrderStatus } from '../api';
import toast from '../components/Toast';
import { 
  ShoppingBag, Search, Filter, CheckCircle2, Truck, Clock, 
  XCircle, Send, Phone, MapPin, DollarSign, Calendar, Eye, FileText
} from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders();
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, {
        order_status: newStatus,
        send_whatsapp: true
      });
      toast.success(`Order #${orderId} marked as ${newStatus}. WhatsApp dispatched!`);
      fetchOrders();
      if (selectedOrder?.order_id === orderId) {
        setSelectedOrder(prev => ({ ...prev, order_status: newStatus }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = (
      o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search)
    );
    const matchFilter = filterStatus === 'all' || o.order_status === filterStatus;
    return matchSearch && matchFilter;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Confirmed</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Processing</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">Shipped</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20 font-medium">Pending</span>;
    }
  };

  return (
    <div className="flex bg-[#09090b] text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-semibold uppercase tracking-wider mb-1">
              <ShoppingBag size={14} /> Sahara Gold E-Commerce
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Order Management</h1>
            <p className="text-slate-400 text-sm">Real-time jewelry order pipeline & automated WhatsApp dispatch</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition border border-white/10"
            >
              Refresh Orders
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, customer, phone..."
              className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
            {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  filterStatus === st
                    ? 'bg-[#d4af37] text-black font-semibold'
                    : 'bg-[#18181b] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#18181b] text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.order_id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-mono font-medium text-[#f5ebd7]">
                      #{order.order_id}
                      <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{order.customer_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {order.customer_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500" />
                        {order.city}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">
                        {order.shipping_address}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#d4af37]">
                      ৳{Number(order.total || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono uppercase bg-white/5 text-slate-300 px-2 py-0.5 rounded">
                        {order.payment_method}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/orders/${order.order_id}/invoice/?copy=admin`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 hover:bg-[#d4af37] hover:text-black transition flex items-center gap-1 text-xs font-semibold"
                          title="View Store / Admin Copy (Dispatch Slip)"
                        >
                          <FileText size={13} />
                          <span>Invoice</span>
                        </a>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Quick status dropdown */}
                        <select
                          disabled={updating}
                          value={order.order_status}
                          onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                          className="bg-[#1e1e24] border border-white/10 rounded-lg text-xs px-2 py-1 text-slate-200 focus:outline-none focus:border-[#d4af37]"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirm & WA</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Ship & WA</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancel</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a20]">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    Order #{selectedOrder.order_id}
                    {getStatusBadge(selectedOrder.order_status)}
                  </h3>
                  <p className="text-xs text-slate-400">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-white text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4 bg-[#1b1b22] p-4 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Customer</h4>
                    <p className="text-white font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-slate-300 text-xs mt-1">{selectedOrder.customer_phone}</p>
                    {selectedOrder.customer_email && (
                      <p className="text-slate-400 text-xs">{selectedOrder.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Delivery Address</h4>
                    <p className="text-white text-sm">{selectedOrder.shipping_address}</p>
                    <p className="text-slate-400 text-xs mt-1">{selectedOrder.city}, Bangladesh</p>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#18181e] border border-white/5">
                        <div>
                          <p className="text-white font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-slate-400">Weight: {item.weight}g • Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-[#d4af37]">
                          ৳{Number(item.price_at_purchase * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-[#18181e] p-4 rounded-xl space-y-2 border border-white/5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal:</span>
                    <span>৳{Number(selectedOrder.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>VAT (5%):</span>
                    <span>৳{Number(selectedOrder.vat || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-2">
                    <span>Total Amount:</span>
                    <span className="text-[#d4af37]">৳{Number(selectedOrder.total || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Invoice Links */}
                <div className="flex gap-2">
                  <a
                    href={`/api/orders/${selectedOrder.order_id}/invoice/?copy=admin`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-[#d4af37]/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <FileText size={14} /> Store Copy (Dispatch Slip)
                  </a>
                  <a
                    href={`/api/orders/${selectedOrder.order_id}/invoice/?copy=customer`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <FileText size={14} /> Customer Copy (Hallmark)
                  </a>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      const cleanPhone = selectedOrder.customer_phone.replace(' ', '').replace('-', '');
                      window.open(`https://wa.me/${cleanPhone}?text=Hello%20${selectedOrder.customer_name}%2C%20regarding%20your%20Sahara%20Gold%20order%20%23${selectedOrder.order_id}`, '_blank');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-black font-semibold text-sm hover:brightness-105 transition flex items-center justify-center gap-2"
                  >
                    <Send size={15} /> Message on WhatsApp
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
