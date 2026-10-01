'use client'

import { useEffect, useRef, useState, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import { useFormat } from '@/lib/i18n/useFormat'
import AnimatedStore from '@/app/components/home/illustrations/AnimatedStore'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { ArrowIcon, CheckIcon, Eyebrow, useParallax } from './shared'

// Illustrative demo orders for the animated shop scene (decorative, aria-hidden).
const DEMO_ORDERS = [
  { key: 'order1', emoji: '🏺', amount: 65 },
  { key: 'order2', emoji: '🧣', amount: 38 },
  { key: 'order3', emoji: '🫒', amount: 42 },
  { key: 'order4', emoji: '🌶️', amount: 18 },
] as const
const START_REVENUE = 1180
const CYCLE_MS = 3200

/** Number that eases from its previous value to the new one (transform-free text update). */
function TickingAmount({ value }: { value: number }) {
  const { price } = useFormat()
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    if (start === value) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700)
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value])
  return <span className="ltr-iso">{price(shown, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
}

function ShopScene() {
  const t  = useTranslations('vendor.landing.hero')
  const th = useTranslations('homeCta')
  const reduced = useReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 })
  const [tick, setTick] = useState(0)
  const artRef = useParallax<HTMLDivElement>(0.05)
  const pepRef = useParallax<HTMLDivElement>(-0.1)

  // A new order every few seconds while the scene is visible.
  useEffect(() => {
    if (!inView || reduced) return
    const id = window.setInterval(() => setTick(n => n + 1), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [inView, reduced])

  const order = DEMO_ORDERS[tick % DEMO_ORDERS.length]
  let revenue = START_REVENUE
  for (let i = 1; i <= tick; i++) revenue += DEMO_ORDERS[i % DEMO_ORDERS.length].amount
  const bars = [0.35, 0.5, 0.42, 0.68, 0.55, 0.8, 0.62 + (tick % 4) * 0.1]

  return (
    <div ref={ref} className={`vl-stage${inView ? ' is-live' : ''}`} aria-hidden="true">
      <div className="vl-stage__panel">
        <TunisianPattern color="#198f41" className="vl-pattern" />
      </div>

      <div ref={artRef} className="vl-stage__art">
        <AnimatedStore className="vl-stage__svg" signLabel={th('storeSign')} openLabel={th('storeOpen')} />
      </div>

      <div ref={pepRef} className="vl-stage__peppers">
        <AnimatedPepper color="red" size={40} rotate={-20} delay={-1} className="vl-pep vl-pep--1" />
        <AnimatedPepper color="green" size={26} rotate={35} delay={-3.4} className="vl-pep vl-pep--2" />
        <AnimatedPepper color="red" size={22} rotate={70} delay={-5} className="vl-pep vl-pep--3" />
      </div>

      <span className="vl-chip vl-chip--verified">
        <span className="vl-chip__check"><CheckIcon size={11} /></span>
        {th('chipVerified')}
      </span>

      <div className="vl-revenue">
        <div className="vl-revenue__label">{t('revenueLabel')}</div>
        <div className="vl-revenue__value"><TickingAmount value={revenue} /></div>
        <div className="vl-revenue__bars">
          {bars.map((h, i) => <i key={i} style={{ transform: `scaleY(${Math.min(h, 1)})` }} />)}
        </div>
      </div>

      {/* keyed so each order replays the pop-in */}
      <div key={tick} className="vl-toast">
        <span className="vl-toast__icon">{order.emoji}</span>
        <span className="vl-toast__text">
          <span className="vl-toast__title">{t('toastTitle')} <b className="vl-toast__amount ltr-iso">+{order.amount}</b></span>
          <span className="vl-toast__sub">{t(order.key)}</span>
        </span>
      </div>
    </div>
  )
}

interface VendorHeroProps {
  onPrimary: () => void
  onPlans: () => void
  /** Existing application: the primary CTA becomes "track my application". */
  hasApplication: boolean
}

const VendorHero = forwardRef<HTMLElement, VendorHeroProps>(function VendorHero({ onPrimary, onPlans, hasApplication }, ref) {
  const t = useTranslations('vendor.landing.hero')

  return (
    <section ref={ref} className="vl-hero" aria-labelledby="vl-hero-title">
      <TunisianPattern color="#db142e" className="vl-pattern vl-pattern--hero" />
      <div className="vl-container vl-hero__grid">
        <div className="vl-hero__copy">
          <div className="vl-hero__in" style={{ '--i': 0 } as React.CSSProperties}>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
          </div>
          <h1 id="vl-hero-title" className="vl-title vl-title--red vl-hero__title vl-hero__in" style={{ '--i': 1 } as React.CSSProperties}>
            {t('title1')}<br /><em>{t('title2')}</em>
          </h1>
          <p className="vl-lead vl-hero__in" style={{ '--i': 2 } as React.CSSProperties}>{t('subtitle')}</p>
          <div className="vl-hero__actions vl-hero__in" style={{ '--i': 3 } as React.CSSProperties}>
            <button type="button" className="vl-btn vl-btn--primary" onClick={onPrimary}>
              {hasApplication ? t('ctaStatus') : t('ctaPrimary')}
              <ArrowIcon />
            </button>
            <button type="button" className="vl-btn vl-btn--ghost" onClick={onPlans}>
              {t('ctaSecondary')}
            </button>
          </div>
          <ul className="vl-hero__trust vl-hero__in" style={{ '--i': 4 } as React.CSSProperties}>
            {(['trust1', 'trust2', 'trust3'] as const).map(k => (
              <li key={k}><span className="vl-hero__tick"><CheckIcon size={10} /></span>{t(k)}</li>
            ))}
          </ul>
        </div>
        <ShopScene />
      </div>
    </section>
  )
})

export default VendorHero
