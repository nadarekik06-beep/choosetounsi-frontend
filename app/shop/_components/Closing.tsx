'use client'

import Link from 'next/link'
import { Truck, Banknote, ShieldCheck, LifeBuoy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { useInView } from '@/app/hooks/useInView'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { ShopStats } from '@/lib/shopPageApi'
import { ArrowIcon, Reveal } from './primitives'

/** Red "sell with us" banner, same composition as the /become-a-vendor final CTA. */
export function VendorCta() {
  const t = useTranslations('shopPage.vendorCta')
  const { ref, seen, inView } = useInView<HTMLElement>({ threshold: 0.25 })
  return (
    <section ref={ref} className={`sp-section sp-section--tight sp-cta-wrap${inView ? ' is-live' : ''}`} aria-labelledby="sp-cta-title">
      <div className="sp-container">
        <div className={`sp-cta sp-reveal${seen ? ' is-in' : ''}`}>
          <TunisianPattern color="#ffffff" className="sp-pattern" />
          <div className="sp-cta__peps" aria-hidden="true">
            <AnimatedPepper color="green" size={46} rotate={-25} delay={-1.5} style={{ top: '14%', insetInlineStart: '7%' }} />
            <AnimatedPepper color="black" size={30} rotate={50} delay={-4} style={{ bottom: '16%', insetInlineStart: '15%' }} />
            <AnimatedPepper color="red" size={36} rotate={20} delay={-2.6} style={{ top: '18%', insetInlineEnd: '9%', filter: 'brightness(1.15) drop-shadow(0 6px 10px rgba(0,0,0,.25))' }} />
            <AnimatedPepper color="green" size={28} rotate={-60} delay={-3.3} style={{ bottom: '14%', insetInlineEnd: '15%' }} />
          </div>
          <p className="sp-eyebrow" style={{ position: 'relative' }}><span className="sp-eyebrow__dot" aria-hidden="true" />{t('eyebrow')}</p>
          <h2 id="sp-cta-title" className="sp-cta__title">{t('title1')}<br /><em>{t('title2')}</em></h2>
          <p className="sp-cta__sub">{t('sub')}</p>
          <Link href="/become-a-vendor" className="sp-btn sp-btn--white" style={{ minHeight: 56, padding: '0 34px' }}>
            {t('cta')}<ArrowIcon />
          </Link>
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
