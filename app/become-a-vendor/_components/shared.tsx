'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode, type CSSProperties } from 'react'
import { Leaf, Flame, Crown, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import { useFormat } from '@/lib/i18n/useFormat'
import type { SellerPlanInfo, PlanKey } from '@/lib/platformApi'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '') + '/api'

// ── Plans ─────────────────────────────────────────────────────────────────────

/** Visual identity per tier. Everything factual (name, price, limits, features) comes from /api/seller-plans. */
export type PlanStyleKey = 'green' | 'red' | 'black'
export const PLAN_STYLES: Record<PlanKey, { key: PlanStyleKey; Icon: LucideIcon; accent: string; dark: boolean; popular: boolean }> = {
  free:  { key: 'green', Icon: Leaf,  accent: '#198f41', dark: false, popular: false },
  red:   { key: 'red',   Icon: Flame, accent: '#db142e', dark: false, popular: true  },
  black: { key: 'black', Icon: Crown, accent: '#f59e0b', dark: true,  popular: false },
}
export const PLAN_ORDER: PlanKey[] = ['free', 'red', 'black']

/** Look of any plan (admin-created ones included): its tier's style, accented with its badge colour. */
export function planStyleOf(plan: SellerPlanInfo | null | undefined) {
  const base = PLAN_STYLES[PLAN_ORDER[plan?.tier ?? 0] ?? 'free']
  return { ...base, accent: plan?.badge_color || base.accent }
}

/** "49 DT" / "Gratuit": localized plan price. */
export function usePlanPrice() {
  const t = useTranslations('vendor')
  const { price } = useFormat()
  return (plan: SellerPlanInfo | undefined | null) => {
    if (!plan) return '…'
    return plan.price === 0 ? t('free') : price(plan.price, { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  }
}

// ── Live landing data (GET /api/seller-landing) ──────────────────────────────

export interface LandingStats {
  sellers: number
  orders_delivered: number
  wilayas_served: number
  average_rating: number | null
  reviews: number
}
export interface ShowcaseSeller {
  id: number
  business_name: string
  wilaya: string | null
  category: string | null
  avatar: string | null
  quote: string | null
  plan: string
}

/** Public stats + showcase; `enabled` lets seller variants skip the request. */
export function useLandingData(enabled = true) {
  const [data, setData] = useState<{ stats: LandingStats; sellers: ShowcaseSeller[] } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetch(`${API_URL}/seller-landing`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => { if (alive) setData(json.data) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [enabled])
  return { data, failed }
}

// ── Motion helpers ───────────────────────────────────────────────────────────

/** One-shot scroll reveal. `index` staggers siblings. */
export function Reveal({ as: Tag = 'div', index = 0, className = '', threshold = 0.18, children, style, ...rest }: {
  as?: ElementType; index?: number; className?: string; threshold?: number; children: ReactNode; style?: CSSProperties
} & Record<string, unknown>) {
  const { ref, seen } = useInView<HTMLElement>({ threshold, rootMargin: '0px 0px -40px 0px' })
  return (
    <Tag ref={ref} className={`vl-reveal${seen ? ' is-in' : ''} ${className}`} style={{ '--i': index, ...style } as CSSProperties} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * Light parallax: translates the element on Y relative to its distance from the
 * viewport centre. Transform-only, rAF-throttled, off under reduced motion.
 */
export function useParallax<T extends HTMLElement>(speed = 0.08) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const delta = (r.top + r.height / 2 - window.innerHeight / 2) * -speed
      el.style.transform = `translate3d(0, ${delta.toFixed(1)}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
      el.style.transform = ''
    }
  }, [speed, reduced])
  return ref
}

// ── Typography ───────────────────────────────────────────────────────────────

export function Eyebrow({ children, tone = 'red' }: { children: ReactNode; tone?: 'red' | 'green' }) {
  return (
    <p className={`vl-eyebrow vl-eyebrow--${tone}`}>
      <span className="vl-eyebrow__dot" aria-hidden="true" />
      {children}
    </p>
  )
}

/** Eyebrow + two-line display title (second line coloured, underline draws in) + optional lead. */
export function SectionHeading({ id, eyebrow, line1, line2, lead, tone = 'red', align = 'center' }: {
  id: string; eyebrow: ReactNode; line1: ReactNode; line2: ReactNode; lead?: ReactNode
  tone?: 'red' | 'green'; align?: 'center' | 'start'
}) {
  return (
    <Reveal className={`vl-head vl-head--${align}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 id={id} className={`vl-title vl-title--${tone}`}>
        {line1} <em>{line2}</em>
      </h2>
      {lead && <p className="vl-lead">{lead}</p>}
    </Reveal>
  )
}

export function ArrowIcon() {
  return (
    <span className="vl-arrow" aria-hidden="true">
      <svg className="rtl-flip" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" focusable="false">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </span>
  )
}

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Smooth-scroll to an element, honouring reduced motion. */
export function scrollToEl(el: Element | null | undefined, reduced: boolean) {
  el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
