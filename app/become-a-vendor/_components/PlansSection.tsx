'use client'

import { forwardRef, useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { Check, X, Package, Percent, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCommission, type PlanKey, type SellerPlans, type SellerPlanInfo } from '@/lib/platformApi'
import { ArrowIcon, PLAN_ORDER, PLAN_STYLES, Reveal, SectionHeading, usePlanPrice } from './shared'

// Feature flags exposed by /api/seller-plans (subscription_plans.features), in display order.
export const FEATURE_ORDER = ['promotions', 'coupons', 'sponsorships', 'analytics', 'ai_tools', 'black_hub'] as const

interface CardOptions {
  /** Glowing border + ribbon. */
  highlighted: boolean
  ribbon: string
  /** The seller's own plan: muted, no CTA. */
  current: boolean
  ctaLabel: string
  hint: string
}

function PlanCard({ planKey, plan, index, onSelect, opts }: {
  planKey: PlanKey; plan: SellerPlanInfo | undefined; index: number; onSelect: (k: PlanKey) => void; opts: CardOptions
}) {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing.plans')
  const priceOf = usePlanPrice()
  const style = PLAN_STYLES[planKey]
  const { Icon } = style
  const ref = useRef<HTMLElement>(null)
  const [pressed, setPressed] = useState(false)
  const titleId = `vl-plan-${planKey}`
  const { highlighted, current } = opts

  const track = (e: RPointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`)
    el.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`)
  }

  return (
    <Reveal as="li" index={index} threshold={0.15} className="vl-plan-slot" data-index={index}>
      <article
        ref={ref}
        aria-labelledby={titleId}
        aria-current={current || undefined}
        className={`vl-plan vl-plan--${style.key}${highlighted ? ' vl-plan--popular' : ''}${style.dark ? ' vl-plan--dark' : ''}${current ? ' vl-plan--current' : ''}${pressed ? ' is-pressed' : ''}`}
        style={{ '--accent': style.accent } as React.CSSProperties}
        onPointerMove={track}
        onPointerDown={e => { track(e); if (e.pointerType === 'touch') setPressed(true) }}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={current ? undefined : () => onSelect(planKey)}
      >
        {highlighted && <span className="vl-plan__ring" aria-hidden="true" />}
        <div className="vl-plan__inner">
          <span className="vl-plan__spot" aria-hidden="true" />
          <span className="vl-plan__shine" aria-hidden="true" />
          {/* Short labels fit the diagonal corner ribbon; longer ones become a top banner. */}
          {highlighted && (
            <span className={`vl-plan__ribbon${opts.ribbon.length > 12 ? ' vl-plan__banner' : ''}`}>{opts.ribbon}</span>
          )}
          {current && <span className="vl-plan__banner vl-plan__banner--current"><CheckCircle2 size={13} aria-hidden="true" />{tl('currentCta')}</span>}

          <header className="vl-plan__head">
            <span className="vl-plan__icon"><Icon size={22} aria-hidden="true" /></span>
            <div>
              <h3 id={titleId} className="vl-plan__name">{plan?.name ?? '…'}</h3>
              <p className="vl-plan__target">{t(`plans.${style.key}.target`)}</p>
            </div>
          </header>

          <div className="vl-plan__price">
            <span className="vl-plan__amount ltr-iso">{priceOf(plan)}</span>
            {plan && <span className="vl-plan__per">/{plan.price === 0 ? t('forever') : t('perMonthShort')}</span>}
          </div>

          <div className="vl-plan__meta">
            <span className="vl-plan__pill"><Percent size={13} aria-hidden="true" />{t('commission', { rate: formatCommission(plan) })}</span>
            <span className="vl-plan__products">
              <Package size={14} aria-hidden="true" />
              {!plan ? '…' : plan.max_products === null ? t('unlimitedProducts') : t('maxProducts', { count: plan.max_products })}
            </span>
          </div>

          {plan?.features && (
            <ul className="vl-plan__features">
              {FEATURE_ORDER.filter(f => f in plan.features!).map(f => {
                const ok = !!plan.features![f]
                return (
                  <li key={f} className={ok ? '' : 'is-off'}>
                    <span className="vl-plan__tick">{ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}</span>
                    <span>{tl(`features.${f}`)}</span>
                    {!ok && <span className="sr-only">{tl('notIncluded')}</span>}
                  </li>
                )
              })}
            </ul>
          )}

          {current ? (
            <div className="vl-plan__cta vl-plan__cta--current" aria-hidden="true">
              <CheckCircle2 size={16} />{tl('currentActive')}
            </div>
          ) : (
            <button type="button" className="vl-plan__cta"
              onClick={e => { e.stopPropagation(); onSelect(planKey) }}>
              {opts.ctaLabel}
              <ArrowIcon />
            </button>
          )}
          <p className="vl-plan__hint">{opts.hint}</p>
        </div>
      </article>
    </Reveal>
  )
}

