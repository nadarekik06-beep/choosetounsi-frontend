'use client';

/**
 * Growth Radar building blocks: palette, chips, and the four mini charts a card
 * can carry as evidence (sparkline, price range, traffic, timeline).
 *
 * Charts are deliberately small and single-purpose. Series colours were checked
 * with the dataviz validator (views #3b82f6 / orders #db142e light, #f43f5e dark):
 * views are a line, orders are bars, so identity never rests on colour alone,
 * and every chart has a <title> + per-mark hover titles.
 */

import { ink } from '@/app/seller/ink';
import type { CardType, Chart, Confidence } from '@/lib/growthRadarApi';
import {
  CalendarDays, Clock, Droplets, Heart, PackageX, Search, Tag, type LucideIcon,
} from 'lucide-react';

export const BRAND_RED = '#db142e';
export const BRAND_GREEN = '#198f41';
export const GOLD = '#f59e0b';

export function usePalette(dark: boolean) {
  return {
    bg:      dark ? '#161b27' : '#ffffff',
    sub:     dark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    border:  dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text:    dark ? '#ffffff' : '#111111',
    muted:   dark ? 'rgba(255,255,255,0.6)' : '#5b6472',
    faint:   dark ? 'rgba(255,255,255,0.35)' : '#9aa3af',
    grid:    dark ? 'rgba(255,255,255,0.08)' : '#edf0f4',
    views:   '#3b82f6',
    orders:  dark ? '#f43f5e' : BRAND_RED,
    gain:    dark ? '#4ade80' : BRAND_GREEN,
  };
}

export const TYPE_META: Record<CardType, { icon: LucideIcon; color: string }> = {
  leaking_product: { icon: Droplets,     color: '#f97316' },
  price_position:  { icon: Tag,          color: '#3b82f6' },
  hidden_demand:   { icon: Search,       color: '#8b5cf6' },
  warm_audience:   { icon: Heart,        color: '#ec4899' },
  seasonal:        { icon: CalendarDays, color: '#14b8a6' },
  dead_stock:      { icon: PackageX,     color: '#f59e0b' },
  promo_timing:    { icon: Clock,        color: '#6366f1' },
};

export const CONFIDENCE_COLOR: Record<Confidence, string> = { high: '#10b981', medium: '#f59e0b', low: '#94a3b8' };

