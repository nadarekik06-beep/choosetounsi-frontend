'use client';

/**
 * Goal block of the Centre de profit: progress hero (status, pace, projection,
 * burn-up chart, streak), the set/edit modal with suggested presets, and the
 * 🔔 alert toggle + settings popover.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Flame, Pencil, Settings2, Target, Trash2, X, Award } from 'lucide-react';
import { useFormat } from '@/lib/i18n/useFormat';
import {
  blackPepperApi, type GoalPreset, type ProfitAlertSettings, type ProfitCenterData,
} from '@/lib/blackPepperApi';
import { Btn, Card, Chip, GOLD, InfoTip, ProgressBar, STATUS_COLOR, useMoney, type Palette } from './ui';

const monthOf = (ym: string) => `${ym}-01T12:00:00`;

// ─── Hero ────────────────────────────────────────────────────────────────────

export function GoalHero({ data, p, onEdit, onAlertsChange }: {
  data: ProfitCenterData; p: Palette; onEdit: () => void; onAlertsChange: (a: ProfitAlertSettings) => void;
}) {
  const t = useTranslations('seller.profit');
  const { date } = useFormat();
  const { money, pct, count } = useMoney();
  const g = data.goal;
  const pr = data.progress;
  const month = date(monthOf(data.month), 'monthYear');

  if (!g) {
    return (
      <Card p={p} id="goal" style={{ background: p.dark ? 'linear-gradient(135deg,#1a1206,#2d1f08)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <IconBadge p={p}><Target size={22} /></IconBadge>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={eyebrow(p)}>{t('goal.label', { month })}</p>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: p.text, margin: '2px 0 4px' }}>{t('goal.none', { month })}</h2>
            <p style={{ fontSize: 13, color: p.muted, margin: 0, maxWidth: 560 }}>{t('goal.noneHint')}</p>
            {data.suggestion.presets && (
              <p style={{ fontSize: 13, color: p.text, margin: '10px 0 0' }}>
                {t.rich('goal.suggested', { amount: money(data.suggestion.presets.realistic, 0), b: c => <strong style={{ color: p.gold }}>{c}</strong> })}
              </p>
            )}
          </div>
          <Btn p={p} primary onClick={onEdit}><Target size={14} />{t('goal.set')}</Btn>
        </div>
        <ProjectionLine data={data} p={p} />
      </Card>
    );
  }

  const status = pr.status;
  const color = STATUS_COLOR[status](p);
  const expectedPct = pr.expected_by_now != null && g.amount > 0 ? pr.expected_by_now / g.amount * 100 : null;

  return (
    <Card p={p} id="goal">
      {/* Header: month, target, status, actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <IconBadge p={p}><Target size={22} /></IconBadge>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={eyebrow(p)}>{t('goal.label', { month })}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: p.text, letterSpacing: '-0.02em' }}>{money(data.kpis.sales)}</span>
            <span style={{ fontSize: 14, color: p.muted, fontWeight: 700 }}>/ {money(g.amount, 0)}</span>
            <Chip color={color}>{t(`goal.status.${status}`)}</Chip>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <AlertsMenu settings={data.alerts} p={p} onChange={onAlertsChange} />
          <Btn p={p} onClick={onEdit}><Pencil size={13} />{t('goal.edit')}</Btn>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar pct={pr.pct ?? 0} pctSolid={pr.pct_delivered ?? 0} tick={expectedPct} color={status === 'behind' ? p.red : status === 'unknown' ? GOLD : p.green}
        p={p} label={t('goal.achieved', { pct: pct(pr.pct ?? 0) })} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 7, fontSize: 11.5, color: p.muted }}>
        <span style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ color: p.text }}>{t('goal.achieved', { pct: pct(pr.pct ?? 0) })}</strong>
          <Legend swatch={<span style={{ width: 12, height: 8, borderRadius: 2, background: color }} />}>{t('goal.delivered', { amount: money(data.kpis.delivered) })}</Legend>
          {data.kpis.in_progress > 0 && (
            <Legend swatch={<span style={{ width: 12, height: 8, borderRadius: 2, background: `repeating-linear-gradient(45deg, ${color}66 0 3px, ${color}33 3px 6px)` }} />}>
              {t('goal.inProgress', { amount: money(data.kpis.in_progress) })}
            </Legend>
          )}
          {expectedPct != null && expectedPct < 100 && (
            <Legend swatch={<span style={{ width: 2, height: 10, background: p.text, opacity: 0.55 }} />}>{t('goal.expectedTick')}</Legend>
          )}
        </span>
        <span>{t('goal.daysLeft', { count: data.days_left })}</span>
      </div>

      {/* Pace numbers */}
      {status !== 'reached' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10, marginTop: 16 }}>
          <Stat p={p} label={t('goal.remaining')} value={money(pr.remaining ?? 0)} />
          <Stat p={p} label={t('goal.requiredPace')} value={t('goal.perDay', { amount: money(pr.required_daily ?? 0) })} tip={t('goal.requiredPaceTip')} />
          <Stat p={p} label={t('goal.currentPace')} value={t('goal.perDay', { amount: money(pr.current_daily) })}
            color={(pr.current_daily ?? 0) >= (pr.required_daily ?? 0) ? p.green : p.red} tip={t('goal.currentPaceTip')} />
          <Stat p={p} label={t('goal.gap')} value={pr.orders_needed ? t('goal.ordersNeeded', { count: pr.orders_needed }) : '—'}
            tip={data.kpis.avg_basket ? t('goal.ordersNeededTip', { amount: money(data.kpis.avg_basket) }) : undefined} />
        </div>
      ) : (
        <p style={{ margin: '14px 0 0', fontSize: 13.5, color: p.green, fontWeight: 800 }}>
          {t('goal.reachedLine', { pct: pct(pr.pct ?? 0, 0) })}
        </p>
      )}

      {/* Optional targets */}
      {(pr.orders || pr.net) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginTop: 14 }}>
          {pr.orders && <MiniTarget p={p} label={t('goal.ordersTarget')} done={count(pr.orders.done)} target={count(pr.orders.target)} pct={pr.orders.pct} />}
          {pr.net && <MiniTarget p={p} label={t('goal.netTarget')} done={money(pr.net.done)} target={money(pr.net.target, 0)} pct={pr.net.pct} />}
        </div>
      )}

      <ProjectionLine data={data} p={p} />
      {data.cumulative.length > 0 && <BurnUp data={data} p={p} />}
      <StreakRow data={data} p={p} />
    </Card>
  );
}

