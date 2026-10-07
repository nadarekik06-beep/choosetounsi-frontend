'use client';

/**
 * Analyse des visiteurs — page sections. Where and why buyers drop off; never
 * sales reporting (Statistiques) and never a content checklist (Qualité des fiches).
 *
 * Charts are plain HTML bars (one measure per chart, one axis): the funnel is a
 * single series, traffic shows visits as bars with conversion as text, the device
 * split is a 100 % bar with direct labels. Device colours were checked with the
 * dataviz validator (light #2563eb/#d97706/#0d9488, dark #3b82f6/#d97706/#0d9488).
 * Nothing relies on colour alone: the leak step carries an icon + label, trends an
 * arrow + sign, comparisons a ✓ / ! icon + words.
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Eye, Image as ImageIcon,
  MousePointerClick, PackageX, ShoppingCart, CreditCard, Sparkles, Tag, Wand2, Zap, Info, Minus, Clock,
} from 'lucide-react';
import { ink } from '@/app/seller/ink';
import { useFormat } from '@/lib/i18n/useFormat';
import { BRAND_RED, usePalette } from '@/app/seller/growth-radar/_components/ui';
import type {
  FunnelStage, InsightAction, InsightEvidence, InsightKpi, InsightProduct, InsightResult, VisitorInsightsData,
} from '@/lib/blackPepperApi';
import { insightActionHref } from './links';

type P = ReturnType<typeof usePalette>;

export const STAGE_META: Record<FunnelStage, { icon: typeof Eye; color: string }> = {
  click:        { icon: MousePointerClick, color: '#6366f1' },
  product_page: { icon: Eye,               color: '#f97316' },
  cart:         { icon: ShoppingCart,      color: '#ec4899' },
  checkout:     { icon: CreditCard,        color: '#14b8a6' },
};
const SEVERITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' } as const;
const DEVICE_COLOR = { light: { mobile: '#2563eb', desktop: '#d97706', tablet: '#0d9488', unknown: '#94a3b8' },
                       dark:  { mobile: '#3b82f6', desktop: '#d97706', tablet: '#0d9488', unknown: '#64748b' } };

export function Card({ children, p, style }: { children: React.ReactNode; p: P; style?: React.CSSProperties }) {
  return <section style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 16, padding: 18, minWidth: 0, ...style }}>{children}</section>;
}

export function SectionTitle({ title, subtitle, p, right }: { title: string; subtitle?: string; p: P; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: p.text, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: p.muted, margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Rates as locale percents (8,3 %), money in DT, counts grouped. */
export function useFmt() {
  const { number, price } = useFormat();
  const pct = (v: number | null | undefined) => v == null ? '—'
    : number(v, { style: 'percent', maximumFractionDigits: v > 0 && v < 0.1 ? 1 : 0 });
  return {
    pct,
    count: (v: number | null | undefined) => v == null ? '—' : number(v),
    money: (v: number | null | undefined, digits = 0) => v == null ? '—' : price(v, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  };
}

// ─── 1. KPI cards ────────────────────────────────────────────────────────────

export function KpiCards({ kpis, dark }: { kpis: InsightKpi[]; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const show = (k: InsightKpi, v: number | null) => k.format === 'rate' ? f.pct(v) : k.format === 'money' ? f.money(v, 2) : f.count(v);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10 }}>
      {kpis.map(k => {
        const up = (k.change_pct ?? 0) > 0;
        const flat = k.change_pct == null || Math.abs(k.change_pct) < 0.5;
        const TrendIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
        const trendColor = flat ? p.muted : up ? ink('#10b981', dark) : ink('#ef4444', dark);
        const better = k.bench && k.value != null ? k.value >= k.bench.value : null;
        return (
          <div key={k.key} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: '12px 14px', minWidth: 0 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: p.muted, margin: 0 }}>{t(`kpi.${k.key}`)}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: p.text, margin: '4px 0 2px', letterSpacing: '-0.02em' }}>
              {k.value == null ? <span style={{ fontSize: 13, color: p.muted, fontWeight: 700 }}>{t('kpi.notTracked')}</span> : show(k, k.value)}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: trendColor, margin: 0 }}>
              {k.change_pct == null
                ? <span style={{ color: p.muted, fontWeight: 600 }}>{t('kpi.noPrevious')}</span>
                : <><TrendIcon size={13} aria-hidden />{k.change_pct > 0 ? '+' : ''}{f.pct(k.change_pct / 100)} <span style={{ color: p.muted, fontWeight: 600 }}>{t('kpi.vsPrevious')}</span></>}
            </p>
            {k.bench && (
              <p title={t('comparedTo', { scope: t(`scope.${k.bench.scope}`) })}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: p.muted, margin: '6px 0 0' }}>
                {better
                  ? <CheckCircle2 size={12} color={ink('#10b981', dark)} aria-hidden />
                  : <AlertTriangle size={12} color={ink('#f59e0b', dark)} aria-hidden />}
                <span>{t(`scopeShort.${k.bench.scope}`)} {show(k, k.bench.value)}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 2. Store funnel ─────────────────────────────────────────────────────────

