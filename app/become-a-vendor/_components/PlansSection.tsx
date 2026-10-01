'use client'

import { forwardRef, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Check, X, Package, Percent } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCommission, type PlanKey, type SellerPlans, type SellerPlanInfo } from '@/lib/platformApi'
import { ArrowIcon, PLAN_ORDER, PLAN_STYLES, Reveal, SectionHeading, usePlanPrice } from './shared'

// Feature flags exposed by /api/seller-plans (subscription_plans.features), in display order.
const FEATURE_ORDER = ['promotions', 'coupons', 'sponsorships', 'analytics', 'ai_tools', 'black_hub'] as const

function PlanCard({ planKey, plan, index, onSelect }: {
  planKey: PlanKey; plan: SellerPlanInfo | undefined; index: number; onSelect: (k: PlanKey) => void
}) {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing.plans')
  const priceOf = usePlanPrice()
  const style = PLAN_STYLES[planKey]
  const { Icon } = style
  const ref = useRef<HTMLElement>(null)
  const [pressed, setPressed] = useState(false)
  const locked = planKey !== 'free'
  const titleId = `vl-plan-${planKey}`

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
        className={`vl-plan vl-plan--${style.key}${style.popular ? ' vl-plan--popular' : ''}${style.dark ? ' vl-plan--dark' : ''}${pressed ? ' is-pressed' : ''}`}
        style={{ '--accent': style.accent } as React.CSSProperties}
        onPointerMove={track}
        onPointerDown={e => { track(e); if (e.pointerType === 'touch') setPressed(true) }}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={() => onSelect(planKey)}
      >
        {style.popular && <span className="vl-plan__ring" aria-hidden="true" />}
        <div className="vl-plan__inner">
          <span className="vl-plan__spot" aria-hidden="true" />
          <span className="vl-plan__shine" aria-hidden="true" />
          {style.popular && <span className="vl-plan__ribbon">{tl('popular')}</span>}

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

          <button type="button" className="vl-plan__cta"
            onClick={e => { e.stopPropagation(); onSelect(planKey) }}>
            {t(`plans.${style.key}.cta`)}
            <ArrowIcon />
          </button>
          <p className="vl-plan__hint">{locked ? tl('afterApproval') : tl('noCard')}</p>
        </div>
      </article>
    </Reveal>
  )
}

interface PlansSectionProps {
  plans: SellerPlans | null
  onSelect: (key: PlanKey) => void
}

const PlansSection = forwardRef<HTMLElement, PlansSectionProps>(function PlansSection({ plans, onSelect }, ref) {
  const tl = useTranslations('vendor.landing.plans')
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // API order (by tier) when loaded; known keys only, since styling is per plan.
  const keys: PlanKey[] = plans
    ? (Object.values(plans).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0)).map(p => p.key).filter(k => k in PLAN_STYLES))
    : PLAN_ORDER

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
    const t = track.getBoundingClientRect(), s = slot.getBoundingClientRect()
    track.scrollBy({ left: s.left + s.width / 2 - (t.left + t.width / 2), behavior: 'smooth' })
  }

  return (
    <section ref={ref} id="plans" className="vl-section vl-plans-section" aria-labelledby="vl-plans-title">
      <div className="vl-container">
        <SectionHeading id="vl-plans-title" eyebrow={tl('eyebrow')} line1={tl('title1')} line2={tl('title2')} lead={tl('subtitle')} />

        <ul ref={trackRef} className="vl-plans" aria-busy={!plans}>
          {keys.map((k, i) => (
            <PlanCard key={k} planKey={k} plan={plans?.[k]} index={i} onSelect={onSelect} />
          ))}
        </ul>

        <div className="vl-dots" role="group" aria-label={tl('dotsLabel')}>
          {keys.map((k, i) => (
            <button key={k} type="button" className={`vl-dot${active === i ? ' is-active' : ''}`}
              aria-label={plans?.[k]?.name ?? tl('dot', { n: i + 1 })} aria-current={active === i}
              onClick={() => goTo(i)} />
          ))}
        </div>

        <Reveal className="vl-plans-note">
          <span aria-hidden="true">🌶️</span> {tl('note')}
        </Reveal>
      </div>
    </section>
  )
})

export default PlansSection
