'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { useInView } from '@/app/hooks/useInView'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { DealProduct } from '@/lib/shopPageApi'
import ShopProductCard from './ShopProductCard'
import { ArrowIcon, Rail, Reveal, SectionHead, splitDuration, useNow } from './primitives'

/** Big ticking clock to the soonest-ending deal. */
function Clock({ endsAt }: { endsAt: string }) {
  const t  = useTranslations('countdown')
  const td = useTranslations('shopPage.deals')
  const now = useNow()
  const left = splitDuration(now === null ? 0 : new Date(endsAt).getTime() - now)
  const boxes = [
    ...(left.d > 0 ? [{ k: 'd', v: left.d, u: t('daySuffix') }] : []),
    { k: 'h', v: left.h, u: t('hr') },
    { k: 'm', v: left.m, u: t('min') },
    { k: 's', v: left.s, u: t('sec') },
  ]
  return (
    <div className="sp-clock" role="timer" aria-live="off">
      <span className="sp-clock__label">{td('endsIn')}</span>
      <span className="sp-clock__boxes">
        {boxes.map(b => (
          <span key={b.k} className="sp-clock__box">
            <span key={b.k === 's' ? b.v : undefined} className={`sp-clock__num${b.k === 's' ? ' is-tick' : ''}`} suppressHydrationWarning>
              {now === null ? '--' : String(b.v).padStart(2, '0')}
            </span>
            <span className="sp-clock__unit">{b.u}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

/** "x% sold" bar for flash sales with a limited quantity. */
function Meter({ deal }: { deal: DealProduct['deal'] }) {
  const t = useTranslations('shopPage.deals')
  const { number } = useFormat()
  const { ref, seen } = useInView<HTMLDivElement>({ threshold: 0.4 })
  if (!deal.flash_stock || deal.flash_remaining == null) return null
  const sold = Math.max(0, deal.flash_stock - deal.flash_remaining)
  const pct = Math.round((sold / deal.flash_stock) * 100)
  return (
    <div ref={ref} className="sp-deal-meter">
      <div className="sp-deal-meter__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        aria-label={t('sold', { percent: number(pct) })}>
        <div className="sp-deal-meter__fill" style={{ '--p': seen ? pct / 100 : 0 } as CSSProperties} />
      </div>
      <div className="sp-deal-meter__txt">
        <span>{t('sold', { percent: number(pct) })}</span>
        <span>{t('left', { count: deal.flash_remaining })}</span>
      </div>
    </div>
  )
}

export default function DealsSection({ deals }: { deals: DealProduct[] }) {
  const t = useTranslations('shopPage.deals')
  if (deals.length === 0) return null

  const soonest = deals.map(d => d.deal.ends_at).filter(Boolean).sort()[0]

  return (
    <section className="sp-section sp-section--tight" aria-labelledby="sp-deals-title">
      <div className="sp-container">
        <Reveal className={`sp-deals${deals.length <= 3 ? ' sp-deals--few' : ''}`}>
          <TunisianPattern color="#ffffff" className="sp-pattern" />
          <SectionHead id="sp-deals-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} lead={t('lead')}
            action={<Link href="/deals" className="sp-link">{t('seeAll')}<ArrowIcon /></Link>} />
          {soonest && <div className="sp-deals__clock"><Clock endsAt={soonest} /></div>}
          <Rail className="sp-rail--products" label={t('eyebrow')}>
            {deals.map((d, i) => (
              <div key={d.id} role="listitem">
                <ShopProductCard product={d} index={i} section="shop_deals" footer={<Meter deal={d.deal} />} />
              </div>
            ))}
          </Rail>
        </Reveal>
      </div>
    </section>
  )
}
