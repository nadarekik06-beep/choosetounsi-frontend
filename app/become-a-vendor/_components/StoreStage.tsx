'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import AnimatedStore from '@/app/components/home/illustrations/AnimatedStore'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { useParallax } from './shared'

/**
 * The illustrated shop scene shared by every hero (client, pending, seller):
 * mint panel + khatem pattern + animated storefront + floating chilis, with
 * light parallax. Loops pause while off-screen. Overlays (chips, toasts) are
 * passed as children; a function child receives whether the scene is visible.
 */
export default function StoreStage({ signLabel, tone = 'green', className = '', children }: {
  signLabel?: string
  tone?: 'green' | 'gold' | 'red'
  className?: string
  children?: ReactNode | ((live: boolean) => ReactNode)
}) {
  const th = useTranslations('homeCta')
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 })
  const artRef = useParallax<HTMLDivElement>(0.05)
  const pepRef = useParallax<HTMLDivElement>(-0.1)

  return (
    <div ref={ref} className={`vl-stage vl-stage--${tone}${inView ? ' is-live' : ''} ${className}`} aria-hidden="true">
      <div className="vl-stage__panel">
        <TunisianPattern color={tone === 'gold' ? '#b45309' : tone === 'red' ? '#db142e' : '#198f41'} className="vl-pattern" />
      </div>

      <div ref={artRef} className="vl-stage__art">
        <AnimatedStore className="vl-stage__svg" signLabel={signLabel ?? th('storeSign')} openLabel={th('storeOpen')} />
      </div>

      <div ref={pepRef} className="vl-stage__peppers">
        <AnimatedPepper color="red" size={40} rotate={-20} delay={-1} className="vl-pep vl-pep--1" />
        <AnimatedPepper color="green" size={26} rotate={35} delay={-3.4} className="vl-pep vl-pep--2" />
        <AnimatedPepper color="red" size={22} rotate={70} delay={-5} className="vl-pep vl-pep--3" />
      </div>

      {typeof children === 'function' ? children(inView) : children}
    </div>
  )
}

/** Shop names are free text: keep the swinging sign readable. */
export function signText(name: string | null | undefined, max = 13): string | undefined {
  const n = name?.trim()
  if (!n) return undefined
  return n.length > max ? `${n.slice(0, max - 1)}…` : n
}
