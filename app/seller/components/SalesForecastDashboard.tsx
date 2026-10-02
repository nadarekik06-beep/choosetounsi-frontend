'use client';

/**
 * Outils IA → Ventes — sales forecast.
 *
 * Every number comes from the server's statistics (App\Services\Forecast);
 * the short "En bref" text is written by Groq from those numbers, or by a
 * template when Groq is unavailable. Forecasts are read from nightly snapshots:
 * no auto-refresh; "Actualiser" recomputes at most once per 10 minutes.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle, BarChart3, Brain, CalendarDays, CheckCircle2, ChevronDown, Eye, Info,
  Loader2, Package, RefreshCw, Settings2, ShoppingCart, Sparkles, Target, Timer, TrendingDown, Truck, XCircle,
} from 'lucide-react';

import {
  forecastApi,
  type Explanation, type Forecast, type ForecastAction, type ForecastEvent, type ForecastResponse,
  type ApiError, type ForecastSettings, type Labels, type SettingsBody, type TrackRecord, type VariantView,
} from '@/lib/sellerForecastApi';
import { useFormat } from '@/lib/i18n/useFormat';
import { ink } from '@/app/seller/ink';

type Locale = 'fr' | 'en' | 'ar';

const SEVERITY_COLOR: Record<number, string> = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6' };
const LEVEL_COLOR: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444', none: '#94a3b8' };
const ACTION_ICON: Record<ForecastAction['type'], React.ElementType> = {
  out_of_stock: XCircle, stockout: Package, event: CalendarDays, sales_drop: TrendingDown,
  low_cart: ShoppingCart, dormant: Timer, no_data: Sparkles, low_views: Eye,
};

function usePalette(dark: boolean) {
  return {
    bg:     dark ? '#161b27' : '#ffffff',
    sub:    dark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text:   dark ? '#ffffff' : '#111111',
    muted:  dark ? 'rgba(255,255,255,0.6)' : '#5b6472',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Building blocks
// ═════════════════════════════════════════════════════════════════════════════

function Panel({ title, icon: Icon, accent = '#3b82f6', dark, right, children }: {
  title: string; icon: React.ElementType; accent?: string; dark: boolean; right?: React.ReactNode; children: React.ReactNode;
}) {
  const p = usePalette(dark);
  return (
    <section style={{ background: p.bg, borderRadius: 16, border: `1px solid ${p.border}`, minWidth: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${p.border}`, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}1a`, color: ink(accent, dark), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={14} />
          </span>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: p.text }}>{title}</h3>
        </div>
        {right}
      </header>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, color, dark, icon: Icon }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; color: string; dark: boolean; icon: React.ElementType;
}) {
  const p = usePalette(dark);
  return (
    <div style={{ background: p.bg, borderRadius: 14, border: `1px solid ${p.border}`, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} style={{ color: ink(color, dark), flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: ink(color, dark), lineHeight: 1.15, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: p.muted, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function Chip({ children, color, dark }: { children: React.ReactNode; color: string; dark: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}33`, fontSize: 11, fontWeight: 800, color: ink(color, dark), whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Skeleton({ dark, h }: { dark: boolean; h: number }) {
  return <div style={{ height: h, borderRadius: 14, background: dark ? 'rgba(255,255,255,0.05)' : '#eef1f5', animation: 'fc-shimmer 1.4s infinite linear' }} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// Chart: last 13 weeks (bars) + next 4 weeks (80 % band + point) + event markers
// ═════════════════════════════════════════════════════════════════════════════

function ForecastChart({ f, dark, locale }: { f: Forecast; dark: boolean; locale: Locale }) {
  const t = useTranslations('seller.forecast.chart');
  const { date } = useFormat();
  const p = usePalette(dark);

  const W = 720, H = 250, L = 36, R = 12, T = 30, B = 34;
  const slots = f.history.length + f.weeks.length;
  const slotW = (W - L - R) / Math.max(1, slots);
  const maxY = Math.max(1, ...f.history.map(h => h.units), ...f.weeks.map(w => w.high)) * 1.15;
  const y = (v: number) => T + (H - T - B) * (1 - v / maxY);
  const xSlot = (i: number) => L + i * slotW;
  const chartStart = f.history[0] ? new Date(f.history[0].start + 'T00:00:00') : new Date();
  const xDate = (iso: string) => L + ((new Date(iso + 'T00:00:00').getTime() - chartStart.getTime()) / 86400000 / 7) * slotW;
  const xEnd = W - R;
  const todayX = xSlot(f.history.length);
  const ticks = [0, 0.5, 1].map(r => Math.round(maxY / 1.15 * r));
  const events = f.events.filter(e => xDate(e.ends_on) >= L && xDate(e.starts_on) <= xEnd);
  const grid = dark ? 'rgba(255,255,255,0.07)' : '#edf0f4';
  const band = f.weeks.map((w, i) => ({ x: xSlot(f.history.length + i) + slotW / 2, ...w }));
  const bandPath = band.length
    ? `M ${band.map(b => `${b.x} ${y(b.high)}`).join(' L ')} L ${[...band].reverse().map(b => `${b.x} ${y(b.low)}`).join(' L ')} Z`
    : '';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('title')} style={{ width: '100%', height: 'auto', direction: 'ltr', display: 'block' }}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={L} x2={xEnd} y1={y(v)} y2={y(v)} stroke={grid} />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill={p.muted}>{v}</text>
          </g>
        ))}

        {/* Event markers */}
        {events.map(e => {
          const x1 = Math.max(L, xDate(e.starts_on));
          const x2 = Math.min(xEnd, xDate(e.ends_on) + slotW / 7);
          return (
            <g key={e.id}>
              <rect x={x1} y={T - 4} width={Math.max(2, x2 - x1)} height={H - T - B + 4} fill="#8b5cf6" opacity={dark ? 0.12 : 0.08} />
              <line x1={x1} x2={x1} y1={T - 4} y2={H - B} stroke="#8b5cf6" strokeDasharray="3 3" opacity={0.7} />
              <text x={Math.min(x1 + 3, xEnd - 4)} y={T - 8} fontSize="9.5" fontWeight="700" fill={ink('#8b5cf6', dark)} textAnchor={x1 > xEnd - 80 ? 'end' : 'start'}>
                {(e.names[locale] ?? e.names.fr).slice(0, 22)}
              </text>
            </g>
          );
        })}

        {/* Actual weekly sales */}
        {f.history.map((h, i) => {
          const barH = (H - T - B) * (h.units / maxY);
          return (
            <g key={h.start}>
              <rect x={xSlot(i) + slotW * 0.18} y={y(h.units)} width={slotW * 0.64} height={barH} rx={3}
                fill={h.promo ? '#f59e0b' : '#3b82f6'} opacity={0.85}>
                <title>{`${date(h.start, { day: 'numeric', month: 'short' })}: ${h.units}`}</title>
              </rect>
            </g>
          );
        })}

        {/* Today divider */}
        <line x1={todayX} x2={todayX} y1={T - 4} y2={H - B} stroke={p.muted} strokeDasharray="4 4" opacity={0.6} />
        <text x={todayX + 4} y={H - B - 6} fontSize="9.5" fill={p.muted}>{t('today')}</text>

        {/* Forecast band + point */}
        {bandPath && <path d={bandPath} fill="#10b981" opacity={dark ? 0.22 : 0.16} />}
        {band.length > 1 && <path d={`M ${band.map(b => `${b.x} ${y(b.point)}`).join(' L ')}`} fill="none" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 4" />}
        {band.map(b => (
          <g key={b.start}>
            <circle cx={b.x} cy={y(b.point)} r={3.5} fill="#10b981" stroke={p.bg} strokeWidth={1.5} />
            <text x={b.x} y={y(b.high) - 5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={ink('#10b981', dark)}>{`${b.low}–${b.high}`}</text>
          </g>
        ))}

        {/* X labels: every other history week + forecast weeks */}
        {[...f.history.map(h => h.start), ...f.weeks.map(w => w.start)].map((d, i) => (
          i % 2 === (slots % 2) || i >= f.history.length
            ? <text key={d} x={xSlot(i) + slotW / 2} y={H - B + 14} textAnchor="middle" fontSize="9" fill={p.muted}>{date(d, { day: 'numeric', month: 'short' })}</text>
            : null
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: 11, color: p.muted }}>
        <Legend color="#3b82f6" label={t('actual')} />
        <Legend color="#f59e0b" label={t('promo')} />
        <Legend color="#10b981" label={t('range')} band />
        {events.length > 0 && <Legend color="#8b5cf6" label={t('events')} band />}
        <span style={{ marginInlineStart: 'auto' }}>{t('unitsPerWeek')}</span>
      </div>
    </div>
  );
}

function Legend({ color, label, band }: { color: string; label: string; band?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 12, height: band ? 8 : 10, borderRadius: band ? 2 : 3, background: color, opacity: band ? 0.4 : 0.85 }} />
      {label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Sections
// ═════════════════════════════════════════════════════════════════════════════

function TierBanner({ f, dark }: { f: Forecast; dark: boolean }) {
  const t = useTranslations('seller.forecast.tier');
  const tm = useTranslations('seller.forecast.models');
  const p = usePalette(dark);
  const color = f.tier === 'own' ? '#10b981' : f.tier === 'insufficient' ? '#94a3b8' : '#f59e0b';
  const own = Math.round((f.weight_own ?? 0) * 100);
  const text = f.scope === 'shop'
    ? t('shop', { own: f.tiers?.own ?? 0, total: f.products_count ?? 0 })
    : t(`${f.tier}.text`, {
        products: f.prior?.products ?? 0, sellers: f.prior?.sellers ?? 0, own, prior: 100 - own,
        model: f.model && tm.has(f.model) ? tm(f.model) : '', days: f.data?.days ?? 0,
      });
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, background: `${color}10`, border: `1px solid ${color}33` }}>
      <Info size={16} style={{ color: ink(color, dark), flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: ink(color, dark) }}>
          {f.scope === 'shop' ? t('shopTitle') : t(`${f.tier}.title`)}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: p.muted, lineHeight: 1.5 }}>{text}</p>
      </div>
    </div>
  );
}

