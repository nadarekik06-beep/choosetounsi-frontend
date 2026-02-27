'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '../../lib/sellerApi';
import type { DashboardData } from '../../types/seller';
import StatCard     from './components/StatCard';
import RevenueChart from './components/RevenueChart';
import {
  DollarSign, ShoppingBag, Package, Clock,
  Users, MapPin, Award, AlertCircle, RefreshCw,
  TrendingUp,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
    .format(n) + ' TND';

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-400',
  processing: 'bg-blue-500',
  completed:  'bg-emerald-500',
  delivered:  'bg-teal-500',
  cancelled:  'bg-red-400',
  refunded:   'bg-purple-400',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[340px]" />
        <Skeleton className="h-[340px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <h3 className="font-extrabold text-slate-900 mb-1">Connection Error</h3>
        <p className="text-sm text-slate-500 mb-5">
          Could not reach the API. Make sure Laravel is running on{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">localhost:8000</code>.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/25"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    dashboardApi
      .getOverview()
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <DashboardSkeleton />;
  if (error)   return <ErrorState onRetry={load} />;
  if (!data)   return null;

  const { summary, charts, order_status_distribution, top_clients, top_wilayas, recent_orders } = data;
  const maxWilayaRevenue = Math.max(...top_wilayas.map((w) => w.revenue), 1);

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Overview of your store performance
          </p>
        </div>
        <span className="hidden sm:block text-[11px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-3 py-1.5 rounded-full">
          Seller ID: 1
        </span>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={fmt(summary.total_revenue)}
          subtitle="Completed & paid orders"
          change={summary.revenue_growth}
          icon={DollarSign}
          iconClassName="text-blue-500"
        />
        <StatCard
          title="Total Orders"
          value={summary.total_orders.toLocaleString()}
          subtitle={`${summary.pending_orders} pending`}
          icon={ShoppingBag}
          iconClassName="text-violet-500"
        />
        <StatCard
          title="Products"
          value={summary.total_products}
          subtitle={`${summary.active_products} active · ${summary.pending_product_approvals} pending`}
          icon={Package}
          iconClassName="text-emerald-500"
        />
        <StatCard
          title="This Month"
          value={fmt(summary.revenue_this_month)}
          subtitle={`Last: ${fmt(summary.revenue_last_month)}`}
          icon={TrendingUp}
          iconClassName="text-orange-500"
        />
      </div>

      {/* ── Chart + Top Wilayas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue chart */}
        <div className="lg:col-span-2">
          <RevenueChart data={charts.monthly_revenue} />
        </div>

        {/* Top Wilayas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <MapPin size={15} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Top Wilayas</h3>
              <p className="text-[10px] text-slate-400 font-medium">By revenue</p>
            </div>
          </div>

          {top_wilayas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-4">
              {top_wilayas.map((w, i) => (
                <div key={w.wilaya}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span className="text-slate-300 text-[10px] font-bold w-4">{i + 1}.</span>
                      {w.wilaya}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {fmt(w.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${(w.revenue / maxWilayaRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Top Clients + Order Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Clients */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Award size={15} className="text-blue-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Top Clients</h3>
              <p className="text-[10px] text-slate-400 font-medium">By lifetime revenue</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {top_clients.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              top_clients.map((client, i) => (
                <div key={client.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition">
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0
                    ${i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-200 text-slate-600' :
                      i === 2 ? 'bg-orange-100 text-orange-600' :
                               'bg-slate-100 text-slate-400'}
                  `}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{client.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{client.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-blue-600">{fmt(client.total_revenue)}</p>
                    <p className="text-[10px] text-slate-400">{client.total_orders} orders</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
              <ShoppingBag size={15} className="text-violet-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Order Status</h3>
              <p className="text-[10px] text-slate-400 font-medium">Distribution across all orders</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {Object.entries(order_status_distribution).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No orders yet</p>
            ) : (
              Object.entries(order_status_distribution).map(([status, count]) => {
                const total = Object.values(order_status_distribution).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 capitalize">
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] ?? 'bg-slate-400'}`} />
                        {status}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[status] ?? 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Clock size={15} className="text-slate-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Recent Orders</h3>
              <p className="text-[10px] text-slate-400 font-medium">Latest 5 orders containing your products</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="px-5 py-3 text-left font-bold">Order</th>
                <th className="px-5 py-3 text-left font-bold">Customer</th>
                <th className="px-5 py-3 text-center font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold">Amount</th>
                <th className="px-5 py-3 text-left font-bold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recent_orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded-lg">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs font-medium">
                      {order.user?.name ?? `User #${order.user_id}`}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`
                        inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                        ${order.status === 'completed' || order.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : order.status === 'cancelled'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-blue-50 text-blue-700'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-400'}`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 text-xs">
                      {fmt(order.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString('fr-TN')}
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