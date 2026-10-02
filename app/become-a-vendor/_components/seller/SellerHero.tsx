'use client'

import { forwardRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Crown, Flame, Leaf, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { PlanKey } from '@/lib/platformApi'
import StoreStage, { signText } from '../StoreStage'
import { ArrowIcon, CheckIcon, Eyebrow } from '../shared'

const PLAN_ICON = { free: Leaf, red: Flame, black: Crown } as const
const BURST_KEY = 'ct_vendor_vip_burst'
// 14 sparkles fanned around the badge (x, y in px, delay in s).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const r = 46 + (i % 3) * 16
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.75), d: (i % 4) * 0.05, gold: i % 3 !== 1 }
})

/** One sparkle burst per browser session for premium sellers (never under reduced motion). */
function SparkleBurst() {
  const reduced = useReducedMotion()
  const [show] = useState(() => { try { return !sessionStorage.getItem(BURST_KEY) } catch { return false } })
  useEffect(() => { try { sessionStorage.setItem(BURST_KEY, '1') } catch { /* private mode */ } }, [])
  if (!show || reduced) return null
  return (
    <span className="vl-burst" aria-hidden="true">
      {SPARKS.map((s, i) => (
        <i key={i} className={s.gold ? 'is-gold' : ''}
          style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, animationDelay: `${s.d + 0.5}s` } as React.CSSProperties} />
      ))}
    </span>
  )
}

interface SellerHeroProps {
  name: string | null
  shopName: string | null
  avatar: string | null
  sellerId: number | null
  planKey: PlanKey
  planName: string
  premium: boolean
  /** Basic sellers: secondary CTA scrolls to the upgrade section. */
  onSeePlans?: () => void
}

const SellerHero = forwardRef<HTMLElement, SellerHeroProps>(function SellerHero(
  { name, shopName, avatar, sellerId, planKey, planName, premium, onSeePlans }, ref) {
  const t = useTranslations('vendor.seller.hero')
  const firstName = name?.trim().split(/\s+/)[0] || null
  const PlanIcon = PLAN_ICON[planKey]
  const initials = (shopName ?? name ?? '?').trim().slice(0, 2).toUpperCase()

  return (
    <section ref={ref} className={`vl-hero vl-hero--seller${premium ? ' vl-hero--vip' : ''}`} aria-labelledby="vl-hero-title">
      <TunisianPattern color={premium ? '#b45309' : '#198f41'} className="vl-pattern vl-pattern--hero" />
      {premium && <span className="vl-vip-line" aria-hidden="true" />}
      <div className="vl-container vl-hero__grid">
        <div className="vl-hero__copy">
          <div className="vl-hero__in" style={{ '--i': 0 } as React.CSSProperties}>
            <Eyebrow tone={premium ? 'red' : 'green'}>{premium ? t('eyebrowPremium') : t('eyebrow')}</Eyebrow>
          </div>
          <h1 id="vl-hero-title" className={`vl-title ${premium ? 'vl-title--red' : 'vl-title--green'} vl-hero__title vl-hero__title--seller vl-hero__in`}
            style={{ '--i': 1 } as React.CSSProperties}>
            {t('title1')}<br /><em>{firstName ? t('title2', { name: firstName }) : t('title2Anon')}</em>
          </h1>
          <p className="vl-lead vl-hero__in" style={{ '--i': 2 } as React.CSSProperties}>
            {premium ? t('subtitlePremium') : t('subtitle')}
          </p>

          {/* shop identity card */}
          <div className="vl-shopcard vl-hero__in" style={{ '--i': 3 } as React.CSSProperties}>
            <span className="vl-shopcard__avatar">
              {avatar ? <img src={avatar} alt="" width={52} height={52} decoding="async" /> : <span aria-hidden="true">{initials}</span>}
            </span>
            <span className="vl-shopcard__body">
              <span className="vl-shopcard__name">{shopName ?? t('shopFallback')}</span>
              <span className="vl-shopcard__badges">
                {premium ? (
                  <span className="vl-badge-wrap">
                    <span className="vl-badge vl-badge--premium"><Crown size={12} aria-hidden="true" />{t('badgePremium')}</span>
                    <SparkleBurst />
                  </span>
                ) : (
                  <span className="vl-badge vl-badge--seller"><Store size={12} aria-hidden="true" />{t('badgeSeller')}</span>
                )}
                <span className={`vl-badge vl-badge--plan vl-badge--${planKey}`}><PlanIcon size={12} aria-hidden="true" />{planName}</span>
              </span>
            </span>
          </div>

          <div className="vl-hero__actions vl-hero__in" style={{ '--i': 4 } as React.CSSProperties}>
            <Link href="/seller" className="vl-btn vl-btn--primary">{t('dashboard')}<ArrowIcon /></Link>
            {premium || !onSeePlans ? (
              sellerId !== null && <Link href={`/sellers/${sellerId}`} className="vl-btn vl-btn--ghost">{t('shop')}</Link>
            ) : (
              <button type="button" className="vl-btn vl-btn--ghost" onClick={onSeePlans}>{t('seePlans')}</button>
            )}
          </div>
        </div>

        <StoreStage tone={premium ? 'gold' : 'green'} signLabel={signText(shopName)}>
          <span className="vl-chip vl-chip--verified">
            <span className="vl-chip__check"><CheckIcon size={11} /></span>
            {t('verified')}
          </span>
          <span className={`vl-chip vl-chip--plan vl-chip--${planKey}`}>
            <PlanIcon size={14} aria-hidden="true" />{planName}
          </span>
        </StoreStage>
      </div>
    </section>
  )
})

export default SellerHero