const STEP_ICON = { impressions: Eye, clicks: MousePointerClick, views: Eye, carts: ShoppingCart, checkouts: CreditCard, orders: CheckCircle2 };

export function FunnelChart({ data, dark }: { data: VisitorInsightsData; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const { date } = useFormat();
  const { steps, transitions, leak } = data.funnel;
  const shown = steps.filter(s => s.tracked);
  const max = Math.max(1, ...shown.map(s => s.value));
  const leakColor = dark ? '#f43f5e' : BRAND_RED;

  return (
    <Card p={p}>
      <SectionTitle p={p} title={t('funnel.title')} subtitle={t('funnel.subtitle')} />
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {shown.map((s, i) => {
          const next = shown[i + 1];
          const Icon = STEP_ICON[s.key];
          // A judged transition can span a step (cart → order covers cart → checkout → order):
          // highlight every gap inside it, and show its benchmark on the first one
          const pos = (k: string) => shown.findIndex(x => x.key === k);
          const isLeak = !!(leak && next && pos(leak.from) <= i && i < pos(leak.to));
          const tr = next ? transitions.find(x => x.from === s.key && pos(x.to) > i) : undefined;
          const rate = next && s.value > 0 ? next.value / s.value : null;
          // Visits also come from outside the listings (links, typed URLs): more visits than clicks is normal
          const extraVisits = s.key === 'clicks' && next?.key === 'views' && next.value > s.value ? next.value - s.value : 0;
          return (
            <li key={s.key}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr auto', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: p.text, minWidth: 0 }}>
                  <Icon size={14} color={p.muted} aria-hidden />{t(`funnel.steps.${s.key}`)}
                </span>
                <div style={{ height: 22, background: p.sub, borderRadius: 6, overflow: 'hidden' }}
                  title={`${t(`funnel.steps.${s.key}`)} : ${f.count(s.value)}`}>
                  <div style={{ width: `${Math.max(0.6, (s.value / max) * 100)}%`, height: '100%', background: p.views,
                    borderStartEndRadius: 4, borderEndEndRadius: 4, opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: p.text, minWidth: 54, textAlign: 'end' }}>{f.count(s.value)}</span>
              </div>
              {next && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px', marginInlineStart: 'min(160px, 32%)', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                    background: isLeak ? `${leakColor}18` : p.sub, border: `1px solid ${isLeak ? `${leakColor}55` : p.border}`,
                    color: isLeak ? ink(leakColor, dark) : p.muted,
                  }}>
                    {isLeak ? <AlertTriangle size={12} aria-hidden /> : <ArrowRight size={12} aria-hidden className="vi-flip" />}
                    {extraVisits ? t('funnel.extraVisits', { count: f.count(extraVisits) }) : t('funnel.continue', { pct: f.pct(rate) })}
                  </span>
                  {tr?.bench != null && tr.scope && (
                    <span style={{ fontSize: 11, color: p.muted }}>
                      {pos(tr.to) > i + 1
                        ? t('funnel.benchSpan', { from: t(`funnel.steps.${tr.from}`), to: t(`funnel.steps.${tr.to}`), you: f.pct(tr.rate), scope: t(`scopeShort.${tr.scope}`), pct: f.pct(tr.bench) })
                        : t('funnel.bench', { scope: t(`scopeShort.${tr.scope}`), pct: f.pct(tr.bench) })}
                    </span>
                  )}
                  {isLeak && i === pos(leak!.from) && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: ink(leakColor, dark) }}>
                      {leak!.basis === 'benchmark' ? t('funnel.leak') : t('funnel.leakDrop')}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {(!data.tracking.impressions_full || !data.tracking.checkout_full) && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: p.muted, margin: '12px 0 0' }}>
          <Info size={13} aria-hidden />
          {t('funnel.trackingSince', { date: data.tracking.impressions_since ? date(data.tracking.impressions_since, 'dayMonth') : t('funnel.today') })}
        </p>
      )}
    </Card>
  );
}

