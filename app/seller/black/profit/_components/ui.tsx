'use client';

/**
 * Centre de profit building blocks: Black Elite palette (warm cream / gold),
 * cards, ⓘ tips that work on touch, status chip and the loading skeleton.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { ink } from '@/app/seller/ink';
import { useFormat } from '@/lib/i18n/useFormat';
import type { GoalStatus } from '@/lib/blackPepperApi';

export const GOLD = '#f59e0b';
export const BRAND_RED = '#db142e';
export const BRAND_GREEN = '#198f41';

export function usePalette(dark: boolean) {
  return {
    dark,
    bg:      dark ? '#141209' : '#ffffff',
    page:    dark ? '#0f0d0a' : '#fffdf5',
    sub:     dark ? 'rgba(245,158,11,0.06)' : '#fffaf0',
    border:  dark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.22)',
    line:    dark ? 'rgba(255,255,255,0.08)' : '#ece7da',
    text:    dark ? '#ffffff' : '#111111',
    muted:   dark ? 'rgba(255,255,255,0.62)' : '#5b6472',
    faint:   dark ? 'rgba(255,255,255,0.38)' : '#9aa3af',
    gold:    ink(GOLD, dark),
    green:   dark ? '#4ade80' : BRAND_GREEN,
    red:     dark ? '#f43f5e' : BRAND_RED,
    blue:    ink('#3b82f6', dark),
    track:   dark ? 'rgba(255,255,255,0.08)' : '#efe9dc',
  };
}
export type Palette = ReturnType<typeof usePalette>;

/** Money as "1 234,50 DT" (fr) — 2 decimals by default, 0 for big headline figures when asked. */
export function useMoney() {
  const { price, number } = useFormat();
  return {
    money: (v: number | null | undefined, digits = 2) => v == null ? '—' : price(v, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    pct:   (v: number | null | undefined, digits = 0) => v == null ? '—' : number(v / 100, { style: 'percent', maximumFractionDigits: digits }),
    count: (v: number) => number(v),
  };
}

export function Card({ children, p, style, id }: { children: React.ReactNode; p: Palette; style?: React.CSSProperties; id?: string }) {
  return (
    <section id={id} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 18, padding: 18, minWidth: 0,
      boxShadow: p.dark ? '0 4px 24px rgba(245,158,11,0.05)' : '0 4px 20px rgba(245,158,11,0.07)', ...style }}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, subtitle, p, right, icon }: {
  title: string; subtitle?: string; p: Palette; right?: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
        {icon && <span style={{ color: p.gold, marginTop: 1, flexShrink: 0 }}>{icon}</span>}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: p.text, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: p.muted, margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** ⓘ — hover on desktop, tap on touch; Escape or a tap elsewhere closes it. */
export function InfoTip({ text, p, label }: { text: string; p: Palette; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label ?? text} aria-describedby={open ? id : undefined} onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', padding: 2, border: 'none', background: 'transparent', color: p.faint, cursor: 'help', borderRadius: 6 }}>
        <Info size={13} aria-hidden />
      </button>
      {open && (
        <span role="tooltip" id={id} style={{
          position: 'absolute', zIndex: 30, top: 'calc(100% + 6px)', insetInlineStart: -8, width: 'max-content', maxWidth: 260,
          padding: '8px 10px', borderRadius: 10, fontSize: 12, lineHeight: 1.45, fontWeight: 500, textTransform: 'none', letterSpacing: 0,
          background: p.dark ? '#24201a' : '#1f2937', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'normal',
        }}>{text}</span>
      )}
    </span>
  );
}

export const STATUS_COLOR: Record<GoalStatus, (p: Palette) => string> = {
  none:     p => p.muted,
  unknown:  p => p.muted,
  behind:   p => p.red,
  on_track: p => p.green,
  ahead:    p => p.green,
  reached:  p => p.green,
};

export function Chip({ children, color, title }: { children: React.ReactNode; color: string; title?: string }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
      background: `${color}1a`, border: `1px solid ${color}40`, color, fontSize: 11.5, fontWeight: 800,
    }}>{children}</span>
  );
}

export function Btn({ children, onClick, p, primary, disabled, type = 'button', title, ariaPressed }: {
  children: React.ReactNode; onClick?: () => void; p: Palette; primary?: boolean; disabled?: boolean;
  type?: 'button' | 'submit'; title?: string; ariaPressed?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} aria-pressed={ariaPressed} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 13px', borderRadius: 10,
      fontSize: 12.5, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap',
      border: primary ? 'none' : `1px solid ${p.border}`,
      background: primary ? `linear-gradient(135deg, ${GOLD}, #fbbf24)` : p.bg,
      color: primary ? '#1a1206' : p.text,
    }}>{children}</button>
  );
}

/** Progress bar: delivered part solid, still-in-delivery part striped, expected-by-today tick. */
export function ProgressBar({ pct, pctSolid, tick, color, p, label }: {
  pct: number; pctSolid: number; tick?: number | null; color: string; p: Palette; label: string;
}) {
  const w = Math.min(100, Math.max(0, pct));
  const s = Math.min(w, Math.max(0, pctSolid));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, pct))}
      style={{ position: 'relative', height: 12, borderRadius: 999, background: p.track, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: `${w}%`, borderRadius: 999,
        background: `repeating-linear-gradient(45deg, ${color}66 0 6px, ${color}33 6px 12px)`, transition: 'width .6s ease' }} />
      <div style={{ position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: `${s}%`, borderRadius: 999, background: color, transition: 'width .6s ease' }} />
      {tick != null && tick > 0 && tick < 100 && (
        <div aria-hidden style={{ position: 'absolute', insetBlock: -2, insetInlineStart: `${tick}%`, width: 2, background: p.text, opacity: 0.55 }} />
      )}
    </div>
  );
}

export function Skeleton({ p }: { p: Palette }) {
  const block = (h: number, key: number) => (
    <div key={key} className="pc-shimmer" style={{ height: h, borderRadius: 18, background: p.sub, border: `1px solid ${p.border}` }} />
  );
  return (
    <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {block(250, 0)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 10 }}>
        {[1, 2, 3, 4].map(i => block(96, i))}
      </div>
      {block(260, 5)}
      {block(200, 6)}
    </div>
  );
}
