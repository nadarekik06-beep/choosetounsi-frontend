'use client'

/**
 * components/shop/FavoriteButton.tsx
 * Heart toggle button for product cards.
 * Usage: <FavoriteButton productId={42} />
 */

import { useCart } from '@/context/CartContext'
import { Heart } from 'lucide-react'

interface Props {
  productId: number
  className?: string
  size?: number
}

export default function FavoriteButton({ productId, className = '', size = 15 }: Props) {
  const { isFavorited, toggleFavorite, favLoading } = useCart()
  const active = isFavorited(productId)

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(productId) }}
      disabled={favLoading}
      className={className}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: active ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(4px)',
        border: `2px solid ${active ? 'rgba(220,38,38,0.4)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <Heart
        size={size}
        fill={active ? '#dc2626' : 'none'}
        stroke={active ? '#dc2626' : '#888'}
        strokeWidth={2}
        style={{ transition: 'all 0.2s ease', flexShrink: 0 }}
      />
    </button>
  )
}