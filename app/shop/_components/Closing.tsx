'use client'

import Link from 'next/link'
import { Truck, Banknote, ShieldCheck, LifeBuoy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import type { ShopStats } from '@/lib/shopPageApi'
import { ArrowIcon, Reveal } from './primitives'

/** Slim "sell with us" banner. */
export function VendorCta() {
  const t = useTranslations('shopPage.vendorCta')
  return (
    <section className="sp-section sp-section--tight" aria-labelledby="sp-cta-title">
      <div className="sp-container">
        <div className="sp-cta">
          <div className="sp-cta__text">
            <h2 id="sp-cta-title" className="sp-cta__title">{t('title1')} {t('title2')}</h2>
            <p className="sp-cta__sub">{t('sub')}</p>
          </div>
          <Link href="/become-a-vendor" className="sp-btn sp-btn--primary">{t('cta')}<ArrowIcon /></Link>
        </div>
      </div>
    </section>
  )
}

/** Delivery / payment / after-sale facts, all read from the API (no promises the backend doesn't keep). */
export function TrustStrip({ stats }: { stats: ShopStats | null }) {
  const t = useTranslations('shopPage.trust')
  const { price } = useFormat()
  const items = [
    {
      key: 'delivery', Icon: Truck, tone: 'red', title: t('delivery'),
      body: stats ? (
        <>
          {t('deliveryFee', { fee: price(stats.delivery_fee, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) })}
          {stats.free_delivery_products > 0 && <> · {t('freeCount', { count: stats.free_delivery_products })}</>}
        </>
      ) : null,
    },
    { key: 'cod', Icon: Banknote, tone: 'green', title: t('cod'), body: t('codBody') },
    { key: 'secure', Icon: ShieldCheck, tone: 'ink', title: t('secure'), body: t('secureBody') },
    {
      key: 'returns', Icon: LifeBuoy, tone: 'gold', title: t('returns'),
      body: stats ? t('returnsBody', { hours: stats.complaint_window_hours }) : null,
    },
  ]
  return (
    <section className="sp-section sp-section--tight" aria-label={t('label')} style={{ paddingTop: 8 }}>
      <div className="sp-container">
        <ul className="sp-trust">
          {items.map((it, i) => (
            <Reveal as="li" key={it.key} index={i} className="sp-trust__item">
              <span className={`sp-trust__icon sp-trust__icon--${it.tone}`}><it.Icon size={20} aria-hidden="true" /></span>
              <div>
                <p className="sp-trust__title">{it.title}</p>
                {it.body && <p className="sp-trust__body">{it.body}</p>}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
