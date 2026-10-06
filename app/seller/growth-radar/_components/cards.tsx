'use client';

/**
 * Growth Radar pieces: score hero, action card, locked preview, empty state,
 * result card. Text from the server (headline, recommendation, basis) is already
 * localized; labels come from seller.growth.* in messages/.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BellRing, CheckCircle2, HelpCircle, Info, Minus, Sparkles, X,
} from 'lucide-react';
import { useFormat } from '@/lib/i18n/useFormat';
import { ink } from '@/app/seller/ink';
import {
  growthActionHref, type CardAction, type GrowthAction, type GrowthCard, type GrowthScore, type Unlock,
} from '@/lib/growthRadarApi';
import { BRAND_RED, Chip, ConfidencePips, MiniChart, TYPE_META, usePalette } from './ui';

const scoreColor = (v: number) => (v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444');

// ─── Score ───────────────────────────────────────────────────────────────────

function Trend({ n, dark }: { n: number | null; dark: boolean }) {
  const t = useTranslations('seller.growth.score');
  if (n === null) return null;
  const Icon = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : Minus;
  const c = n > 0 ? '#10b981' : n < 0 ? '#ef4444' : '#94a3b8';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 800, color: ink(c, dark) }}>
      <Icon size={12} />{n > 0 ? t('trendUp', { n }) : n < 0 ? t('trendDown', { n }) : t('trendFlat')}
    </span>
  );
}

export function ScoreHero({ score, dark }: { score: GrowthScore; dark: boolean }) {
  const t = useTranslations('seller.growth.score');
  const p = usePalette(dark);
  const v = score.value;
  const R = 52, C = 2 * Math.PI * R;
  const color = v === null ? p.faint : scoreColor(v);

  return (
    <section className="gr-score" style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <svg viewBox="0 0 128 128" width={116} height={116} role="img" style={{ flexShrink: 0 }}>
          <title>{v === null ? t('notEnough') : `${t('title')} ${v}${t('outOf')}`}</title>
          <circle cx={64} cy={64} r={R} fill="none" stroke={p.grid} strokeWidth={11} />
          {v !== null && (
            <circle cx={64} cy={64} r={R} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round"
              strokeDasharray={`${(C * v) / 100} ${C}`} transform="rotate(-90 64 64)" />
          )}
          <text x={64} y={64} textAnchor="middle" fontSize={34} fontWeight={900} fill={p.text}>{v ?? '—'}</text>
          <text x={64} y={86} textAnchor="middle" fontSize={12} fill={p.muted}>{t('outOf')}</text>
        </svg>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.muted }}>{t('title')}</p>
          <p style={{ margin: '4px 0 6px', fontSize: 13, color: p.text, fontWeight: 600 }}>
            {v === null ? t('notEnough') : null}
          </p>
          {score.trend !== null ? <Trend n={score.trend} dark={dark} /> : <span style={{ fontSize: 11, color: p.muted }}>{t('firstWeek')}</span>}
        </div>
      </div>
      <div className="gr-subs">
        {score.subs.map(s => (
          <div key={s.key} title={t(`hints.${s.key}`)} style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: p.text, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {t(`subs.${s.key}`)}<HelpCircle size={11} style={{ color: p.faint }} aria-label={t(`hints.${s.key}`)} />
              </span>
              <span style={{ fontWeight: 900, color: p.text }}>{s.value ?? '—'}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: p.grid, overflow: 'hidden' }}>
              {s.value !== null && <div style={{ height: '100%', width: `${Math.max(3, s.value)}%`, borderRadius: 999, background: scoreColor(s.value) }} />}
            </div>
            <div style={{ marginTop: 4, minHeight: 15 }}>
              {s.value === null
                ? <span style={{ fontSize: 10.5, color: p.muted }}>{t('notEnough')}</span>
                : <Trend n={s.trend} dark={dark} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Action card ─────────────────────────────────────────────────────────────

function actionLabel(a: CardAction, t: (k: string) => string): string {
  if (a.kind === 'edit') return t(`actions.edit_${a.focus}`);
  return t(`actions.${a.kind}`);
}

export function ImpactBadge({ impact, dark, size = 'lg' }: { impact: GrowthCard['impact']; dark: boolean; size?: 'lg' | 'sm' }) {
  const t = useTranslations('seller.growth.impact');
  const { number } = useFormat();
  const p = usePalette(dark);
  if (!impact) return <span style={{ fontSize: 11, color: p.muted }}>{t('none')}</span>;
  return (
    <span title={t('tip')} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
      <span style={{ fontSize: size === 'lg' ? 18 : 14, fontWeight: 900, color: p.gain, whiteSpace: 'nowrap', direction: 'ltr' }}>
        {t('range', { low: number(impact.low), high: number(impact.high) })}
      </span>
      {size === 'lg' && <span style={{ fontSize: 10, color: p.muted, fontWeight: 700 }}>{t('label')}</span>}
    </span>
  );
}

export function ActionCard({ card, dark, onDismiss, onSnooze, onLinkAction }: {
  card: GrowthCard; dark: boolean;
  onDismiss: (id: number) => void; onSnooze: (id: number, days: 3 | 7) => void;
  onLinkAction: (card: GrowthCard, kind: 'bundle') => void;
}) {
  const t = useTranslations('seller.growth');
  const { number, date, locale } = useFormat();
  const p = usePalette(dark);
  const meta = TYPE_META[card.type];
  const Icon = meta.icon;
  const [menu, setMenu] = useState(false);

  const fmt = (v: number, unit?: string) =>
    unit === 'dt' ? `${number(v)} DT` : unit === '%' ? `${number(v, { maximumFractionDigits: 2 })}%` : unit === 'x' ? `${number(v, { maximumFractionDigits: 1 })}×` : number(v);

  const chartLabels = {
    title: t(`chart.${card.evidence.chart?.kind === 'sparkline' ? 'sparkline' : card.evidence.chart?.kind === 'price_range' ? 'price' : card.evidence.chart?.kind === 'traffic' ? 'traffic' : 'timeline'}`),
    views: t('chart.views'), orders: t('chart.orders'), you: t('chart.you'), median: t('chart.median'), range: t('chart.range'),
    today: t('chart.today'), start: t('chart.start'), event: t('chart.event'), bestHour: t('chart.bestHour'), dayNames: [],
    dayLabel: (n: number) => t('chart.daysAgo', { n }),
    hourTip: (hour: number, pct: number) => t('chart.hourTip', { hour, pct }),
    dayTip: (day: string, views: number, orders: number) => t('chart.dayTip', { day, views, orders }),
    priceTip: (label: string, value: string) => t('chart.priceTip', { label, value }),
    money: (v: number) => `${number(v)} DT`,
    date: (iso: string) => date(iso, { day: 'numeric', month: 'short' }),
  };

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 800, textDecoration: 'none', cursor: 'pointer', border: 'none',
  };
  const ghost: React.CSSProperties = { ...btn, background: 'transparent', color: p.muted, padding: '8px 10px', fontWeight: 700 };

  const href = card.action ? growthActionHref(card.id, card.action) : null;

  return (
    <article style={{
      background: p.bg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, position: 'relative',
      borderTop: `3px solid ${meta.color}`,
    }}>
      {/* Type · confidence · impact */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <Chip color={meta.color} dark={dark}><Icon size={12} />{t(`types.${card.type}`)}</Chip>
          <ConfidencePips level={card.confidence} label={t(`confidence.${card.confidence}`)} title={t('confidence.tip')} dark={dark} />
        </div>
        <ImpactBadge impact={card.impact} dark={dark} />
      </header>

      {/* Headline */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {card.product?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.product.image} alt="" width={48} height={48}
            style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: p.sub }} />
        )}
        <h3 style={{ margin: 0, fontSize: 15.5, lineHeight: 1.35, fontWeight: 800, color: p.text, overflowWrap: 'anywhere' }}>{card.headline}</h3>
      </div>

      {/* Evidence */}
      {!!card.evidence.numbers?.length && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 8 }}>
          {card.evidence.numbers.map(n => (
            <div key={n.key} style={{ background: p.sub, borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: p.muted, fontWeight: 700, lineHeight: 1.3 }}>{t(`evidence.${n.key}`)}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: p.text, lineHeight: 1.25, direction: 'ltr', textAlign: locale === 'ar' ? 'right' : 'left' }}>{fmt(n.value, n.unit)}</div>
              {n.compare !== undefined && (
                <div style={{ fontSize: 10.5, color: p.muted }}>{t('evidence.compare', { value: fmt(n.compare, n.unit) })}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {card.evidence.chart && <MiniChart chart={card.evidence.chart} dark={dark} labels={chartLabels} />}

      {/* Recommendation */}
      <div style={{ background: `${meta.color}12`, borderInlineStart: `3px solid ${meta.color}`, borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink(meta.color, dark), marginBottom: 3 }}>{t('do')}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text, lineHeight: 1.45 }}>{card.recommendation}</div>
      </div>

      {/* Basis */}
      {!!card.basis.length && (
        <details style={{ fontSize: 12, color: p.muted }}>
          <summary style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
            <Info size={12} />{t('why')}
          </summary>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, lineHeight: 1.5 }}>
            {card.basis.map(b => <li key={b}>{b}</li>)}
          </ul>
        </details>
      )}

      {/* Actions */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {href && card.action && (
            <Link href={href} onClick={() => card.action?.kind === 'bundle' && onLinkAction(card, 'bundle')}
              style={{ ...btn, background: BRAND_RED, color: '#fff' }}>
              {actionLabel(card.action, t)}<ArrowRight size={14} className="gr-flip" />
            </Link>
          )}
          {card.alt && (
            <Link href={growthActionHref(card.id, card.alt)} onClick={() => card.alt?.kind === 'bundle' && onLinkAction(card, 'bundle')}
              style={{ fontSize: 12.5, fontWeight: 700, color: ink('#3b82f6', dark), textDecoration: 'underline' }}>
              {t('or')} {actionLabel(card.alt, t).toLowerCase()}
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
          <button type="button" style={ghost} onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu">
            <BellRing size={14} />{t('remind')}
          </button>
          {menu && (
            <div role="menu" style={{
              position: 'absolute', bottom: '100%', insetInlineEnd: 0, marginBottom: 6, background: p.bg,
              border: `1px solid ${p.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: 4, zIndex: 5, minWidth: 140,
            }}>
              {([3, 7] as const).map(d => (
                <button key={d} role="menuitem" type="button" onClick={() => { setMenu(false); onSnooze(card.id, d); }}
                  style={{ ...ghost, width: '100%', justifyContent: 'flex-start', color: p.text }}>
                  {t(d === 3 ? 'remind3' : 'remind7')}
                </button>
              ))}
            </div>
          )}
          <button type="button" style={ghost} onClick={() => onDismiss(card.id)}><X size={14} />{t('dismiss')}</button>
        </div>
      </footer>
    </article>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ unlocks, dark }: { unlocks: Unlock[]; dark: boolean }) {
  const t = useTranslations('seller.growth.empty');
  const p = usePalette(dark);
  return (
    <section style={{ background: p.bg, border: `1px dashed ${p.border}`, borderRadius: 18, padding: '22px 20px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <Sparkles size={18} style={{ color: ink('#8b5cf6', dark) }} />
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 900, color: p.text }}>{t('title')}</h3>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: p.muted }}>{unlocks.length ? t('body') : t('allGood')}</p>
      {!!unlocks.length && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unlocks.map(u => (
            <li key={u.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: p.text }}>
              <CheckCircle2 size={15} style={{ color: p.faint, flexShrink: 0, marginTop: 2 }} />
              {t(`unlocks.${u.key}`, { count: u.count ?? 0 })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────

const VERDICT_COLOR = { win: '#10b981', loss: '#ef4444', neutral: '#94a3b8', unclear: '#f59e0b' } as const;

export function ResultCard({ action, dark, compact = false }: { action: GrowthAction; dark: boolean; compact?: boolean }) {
  const t = useTranslations('seller.growth.results');
  const { number, date } = useFormat();
  const p = usePalette(dark);
  const r = action.result;
  const v = action.verdict;

  if (action.status === 'running' || !r || !v) {
    return (
      <div style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: 14, fontSize: 13, color: p.muted }}>
        <strong style={{ color: p.text }}>{action.kind_label}{action.product?.name ? ` · ${action.product.name}` : ''}</strong>
        <div>{t('running', { date: date(action.measure_on, { day: 'numeric', month: 'long' }) })}</div>
      </div>
    );
  }

  const money = (n: number) => { const r = Math.round(n); return `${r > 0 ? '+' : ''}${number(r === 0 ? 0 : r)} DT`; };
  const cols: { k: 'before' | 'during' | 'after'; m: typeof r.baseline | null }[] = [
    { k: 'before', m: r.baseline }, { k: 'during', m: r.during }, { k: 'after', m: r.after },
  ];
  const maxU = Math.max(1, ...(r.daily ?? []).map(d => d.units));

  return (
    <article style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `3px solid ${VERDICT_COLOR[v]}` }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Chip color={VERDICT_COLOR[v]} dark={dark}>{t(`verdict.${v}`)}</Chip>
          <h3 style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 800, color: p.text, lineHeight: 1.35 }}>{action.headline}</h3>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: p.muted }}>{t('sameDays', { days: r.days })}</p>
        </div>
        {v !== 'unclear' && (
          <span style={{ fontSize: 18, fontWeight: 900, color: r.net_gain >= 0 ? p.gain : ink('#ef4444', dark), whiteSpace: 'nowrap', direction: 'ltr' }} title={t('net')}>
            {money(r.net_gain)}
          </span>
        )}
      </header>

      {!compact && r.daily && r.daily.length > 0 && (
        <svg viewBox={`0 0 ${r.daily.length * 10} 50`} role="img" preserveAspectRatio="none" style={{ width: '100%', height: 50, display: 'block', direction: 'ltr' }}>
          <title>{t('chart')}</title>
          {r.daily.map((d, i) => {
            const h = 44 * (d.units / maxU);
            return (
              <rect key={d.day} x={i * 10 + 1} width={8} y={48 - h} height={Math.max(1, h)} rx={2}
                fill={d.phase === 'during' ? (dark ? '#f43f5e' : BRAND_RED) : p.faint} opacity={d.phase === 'during' ? 1 : 0.55}>
                <title>{`${date(d.day, { day: 'numeric', month: 'short' })} · ${t(d.phase)} · ${d.units}`}</title>
              </rect>
            );
          })}
        </svg>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {cols.map(c => (
          <div key={c.k} style={{ background: p.sub, borderRadius: 10, padding: '8px 10px', opacity: c.m ? 1 : 0.5 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: p.muted, textTransform: 'uppercase' }}>{t(c.k)}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: p.text }}>{c.m ? number(c.m.units) : '—'} <span style={{ fontSize: 10.5, fontWeight: 600, color: p.muted }}>{t('units')}</span></div>
            <div style={{ fontSize: 11, color: p.muted }}>{c.m ? `${number(Math.round(c.m.revenue))} DT` : ''}</div>
          </div>
        ))}
      </div>

      {v !== 'unclear' && !compact && (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, fontSize: 12 }}>
          {([['gross', r.gross_gain], ['cost', -r.discount_cost], ['ads', -r.ad_spend], ['net', r.net_gain]] as [string, number][])
            .filter(([k, n]) => k !== 'ads' || n !== 0).map(([k, n]) => (
            <div key={k as string}>
              <dt style={{ color: p.muted }}>{t(k as string)}</dt>
              <dd style={{ margin: 0, fontWeight: 800, color: p.text, direction: 'ltr', textAlign: 'start' }}>{money(n as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      {!!action.unclear_reasons.length && (
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: p.muted, lineHeight: 1.5 }}>
          {action.unclear_reasons.map(x => <li key={x}>{x}</li>)}
        </ul>
      )}
    </article>
  );
}
