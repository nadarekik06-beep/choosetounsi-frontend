'use client';

/**
 * components/seller/black/AIHubCard.tsx
 *
 * Standalone AI Intelligence card — extracted from BlackPepperHub.
 * Shows: Trending Products + Inventory Alerts + Market Insights.
 *
 * Props:
 *   dark        — theme
 *   defaultOpen — if true, renders fully expanded (no accordion header click needed)
 *                 used by the dedicated /seller/black/ai-intelligence page
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, TrendingUp, AlertTriangle, Flame, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle, Zap, Package,
} from 'lucide-react';
import { blackPepperApi, type AiHubData, type TrendingProduct, type InventoryAlert } from '@/lib/blackPepperApi';
import SmartActionButton from '@/app/components/seller/black/SmartActionButton';

const GOLD = '#f59e0b';

// ─── Signal badge ─────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: 'hot' | 'rising' | 'warm' }) {
  const cfg = {
    hot:    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   label: '🔥 Hot' },
    rising: { color: GOLD,     bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', label: '↑ Rising' },
    warm:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',   label: '~ Warm' },
  }[signal];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: 'critical' | 'high' | 'medium' }) {
  const cfg = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', label: 'Critical' },
    high:     { color: GOLD,     bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', label: 'High' },
    medium:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', label: 'Medium' },
  }[urgency];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Trending product row ─────────────────────────────────────────────────────

function TrendingRow({ item, dark }: { item: TrendingProduct; dark: boolean }) {
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const innerBg   = dark ? 'rgba(255,255,255,0.03)' : '#f9f9f9';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <div style={{
      background: innerBg, borderRadius: 14, border: `1px solid ${border}`,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.product_name}
            style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={16} color={GOLD} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.product_name}</p>
          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{item.category}</p>
        </div>
        <SignalBadge signal={item.trend_signal} />
      </div>

      {/* Velocity label */}
      <div style={{
        padding: '8px 12px', borderRadius: 10,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)',
      }}>
        <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
          {item.insight}
        </p>
      </div>

      {/* 3 stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'This week',  value: item.seven_day_units + ' sold',           color: GOLD },
          { label: 'Revenue',    value: item.seven_day_revenue.toFixed(0) + ' TND', color: '#34d399' },
          { label: 'Stock left', value: String(item.current_stock),               color: item.current_stock <= 5 ? '#f87171' : textMuted },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: 8, padding: '7px 10px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', fontWeight: 700 }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 900, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {item.smart_actions?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.smart_actions.map((action, i) => (
            <SmartActionButton
              key={i}
              label={action.label}
              icon={action.type === 'restock' ? Package : TrendingUp}
              href={action.href}
              color={action.type === 'restock' ? 'red' : 'gold'}
              size="sm"
              dark={dark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inventory alert row ──────────────────────────────────────────────────────

function AlertRow({ item, dark }: { item: InventoryAlert; dark: boolean }) {
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const innerBg   = dark ? 'rgba(255,255,255,0.03)' : '#f9f9f9';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const urgColor  = { critical: '#ef4444', high: GOLD, medium: '#60a5fa' }[item.urgency];

  return (
    <div style={{
      background: innerBg, borderRadius: 14,
      border: `1px solid ${urgColor}25`, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.product_name}
            style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
            background: `${urgColor}12`, border: `1px solid ${urgColor}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={16} color={urgColor} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.product_name}</p>
          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{item.category}</p>
        </div>
        <UrgencyBadge urgency={item.urgency} />
      </div>

      <div style={{
        padding: '8px 12px', borderRadius: 10,
        background: `${urgColor}08`, border: `1px solid ${urgColor}18`,
      }}>
        <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
          {item.insight}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Stock left',   value: String(item.current_stock),             color: urgColor },
          { label: 'Days left',    value: String(item.days_remaining),             color: urgColor },
          { label: 'Revenue risk', value: item.revenue_at_risk.toFixed(0) + ' TND', color: '#f87171' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: 8, padding: '7px 10px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', fontWeight: 700 }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 900, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {item.smart_actions?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.smart_actions.map((action, i) => (
            <SmartActionButton
              key={i}
              label={action.label}
              icon={action.type === 'restock' ? Package : TrendingUp}
              href={action.href}
              color={action.type === 'restock' ? 'red' : 'gold'}
              size="sm"
              dark={dark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Market temperature badge ─────────────────────────────────────────────────

function TempBadge({ temp }: { temp: 'hot' | 'warm' | 'cooling' | 'cold' }) {
  const cfg = {
    hot:     { color: '#ef4444', label: '🔥 Hot market' },
    warm:    { color: GOLD,     label: '☀ Warm market' },
    cooling: { color: '#60a5fa', label: '↓ Cooling market' },
    cold:    { color: '#94a3b8', label: '❄ Cold market' },
  }[temp];
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ dark }: { dark: boolean }) {
  const bg = dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{'@keyframes ai-shimmer{0%,100%{opacity:.5}50%{opacity:1}}'}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 110, borderRadius: 14, background: bg,
          animation: `ai-shimmer 1.4s ease ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AIHubCardProps {
  dark:         boolean;
  defaultOpen?: boolean; // true = no accordion, always expanded (used by dedicated page)
}

export default function AIHubCard({ dark, defaultOpen = false }: AIHubCardProps) {
  const [data,    setData]    = useState<AiHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [open,    setOpen]    = useState(defaultOpen);
  const [tab,     setTab]     = useState<'trending' | 'alerts' | 'insights'>('trending');

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await blackPepperApi.aiHub();
      setData(r.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#0f0d0a' : '#fffdf5';
  const border    = 'rgba(245,158,11,0.2)';
  const tabsBg    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const trendCount = data?.meta.trending_count ?? 0;
  const alertCount = data?.meta.alert_count    ?? 0;
  const critCount  = data?.meta.critical_count ?? 0;

  return (
    <div style={{
      background: cardBg, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden',
      boxShadow: dark ? '0 4px 32px rgba(245,158,11,0.06)' : '0 4px 24px rgba(245,158,11,0.08)',
    }}>

      {/* ── Header (accordion toggle — hidden when defaultOpen) ── */}
      {!defaultOpen && (
        <div
          onClick={() => setOpen(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', borderBottom: open ? `1px solid ${border}` : 'none',
            cursor: 'pointer',
            background: dark
              ? 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.03))'
              : 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa',
          }}>
            <Brain size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: 0 }}>AI Intelligence</p>
              {!loading && trendCount > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(245,158,11,0.15)', color: GOLD,
                  border: '1px solid rgba(245,158,11,0.35)', textTransform: 'uppercase' as const,
                }}>
                  {trendCount} trending
                </span>
              )}
              {!loading && critCount > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.35)', textTransform: 'uppercase' as const,
                }}>
                  {critCount} critical
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>
              Trending products, stock alerts and market insights
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); load(); }}
            disabled={loading}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: textMuted, padding: 4, borderRadius: 6, flexShrink: 0,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'ai-spin 0.8s linear infinite' : 'none' }} />
          </button>
          <div style={{ color: textMuted, flexShrink: 0 }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      {(open || defaultOpen) && (
        <div style={{ padding: 20 }}>

          {/* Refresh button (only in defaultOpen / page mode) */}
          {defaultOpen && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                onClick={load}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 9,
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                  color: GOLD, fontSize: 11, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <RefreshCw size={12} style={{ animation: loading ? 'ai-spin 0.8s linear infinite' : 'none' }} />
                Refresh
              </button>
            </div>
          )}

          {loading && <Skeleton dark={dark} />}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 10px' }}>Could not load AI Intelligence data.</p>
              <button onClick={load} style={{
                fontSize: 11, fontWeight: 700, color: GOLD,
                background: `${GOLD}12`, border: `1px solid ${GOLD}30`,
                borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
              }}>Retry</button>
            </div>
          )}

          {!loading && !error && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 4, background: tabsBg, borderRadius: 12, padding: 4 }}>
                {[
                  { key: 'trending',  label: `Trending (${trendCount})` },
                  { key: 'alerts',    label: `Stock Alerts (${alertCount})` },
                  { key: 'insights',  label: 'Market Insights' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key as any)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 9,
                      fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      background: tab === key ? `${GOLD}20` : 'transparent',
                      border: tab === key ? `1px solid ${GOLD}35` : '1px solid transparent',
                      color: tab === key ? GOLD : textMuted,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Trending tab */}
              {tab === 'trending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.trending_products.length === 0 ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                      background: 'rgba(16,185,129,0.08)', borderRadius: 12,
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                      <CheckCircle size={18} color="#10b981" />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>
                        No strong trends detected yet this week. Check back tomorrow.
                      </p>
                    </div>
                  ) : (
                    data.trending_products.map(item => (
                      <TrendingRow key={item.product_id} item={item} dark={dark} />
                    ))
                  )}
                </div>
              )}

              {/* Alerts tab */}
              {tab === 'alerts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.inventory_alerts.length === 0 ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                      background: 'rgba(16,185,129,0.08)', borderRadius: 12,
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                      <CheckCircle size={18} color="#10b981" />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>
                        All products have healthy stock levels. No restocking needed.
                      </p>
                    </div>
                  ) : (
                    data.inventory_alerts.map(item => (
                      <AlertRow key={item.product_id} item={item} dark={dark} />
                    ))
                  )}
                </div>
              )}

              {/* Market insights tab */}
              {tab === 'insights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: '16px 18px', borderRadius: 14,
                    background: dark ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.06)',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Brain size={16} color="#a78bfa" />
                      <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>
                        {data.market_insights.headline}
                      </p>
                      <TempBadge temp={data.market_insights.market_temperature} />
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.market_insights.insights.map((ins, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: textMain, lineHeight: 1.6 }}>{ins}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: `${GOLD}10`, border: `1px solid ${GOLD}20`,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Zap size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                        Priority Action
                      </p>
                      <p style={{ fontSize: 12.5, color: textMain, margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
                        {data.market_insights.priority_action}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{'@keyframes ai-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}