// ─── 3. Traffic sources + devices ────────────────────────────────────────────

export function TrafficChart({ data, dark }: { data: VisitorInsightsData; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const sources = data.traffic.sources;
  const max = Math.max(1, ...sources.map(s => s.views));
  const best = sources.filter(s => s.conversion != null).sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))[0];
  const devices = data.traffic.devices;
  const colors = DEVICE_COLOR[dark ? 'dark' : 'light'];

  return (
    <Card p={p}>
      <SectionTitle p={p} title={t('traffic.title')} subtitle={t('traffic.subtitle')} />
      <div role="table" aria-label={t('traffic.title')} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 140px) 1fr 52px 72px', gap: 10, fontSize: 10.5, fontWeight: 800, color: p.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span role="columnheader">{t('traffic.source')}</span><span role="columnheader">{t('traffic.visits')}</span>
          <span role="columnheader" style={{ textAlign: 'end' }} />
          <span role="columnheader" style={{ textAlign: 'end' }}>{t('traffic.conversion')}</span>
        </div>
        {sources.map(s => (
          <div role="row" key={s.source} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 140px) 1fr 52px 72px', gap: 10, alignItems: 'center' }}
            title={t('traffic.tip', { visits: f.count(s.views), carts: f.count(s.carts), orders: f.count(s.orders) })}>
            <span role="cell" style={{ fontSize: 12.5, fontWeight: 700, color: p.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`sources.${s.source}`)}</span>
            <div role="cell" style={{ height: 14, background: p.sub, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${s.views ? Math.max(1, (s.views / max) * 100) : 0}%`, height: '100%', background: p.views, borderStartEndRadius: 4, borderEndEndRadius: 4 }} />
            </div>
            <span role="cell" style={{ fontSize: 12.5, fontWeight: 800, color: p.text, textAlign: 'end' }}>{f.count(s.views)}</span>
            <span role="cell" style={{ fontSize: 12.5, fontWeight: 800, textAlign: 'end', whiteSpace: 'nowrap', color: s === best ? ink('#10b981', dark) : p.muted }}>
              {s.conversion == null ? '—' : f.pct(s.conversion)}{s === best && <Sparkles size={11} style={{ marginInlineStart: 3, verticalAlign: '-1px' }} aria-label={t('traffic.best')} />}
            </span>
          </div>
        ))}
      </div>
      {best && <p style={{ fontSize: 11.5, color: p.muted, margin: '10px 0 0' }}>{t('traffic.bestLine', { source: t(`sources.${best.source}`), pct: f.pct(best.conversion) })}</p>}

      {devices.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: p.text, margin: '0 0 8px' }}>{t('traffic.devices')}</p>
          <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2, background: p.bg }} aria-hidden>
            {devices.map(d => (
              <div key={d.device} title={`${t(`devices.${d.device}`)} : ${f.pct(d.share)}`}
                style={{ width: `${d.share * 100}%`, background: colors[d.device], minWidth: 3 }} />
            ))}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {devices.map(d => (
              <li key={d.device} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: p.text }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[d.device] }} aria-hidden />
                <strong>{t(`devices.${d.device}`)}</strong> {f.pct(d.share)}
                <span style={{ color: p.muted }}>· {t('traffic.convShort', { pct: d.conversion == null ? '—' : f.pct(d.conversion) })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ─── Evidence + actions (shared by the fix cards and the stage groups) ──────

export function useEvidenceText() {
  const t = useTranslations('seller.insights');
  const f = useFmt();
  return (e: InsightEvidence) => {
    const scope = e.scope && e.scope !== 'target' ? t(`scopeShort.${e.scope}`) : '';
    const v = e.rate ? f.pct(e.value) : ['price', 'delivery_fee'].includes(e.metric) ? f.money(e.value, Number.isInteger(e.value) ? 0 : 1) : f.count(e.value);
    const b = e.bench == null ? null : e.rate ? f.pct(e.bench) : ['price', 'delivery_fee'].includes(e.metric) ? f.money(e.bench, Number.isInteger(e.bench) ? 0 : 1) : f.count(e.bench);
    return t(`evidence.${e.metric}`, { value: v, bench: b ?? '', scope });
  };
}

const ACTION_ICON = { edit: Wand2, discount: Tag, ai_description: Sparkles, boost: Zap, restock: PackageX, listing_quality: CheckCircle2 };

export function ActionButtons({ item, dark, compact }: { item: InsightProduct; dark: boolean; compact?: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const actions = compact ? item.actions.slice(0, 1) : item.actions;
  const label = (a: InsightAction) => a.kind === 'edit' ? t(`actions.edit_${a.focus ?? 'description'}`)
    : a.kind === 'discount' ? t('actions.discount', { pct: a.pct ?? 10 }) : t(`actions.${a.kind}`);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {actions.map((a, i) => {
        const Icon = a.kind === 'edit' && a.focus === 'photos' ? ImageIcon : ACTION_ICON[a.kind];
        const primary = i === 0;
        return (
          <Link key={`${a.kind}-${a.focus ?? ''}`} href={insightActionHref(item.product.id, a, item.code, item.stage)} prefetch={false}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: compact ? '5px 10px' : '7px 12px', borderRadius: 9,
              fontSize: 12, fontWeight: 800, textDecoration: 'none', lineHeight: 1.3, maxWidth: '100%',
              background: primary ? BRAND_RED : p.sub, color: primary ? '#fff' : p.text,
              border: `1px solid ${primary ? BRAND_RED : p.border}`,
            }}>
            <Icon size={13} aria-hidden />{label(a)}
          </Link>
        );
      })}
    </div>
  );
}

function ProductThumb({ src, p, size = 44 }: { src: string | null; p: P; size?: number }) {
  return src
    ? <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${p.border}` }} />
    : <div style={{ width: size, height: size, borderRadius: 10, background: p.sub, flexShrink: 0 }} />;
}

// ─── 4. À corriger cette semaine ─────────────────────────────────────────────

export function FixCards({ items, dark }: { items: InsightProduct[]; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const evidence = useEvidenceText();
  return (
    <Card p={p}>
      <SectionTitle p={p} title={t('fix.title')} subtitle={t('fix.subtitle')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {items.map((it, i) => {
          const stage = STAGE_META[it.stage];
          const StageIcon = stage.icon;
          return (
            <article key={it.product.id} id={`vi-p-${it.product.id}`} className="vi-target"
              style={{ border: `1px solid ${p.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: p.sub, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: p.faint }}>{i + 1}</span>
                <ProductThumb src={it.product.image} p={p} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 900, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.product.name}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: ink(stage.color, dark) }}>
                    <StageIcon size={12} aria-hidden />{t(`stages.${it.stage}`)}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: p.text, margin: 0, lineHeight: 1.45, fontWeight: 600 }}>{t(`problems.${it.code}`)}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {it.evidence.map((e, k) => (
                  <li key={k} style={{ fontSize: 12, color: p.muted, display: 'flex', gap: 6 }}>
                    <span aria-hidden style={{ color: ink(SEVERITY_COLOR[it.severity], dark) }}>●</span>{evidence(e)}
                  </li>
                ))}
              </ul>
              {it.lost_revenue != null && it.lost_revenue > 0 && (
                <p style={{ fontSize: 12.5, fontWeight: 900, color: ink('#ef4444', dark), margin: 0 }}>{t('fix.lost', { amount: f.money(it.lost_revenue) })}</p>
              )}
              <div style={{ marginTop: 'auto' }}><ActionButtons item={it} dark={dark} /></div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}

// ─── 5. Où vous perdez des acheteurs ─────────────────────────────────────────

export function StageGroups({ data, dark }: { data: VisitorInsightsData; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const evidence = useEvidenceText();
  const top = new Set(data.fix_this_week.map(i => i.product.id));
  return (
    <Card p={p}>
      <SectionTitle p={p} title={t('groups.title')} subtitle={t('groups.subtitle')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {data.stages.map(g => {
          const meta = STAGE_META[g.stage];
          const Icon = meta.icon;
          return (
            <div key={g.stage} style={{ border: `1px solid ${p.border}`, borderRadius: 14, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '10px 12px', background: `${meta.color}12`, borderBottom: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={15} color={ink(meta.color, dark)} aria-hidden />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: p.text, margin: 0 }}>{t(`stages.${g.stage}`)}</p>
                  <p style={{ fontSize: 11, color: p.muted, margin: 0 }}>{t(`stageHints.${g.stage}`)}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: g.count ? ink(meta.color, dark) : p.faint }}>{g.count}</span>
              </div>
              {g.count === 0 ? (
                <p style={{ fontSize: 12, color: p.muted, margin: 0, padding: 12 }}>{t('groups.none')}</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {g.items.map(it => (
                    <li key={it.product.id} id={top.has(it.product.id) ? undefined : `vi-p-${it.product.id}`} className="vi-target"
                      style={{ padding: '10px 12px', borderTop: `1px solid ${p.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                        <ProductThumb src={it.product.image} p={p} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 800, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.product.name}</p>
                          <p style={{ fontSize: 11.5, color: p.muted, margin: 0 }}>{t(`problemsShort.${it.code}`)}</p>
                        </div>
                        {it.lost_revenue != null && it.lost_revenue > 0 && (
                          <span style={{ fontSize: 11.5, fontWeight: 900, color: ink('#ef4444', dark), whiteSpace: 'nowrap' }}>−{f.money(it.lost_revenue)}</span>
                        )}
                      </div>
                      {it.evidence[0] && <p style={{ fontSize: 11.5, color: p.muted, margin: 0 }}>{evidence(it.evidence[0])}</p>}
                      <ActionButtons item={it} dark={dark} compact />
                    </li>
                  ))}
                  {g.count > g.items.length && (
                    <li style={{ padding: '8px 12px', borderTop: `1px solid ${p.border}`, fontSize: 11.5, color: p.muted }}>{t('groups.more', { count: g.count - g.items.length })}</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {data.summary.insufficient > 0 && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: p.muted, margin: '12px 0 0' }}>
          <Info size={13} aria-hidden />{t('groups.insufficient', { count: data.summary.insufficient })}
        </p>
      )}
    </Card>
  );
}

// ─── 6. Résultats de vos actions ─────────────────────────────────────────────

export function ActionResults({ actions, dark }: { actions: InsightResult[]; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const f = useFmt();
  const { date } = useFormat();
  return (
    <Card p={p}>
      <SectionTitle p={p} title={t('results.title')} subtitle={t('results.subtitle')} />
      {actions.length === 0 ? (
        <p style={{ fontSize: 12.5, color: p.muted, margin: 0 }}>{t('results.empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map(a => (
            <li key={a.id} style={{ border: `1px solid ${p.border}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <ProductThumb src={a.product.image} p={p} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.product.name}</p>
                  <p style={{ fontSize: 11.5, color: p.muted, margin: 0 }}>
                    {t(`results.kinds.${a.kind}`)} · {t('results.appliedOn', { date: date(a.applied_on, 'dayMonth') })}
                    {a.problem_code ? ` · ${t(`problemsShort.${a.problem_code}`)}` : ''}
                  </p>
                </div>
              </div>
              {a.status === 'measuring' && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: p.muted, margin: 0 }}>
                  <Clock size={13} aria-hidden />{t('results.measuring', { done: a.days_after, needed: a.days_needed })}
                </p>
              )}
              {a.status === 'insufficient' && <p style={{ fontSize: 12, color: p.muted, margin: 0 }}>{t('results.insufficient')}</p>}
              {a.status === 'measured' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  {a.metrics.map(m => {
                    const isRate = m.metric !== 'views_per_day';
                    const fmt = (v: number | null) => isRate ? f.pct(v) : v == null ? '—' : f.count(v);
                    const up = m.after != null && m.before != null && m.after > m.before;
                    const same = m.after === m.before;
                    const Icon = same ? Minus : up ? ArrowUpRight : ArrowDownRight;
                    return (
                      <div key={m.metric} style={{ background: p.sub, borderRadius: 10, padding: '8px 10px' }}>
                        <p style={{ fontSize: 11, color: p.muted, margin: 0, fontWeight: 700 }}>{t(`results.metrics.${m.metric}`)}</p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 900, color: p.text, margin: '2px 0 0' }}>
                          <span style={{ color: p.muted, fontWeight: 700 }}>{fmt(m.before)}</span>
                          <ArrowRight size={12} color={p.faint} aria-label={t('results.then')} className="vi-flip" />
                          {fmt(m.after)}
                          <Icon size={14} aria-hidden color={same ? p.muted : up ? ink('#10b981', dark) : ink('#ef4444', dark)} />
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Empty / low data ────────────────────────────────────────────────────────

export function StarterState({ state, dark }: { state: 'no_products' | 'low_data'; dark: boolean }) {
  const t = useTranslations('seller.insights');
  const p = usePalette(dark);
  const tips = state === 'no_products' ? ['addProduct', 'photos', 'share'] : ['photos', 'share', 'boost'];
  const hrefs: Record<string, string> = { addProduct: '/seller/products?create=1', photos: '/seller/black/listing-quality', share: '/seller/settings', boost: '/seller/promote' };
  return (
    <Card p={p} style={{ background: dark ? 'rgba(59,130,246,0.06)' : '#f5f9ff' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={20} color={ink('#3b82f6', dark)} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: p.text, margin: 0 }}>{t(`states.${state}.title`)}</h2>
          <p style={{ fontSize: 12.5, color: p.muted, margin: '4px 0 0', lineHeight: 1.5 }}>{t(`states.${state}.text`)}</p>
          <p style={{ fontSize: 12.5, color: p.text, margin: '10px 0 6px', fontWeight: 800 }}>{t('states.tracked')}</p>
          <p style={{ fontSize: 12, color: p.muted, margin: 0, lineHeight: 1.5 }}>{t('states.trackedList')}</p>
          <p style={{ fontSize: 12.5, color: p.text, margin: '12px 0 6px', fontWeight: 800 }}>{t('states.tipsTitle')}</p>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tips.map(k => (
              <li key={k} style={{ fontSize: 12.5, color: p.text }}>
                <Link href={hrefs[k]} style={{ color: ink('#3b82f6', dark), fontWeight: 700 }}>{t(`states.tips.${k}`)}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function Skeleton({ dark }: { dark: boolean }) {
  const p = usePalette(dark);
  const block = (h: number, key: number) => <div key={key} className="vi-shimmer" style={{ height: h, borderRadius: 14, background: p.sub, border: `1px solid ${p.border}` }} />;
  return (
    <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => block(96, i))}
      </div>
      {block(260, 10)}
      {block(220, 11)}
      {block(240, 12)}
    </div>
  );
}