function eyebrow(p: Palette): React.CSSProperties {
  return { fontSize: 11, fontWeight: 800, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 };
}

function IconBadge({ p, children }: { p: Palette; children: React.ReactNode }) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.12))', border: '1px solid rgba(245,158,11,0.45)', color: p.gold }}>
      {children}
    </div>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{swatch}{children}</span>;
}

function Stat({ p, label, value, color, tip }: { p: Palette; label: string; value: string; color?: string; tip?: string }) {
  return (
    <div style={{ background: p.sub, border: `1px solid ${p.border}`, borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: p.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
        {label}{tip && <InfoTip text={tip} p={p} />}
      </p>
      <p style={{ fontSize: 15, fontWeight: 900, color: color ?? p.text, margin: '2px 0 0', overflowWrap: 'anywhere' }}>{value}</p>
    </div>
  );
}

function MiniTarget({ p, label, done, target, pct }: { p: Palette; label: string; done: string; target: string; pct: number }) {
  const { pct: fpct } = useMoney();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, gap: 8 }}>
        <span style={{ color: p.muted, fontWeight: 700 }}>{label}</span>
        <span style={{ color: p.text, fontWeight: 800 }}>{done} / {target} · {fpct(pct)}</span>
      </div>
      <ProgressBar pct={pct} pctSolid={pct} color={pct >= 100 ? p.green : GOLD} p={p} label={label} />
    </div>
  );
}

function ProjectionLine({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit');
  const { money } = useMoney();
  const proj = data.projection;
  const conf = proj?.confidence;
  const pips = conf ? { low: 1, medium: 2, high: 3 }[conf] : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16, padding: '10px 12px', borderRadius: 12,
      background: p.sub, border: `1px dashed ${p.border}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: p.muted, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        {t('goal.projection')}<InfoTip text={t('kpis.projectionTip')} p={p} />
      </span>
      {proj ? (
        <>
          <strong style={{ fontSize: 15, color: p.text }}>≈ {money(proj.amount, 0)}</strong>
          <span title={t(`goal.confidenceTip.${conf}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: p.muted, fontWeight: 700 }}>
            <span aria-hidden style={{ display: 'inline-flex', gap: 2 }}>
              {[1, 2, 3].map(i => <span key={i} style={{ width: 6, height: 10, borderRadius: 2, background: i <= pips ? GOLD : p.track }} />)}
            </span>
            {t(`goal.confidence.${conf}`)}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 12.5, color: p.muted }}>{t('goal.noProjection')}</span>
      )}
    </div>
  );
}

