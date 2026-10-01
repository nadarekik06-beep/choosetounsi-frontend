'use client'

/**
 * ProductPrice — the one price + promotion display for every product card.
 *
 * Reads the pricing block every product endpoint returns (backend
 * PromotionService): final_price, original_price, discount_percent, promo_type,
 * ends_at, promotion. Never computes a discount itself: the server's numbers are
 * the ones the cart and checkout charge.
 *
 *   <ProductPromoOverlay product={p} />   inside the image box (position: relative):
 *                                          -X% + FLASH/PROMO badges top-left,
 *                                          flash countdown along the bottom edge
 *   <ProductPromoBadges product={p} inline />  the badges alone, for a card that
 *                                          already has its own badge column
 *   <ProductPrice product={p} />          final price in red + crossed-out original
 *
 * Badges and colours match the /deals cards.
 */

import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import FlashCountdownBadge from './FlashCountdownBadge'

type Num = number | string | null | undefined

export interface PricedProduct {
  price: Num
  final_price?: Num
  effective_price?: Num
  original_price?: Num
  discount_percent?: number | null
  promo_type?: 'flash_sale' | 'promotion' | null
  promo_label?: string | null
  ends_at?: string | null
  promotion?: { is_flash_sale?: boolean; ends_at?: string | null } | null
}

export interface PromoPricing {
  final: number
  original: number
  hasDiscount: boolean
  percent: number
  isFlash: boolean
  endsAt: string | null
}

/** Normalised promo numbers for a product payload (also used by sort/filter code). */
export function promoPricing(p: PricedProduct): PromoPricing {
  const final    = Number(p.final_price ?? p.effective_price ?? p.price ?? 0)
  const original = Number(p.original_price ?? p.price ?? 0)
  const type     = p.promo_type ?? (p.promotion ? (p.promotion.is_flash_sale ? 'flash_sale' : 'promotion') : null)
  const hasDiscount = !!type && final < original - 0.0005
  const percent = hasDiscount
    ? (p.discount_percent ?? Math.round(((original - final) / original) * 100))
    : 0

  return {
    final: hasDiscount ? final : Number(p.price ?? final),
    original,
    hasDiscount,
    percent,
    isFlash: hasDiscount && type === 'flash_sale',
    endsAt: p.ends_at ?? p.promotion?.ends_at ?? null,
  }
}

const SIZES = {
  sm: { price: 13,   orig: 9.5 },
  md: { price: 14.5, orig: 11 },
  lg: { price: 22,   orig: 14 },
  xl: { price: 32,   orig: 18 },   // product detail page
}

export default function ProductPrice({ product, size = 'sm', className, style }: {
  product: PricedProduct
  size?: keyof typeof SIZES
  className?: string
  style?: React.CSSProperties
}) {
  const fmt = useFormat()
  const { final, original, hasDiscount } = promoPricing(product)
  const s = SIZES[size]

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', ...style }}>
      <span style={{ fontSize: s.price, fontWeight: 900, color: '#db142e', lineHeight: 1.1 }}>
        {fmt.price(final)}
      </span>
      {hasDiscount && (
        <span style={{ fontSize: s.orig, fontWeight: 500, color: '#9ca3af', textDecoration: 'line-through' }}>
          {fmt.price(original)}
        </span>
      )}
    </div>
  )
}

// /deals .dc-badge
const BADGE: React.CSSProperties = {
  fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 999,
  textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap',
  display: 'inline-flex', alignItems: 'center', gap: 3, color: '#fff', lineHeight: 1.4,
}

/** -X% and FLASH / PROMO badges: top-left of the image, or `inline` in a caller's badge column. */
export function ProductPromoBadges({ product, inline = false, style }: {
  product: PricedProduct
  inline?: boolean
  style?: React.CSSProperties
}) {
  const t = useTranslations('deals')
  const { hasDiscount, percent, isFlash } = promoPricing(product)
  if (!hasDiscount) return null

  const badges = (
    <>
      {percent > 0 && (
        <span style={{ ...BADGE, fontSize: 9, padding: '3px 7px', background: isFlash ? '#db142e' : '#059669' }}>
          -{percent}%
        </span>
      )}
      {isFlash ? (
        <span style={{ ...BADGE, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />
          ⚡ {t('live')}
        </span>
      ) : (
        <span style={{ ...BADGE, background: 'rgba(5,150,105,0.85)', backdropFilter: 'blur(4px)' }}>
          🏷️ {t('discountBadge')}
        </span>
      )}
    </>
  )
  if (inline) return badges

  return (
    <div style={{
      position: 'absolute', top: 8, insetInlineStart: 8, zIndex: 5,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, pointerEvents: 'none', ...style,
    }}>
      {badges}
    </div>
  )
}

/**
 * Badges + flash countdown, for a `position: relative; overflow: hidden` image box.
 * badges={false}: countdown only (the card shows <ProductPromoBadges inline /> itself).
 */
export function ProductPromoOverlay({ product, badges = true, badgeStyle }: {
  product: PricedProduct
  badges?: boolean
  badgeStyle?: React.CSSProperties
}) {
  const { isFlash, endsAt } = promoPricing(product)
  return (
    <>
      {badges && <ProductPromoBadges product={product} style={badgeStyle} />}
      {isFlash && <FlashCountdownBadge promotion={{ is_flash_sale: true, ends_at: endsAt }} />}
    </>
  )
}
