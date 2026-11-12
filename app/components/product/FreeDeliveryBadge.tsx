'use client'

/**
 * "Livraison gratuite": delivery is free on the whole platform (it is included
 * in every displayed price). Small truck badge in the brand green, shown on
 * product cards and near the price on product and pack pages.
 */

import { useTranslations } from 'next-intl'

export const FREE_DELIVERY_GREEN = '#198f41'

export default function FreeDeliveryBadge({ size = 'sm', style }: {
  /** sm: product cards · md: product / pack page, near the price */
  size?: 'sm' | 'md'
  style?: React.CSSProperties
}) {
  const t = useTranslations('productCard')
  const md = size === 'md'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: md ? 6 : 4, maxWidth: '100%',
      color: FREE_DELIVERY_GREEN, fontWeight: 800, fontSize: md ? 12.5 : 10.5, lineHeight: 1.3,
      background: md ? 'rgba(25,143,65,0.08)' : 'transparent',
      border: md ? '1px solid rgba(25,143,65,0.25)' : 'none',
      borderRadius: 8, padding: md ? '5px 12px' : 0, whiteSpace: 'nowrap', ...style,
    }}>
      <svg width={md ? 15 : 12} height={md ? 15 : 12} fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('freeDelivery')}</span>
    </span>
  )
}
