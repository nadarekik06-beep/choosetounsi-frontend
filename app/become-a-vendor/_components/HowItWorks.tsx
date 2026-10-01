'use client'

import { useEffect, useRef, useState } from 'react'
import { ClipboardEdit, Store, ShoppingBag, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import { Reveal, SectionHeading } from './shared'

const STEPS: { key: 's1' | 's2' | 's3'; Icon: LucideIcon }[] = [
  { key: 's1', Icon: ClipboardEdit },
  { key: 's2', Icon: Store },
  { key: 's3', Icon: ShoppingBag },
]

/**
 * Three steps on a line that draws itself with scroll progress.
 * The fill is a scaleX/scaleY transform (set as --p), never width/height.
 */
export default function HowItWorks() {
  const t = useTranslations('vendor.landing.how')
  const reduced = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [progressStep, setActive] = useState(0)
  const active = reduced ? STEPS.length : progressStep

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    if (reduced) { el.style.setProperty('--p', '1'); return }
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 when the track's top hits 85% of the viewport, 1 when its bottom reaches 55%.
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)))
      el.style.setProperty('--p', p.toFixed(3))
      setActive(p >= 0.98 ? 3 : p >= 0.5 ? 2 : p > 0.02 ? 1 : 0)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <section className="vl-section vl-section--tint" aria-labelledby="vl-how-title">
      <div className="vl-container">
        <SectionHeading id="vl-how-title" tone="green" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />

        <div ref={trackRef} className="vl-steps-wrap">
        <div className="vl-steps__line" aria-hidden="true"><span className="vl-steps__fill" /></div>
        <ol className="vl-steps">
          {STEPS.map(({ key, Icon }, i) => (
            <Reveal as="li" key={key} index={i} className={`vl-step${active > i ? ' is-on' : ''}`}>
              <span className="vl-step__dot">
                <Icon size={24} aria-hidden="true" />
                <span className="vl-step__num" aria-hidden="true">{i + 1}</span>
              </span>
              <div className="vl-step__text">
                <h3 className="vl-step__title">{t(`${key}.title`)}</h3>
                <p className="vl-step__desc">{t(`${key}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  )
}
