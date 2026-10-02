'use client'

/** Small building blocks shared by the profile page and /complete-profile (styles: profile.css). */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, X, AlertCircle } from 'lucide-react'
import { validateTunisianPhone } from '@/lib/shippingAddress'

// ─── Initials avatar ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#fde68a', '#92400e'], ['#bfdbfe', '#1e40af'], ['#bbf7d0', '#14532d'],
  ['#fecaca', '#991b1b'], ['#e9d5ff', '#4c1d95'], ['#fed7aa', '#7c2d12'],
]

export function initialsOf(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  const initials = p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const [bg, fg] = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
  return { initials: initials.toUpperCase() || '?', bg, fg }
}

/** Google serves tiny avatars by default; ask for a sharper one. */
export const sharpAvatar = (url: string) => url.replace(/=s\d+-?c?$/, '=s240-c')

export function AvatarImage({ name, src, className = 'pf-avatar-img' }: { name: string; src: string | null; className?: string }) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const { initials, bg, fg } = initialsOf(name)
  if (src && brokenSrc !== src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sharpAvatar(src)} alt="" referrerPolicy="no-referrer" onError={() => setBrokenSrc(src)} className={className} />
  }
  return <span className="pf-initials" style={{ background: bg, color: fg }} aria-hidden>{initials}</span>
}

// ─── Toast ──────────────────────────────────────────────────────────────────

export type ToastState = { msg: string; kind: 'success' | 'error' } | null

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ msg, kind })
    timer.current = setTimeout(() => setToast(null), 3500)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return { toast, show }
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  return (
    <div className={`pf-toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      {toast.kind === 'error' ? <AlertCircle size={15} /> : <Check size={15} color="#4ade80" />}
      {toast.msg}
    </div>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const tc = useTranslations('common')
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    first?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="pf-modal-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="pf-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="pf-icon-btn" onClick={onClose} aria-label={tc('close')} data-close><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Form fields ────────────────────────────────────────────────────────────

export function Field({ label, error, hint, required, children, htmlFor }: {
  label: string; error?: string; hint?: string; required?: boolean; htmlFor?: string; children: React.ReactNode
}) {
  const tc = useTranslations('common')
  return (
    <div className="pf-field">
      <label htmlFor={htmlFor}>
        {label} {required ? <span className="req" aria-hidden>*</span> : <span style={{ textTransform: 'none', fontWeight: 500 }}>({tc('optional')})</span>}
      </label>
      {children}
      {error ? <p className="pf-err" role="alert">{error}</p> : hint ? <p className="pf-hint">{hint}</p> : null}
    </div>
  )
}

/** Tunisian phone with +216 prefix and live hint (same rules as checkout). */
export function PhoneInput({ id, value, onChange, error, label, required = true }: {
  id: string; value: string; onChange: (v: string) => void; error?: string; label: string; required?: boolean
}) {
  const tp = useTranslations('checkout.phone')
  const [touched, setTouched] = useState(false)
  const check = validateTunisianPhone(value)
  const live = touched && value.trim() !== ''
  return (
    <Field label={label} required={required} htmlFor={id}
      error={error ?? (live && check.hint ? tp(check.hint, check.hintValues) : undefined)}>
      <div className="pf-phone">
        <span className="cc" dir="ltr">🇹🇳 +216</span>
        <input id={id} className={`pf-input${live && check.valid ? ' ok' : ''}`} type="tel" dir="ltr" inputMode="tel"
          autoComplete="tel-national" maxLength={17} placeholder="20 123 456" value={value}
          aria-invalid={!!error || (live && !check.valid)}
          onChange={e => onChange(e.target.value.replace(/[^0-9\s\-+.]/g, ''))}
          onBlur={() => setTouched(true)} />
      </div>
    </Field>
  )
}

// ─── Empty state / status ───────────────────────────────────────────────────

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="pf-empty">
      <div className="pf-empty-art" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ w = '100%', h = 14, r, style }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return <span className="pf-skel" aria-hidden style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className="pf-switch" onClick={() => onChange(!checked)} />
  )
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="pf-stars" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}
