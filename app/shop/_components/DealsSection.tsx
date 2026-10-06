'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { useInView } from '@/app/hooks/useInView'
import { Clock as ClockIcon } from 'lucide-react'
import type { DealProduct } from '@/lib/shopPageApi'
import ProductCard from '@/app/components/product/ProductCard'
import { ArrowIcon, Rail, splitDuration, useNow } from './primitives'

/** Discreet "Ends in 02:14:33" pill for the soonest-ending deal. */
function Clock({ endsAt }: { endsAt: string }) {
  const t  = useTranslations('countdown')
  const td = useTranslations('shopPage.deals')
  const now = useNow()
  const left = splitDuration(now === null ? 0 : new Date(endsAt).getTime() - now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="sp-clock" role="timer" aria-live="off">
      <ClockIcon size={12} aria-hidden="true" />
      <span>{td('endsIn')}</span>
      <span className="sp-clock__num ltr-iso" suppressHydrationWarning>
        {now === null ? '--:--:--' : `${left.d > 0 ? `${left.d}${t('daySuffix')} ` : ''}${pad(left.h)}:${pad(left.m)}:${pad(left.s)}`}
      </span>
    </span>
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
        <div className={`sp-deals${deals.length <= 3 ? ' sp-deals--few' : ''}`}>
          <div className="sp-deals__head">
            <h2 id="sp-deals-title" className="sp-deals__title">{t('eyebrow')}</h2>
            {soonest && <Clock endsAt={soonest} />}
            <Link href="/deals" className="sp-link sp-deals__all">{t('seeAll')}<ArrowIcon size={13} /></Link>
          </div>
          <Rail className="sp-rail--products" label={t('eyebrow')}>
            {deals.map((d, i) => (
              <div key={d.id} role="listitem">
                <ProductCard product={d} index={i} section="shop_deals" eager={i < 6} footer={<Meter deal={d.deal} />} />
              </div>
            ))}
          </Rail>
        </div>
      </div>
    </section>
  )
}
