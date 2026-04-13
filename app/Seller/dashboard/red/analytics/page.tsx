'use client';
/**
 * app/seller/dashboard/red/analytics/page.tsx
 *
 * Red Pepper — Analytics
 * ───────────────────────
 * ALL data comes from dashboardApi.getOverview() — same endpoint as Green.
 * Zero mock data. Revenue chart, order distribution, top products table, wilayas.
 */

import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '@/lib/sellerApi';
import type { DashboardData } from '@/types/seller';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  PieChart, Pie,
} from 'recharts';
import { RefreshCw, AlertCircle, TrendingUp, ShoppingBag, Package, DollarSign } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' DT';

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  processing: '#3498db',
  completed:  '#27ae60',
  delivered:  '#14b8a6',
  cancelled:  '#e74c3c',
  refunded:   '#a855f7',
};

// ─── Tooltip components ───────────────────────────────────────────────────────

function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--red-light)' }}>{fmt(payload[0].value)}</div>
      {payload[1] && <div style={{ fontWeight: 600, color: '#3498db', marginTop: 2 }}>Orders: {payload[1].value}</div>}
    </div>
  );
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].value} orders</div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 14, background: 'var(--surface3)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ─── Error ───────────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(192,57,43,0.1)', border: '1px solid var(--border-red)', borderRadius: 12, padding: '14px 18px' }}>
      <AlertCircle size={18} color="var(--red)" />
      <span style={{ fontSize: 13, color: 'var(--text)' }}>Failed to load analytics data.</span>
      <button onClick={onRetry} className="ghost-btn" style={{ padding: '5px 12px', marginLeft: 'auto' }}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════

export default function RedAnalyticsPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    dashboardApi.getOverview()
      .then(res => setData(res.data ?? res))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => <Skel key={i} h={90} />)}
      </div>
      <Skel h={280} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Skel h={220} /> <Skel h={220} />
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Analytics</h1>
      </div>
      {error && <ErrorBanner onRetry={load} />}
    </div>
  );

  const { summary, charts, order_status_distribution, top_products = [], top_wilayas = [] } = data;

  // Chart data — from REAL API response
  const revenueData = (charts.monthly_revenue ?? []).map((d, i, arr) => ({
    month:    d.month,
    revenue:  d.revenue,
    orders:   d.orders,
    isLast:   i === arr.length - 1,
  }));

  const statusPie = Object.entries(order_status_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: STATUS_COLORS[name] ?? '#888',
  }));

  const maxWilaya = Math.max(...top_wilayas.map(w => w.revenue), 1);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:.8} }
        .an-row:hover td { background: var(--surface3) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Analytics</h1>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>Detailed performance metrics from real data</p>
          </div>
          <button onClick={load} className="ghost-btn" style={{ padding: '7px 14px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── Summary KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { icon: DollarSign,  label: 'Total Revenue',   value: fmt(summary.total_revenue),       accent: 'var(--red)',  sub: `Growth: ${summary.revenue_growth > 0 ? '+' : ''}${summary.revenue_growth?.toFixed(1) ?? 0}%` },
            { icon: ShoppingBag, label: 'Total Orders',    value: summary.total_orders,              accent: '#3498db',     sub: `${summary.pending_orders} pending` },
            { icon: Package,     label: 'Total Products',  value: summary.total_products,            accent: '#27ae60',     sub: `${summary.active_products} active` },
            { icon: TrendingUp,  label: 'Month Revenue',   value: fmt(summary.revenue_this_month),  accent: '#f39c12',     sub: `Last: ${fmt(summary.revenue_last_month)}` },
          ].map(({ icon: I, label, value, accent, sub }) => (
            <div key={label} className="kpi-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                  <I size={16} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>{sub}</p>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: '0 0 14px 14px', opacity: 0.5 }} />
            </div>
          ))}
        </div>

        {/* ── Revenue + Orders Trend — REAL DATA ── */}
        <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Revenue & Orders Trend</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Monthly breakdown</div>
          </div>
          {revenueData.length === 0
            ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>No revenue data yet</div>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<RevTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
                  <Bar yAxisId="rev" dataKey="revenue" name="Revenue (DT)" radius={[4,4,0,0]}>
                    {revenueData.map((d, i) => (
                      <Cell key={i} fill={d.isLast ? '#e74c3c' : 'rgba(192,57,43,0.45)'} />
                    ))}
                  </Bar>
                  <Line yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#3498db" strokeWidth={2} dot={{ r: 3, fill: '#3498db' }} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* ── Status Pie + Wilayas ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Order status pie — REAL */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Order Status Distribution</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>All time</div>
            {statusPie.length === 0
              ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>No orders yet</div>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" outerRadius={72} dataKey="value" strokeWidth={0}>
                      {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Top Wilayas — REAL */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Revenue by Wilaya</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 18 }}>Top regions</div>
            {top_wilayas.length === 0
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text3)', fontSize: 13 }}>No data yet</div>
              : top_wilayas.map((w, i) => (
                <div key={w.wilaya} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      <span style={{ color: 'var(--text3)', marginRight: 6 }}>{i+1}.</span>{w.wilaya}
                      <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 11 }}>{w.orders} orders</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{fmt(w.revenue)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface4)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--red-dark),var(--red-light))', width: `${(w.revenue/maxWilaya)*100}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Top Products Table — REAL DATA ── */}
        <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Top Products Performance</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Ranked by revenue</div>
          </div>
          {top_products.length === 0
            ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No product data yet — sales stats appear once orders come in</div>
            : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Sales</th>
                    <th style={{ textAlign: 'right' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {top_products.map((p, i) => (
                    <tr key={p.id} className="an-row" style={{ transition: 'background 0.15s' }}>
                      <td style={{ color: 'var(--text3)', fontWeight: 700, width: 30 }}>{i+1}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>{p.category_name ?? '—'}{p.sku ? ` · ${p.sku}` : ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(p.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: p.stock === 0 ? '#e74c3c' : p.stock <= 10 ? '#f39c12' : '#27ae60' }}>{p.stock}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{p.total_sales}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{p.total_orders}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--red-light)' }}>{fmt(p.total_revenue)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text2)', fontSize: 12 }}>{(p.views ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

      </div>
    </>
  );
}