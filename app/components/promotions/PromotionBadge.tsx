'use client'

import type { ActivePromotion } from '@/lib/promotionsApi'

interface Props {
  promotion: ActivePromotion
  size?: 'sm' | 'md'
}

export default function PromotionBadge({ promotion, size = 'sm' }: Props) {
  const isFlash = promotion.is_flash_sale

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: isFlash ? '#dc2626' : '#059669',
      color: '#fff',
      fontSize: size === 'sm' ? 8 : 11,
      fontWeight: 900,
      padding: size === 'sm' ? '2px 6px' : '3px 9px',
      borderRadius: 999,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {isFlash ? '⚡' : '🏷️'} {promotion.discount_label}
    </span>
  )
}