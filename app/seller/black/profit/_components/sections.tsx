'use client';

/**
 * Centre de profit sections below the goal: next steps, money KPIs, the
 * gross → net breakdown, products that make (or lose) the month, ad return,
 * payouts, the what-if simulator, the 6-month history and the print report.
 * Sales figures here are the same as the goal's (SellerRevenueService).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Clock, Coins, Lightbulb, Megaphone, Package,
  PiggyBank, Sparkles, Tag, TrendingDown, TrendingUp, Wallet, Calculator, CheckCircle2,
} from 'lucide-react';
import { useFormat } from '@/lib/i18n/useFormat';
import type { ProfitCenterData, ProfitMonthTotals, ProfitTip } from '@/lib/blackPepperApi';
import { Btn, Card, Chip, GOLD, InfoTip, SectionTitle, useMoney, type Palette } from './ui';

const monthOf = (ym: string) => `${ym}-01T12:00:00`;

// ─── Next steps ──────────────────────────────────────────────────────────────

export function Tips({ tips, p, onOpenGoal }: { tips: ProfitTip[]; p: Palette; onOpenGoal: () => void }) {
  const t = useTranslations('seller.profit.tips');
  const { money } = useMoney();
  if (!tips.length) return null;
  const tone = { warn: p.red, info: p.gold, good: p.green };
  const icon = { warn: AlertTriangle, info: Lightbulb, good: CheckCircle2 };

  const text = (tip: ProfitTip) => {
    const v = tip.params;
    switch (tip.key) {
      case 'confirm_pending': return t('confirm_pending', { count: Number(v.count), amount: money(Number(v.amount)) });
      case 'set_goal':        return v.amount ? t('set_goal', { amount: money(Number(v.amount), 0) }) : t('set_goal_plain');
      case 'behind':          return t('behind', { gap: Number(v.gap ?? 0) });
      case 'behind_flash':    return t('behind_flash', { gap: Number(v.gap ?? 0), product: String(v.product) });
      case 'ads_low_return':  return t('ads_low_return', { roas: String(v.roas) });
      case 'declining':       return t('declining', { product: String(v.product), drop: Number(v.drop) });
      case 'ahead':           return t('ahead');
      default:                return t(tip.key);
    }
  };

  return (
    <Card p={p} style={{ padding: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 900, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px',
        display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={13} color={GOLD} aria-hidden />{t('title')}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tips.map(tip => {
          const Ic = icon[tip.tone];
          const cta = tip.action === 'open_goal'
            ? <Btn p={p} onClick={onOpenGoal}>{t('ctaGoal')}</Btn>
            : tip.href && <Link href={tip.href} style={linkBtn(p)}>{t('cta')}<ArrowRight size={13} className="rtl-flip" aria-hidden /></Link>;
          return (
            <li key={tip.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12,
              background: `${tone[tip.tone]}0f`, border: `1px solid ${tone[tip.tone]}2e`, flexWrap: 'wrap' }}>
              <Ic size={16} color={tone[tip.tone]} style={{ flexShrink: 0 }} aria-hidden />
              <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: p.text, fontWeight: 600, lineHeight: 1.45 }}>{text(tip)}</span>
              {cta}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function linkBtn(p: Palette): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: `1px solid ${p.border}`,
    background: p.bg, color: p.text, fontSize: 12.5, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' };
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export function Kpis({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.kpis');
  const { money, pct } = useMoney();
  const k = data.kpis;
  const delta = k.sales_prev_same > 0 ? (k.sales - k.sales_prev_same) / k.sales_prev_same * 100 : null;
  const margin = k.sales > 0 ? k.net / k.sales * 100 : null;

  const items = [
    { key: 'sales', icon: Coins, value: money(k.sales), tip: t('salesTip'),
      sub: delta == null ? t('vsLastNone') : t('vsLast', { delta: `${delta >= 0 ? '+' : ''}${pct(delta)}` }),
      subColor: delta == null ? p.muted : delta >= 0 ? p.green : p.red },
    { key: 'net', icon: PiggyBank, value: money(k.net), tip: t('netTip'),
      sub: margin == null ? '—' : t('netShare', { pct: pct(margin) }), subColor: p.muted },
    { key: 'basket', icon: Tag, value: k.avg_basket ? money(k.avg_basket) : '—', tip: t('basketTip'),
      sub: t('orders', { count: k.orders }), subColor: p.muted },
    { key: 'awaiting', icon: Clock, value: money(k.awaiting.amount), tip: t('awaitingTip'),
      sub: k.awaiting.count ? t('awaitingCount', { count: k.awaiting.count, days: k.awaiting.oldest_days ?? 0 }) : t('awaitingNone'),
      subColor: k.awaiting.count ? p.red : p.muted, href: k.awaiting.count ? '/seller/orders?status=pending' : undefined },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 10 }}>
      {items.map(it => {
        const body = (
          <Card p={p} style={{ padding: 14, height: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <it.icon size={13} color={GOLD} aria-hidden />{t(it.key)}<InfoTip text={it.tip} p={p} />
            </p>
            <p style={{ fontSize: 19, fontWeight: 900, color: p.text, margin: '6px 0 2px', overflowWrap: 'anywhere' }}>{it.value}</p>
            <p style={{ fontSize: 11.5, color: it.subColor, margin: 0, fontWeight: 700 }}>{it.sub}</p>
          </Card>
        );
        return it.href
          ? <Link key={it.key} href={it.href} style={{ textDecoration: 'none', display: 'block' }}>{body}</Link>
          : <div key={it.key}>{body}</div>;
      })}
    </div>
  );
}

// ─── Gross → net breakdown ───────────────────────────────────────────────────

const STEPS = ['refunds', 'commission', 'shipping', 'ads'] as const;

export function Breakdown({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.breakdown');
  const { date } = useFormat();
  const { money, pct } = useMoney();
  const [which, setWhich] = useState<'current' | 'previous'>('current');
  const m: ProfitMonthTotals = data.breakdown[which];
  const other: ProfitMonthTotals = data.breakdown[which === 'current' ? 'previous' : 'current'];
  const max = Math.max(m.gross, 1);

  // Each deduction is drawn where the previous one left off (waterfall)
  const rows = [
    { key: 'gross', value: m.gross, start: 0, width: m.gross, color: p.blue, sign: '' },
    ...STEPS.map((k, i) => {
      const before = m.gross - STEPS.slice(0, i).reduce((sum, s) => sum + m[s], 0);
      return { key: k, value: m[k], start: Math.max(0, before - m[k]), width: m[k], color: p.red, sign: '−' };
    }),
    { key: 'net', value: m.net, start: 0, width: Math.max(0, m.net), color: p.green, sign: '=' },
  ];

  return (
    <Card p={p}>
      <SectionTitle p={p} icon={<Wallet size={17} />} title={t('title')} subtitle={t('subtitle')} right={
        <div role="radiogroup" aria-label={t('title')} style={{ display: 'flex', gap: 4, background: p.sub, border: `1px solid ${p.border}`, borderRadius: 10, padding: 3 }}>
          {(['current', 'previous'] as const).map(w => (
            <button key={w} type="button" role="radio" aria-checked={which === w} onClick={() => setWhich(w)} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
              background: which === w ? p.bg : 'transparent', color: which === w ? p.text : p.muted,
              boxShadow: which === w ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}>{date(monthOf(data.breakdown[w].month), 'monthYear')}</button>
          ))}
        </div>
      } />
      {m.gross <= 0 ? (
        <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>{t('empty')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map(r => (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 30%) 1fr auto', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, color: r.key === 'net' ? p.text : p.muted, fontWeight: r.key === 'net' || r.key === 'gross' ? 900 : 700,
                  display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {t(r.key)}<InfoTip text={t(`${r.key}Tip`)} p={p} />
                </span>
                <div aria-hidden style={{ position: 'relative', height: 14, borderRadius: 4, background: p.track }}>
                  <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: `${(r.start / max) * 100}%`,
                    width: `${Math.max(r.width > 0 ? 0.8 : 0, (r.width / max) * 100)}%`, background: r.color, borderRadius: 4, opacity: r.key === 'gross' ? 0.85 : 1 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: r.key === 'net' ? 900 : 700, color: r.key === 'net' ? p.green : p.text, textAlign: 'end', minWidth: 96 }}>
                  {r.sign && r.key !== 'net' ? `${r.sign} ` : ''}{money(r.value)}
                  <span style={{ display: 'block', fontSize: 10.5, color: p.faint, fontWeight: 600 }}>
                    {t('vs', { amount: money(other[r.key as keyof ProfitMonthTotals] as number) })}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: p.muted, margin: '12px 0 0' }}>
            {t('keep', { pct: pct(m.gross > 0 ? m.net / m.gross * 100 : 0) })}
            {m.ads_credit > 0 && <> · {t('adsCredit', { amount: money(m.ads_credit) })}</>}
          </p>
        </>
      )}
    </Card>
  );
}

// ─── Products ────────────────────────────────────────────────────────────────

export function Products({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.products');
  const { money, pct } = useMoney();
  const c = data.contributors;
  return (
    <Card p={p}>
      <SectionTitle p={p} icon={<Package size={17} />} title={t('title')} subtitle={t('subtitle')} />
      {c.top.length === 0 ? (
        <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>{t('empty')}</p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.top.map((prod, i) => (
            <li key={prod.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: p.gold }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                {prod.deleted
                  ? <span style={{ fontSize: 13, fontWeight: 700, color: p.muted }}>{prod.name}</span>
                  : <Link href={`/seller/products/${prod.id}`} style={{ fontSize: 13, fontWeight: 800, color: p.text, textDecoration: 'none' }}>{prod.name}</Link>}
                <div aria-hidden style={{ height: 5, borderRadius: 999, background: p.track, marginTop: 4 }}>
                  <div style={{ width: `${Math.min(100, prod.share)}%`, height: '100%', borderRadius: 999, background: GOLD }} />
                </div>
              </div>
              <span style={{ textAlign: 'end', fontSize: 12.5, fontWeight: 800, color: p.text }}>
                {money(prod.revenue)}
                <span style={{ display: 'block', fontSize: 10.5, color: p.muted, fontWeight: 600 }}>
                  {t('kept', { amount: money(prod.kept) })} · {pct(prod.share)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${p.line}` }}>
        <p style={{ fontSize: 12.5, fontWeight: 900, color: p.text, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingDown size={14} color={p.red} aria-hidden />{t('declining')}
        </p>
        <p style={{ fontSize: 11.5, color: p.muted, margin: '0 0 8px' }}>{c.compare_ready ? t('decliningSub') : t('tooEarly')}</p>
        {c.compare_ready && (c.declining.length === 0 ? (
          <p style={{ fontSize: 12.5, color: p.green, margin: 0, fontWeight: 700 }}>{t('decliningEmpty')}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {c.declining.map(d => (
              <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, flexWrap: 'wrap' }}>
                <Link href={`/seller/products/${d.id}`} style={{ color: p.text, fontWeight: 700, textDecoration: 'none' }}>{d.name}</Link>
                <span style={{ color: p.muted }}>
                  {money(d.before)} → {money(d.now)} <strong style={{ color: p.red }}>−{pct(d.drop_pct)}</strong>
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </Card>
  );
}

// ─── Ads & payouts ───────────────────────────────────────────────────────────

export function AdsReturn({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.ads');
  const { money } = useMoney();
  const { number } = useFormat();
  const a = data.ads;
  return (
    <Card p={p}>
      <SectionTitle p={p} icon={<Megaphone size={17} />} title={t('title')} subtitle={t('subtitle')} />
      {!a ? (
        <>
          <p style={{ fontSize: 13, color: p.muted, margin: '0 0 10px' }}>{t('none')}</p>
          <Link href="/seller/promote" style={linkBtn(p)}>{t('cta')}<ArrowRight size={13} className="rtl-flip" aria-hidden /></Link>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Mini p={p} label={t('spend')} value={money(a.spend + a.credit)} sub={a.credit > 0 ? t('credit', { amount: money(a.credit) }) : undefined} />
            <Mini p={p} label={t('revenue')} value={money(a.revenue)} sub={t('orders', { count: a.orders })} />
          </div>
          <p style={{ fontSize: 13, margin: '12px 0 0', fontWeight: 800,
            color: a.roas == null ? p.muted : a.roas >= 1 ? p.green : p.red, display: 'flex', alignItems: 'center', gap: 4 }}>
            {a.roas == null ? t('noSpend') : t('roas', { value: number(a.roas, { maximumFractionDigits: 2 }) })}
            <InfoTip text={t('roasTip')} p={p} />
          </p>
          {a.campaigns > 0 && <p style={{ fontSize: 11.5, color: p.muted, margin: '4px 0 0' }}>{t('live', { count: a.campaigns })}</p>}
        </>
      )}
    </Card>
  );
}

export function Payouts({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.payout');
  const { money } = useMoney();
  const { date } = useFormat();
  const o = data.payout;
  return (
    <Card p={p}>
      <SectionTitle p={p} icon={<Wallet size={17} />} title={t('title')} subtitle={t('subtitle')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 10 }}>
        <Mini p={p} label={t('awaiting')} value={money(o.awaiting_cash_in)} tip={t('awaitingTip')} />
        <Mini p={p} label={t('ready')} value={money(o.ready)} tip={t('readyTip')} />
        <Mini p={p} label={t('paid')} value={money(o.paid_this_month)} color={p.green} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: p.muted }}>{o.last_paid_at ? t('last', { date: date(o.last_paid_at, 'medium') }) : t('never')}</span>
        <Link href="/seller/earnings" style={linkBtn(p)}>{t('cta')}<ArrowRight size={13} className="rtl-flip" aria-hidden /></Link>
      </div>
    </Card>
  );
}

function Mini({ p, label, value, sub, tip, color }: { p: Palette; label: string; value: string; sub?: string; tip?: string; color?: string }) {
  return (
    <div style={{ background: p.sub, border: `1px solid ${p.border}`, borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
      <p style={{ fontSize: 11, color: p.muted, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>{label}{tip && <InfoTip text={tip} p={p} />}</p>
      <p style={{ fontSize: 15, fontWeight: 900, color: color ?? p.text, margin: '2px 0 0', overflowWrap: 'anywhere' }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: p.faint, margin: '1px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ─── What-if simulator ───────────────────────────────────────────────────────

export function Simulator({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.simulator');
  const { money, pct } = useMoney();
  const basket0 = Math.round(data.kpis.avg_basket ?? 50);
  const [extra, setExtra] = useState(data.progress.orders_needed || 5);
  const [basket, setBasket] = useState(basket0);
  const goal = data.goal?.amount ?? 0;
  const finish = data.kpis.sales + extra * basket;
  const missing = Math.max(0, goal - finish);
  const field: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${p.border}`,
    background: p.sub, color: p.text, fontSize: 14, fontWeight: 800, boxSizing: 'border-box' };

  return (
    <Card p={p}>
      <SectionTitle p={p} icon={<Calculator size={17} />} title={t('title')} subtitle={t('subtitle')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 800, color: p.muted }}>
          {t('extraOrders')}
          <input type="number" min={0} max={9999} value={extra} onChange={e => setExtra(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))} style={{ ...field, marginTop: 5 }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 800, color: p.muted }}>
          {t('basket')}
          <input type="number" min={1} max={99999} value={basket} onChange={e => setBasket(Math.max(0, Math.min(99999, Number(e.target.value) || 0)))} style={{ ...field, marginTop: 5 }} />
        </label>
      </div>
      <p style={{ fontSize: 13.5, color: p.text, margin: '12px 0 0' }}>
        {t.rich('result', { amount: money(finish), b: ch => <strong>{ch}</strong> })}
      </p>
      {goal > 0 ? (
        <p style={{ fontSize: 13, margin: '4px 0 0', fontWeight: 800, color: missing <= 0 ? p.green : p.red }}>
          {missing <= 0 ? t('reach', { pct: pct(finish / goal * 100) })
            : t('miss', { amount: money(missing), count: basket > 0 ? Math.ceil(missing / basket) : 0 })}
        </p>
      ) : (
        <p style={{ fontSize: 12.5, margin: '4px 0 0', color: p.muted }}>{t('noGoal')}</p>
      )}
    </Card>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────

export function History({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit.history');
  const { date } = useFormat();
  const { money, pct } = useMoney();
  const [open, setOpen] = useState(false);
  const max = Math.max(1, ...data.history.map(h => Math.max(h.sales, h.goal)));

  return (
    <Card p={p}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={17} color={GOLD} aria-hidden />
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: p.text }}>{t('title')}</span>
            <span style={{ display: 'block', fontSize: 12, color: p.muted }}>{t('subtitle')}</span>
          </span>
        </span>
        <span style={{ color: p.muted, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
          {open ? t('hide') : t('show')}{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...data.history].reverse().map(h => (
            <li key={h.month} style={{ padding: '10px 12px', borderRadius: 12, background: p.sub,
              border: `1px solid ${h.current ? `${GOLD}66` : p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: h.current ? p.gold : p.text }}>
                  {date(monthOf(h.month), 'monthYear')}{h.current ? ` · ${t('now')}` : ''}
                </span>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
                  <strong style={{ color: p.text }}>{money(h.sales)}</strong>
                  <span style={{ color: p.muted }}>{t('net', { amount: money(h.net) })}</span>
                  {h.goal > 0
                    ? <Chip color={h.hit ? p.green : h.current ? p.gold : p.red}>{h.hit ? t('hit') : `${pct(h.pct ?? 0)}`}</Chip>
                    : <span style={{ color: p.faint }}>{t('noGoal')}</span>}
                </span>
              </div>
              <div aria-hidden style={{ position: 'relative', height: 7, borderRadius: 999, background: p.track }}>
                {h.goal > 0 && <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: `${(h.goal / max) * 100}%`,
                  borderRadius: 999, background: `${GOLD}33` }} />}
                <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: `${Math.max(h.sales > 0 ? 1 : 0, (h.sales / max) * 100)}%`,
                  borderRadius: 999, background: h.hit ? p.green : GOLD }} />
              </div>
              {h.goal > 0 && <p style={{ fontSize: 10.5, color: p.faint, margin: '4px 0 0', textAlign: 'end' }}>{t('goal', { amount: money(h.goal, 0) })}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Empty state (no sale yet, ever) ─────────────────────────────────────────

export function FirstSale({ p }: { p: Palette }) {
  const t = useTranslations('seller.profit.empty');
  return (
    <Card p={p} style={{ textAlign: 'center', padding: 28 }}>
      <Coins size={30} color={GOLD} style={{ marginBottom: 8 }} aria-hidden />
      <h2 style={{ fontSize: 17, fontWeight: 900, color: p.text, margin: '0 0 6px' }}>{t('title')}</h2>
      <p style={{ fontSize: 13, color: p.muted, margin: '0 auto 16px', maxWidth: 520, lineHeight: 1.5 }}>{t('body')}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/seller/promotions" style={linkBtn(p)}><Tag size={13} aria-hidden />{t('ctaPromo')}</Link>
        <Link href="/seller/promote" style={linkBtn(p)}><Megaphone size={13} aria-hidden />{t('ctaAds')}</Link>
        <Link href="/seller/products" style={linkBtn(p)}><Package size={13} aria-hidden />{t('ctaProducts')}</Link>
      </div>
    </Card>
  );
}

// ─── Print / PDF report (hidden on screen) ───────────────────────────────────

export function PrintReport({ data }: { data: ProfitCenterData }) {
  const t = useTranslations('seller.profit');
  const { date } = useFormat();
  const { money, pct } = useMoney();
  const cur = data.breakdown.current;
  const prev = data.breakdown.previous;
  const rows: (keyof ProfitMonthTotals)[] = ['gross', 'refunds', 'commission', 'shipping', 'ads', 'net', 'sales', 'delivered', 'orders'];
  const cell: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #ddd', textAlign: 'start' };
  return (
    <div className="pc-print" aria-hidden>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Choose&apos;Tounsi — {t('title')}</h1>
      <p style={{ margin: '0 0 14px', color: '#555' }}>{t('print.generated', { date: date(new Date(), 'long') })}</p>
      {data.goal && (
        <p style={{ margin: '0 0 12px' }}>
          {t('print.goal', { goal: money(data.goal.amount, 0), sales: money(cur.sales), pct: pct(data.progress.pct ?? 0) })}
        </p>
      )}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={cell} />
            <th style={cell}>{date(monthOf(cur.month), 'monthYear')}</th>
            <th style={cell}>{date(monthOf(prev.month), 'monthYear')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r}>
              <td style={cell}>{t(`print.rows.${r}`)}</td>
              <td style={cell}>{r === 'orders' ? cur[r] : money(cur[r] as number)}</td>
              <td style={cell}>{r === 'orders' ? prev[r] : money(prev[r] as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.contributors.top.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: '18px 0 6px' }}>{t('products.title')}</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <tbody>
              {data.contributors.top.map(prod => (
                <tr key={prod.id}><td style={cell}>{prod.name}</td><td style={cell}>{money(prod.revenue)}</td><td style={cell}>{t('products.kept', { amount: money(prod.kept) })}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
