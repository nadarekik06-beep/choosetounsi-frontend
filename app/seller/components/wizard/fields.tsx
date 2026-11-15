'use client'

/**
 * Small building blocks shared by the seller "Nouveau pack" / "Nouvelle promotion"
 * wizards: same look as the rest of the seller dashboard (uppercase labels, rounded
 * inputs, brand red #db142e). Inputs use the `wz-input` class (16 px on phones so iOS
 * never zooms on focus, ≥ 44 px tall).
 */

import type { CSSProperties, ReactNode } from 'react'
import { Package2 } from 'lucide-react'

export const BRAND = '#db142e'

export function inputStyle(error?: boolean | 'warn'): CSSProperties {
  return {
    borderColor: error === 'warn' ? '#fcd34d' : error ? '#fca5a5' : '#e5e7eb',
    background: error === true ? '#fef2f2' : '#fff',
  }
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#5b6472',
      paddingBottom: 6, borderBottom: '1px solid #f0f0f0', margin: 0,
    }}>
      {children}
    </p>
  )
}

export function Field({ label, required, error, htmlFor, hint, field, children }: {
  label: string; required?: boolean; error?: string | null; htmlFor?: string
  hint?: ReactNode
  /** data-field key, so a backend error can scroll to / focus the faulty field */
  field?: string
  children: ReactNode
}) {
  return (
    <div data-field={field} style={{ minWidth: 0 }}>
      <label htmlFor={htmlFor} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: '#5b6472', marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: '#b91c1c' }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: '#5b6472', margin: '5px 0 0', lineHeight: 1.4 }}>{hint}</p>}
      {error && <p role="alert" style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: '5px 0 0', lineHeight: 1.4 }}>{error}</p>}
    </div>
  )
}

export function Thumb({ src, size = 52 }: { src: string | null | undefined; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f5' }} />
        : <Package2 size={Math.round(size * 0.38)} color="#94a3b8" />}
    </div>
  )
}

/** Inline notice (error / warning / info / success) */
export function Notice({ tone, children, icon }: { tone: 'error' | 'warn' | 'info' | 'ok'; children: ReactNode; icon?: ReactNode }) {
  const c = {
    error: { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c' },
    warn:  { bg: '#fffbeb', bd: '#fde68a', fg: '#92400e' },
    info:  { bg: '#f8fafc', bd: '#e2e8f0', fg: '#475569' },
    ok:    { bg: 'rgba(4,120,87,0.06)', bd: 'rgba(4,120,87,0.2)', fg: '#047857' },
  }[tone]
  return (
    <div role={tone === 'error' || tone === 'warn' ? 'alert' : undefined} style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
      borderRadius: 12, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
    }}>
      {icon}
      <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

/** Scroll the first element with a data-field in `keys` into view and focus its input. */
export function focusFirstField(root: HTMLElement | null, keys: string[]) {
  if (!root) return
  for (const k of keys) {
    const el = root.querySelector<HTMLElement>(`[data-field="${k}"]`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.querySelector<HTMLElement>('input,select,textarea,button')?.focus({ preventScroll: true })
      return
    }
  }
}