function ConfidenceLine({ f, dark }: { f: Forecast; dark: boolean }) {
  const t = useTranslations('seller.forecast.confidence');
  const p = usePalette(dark);
  const c = f.confidence;
  const level = t(`levels.${c.level}`);
  let line: string;
  if (f.scope === 'shop') line = t('shop', { level });
  else if (f.tier === 'category') line = t('category', { products: f.prior?.products ?? 0, level });
  else line = t('line', { orders: c.orders ?? 0, days: c.days ?? 0, level });
  const color = LEVEL_COLOR[c.level];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Chip color={color} dark={dark}><Target size={11} /> {t('label')} {c.score}/100</Chip>
      <span style={{ fontSize: 12, color: p.text, fontWeight: 600 }}>{line}</span>
      {f.scope === 'product' && f.tier === 'own' && (
        <span style={{ fontSize: 11, color: p.muted }}>
          {c.error_pct != null ? t('error', { pct: c.error_pct }) : t('noBacktest')}
        </span>
      )}
    </div>
  );
}

function KpiRow({ f, dark }: { f: Forecast; dark: boolean }) {
  const t = useTranslations('seller.forecast.kpi');
  const { price, date } = useFormat();
  const money = (n: number) => price(n, { maximumFractionDigits: 0 });
  const s = f.stock;
  const lead = s.lead_time_days + s.safety_days + 7;

  // Nearest stock-out among the product and its variants
  const rows = f.variants?.length ? f.variants.map(v => v.stock) : [s];
  const soon = rows.filter(r => r.days_left !== null).sort((a, b) => (a.days_left! - b.days_left!))[0] ?? null;
  const reorder = rows.filter(r => r.reorder_qty > 0).sort((a, b) => (a.reorder_by ?? '').localeCompare(b.reorder_by ?? ''));
  const reorderQty = reorder.reduce((sum, r) => sum + r.reorder_qty, 0);
  const reorderBy = reorder[0]?.reorder_by ?? null;
  const today = f.snapshot_date;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
      <Kpi dark={dark} icon={BarChart3} color="#10b981" label={t('forecast')}
        value={f.next28 ? t('units', { low: f.next28.low, high: f.next28.high }) : '—'}
        sub={f.next28 ? `${money(f.next28.revenue_low)} – ${money(f.next28.revenue_high)}` : t('noForecast')} />

      <Kpi dark={dark} icon={Package} color="#3b82f6" label={t('stock')}
        value={t('stockUnits', { n: s.current })}
        sub={f.scope === 'shop' ? t('stockShop') : f.variants?.length ? t('variantsSum', { n: f.variants.length }) : undefined} />

      {f.scope === 'shop' ? (
        <Kpi dark={dark} icon={AlertTriangle} color={(s.at_risk?.length ?? 0) > 0 ? '#ef4444' : '#10b981'} label={t('atRisk')}
          value={s.at_risk?.length ?? 0}
          sub={(s.at_risk?.length ?? 0) > 0 ? s.at_risk!.slice(0, 2).map(r => `${r.name} (${t('days', { n: r.days_left })})`).join(' · ') : t('atRiskNone')} />
      ) : (
        <Kpi dark={dark} icon={Timer} color={soon && soon.days_left! <= lead ? '#ef4444' : '#10b981'} label={t('daysLeft')}
          value={!f.next28 ? '—' : soon ? t('days', { n: soon.days_left ?? 0 }) : t('over7Months')}
          sub={!f.next28 ? t('noForecast') : soon?.stockout_date ? t('stockoutOn', { date: date(soon.stockout_date, { day: 'numeric', month: 'long' }) }) : t('noStockout')} />
      )}

      {f.scope === 'product' && (
        <Kpi dark={dark} icon={Truck} color={reorderQty > 0 ? '#f59e0b' : '#10b981'} label={t('reorder')}
          value={reorderQty > 0 ? t('reorderQty', { n: reorderQty }) : t('reorderNone')}
          sub={reorderQty > 0
            ? (reorderBy && reorderBy > today ? t('reorderBy', { date: date(reorderBy, { day: 'numeric', month: 'long' }) }) : t('reorderNow'))
            : t('reorderNoneText', { lead: s.lead_time_days, safety: s.safety_days })} />
      )}
    </div>
  );
}

