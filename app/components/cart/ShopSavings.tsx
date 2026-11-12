'use client'

/**
 * Multi-item discount of one shop (one shop = one parcel), as the server
 * computed it: never recomputed here.
 *
 *   <ShopSavings shop={…} />   green "🎉 lucky" message when the client saves by
 *                              ordering several items from the shop, or the hint
 *                              "add another item and save at least X" when the
 *                              shop has exactly one item in the order.
 *   <FreeDeliveryValue />      the green "Gratuite" of every delivery line.
 *
 * The wording never mentions delivery for the discount (owner's rule).
 */

import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

const GREEN = '#198f41'

export interface ShopSavingsData {
  seller_name?: string | null
  /** What the client saves by ordering several items from this shop (0 = none). */
  multi_item_discount?: number | null
  /** Set when the shop has exactly one item: the least a second item would save. */
  upsell_min_saving?: number | null
}

export function ShopSavings({ shop, style }: { shop: ShopSavingsData; style?: React.CSSProperties }) {
  const t = useTranslations('multiItem')
  const { price } = useFormat()
  const name = shop.seller_name || t('thisShop')
  const saved = Number(shop.multi_item_discount ?? 0)
  const upsell = Number(shop.upsell_min_saving ?? 0)

  if (saved > 0.0005) {
    return (
      <p role="status" style={{
        fontSize: 12, fontWeight: 700, color: GREEN, background: 'rgba(25,143,65,0.08)',
        border: '1px solid rgba(25,143,65,0.25)', borderRadius: 10, padding: '8px 10px', margin: 0, lineHeight: 1.45, ...style,
      }}>
        {t('lucky', { amount: price(saved), shop: name })}
      </p>
    )
  }
  if (upsell > 0.0005) {
    return (
      <p style={{
        fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#f8fafc',
        border: '1px dashed #cbd5e1', borderRadius: 10, padding: '7px 10px', margin: 0, lineHeight: 1.45, ...style,
      }}>
        {t('upsell', { amount: price(upsell), shop: name })}
      </p>
    )
  }
  return null
}

/** "Gratuite" in green: the value of every delivery line. */
export function FreeDeliveryValue({ small }: { small?: boolean }) {
  const t = useTranslations('multiItem')
  return (
    <span style={{ fontSize: small ? 12 : 13, fontWeight: 800, color: GREEN, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {t('deliveryFree')}
    </span>
  )
}
