'use client';
/**
 * app/seller/dashboard/red/recommendations/page.tsx
 *
 * Red Pepper — Recommendations
 * ──────────────────────────────
 * Replaces the fake static component arrays with REAL data from dashboardApi.
 * Shows:
 *  - Real top products with stock alerts (from top_products)
 *  - Real pricing opportunities (products with low stock = potential uplifts)
 *  - Real restock alerts (products with stock <= 10)
 *  - AI bundle advisor and description tools (kept as-is, they use Groq)
 */

import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, productsApi } from '@/lib/sellerApi';
import type { DashboardData, TopProduct } from '@/types/seller';
import { RefreshCw, AlertCircle, Package, TrendingUp, BarChart2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' DT';

// ─── Restock Alerts ───────────────────────────────────────────────────────────
// Shows products with stock <= 10 from the real API

function RestockAlertsReal({ products }: { products: TopProduct[] }) {
  const lowStock = products.filter(p => p.stock <= 10).sort((a, b) => a.stock - b.stock);

  return (
    <div className="red-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Restock Alerts</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
          Products running low — from your actual catalog
        </div>
      </div>
      {lowStock.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          ✅ All your top products are well stocked
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th style={{ textAlign: 'right' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                  {p.name}
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{p.category_name ?? '—'}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: p.stock === 0 ? '#e74c3c' : '#f39c12', fontVariantNumeric: 'tabular-nums' }}>
                  {p.stock}
                </td>
                <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text2)' }}>
                  {p.stock === 0 ? 'Out of stock' : p.stock <= 5 ? 'Critical' : 'Low'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={p.stock <= 5 ? 'red-btn' : 'ghost-btn'}
                    style={{ padding: '4px 12px', fontSize: 11 }}
                  >
                    {p.stock === 0 ? '🚨 Urgent' : p.stock <= 5 ? '⚠ Restock' : 'Monitor'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Top Products by Revenue (replaces fake CatalogRecs) ──────────────────────

function TopRevenueProducts({ products }: { products: TopProduct[] }) {
  const sorted = [...products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 6);

  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Best Performing Products</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Ranked by total revenue generated</div>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
          No product performance data yet
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, transition: 'border-color 0.2s', cursor: 'default' }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-red)')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)' }}>#{i+1}</span>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.4 }}>
                {p.category_name ?? '—'} · {p.total_sales} units sold
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--red-light)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(p.total_revenue)}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3 }}>
                {p.total_orders} order{p.total_orders !== 1 ? 's' : ''} · {p.views ?? 0} views
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pricing Opportunities (replaces fake PricingOpportunities) ───────────────
// Products with high views but low sales = potential pricing/listing issues

function PricingOpportunitiesReal({ products }: { products: TopProduct[] }) {
  // Sort by views-to-sales ratio descending (high views, low conversion)
  const withRatio = products
    .filter(p => (p.views ?? 0) > 0 && p.total_sales > 0)
    .map(p => ({ ...p, ratio: (p.views ?? 0) / Math.max(p.total_sales, 1) }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  return (
    <div className="red-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>High-View, Low-Conversion Products</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
          Many views but few purchases — potential pricing or listing improvements
        </div>
      </div>
      {withRatio.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Not enough data yet — needs view + sales history
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'right' }}>Views</th>
              <th style={{ textAlign: 'right' }}>Sales</th>
              <th style={{ textAlign: 'right' }}>Conversion</th>
              <th style={{ textAlign: 'right' }}>Current Price</th>
            </tr>
          </thead>
          <tbody>
            {withRatio.map(p => {
              const convRate = p.total_sales > 0 && (p.views ?? 0) > 0
                ? ((p.total_sales / (p.views ?? 1)) * 100).toFixed(1)
                : '0.0';
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{p.name}</td>
                  <td style={{ textAlign: 'right', color: '#3498db', fontWeight: 600 }}>{(p.views ?? 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{p.total_sales}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: parseFloat(convRate) < 2 ? '#e74c3c' : '#27ae60' }}>
                    {convRate}%
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)' }}>
                    {fmt(p.price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 14, background: 'var(--surface3)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ═════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════

export default function RedRecommendationsPage() {
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
      <Skel h={180} />
      <Skel h={240} />
      <Skel h={200} />
    </div>
  );

  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Recommendations</h1>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(192,57,43,0.1)', border: '1px solid var(--border-red)', borderRadius: 12, padding: '14px 18px' }}>
          <AlertCircle size={18} color="var(--red)" />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Failed to load data.</span>
          <button onClick={load} className="ghost-btn" style={{ padding: '5px 12px', marginLeft: 'auto' }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}
    </div>
  );

  const topProducts = data.top_products ?? [];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Recommendations</h1>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>Data-driven insights from your real store performance</p>
          </div>
          <button onClick={load} className="ghost-btn" style={{ padding: '7px 14px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Restock Alerts — REAL */}
        <RestockAlertsReal products={topProducts} />

        {/* Top Revenue Products — REAL */}
        <TopRevenueProducts products={topProducts} />

        {/* Pricing Opportunities — REAL */}
        <PricingOpportunitiesReal products={topProducts} />

        {/* Info note about AI tools */}
        <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid var(--border-red)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--red-subtle)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={15} color="var(--red-light)" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              Want AI-powered recommendations?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
              Visit the <a href="/seller/dashboard/red/ai-tools" style={{ color: 'var(--red-light)', fontWeight: 600 }}>AI Tools</a> page for smart pricing, bundle suggestions, and SEO descriptions powered by Groq AI — using your real product data as context.
            </p>
          </div>
        </div>

      </div>
    </>
  );
}