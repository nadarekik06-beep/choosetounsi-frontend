'use client'

import { forwardRef, useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { Check, X, Percent, CheckCircle2, Package, Image as ImageIcon, Megaphone, RefreshCw, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCommission, planList, type PlanLimit, type SellerPlans, type SellerPlanInfo } from '@/lib/platformApi'
import { ArrowIcon, Reveal, SectionHeading, planStyleOf, usePlanPrice } from './shared'
import { PLAN_ICONS } from './planIcons'

const LIMIT_ICON: Record<PlanLimit['key'], LucideIcon> = {
  max_products: Package, max_images_per_product: ImageIcon, max_sponsored_products: Megaphone,
}

interface CardOptions {
  /** Glowing border + ribbon. */
  highlighted: boolean
  ribbon: string
  /** The seller's own plan: muted, no CTA. */
  current: boolean
  ctaLabel: string
  hint: string
}

/** One ✓ / ✗ line. Excluded items stay visible, muted, for comparison. */
function FeatureLine({ included, label, description, title, Icon, highlight = false }: {
  included: boolean; label: string; description?: string | null; title?: string | null; Icon?: LucideIcon; highlight?: boolean
}) {
  const tl = useTranslations('vendor.landing.plans')
  return (
    <li className={`${included ? '' : 'is-off'}${highlight ? ' is-highlight' : ''}`} title={title ?? undefined}>
      <span className="vl-plan__tick">{included ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}</span>
      <span className="vl-plan__ftext">
        <span className="vl-plan__flabel">
          {Icon && <Icon size={14} className="vl-plan__ficon" aria-hidden="true" />}
          {label}
        </span>
        {description && <span className="vl-plan__fdesc">{description}</span>}
      </span>
      {!included && <span className="sr-only">{tl('notIncluded')}</span>}
    </li>
  )
}

/**
 * A pricing card, rendered only from GET /api/seller-plans: limits first,
 * then capabilities, then the admin's display features.
 */
function PlanCard({ plan, index, onSelect, opts }: {
  plan: SellerPlanInfo; index: number; onSelect: (slug: string) => void; opts: CardOptions
}) {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing.plans')
  const priceOf = usePlanPrice()
  const style = planStyleOf(plan)
  const { Icon } = style
  const ref = useRef<HTMLElement>(null)
  const [pressed, setPressed] = useState(false)
  const titleId = `vl-plan-${plan.key}`
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
        onClick={current ? undefined : () => onSelect(plan.key)}
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
              <h3 id={titleId} className="vl-plan__name">{plan.name}</h3>
              {plan.tagline && <p className="vl-plan__target">{plan.tagline}</p>}
            </div>
          </header>

          <div className="vl-plan__price">
            <span className="vl-plan__amount ltr-iso">{priceOf(plan)}</span>
            <span className="vl-plan__per">/{plan.price === 0 ? t('forever') : t('perMonthShort')}</span>
          </div>

          <div className="vl-plan__meta">
            <span className="vl-plan__pill"><Percent size={13} aria-hidden="true" />{t('commission', { rate: formatCommission(plan) })}</span>
          </div>

          <ul className="vl-plan__features">
            {(plan.limits ?? []).map(l => (
              <FeatureLine key={`l-${l.key}`} included label={l.label} Icon={LIMIT_ICON[l.key]} />
            ))}
            {(plan.capabilities ?? []).map(c => (
              <FeatureLine key={`c-${c.key}`} included={c.included} label={c.label} title={c.description} />
            ))}
            {(plan.display_features ?? []).map((f, i) => (
              <FeatureLine key={`d-${i}`} included={f.included} highlight={f.highlight} label={f.label}
                description={f.description} Icon={f.icon ? PLAN_ICONS[f.icon] : undefined} />
            ))}
          </ul>

          {current ? (
            <div className="vl-plan__cta vl-plan__cta--current" aria-hidden="true">
              <CheckCircle2 size={16} />{tl('currentActive')}
            </div>
          ) : (
            <button type="button" className="vl-plan__cta"
              onClick={e => { e.stopPropagation(); onSelect(plan.key) }}>
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

/** Card-shaped placeholder while /api/seller-plans loads. */
function PlanSkeleton() {
  return (
    <li className="vl-plan-slot" aria-hidden="true">
      <div className="vl-plan vl-plan--skeleton">
        <div className="vl-plan__inner">
          <i className="vl-plan-skel vl-plan-skel--head" />
          <i className="vl-plan-skel vl-plan-skel--price" />
          {[0, 1, 2, 3, 4, 5].map(i => <i key={i} className="vl-plan-skel vl-plan-skel--line" />)}
          <i className="vl-plan-skel vl-plan-skel--cta" />
        </div>
      </div>
    </li>
  )
}

interface PlansSectionProps {
  plans: SellerPlans | null
  /** The request failed: show a fallback message instead of cards. */
  failed?: boolean
  onRetry?: () => void
  onSelect: (slug: string) => void
  /** Seller's current plan slug (seller variants): shown muted with "your current plan". */
  current?: string
  /** Plan that gets the glow + ribbon (default: the plan the admin marked as recommended). */
  highlight?: string
  ribbon?: string
  heading?: { eyebrow: ReactNode; line1: ReactNode; line2: ReactNode; lead?: ReactNode }
  /** Footer pill under the cards; `null` hides it. */
  note?: ReactNode | null
  ctaLabel?: (plan: SellerPlanInfo) => string
  hint?: (plan: SellerPlanInfo) => string
}

const PlansSection = forwardRef<HTMLElement, PlansSectionProps>(function PlansSection(
  { plans, failed = false, onRetry, onSelect, current, highlight, ribbon, heading, note, ctaLabel, hint }, ref) {
  const tl = useTranslations('vendor.landing.plans')
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  const list = planList(plans)
  const keys = list.map(p => p.key)
  const highlighted = highlight ?? list.find(p => p.is_recommended)?.key
  const loading = !plans && !failed

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
    const i = highlighted ? keys.indexOf(highlighted) : -1
    if (i < 0 || !track) return
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
  }, [highlighted, keys.length])

  const h = heading ?? { eyebrow: tl('eyebrow'), line1: tl('title1'), line2: tl('title2'), lead: tl('subtitle') }

  return (
    <section ref={ref} id="plans" className="vl-section vl-plans-section" aria-labelledby="vl-plans-title">
      <div className="vl-container">
        <SectionHeading id="vl-plans-title" eyebrow={h.eyebrow} line1={h.line1} line2={h.line2} lead={h.lead} />

        {failed && !plans ? (
          <div className="vl-plans-state" role="alert">
            <p>{tl('loadError')}</p>
            {onRetry && (
              <button type="button" className="vl-btn vl-btn--ghost" onClick={onRetry}>
                <RefreshCw size={15} aria-hidden="true" />{tl('retry')}
              </button>
            )}
          </div>
        ) : plans && list.length === 0 ? (
          <div className="vl-plans-state" role="status"><p>{tl('empty')}</p></div>
        ) : (
          <>
            <ul ref={trackRef} className="vl-plans" aria-busy={loading} aria-label={loading ? tl('loading') : undefined}>
              {loading
                ? [0, 1, 2].map(i => <PlanSkeleton key={i} />)
                : list.map((p, i) => (
                  <PlanCard key={p.key} plan={p} index={i} onSelect={onSelect} opts={{
                    highlighted: p.key === highlighted,
                    ribbon: ribbon ?? tl('popular'),
                    current: p.key === current,
                    ctaLabel: ctaLabel ? ctaLabel(p) : (p.price === 0 ? tl('ctaFree') : tl('ctaChoose', { plan: p.name })),
                    hint: hint ? hint(p) : (p.price === 0 ? tl('noCard') : tl('afterApproval')),
                  }} />
                ))}
            </ul>

            {!loading && (
              <div className="vl-dots" role="group" aria-label={tl('dotsLabel')}>
                {list.map((p, i) => (
                  <button key={p.key} type="button" className={`vl-dot${active === i ? ' is-active' : ''}`}
                    aria-label={p.name || tl('dot', { n: i + 1 })} aria-current={active === i}
                    onClick={() => goTo(i)} />
                ))}
              </div>
            )}
          </>
        )}

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