export function Chip({ children, color, dark, title }: { children: React.ReactNode; color: string; dark: boolean; title?: string }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}33`, fontSize: 11, fontWeight: 800,
      color: ink(color, dark), whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

/** Confidence as three pips + word — never colour alone. */
export function ConfidencePips({ level, label, title, dark }: { level: Confidence; label: string; title?: string; dark: boolean }) {
  const n = { low: 1, medium: 2, high: 3 }[level];
  const c = CONFIDENCE_COLOR[level];
  const p = usePalette(dark);
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: p.muted, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ display: 'inline-flex', gap: 2 }}>
        {[1, 2, 3].map(i => (
          <span key={i} style={{ width: 6, height: 10, borderRadius: 2, background: i <= n ? c : p.grid }} />
        ))}
      </span>
      {label}
    </span>
  );
}

// ─── Mini charts ─────────────────────────────────────────────────────────────

type ChartLabels = {
  title: string; views: string; orders: string; you: string; median: string; range: string;
  today: string; start: string; event: string; bestHour: string; dayNames: string[]; dayLabel: (i: number) => string;
  hourTip: (h: number, pct: number) => string; dayTip: (d: string, views: number, orders: number) => string;
  priceTip: (label: string, v: string) => string; money: (v: number) => string; date: (iso: string) => string;
};

export function MiniChart({ chart, dark, labels }: { chart: Chart; dark: boolean; labels: ChartLabels }) {
  // Small multiples, not hero charts: capped so they stay compact on wide cards
  return <div style={{ maxWidth: 420, width: '100%' }}><ChartBody chart={chart} dark={dark} labels={labels} /></div>;
}

function ChartBody({ chart, dark, labels }: { chart: Chart; dark: boolean; labels: ChartLabels }) {
  switch (chart.kind) {
    case 'sparkline':   return <Sparkline views={chart.views} orders={chart.orders} dark={dark} labels={labels} />;
    case 'price_range': return <PriceRange {...chart} dark={dark} labels={labels} />;
    case 'traffic':     return <Traffic hours={chart.hours} hour={chart.hour} dark={dark} labels={labels} />;
    case 'timeline':    return <Timeline {...chart} dark={dark} labels={labels} />;
  }
}

/** 30 days: views as a line, orders as thin bars on the same day slots (own scales, labelled in the legend). */
function Sparkline({ views, orders, dark, labels }: { views: number[]; orders: number[]; dark: boolean; labels: ChartLabels }) {
  const p = usePalette(dark);
  const W = 300, H = 64, T = 6, B = 14;
  const n = Math.max(views.length, 1);
  const step = W / n;
  const maxV = Math.max(1, ...views);
  const maxO = Math.max(1, ...orders);
  const yV = (v: number) => T + (H - T - B) * (1 - v / maxV);
  const line = views.map((v, i) => `${i ? 'L' : 'M'} ${(i + 0.5) * step} ${yV(v)}`).join(' ');
  const totalV = views.reduce((a, b) => a + b, 0);
  const totalO = orders.reduce((a, b) => a + b, 0);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
        <title>{labels.title}</title>
        <line x1={0} x2={W} y1={H - B} y2={H - B} stroke={p.grid} />
        {orders.map((o, i) => o > 0 && (
          <rect key={i} x={i * step + step * 0.3} width={Math.max(2, step * 0.4)} y={H - B - (H - T - B) * 0.55 * (o / maxO)}
            height={(H - T - B) * 0.55 * (o / maxO)} rx={1.5} fill={p.orders} />
        ))}
        <path d={`${line} L ${(n - 0.5) * step} ${H - B} L ${0.5 * step} ${H - B} Z`} fill={p.views} opacity={0.1} />
        <path d={line} fill="none" stroke={p.views} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {views.map((v, i) => (
          <rect key={`h${i}`} x={i * step} y={0} width={step} height={H} fill="transparent">
            <title>{labels.dayTip(labels.dayLabel(views.length - i), v, orders[i] ?? 0)}</title>
          </rect>
        ))}
      </svg>
      <figcaption style={{ display: 'flex', gap: 14, fontSize: 11, color: p.muted, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 2, borderRadius: 2, background: p.views }} />{labels.views} · {totalV}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 4, height: 10, borderRadius: 1.5, background: p.orders }} />{labels.orders} · {totalO}
        </span>
      </figcaption>
    </figure>
  );
}

/** Category range p25–p75 as a band, the median as a tick, the seller's price as a marker. */
function PriceRange({ p25, median, p75, mine, dark, labels }: { p25: number; median: number; p75: number; mine: number; dark: boolean; labels: ChartLabels }) {
  const p = usePalette(dark);
  const lo = Math.min(p25, mine) * 0.85, hi = Math.max(p75, mine) * 1.1;
  const W = 300, H = 56, L = 8, R = 8;
  const x = (v: number) => L + (W - L - R) * ((v - lo) / Math.max(1e-6, hi - lo));
  const out = mine > p75 * 1.1 || mine < p25 * 0.9;
  const markColor = out ? (dark ? '#f43f5e' : BRAND_RED) : p.gain;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
        <title>{labels.title}</title>
        <line x1={L} x2={W - R} y1={30} y2={30} stroke={p.grid} strokeWidth={2} strokeLinecap="round" />
        <rect x={x(p25)} y={24} width={Math.max(4, x(p75) - x(p25))} height={12} rx={4} fill={p.views} opacity={0.22}>
          <title>{labels.priceTip(labels.range, `${labels.money(p25)} – ${labels.money(p75)}`)}</title>
        </rect>
        <line x1={x(median)} x2={x(median)} y1={20} y2={40} stroke={p.views} strokeWidth={2}>
          <title>{labels.priceTip(labels.median, labels.money(median))}</title>
        </line>
        <text x={x(median)} y={52} textAnchor="middle" fontSize={10} fill={p.muted}>{labels.median} {labels.money(median)}</text>
        <circle cx={x(mine)} cy={30} r={7} fill={markColor} stroke={p.bg} strokeWidth={2}>
          <title>{labels.priceTip(labels.you, labels.money(mine))}</title>
        </circle>
        <text x={Math.min(W - 30, Math.max(30, x(mine)))} y={12} textAnchor="middle" fontSize={10} fontWeight={800} fill={p.text}>
          {labels.you} {labels.money(mine)}
        </text>
      </svg>
      <figcaption style={{ fontSize: 11, color: p.muted, marginTop: 2 }}>
        <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 3, background: p.views, opacity: 0.3, marginInlineEnd: 5, verticalAlign: 'middle' }} />
        {labels.range} {labels.money(p25)} – {labels.money(p75)}
      </figcaption>
    </figure>
  );
}

/** Share of platform activity by hour of day; the recommended hour is highlighted. */
function Traffic({ hours, hour, dark, labels }: { hours: number[]; hour: number; dark: boolean; labels: ChartLabels }) {
  const p = usePalette(dark);
  const W = 300, H = 56, B = 12;
  const max = Math.max(1e-6, ...hours);
  const bw = W / 24;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
        <title>{labels.title}</title>
        {hours.map((v, h) => {
          const bh = (H - B - 4) * (v / max);
          const best = h === hour || h === hour + 1;
          return (
            <rect key={h} x={h * bw + 1} width={bw - 2} y={H - B - bh} height={Math.max(1, bh)} rx={2}
              fill={best ? '#6366f1' : p.faint} opacity={best ? 1 : 0.5}>
              <title>{labels.hourTip(h, Math.round(v * 1000) / 10)}</title>
            </rect>
          );
        })}
        {[0, 6, 12, 18].map(h => <text key={h} x={h * bw + 1} y={H - 1} fontSize={9} fill={p.muted}>{`${h}h`}</text>)}
      </svg>
      <figcaption style={{ fontSize: 11, color: p.muted, marginTop: 2 }}>
        <span style={{ display: 'inline-block', width: 8, height: 10, borderRadius: 2, background: '#6366f1', marginInlineEnd: 5, verticalAlign: 'middle' }} />
        {labels.bestHour}
      </figcaption>
    </figure>
  );
}

/** today → promotion start → event window. */
function Timeline({ today, start, event_start, event_end, dark, labels }: { today: string; start: string; event_start: string; event_end: string; dark: boolean; labels: ChartLabels }) {
  const p = usePalette(dark);
  const t = (iso: string) => new Date(iso + 'T00:00:00').getTime();
  const t0 = t(today), t1 = t(event_end);
  const W = 300, H = 50, L = 10, R = 10;
  const x = (iso: string) => L + (W - L - R) * ((t(iso) - t0) / Math.max(1, t1 - t0));
  const teal = '#14b8a6';
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
        <title>{labels.title}</title>
        <line x1={L} x2={W - R} y1={22} y2={22} stroke={p.grid} strokeWidth={2} strokeLinecap="round" />
        <rect x={x(event_start)} y={16} width={Math.max(6, x(event_end) - x(event_start))} height={12} rx={4} fill={teal} opacity={0.3}>
          <title>{`${labels.event}: ${labels.date(event_start)} – ${labels.date(event_end)}`}</title>
        </rect>
        <line x1={x(start)} x2={x(event_start)} y1={22} y2={22} stroke={teal} strokeWidth={3} strokeLinecap="round" />
        {[{ iso: today, label: labels.today, c: p.muted }, { iso: start, label: labels.start, c: teal }].map(m => (
          <g key={m.label}>
            <circle cx={x(m.iso)} cy={22} r={5} fill={m.c} stroke={p.bg} strokeWidth={2}><title>{`${m.label}: ${labels.date(m.iso)}`}</title></circle>
            <text x={Math.max(L + 14, Math.min(W - 40, x(m.iso)))} y={44} textAnchor="middle" fontSize={10} fill={p.muted}>{m.label} · {labels.date(m.iso)}</text>
          </g>
        ))}
        <text x={Math.min(W - 30, x(event_start) + 12)} y={10} textAnchor="middle" fontSize={10} fontWeight={800} fill={p.text}>{labels.event}</text>
      </svg>
    </figure>
  );
}


