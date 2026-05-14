'use client';

/**
 * SalesForecastDashboard.tsx — AUTO-RELOAD VERSION
 *
 * Changes vs previous version:
 *  1. Auto-reloads regional + similar data every 60 seconds (polling)
 *  2. Re-fetches ALL data when browser tab regains focus (visibilitychange)
 *  3. runForecast() always sends refresh=true (never serves stale cache)
 *  4. "Last updated X min ago" indicator so seller knows data freshness
 *  5. Manual refresh button always forces recompute
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Brain, Package,
  MapPin, Calendar, AlertTriangle, Loader2,
  RefreshCw, ChevronDown, Info, Layers, BarChart3,
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
import TunisiaHeatmap from '@/app/components/seller/TunisiaHeatmap';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
const fmtTND = (n: number) => fmt(n) + ' TND';

const CONF_COLORS  = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' } as const;
const TREND_COLORS = { up: '#10b981', down: '#ef4444', stable: '#3b82f6' } as const;
const EVENT_COLORS: Record<string, string> = {
  ramadan: '#8b5cf6', eid: '#f59e0b', summer: '#f97316',
  school: '#3b82f6', economy: '#10b981', tourism: '#06b6d4',
};
const EVENT_EMOJIS: Record<string, string> = {
  ramadan: '🌙', eid: '🎉', summer: '☀️', school: '📚', economy: '💰', tourism: '🌍',
};

// ─── Auto-reload interval (ms) ────────────────────────────────────────────────
const LIVE_POLL_INTERVAL = 60_000; // 60 seconds — refresh regional + similar

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

function LiveBadge({ lastUpdated, dark }: { lastUpdated: Date | null; dark: boolean }) {
  const [age, setAge] = useState<string>('just now');
  const muted = dark ? 'rgba(255,255,255,0.38)' : '#888';

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diff < 10)  setAge('just now');
      else if (diff < 60)  setAge(`${diff}s ago`);
      else if (diff < 3600) setAge(`${Math.floor(diff / 60)}min ago`);
      else setAge(`${Math.floor(diff / 3600)}h ago`);
    };
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  if (!lastUpdated) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, fontWeight: 700, color: muted,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#10b981',
        animation: 'pulse-green 2s infinite',
      }}/>
      Updated {age}
    </span>
  );
}

function DemandScoreGauge({ score, dark }: { score: number; dark: boolean }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'High Demand' : score >= 40 ? 'Moderate' : 'Low Demand';
  const circ  = 2 * Math.PI * 40;
  const dash  = (score / 100) * circ;
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke={dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'} strokeWidth="10"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

function ForecastLineChart({ history, projections, dark }: {
  history: ForecastResult['history'];
  projections: ForecastResult['projections'];
  dark: boolean;
}) {
  const W = 700; const H = 200; const PAD = 40;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 1.5;

  const allPts = [
    ...history.map(h => ({ label: h.label, value: h.units })),
    ...projections.map(p => ({ label: p.label, value: p.predicted_units })),
  ];
  if (allPts.length === 0) return null;

  const maxVal = Math.max(...allPts.map(p => p.value), 1);
  const step   = innerW / Math.max(1, allPts.length - 1);
  const coord  = (i: number, v: number) => ({
    x: PAD + i * step,
    y: PAD + innerH - (v / maxVal) * innerH,
  });

  const hPath = history.map((h, i) => { const {x,y} = coord(i, h.units); return i===0?`M ${x} ${y}`:`L ${x} ${y}`; }).join(' ');
  const fPath = projections.map((p, i) => {
    const v = i === 0 ? (history[history.length-1]?.units ?? p.predicted_units) : p.predicted_units;
    const {x,y} = coord(history.length - 1 + i, v);
    return i===0?`M ${x} ${y}`:`L ${x} ${y}`;
  }).join(' ');

  const tc = dark ? 'rgba(255,255,255,0.5)' : '#888';
  const gc = dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD + innerH - pct * innerH;
        return (
          <g key={pct}>
            <line x1={PAD} y1={y} x2={PAD+innerW} y2={y} stroke={gc} strokeWidth="1"/>
            <text x={PAD-6} y={y+4} textAnchor="end" fontSize="9" fill={tc}>{Math.round(maxVal*pct)}</text>
          </g>
        );
      })}
      {history.length > 0 && (
        <line x1={PAD+(history.length-1)*step} y1={PAD} x2={PAD+(history.length-1)*step} y2={PAD+innerH}
          stroke={dark?'rgba(255,255,255,0.15)':'#e2e8f0'} strokeWidth="1.5" strokeDasharray="4 4"/>
      )}
      <path d={hPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d={fPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4"/>
      {projections.map((p, i) => {
        if (!p.event_name) return null;
        const {x,y} = coord(history.length-1+i, p.predicted_units);
        return (
          <g key={p.month}>
            <circle cx={x} cy={y} r="5" fill="#f59e0b"/>
            <text x={x} y={y-10} textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="bold">⚡</text>
          </g>
        );
      })}
      {allPts.map((pt, i) => {
        if (i % 2 !== 0) return null;
        const {x} = coord(i, 0);
        return <text key={i} x={x} y={H-4} textAnchor="middle" fontSize="9" fill={tc}>{pt.label.split(' ')[0].slice(0,3)}</text>;
      })}
      <g transform={`translate(${PAD},${H-20})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#3b82f6" strokeWidth="2.5"/>
        <text x="25" y="4" fontSize="9" fill={tc}>History</text>
        <line x1="70" y1="0" x2="90" y2="0" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3"/>
        <text x="95" y="4" fontSize="9" fill={tc}>Forecast</text>
        <circle cx="150" cy="0" r="4" fill="#f59e0b"/>
        <text x="158" y="4" fontSize="9" fill={tc}>Event boost</text>
      </g>
    </svg>
  );
}

function EventsCalendar({ events, dark }: { events: EventSignal[]; dark: boolean }) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  if (events.length === 0) return <p style={{ fontSize: 12, color: muted, margin: 0, textAlign: 'center', padding: '20px 0' }}>No upcoming events for this product category.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map(ev => {
        const color = EVENT_COLORS[ev.type] ?? '#6b7280';
        const emoji = EVENT_EMOJIS[ev.type] ?? '📅';
        const urgent = ev.days_until <= 14;
        return (
          <div key={ev.slug} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: urgent ? `${color}10` : (dark ? 'rgba(255,255,255,0.03)' : '#fafafa'), border: urgent ? `1px solid ${color}30` : `1px solid ${border}` }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color, margin: '0 0 2px' }}>{ev.name}</p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>{new Date(ev.starts_at).toLocaleDateString('fr-TN')} → {new Date(ev.ends_at).toLocaleDateString('fr-TN')}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>×{ev.boost_score.toFixed(2)}</p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>{ev.days_until === 0 ? '🔴 Now' : `in ${ev.days_until}d`}</p>
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
  if (!data.has_data || data.similar.length === 0) return <p style={{ fontSize: 12, color: muted, margin: 0, textAlign: 'center', padding: '20px 0' }}>No similar products found in this subcategory yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 14px', borderRadius: 12, background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
        {[
          { label: 'Your Monthly',    val: `${data.own_monthly_units}`,                color: '#db142e' },
          { label: 'Market Median',   val: `${data.market_median_monthly_units}`,      color: '#3b82f6' },
          { label: 'Market Avg Price',val: fmtTND(data.market_avg_price),             color: '#10b981' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 900, color, margin: '0 0 2px' }}>{val}</p>
            <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>
      {data.insights.map((ins, i) => {
        const bg  = ins.type === 'warning' ? 'rgba(239,68,68,0.06)' : ins.type === 'positive' ? 'rgba(16,185,129,0.06)' : ins.type === 'opportunity' ? 'rgba(245,158,11,0.06)' : (dark ? 'rgba(255,255,255,0.03)' : '#f8fafc');
        const bd  = ins.type === 'warning' ? 'rgba(239,68,68,0.18)' : ins.type === 'positive' ? 'rgba(16,185,129,0.18)' : ins.type === 'opportunity' ? 'rgba(245,158,11,0.18)' : border;
        const ico = ins.type === 'warning' ? '⚠️' : ins.type === 'positive' ? '✅' : ins.type === 'opportunity' ? '💡' : 'ℹ️';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: bg, border: `1px solid ${bd}` }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{ico}</span>
            <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.8)' : '#333', margin: 0, lineHeight: 1.5 }}>{ins.message}</p>
          </div>
        );
      })}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.similar.slice(0, 5).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.03)' : '#fafafa', border: `1px solid ${border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: muted, minWidth: 16 }}>#{i+1}</span>
            {p.primary_image && <img src={p.primary_image} alt={p.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}/>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: text, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              <p style={{ fontSize: 9, color: muted, margin: 0 }}>{fmtTND(p.price)}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', flexShrink: 0 }}>{p.monthly_units}/mo</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIExplanationPanel({ explanation, loading, dark }: { explanation: AIExplanation | null; loading: boolean; dark: boolean }) {
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
      <Loader2 size={16} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite', flexShrink: 0 }}/>
      <p style={{ fontSize: 12, color: muted, margin: 0 }}>AI is analyzing your forecast…</p>
    </div>
  );
  if (!explanation) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { icon: '📊', label: 'Summary',     content: explanation.summary,          color: '#3b82f6' },
        { icon: '💡', label: 'Opportunity', content: explanation.main_opportunity,  color: '#10b981' },
        { icon: '⚠️', label: 'Risk',        content: explanation.main_risk,         color: '#f59e0b' },
        { icon: '🌙', label: 'Season Tip',  content: explanation.seasonal_tip,      color: '#8b5cf6' },
      ].map(({ icon, label, content, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: `${color}06`, border: `1px solid ${color}18` }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, color, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.82)' : '#333', margin: 0, lineHeight: 1.6 }}>{content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, icon: Icon, accent = '#db142e', children, dark, badge, rightSlot }: {
  title: string; icon: React.ElementType; accent?: string;
  children: React.ReactNode; dark: boolean;
  badge?: React.ReactNode; rightSlot?: React.ReactNode;
}) {
  const bg     = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  return (
    <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
            <Icon size={15}/>
          </div>
          <p style={{ fontWeight: 800, fontSize: 13, color: text, margin: 0 }}>{title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rightSlot}
          {badge}
        </div>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

export default function SalesForecastDashboard({ dark }: { dark: boolean }) {
  const [products,    setProducts]    = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [forecast,    setForecast]    = useState<ForecastResult | null>(null);
  const [regional,    setRegional]    = useState<RegionalDemandResult | null>(null);
  const [similar,     setSimilar]     = useState<SimilarProductsResult | null>(null);
  const [events,      setEvents]      = useState<EventSignal[]>([]);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);

  const [loadingFull,    setLoadingFull]    = useState(false);
  const [loadingLive,    setLoadingLive]    = useState(false); // silent live refresh
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);

  // Refs to avoid stale closure in intervals
  const selectedIdRef  = useRef<number | null>(null);
  const pollTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  selectedIdRef.current = selectedId;

  const bg     = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const trendColor = forecast ? (TREND_COLORS[forecast.overall_trend] ?? '#3b82f6') : '#3b82f6';

  // ── Load product list ─────────────────────────────────────────────────────
  useEffect(() => {
    productsApi.getAll({ per_page: 50 })
      .then(res => {
        const list: any[] = res?.data?.data ?? res?.data ?? [];
        setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  // ── Full forecast (heavy — runs on product select + manual refresh) ───────
  const runFullForecast = useCallback(async (productId: number) => {
    setLoadingFull(true);
    setError(null);
    setForecast(null);
    setRegional(null);
    setSimilar(null);
    setExplanation(null);
    setEvents([]);

    try {
      // Always send refresh=true — never serve stale cache
      const [forecastRes, regionalRes, similarRes] = await Promise.all([
        forecastApi.getForecast(productId, 6, false), // useCache=false → refresh=true
        forecastApi.getRegional(productId),
        forecastApi.getSimilar(productId),
      ]);

      setForecast(forecastRes.data);
      setRegional(regionalRes.data);
      setSimilar(similarRes.data);
      setLastUpdated(new Date());
      setLoadingFull(false);

      // Events
      try {
        const catSlug   = (forecastRes.data as any).category_slug;
        const eventsRes = await forecastApi.getEvents(catSlug);
        setEvents(eventsRes.data);
      } catch { /* events are non-critical */ }

      // AI explanation (non-blocking)
      setLoadingExplain(true);
      forecastApi.getAIExplanation(productId, forecastRes.data, regionalRes.data, 'fr')
        .then(r => setExplanation(r.data))
        .catch(() => {})
        .finally(() => setLoadingExplain(false));

    } catch (e: any) {
      setError(e.message ?? 'Forecast failed');
      setLoadingFull(false);
    }
  }, []);

  // ── Live refresh (lightweight — only regional + similar, silent) ──────────
  const runLiveRefresh = useCallback(async (productId: number) => {
    setLoadingLive(true);
    try {
      const [regionalRes, similarRes] = await Promise.all([
        forecastApi.getRegional(productId),
        forecastApi.getSimilar(productId),
      ]);
      setRegional(regionalRes.data);
      setSimilar(similarRes.data);
      setLastUpdated(new Date());
    } catch {
      // Silent — don't show error for background refresh
    } finally {
      setLoadingLive(false);
    }
  }, []);

  // ── Auto-run when product selected ───────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    runFullForecast(selectedId);
  }, [selectedId, runFullForecast]);

  // ── Polling: every 60s refresh live data silently ─────────────────────────
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!selectedId) return;

    pollTimerRef.current = setInterval(() => {
      const id = selectedIdRef.current;
      if (id) runLiveRefresh(id);
    }, LIVE_POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedId, runLiveRefresh]);

  // ── Visibility API: re-fetch when tab regains focus ───────────────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const id = selectedIdRef.current;
        if (!id) return;
        // If tab was hidden for >30s, refresh live data immediately
        runLiveRefresh(id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [runLiveRefresh]);

  // ── Also refresh when window regains focus ────────────────────────────────
  useEffect(() => {
    const onFocus = () => {
      const id = selectedIdRef.current;
      if (id) runLiveRefresh(id);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [runLiveRefresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer     { 0%{opacity:0.4} 50%{opacity:0.8} 100%{opacity:0.4} }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-green { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      {/* ── Product Selector ── */}
      <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(219,20,46,0.12)', border: '1px solid rgba(219,20,46,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db142e' }}>
              <BarChart3 size={16}/>
            </div>
            <div>
              <p style={{ fontWeight: 900, fontSize: 14, color: text, margin: '0 0 1px' }}>Sales Forecast</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 10, color: muted, margin: 0 }}>6-month · Tunisia-calibrated</p>
                {loadingLive && !loadingFull && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#10b981' }}>
                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }}/>
                    Refreshing…
                  </span>
                )}
                <LiveBadge lastUpdated={lastUpdated} dark={dark}/>
              </div>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.25)', color: '#f87171' }}>
            🔴 Red Pepper
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value) || null)}
              style={{ width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10, border: `1px solid ${border}`, background: dark ? '#1e2330' : '#f8fafc', color: dark ? '#fff' : '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer', appearance: 'none', outline: 'none', colorScheme: dark ? 'dark' : 'light' }}
            >
              <option value="">— Select a product to forecast —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: dark ? '#fff' : '#111', pointerEvents: 'none' }}/>
          </div>
          {selectedId && (
            <button
              onClick={() => runFullForecast(selectedId)}
              disabled={loadingFull}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: loadingFull ? 'rgba(219,20,46,0.3)' : 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: loadingFull ? 'not-allowed' : 'pointer' }}
            >
              {loadingFull ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <RefreshCw size={13}/>}
              {loadingFull ? 'Forecasting…' : 'Refresh'}
            </button>
          )}
        </div>

        {/* Auto-reload notice */}
        {selectedId && !loadingFull && (
          <p style={{ fontSize: 9, color: muted, margin: '8px 0 0', fontWeight: 600 }}>
            ⚡ Auto-refreshes every 60s · Updates instantly when tab regains focus
          </p>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '10px 0 0', fontWeight: 600 }}>{error}</p>}
      </div>

      {/* Loading */}
      {loadingFull && !forecast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} dark={dark} h={90}/>)}
          </div>
          <Skeleton dark={dark} h={220}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Skeleton dark={dark} h={280}/>
            <Skeleton dark={dark} h={280}/>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {forecast && !loadingFull && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.4s ease' }}>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: '6-Month Forecast',  value: `${forecast.total_predicted_units}`,    sub: 'units predicted',         color: trendColor,                                                                  icon: '📦' },
              { label: 'Predicted Revenue', value: fmtTND(forecast.total_predicted_revenue), sub: '6-month potential',      color: '#10b981',                                                                   icon: '💰' },
              { label: 'Peak Month',        value: forecast.peak_month?.label ?? '—',       sub: `${forecast.peak_month?.predicted_units ?? 0} units expected`, color: '#f59e0b',                              icon: '🔥' },
              { label: 'Stock Needed (3m)', value: `${forecast.stock_recommendation_3m}`,  sub: 'units (30% buffer)',      color: forecast.stock_recommendation_3m > forecast.current_stock ? '#ef4444' : '#10b981', icon: '📊' },
            ].map(({ label, value, sub, color, icon }) => (
              <div key={label} style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: color, opacity: dark ? 0.1 : 0.06, filter: 'blur(16px)' }}/>
                <p style={{ fontSize: 18, margin: '0 0 6px' }}>{icon}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 9, fontWeight: 800, color: muted, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ fontSize: 10, color: muted, margin: 0 }}>{sub}</p>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},transparent)`, borderRadius: '0 0 14px 14px' }}/>
              </div>
            ))}
          </div>

          {/* Demand + confidence */}
          <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <DemandScoreGauge score={forecast.demand_score} dark={dark}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: `${CONF_COLORS[forecast.confidence_label]}18`, border: `1px solid ${CONF_COLORS[forecast.confidence_label]}30`, fontSize: 11, fontWeight: 800, color: CONF_COLORS[forecast.confidence_label] }}>
                {forecast.confidence_label === 'high' ? '✓' : forecast.confidence_label === 'medium' ? '◎' : '○'} {forecast.confidence_label.charAt(0).toUpperCase() + forecast.confidence_label.slice(1)} confidence
              </span>
              <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 600 }}>Based on {forecast.data_points} real orders</p>
              {forecast.blend_note && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Info size={11} style={{ color: '#3b82f6', flexShrink: 0 }}/>
                  <p style={{ fontSize: 10, color: muted, margin: 0, lineHeight: 1.4 }}>{forecast.blend_note}</p>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: `${trendColor}18`, border: `1px solid ${trendColor}30` }}>
                {forecast.overall_trend === 'up'     && <TrendingUp size={14} style={{ color: trendColor }}/>}
                {forecast.overall_trend === 'down'   && <TrendingDown size={14} style={{ color: trendColor }}/>}
                {forecast.overall_trend === 'stable' && <Minus size={14} style={{ color: trendColor }}/>}
                <span style={{ fontSize: 11, fontWeight: 800, color: trendColor }}>
                  {forecast.overall_trend === 'up' ? 'Growing' : forecast.overall_trend === 'down' ? 'Declining' : 'Stable'} trend
                </span>
              </div>
              <p style={{ fontSize: 9, color: muted, margin: '4px 0 0', fontWeight: 600 }}>slope: {forecast.trend_slope > 0 ? '+' : ''}{forecast.trend_slope} units/mo</p>
            </div>
          </div>

          {/* Forecast chart */}
          <Card title="6-Month Forecast Chart" icon={TrendingUp} accent="#10b981" dark={dark}>
            <ForecastLineChart history={forecast.history} projections={forecast.projections} dark={dark}/>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
              {forecast.projections.map(p => {
                const cc = CONF_COLORS[p.confidence];
                return (
                  <div key={p.month} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: p.event_name ? 'rgba(245,158,11,0.08)' : subBg, border: p.event_name ? '1px solid rgba(245,158,11,0.2)' : `1px solid ${border}` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: muted, margin: '0 0 3px' }}>{p.label.split(' ')[0].slice(0,3)}</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#10b981', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{p.predicted_units}</p>
                    <p style={{ fontSize: 8, color: muted, margin: '0 0 3px' }}>units</p>
                    {p.event_name && <span style={{ fontSize: 7, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: 4 }}>⚡ event</span>}
                    <div style={{ marginTop: 3, width: 6, height: 6, borderRadius: '50%', background: cc, margin: '3px auto 0' }}/>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Regional + Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Card title="Regional Demand" icon={MapPin} accent="#db142e" dark={dark}
              badge={<span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', color: '#db142e' }}>🇹🇳 Tunisia</span>}
              rightSlot={loadingLive ? <Loader2 size={12} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }}/> : undefined}
            >
              {regional
                ? <TunisiaHeatmap regional={regional} dark={dark}/>
                : <Skeleton dark={dark} h={200}/>
              }
            </Card>
            <Card title="Tunisia Events Calendar" icon={Calendar} accent="#f59e0b" dark={dark}>
              <EventsCalendar events={events} dark={dark}/>
            </Card>
          </div>

          {/* Similar + AI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Card title="Market Comparison" icon={Layers} accent="#6b7280" dark={dark}
              badge={similar?.count ? <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(107,114,128,0.12)', border: `1px solid ${border}`, color: muted }}>{similar.count} similar</span> : undefined}
              rightSlot={loadingLive ? <Loader2 size={12} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }}/> : undefined}
            >
              {similar
                ? <SimilarProductsList data={similar} dark={dark}/>
                : <Skeleton dark={dark} h={200}/>
              }
            </Card>
            <Card title="AI Analysis" icon={Brain} accent="#8b5cf6" dark={dark}
              badge={<span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6' }}>Powered by Groq</span>}
            >
              <AIExplanationPanel explanation={explanation} loading={loadingExplain} dark={dark}/>
            </Card>
          </div>

          {/* Stock banners */}
          {forecast.stock_recommendation_3m > forecast.current_stock ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '0 0 2px' }}>Stock shortfall detected</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                  You need <strong style={{ color: text }}>{forecast.stock_recommendation_3m} units</strong> but only have <strong style={{ color: text }}>{forecast.current_stock}</strong>. Restock <strong style={{ color: '#ef4444' }}>{forecast.stock_recommendation_3m - forecast.current_stock} units</strong> now.
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', margin: '0 0 1px', letterSpacing: '-0.02em' }}>-{forecast.stock_recommendation_3m - forecast.current_stock}</p>
                <p style={{ fontSize: 9, color: muted, margin: 0, fontWeight: 700 }}>units short</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Package size={20} style={{ color: '#10b981', flexShrink: 0 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#10b981', margin: '0 0 2px' }}>Stock level is sufficient ✓</p>
                <p style={{ fontSize: 11, color: muted, margin: 0 }}>Current stock ({forecast.current_stock} units) covers the 3-month forecast ({forecast.stock_recommendation_3m} needed).</p>
              </div>
            </div>
          )}

          <p style={{ fontSize: 9, color: muted, margin: 0, textAlign: 'center', fontWeight: 600 }}>
            Computed at {new Date(forecast.computed_at).toLocaleString('fr-TN')} · {forecast._cache_hit ? '⚡ Cached' : '🔄 Fresh'} · {forecast.computed_by}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!selectedId && !forecast && (
        <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} style={{ color: '#db142e' }}/>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: '0 0 6px' }}>Select a product to forecast</p>
          <p style={{ fontSize: 12, color: muted, margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            The AI will analyze your sales history, Tunisia seasonal patterns, and upcoming events to generate a 6-month forward forecast with live regional demand heatmap.
          </p>
        </div>
      )}
    </div>
  );
}