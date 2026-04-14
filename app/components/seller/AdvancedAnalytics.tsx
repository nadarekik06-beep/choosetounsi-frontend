'use client';

/**
 * components/seller/AdvancedAnalytics.tsx
 *
 * Advanced analytics section rendered inside the seller dashboard for Red+ sellers.
 * Features:
 *   - Period comparison KPIs (week-over-week, month-over-month)
 *   - Daily/weekly revenue charts
 *   - Revenue by payment method (donut-style bars)
 *   - Product performance table with conversion rates
 *   - Customer segments (RFM-lite)
 *   - Order heatmap (hour × day-of-week)
 *
 * All data comes from real DB queries via SellerAnalyticsController.
 */

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, CreditCard,
  Package, RefreshCw, AlertCircle, Zap,
} from 'lucide-react';
import { analyticsApi, type AnalyticsOverview, type ProductAnalytics, type CustomerAnalytics } from '@/lib/sellerAiApi';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

const SEGMENT_COLORS: Record<string, string> = {
  Champion: '#10b981', Loyal: '#3b82f6', Regular: '#f59e0b',
  'At Risk': '#f97316', Lost: '#ef4444',
};

const PAYMENT_COLORS: Record<string, string> = {
  cod: '#10b981', card: '#3b82f6', d17: '#8b5cf6',
  wallet: '#f59e0b', stripe: '#6366f1', unknown: '#94a3b8',
};

// ─── Micro components ─────────────────────────────────────────────────────────

