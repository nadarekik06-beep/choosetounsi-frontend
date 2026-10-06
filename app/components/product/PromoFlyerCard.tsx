'use client'

/**
 * A "flyer" in a product grid: one live promotion or flash sale (lib/gridFill.ts),
 * same footprint as a product card. Big discount, the offer's name, up to three product
 * photos, the deal price when it's a single product, and a CTA to the product, the
 * seller's store or /deals. Styles: product-card.css (.pc-flyer).
 */

import { useMemo, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Tag, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { isLocalImage } from '@/lib/imageHost'
import { resolveImageUrl } from '@/lib/dealsApi'
import { trackClick } from '@/lib/tracking'
import type { PromoFlyer } from '@/lib/gridFill'
import './product-card.css'

export default function PromoFlyerCard({ flyer, index = 0, section }: { flyer: PromoFlyer; index?: number; section: string }) {
  const t = useTranslations('gridPromo')
  const fmt = useFormat()
  const flash = flyer.type === 'flash_sale'
  const images = useMemo(
    () => flyer.images.map(u => resolveImageUrl(u)).filter((u): u is string => !!u).slice(0, 3),
    [flyer.images],
  )

  // Static "ends in" (no ticking timer in a grid): hours under a day, else days
  const [now] = useState(() => Date.now())
  const left = Math.max(0, new Date(flyer.ends_at).getTime() - now)
  const hours = Math.ceil(left / 3_600_000)
  const endsIn = left <= 0 ? null : hours < 24 ? t('endsInHours', { count: hours }) : t('endsInDays', { count: Math.ceil(hours / 24) })

  const off = flyer.discount_type === 'percentage'
    ? t('offPercent', { value: Math.round(flyer.discount_value) })
    : t('offAmount', { amount: fmt.price(flyer.discount_value) })

  const single = flyer.products_count === 1
  const cta = flyer.link.type === 'product' ? t('ctaProduct') : flyer.link.type === 'seller' ? t('ctaSeller') : t('ctaDeals')
  const meta = [
    flyer.seller?.name ? t('byShop', { shop: flyer.seller.name }) : null,
    !single ? t('products', { count: flyer.products_count }) : null,
    endsIn,
  ].filter(Boolean).join(' · ')

  return (
    <Link href={flyer.link.href} prefetch={false}
      className={`pc-flyer${flash ? '' : ' pc-flyer--discount'}`}
      style={{ animationDelay: `${(index % 12) * 30}ms` } as CSSProperties}
      onClick={() => trackClick(flyer.product.id, `${section}_flyer`)}
      aria-label={`${off} — ${single ? flyer.product.name : flyer.name}. ${cta}`}>
      <span className="pc-flyer__dots" aria-hidden="true" />

      <div className="pc-flyer__top">
        <span className="pc-flyer__kind">
          {flash ? <Zap size={11} fill="currentColor" aria-hidden="true" /> : <Tag size={11} aria-hidden="true" />}
          {flash ? t('flash') : t('offer')}
        </span>
        <span className="pc-flyer__off ltr-iso">{off}</span>
      </div>

      <div className="pc-flyer__body">
        <h3 className="pc-flyer__name">{single ? flyer.product.name : flyer.name}</h3>
        {meta && <p className="pc-flyer__meta">{meta}</p>}
      </div>

      {images.length > 0 && (
        <div className="pc-flyer__pics" aria-hidden="true">
          {images.map(src => (
            <span key={src} className="pc-flyer__pic">
              <Image src={src} alt="" fill sizes="(min-width: 1024px) 14vw, 40vw" loading="lazy" unoptimized={isLocalImage(src)} />
            </span>
          ))}
        </div>
      )}

      {single && flyer.product.final_price < flyer.product.original_price && (
        <p className="pc-flyer__price">
          <span className="pc-flyer__now">{fmt.price(flyer.product.final_price)}</span>
          <s className="pc-flyer__was">{fmt.price(flyer.product.original_price)}</s>
        </p>
      )}

      <span className="pc-flyer__cta">
        {cta}
        <ArrowRight size={14} className="rtl-flip" aria-hidden="true" />
      </span>
    </Link>
  )
}
