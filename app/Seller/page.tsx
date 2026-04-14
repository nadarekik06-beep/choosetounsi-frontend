'use client';

/**
 * app/seller/dashboard/page.tsx  ← REPLACE EXISTING FILE
 *
 * Current version:
 *   - SubscriptionProvider lives in layout.tsx (not here)
 *   - SubscriptionBadge shown in the header bar
 *   - Advanced Analytics + AI Tools moved to /seller/analytics and /seller/ai-tools
 *   - All KPI cards, charts, top products, clients, orders — unchanged
 */

import { useEffect, useState, useRef } from 'react';
import { dashboardApi, storageUrl } from '../../lib/sellerApi';
import type { DashboardData, TopProduct } from '../../types/seller';
import RevenueChart from './components/RevenueChart';
import { useTheme } from './layout';
import {
  DollarSign, ShoppingBag, Package, Clock,
  MapPin, Award, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, ArrowUpRight,
  Star, Eye, BarChart2,
} from 'lucide-react';

// ── New imports ──────────────────────────────────────────────────────────────
import { SubscriptionBadge } from '@/app/components/seller/SubscriptionBadge';

/* ─────────────────────────────────────────────────────────────────
   HELPERS  (identical to original)
───────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  processing: '#3b82f6',
  completed:  '#10b981',
  delivered:  '#14b8a6',
  cancelled:  '#ef4444',
  refunded:   '#a855f7',
};

function useCount(target: number): string {
  const [val, setVal]  = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const duration = 900;
    const start    = performance.now();
    const tick = (now: number) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);
  return val.toLocaleString();
}

/* ─────────────────────────────────────────────────────────────────
   KPI CARD  (identical to original)
───────────────────────────────────────────────────────────────── */
function KpiCard({ title, value, subtitle, change, icon: Icon, accent, dark }: {
  title: string; value: string | number; subtitle?: string;
  change?: number; icon: React.ElementType; accent: string; dark: boolean;
}) {
  const bg        = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#fff'  : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div className="kpi-card" style={{
      background: bg, borderRadius: 18,
      border: `1px solid ${border}`,
      padding: '20px 20px 16px',
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
      cursor: 'default',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: accent, opacity: dark ? 0.12 : 0.08, filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          <Icon size={19} />
        </div>
        {change !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: change >= 0 ? '#10b981' : '#ef4444', background: change >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 999 }}>
            {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 22, fontWeight: 900, color: textMain, margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      {subtitle && <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{subtitle}</p>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: '0 0 18px 18px', opacity: 0.6 }} />
      <style>{`.kpi-card:hover{transform:translateY(-4px)!important;box-shadow:0 16px 40px rgba(0,0,0,0.15)!important}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TOP PRODUCT CARD  (identical to original)
───────────────────────────────────────────────────────────────── */
function TopProductCard({ product, rank, dark }: { product: TopProduct; rank: number; dark: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const bg        = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#94a3b8';
  const subBg     = dark ? 'rgba(255,255,255,0.05)' : '#f8fafc';

  const imgSrc     = product.primary_image_url ? (imgErr ? null : product.primary_image_url) : null;
  const rankColors = ['#f59e0b', '#94a3b8', '#f97316'];
  const rankColor  = rankColors[rank - 1] ?? '#64748b';

  return (
    <div className="top-product-card" style={{ background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, width: 24, height: 24, borderRadius: '50%', background: rank <= 3 ? rankColor : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', boxShadow: rank <= 3 ? `0 2px 8px ${rankColor}60` : 'none' }}>
        {rank <= 3 ? <Star size={10} fill="#fff" stroke="none" /> : rank}
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, zIndex: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: product.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: product.is_active ? '#10b981' : '#ef4444', border: `1px solid ${product.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {product.is_active ? 'Active' : 'Off'}
        </span>
      </div>
      <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: subBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={product.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Package size={28} style={{ color: textMuted, opacity: 0.4 }} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{product.category_name ?? '—'}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#db142e', letterSpacing: '-0.01em' }}>{fmt(product.price)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: product.stock === 0 ? '#ef4444' : product.stock <= 10 ? '#f59e0b' : '#10b981' }}>
          {product.stock === 0 ? '⚠ Out' : `${product.stock} in stock`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {[
          { icon: ShoppingBag, label: 'Sales',   value: product.total_sales,   color: '#db142e' },
          { icon: DollarSign,  label: 'Revenue', value: product.total_revenue > 0 ? `${(product.total_revenue / 1000).toFixed(1)}k` : '0', color: '#10b981' },
          { icon: Eye,         label: 'Views',   value: product.views,          color: '#3b82f6' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: subBg, borderRadius: 8, padding: '7px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: `1px solid ${border}` }}>
            <Icon size={12} style={{ color, opacity: 0.9 }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: textMain, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
          </div>
        ))}
      </div>
      <style>{`.top-product-card:hover{transform:translateY(-4px)!important;box-shadow:0 16px 36px rgba(0,0,0,0.15)!important}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SKELETON + ERROR  (identical to original)
───────────────────────────────────────────────────────────────── */
function Skeleton({ dark, style = {} }: { dark: boolean; style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 18, background: dark ? 'rgba(255,255,255,0.05)' : '#e5e7eb', animation: 'shimmer 1.4s infinite linear', ...style }} />;
}

function ErrorState({ onRetry, dark }: { onRetry: () => void; dark: boolean }) {
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} color="#db142e" />
        </div>
        <h3 style={{ fontWeight: 800, color: textMain, margin: '0 0 6px' }}>Connection Error</h3>
        <p style={{ fontSize: 13, color: textMuted, margin: '0 0 18px' }}>Could not reach the API. Make sure Laravel is running.</p>
        <button onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,20,46,0.35)' }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAGE
═════════════════════════════════════════════════════════════════*/
export default function SellerDashboardPage() {
  const { dark } = useTheme();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  const load = () => {
    setLoading(true); setError(false);
    dashboardApi.getOverview()
      .then(res => { setData(res.data); setTimeout(() => setVisible(true), 80); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const animTotalOrders      = useCount(data?.summary.total_orders            ?? 0);
  const animTotalProducts    = useCount(data?.summary.total_products          ?? 0);
  const animPendingOrders    = useCount(data?.summary.pending_orders          ?? 0);
  const animActiveProducts   = useCount(data?.summary.active_products         ?? 0);
  const animPendingApprovals = useCount(data?.summary.pending_product_approvals ?? 0);

  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#fff'  : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} dark={dark} style={{ height: 120 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Skeleton dark={dark} style={{ height: 320 }} />
        <Skeleton dark={dark} style={{ height: 320 }} />
      </div>
    </div>
  );

  if (error) return <ErrorState onRetry={load} dark={dark} />;
  if (!data)  return null;

  const { summary, charts, order_status_distribution, top_clients, top_wilayas, top_products = [], recent_orders } = data;
  const maxWilaya   = Math.max(...top_wilayas.map(w => w.revenue), 1);
  const totalOrders = Object.values(order_status_distribution).reduce((a, b) => a + b, 0);

  return (
    <>
      <style>{`
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4} }
          .fade-up{opacity:0}
          .fade-up.show{animation:fadeUp 0.45s ease forwards}
          .fade-up:nth-child(1){animation-delay:0.04s}
          .fade-up:nth-child(2){animation-delay:0.10s}
          .fade-up:nth-child(3){animation-delay:0.16s}
          .fade-up:nth-child(4){animation-delay:0.22s}
          .fade-up:nth-child(5){animation-delay:0.28s}
          .fade-up:nth-child(6){animation-delay:0.34s}
          .fade-up:nth-child(7){animation-delay:0.40s}
          .fade-up:nth-child(8){animation-delay:0.46s}
          .fade-up:nth-child(9){animation-delay:0.52s}
          .fade-up:nth-child(10){animation-delay:0.58s}
          tr.order-row:hover td{background:${dark?'rgba(255,255,255,0.03)':'#f9fafb'}!important}
          .client-row:hover{background:${dark?'rgba(255,255,255,0.03)':'#fafafa'}!important}
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ─── HEADER (with subscription badge) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Dashboard</h1>
              <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>Overview of your store performance</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* ← NEW: subscription badge */}
              <SubscriptionBadge dark={dark} />
              <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(219,20,46,0.12)', color: '#db142e', border: '1px solid rgba(219,20,46,0.25)', padding: '5px 14px', borderRadius: 999 }}>
                🟢 Live
              </span>
            </div>
          </div>

          {/* ─── KPI CARDS (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <KpiCard dark={dark} title="Total Revenue" icon={DollarSign} accent="#db142e" value={fmt(summary.total_revenue)} subtitle="Completed & paid" change={summary.revenue_growth} />
            <KpiCard dark={dark} title="Total Orders"  icon={ShoppingBag} accent="#3b82f6" value={animTotalOrders} subtitle={`${summary.pending_orders} pending`} />
            <KpiCard dark={dark} title="Products"      icon={Package} accent="#198f41" value={animTotalProducts} subtitle={`${summary.active_products} active`} />
            <KpiCard dark={dark} title="This Month"    icon={TrendingUp} accent="#f59e0b" value={fmt(summary.revenue_this_month)} subtitle={`Last: ${fmt(summary.revenue_last_month)}`} />
          </div>

          {/* ─── SECONDARY KPIs (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Pending Orders',    val: animPendingOrders,    accent: '#f59e0b', icon: Clock       },
              { label: 'Active Products',   val: animActiveProducts,   accent: '#198f41', icon: Package     },
              { label: 'Pending Approvals', val: animPendingApprovals, accent: '#db142e', icon: AlertCircle },
            ].map(({ label, val, accent, icon: Icon }) => (
              <div key={label} style={{ background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}1a`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 600 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ─── REVENUE CHART + WILAYAS (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <RevenueChart data={charts.monthly_revenue} />
            </div>
            <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(219,20,46,0.12)', border: '1px solid rgba(219,20,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db142e' }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: textMain, margin: 0 }}>Top Wilayas</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0, fontWeight: 500 }}>By revenue</p>
                </div>
              </div>
              {top_wilayas.length === 0
                ? <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No data yet</p>
                : top_wilayas.map((w, i) => (
                  <div key={w.wilaya} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: textMain, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: textMuted, fontSize: 10 }}>{i+1}.</span>{w.wilaya}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{fmt(w.revenue)}</span>
                    </div>
                    <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#db142e,#ff4d6a)', width: `${(w.revenue/maxWilaya)*100}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* ─── TOP PRODUCTS (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <BarChart2 size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 15, color: textMain, margin: 0, letterSpacing: '-0.01em' }}>Top Products</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0, fontWeight: 500 }}>Ranked by total units sold</p>
                </div>
              </div>
              <a href="/seller/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none' }}>
                View all <ArrowUpRight size={12} />
              </a>
            </div>
            {top_products.length === 0 ? (
              <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '48px 20px', textAlign: 'center' }}>
                <Package size={32} style={{ color: textMuted, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: '0 0 4px' }}>No product data yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {top_products.map((product, i) => (
                  <TopProductCard key={product.id} product={product} rank={i + 1} dark={dark} />
                ))}
              </div>
            )}
          </div>

          {/* ─── TOP CLIENTS + ORDER STATUS (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                  <Award size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: textMain, margin: 0 }}>Top Clients</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>By lifetime revenue</p>
                </div>
              </div>
              {top_clients.length === 0
                ? <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '28px 0' }}>No data yet</p>
                : top_clients.map((c, i) => (
                  <div key={c.id} className="client-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${border}`, transition: 'background 0.15s ease' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: i===0?'rgba(245,158,11,0.2)':i===1?'rgba(148,163,184,0.2)':'rgba(249,115,22,0.2)', color: i===0?'#f59e0b':i===1?'#94a3b8':'#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                      {i+1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: textMain, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 900, color: '#db142e', margin: 0 }}>{fmt(c.total_revenue)}</p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{c.total_orders} orders</p>
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(25,143,65,0.12)', border: '1px solid rgba(25,143,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#198f41' }}>
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: textMain, margin: 0 }}>Order Status</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>Distribution</p>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(order_status_distribution).length === 0
                  ? <p style={{ color: textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No orders yet</p>
                  : Object.entries(order_status_distribution).map(([status, count]) => {
                    const pct   = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                    const color = STATUS_COLORS[status] ?? '#94a3b8';
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: textMain, textTransform: 'capitalize' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />{status}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          {/* ─── RECENT ORDERS (unchanged) ─── */}
          <div className={`fade-up ${visible?'show':''}`} style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted }}>
                  <Clock size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: textMain, margin: 0 }}>Recent Orders</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>Latest 5 orders</p>
                </div>
              </div>
              <a href="/seller/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none' }}>
                View all <ArrowUpRight size={12} />
              </a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                    {['Order','Customer','Status','Amount','Date'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: i===2?'center':i===3?'right':'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent_orders.length === 0
                    ? <tr><td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: textMuted, fontSize: 13 }}>No recent orders</td></tr>
                    : recent_orders.map(order => {
                      const sc = STATUS_COLORS[order.status] ?? '#94a3b8';
                      return (
                        <tr key={order.id} className="order-row" style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 11, background: dark?'rgba(255,255,255,0.07)':'#f1f5f9', color: textMain, padding: '3px 8px', borderRadius: 6 }}>{order.order_number}</span>
                          </td>
                          <td style={{ padding: '12px 20px', color: textMain, fontWeight: 600 }}>{order.user?.name ?? `User #${order.user_id}`}</td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: `${sc}18`, color: sc, border: `1px solid ${sc}33`, textTransform: 'capitalize' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />{order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 900, color: textMain }}>{fmt(order.total_amount)}</td>
                          <td style={{ padding: '12px 20px', color: textMuted, fontWeight: 500 }}>{new Date(order.created_at).toLocaleDateString('fr-TN')}</td>
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