function MiniKPI({
  label, value, change, icon: Icon, accent, dark,
}: {
  label: string; value: string | number; change?: number;
  icon: React.ElementType; accent: string; dark: boolean;
}) {
  const bg      = dark ? '#161b27' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textM   = dark ? '#fff' : '#111';
  const textMu  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1a`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={16} />
        </div>
        {change !== undefined && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 800,
            color: change >= 0 ? '#10b981' : '#ef4444',
            background: change >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '2px 7px', borderRadius: 999,
          }}>
            {change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 900, color: textM, margin: '0 0 2px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
        <p style={{ fontSize: 11, color: textMu, margin: 0, fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, accent, dark }: {
  icon: React.ElementType; title: string; subtitle: string; accent: string; dark: boolean;
}) {
  const textM  = dark ? '#fff' : '#111';
  const textMu = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1a`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
        <Icon size={16} />
      </div>
      <div>
        <p style={{ fontWeight: 900, fontSize: 14, color: textM, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 10, color: textMu, margin: 0, fontWeight: 500 }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdvancedAnalytics({ dark }: { dark: boolean }) {
  const [overview,   setOverview]   = useState<AnalyticsOverview | null>(null);
  const [products,   setProducts]   = useState<ProductAnalytics | null>(null);
  const [customers,  setCustomers]  = useState<CustomerAnalytics | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<'overview' | 'products' | 'customers'>('overview');

  const cardBg   = dark ? '#161b27' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain = dark ? '#fff'  : '#111';
  const textMuted= dark ? 'rgba(255,255,255,0.4)' : '#888';
  const gridBg   = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [ov, pr, cu] = await Promise.all([
        analyticsApi.overview().then(r => r.data),
        analyticsApi.products().then(r => r.data),
        analyticsApi.customers().then(r => r.data),
      ]);
      setOverview(ov); setProducts(pr); setCustomers(cu);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`@keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 100, borderRadius: 16, background: dark ? 'rgba(255,255,255,0.05)' : '#e5e7eb', animation: 'shimmer 1.4s infinite linear' }} />
        ))}
      </div>
      <div style={{ height: 300, borderRadius: 18, background: dark ? 'rgba(255,255,255,0.05)' : '#e5e7eb', animation: 'shimmer 1.4s infinite linear' }} />
    </div>
  );

  if (error) return (
    <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '32px 24px', textAlign: 'center' }}>
      <AlertCircle size={28} style={{ color: '#db142e', margin: '0 auto 12px', display: 'block' }} />
      <p style={{ color: textMain, fontWeight: 700, margin: '0 0 6px' }}>Analytics Error</p>
      <p style={{ color: textMuted, fontSize: 12, margin: '0 0 16px' }}>{error}</p>
      <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#db142e', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );

  if (!overview || !products || !customers) return null;

  const tabs = [
    { key: 'overview' as const,  label: 'Overview'  },
    { key: 'products' as const,  label: 'Products'  },
    { key: 'customers' as const, label: 'Customers' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Red Pepper section header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(219,20,46,0.08) 0%, rgba(219,20,46,0.03) 100%)',
        border: '1px solid rgba(219,20,46,0.2)',
        borderRadius: 18, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(219,20,46,0.15)', border: '1px solid rgba(219,20,46,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db142e' }}>
            <Zap size={18} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.01em' }}>Advanced Analytics</p>
            <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>Deep insights powered by your real sales data</p>
          </div>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(219,20,46,0.12)', border: '1px solid rgba(219,20,46,0.3)', fontSize: 10, fontWeight: 800, color: '#f87171' }}>
          🔴 Red Pepper
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', borderRadius: 12, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 9,
            fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
            background: activeTab === t.key ? (dark ? '#1e2535' : '#fff') : 'transparent',
            color: activeTab === t.key ? textMain : textMuted,
            boxShadow: activeTab === t.key ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {/* Period KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <MiniKPI dark={dark} icon={TrendingUp} accent="#db142e" label="This Week" value={fmt(overview.period_stats.this_week)} change={overview.period_stats.week_growth} />
            <MiniKPI dark={dark} icon={TrendingUp} accent="#3b82f6" label="This Month" value={fmt(overview.period_stats.this_month)} change={overview.period_stats.month_growth} />
            <MiniKPI dark={dark} icon={ShoppingCart} accent="#10b981" label="Avg Order Value" value={fmt(overview.avg_order_value)} />
            <MiniKPI dark={dark} icon={Users} accent="#f59e0b" label="Repeat Rate" value={`${overview.repeat_customers.repeat_rate_pct}%`} />
          </div>

          {/* Weekly revenue chart */}
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '20px' }}>
            <SectionHeader icon={TrendingUp} title="Weekly Revenue" subtitle="Last 8 weeks" accent="#db142e" dark={dark} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview.charts.weekly_revenue} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'} />
                <XAxis dataKey="week" tick={{ fill: textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: dark ? '#1e2535' : '#fff', border: `1px solid ${border}`, borderRadius: 10, color: textMain }}
                  formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="url(#redGrad)">
                  <defs>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#db142e" />
                      <stop offset="100%" stopColor="#a00f22" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily revenue (last 30 days) */}
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '20px' }}>
            <SectionHeader icon={TrendingUp} title="Daily Revenue" subtitle="Last 30 days" accent="#3b82f6" dark={dark} />
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={overview.charts.daily_revenue} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'} />
                <XAxis dataKey="day" tick={{ fill: textMuted, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: dark ? '#1e2535' : '#fff', border: `1px solid ${border}`, borderRadius: 10, color: textMain }}
                  formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
                />
                <Line dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by payment method */}
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '20px' }}>
            <SectionHeader icon={CreditCard} title="Revenue by Payment Method" subtitle="Distribution across payment types" accent="#8b5cf6" dark={dark} />
            {overview.revenue_by_payment.length === 0 ? (
              <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No payment data</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const total = overview.revenue_by_payment.reduce((s, r) => s + r.revenue, 0);
                  return overview.revenue_by_payment.map(r => {
                    const color = PAYMENT_COLORS[r.method] ?? '#94a3b8';
                    const p = total > 0 ? Math.round((r.revenue / total) * 100) : 0;
                    return (
                      <div key={r.method}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: textMain, textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {r.method}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                            {fmt(r.revenue)} · {r.orders} orders
                          </span>
                        </div>
                        <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: color, width: `${p}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <>
          {/* Stock health */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Healthy Stock', val: products.stock_health.healthy,   color: '#10b981', icon: Package },
              { label: 'Low Stock',     val: products.stock_health.low_stock, color: '#f59e0b', icon: Package },
              { label: 'Out of Stock',  val: products.stock_health.out,       color: '#ef4444', icon: Package },
            ].map(({ label, val, color, icon }) => (
              <div key={label} style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}1a`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  <Package size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: 0 }}>{val}</p>
                  <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 600 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue by category */}
          {products.by_category.length > 0 && (
            <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '20px' }}>
              <SectionHeader icon={Package} title="Revenue by Category" subtitle="Your categories ranked by performance" accent="#f59e0b" dark={dark} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {products.by_category.slice(0, 5).map((cat, i) => {
                  const maxRev = products.by_category[0]?.total_revenue || 1;
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textMain }}>
                          {i + 1}. {cat.category}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                          {fmt(cat.total_revenue)} · {cat.product_count} products
                        </span>
                      </div>
                      <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb', borderRadius: 999 }}>
                        <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg,#f59e0b,#fbbf24)`, width: `${(cat.total_revenue / maxRev) * 100}%`, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product performance table */}
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontWeight: 900, fontSize: 13, color: textMain, margin: 0 }}>Product Performance</p>
              <p style={{ fontSize: 10, color: textMuted, margin: '2px 0 0' }}>Ranked by revenue · Conversion = orders ÷ views</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: gridBg }}>
                    {['Product', 'Revenue', 'Units', 'Conv.%', 'Stock'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.products.slice(0, 15).map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '10px 16px', color: textMain, fontWeight: 600 }}>
                        <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: textMuted }}>{p.category_name}</div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#db142e' }}>{fmt(p.total_revenue)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: textMain, fontWeight: 700 }}>{p.total_units}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{ color: p.conversion_rate > 5 ? '#10b981' : p.conversion_rate > 1 ? '#f59e0b' : textMuted, fontWeight: 700 }}>
                          {p.conversion_rate.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{ color: p.stock === 0 ? '#ef4444' : p.stock <= 10 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {activeTab === 'customers' && (
        <>
          {/* Segment summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12 }}>
            {customers.segments.map(seg => {
              const color = SEGMENT_COLORS[seg.segment] ?? '#94a3b8';
              return (
                <div key={seg.segment} style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color }}>{seg.segment}</span>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px' }}>{seg.count}</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{fmt(seg.revenue)}</p>
                </div>
              );
            })}
          </div>

          {/* Customer list */}
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontWeight: 900, fontSize: 13, color: textMain, margin: 0 }}>RFM Customer Analysis</p>
              <p style={{ fontSize: 10, color: textMuted, margin: '2px 0 0' }}>Recency × Frequency × Monetary scoring</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: gridBg }}>
                    {['Customer', 'Segment', 'Orders', 'Total Spent', 'Last Order', 'RFM'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : i > 1 ? 'right' : 'center', fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.customers.slice(0, 20).map(c => {
                    const segColor = SEGMENT_COLORS[c.segment] ?? '#94a3b8';
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '10px 16px' }}>
                          <p style={{ margin: 0, fontWeight: 700, color: textMain }}>{c.name}</p>
                          <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{c.email}</p>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: `${segColor}18`, color: segColor, border: `1px solid ${segColor}33` }}>
                            {c.segment}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: textMain }}>{c.order_count}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#db142e' }}>{fmt(c.total_spent)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: textMuted, fontSize: 11 }}>
                          {c.days_since_last}d ago
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: c.rfm_score >= 4 ? '#10b981' : c.rfm_score >= 3 ? '#f59e0b' : '#ef4444' }}>
                            {c.rfm_score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}