/** Cumulative sales vs the straight line to the goal, plus the projected finish. */
function BurnUp({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit');
  const { money } = useMoney();
  const W = 600, H = 150, L = 6, R = 6, T = 10, B = 18;
  const dim = data.days_in_month;
  const goal = data.goal?.amount ?? 0;
  const last = data.cumulative[data.cumulative.length - 1];
  const projAmount = data.projection?.amount ?? null;
  const max = Math.max(goal, projAmount ?? 0, last?.sales ?? 0, 1) * 1.08;
  const x = (d: number) => L + (W - L - R) * ((d - 0.5) / dim);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const path = data.cumulative.map((c, i) => `${i ? 'L' : 'M'} ${x(c.day).toFixed(1)} ${y(c.sales).toFixed(1)}`).join(' ');
  const statusColor = data.progress.status === 'behind' ? p.red : p.green;

  return (
    <figure style={{ margin: '16px 0 0' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
        <title>{t('goal.chart.title')}</title>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={p.line} />
        {goal > 0 && (
          <>
            <line x1={x(0.5)} y1={y(0)} x2={x(dim)} y2={y(goal)} stroke={p.faint} strokeWidth={1.5} strokeDasharray="5 5" />
            <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke={GOLD} strokeOpacity={0.35} />
            <text x={W - R} y={y(goal) - 4} textAnchor="end" fontSize={10} fill={p.muted}>{money(goal, 0)}</text>
          </>
        )}
        {projAmount != null && last && last.day < dim && (
          <line x1={x(last.day)} y1={y(last.sales)} x2={x(dim)} y2={y(projAmount)} stroke={statusColor} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
        )}
        <path d={path} fill="none" stroke={statusColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {last && <circle cx={x(last.day)} cy={y(last.sales)} r={4} fill={statusColor} />}
        {data.cumulative.map(c => (
          <rect key={c.day} x={x(c.day) - (W - L - R) / dim / 2} y={0} width={(W - L - R) / dim} height={H} fill="transparent">
            <title>{t('goal.chart.dayTip', { day: c.day, amount: money(c.sales) })}</title>
          </rect>
        ))}
        {[1, Math.ceil(dim / 2), dim].map(d => (
          <text key={d} x={x(d)} y={H - 4} textAnchor="middle" fontSize={10} fill={p.faint}>{d}</text>
        ))}
      </svg>
      <figcaption style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: p.muted, marginTop: 4 }}>
        <Legend swatch={<span style={{ width: 14, height: 3, borderRadius: 2, background: statusColor }} />}>{t('goal.chart.actual')}</Legend>
        {goal > 0 && <Legend swatch={<span style={{ width: 14, height: 0, borderTop: `2px dashed ${p.faint}` }} />}>{t('goal.chart.ideal')}</Legend>}
        {projAmount != null && <Legend swatch={<span style={{ width: 14, height: 0, borderTop: `2px dotted ${statusColor}` }} />}>{t('goal.chart.projection')}</Legend>}
      </figcaption>
    </figure>
  );
}

function StreakRow({ data, p }: { data: ProfitCenterData; p: Palette }) {
  const t = useTranslations('seller.profit');
  const { date } = useFormat();
  const { money } = useMoney();
  const s = data.streak;
  if (s.current < 1 && s.badges.length === 0 && !s.best_month) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${p.line}` }}>
      {s.current >= 1 && (
        <Chip color={p.gold}><Flame size={12} aria-hidden />{t('goal.streak', { count: s.current })}</Chip>
      )}
      {s.best > s.current && <Chip color={p.muted}>{t('goal.best', { count: s.best })}</Chip>}
      {s.badges.map(b => <Chip key={b} color={p.blue}><Award size={12} aria-hidden />{t(`goal.badges.${b}`)}</Chip>)}
      {s.best_month && (
        <span style={{ fontSize: 11.5, color: p.muted }}>
          {t('goal.bestMonth', { month: date(monthOf(s.best_month.month), 'monthYear'), amount: money(s.best_month.sales, 0) })}
        </span>
      )}
    </div>
  );
}

// ─── Alerts toggle + settings ────────────────────────────────────────────────

const ALERT_KINDS = ['milestones', 'pace', 'weekly', 'monthly_recap', 'new_goal_reminder'] as const;

export function AlertsMenu({ settings, p, onChange }: { settings: ProfitAlertSettings; p: Palette; onChange: (a: ProfitAlertSettings) => void }) {
  const t = useTranslations('seller.profit.alerts');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const save = async (patch: Partial<ProfitAlertSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);                       // optimistic
    setBusy(true); setErr(false);
    try { onChange((await blackPepperApi.updateGoalAlerts(patch)).data); }
    catch { onChange(settings); setErr(true); }
    finally { setBusy(false); }
  };

  const on = settings.enabled && (settings.channel_bell || settings.channel_email);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{ display: 'inline-flex', borderRadius: 10, border: `1px solid ${on ? `${GOLD}66` : p.border}`, overflow: 'hidden' }}>
        <button type="button" onClick={() => save({ enabled: !settings.enabled })} aria-pressed={settings.enabled} disabled={busy}
          title={t('toggle')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
            background: on ? `${GOLD}1f` : p.bg, color: on ? p.gold : p.muted,
          }}>
          {on ? <Bell size={14} /> : <BellOff size={14} />}
          <span className="pc-hide-sm">{t('toggle')}</span>
        </button>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t('settings')} title={t('settings')} style={{
          display: 'inline-flex', alignItems: 'center', padding: '8px 9px', border: 'none', borderInlineStart: `1px solid ${p.border}`,
          cursor: 'pointer', background: p.bg, color: p.muted,
        }}><Settings2 size={14} /></button>
      </div>
      {open && (
        <div role="dialog" aria-label={t('settings')} style={{
          position: 'absolute', zIndex: 40, top: 'calc(100% + 8px)', insetInlineEnd: 0, width: 'min(300px, calc(100vw - 32px))',
          background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: p.text, margin: '0 0 8px' }}>{t('settings')}</p>
          <Toggle p={p} label={t('toggle')} checked={settings.enabled} onChange={v => save({ enabled: v })} strong />
          <div style={{ opacity: settings.enabled ? 1 : 0.5, pointerEvents: settings.enabled ? 'auto' : 'none' }}>
            {ALERT_KINDS.map(k => <Toggle key={k} p={p} label={t(k)} checked={settings[k]} onChange={v => save({ [k]: v })} />)}
            <p style={{ fontSize: 11, fontWeight: 800, color: p.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '10px 0 4px' }}>{t('channels')}</p>
            <Toggle p={p} label={t('bell')} checked={settings.channel_bell} onChange={v => save({ channel_bell: v })} />
            <Toggle p={p} label={t('email')} checked={settings.channel_email} onChange={v => save({ channel_email: v })} />
          </div>
          {err && <p role="alert" style={{ fontSize: 12, color: p.red, margin: '8px 0 0' }}>{t('failed')}</p>}
        </div>
      )}
    </div>
  );
}

function Toggle({ p, label, checked, onChange, strong }: { p: Palette; label: string; checked: boolean; onChange: (v: boolean) => void; strong?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 0', cursor: 'pointer',
      fontSize: 12.5, color: p.text, fontWeight: strong ? 800 : 600 }}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: GOLD, flexShrink: 0 }} />
    </label>
  );
}

// ─── Set / edit modal ────────────────────────────────────────────────────────

const PRESETS = ['prudent', 'realistic', 'ambitious'] as const;

export function GoalModal({ data, p, onClose, onSaved }: { data: ProfitCenterData; p: Palette; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('seller.profit.modal');
  const { date } = useFormat();
  const { money } = useMoney();
  const nextMonth = (() => { const [y, m] = data.month.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; })();
  const editing = data.goal;
  const s = data.suggestion;

  const [month, setMonth] = useState(data.month);
  const [preset, setPreset] = useState<GoalPreset>(editing?.preset ?? (s.presets ? 'realistic' : 'custom'));
  const [amount, setAmount] = useState(String(editing?.amount ?? s.presets?.realistic ?? ''));
  const [orders, setOrders] = useState(editing?.orders_target ? String(editing.orders_target) : '');
  const [net, setNet] = useState(editing?.net_target ? String(editing.net_target) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const pick = (k: typeof PRESETS[number]) => { setPreset(k); if (s.presets) setAmount(String(s.presets[k])); };
  const amountNum = Number(amount.replace(',', '.'));
  const netNum = net ? Number(net.replace(',', '.')) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(amountNum > 0)) return setError(t('invalid'));
    if (netNum != null && netNum > amountNum) return setError(t('netTooHigh'));
    setBusy(true); setError(null);
    try {
      await blackPepperApi.saveGoal({
        month, amount: amountNum, preset,
        orders_target: orders ? Math.max(1, Math.round(Number(orders))) : null,
        net_target: netNum,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!editing || !window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    try { await blackPepperApi.deleteGoal(editing.month); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : t('failed')); setBusy(false); }
  };

  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.sub,
    color: p.text, fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: p.muted, display: 'block', margin: '0 0 5px' };

  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pc-goal-title" style={{
        width: 'min(520px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: p.bg, borderRadius: 18,
        border: `1px solid ${p.border}`, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <h2 id="pc-goal-title" style={{ fontSize: 17, fontWeight: 900, color: p.text, margin: 0 }}>
            {t(editing ? 'titleEdit' : 'titleSet', { month: date(monthOf(month), 'monthYear') })}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('cancel')} style={{ border: 'none', background: 'transparent', color: p.muted, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          {!editing && (
            <div role="radiogroup" aria-label={t('month')} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[data.month, nextMonth].map((m, i) => (
                <button key={m} type="button" role="radio" aria-checked={month === m} onClick={() => setMonth(m)} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
                  border: `1px solid ${month === m ? GOLD : p.border}`, background: month === m ? `${GOLD}18` : p.bg, color: month === m ? p.gold : p.muted,
                }}>{i === 0 ? t('thisMonth') : t('nextMonth')} · {date(monthOf(m), 'monthYear')}</button>
              ))}
            </div>
          )}

          {s.presets ? (
            <>
              <p style={{ fontSize: 12.5, color: p.muted, margin: '0 0 8px' }}>
                {s.basis === 'last'
                  ? t('basisLast', { amount: money(s.reference ?? 0, 0) })
                  : t('basisAverage', { count: s.months, amount: money(s.reference ?? 0, 0) })}
                {s.same_month_last_year != null && <> · {t('yoy', { amount: money(s.same_month_last_year, 0) })}</>}
              </p>
              <div role="radiogroup" aria-label={t('presetsLabel')} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
                {PRESETS.map(k => (
                  <button key={k} type="button" role="radio" aria-checked={preset === k} onClick={() => pick(k)} style={{
                    padding: '10px 6px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `1.5px solid ${preset === k ? GOLD : p.border}`, background: preset === k ? `${GOLD}18` : p.bg,
                  }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: preset === k ? p.gold : p.muted }}>{t(`presets.${k}`)}</span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 900, color: p.text, margin: '2px 0' }}>{money(s.presets![k], 0)}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: p.faint }}>{t(`presetsHint.${k}`)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: p.muted, margin: '0 0 12px' }}>{t('starter')}</p>
          )}

          <label style={label} htmlFor="pc-amount">{t('amount')}</label>
          <input id="pc-amount" inputMode="decimal" value={amount} placeholder="1000"
            onChange={e => { setAmount(e.target.value); setPreset('custom'); }} style={input} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10, marginTop: 12 }}>
            <div>
              <label style={label} htmlFor="pc-orders">{t('ordersTarget')} <span style={{ fontWeight: 600 }}>· {t('optional')}</span></label>
              <input id="pc-orders" inputMode="numeric" value={orders} onChange={e => setOrders(e.target.value.replace(/\D/g, ''))} style={input} />
            </div>
            <div>
              <label style={label} htmlFor="pc-net">{t('netTarget')} <span style={{ fontWeight: 600 }}>· {t('optional')}</span></label>
              <input id="pc-net" inputMode="decimal" value={net} onChange={e => setNet(e.target.value)} style={input} />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: p.faint, margin: '6px 0 0' }}>{t('netHint')}</p>

          {error && <p role="alert" style={{ fontSize: 12.5, color: p.red, margin: '10px 0 0', fontWeight: 700 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {editing ? <Btn p={p} onClick={remove} disabled={busy}><Trash2 size={13} />{t('delete')}</Btn> : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn p={p} onClick={onClose} disabled={busy}>{t('cancel')}</Btn>
              <Btn p={p} primary type="submit" disabled={busy}>{busy ? t('saving') : t('save')}</Btn>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
