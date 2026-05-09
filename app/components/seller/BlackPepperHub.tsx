'use client';

/**
 * app/components/seller/BlackPepperHub.tsx
 *
 * The Black Pepper premium hub — injected into the seller dashboard.
 * Only rendered for Black plan sellers via useSubscription().isBlack.
 *
 * Sections:
 *   1. Elite Header Banner
 *   2. AI Hub (Trend Detection + Inventory Alerts + Market Insights)
 *   3. Profit Command Center (Revenue, Estimated Margins, Forecast)
 *   4. Visibility Control (Sponsored Products)
 *   5. VIP Lounge (Reel / Promotion / Support requests)
 *
 * FIX: market_temperature lives on market_insights, not on meta.
 *      The badge check in AiHubSection now reads data.market_insights.market_temperature.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Crown, TrendingUp, TrendingDown, AlertTriangle, Package,
  DollarSign, BarChart2, Zap, Star, Send, CheckCircle,
  Clock, ChevronDown, ChevronUp, RefreshCw, Eye, Flame,
  ShieldCheck, Sparkles, ArrowUpRight, Info,
} from 'lucide-react';
import { blackPepperApi } from '@/lib/blackPepperApi';
import type {
  AiHubData, ProfitCenterData, SponsoredProduct,
  VipRequest, VipRequestType,
} from '@/lib/blackPepperApi';

// ─── Gold / Black Design Tokens ───────────────────────────────────────────────
const GOLD   = '#f59e0b';
const GOLD_2 = '#fbbf24';
const BLACK  = '#0a0a0a';
const ELITE  = 'linear-gradient(135deg, #1a1206 0%, #2d1f08 50%, #1a1206 100%)';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

function GoldBadge({ text, dark }: { text: string; dark: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.12))',
      border: '1px solid rgba(245,158,11,0.45)',
      fontSize: 9, fontWeight: 800, color: GOLD,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      <Crown size={9} /> {text}
    </span>
  );
}

function SectionCard({
  title, subtitle, icon: Icon, accentColor = GOLD,
  children, dark, collapsible = false,
  badge,
}: {
  title: string; subtitle?: string; icon: React.ElementType;
  accentColor?: string; children: React.ReactNode;
  dark: boolean; collapsible?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const border    = 'rgba(245,158,11,0.2)';
  const bg        = dark ? '#0f0d0a' : '#fffdf5';
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{
      background: bg,
      borderRadius: 20,
      border: `1px solid ${border}`,
      overflow: 'hidden',
      boxShadow: dark ? '0 4px 32px rgba(245,158,11,0.06)' : '0 4px 24px rgba(245,158,11,0.08)',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: open ? `1px solid ${border}` : 'none',
          cursor: collapsible ? 'pointer' : 'default',
          background: dark
            ? 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(245,158,11,0.03))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
        }}
        onClick={() => collapsible && setOpen(p => !p)}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor,
        }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: 0 }}>{title}</p>
            {badge}
          </div>
          {subtitle && <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{subtitle}</p>}
        </div>
        {collapsible && (
          <div style={{ color: textMuted, flexShrink: 0 }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>
      {open && <div style={{ padding: 20 }}>{children}</div>}
    </div>
  );
}

function LoadingSpinner({ color = GOLD }: { color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid ${color}20`,
        borderTop: `3px solid ${color}`,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── 1. Elite Banner ──────────────────────────────────────────────────────────

export function EliteBanner({ dark }: { dark: boolean }) {
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.5)' : '#666';

  return (
    <div style={{
      background: dark ? ELITE : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
      borderRadius: 20,
      border: '1px solid rgba(245,158,11,0.35)',
      padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(245,158,11,0.12)',
    }}>
      {/* Background shimmer */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(245,158,11,0.08)', filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.15))',
        border: '1px solid rgba(245,158,11,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
      }}>
        <Crown size={24} color={GOLD} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: GOLD, margin: 0, letterSpacing: '-0.02em' }}>
            Black Seller Elite
          </h2>
          <GoldBadge text="Black Pepper" dark={dark} />
        </div>
        <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
          You have full access to all premium features — AI Hub, Profit Center, Visibility Control &amp; VIP Lounge.
        </p>
      </div>
      {/* Decorative stars */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {[...Array(3)].map((_, i) => (
          <Star key={i} size={14} fill={GOLD} color={GOLD} style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}

// ─── 2. AI Hub ────────────────────────────────────────────────────────────────

export function AiHubSection({ dark }: { dark: boolean }) {
  const [data,    setData]    = useState<AiHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await blackPepperApi.aiHub();
      setData(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load AI Hub');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const textMain    = dark ? '#fff' : '#111';
  const textMuted   = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg      = dark ? '#141209' : '#fff';
  const cardBdr     = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';

  const signalColors  = { hot: '#ef4444', rising: '#f59e0b', warm: '#10b981' };
  const urgencyColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6' };

  return (
    <SectionCard
      title="Advanced AI Hub"
      subtitle="Trend detection · Inventory intelligence · Market insights"
      icon={Sparkles}
      dark={dark}
      badge={
        // FIX: market_temperature lives on market_insights, not on meta
        data?.market_insights?.market_temperature === 'hot'
          ? <GoldBadge text="Market Hot 🔥" dark={dark} />
          : undefined
      }
    >
      {loading && <LoadingSpinner />}
      {error && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
          <button onClick={load} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, background: `${GOLD}18`, border: `1px solid ${GOLD}33`, color: GOLD, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Market Insights Banner */}
          {data.market_insights && (
            <div style={{
              background: dark
                ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
              borderRadius: 14, border: `1px solid ${GOLD}25`, padding: 16,
            }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: GOLD, margin: '0 0 10px' }}>
                {data.market_insights.headline}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.market_insights.insights.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: GOLD, fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>›</span>
                    <p style={{ fontSize: 12, color: textMain, margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{insight}</p>
                  </div>
                ))}
              </div>
              {data.market_insights.priority_action && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: GOLD, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ⚡ Priority Action
                  </p>
                  <p style={{ fontSize: 12, color: textMain, margin: 0, fontWeight: 600 }}>
                    {data.market_insights.priority_action}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trending Products */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: GOLD, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={13} /> Trending Products ({data.trending_products.length})
            </p>
            {data.trending_products.length === 0 ? (
              <p style={{ fontSize: 13, color: textMuted, textAlign: 'center', padding: '16px 0' }}>
                No trending signals yet — keep selling and check back tomorrow.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.trending_products.map(product => {
                  const sigColor = signalColors[product.trend_signal];
                  return (
                    <div key={product.product_id} style={{
                      background: cardBg, borderRadius: 12,
                      border: `1px solid ${cardBdr}`,
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}>
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                                  border: `1px solid ${sigColor}30` }}
                        />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: `${sigColor}15`, border: `1px solid ${sigColor}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Flame size={16} color={sigColor} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.product_name}
                          </p>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${sigColor}18`, color: sigColor, border: `1px solid ${sigColor}30`, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            {product.trend_signal === 'hot' ? '🔥 Hot' : product.trend_signal === 'rising' ? '📈 Rising' : '🌿 Warm'}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>{product.insight}</p>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                            {product.seven_day_units} units / 7d
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>
                            {fmt(product.seven_day_revenue)}
                          </span>
                          <span style={{ fontSize: 11, color: textMuted }}>
                            {product.velocity_multiplier}× velocity
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inventory Alerts */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} /> Inventory Alerts ({data.inventory_alerts.length})
            </p>
            {data.inventory_alerts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={16} color="#10b981" />
                <p style={{ fontSize: 13, color: '#10b981', margin: 0, fontWeight: 600 }}>All inventory levels are healthy.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.inventory_alerts.map(alert => {
                  const urgColor = urgencyColors[alert.urgency];
                  return (
                    <div key={alert.product_id} style={{
                      background: cardBg, borderRadius: 12,
                      border: `1px solid ${urgColor}28`,
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}>{alert.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={alert.image_url}
                      alt={alert.product_name}
                      style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                              border: `1px solid ${urgColor}28` }}
                    />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${urgColor}12`, border: `1px solid ${urgColor}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Package size={16} color={urgColor} />
                    </div>
                  )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>{alert.product_name}</p>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${urgColor}15`, color: urgColor, border: `1px solid ${urgColor}28`, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {alert.urgency}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px', lineHeight: 1.4 }}>{alert.insight}</p>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: urgColor }}>
                            {alert.days_remaining} days left
                          </span>
                          <span style={{ fontSize: 11, color: textMuted }}>
                            Restock: {alert.restock_units} units
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                            Risk: {fmt(alert.revenue_at_risk)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── 3. Profit Command Center ─────────────────────────────────────────────────

export function ProfitCenterSection({ dark }: { dark: boolean }) {
  const [data,    setData]    = useState<ProfitCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<'overview' | 'products' | 'forecast'>('overview');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await blackPepperApi.profitCenter();
      setData(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load Profit Center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';
  const tabsBg    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const marginColors: Record<string, string> = { excellent: '#10b981', good: '#3b82f6', fair: '#f59e0b', low: '#ef4444' };

  return (
    <SectionCard
      title="Profit Command Center"
      subtitle="Revenue · Estimated margins · 30-day forecast"
      icon={DollarSign}
      dark={dark}
      collapsible
    >
      {loading && <LoadingSpinner />}
      {error && <p style={{ color: '#ef4444', textAlign: 'center', fontSize: 13 }}>{error}</p>}

      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
            <Info size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: textMuted, margin: 0, lineHeight: 1.5 }}>
              {data.summary.margin_disclaimer}
            </p>
          </div>

          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Revenue (90d)', value: fmt(data.summary.total_revenue_90d), color: GOLD, icon: DollarSign },
              { label: 'Est. Profit (90d)', value: fmt(data.summary.estimated_profit_90d), color: '#10b981', icon: TrendingUp },
              { label: 'Est. Margin', value: data.summary.estimated_margin_pct + '%', color: '#3b82f6', icon: BarChart2 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{ background: cardBg, borderRadius: 12, border: `1px solid ${cardBdr}`, padding: '14px 16px', textAlign: 'center' }}>
                <Icon size={16} color={color} style={{ margin: '0 auto 6px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.01em' }}>{value}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: tabsBg, borderRadius: 10, padding: 4 }}>
            {(['overview', 'products', 'forecast'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                background: tab === t ? `${GOLD}20` : 'transparent',
                border: tab === t ? `1px solid ${GOLD}35` : '1px solid transparent',
                color: tab === t ? GOLD : textMuted,
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                textTransform: 'capitalize', transition: 'all 0.15s',
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.period_breakdown.map(period => {
                const maxRev = Math.max(...data.period_breakdown.map(p => p.revenue), 1);
                const barPct = (period.revenue / maxRev) * 100;
                return (
                  <div key={period.month} style={{ background: cardBg, borderRadius: 10, border: `1px solid ${cardBdr}`, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: textMain }}>{period.month}</span>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{fmt(period.revenue)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>~{fmt(period.estimated_profit)}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_2})`, borderRadius: 999, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: textMuted }}>{period.units} units</span>
                      <span style={{ fontSize: 10, color: textMuted }}>{period.orders} orders</span>
                      <span style={{ fontSize: 10, color: textMuted }}>AOV: {fmt(period.avg_order_value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Products Tab */}
          {tab === 'products' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.product_margins.length === 0 ? (
                <p style={{ color: textMuted, textAlign: 'center', fontSize: 13, padding: '16px 0' }}>No sales data yet.</p>
              ) : data.product_margins.map(product => {
                const mc = marginColors[product.margin_label] ?? GOLD;
                return (
                  <div key={product.product_id} style={{ background: cardBg, borderRadius: 10, border: `1px solid ${cardBdr}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.product_name}</p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{product.total_units} units · {fmt(product.total_revenue)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 900, color: mc, margin: '0 0 2px' }}>{product.margin_pct.toFixed(1)}%</p>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${mc}15`, color: mc, border: `1px solid ${mc}28`, textTransform: 'uppercase' }}>
                        {product.margin_label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Forecast Tab */}
          {tab === 'forecast' && (
            data.forecast ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${cardBdr}`, padding: '14px 16px' }}>
                    <p style={{ fontSize: 12, color: textMuted, margin: '0 0 4px', fontWeight: 700 }}>Next 30 Days</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: GOLD, margin: '0 0 2px' }}>{fmt(data.forecast.next_30_days)}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: data.forecast.growth_pct >= 0 ? '#10b981' : '#ef4444' }}>
                      {pct(data.forecast.growth_pct)} vs last 30d
                    </span>
                  </div>
                  <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${cardBdr}`, padding: '14px 16px' }}>
                    <p style={{ fontSize: 12, color: textMuted, margin: '0 0 4px', fontWeight: 700 }}>Trend Direction</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {data.forecast.trend === 'up' ? <TrendingUp size={20} color="#10b981" /> : data.forecast.trend === 'down' ? <TrendingDown size={20} color="#ef4444" /> : <BarChart2 size={20} color={GOLD} />}
                      <span style={{ fontSize: 16, fontWeight: 900, color: textMain, textTransform: 'capitalize' }}>{data.forecast.trend}</span>
                    </div>
                    <span style={{ fontSize: 10, color: textMuted }}>Confidence: {data.forecast.confidence}</span>
                  </div>
                </div>
                {/* Mini forecast chart */}
                <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${cardBdr}`, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>30-Day Forecast</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
                    {data.forecast.daily_points.map((point, i) => {
                      const maxVal = Math.max(...data.forecast!.daily_points.map(p => p.predicted), 1);
                      const h = Math.max(4, (point.predicted / maxVal) * 56);
                      return (
                        <div
                          key={i}
                          title={`${point.day}: ${fmt(point.predicted)}`}
                          style={{
                            flex: 1, height: h, borderRadius: 2,
                            background: `linear-gradient(0deg, ${GOLD}, ${GOLD_2})`,
                            opacity: 0.5 + (i / data.forecast!.daily_points.length) * 0.5,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: textMuted }}>Today</span>
                    <span style={{ fontSize: 9, color: textMuted }}>+30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: textMuted, textAlign: 'center', fontSize: 13, padding: '16px 0' }}>
                Need at least 7 days of sales data to generate a forecast.
              </p>
            )
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── 4. Visibility Control ────────────────────────────────────────────────────

export function VisibilitySection({ dark }: { dark: boolean }) {
  const [products, setProducts] = useState<SponsoredProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blackPepperApi.getSponsoredProducts();
      setProducts(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (product: SponsoredProduct) => {
    setToggling(product.id);
    try {
      await blackPepperApi.toggleSponsorship(
        product.id,
        product.is_sponsored ? 'deactivate' : 'activate',
        5
      );
      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, is_sponsored: !p.is_sponsored, sponsored_priority: p.is_sponsored ? 0 : 5 }
          : p
      ));
    } catch (e: any) {
      alert(e.message ?? 'Failed to update sponsorship');
    } finally {
      setToggling(null);
    }
  };

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';

  const sponsoredCount = products.filter(p => p.is_sponsored).length;

  return (
    <SectionCard
      title="Visibility Control Panel"
      subtitle="Sponsored products · Homepage boost · Ranking system"
      icon={Eye}
      dark={dark}
      collapsible
      badge={sponsoredCount > 0 ? <GoldBadge text={`${sponsoredCount} Sponsored`} dark={dark} /> : undefined}
    >
      {loading && <LoadingSpinner />}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: `${GOLD}10`, border: `1px solid ${GOLD}20`, marginBottom: 4 }}>
            <p style={{ fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.5 }}>
              Sponsored products appear with a ⭐ badge on the storefront and are ranked higher in search results. Activate sponsorship on your best-performing products for maximum visibility.
            </p>
          </div>

          {products.length === 0 && (
            <p style={{ color: textMuted, textAlign: 'center', fontSize: 13, padding: '16px 0' }}>
              No active products found. Add products first.
            </p>
          )}

          {products.map(product => (
            <div key={product.id} style={{
              background: cardBg, borderRadius: 12,
              border: `1px solid ${product.is_sponsored ? `${GOLD}35` : cardBdr}`,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: product.is_sponsored ? `0 2px 12px ${GOLD}12` : 'none',
              transition: 'all 0.2s ease',
            }}>
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `${GOLD}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={18} color={GOLD} />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  {product.is_sponsored && <Star size={11} fill={GOLD} color={GOLD} />}
                  <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{product.price.toFixed(3)} TND</span>
                  <span style={{ fontSize: 11, color: textMuted }}>{product.stock} in stock</span>
                  {product.is_sponsored && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, background: `${GOLD}15`, padding: '1px 6px', borderRadius: 999, border: `1px solid ${GOLD}25` }}>
                      Priority {product.sponsored_priority}
                    </span>
                  )}
                </div>
              </div>

              <button
                disabled={toggling === product.id || !product.is_approved || !product.is_active}
                onClick={() => handleToggle(product)}
                style={{
                  padding: '7px 14px', borderRadius: 8, flexShrink: 0,
                  background: product.is_sponsored ? 'rgba(239,68,68,0.12)' : `${GOLD}18`,
                  border: `1px solid ${product.is_sponsored ? 'rgba(239,68,68,0.25)' : `${GOLD}35`}`,
                  color: product.is_sponsored ? '#ef4444' : GOLD,
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  opacity: (toggling === product.id || !product.is_approved || !product.is_active) ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {toggling === product.id ? '...' : product.is_sponsored ? 'Deactivate' : '⭐ Sponsor'}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── 5. VIP Lounge ───────────────────────────────────────────────────────────

export function VipLoungeSection({ dark }: { dark: boolean }) {
  const [requests,   setRequests]   = useState<VipRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState<{ type: VipRequestType; message: string }>({
    type: 'reel', message: '',
  });
  const [success,   setSuccess]   = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blackPepperApi.getVipRequests();
      setRequests(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.message.trim() || form.message.length < 10) {
      setFormError('Please describe your request (minimum 10 characters).');
      return;
    }
    setSubmitting(true); setFormError(null); setSuccess(null);
    try {
      const res = await blackPepperApi.submitVipRequest(form.type, form.message);
      setSuccess(res.message);
      setForm({ type: 'reel', message: '' });
      load();
    } catch (e: any) {
      setFormError(e.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const inputBg   = dark ? 'rgba(255,255,255,0.05)' : '#f9f7f0';
  const inputBdr  = dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.25)';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';

  const typeConfig: Record<VipRequestType, { icon: string; label: string; desc: string }> = {
    reel:      { icon: '🎬', label: 'Request Reel',      desc: 'Professional video reel for your products' },
    promotion: { icon: '📣', label: 'Request Promotion', desc: 'Featured placement on homepage & socials' },
    support:   { icon: '👑', label: 'VIP Support',       desc: 'Priority 1-on-1 support from our team' },
  };

  const statusColors: Record<string, string> = {
    pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', rejected: '#ef4444',
  };

  return (
    <SectionCard
      title="VIP Lounge"
      subtitle="Request reels · Promotions · Priority support"
      icon={Crown}
      accentColor={GOLD}
      dark={dark}
      collapsible
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {(Object.keys(typeConfig) as VipRequestType[]).map(type => {
            const cfg        = typeConfig[type];
            const isSelected = form.type === type;
            return (
              <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{
                padding: '12px 10px', borderRadius: 12, textAlign: 'center',
                background: isSelected ? `${GOLD}18` : 'transparent',
                border: `1px solid ${isSelected ? `${GOLD}45` : inputBdr}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.icon}</div>
                <p style={{ fontSize: 11, fontWeight: 800, color: isSelected ? GOLD : textMuted, margin: '0 0 2px' }}>{cfg.label}</p>
                <p style={{ fontSize: 9, color: textMuted, margin: 0, lineHeight: 1.3 }}>{cfg.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Message textarea */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Describe your request
          </label>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder={`Tell us about your ${typeConfig[form.type].label.toLowerCase()}...`}
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              background: inputBg, border: `1px solid ${inputBdr}`,
              color: textMain, fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 10, color: textMuted, margin: '4px 0 0', textAlign: 'right' }}>
            {form.message.length} / 1000
          </p>
        </div>

        {/* Error / Success */}
        {formError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0, fontWeight: 600 }}>{formError}</p>}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={14} color="#10b981" />
            <p style={{ fontSize: 12, color: '#10b981', margin: 0, fontWeight: 600 }}>{success}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: '12px 0', borderRadius: 12,
            background: submitting ? 'rgba(245,158,11,0.3)' : `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`,
            border: 'none', color: '#000',
            fontSize: 13, fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: submitting ? 'none' : `0 4px 18px ${GOLD}40`,
            transition: 'all 0.2s',
          }}
        >
          <Send size={14} />
          {submitting ? 'Submitting...' : `Submit ${typeConfig[form.type].label}`}
        </button>

        {/* Previous requests */}
        {!loading && requests.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 10px' }}>
              Your Requests ({requests.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map(req => {
                const sc = statusColors[req.status] ?? GOLD;
                return (
                  <div key={req.id} style={{
                    background: cardBg, borderRadius: 10,
                    border: `1px solid ${cardBdr}`, padding: '10px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{typeConfig[req.type as VipRequestType]?.icon ?? '📋'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: textMain, margin: 0 }}>{req.type_label}</p>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${sc}15`, color: sc, border: `1px solid ${sc}28`, textTransform: 'uppercase' }}>
                          {req.status_label}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: textMuted, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.message}</p>
                      {req.admin_note && (
                        <p style={{ fontSize: 11, color: '#10b981', margin: 0, fontWeight: 600 }}>💬 {req.admin_note}</p>
                      )}
                      <p style={{ fontSize: 10, color: textMuted, margin: '4px 0 0' }}>
                        <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                        {new Date(req.created_at).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function BlackPepperHub({ dark }: { dark: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Divider with label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.2)' }} />
        <GoldBadge text="⬛ Black Pepper — Elite Features" dark={dark} />
        <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.2)' }} />
      </div>

      <EliteBanner dark={dark} />
      <AiHubSection dark={dark} />
      <ProfitCenterSection dark={dark} />
      <VisibilitySection dark={dark} />
      <VipLoungeSection dark={dark} />
    </div>
  );
}