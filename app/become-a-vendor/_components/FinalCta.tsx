'use client'

import { useRef, type PointerEvent as RPointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { ArrowIcon, useParallax } from './shared'

/** Button that leans towards a fine pointer while it hovers nearby (transform only). */
function MagneticButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const zone = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !zone.current || !btn.current) return
    const r = zone.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    btn.current.style.transform = `translate3d(${(x * 0.22).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px, 0)`
  }
  const reset = () => { if (btn.current) btn.current.style.transform = '' }
  return (
    <div ref={zone} className="vl-magnet" onPointerMove={move} onPointerLeave={reset}>
      <button ref={btn} type="button" className="vl-btn vl-btn--white vl-btn--lg" onClick={onClick}>
        {children}
      </button>
    </div>
  )
}

export default function FinalCta({ onClick }: { onClick: () => void }) {
  const t = useTranslations('vendor.landing.final')
  const { ref, seen, inView } = useInView<HTMLElement>({ threshold: 0.25 })
  const pepA = useParallax<HTMLDivElement>(0.12)
  const pepB = useParallax<HTMLDivElement>(-0.08)

  return (
    <section ref={ref} className={`vl-final-wrap${inView ? ' is-live' : ''}`} aria-labelledby="vl-final-title">
      <div className="vl-container">
        <div className={`vl-final vl-reveal${seen ? ' is-in' : ''}`}>
          <TunisianPattern color="#ffffff" className="vl-pattern vl-pattern--final" />
          <div ref={pepA} className="vl-final__peps" aria-hidden="true">
            <AnimatedPepper color="green" size={46} rotate={-25} delay={-1.5} className="vl-pep vl-pep--f1" />
            <AnimatedPepper color="green" size={24} rotate={50} delay={-4} className="vl-pep vl-pep--f2" />
          </div>
          <div ref={pepB} className="vl-final__peps" aria-hidden="true">
            <AnimatedPepper color="red" size={34} rotate={20} delay={-2.6} className="vl-pep vl-pep--f3" />
            <AnimatedPepper color="green" size={30} rotate={-60} delay={-3.3} className="vl-pep vl-pep--f4" />
          </div>
          <h2 id="vl-final-title" className="vl-title vl-final__title">
            {t('title1')}<br /><em>{t('title2')}</em>
          </h2>
          <p className="vl-final__sub">{t('subtitle')}</p>
          <MagneticButton onClick={onClick}>{t('cta')}<ArrowIcon /></MagneticButton>
        </div>
      </div>
    </section>
  )
}
