'use client'

import { useEffect, useState, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowIcon } from './shared'

/**
 * Mobile-only bottom CTA (CSS hides it from 768px). Appears once the hero is
 * scrolled past and hides again while the application form is on screen.
 * Leaves room on the inline-end side for the floating assistant button.
 */
export default function StickyMobileCta({ heroRef, formRef, onClick }: {
  heroRef: RefObject<HTMLElement | null>; formRef: RefObject<HTMLElement | null>; onClick: () => void
}) {
  const t = useTranslations('vendor.landing')
  const [heroVisible, setHeroVisible] = useState(true)
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    const hero = heroRef.current, form = formRef.current
    if (!hero || !form) return
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.target === hero) setHeroVisible(e.isIntersecting)
        if (e.target === form) setFormVisible(e.isIntersecting)
      })
    }, { threshold: 0, rootMargin: '0px 0px -30% 0px' })
    io.observe(hero); io.observe(form)
    return () => io.disconnect()
  }, [heroRef, formRef])

  const show = !heroVisible && !formVisible
  return (
    <div className={`vl-sticky${show ? ' is-shown' : ''}`} inert={!show}>
      <button type="button" className="vl-btn vl-btn--primary vl-sticky__btn" onClick={onClick}>
        <span aria-hidden="true">🏪</span>{t('sticky')}<ArrowIcon />
      </button>
    </div>
  )
}