function MonthsGrid({ f, dark }: { f: Forecast; dark: boolean }) {
  const t = useTranslations('seller.forecast.months');
  const { date, price } = useFormat();
  const p = usePalette(dark);
  if (!f.months.length) return null;
  return (
    <Panel title={t('title')} icon={CalendarDays} accent="#10b981" dark={dark}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }}>
        {f.months.map(m => (
          <div key={m.month} style={{ background: p.sub, border: `1px solid ${p.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.muted, textTransform: 'capitalize' }}>{date(`${m.month}-15`, { month: 'short', year: '2-digit' })}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: ink('#10b981', dark), margin: '3px 0 1px' }}>{m.low}–{m.high}</div>
            <div style={{ fontSize: 10, color: p.muted }}>{price(m.revenue_low, { maximumFractionDigits: 0 })} – {price(m.revenue_high, { maximumFractionDigits: 0 })}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: p.muted }}>{t('note')}</p>
    </Panel>
  );
}

function VariantsTable({ variants, dark, locale, today }: { variants: VariantView[]; dark: boolean; locale: Locale; today: string }) {
  const t = useTranslations('seller.forecast.variants');
  const { date } = useFormat();
  const p = usePalette(dark);
  const th: React.CSSProperties = { textAlign: 'start', padding: '6px 8px', fontSize: 10, fontWeight: 800, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '8px', fontSize: 12, color: p.text, borderTop: `1px solid ${p.border}`, whiteSpace: 'nowrap' };
  return (
    <Panel title={t('title')} icon={Package} accent="#8b5cf6" dark={dark}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>{t('variant')}</th><th style={th}>{t('stock')}</th><th style={th}>{t('share')}</th>
            <th style={th}>{t('next28')}</th><th style={th}>{t('daysLeft')}</th><th style={th}>{t('reorder')}</th>
          </tr></thead>
          <tbody>
            {variants.map(v => {
              const s = v.stock;
              const urgent = s.days_left !== null && s.days_left <= s.lead_time_days + s.safety_days + 7;
              return (
                <tr key={v.variant_id}>
                  <td style={{ ...td, fontWeight: 800 }}>{v.labels[locale] || v.labels.fr}</td>
                  <td style={td}>{s.current}</td>
                  <td style={td}>{Math.round(v.share * 100)} %</td>
                  <td style={td}>{v.next28.low}–{v.next28.high}</td>
                  <td style={{ ...td, color: urgent ? ink('#ef4444', dark) : p.text, fontWeight: urgent ? 800 : 500 }}>
                    {s.days_left === null ? '—' : `${s.days_left} · ${date(s.stockout_date!, { day: 'numeric', month: 'short' })}`}
                  </td>
                  <td style={td}>
                    {s.reorder_qty > 0
                      ? `${s.reorder_qty} · ${s.reorder_by && s.reorder_by > today ? date(s.reorder_by, { day: 'numeric', month: 'short' }) : t('now')}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: p.muted }}>{t('note')}</p>
    </Panel>
  );
}

function ActionText({ a, locale, today }: { a: ForecastAction; locale: Locale; today: string }) {
  const t = useTranslations('seller.forecast.actions');
  const { date, number } = useFormat();
  const pr = a.params;
  const n = (v?: number | null) => v ?? 0;
  const label = (l?: Labels | null) => (l ? l[locale] || l.fr : '');
  const name = pr.product_name ? (pr.variant ? `${pr.product_name} (${label(pr.variant)})` : pr.product_name) : '';
  const d = (iso?: string | null) => (iso ? date(iso, { day: '2-digit', month: '2-digit' }) : '');
  switch (a.type) {
    case 'out_of_stock': return <>{t('out_of_stock', { name, qty: n(pr.reorder_qty) })}</>;
    case 'stockout': {
      const days = n(pr.days_left), qty = n(pr.reorder_qty);
      if (qty <= 0) return <>{t('stockoutNoQty', { name, days })}</>;
      return <>{pr.reorder_by && pr.reorder_by > today
        ? t('stockout', { name, days, qty, date: d(pr.reorder_by) })
        : t('stockoutNow', { name, days, qty })}</>;
    }
    case 'event': {
      const event = label(pr.event), days = n(pr.days_until);
      if (pr.change_pct != null) {
        const pct = `${pr.change_pct > 0 ? '+' : ''}${Math.round(pr.change_pct)}`;
        return <>{t(pr.effect_reliable ? 'eventEffect' : 'eventEffectWeak', { event, days, pct, year: n(pr.effect_year), orders: n(pr.effect_orders) })}</>;
      }
      return <>{t('event', { event, days })}</>;
    }
    case 'sales_drop': return <>{t('sales_drop', { name, actual: n(pr.actual), low: n(pr.expected_low) })}</>;
    case 'low_cart':
      return <>{t('low_cart', { name, views: n(pr.views), rate: number(n(pr.cart_rate_pct)) })}{pr.category_rate_pct != null ? ` ${t('low_cart_cat', { rate: number(pr.category_rate_pct) })}` : ''}</>;
    case 'dormant': return <>{t(pr.never_sold ? 'dormantNever' : 'dormant', { name, stock: n(pr.stock), days: n(pr.days_without_sale) })}</>;
    case 'no_data': return <>{t('no_data', { name })}</>;
    case 'low_views': return <>{t('low_views', { name, views: n(pr.views) })}</>;
  }
}

function ActionsList({ actions, dark, locale, today }: { actions: ForecastAction[]; dark: boolean; locale: Locale; today: string }) {
  const t = useTranslations('seller.forecast.actions');
  const p = usePalette(dark);
  return (
    <Panel title={t('title')} icon={CheckCircle2} accent="#db142e" dark={dark}>
      {actions.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: p.muted }}>{t('empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map((a, i) => {
            const Icon = ACTION_ICON[a.type] ?? Info;
            const color = SEVERITY_COLOR[a.severity];
            return (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: p.sub, border: `1px solid ${p.border}`, borderInlineStart: `3px solid ${color}` }}>
                <Icon size={16} style={{ color: ink(color, dark), flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: ink(color, dark), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(`severity.${a.severity}`)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: p.text, lineHeight: 1.5 }}><ActionText a={a} locale={locale} today={today} /></p>
                  {a.links.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {a.links.map(l => (
                        <Link key={l.kind + l.href} href={l.href} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: `1px solid ${p.border}`, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: p.text, textDecoration: 'none' }}>
                          {t(`links.${l.kind}`)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AiSummary({ explanation, loading, dark }: { explanation: Explanation | null; loading: boolean; dark: boolean }) {
  const t = useTranslations('seller.forecast.ai');
  const p = usePalette(dark);
  return (
    <Panel title={t('title')} icon={Brain} accent="#8b5cf6" dark={dark}
      right={explanation ? <span style={{ fontSize: 10, color: p.muted }}>{explanation.source === 'ai' ? t('sourceAi') : t('sourceTemplate')}</span> : undefined}>
      {loading ? (
        <p style={{ margin: 0, fontSize: 12, color: p.muted, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Loader2 size={13} style={{ animation: 'fc-spin 1s linear infinite' }} /> {t('loading')}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: p.text, lineHeight: 1.65 }}>{explanation?.text ?? t('unavailable')}</p>
      )}
    </Panel>
  );
}

function AccuracyPanel({ f, record, dark }: { f: Forecast; record: TrackRecord; dark: boolean }) {
  const t = useTranslations('seller.forecast.accuracy');
  const { date } = useFormat();
  const p = usePalette(dark);
  const a = f.accuracy;
  return (
    <Panel title={t('title')} icon={Target} accent="#06b6d4" dark={dark}>
      {a ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: p.text, lineHeight: 1.5 }}>
            {t('product', { date: date(a.snapshot_date, { day: 'numeric', month: 'long' }), low: a.low, high: a.high, actual: a.actual })}
          </p>
          <div><Chip color={a.within ? '#10b981' : '#f59e0b'} dark={dark}>{a.within ? t('within') : t('outside')}</Chip></div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: p.muted }}>{t('none')}</p>
      )}
      {record.forecasts > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: p.muted, lineHeight: 1.5 }}>
          {record.wape_pct != null
            ? t('record', { coverage: record.coverage_pct ?? 0, n: record.forecasts, wape: record.wape_pct })
            : t('recordNoWape', { coverage: record.coverage_pct ?? 0, n: record.forecasts })}
        </p>
      )}
    </Panel>
  );
}

