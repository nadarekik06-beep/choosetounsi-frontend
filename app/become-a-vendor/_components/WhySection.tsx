'use client'

import { useRef, type PointerEvent as RPointerEvent } from 'react'
import { Eye, Sparkles, Truck, ShieldCheck, BadgeCheck, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AnimatedDiscoverBag from '@/app/components/home/illustrations/AnimatedDiscoverBag'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { Reveal, SectionHeading } from './shared'

const BENEFITS: { key: string; Icon: LucideIcon; tone: 'red' | 'green' | 'gold' }[] = [
  { key: 'visibility', Icon: Eye,         tone: 'red'   },
  { key: 'ai',         Icon: Sparkles,    tone: 'gold'  },
  { key: 'delivery',   Icon: Truck,       tone: 'green' },
  { key: 'payments',   Icon: ShieldCheck, tone: 'green' },
  { key: 'verified',   Icon: BadgeCheck,  tone: 'red'   },
]

/** Subtle 3D tilt that follows a fine pointer (mouse/pen). Touch gets the :active lift instead. */
function TiltCard({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`)
    ref.current.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`)
  }
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return <div ref={ref} className={className} onPointerMove={onMove} onPointerLeave={onLeave}>{children}</div>
}

export default function WhySection() {
  const t = useTranslations('vendor.landing.why')

  return (
    <section className="vl-section" aria-labelledby="vl-why-title">
      <div className="vl-container">
        <SectionHeading id="vl-why-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />

        <ul className="vl-bento">
          {BENEFITS.map(({ key, Icon, tone }, i) => {
            const feature = i === 0
            return (
              <Reveal as="li" key={key} index={i} className={feature ? 'vl-bento__feature' : ''}>
                <TiltCard className={`vl-card${feature ? ' vl-card--feature' : ''}`}>
                  {feature && (
                    <>
                      <TunisianPattern color="#db142e" className="vl-pattern" />
                      <div className="vl-card__art" aria-hidden="true">
                        <AnimatedDiscoverBag className="vl-card__bag" />
                        <AnimatedPepper color="green" size={26} rotate={30} delay={-2} className="vl-pep vl-pep--card" />
                      </div>
                      <span className="vl-card__pill" aria-hidden="true">📍 {t('visibility.pill')}</span>
                    </>
                  )}
                  <div className="vl-card__body">
                    <span className={`vl-card__icon vl-tone--${tone}`}><Icon size={20} aria-hidden="true" /></span>
                    <h3 className="vl-card__title">{t(`${key}.title`)}</h3>
                    <p className="vl-card__desc">{t(`${key}.desc`)}</p>
                  </div>
                </TiltCard>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
