'use client'

import { useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { PepperTier, ShopSeller } from '@/lib/shopPageApi'
import { ArrowIcon, PepperGlyph, Rail, Reveal, SectionHead, TIERS, TierBadge } from './primitives'

function SellerCard({ s, index }: { s: ShopSeller; index: number }) {
  const t = useTranslations('shopPage.sellers')
  const { number } = useFormat()
  const initials = s.business_name.trim().slice(0, 2).toUpperCase()
  return (
    <Reveal index={index} role="listitem" style={{ height: '100%' }}>
      <Link href={`/sellers/${s.id}`} className={`sp-seller sp-seller--${s.plan}`}>
        <span className="sp-seller__spot" aria-hidden="true" />
        <div className="sp-seller__cover">
          {s.cover && <Image src={s.cover} unoptimized={isLocalImage(s.cover)} alt="" fill sizes="290px" />}
          <TierBadge tier={s.plan} className="sp-seller__tier" />
        </div>
        <div className="sp-seller__avatar">
          {s.avatar ? <Image src={s.avatar} unoptimized={isLocalImage(s.avatar)} alt="" fill sizes="64px" /> : <span aria-hidden="true">{initials}</span>}
        </div>
        <div className="sp-seller__body">
          <h3 className="sp-seller__name">{s.business_name}</h3>
          {s.wilaya && <p className="sp-seller__where">{s.wilaya}</p>}
          <ul className="sp-seller__stats">
            <li className="sp-seller__stat">
              <b className="ltr-iso">{s.rating != null ? `${number(s.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}★` : '—'}</b>
              <span>{s.rating != null ? t('reviews', { count: s.reviews }) : t('newShop')}</span>
            </li>
            <li className="sp-seller__stat">
              <b className="ltr-iso">{number(s.products_count)}</b>
              <span>{t('productsLabel', { count: s.products_count })}</span>
            </li>
            <li className="sp-seller__stat">
              <b className="ltr-iso">{number(s.followers)}</b>
              <span>{t('followersLabel', { count: s.followers })}</span>
            </li>
          </ul>
          <span className="sp-seller__visit">{t('visit')}<ArrowIcon size={13} /></span>
        </div>
      </Link>
    </Reveal>
  )
}

/** Approved shops grouped by pepper tier, Black first. Empty tiers have no tab. */
export default function PepperSellers({ sellers }: { sellers: ShopSeller[] | null }) {
  const t = useTranslations('shopPage.sellers')
  const tiers = TIERS.filter(tier => sellers?.some(s => s.plan === tier))
  const [active, setActive] = useState<PepperTier | null>(null)
  const current = active && tiers.includes(active) ? active : tiers[0]

  if (!sellers || sellers.length === 0 || !current) return null
  const list = sellers.filter(s => s.plan === current)

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1
    const next = tiers[(tiers.indexOf(current) + step + tiers.length) % tiers.length]
    setActive(next)
    e.currentTarget.querySelector<HTMLButtonElement>(`#sp-tier-${next}`)?.focus()
  }

  return (
    <section className="sp-section sp-sellers sp-dark" aria-labelledby="sp-sellers-title">
      <TunisianPattern color="#f59e0b" className="sp-pattern" />
      <div className="sp-container">
        <SectionHead id="sp-sellers-title" tone="gold" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} lead={t('lead')} />
        <div className="sp-tabs sp-sellers__tabs" role="tablist" aria-label={t('tabsLabel')} onKeyDown={onKey}>
          {tiers.map(tier => (
            <button key={tier} id={`sp-tier-${tier}`} type="button" role="tab" className="sp-tab" aria-selected={tier === current}
              aria-controls="sp-tier-panel" tabIndex={tier === current ? 0 : -1} onClick={() => setActive(tier)}>
              <PepperGlyph tier={tier} size={16} />
              {t(`tier.${tier}`)}
              <span className="sp-tab__n ltr-iso">{sellers.filter(s => s.plan === tier).length}</span>
            </button>
          ))}
        </div>
        <p className="sp-lead" style={{ marginTop: -8, marginBottom: 18 }}>{t(`blurb.${current}`)}</p>
        <div key={current} id="sp-tier-panel" role="tabpanel" aria-labelledby={`sp-tier-${current}`} className="sp-panel">
          <Rail label={t(`tier.${current}`)}>
            {list.map((s, i) => <SellerCard key={s.id} s={s} index={i} />)}
          </Rail>
        </div>
      </div>
    </section>
  )
}