interface PlansSectionProps {
  plans: SellerPlans | null
  onSelect: (key: PlanKey) => void
  /** Seller's current plan (seller variants): shown muted with "your current plan". */
  current?: PlanKey
  /** Plan that gets the glow + ribbon (default: the brand's popular plan). */
  highlight?: PlanKey
  ribbon?: string
  heading?: { eyebrow: ReactNode; line1: ReactNode; line2: ReactNode; lead?: ReactNode }
  /** Footer pill under the cards; `null` hides it. */
  note?: ReactNode | null
  ctaLabel?: (key: PlanKey, plan: SellerPlanInfo | undefined) => string
  hint?: (key: PlanKey) => string
}

const PlansSection = forwardRef<HTMLElement, PlansSectionProps>(function PlansSection(
  { plans, onSelect, current, highlight, ribbon, heading, note, ctaLabel, hint }, ref) {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing.plans')
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // API order (by tier) when loaded; known keys only, since styling is per plan.
  const keys: PlanKey[] = plans
    ? (Object.values(plans).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0)).map(p => p.key).filter(k => k in PLAN_STYLES))
    : PLAN_ORDER
  const highlighted = highlight ?? keys.find(k => PLAN_STYLES[k].popular)

  // Mobile carousel: the card closest to the track's centre drives the pagination dots.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const update = () => {
      raf = 0
      const mid = track.getBoundingClientRect().left + track.clientWidth / 2
      let best = 0, bestDist = Infinity
      track.querySelectorAll<HTMLElement>('.vl-plan-slot').forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - mid)
        if (d < bestDist) { bestDist = d; best = i }
      })
      setActive(best)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => { track.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [keys.length])

  const goTo = (i: number) => {
    const track = trackRef.current
    const slot = track?.querySelectorAll<HTMLElement>('.vl-plan-slot')[i]
    if (!track || !slot) return
    // Visual distance to centre: scrollBy handles LTR and RTL alike.
    const tr = track.getBoundingClientRect(), s = slot.getBoundingClientRect()
    track.scrollBy({ left: s.left + s.width / 2 - (tr.left + tr.width / 2), behavior: 'smooth' })
  }

  // On phones, open the carousel on the highlighted plan: done once, when the
  // track first comes into view (layout is settled then), instant, no page scroll.
  useEffect(() => {
    const track = trackRef.current
    if (!highlight || !track) return
    const i = keys.indexOf(highlight)
    const io = new IntersectionObserver(([entry]) => {
      const slot = track.querySelectorAll<HTMLElement>('.vl-plan-slot')[i]
      if (!entry.isIntersecting || !slot || track.scrollWidth <= track.clientWidth + 1) return
      const tr = track.getBoundingClientRect(), s = slot.getBoundingClientRect()
      track.scrollBy({ left: s.left + s.width / 2 - (tr.left + tr.width / 2) })
      setActive(i)
      io.disconnect()
    }, { threshold: 0 })
    io.observe(track)
    return () => io.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, keys.length])

  const h = heading ?? { eyebrow: tl('eyebrow'), line1: tl('title1'), line2: tl('title2'), lead: tl('subtitle') }

  return (
    <section ref={ref} id="plans" className="vl-section vl-plans-section" aria-labelledby="vl-plans-title">
      <div className="vl-container">
        <SectionHeading id="vl-plans-title" eyebrow={h.eyebrow} line1={h.line1} line2={h.line2} lead={h.lead} />

        <ul ref={trackRef} className="vl-plans" aria-busy={!plans}>
          {keys.map((k, i) => (
            <PlanCard key={k} planKey={k} plan={plans?.[k]} index={i} onSelect={onSelect} opts={{
              highlighted: k === highlighted,
              ribbon: ribbon ?? tl('popular'),
              current: k === current,
              ctaLabel: ctaLabel ? ctaLabel(k, plans?.[k]) : t(`plans.${PLAN_STYLES[k].key}.cta`),
              hint: hint ? hint(k) : (k !== 'free' ? tl('afterApproval') : tl('noCard')),
            }} />
          ))}
        </ul>

        <div className="vl-dots" role="group" aria-label={tl('dotsLabel')}>
          {keys.map((k, i) => (
            <button key={k} type="button" className={`vl-dot${active === i ? ' is-active' : ''}`}
              aria-label={plans?.[k]?.name ?? tl('dot', { n: i + 1 })} aria-current={active === i}
              onClick={() => goTo(i)} />
          ))}
        </div>

        {note !== null && (
          <Reveal className="vl-plans-note">
            {note ?? <><span aria-hidden="true">🌶️</span> {tl('note')}</>}
          </Reveal>
        )}
      </div>
    </section>
  )
})

export default PlansSection
