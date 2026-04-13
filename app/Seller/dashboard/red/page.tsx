'use client';
/**
 * app/seller/dashboard/red/page.tsx
 *
 * Red Pepper — Overview
 * ─────────────────────
 * Fetches REAL data via dashboardApi (same endpoint as Green dashboard).
 * Keeps the Red design language (dark surfaces, CSS vars from RedLayout).
 * NO mock data. NO static arrays.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApi } from '@/lib/sellerApi';
import type { DashboardData, TopProduct, MonthlyDataPoint } from '@/types/seller';
import {
  DollarSign, ShoppingBag, Package, Clock,
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  MapPin, Award, BarChart2, ArrowUpRight, Star, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

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

const PAYMENT_COLORS: Record<string, string> = {
  cod:    '#e74c3c',
  card:   '#3498db',
  d17:    '#27ae60',
  wallet: '#f39c12',
};

// ── animated counter ──
function useCount(target: number) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 900, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return val.toLocaleString();
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--red-light)' }}>{fmt(payload[0].value)}</div>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.fill, fontWeight: 700 }}>{payload[0].value} orders</div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, change, icon: Icon, accent }: {
  title: string; value: string | number; sub?: string;
  change?: number; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="kpi-card">
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: accent, opacity: 0.1, filter: 'blur(24px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: change >= 0 ? '#27ae60' : '#e74c3c', background: change >= 0 ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)', padding: '3px 8px', borderRadius: 999 }}>
            {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>{sub}</p>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: '0 0 14px 14px', opacity: 0.5 }} />
    </div>
  );
}

// ─── Top Product Card ─────────────────────────────────────────────────────────

function TopProductCard({ product, rank }: { product: TopProduct; rank: number }) {
  const [imgErr, setImgErr] = useState(false);
  const rankColors = ['#f39c12', '#888', '#f97316'];
  const rankColor = rankColors[rank - 1] ?? '#555';
  const imgSrc = product.primary_image_url && !imgErr ? product.primary_image_url : null;

  return (
    <div className="red-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
      {/* rank */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, width: 22, height: 22, borderRadius: '50%', background: rank <= 3 ? rankColor : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>
        {rank <= 3 ? <Star size={9} fill="#fff" stroke="none" /> : rank}
      </div>
      {/* status chips */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 999, background: product.is_active ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)', color: product.is_active ? '#27ae60' : '#e74c3c' }}>
          {product.is_active ? 'Active' : 'Off'}
        </span>
      </div>
      {/* image */}
      <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imgSrc
          ? <img src={imgSrc} alt={product.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Package size={24} style={{ color: 'var(--text3)' }} />}
      </div>
      {/* name */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
        <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>{product.category_name ?? '—'}</p>
      </div>
      {/* price + stock */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--red-light)' }}>{fmt(product.price)}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: product.stock === 0 ? '#e74c3c' : product.stock <= 10 ? '#f39c12' : '#27ae60' }}>
          {product.stock === 0 ? '⚠ Out' : `${product.stock} left`}
        </span>
      </div>
      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
        {[
          { icon: ShoppingBag, label: 'Sales',   val: product.total_sales,   color: 'var(--red-light)' },
          { icon: DollarSign,  label: 'Revenue', val: product.total_revenue > 0 ? `${(product.total_revenue/1000).toFixed(1)}k` : '0', color: '#27ae60' },
          { icon: Eye,         label: 'Views',   val: product.views,          color: '#3498db' },
        ].map(({ icon: I, label, val, color }) => (
          <div key={label} style={{ background: 'var(--surface3)', borderRadius: 7, padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--border)' }}>
            <I size={11} style={{ color }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ h = 120, w = '100%' }: { h?: number; w?: string }) {
  return <div style={{ height: h, width: w, borderRadius: 14, background: 'var(--surface3)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <AlertCircle size={22} color="var(--red)" />
        </div>
        <h3 style={{ fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Connection Error</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px' }}>
          Could not reach the API. Make sure Laravel is running on{' '}
          <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 5, fontSize: 11 }}>localhost:8000</code>.
        </p>
        <button onClick={onRetry} className="red-btn" style={{ margin: '0 auto' }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════

export default function RedOverviewPage() {
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

  // animated counters — unconditional hooks
  const cOrders   = useCount(data?.summary.total_orders   ?? 0);
  const cProducts = useCount(data?.summary.total_products ?? 0);
  const cPending  = useCount(data?.summary.pending_orders ?? 0);
  const cActive   = useCount(data?.summary.active_products ?? 0);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => <Skel key={i} h={120} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Skel h={280} /> <Skel h={280} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => <Skel key={i} h={260} />)}
      </div>
    </div>
  );

  if (error) return <ErrorState onRetry={load} />;
  if (!data)  return null;

  const { summary, charts, order_status_distribution, top_clients, top_wilayas, top_products = [], recent_orders } = data;

  // Build pie data from real order_status_distribution
  const pieData = Object.entries(order_status_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: STATUS_COLORS[name] ?? '#888',
  }));

  // Build bar data from real monthly_revenue
  const barData = (charts.monthly_revenue ?? []).map((d, i, arr) => ({
    month: d.month,
    revenue: d.revenue,
    isLast: i === arr.length - 1,
  }));

  const maxWilaya = Math.max(...(top_wilayas ?? []).map(w => w.revenue), 1);
  const totalStatusOrders = Object.values(order_status_distribution).reduce((a, b) => a + b, 0);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:.8} }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .ov-row:hover td { background: var(--surface3) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Header ── */}
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Overview</h1>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>Real-time store performance</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(192,57,43,0.12)', color: 'var(--red-light)', border: '1px solid var(--border-red)', padding: '4px 12px', borderRadius: 999 }}>
              🟢 Live
            </span>
            <button onClick={load} className="ghost-btn" style={{ padding: '6px 10px' }}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <KpiCard title="Total Revenue"  icon={DollarSign}  accent="var(--red)"    value={fmt(summary.total_revenue)}       sub="Completed & paid"            change={summary.revenue_growth} />
          <KpiCard title="Total Orders"   icon={ShoppingBag} accent="#3498db"       value={cOrders}                          sub={`${summary.pending_orders} pending`} />
          <KpiCard title="Products"       icon={Package}     accent="#27ae60"       value={cProducts}                        sub={`${summary.active_products} active`} />
          <KpiCard title="This Month"     icon={TrendingUp}  accent="#f39c12"       value={fmt(summary.revenue_this_month)}  sub={`Last: ${fmt(summary.revenue_last_month)}`} />
        </div>

        {/* ── Secondary KPIs ── */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Pending Orders',    val: cPending,  accent: '#f39c12', icon: Clock        },
            { label: 'Active Products',   val: cActive,   accent: '#27ae60', icon: Package      },
            { label: 'Pending Approvals', val: summary.pending_product_approvals, accent: 'var(--red)', icon: AlertCircle },
          ].map(({ label, val, accent, icon: I }) => (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}1a`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                <I size={17} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', lineHeight: 1 }}>{val}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenue Chart + Wilayas ── */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>

          {/* Monthly Revenue Bar Chart — REAL DATA */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Monthly Revenue</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Last 12 months · DT</div>
            </div>
            {barData.length === 0 ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No revenue data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.isLast ? '#e74c3c' : 'rgba(192,57,43,0.45)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Wilayas — REAL DATA */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(192,57,43,0.12)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                <MapPin size={15} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Top Wilayas</p>
                <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>By revenue</p>
              </div>
            </div>
            {(top_wilayas ?? []).length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>No data yet</p>
              : top_wilayas.map((w, i) => (
                <div key={w.wilaya} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}><span style={{ color: 'var(--text3)', marginRight: 6 }}>{i+1}.</span>{w.wilaya}</span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{fmt(w.revenue)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface4)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--red-dark),var(--red-light))', width: `${(w.revenue/maxWilaya)*100}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Order Status Pie + Top Clients ── */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Order Status Pie — REAL DATA */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Order Status</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>Distribution</div>
            {pieData.length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', paddingTop: 32 }}>No orders yet</p>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Top Clients — REAL DATA */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3498db' }}>
                <Award size={15} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Top Clients</p>
                <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>By lifetime revenue</p>
              </div>
            </div>
            {(top_clients ?? []).length === 0
              ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>No data yet</p>
              : top_clients.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: i===0?'rgba(243,156,18,0.2)':i===1?'rgba(136,136,136,0.2)':'rgba(249,115,22,0.2)', color: i===0?'#f39c12':i===1?'#888':'#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                    {i+1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--red-light)', margin: 0 }}>{fmt(c.total_revenue)}</p>
                    <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>{c.total_orders} orders</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Top Products — REAL DATA ── */}
        <div className="fade-up">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(243,156,18,0.12)', border: '1px solid rgba(243,156,18,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f39c12' }}>
                <BarChart2 size={15} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Top Products</p>
                <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>Ranked by units sold</p>
              </div>
            </div>
            <a href="/seller/dashboard/red/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--red-light)', textDecoration: 'none' }}>
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          {top_products.length === 0
            ? (
              <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', padding: '40px 20px', textAlign: 'center' }}>
                <Package size={28} style={{ color: 'var(--text3)', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: '0 0 4px' }}>No product data yet</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>Sales stats will appear once orders come in</p>
              </div>
            )
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                {top_products.map((p, i) => (
                  <TopProductCard key={p.id} product={p} rank={i + 1} />
                ))}
              </div>
            )
          }
        </div>

        {/* ── Recent Orders — REAL DATA ── */}
        <div className="fade-up" style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Recent Orders</p>
              <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>Latest orders with your products</p>
            </div>
            <a href="/seller/dashboard/red/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--red-light)', textDecoration: 'none' }}>
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {['Order', 'Customer', 'Status', 'Amount', 'Date'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 3 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recent_orders ?? []).length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: 'var(--text3)' }}>No recent orders</td></tr>
                  : recent_orders.map(order => {
                    const sc = STATUS_COLORS[order.status] ?? '#888';
                    return (
                      <tr key={order.id} className="ov-row" style={{ transition: 'background 0.15s' }}>
                        <td style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{order.order_number}</td>
                        <td style={{ color: 'var(--text)' }}>{order.user?.name ?? `User #${order.user_id}`}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${sc}18`, color: sc, border: `1px solid ${sc}30`, textTransform: 'capitalize' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc }} />
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text)' }}>{fmt(order.total_amount)}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 11 }}>{new Date(order.created_at).toLocaleDateString('fr-TN')}</td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}