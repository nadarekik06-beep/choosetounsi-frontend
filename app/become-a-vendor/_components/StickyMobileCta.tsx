'use client'

import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { ArrowIcon } from './shared'

/**
 * Mobile-only bottom CTA (CSS hides it from 768px). Appears once the hero is
 * scrolled past and hides again while `hideRef` (the form / plans) is on screen.
 * Leaves room on the inline-end side for the floating assistant button.
 */
export default function StickyMobileCta({ heroRef, hideRef, label, icon, onClick, href }: {
  heroRef: RefObject<HTMLElement | null>
  hideRef?: RefObject<HTMLElement | null>
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
}) {
  const [heroVisible, setHeroVisible] = useState(true)
  const [hideVisible, setHideVisible] = useState(false)

  useEffect(() => {
    const hero = heroRef.current, hide = hideRef?.current
    if (!hero) return
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.target === hero) setHeroVisible(e.isIntersecting)
        if (e.target === hide) setHideVisible(e.isIntersecting)
      })
    }, { threshold: 0, rootMargin: '0px 0px -30% 0px' })
    io.observe(hero)
    if (hide) io.observe(hide)
    return () => io.disconnect()
  }, [heroRef, hideRef])

  const show = !heroVisible && !hideVisible
  const content = <>{icon && <span aria-hidden="true">{icon}</span>}{label}<ArrowIcon /></>
  return (
    <div className={`vl-sticky${show ? ' is-shown' : ''}`} inert={!show}>
      {href
        ? <Link href={href} className="vl-btn vl-btn--primary vl-sticky__btn">{content}</Link>
        : <button type="button" className="vl-btn vl-btn--primary vl-sticky__btn" onClick={onClick}>{content}</button>}
    </div>
  )
}
