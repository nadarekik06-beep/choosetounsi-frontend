'use client';

import { useEffect, useState, useCallback } from 'react';
import { ordersApi } from '@/lib/sellerApi';
import type {
  Order, OrderDetail, OrderStatus, PaginatedResponse,
} from '@/types/seller';
import {
  Search, Eye, ChevronLeft, ChevronRight,
  X, Loader2, ShoppingBag, AlertCircle,
  User, MapPin, Package, Hash, Calendar,
  RefreshCw, CheckCircle, XCircle, Clock,
} from 'lucide-react';

// ─── Status helpers ───────────────────────────────────────────────────────────

type StatusConfig = { label: string; bg: string; text: string; icon: React.ElementType };

const STATUS: Record<string, StatusConfig> = {
  pending:    { label: 'Pending',    bg: 'bg-amber-50',   text: 'text-amber-700',  icon: Clock        },
  processing: { label: 'Processing', bg: 'bg-blue-50',    text: 'text-blue-700',   icon: RefreshCw    },
  completed:  { label: 'Completed',  bg: 'bg-emerald-50', text: 'text-emerald-700',icon: CheckCircle  },
  delivered:  { label: 'Delivered',  bg: 'bg-teal-50',    text: 'text-teal-700',   icon: CheckCircle  },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-50',     text: 'text-red-600',    icon: XCircle      },
  refunded:   { label: 'Refunded',   bg: 'bg-purple-50',  text: 'text-purple-700', icon: RefreshCw    },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

const PAYMENT_STYLE: Record<string, string> = {
  paid:     'bg-emerald-50 text-emerald-700',
  unpaid:   'bg-amber-50 text-amber-700',
  refunded: 'bg-purple-50 text-purple-700',
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────

interface DetailModalProps {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
}

function OrderDetailModal({ orderId, onClose, onUpdated }: DetailModalProps) {
  const [detail,    setDetail]    = useState<OrderDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [newStatus, setNewStatus] = useState<string>('');
  const [updating,  setUpdating]  = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    ordersApi.getOne(orderId)
      .then((res) => setDetail(res.data))
      .catch(() => setError('Failed to load order details.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      onUpdated();
      onClose();
    } catch {
      setError('Failed to update status. Try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-extrabold text-slate-900">Order Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} />
              {error}
            </div>
          ) : detail ? (
            <div className="space-y-5">

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Hash,     label: 'Order Number', value: detail.order.order_number },
                  { icon: Calendar, label: 'Date',         value: new Date(detail.order.created_at).toLocaleDateString('fr-TN') },
                  { icon: User,     label: 'Customer',     value: detail.order.customer?.name, sub: detail.order.customer?.email },
                  { icon: MapPin,   label: 'Wilaya',       value: detail.order.wilaya ?? detail.order.customer?.state ?? '—' },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      <Icon size={10} /> {label}
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate">{value}</p>
                    {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
                  </div>
                ))}
              </div>

              {/* Status row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Order Status</p>
                  <StatusBadge status={detail.order.status} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Payment</p>
                  <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                    ${PAYMENT_STYLE[detail.order.payment_status] ?? 'bg-slate-50 text-slate-500'}`}
                  >
                    {detail.order.payment_status}
                  </span>
                </div>
              </div>

              {/* Seller's items */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} className="text-blue-500" />
                  <h3 className="text-sm font-extrabold text-slate-900">Your Items in this Order</h3>
                </div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                        <th className="px-4 py-2.5 text-left font-bold">Product</th>
                        <th className="px-4 py-2.5 text-right font-bold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-bold">Unit</th>
                        <th className="px-4 py-2.5 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{item.product_name}</td>
                          <td className="px-4 py-3 text-right text-slate-600 text-xs">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600 text-xs">{item.unit_price.toFixed(3)}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-blue-600 text-xs">
                            {item.total.toFixed(3)} TND
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 border-t border-blue-100">
                        <td colSpan={3} className="px-4 py-3 text-xs font-extrabold text-blue-900">
                          Your Subtotal
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-blue-700 text-sm">
                          {detail.seller_subtotal.toFixed(3)} TND
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Update status */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-3">
                  Update Order Status
                </p>
                {error && (
                  <p className="text-xs text-red-500 mb-2">{error}</p>
                )}
                <div className="flex gap-2.5">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700
                      focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 bg-white transition"
                  >
                    <option value="">Select new status…</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold
                      hover:bg-blue-700 transition disabled:opacity-50
                      flex items-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    {updating && <Loader2 size={13} className="animate-spin" />}
                    Update
                  </button>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [data,           setData]           = useState<PaginatedResponse<Order> | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPayment,  setFilterPayment]  = useState('');
  const [page,           setPage]           = useState(1);
  const [selectedId,     setSelectedId]     = useState<number | null>(null);

  const empty: PaginatedResponse<Order> = { data: [], current_page: 1, last_page: 1, per_page: 12, total: 0, from: 0, to: 0 };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getAll({
        page,
        per_page: 12,
        ...(search        && { search }),
        ...(filterStatus  && { status: filterStatus }),
        ...(filterPayment && { payment_status: filterPayment }),
      });
      // res is ApiResponse<PaginatedResponse<Order>>
      // res.data is the PaginatedResponse — safely unwrap
      const payload = (res as any)?.data ?? res;
      setData(Array.isArray(payload?.data) ? payload : empty);
    } catch {
      setData(empty);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPayment]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Orders</h1>
        <p className="text-xs text-slate-400 font-medium">
          Orders that contain your products
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order number…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 focus:bg-white transition"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterPayment}
          onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
        >
          <option value="">All Payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>

        {data && (
          <span className="text-xs font-semibold text-slate-400 ml-auto">
            {data.total} order{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                  {['Order', 'Customer', 'Wilaya', 'Status', 'Payment', 'Amount', 'Date', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 font-bold ${h === 'Amount' ? 'text-right' : h === '' ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {data?.data.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">

                    {/* Order number */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={13} className="text-blue-500" />
                        </div>
                        <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-lg">
                          {order.order_number}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900 text-xs">{order.user?.name ?? `User #${order.user_id}`}</p>
                      <p className="text-[10px] text-slate-400">{order.user?.email}</p>
                    </td>

                    {/* Wilaya */}
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                      {order.wilaya ?? order.user?.state ?? '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                        ${PAYMENT_STYLE[order.payment_status] ?? 'bg-slate-50 text-slate-500'}`}
                      >
                        {order.payment_status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-extrabold text-slate-900 text-xs">
                        {order.total_amount.toFixed(3)} TND
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium">
                      {new Date(order.created_at).toLocaleDateString('fr-TN')}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedId(order.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <ShoppingBag size={28} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-400">No orders found</p>
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Showing {data.from}–{data.to} of {data.total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-600 px-1">
                {data.current_page} / {data.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
                disabled={page === data.last_page}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedId !== null && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={fetch}
        />
      )}

    </div>
  );
}