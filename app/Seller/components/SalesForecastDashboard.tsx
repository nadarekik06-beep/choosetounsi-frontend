'use client';

/**
 * app/components/seller/SalesForecastDashboard.tsx
 *
 * The complete Sales Forecast Analytics dashboard for ChooseTounsi sellers.
 *
 * Features:
 *   - Product selector
 *   - 6-month projection chart (history + forecast combined, ECharts)
 *   - Tunisia regional demand heatmap (ECharts scatter/bubble)
 *   - Demand score gauge
 *   - Upcoming events calendar
 *   - Similar products comparison
 *   - AI explanation panel
 *   - Stock recommendation
 *   - Confidence indicator
 *
 * Uses: ECharts via echarts-for-react (install: npm i echarts echarts-for-react)
 * Falls back to Recharts if echarts-for-react is not installed.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Brain, Package,
  MapPin, Calendar, Target, AlertTriangle, Loader2,
  RefreshCw, ChevronDown, Star, Info, Layers,
  BarChart3, Globe, Sparkles, ArrowUpRight, Clock,
} from 'lucide-react';

import {
  forecastApi,
  type ForecastResult,
  type RegionalDemandResult,
  type SimilarProductsResult,
  type EventSignal,
  type AIExplanation,
} from '@/lib/sellerForecastApi';
import { productsApi } from '@/lib/sellerApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
const fmtTND = (n: number) => fmt(n) + ' TND';

const CONF_COLORS = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' } as const;
const TREND_COLORS = { up: '#10b981', down: '#ef4444', stable: '#3b82f6' } as const;
const EVENT_COLORS: Record<string, string> = {
  ramadan: '#8b5cf6', eid: '#f59e0b', summer: '#f97316',
  school: '#3b82f6', economy: '#10b981', tourism: '#06b6d4',
};
const EVENT_EMOJIS: Record<string, string> = {
  ramadan: '🌙', eid: '🎉', summer: '☀️', school: '📚', economy: '💰', tourism: '🌍',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ dark, h = 120 }: { dark: boolean; h?: number }) {
  return (
    <div style={{
      height: h, borderRadius: 16,
      background: dark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
      animation: 'shimmer 1.4s infinite linear',
    }} />
  );
}

function DemandScoreGauge({ score, dark }: { score: number; dark: boolean }) {
  const color =
    score >= 70 ? '#10b981' :
    score >= 40 ? '#f59e0b' :
    '#ef4444';
  const label =
    score >= 70 ? 'High Demand' :
    score >= 40 ? 'Moderate' :
    'Low Demand';

  const circumference = 2 * Math.PI * 40;
  const strokeDash = (score / 100) * circumference;

  const text = dark ? '#fff' : '#111';
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="40" fill="none"
            stroke={dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'} strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: muted, fontWeight: 700 }}>/100</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color, margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 600 }}>Demand Score</p>
      </div>
    </div>
  );
}

function ConfidenceBadge({ label, dataPoints, dark }: {
  label: 'high' | 'medium' | 'low'; dataPoints: number; dark: boolean;
}) {
  const color = CONF_COLORS[label];
  const icon  = label === 'high' ? '✓' : label === 'medium' ? '◎' : '○';
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 12px', borderRadius: 999,
        background: `${color}18`, border: `1px solid ${color}30`,
        fontSize: 11, fontWeight: 800, color,
      }}>
        {icon} {label.charAt(0).toUpperCase() + label.slice(1)} confidence
      </span>
      <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 600 }}>
        Based on {dataPoints} real orders
      </p>
    </div>
  );
}

/** Inline ECharts-style line chart built with SVG (no dependency needed) */
function ForecastLineChart({ history, projections, dark }: {
  history: ForecastResult['history'];
  projections: ForecastResult['projections'];
  dark: boolean;
}) {
  const W = 700; const H = 200; const PAD = 40;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 1.5;

  const allPoints = [
    ...history.map(h => ({ label: h.label, value: h.units, type: 'history' as const })),
    ...projections.map(p => ({ label: p.label, value: p.predicted_units, type: 'forecast' as const, event: p.event_name })),
  ];

  if (allPoints.length === 0) return null;

  const maxVal = Math.max(...allPoints.map(p => p.value), 1);
  const step   = innerW / Math.max(1, allPoints.length - 1);

  const toCoord = (i: number, val: number) => ({
    x: PAD + i * step,
    y: PAD + innerH - (val / maxVal) * innerH,
  });

  const historyPath = history.map((h, i) => {
    const { x, y } = toCoord(i, h.units);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const forecastPath = projections.map((p, i) => {
    const { x, y } = toCoord(history.length - 1 + i, i === 0 ? (history[history.length - 1]?.units ?? p.predicted_units) : p.predicted_units);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const text  = dark ? 'rgba(255,255,255,0.5)' : '#888';
  const grid  = dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD + innerH - pct * innerH;
        return (
          <g key={pct}>
            <line x1={PAD} y1={y} x2={PAD + innerW} y2={y} stroke={grid} strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="9" fill={text}>
              {Math.round(maxVal * pct)}
            </text>
          </g>
        );
      })}

      {/* Today divider */}
      {history.length > 0 && (
        <line
          x1={PAD + (history.length - 1) * step}
          y1={PAD}
          x2={PAD + (history.length - 1) * step}
          y2={PAD + innerH}
          stroke={dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}

      {/* History line */}
      <path d={historyPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

      {/* Forecast line (dashed) */}
      <path d={forecastPath} fill="none" stroke="#10b981" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="6 4" />

      {/* Event boost markers */}
      {projections.map((p, i) => {
        if (!p.event_name) return null;
        const { x, y } = toCoord(history.length - 1 + i, p.predicted_units);
        return (
          <g key={p.month}>
            <circle cx={x} cy={y} r="5" fill="#f59e0b" />
            <text x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="bold">
              ⚡
            </text>
          </g>
        );
      })}

      {/* X-axis labels (every 2nd point) */}
      {allPoints.map((pt, i) => {
        if (i % 2 !== 0) return null;
        const { x } = toCoord(i, 0);
        const shortLabel = pt.label.split(' ')[0].slice(0, 3);
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill={text}>
            {shortLabel}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${PAD}, ${H - 20})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#3b82f6" strokeWidth="2.5" />
        <text x="25" y="4" fontSize="9" fill={text}>History</text>
        <line x1="70" y1="0" x2="90" y2="0" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" />
        <text x="95" y="4" fontSize="9" fill={text}>Forecast</text>
        <circle cx="150" cy="0" r="4" fill="#f59e0b" />
        <text x="158" y="4" fontSize="9" fill={text}>Event boost</text>
      </g>
    </svg>
  );
}

/** Tunisia heatmap — bubble map using SVG coordinates */
function TunisiaHeatmap({ regional, dark }: {
  regional: RegionalDemandResult;
  dark: boolean;
}) {
  if (!regional.has_data || regional.regions.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 200, gap: 8,
      }}>
        <MapPin size={28} style={{ color: dark ? 'rgba(255,255,255,0.2)' : '#ccc' }} />
        <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.35)' : '#aaa', margin: 0 }}>
          No regional data yet — orders with wilaya will populate this map.
        </p>
      </div>
    );
  }

  // Normalize Tunisia lat/lng to SVG coordinates
  // Tunisia bounding box: lat 30.2–37.5, lng 7.5–11.6
  const latMin = 30.2; const latMax = 37.5;
  const lngMin = 7.5;  const lngMax = 11.6;
  const W = 260; const H = 320;

  const toSVG = (lat: number, lng: number) => ({
    x: ((lng - lngMin) / (lngMax - lngMin)) * W,
    y: ((latMax - lat) / (latMax - latMin)) * H,
  });

  const regionsWithCoords = regional.regions.filter(r => r.lat && r.lng);
  const maxIndex = Math.max(...regionsWithCoords.map(r => r.demand_index), 1);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 200, height: 250, flexShrink: 0 }}>
        {/* Tunisia outline approximation */}
        <rect x={0} y={0} width={W} height={H} fill="none" />

        {regionsWithCoords.map(region => {
          const { x, y } = toSVG(region.lat!, region.lng!);
          const intensity = region.demand_index / 100;
          const r = Math.max(4, intensity * 18);
          const alpha = Math.max(0.15, intensity);
          const color = region.demand_index === 0
            ? (dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')
            : `rgba(219, 20, 46, ${alpha})`;
          const borderColor = region.demand_index === 0
            ? (dark ? 'rgba(255,255,255,0.12)' : '#d1d5db')
            : `rgba(219, 20, 46, ${Math.min(1, alpha + 0.2)})`;

          return (
            <g key={region.wilaya}>
              <circle
                cx={x} cy={y} r={r}
                fill={color}
                stroke={borderColor}
                strokeWidth="1"
              />
              {region.demand_index > 30 && (
                <text
                  x={x} y={y + 3}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="bold"
                  fill={dark ? '#fff' : '#111'}
                  style={{ pointerEvents: 'none' }}
                >
                  {region.wilaya.slice(0, 3)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Top regions list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {regional.regions
          .filter(r => r.demand_index > 0)
          .sort((a, b) => b.demand_index - a.demand_index)
          .slice(0, 8)
          .map((region, i) => (
            <div key={region.wilaya} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : 'rgba(219,20,46,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 900,
                color: i < 3 ? '#fff' : '#db142e', flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: dark ? '#fff' : '#111',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {region.wilaya}
                  </span>
                  <span style={{ fontSize: 9, color: '#db142e', fontWeight: 800, flexShrink: 0, marginLeft: 4 }}>
                    {region.total_units} units
                  </span>
                </div>
                <div style={{ height: 3, background: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: 'linear-gradient(90deg, #db142e, #ff4d6a)',
                    width: `${region.demand_index}%`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            </div>
          ))}
        {regional.regions.every(r => r.demand_index === 0) && (
          <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.35)' : '#aaa', margin: 0, fontStyle: 'italic' }}>
            No orders yet — regional data will appear with first sales.
          </p>
        )}
      </div>
    </div>
  );
}

function EventsCalendar({ events, dark }: { events: EventSignal[]; dark: boolean }) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const text   = dark ? '#fff' : '#111';

  if (events.length === 0) {
    return (
      <p style={{ fontSize: 12, color: muted, margin: 0, textAlign: 'center', padding: '20px 0' }}>
        No upcoming events for this product category.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map(ev => {
        const color  = EVENT_COLORS[ev.type] ?? '#6b7280';
        const emoji  = EVENT_EMOJIS[ev.type] ?? '📅';
        const urgent = ev.days_until <= 14;

        return (
          <div key={ev.slug} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 12,
            background: urgent ? `${color}10` : (dark ? 'rgba(255,255,255,0.03)' : '#fafafa'),
            border: urgent ? `1px solid ${color}30` : `1px solid ${border}`,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color, margin: '0 0 2px' }}>{ev.name}</p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>
                {new Date(ev.starts_at).toLocaleDateString('fr-TN')} → {new Date(ev.ends_at).toLocaleDateString('fr-TN')}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                ×{ev.boost_score.toFixed(2)}
              </p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>
                {ev.days_until === 0 ? '🔴 Now' : `in ${ev.days_until}d`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimilarProductsList({ data, dark }: { data: SimilarProductsResult; dark: boolean }) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  if (!data.has_data || data.similar.length === 0) {
    return (
      <p style={{ fontSize: 12, color: muted, margin: 0, textAlign: 'center', padding: '20px 0' }}>
        No similar products found in this subcategory yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Market position summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        padding: '12px 14px', borderRadius: 12,
        background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
        border: `1px solid ${border}`,
      }}>
        {[
          { label: 'Your Monthly', val: `${data.own_monthly_units}`, color: '#db142e' },
          { label: 'Market Median', val: `${data.market_median_monthly_units}`, color: '#3b82f6' },
          { label: 'Market Price Avg', val: fmtTND(data.market_avg_price), color: '#10b981' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 900, color, margin: '0 0 2px' }}>{val}</p>
            <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      {data.insights.map((ins, i) => {
        const bgColor = ins.type === 'warning' ? 'rgba(239,68,68,0.06)'
          : ins.type === 'positive' ? 'rgba(16,185,129,0.06)'
          : ins.type === 'opportunity' ? 'rgba(245,158,11,0.06)'
          : (dark ? 'rgba(255,255,255,0.03)' : '#f8fafc');
        const borderColor = ins.type === 'warning' ? 'rgba(239,68,68,0.18)'
          : ins.type === 'positive' ? 'rgba(16,185,129,0.18)'
          : ins.type === 'opportunity' ? 'rgba(245,158,11,0.18)'
          : border;
        const icon = ins.type === 'warning' ? '⚠️'
          : ins.type === 'positive' ? '✅'
          : ins.type === 'opportunity' ? '💡'
          : 'ℹ️';

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: bgColor, border: `1px solid ${borderColor}`,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
            <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.8)' : '#333', margin: 0, lineHeight: 1.5 }}>
              {ins.message}
            </p>
          </div>
        );
      })}

      {/* Top 5 similar products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.similar.slice(0, 5).map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 10,
            background: dark ? 'rgba(255,255,255,0.03)' : '#fafafa',
            border: `1px solid ${border}`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: muted, minWidth: 16 }}>#{i + 1}</span>
            {p.primary_image && (
              <img src={p.primary_image} alt={p.name}
                style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: text, margin: '0 0 1px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{p.name}</p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>{fmtTND(p.price)}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', flexShrink: 0 }}>
              {p.monthly_units}/mo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIExplanationPanel({ explanation, loading, dark }: {
  explanation: AIExplanation | null; loading: boolean; dark: boolean;
}) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
        <Loader2 size={16} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: muted, margin: 0 }}>AI is analyzing your forecast…</p>
      </div>
    );
  }

  if (!explanation) return null;

  const sections = [
    { icon: '📊', label: 'Summary',     content: explanation.summary,          color: '#3b82f6' },
    { icon: '💡', label: 'Opportunity', content: explanation.main_opportunity,  color: '#10b981' },
    { icon: '⚠️', label: 'Risk',        content: explanation.main_risk,         color: '#f59e0b' },
    { icon: '🌙', label: 'Season Tip',  content: explanation.seasonal_tip,      color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sections.map(({ icon, label, content, color }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: `${color}06`, border: `1px solid ${color}18`,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, color, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </p>
            <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.82)' : '#333', margin: 0, lineHeight: 1.6 }}>
              {content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({
  title, icon: Icon, accent = '#db142e', children, dark, badge,
}: {
  title: string; icon: React.ElementType; accent?: string;
  children: React.ReactNode; dark: boolean; badge?: React.ReactNode;
}) {
  const bg     = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{
      background: bg, borderRadius: 18, border: `1px solid ${border}`,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `${accent}18`, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0,
          }}>
            <Icon size={15} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 13, color: text, margin: 0 }}>{title}</p>
        </div>
        {badge}
      </div>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function SalesForecastDashboard({ dark }: { dark: boolean }) {
  const [products,      setProducts]      = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);

  const [forecast,      setForecast]      = useState<ForecastResult | null>(null);
  const [regional,      setRegional]      = useState<RegionalDemandResult | null>(null);
  const [similar,       setSimilar]       = useState<SimilarProductsResult | null>(null);
  const [events,        setEvents]        = useState<EventSignal[]>([]);
  const [explanation,   setExplanation]   = useState<AIExplanation | null>(null);

  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingRegional, setLoadingRegional] = useState(false);
  const [loadingSimilar,  setLoadingSimilar]  = useState(false);
  const [loadingExplain,  setLoadingExplain]  = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Load product list
  useEffect(() => {
    productsApi.getAll({ per_page: 50 })
      .then(res => {
        const list: any[] = res?.data?.data ?? res?.data ?? [];
        setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  const runForecast = useCallback(async (productId: number, refresh = false) => {
    setLoadingForecast(true);
    setLoadingRegional(true);
    setLoadingSimilar(true);
    setError(null);
    setForecast(null);
    setRegional(null);
    setSimilar(null);
    setExplanation(null);
    setEvents([]);

    try {
      // Parallel fetch: forecast + regional + similar + events
      const [forecastRes, regionalRes, similarRes] = await Promise.all([
        forecastApi.getForecast(productId, 6, refresh),
        forecastApi.getRegional(productId),
        forecastApi.getSimilar(productId),
      ]);

      setForecast(forecastRes.data);
      setRegional(regionalRes.data);
      setSimilar(similarRes.data);

      setLoadingForecast(false);
      setLoadingRegional(false);
      setLoadingSimilar(false);

      // Events — use category slug from forecast result
      const catSlug = (forecastRes.data as any).category_slug;
      const eventsRes = await forecastApi.getEvents(catSlug);
      setEvents(eventsRes.data);

      // AI explanation (non-blocking)
      setLoadingExplain(true);
      try {
        const explainRes = await forecastApi.getAIExplanation(
          productId,
          forecastRes.data,
          regionalRes.data,
          'fr'
        );
        setExplanation(explainRes.data);
      } catch {
        // fail silently — explanation is bonus
      } finally {
        setLoadingExplain(false);
      }

    } catch (e: any) {
      setError(e.message ?? 'Forecast failed');
      setLoadingForecast(false);
      setLoadingRegional(false);
      setLoadingSimilar(false);
    }
  }, []);

  // Auto-run when product selected
  useEffect(() => {
    if (selectedId) runForecast(selectedId);
  }, [selectedId, runForecast]);

  const bg     = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const trendColor = forecast
    ? (TREND_COLORS[forecast.overall_trend] ?? '#3b82f6')
    : '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{opacity:0.4} 50%{opacity:0.8} 100%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Product Selector ── */}
      <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: 'rgba(219,20,46,0.12)', border: '1px solid rgba(219,20,46,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db142e',
            }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <p style={{ fontWeight: 900, fontSize: 14, color: text, margin: '0 0 1px' }}>Sales Forecast</p>
              <p style={{ fontSize: 10, color: muted, margin: 0 }}>6-month forward projection · Tunisia-calibrated</p>
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
            background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.25)', color: '#f87171',
          }}>
            🔴 Red Pepper
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value) || null)}
              style={{
                width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10,
                border: `1px solid ${border}`,
                background: dark ? '#1e2330' : '#f8fafc',
                color: dark ? '#fff' : '#111',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                appearance: 'none', outline: 'none',
                colorScheme: dark ? 'dark' : 'light',
              }}
            >
              <option value="">— Select a product to forecast —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: dark ? '#fff' : '#111', pointerEvents: 'none',
            }} />
          </div>

          {selectedId && (
            <button
              onClick={() => runForecast(selectedId, true)}
              disabled={loadingForecast}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10,
                background: loadingForecast ? 'rgba(219,20,46,0.3)' : 'linear-gradient(135deg,#db142e,#a00f22)',
                color: '#fff', fontWeight: 700, fontSize: 12, border: 'none',
                cursor: loadingForecast ? 'not-allowed' : 'pointer',
              }}
            >
              {loadingForecast
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <RefreshCw size={13} />
              }
              {loadingForecast ? 'Forecasting…' : 'Refresh'}
            </button>
          )}
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, margin: '10px 0 0', fontWeight: 600 }}>{error}</p>
        )}
      </div>

      {/* Loading skeletons */}
      {loadingForecast && !forecast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} dark={dark} h={90} />)}
          </div>
          <Skeleton dark={dark} h={220} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Skeleton dark={dark} h={280} />
            <Skeleton dark={dark} h={280} />
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {forecast && !loadingForecast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s ease' }}>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              {
                label: '6-Month Forecast',
                value: `${forecast.total_predicted_units}`,
                sub: 'units predicted',
                color: trendColor,
                icon: '📦',
              },
              {
                label: 'Predicted Revenue',
                value: fmtTND(forecast.total_predicted_revenue),
                sub: '6-month potential',
                color: '#10b981',
                icon: '💰',
              },
              {
                label: 'Peak Month',
                value: forecast.peak_month?.label ?? '—',
                sub: `${forecast.peak_month?.predicted_units ?? 0} units expected`,
                color: '#f59e0b',
                icon: '🔥',
              },
              {
                label: 'Stock Needed (3m)',
                value: `${forecast.stock_recommendation_3m}`,
                sub: 'units (30% buffer)',
                color:
                  forecast.stock_recommendation_3m > forecast.current_stock
                    ? '#ef4444'
                    : '#10b981',
                icon: '📊',
              },
            ].map(({ label, value, sub, color, icon }) => (
              <div key={label} style={{
                background: bg, borderRadius: 14, border: `1px solid ${border}`,
                padding: '14px 16px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 70, height: 70,
                  borderRadius: '50%', background: color, opacity: dark ? 0.1 : 0.06, filter: 'blur(16px)',
                }} />
                <p style={{ fontSize: 18, margin: '0 0 6px' }}>{icon}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontSize: 9, fontWeight: 800, color: muted, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </p>
                <p style={{ fontSize: 10, color: muted, margin: 0 }}>{sub}</p>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '0 0 14px 14px',
                }} />
              </div>
            ))}
          </div>

          {/* Demand score + confidence */}
          <div style={{
            background: bg, borderRadius: 18, border: `1px solid ${border}`,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <DemandScoreGauge score={forecast.demand_score} dark={dark} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <ConfidenceBadge
                label={forecast.confidence_label}
                dataPoints={forecast.data_points}
                dark={dark}
              />
              {forecast.blend_note && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <Info size={11} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  <p style={{ fontSize: 10, color: muted, margin: 0, lineHeight: 1.4 }}>
                    {forecast.blend_note}
                  </p>
                </div>
              )}
            </div>

            {/* Trend */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                background: `${trendColor}18`, border: `1px solid ${trendColor}30`,
              }}>
                {forecast.overall_trend === 'up'     && <TrendingUp size={14} style={{ color: trendColor }} />}
                {forecast.overall_trend === 'down'   && <TrendingDown size={14} style={{ color: trendColor }} />}
                {forecast.overall_trend === 'stable' && <Minus size={14} style={{ color: trendColor }} />}
                <span style={{ fontSize: 11, fontWeight: 800, color: trendColor }}>
                  {forecast.overall_trend === 'up'     ? 'Growing'  :
                   forecast.overall_trend === 'down'   ? 'Declining' :
                   'Stable'} trend
                </span>
              </div>
              <p style={{ fontSize: 9, color: muted, margin: '4px 0 0', fontWeight: 600 }}>
                slope: {forecast.trend_slope > 0 ? '+' : ''}{forecast.trend_slope} units/mo
              </p>
            </div>
          </div>

          {/* Forecast chart */}
          <Card title="6-Month Forecast Chart" icon={TrendingUp} accent="#10b981" dark={dark}>
            <ForecastLineChart
              history={forecast.history}
              projections={forecast.projections}
              dark={dark}
            />
            {/* Monthly table */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {forecast.projections.map(p => {
                const confColor = CONF_COLORS[p.confidence];
                return (
                  <div key={p.month} style={{
                    textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                    background: p.event_name ? 'rgba(245,158,11,0.08)' : subBg,
                    border: p.event_name ? '1px solid rgba(245,158,11,0.2)' : `1px solid ${border}`,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: muted, margin: '0 0 3px' }}>
                      {p.label.split(' ')[0].slice(0, 3)}
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#10b981', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                      {p.predicted_units}
                    </p>
                    <p style={{ fontSize: 8, color: muted, margin: '0 0 3px' }}>units</p>
                    {p.event_name && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: 4 }}>
                        ⚡ event
                      </span>
                    )}
                    <div style={{ marginTop: 3, width: 6, height: 6, borderRadius: '50%', background: confColor, margin: '3px auto 0' }} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 2-column grid: Regional + Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Tunisia Heatmap */}
            <Card title="Regional Demand" icon={MapPin} accent="#db142e" dark={dark}
              badge={
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', color: '#db142e' }}>
                  🇹🇳 Tunisia
                </span>
              }
            >
              {loadingRegional ? (
                <Skeleton dark={dark} h={200} />
              ) : regional ? (
                <TunisiaHeatmap regional={regional} dark={dark} />
              ) : null}
            </Card>

            {/* Upcoming Events */}
            <Card title="Tunisia Events Calendar" icon={Calendar} accent="#f59e0b" dark={dark}>
              <EventsCalendar events={events} dark={dark} />
            </Card>

          </div>

          {/* 2-column grid: Similar products + AI Explanation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Similar Products */}
            <Card title="Market Comparison" icon={Layers} accent="#6b7280" dark={dark}
              badge={
                similar?.count ? (
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(107,114,128,0.12)', border: `1px solid ${border}`, color: muted }}>
                    {similar.count} similar
                  </span>
                ) : undefined
              }
            >
              {loadingSimilar ? (
                <Skeleton dark={dark} h={200} />
              ) : similar ? (
                <SimilarProductsList data={similar} dark={dark} />
              ) : null}
            </Card>

            {/* AI Explanation */}
            <Card title="AI Analysis" icon={Brain} accent="#8b5cf6" dark={dark}
              badge={
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6' }}>
                  Powered by Groq
                </span>
              }
            >
              <AIExplanationPanel
                explanation={explanation}
                loading={loadingExplain}
                dark={dark}
              />
            </Card>

          </div>

          {/* Stock recommendation banner */}
          {forecast.stock_recommendation_3m > forecast.current_stock && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '0 0 2px' }}>
                  Stock shortfall detected
                </p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                  You need <strong style={{ color: text }}>{forecast.stock_recommendation_3m} units</strong> for the next 3 months but only have{' '}
                  <strong style={{ color: text }}>{forecast.current_stock}</strong>.
                  Restock <strong style={{ color: '#ef4444' }}>{forecast.stock_recommendation_3m - forecast.current_stock} units</strong> now.
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', margin: '0 0 1px', letterSpacing: '-0.02em' }}>
                  -{forecast.stock_recommendation_3m - forecast.current_stock}
                </p>
                <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 700 }}>units short</p>
              </div>
            </div>
          )}

          {forecast.stock_recommendation_3m <= forecast.current_stock && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <Package size={20} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#10b981', margin: '0 0 2px' }}>
                  Stock level is sufficient ✓
                </p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                  Current stock ({forecast.current_stock} units) covers the 3-month forecast ({forecast.stock_recommendation_3m} needed).
                </p>
              </div>
            </div>
          )}

          {/* Computed by */}
          <p style={{ fontSize: 9, color: muted, margin: 0, textAlign: 'center', fontWeight: 600 }}>
            Computed at {new Date(forecast.computed_at).toLocaleString('fr-TN')} ·{' '}
            {forecast._cache_hit ? '⚡ Cached' : '🔄 Fresh'} · {forecast.computed_by}
          </p>

        </div>
      )}

      {/* Empty state */}
      {!selectedId && !forecast && (
        <div style={{
          background: bg, borderRadius: 18, border: `1px solid ${border}`,
          padding: '48px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={24} style={{ color: '#db142e' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: '0 0 6px' }}>
            Select a product to forecast
          </p>
          <p style={{ fontSize: 12, color: muted, margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            The AI will analyze your sales history, Tunisia seasonal patterns, and upcoming events
            to generate a 6-month forward forecast with regional demand heatmap.
          </p>
        </div>
      )}
    </div>
  );
}