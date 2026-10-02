'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { PepperShape } from '@/app/components/home/illustrations/AnimatedPepper'
import { canScrollNext, canScrollPrev, scrollCarousel } from '@/lib/i18n/rtlScroll'
import type { PepperTier } from '@/lib/shopPageApi'

/** One-shot scroll reveal; `index` staggers siblings. */
export function Reveal({ as: Tag = 'div', index = 0, className = '', threshold = 0.15, children, style, ...rest }: {
  as?: ElementType; index?: number; className?: string; threshold?: number; children: ReactNode; style?: CSSProperties
} & Record<string, unknown>) {
  const { ref, seen } = useInView<HTMLElement>({ threshold, rootMargin: '0px 0px -40px 0px' })
  return (
    <Tag ref={ref} className={`sp-reveal${seen ? ' is-in' : ''} ${className}`} style={{ '--i': index, ...style } as CSSProperties} {...rest}>
      {children}
    </Tag>
  )
}

export type Tone = 'red' | 'green' | 'gold'

/** Eyebrow + two-line display title (second part coloured, underline draws in) + lead + optional action. */
export function SectionHead({ id, eyebrow, line1, line2, lead, tone = 'red', action }: {
  id: string; eyebrow: ReactNode; line1: ReactNode; line2: ReactNode; lead?: ReactNode; tone?: Tone; action?: ReactNode
}) {
  return (
    <Reveal className="sp-head">
      <div className="sp-head__text">
        <p className={`sp-eyebrow sp-eyebrow--${tone}`}><span className="sp-eyebrow__dot" aria-hidden="true" />{eyebrow}</p>
        <h2 id={id} className={`sp-title sp-title--${tone}`}>{line1} <em>{line2}</em></h2>
        {lead && <p className="sp-lead">{lead}</p>}
      </div>
      {action}
    </Reveal>
  )
}

export function ArrowIcon({ size = 15 }: { size?: number }) {
  return (
    <span className="sp-arrow" aria-hidden="true">
      <svg className="rtl-flip" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" focusable="false">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </span>
  )
}

/** Small static pepper glyph (tier colours). */
export function PepperGlyph({ tier, size = 14 }: { tier: PepperTier; size?: number }) {
  const color = tier === 'free' ? 'green' : tier
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true" focusable="false" style={{ overflow: 'visible' }}>
      <PepperShape color={color} />
    </svg>
  )
}

export const TIERS: PepperTier[] = ['black', 'red', 'free']
export const asTier = (plan: unknown): PepperTier | null =>
  plan === 'black' || plan === 'red' || plan === 'free' ? plan : null

/** Pepper tier pill: "🌶 Black Pepper". `iconOnly` keeps just the pepper (labelled for screen readers). */
export function TierBadge({ tier, iconOnly = false, className = '' }: { tier: PepperTier; iconOnly?: boolean; className?: string }) {
  const t = useTranslations('shopPage.sellers.tier')
  const label = t(tier)
  return (
    <span className={`sp-tier sp-tier--${tier}${iconOnly ? ' sp-tier--icon' : ''} ${className}`} title={label}>
      <PepperGlyph tier={tier} size={iconOnly ? 13 : 14} />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  )
}

/** "──── 🌶🌶🌶 ────" section divider in the three tier colours. */
export function PepperDivider() {
  return (
    <div className="sp-divider" aria-hidden="true">
      <span className="sp-divider__peps">
        <PepperGlyph tier="free" size={16} />
        <PepperGlyph tier="red" size={20} />
        <PepperGlyph tier="black" size={16} />
      </span>
    </div>
  )
}

/** 0–5 stars with a partial fill; nothing when there is no rating yet. */
export function Stars({ rating, count, label }: { rating: number | null | undefined; count?: number; label?: string }) {
  if (rating == null || !(rating > 0)) return null
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <span className="sp-stars" role="img" aria-label={label}>
      <span className="sp-stars__row" aria-hidden="true">
        ★★★★★
        <span className="sp-stars__fill" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
      <span className="sp-stars__num ltr-iso" aria-hidden="true">{rating.toFixed(1)}</span>
      {count != null && count > 0 && <span className="ltr-iso" aria-hidden="true">({count})</span>}
    </span>
  )
}

/** Horizontal scroller with prev/next buttons that respect RTL. */
export function Rail({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  const th = useTranslations('homeFeed')
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ prev: false, next: false })

  const update = useCallback(() => {
    const el = track.current
    if (el) setEdges({ prev: canScrollPrev(el), next: canScrollNext(el) })
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [update, children])

  return (
    <div className={`sp-rail ${className}`}>
      <button type="button" className="sp-rail__btn sp-rail__btn--prev" disabled={!edges.prev} aria-label={th('scrollPrev')}
        onClick={() => track.current && scrollCarousel(track.current, 'prev')}>
        <svg className="rtl-flip" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div ref={track} className="sp-rail__track" role="list" aria-label={label}>
        {children}
      </div>
      <button type="button" className="sp-rail__btn sp-rail__btn--next" disabled={!edges.next} aria-label={th('scrollNext')}
        onClick={() => track.current && scrollCarousel(track.current, 'next')}>
        <svg className="rtl-flip" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="sp-skel" aria-hidden="true">
      <div className="sp-skel__media" />
      <div className="sp-skel__line" style={{ width: '40%' }} />
      <div className="sp-skel__line" style={{ width: '85%' }} />
      <div className="sp-skel__line" style={{ width: '50%', marginBottom: 14 }} />
    </div>
  )
}

/** Wall clock that ticks every `ms` (null until mounted, so server and client markup agree). */
export function useNow(ms = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = requestAnimationFrame(tick)
    const id = window.setInterval(tick, ms)
    return () => { cancelAnimationFrame(first); window.clearInterval(id) }
  }, [ms])
  return now
}

export function splitDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** "3d 4h" / "4h 12m" / "12m 05s" — compact time left, localized units. */
export function TimeLeft({ endsAt }: { endsAt: string }) {
  const t = useTranslations('countdown')
  const now = useNow()
  if (now === null) return <span className="ltr-iso">--</span>
  const left = new Date(endsAt).getTime() - now
  if (left <= 0) return <span>{t('ended')}</span>
  const { d, h, m, s } = splitDuration(left)
  const text = d > 0 ? `${d}${t('daySuffix')} ${h}${t('h')}`
    : h > 0 ? `${h}${t('h')} ${String(m).padStart(2, '0')}${t('m')}`
    : `${m}${t('m')} ${String(s).padStart(2, '0')}${t('s')}`
  return <span className="ltr-iso">{text}</span>
}

