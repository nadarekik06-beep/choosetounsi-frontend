'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ImageOff, Package, Ticket, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { isLocalImage } from '@/lib/imageHost'
import { resolveImageUrl } from '@/lib/dealsApi'
import type { ShopProduct } from '@/lib/shopPageApi'
import { promoPricing } from '@/app/components/promotions/ProductPrice'
import ProductCard from '@/app/components/product/ProductCard'
import { ShopAvatar, TimeLeft } from '@/app/shop/_components/primitives'
import type { DealItem } from './model'

const SIZES = '(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 48vw'

/** One clear badge per card, coloured by offer type; a coupon on a discounted product gets a second, small pill. */
export function OfferBadge({ item }: { item: DealItem }) {
  const t = useTranslations('deals')
  const { price } = useFormat()
  const [primary] = item.offers
  const coupon = item.product?.coupon
  const couponValue = coupon
    ? coupon.discount_type === 'percentage' ? `-${coupon.discount_value}%` : `-${price(coupon.discount_value)}`
    : ''
  const couponTitle = coupon?.min_order_amount ? t('badge.couponMin', { amount: price(coupon.min_order_amount) }) : undefined

  return (
    <>
      {primary === 'flash' && item.endsAt && (
        <span className="dl-badge dl-badge--flash">
          <Zap size={13} strokeWidth={2.5} aria-hidden="true" /> {item.percent > 0 && <b>-{item.percent}%</b>}
          <span className="dl-badge__time"><TimeLeft endsAt={item.product!.deal!.ends_at} /></span>
        </span>
      )}
      {primary === 'promo' && <span className="dl-badge dl-badge--promo">-{item.percent}%</span>}
      {primary === 'pack' && (
        <span className="dl-badge dl-badge--pack"><Package size={13} strokeWidth={2.5} aria-hidden="true" /> {t('itemsCount', { count: item.pack!.items_count })}</span>
      )}
      {coupon && (
        <span className={`dl-badge dl-badge--coupon${primary !== 'coupon' ? ' dl-badge--sub' : ''}`} title={couponTitle}>
          <Ticket size={13} strokeWidth={2.5} aria-hidden="true" /> {t('badge.coupon', { value: couponValue })}
        </span>
      )}
    </>
  )
}

/** Flash sales with a limited quantity only: "Plus que X en stock" + how much is gone. */
function FlashStock({ item }: { item: DealItem }) {
  const t = useTranslations('deals')
  const deal = item.product?.deal
  if (!deal?.is_flash_sale || !deal.flash_stock || deal.flash_remaining == null) return null
  const sold = Math.max(0, deal.flash_stock - deal.flash_remaining)
  const pct = Math.min(100, Math.round((sold / deal.flash_stock) * 100))
  return (
    <div className="dl-stock">
      <div className="dl-stock__bar" role="progressbar" aria-valuemin={0} aria-valuemax={deal.flash_stock} aria-valuenow={sold}
        aria-label={t('stockLeft', { count: deal.flash_remaining })}>
        <span style={{ width: `${Math.max(4, pct)}%` }} className={pct >= 70 ? 'is-hot' : ''} />
      </div>
      <span className={`dl-stock__txt${pct >= 70 ? ' is-hot' : ''}`}>{t('stockLeft', { count: deal.flash_remaining })}</span>
    </div>
  )
}

export function DealCard({ item, index }: { item: DealItem; index: number }) {
  if (item.pack) return <PackCard item={item} index={index} />
  return (
    <ProductCard product={item.product!} index={index} section="deals" eager={index < 4}
      layout="deal" badge={<OfferBadge item={item} />} footer={<FlashStock item={item} />} />
  )
}

/** Pack: cover (or the items' mosaic), second image on hover, "Voir le pack" opens the pack page (variants are chosen there). */
function PackCard({ item, index }: { item: DealItem; index: number }) {
  const t  = useTranslations('deals')
  const tc = useTranslations('shopPage.card')
  const fmt = useFormat()
  const pack = item.pack!
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const href = `/deals/${pack.slug}`
  const shop = pack.seller?.business_name || pack.seller?.name

  const images: string[] = []
  for (const u of [pack.image_url, ...pack.items.map(i => i.product?.primary_image_url)]) {
    const url = resolveImageUrl(u)
    if (url && !images.includes(url) && !broken[url]) images.push(url)
  }
  const [main, alt] = images

  return (
    <article className={`sp-card sp-card-enter sp-card--deal${alt ? ' has-alt' : ''}`} style={{ '--i': index % 12 } as CSSProperties}>
      <Link href={href} prefetch={false} className="sp-card__link" aria-label={pack.name} />
      <div className="sp-card__media">
        {main ? (
          <>
            <Image className="sp-card__img sp-card__img--main" src={main} unoptimized={isLocalImage(main)} alt={pack.name} fill sizes={SIZES}
              loading={index < 4 ? 'eager' : 'lazy'} onError={() => setBroken(b => ({ ...b, [main]: true }))} />
            {alt && (
              <Image className="sp-card__img sp-card__img--alt" src={alt} unoptimized={isLocalImage(alt)} alt="" fill sizes={SIZES} loading="lazy"
                onError={() => setBroken(b => ({ ...b, [alt]: true }))} />
            )}
          </>
        ) : (
          <div className="sp-card__ph"><ImageOff size={28} aria-hidden="true" /></div>
        )}
        <div className="sp-card__badges"><OfferBadge item={item} /></div>
      </div>
      <div className="sp-card__body">
        {shop && (
          <p className="sp-card__shop">
            <ShopAvatar name={shop} src={resolveImageUrl(pack.seller?.avatar)} />
            {pack.seller?.id
              ? <Link href={`/sellers/${pack.seller.id}`} prefetch={false} className="sp-card__shoplink">{shop}</Link>
              : <span>{shop}</span>}
          </p>
        )}
        <h3 className="sp-card__name">{pack.name}</h3>
        <div className="sp-card__price">
          <div className="dl-price">
            <span className="dl-price__now">{fmt.price(pack.pack_price)}</span>
            {pack.original_price > pack.pack_price && <span className="dl-price__was">{fmt.price(pack.original_price)}</span>}
          </div>
        </div>
        {pack.savings > 0 && <p className="sp-card__save">{tc('save', { amount: fmt.price(pack.savings) })}</p>}
        <Link href={href} prefetch={false} className="sp-card__cta sp-card__cta--dark">
          {t('viewBundle')} <ArrowRight className="rtl-flip" size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

export function DealSkeleton() {
  return (
    <div className="sp-skel dl-skel" aria-hidden="true">
      <div className="sp-skel__media" />
      <div className="sp-skel__line" style={{ width: '40%' }} />
      <div className="sp-skel__line" style={{ width: '85%' }} />
      <div className="sp-skel__line" style={{ width: '50%', height: 14 }} />
      <div className="sp-skel__line dl-skel__btn" />
    </div>
  )
}

/** Offer badge for a plain catalogue product ("you may also like"): same look as the deal badges. */
export function ProductOfferBadge({ product }: { product: ShopProduct }) {
  const p = promoPricing(product)
  if (!p.hasDiscount) return null
  if (p.isFlash && p.endsAt) {
    return (
      <span className="dl-badge dl-badge--flash">
        <Zap size={13} strokeWidth={2.5} aria-hidden="true" /> <b>-{p.percent}%</b>
        <span className="dl-badge__time"><TimeLeft endsAt={p.endsAt} /></span>
      </span>
    )
  }
  return <span className="dl-badge dl-badge--promo">-{p.percent}%</span>
}
