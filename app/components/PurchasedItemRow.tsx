'use client'

import type { PurchasedItem } from '@/types/complaint'

/**
 * One order line as bought: the image, name, variant ("Rouge / M") and quantity
 * stored on the order — the same thing the buyer, the seller and the admin see.
 * No image → placeholder, never another variant's photo.
 */
export function PurchasedItemThumb({ item, size = 44, border = '#e5e7eb' }: { item: PurchasedItem; size?: number; border?: string }) {
  return item.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image_url} alt={item.product_name}
      style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${border}` }} />
  ) : (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: '#f1f5f9', border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.4),
    }}>📦</div>
  )
}

/** "Rouge / M" with the color swatch, when the line was bought as a variant. */
export function VariantLabel({ item, color = '#64748b' }: { item: PurchasedItem; color?: string }) {
  if (!item.variant_label) return null
  const hex = item.variant_attributes?.find(a => a.color_hex)?.color_hex
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color }}>
      {hex && (
        <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
      )}
      {item.variant_label}
    </span>
  )
}

export default function PurchasedItemRow({
  item, qtyLabel, textColor = '#1e293b', mutedColor = '#64748b', border = '#e5e7eb',
}: {
  item: PurchasedItem
  qtyLabel: string
  textColor?: string
  mutedColor?: string
  border?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <PurchasedItemThumb item={item} border={border} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: textColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.product_name}
        </p>
        <p style={{ fontSize: 11.5, color: mutedColor, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <VariantLabel item={item} color={mutedColor} />
          <span>{qtyLabel}</span>
        </p>
      </div>
    </div>
  )
}
