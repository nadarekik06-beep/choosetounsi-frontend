'use client'

/**
 * components/PriceDisplay.tsx
 * ChooseTounsi — Reusable price block for product cards
 *
 * Handles three states:
 *   1. No promotion → shows price only
 *   2. Percentage discount → shows effective price + crossed-out original + badge "-X%"
 *   3. Fixed discount → shows effective price + crossed-out original + badge "-X DT"
 *
 * Drop this into ANY product card component — category page, home page, search, etc.
 *
 * Props:
 *   price            — the original (base) product price, always a number
 *   effectivePrice   — the discounted price (equals price when no promo)
 *   promotion        — the ActivePromotion object or null/undefined
 *   size             — 'sm' | 'md' | 'lg'  (default 'md')
 *   className        — extra wrapper class
 */

export interface ActivePromotion {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  is_flash_sale: boolean
}

interface PriceDisplayProps {
  price: number | string
  effectivePrice?: number | string | null
  promotion?: ActivePromotion | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const money = (n: number | string) =>
  `${Number(n).toFixed(2)} DT`

const SIZE = {
  sm: { current: 13, original: 10, badge: 8  },
  md: { current: 14, original: 11, badge: 9  },
  lg: { current: 18, original: 13, badge: 10 },
}

export default function PriceDisplay({
  price,
  effectivePrice,
  promotion,
  size = 'md',
  className,
}: PriceDisplayProps) {
  const original  = Number(price)
  const effective = effectivePrice != null ? Number(effectivePrice) : original
  const hasDiscount = effective < original - 0.001   // float-safe comparison

  const s = SIZE[size]

  // Compute badge label
  const badgeLabel = (() => {
    if (!hasDiscount || !promotion) return null
    if (promotion.discount_type === 'percentage') {
      const pct = Math.round(((original - effective) / original) * 100)
      return pct > 0 ? `-${pct}%` : null
    }
    // fixed
    const saved = original - effective
    return saved > 0 ? `-${saved.toFixed(2)} DT` : null
  })()

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
    >
      {/* ── Current / discounted price ── */}
      <span style={{
        fontSize: s.current,
        fontWeight: 900,
        color: '#db142e',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        {money(effective)}
      </span>

      {/* ── Original price (crossed out) ── */}
      {hasDiscount && (
        <span style={{
          fontSize: s.original,
          fontWeight: 500,
          color: '#9ca3af',
          textDecoration: 'line-through',
          lineHeight: 1,
        }}>
          {money(original)}
        </span>
      )}

      {/* ── Discount badge ── */}
      {hasDiscount && badgeLabel && (
        <span style={{
          fontSize: s.badge,
          fontWeight: 900,
          color: '#fff',
          background: promotion?.is_flash_sale
            ? 'linear-gradient(135deg, #dc2626, #f97316)'
            : '#dc2626',
          padding: '2px 6px',
          borderRadius: 999,
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {badgeLabel}
        </span>
      )}
    </div>
  )
}