function SignalsPanel({ f, dark }: { f: Forecast; dark: boolean }) {
  const t = useTranslations('seller.forecast.signals');
  const { number } = useFormat();
  const p = usePalette(dark);
  const s = f.signals;
  const pct = (v: number | null) => (v == null ? '—' : `${number(v * 100, { maximumFractionDigits: 1 })} %`);
  const items = [
    { label: t('views'), value: number(s.views_30d) },
    { label: t('carts'), value: number(s.cart_adds_30d) },
    { label: t('favorites'), value: number(s.favorites_30d) },
    { label: t('cartRate'), value: pct(s.cart_rate) },
    { label: t('conversion'), value: pct(s.conversion_rate) },
  ];
  return (
    <Panel title={t('title')} icon={Eye} accent="#f59e0b" dark={dark}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
        {items.map(i => (
          <div key={i.label} style={{ background: p.sub, borderRadius: 10, padding: '8px 10px', border: `1px solid ${p.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: p.text }}>{i.value}</div>
            <div style={{ fontSize: 10, color: p.muted, fontWeight: 600 }}>{i.label}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: p.muted }}>{t('hint')}</p>
    </Panel>
  );
}

function EventsPanel({ events, dark, locale }: { events: ForecastEvent[]; dark: boolean; locale: Locale }) {
  const t = useTranslations('seller.forecast.events');
  const { date } = useFormat();
  const p = usePalette(dark);
  const upcoming = events.filter(e => e.days_until >= 0 || e.ends_on >= new Date().toISOString().slice(0, 10)).slice(0, 5);
  if (!upcoming.length) return null;
  return (
    <Panel title={t('title')} icon={CalendarDays} accent="#8b5cf6" dark={dark}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.map(e => (
          <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 12, color: p.text }}>
            <span style={{ fontWeight: 700 }}>
              {e.names[locale] || e.names.fr}
              <span style={{ fontWeight: 500, color: p.muted }}> · {date(e.starts_on, { day: 'numeric', month: 'short' })}</span>
            </span>
            <span style={{ color: p.muted }}>
              {e.days_until > 0 ? t('inDays', { n: e.days_until }) : t('now')}
              {e.effect?.change_pct != null && (
                <> · {e.applied
                  ? t('measured', { pct: `${e.effect.change_pct > 0 ? '+' : ''}${Math.round(e.effect.change_pct)}`, year: e.effect.year, orders: e.effect.event_orders })
                  : t('measuredWeak', { orders: e.effect.event_orders })}</>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: p.muted }}>{t('note')}</p>
    </Panel>
  );
}

function SettingsPanel({ settings, productId, dark, onSave }: {
  settings: ForecastSettings; productId: number | null; dark: boolean;
  onSave: (body: SettingsBody) => Promise<void>;
}) {
  const t = useTranslations('seller.forecast.settings');
  const p = usePalette(dark);
  const [form, setForm] = useState(settings);
  const [override, setOverride] = useState<{ lead: string; safety: string }>({
    lead: settings.product?.lead_time_days?.toString() ?? '', safety: settings.product?.safety_days?.toString() ?? '',
  });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const input: React.CSSProperties = { width: 90, padding: '7px 10px', borderRadius: 8, border: `1px solid ${p.border}`, background: p.sub, color: p.text, fontSize: 13, colorScheme: dark ? 'dark' : 'light' };
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 0', borderTop: `1px solid ${p.border}` };
  const label = (text: string, hint?: string) => (
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: p.text }}>{text}</div>
      {hint && <div style={{ fontSize: 11, color: p.muted, marginTop: 2 }}>{hint}</div>}
    </div>
  );
  const toggle = (key: 'alerts_enabled' | 'alerts_email' | 'weekly_digest', disabled = false) => (
    <input type="checkbox" checked={form[key]} disabled={disabled} onChange={e => setForm({ ...form, [key]: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#db142e' }} />
  );
  const int = (v: string) => (v === '' ? null : Math.max(0, Math.min(180, parseInt(v, 10) || 0)));

  const save = async () => {
    setState('saving');
    try {
      await onSave({
        lead_time_days: form.lead_time_days, safety_days: form.safety_days, alerts_enabled: form.alerts_enabled,
        alerts_email: form.alerts_email, weekly_digest: form.weekly_digest, stockout_alert_days: form.stockout_alert_days,
        view_product_id: productId,
      });
      if (productId) await onSave({ product_id: productId, lead_time_days: int(override.lead), safety_days: int(override.safety) });
      setState('saved');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
    }
  };

  return (
    <Panel title={t('title')} icon={Settings2} accent="#64748b" dark={dark}>
      <div style={row}>
        {label(t('leadTime'), t('leadHint'))}
        <input type="number" min={0} max={180} value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: int(e.target.value) ?? 0 })} style={input} />
      </div>
      <div style={row}>
        {label(t('safety'), t('safetyHint'))}
        <input type="number" min={0} max={90} value={form.safety_days} onChange={e => setForm({ ...form, safety_days: int(e.target.value) ?? 0 })} style={input} />
      </div>
      {productId && (
        <div style={row}>
          {label(t('productOverride'), t('productOverrideHint'))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min={0} max={180} placeholder={String(form.lead_time_days)} aria-label={t('leadTime')} value={override.lead} onChange={e => setOverride({ ...override, lead: e.target.value })} style={input} />
            <input type="number" min={0} max={90} placeholder={String(form.safety_days)} aria-label={t('safety')} value={override.safety} onChange={e => setOverride({ ...override, safety: e.target.value })} style={input} />
          </div>
        </div>
      )}
      <div style={row}>{label(t('alerts'), t('alertsHint'))}{toggle('alerts_enabled')}</div>
      <div style={row}>{label(t('alertsEmail'))}{toggle('alerts_email', !form.alerts_enabled)}</div>
      <div style={row}>
        {label(t('window'))}
        <input type="number" min={1} max={60} value={form.stockout_alert_days} disabled={!form.alerts_enabled}
          onChange={e => setForm({ ...form, stockout_alert_days: Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1)) })} style={input} />
      </div>
      <div style={row}>{label(t('digest'))}{toggle('weekly_digest')}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingTop: 10 }}>
        {state === 'saved' && <span style={{ fontSize: 12, color: ink('#10b981', dark), fontWeight: 700 }}>{t('saved')}</span>}
        {state === 'error' && <span style={{ fontSize: 12, color: ink('#ef4444', dark), fontWeight: 700 }}>{t('error')}</span>}
        <button onClick={save} disabled={state === 'saving'} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#db142e', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', opacity: state === 'saving' ? 0.6 : 1 }}>
          {state === 'saving' ? t('saving') : t('save')}
        </button>
      </div>
    </Panel>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════

export default function SalesForecastDashboard({ dark, initialProductId }: { dark: boolean; initialProductId?: number }) {
  const t      = useTranslations('seller.forecast');
  const locale = (useLocale() as Locale) ?? 'fr';
  const { date } = useFormat();
  const p = usePalette(dark);

  const [productId, setProductId]     = useState<number | null>(initialProductId ?? null);
  const [data, setData]               = useState<ForecastResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [notice, setNotice]           = useState<string | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explLoading, setExplLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setTick] = useState(0);

  const loadExplanation = useCallback((pid: number | null) => {
    setExplLoading(true);
    setExplanation(null);
    forecastApi.explain(pid, locale)
      .then(setExplanation)
      .catch(() => setExplanation(null))   // the page never depends on the AI text
      .finally(() => setExplLoading(false));
  }, [locale]);

  const apply = useCallback((res: ForecastResponse, pid: number | null) => {
    setData(res);
    setCooldownUntil(res.refresh_in > 0 ? Date.now() + res.refresh_in * 1000 : 0);
    if (res.forecast) loadExplanation(pid);
  }, [loadExplanation]);

  const load = useCallback(async (pid: number | null) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      apply(await forecastApi.get(pid), pid);
    } catch (err) {
      const e = err as ApiError;
      if (e.response?.status === 404 && pid) { setProductId(null); return; }
      setError(e.response?.data?.message ?? t('failed'));
    } finally {
      setLoading(false);
    }
  }, [apply, t]);

  useEffect(() => { load(productId); }, [productId, load]);

  // Countdown label only (no request): re-render twice a minute while cooling down.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setTick(x => x + 1), 30_000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const refresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      apply(await forecastApi.refresh(productId), productId);
    } catch (err) {
      const e = err as ApiError;
      if (e.response?.status === 429) {
        setCooldownUntil(Date.now() + (e.response.data.retry_in ?? 600) * 1000);
        setNotice(e.response.data.message ?? null);
      } else {
        setNotice(t('failed'));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const saveSettings = async (body: SettingsBody) => {
    const res = await forecastApi.saveSettings(body);
    setData(res);
  };

  const f = data?.forecast ?? null;
  const cooldownMin = Math.ceil(Math.max(0, cooldownUntil - Date.now()) / 60000);
  const products = data?.products ?? [];
  const selectLabel = useMemo(() => (row: (typeof products)[number]) => {
    if (!row.live) return `${row.name} — ${t('offline')}`;
    if (row.days_left !== null && row.days_left <= 21) return `${row.name} — ${t('stockoutIn', { n: row.days_left })}`;
    return row.name;
  }, [t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        @keyframes fc-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fc-shimmer { 0% { opacity: .45 } 50% { opacity: .9 } 100% { opacity: .45 } }
      `}</style>

      {/* ── Header + selector ── */}
      <div style={{ background: p.bg, borderRadius: 16, border: `1px solid ${p.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: p.text }}>{t('title')}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: p.muted }}>
              {t('subtitle')}{f?.computed_at ? ` · ${t('updated', { date: date(f.computed_at, 'datetime') })}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSettings(s => !s)} aria-expanded={showSettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1px solid ${p.border}`, background: showSettings ? p.sub : 'transparent', color: p.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Settings2 size={13} /> {t('settingsBtn')}
            </button>
            <button onClick={refresh} disabled={refreshing || loading || cooldownMin > 0} title={cooldownMin > 0 ? t('refreshIn', { minutes: cooldownMin }) : undefined}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: 'none', background: '#db142e', color: '#fff', fontSize: 12, fontWeight: 700, cursor: refreshing || cooldownMin > 0 ? 'not-allowed' : 'pointer', opacity: refreshing || cooldownMin > 0 ? 0.55 : 1 }}>
              {refreshing ? <Loader2 size={13} style={{ animation: 'fc-spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
              {refreshing ? t('refreshing') : cooldownMin > 0 ? t('refreshIn', { minutes: cooldownMin }) : t('refresh')}
            </button>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <label htmlFor="fc-product" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('selectLabel')}</label>
          <select id="fc-product" value={productId ?? ''} onChange={e => setProductId(e.target.value ? Number(e.target.value) : null)}
            style={{ width: '100%', padding: '10px 12px', paddingInlineEnd: 34, borderRadius: 10, border: `1px solid ${p.border}`, background: dark ? '#1e2330' : '#f8fafc', color: p.text, fontSize: 13, fontWeight: 600, appearance: 'none', colorScheme: dark ? 'dark' : 'light' }}>
            <option value="">{t('shop')}</option>
            {products.map(row => <option key={row.id} value={row.id}>{selectLabel(row)}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', color: p.muted, pointerEvents: 'none' }} />
        </div>

        {notice && <p style={{ margin: 0, fontSize: 12, color: ink('#f59e0b', dark), fontWeight: 600 }}>{notice}</p>}
      </div>

      {showSettings && data && (
        // Remounts with fresh values whenever the saved settings or the product change
        <SettingsPanel key={`${productId ?? 0}:${JSON.stringify(data.settings)}`} settings={data.settings} productId={productId} dark={dark} onSave={saveSettings} />
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} dark={dark} h={92} />)}
          </div>
          <Skeleton dark={dark} h={260} />
        </div>
      )}

      {!loading && error && (
        <div style={{ background: p.bg, borderRadius: 16, border: `1px solid ${p.border}`, padding: 20, textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: ink('#ef4444', dark), fontWeight: 700 }}>{error}</p>
          <button onClick={() => load(productId)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${p.border}`, background: 'transparent', color: p.text, fontWeight: 700, cursor: 'pointer' }}>{t('retry')}</button>
        </div>
      )}

      {!loading && !error && !f && (
        <div style={{ background: p.bg, borderRadius: 16, border: `1px solid ${p.border}`, padding: '36px 20px', textAlign: 'center' }}>
          <Package size={26} style={{ color: p.muted }} />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: p.muted }}>{t('noProducts')}</p>
        </div>
      )}

      {!loading && !error && f && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {f.scope === 'product' && f.live === false && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: ink('#ef4444', dark), fontWeight: 600 }}>
              <AlertTriangle size={15} /> {t('notLive')}
            </div>
          )}

          <TierBanner f={f} dark={dark} />
          <KpiRow f={f} dark={dark} />
          <ConfidenceLine f={f} dark={dark} />

          {f.promo_uplift && (
            <p style={{ margin: 0, fontSize: 11.5, color: p.muted }}>
              {t('promo', { factor: f.promo_uplift.factor, days: f.promo_uplift.promo_days })}
            </p>
          )}

          {f.history.length > 0 && (
            <Panel title={t('chart.title')} icon={BarChart3} accent="#3b82f6" dark={dark}>
              <ForecastChart f={f} dark={dark} locale={locale} />
            </Panel>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' }}>
            <ActionsList actions={f.actions} dark={dark} locale={locale} today={f.snapshot_date} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <AiSummary explanation={explanation} loading={explLoading} dark={dark} />
              <AccuracyPanel f={f} record={data!.track_record} dark={dark} />
            </div>
          </div>

          {f.variants && f.variants.length > 0 && <VariantsTable variants={f.variants} dark={dark} locale={locale} today={f.snapshot_date} />}

          <MonthsGrid f={f} dark={dark} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' }}>
            <SignalsPanel f={f} dark={dark} />
            <EventsPanel events={f.events} dark={dark} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
