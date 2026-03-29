'use client'

/**
 * components/AddToCartButton.tsx
 * Drop-in button that handles add-to-cart logic.
 * ✅ Accepts variantId — REQUIRED for products with variants.
 * ✅ Drawer opens automatically via CartContext.
 *
 * Usage on product page:
 *   <AddToCartButton productId={42} variantId={selectedVariant?.id} stock={selectedVariant?.stock ?? product.stock} />
 *
 * Usage on listing cards (no variant selection):
 *   <AddToCartButton productId={42} stock={product.stock} />
 */

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { ShoppingCart, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  productId: number
  variantId?: number | null    // pass selected variant ID when product has variants
  stock: number
  className?: string
  variant?: 'full' | 'icon'   // full = label+icon, icon = icon only
}

export default function AddToCartButton({
  productId,
  variantId = null,
  stock,
  className = '',
  variant = 'full',
}: Props) {
  const { addToCart, cartLoading } = useCart()
  const [added, setAdded] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (stock <= 0 || cartLoading) return

    // Pass variantId to CartContext — backend will use it for stock check + image
    await addToCart(productId, 1, variantId)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const outOfStock = stock <= 0

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={outOfStock || cartLoading}
        title={outOfStock ? 'Out of stock' : 'Add to cart'}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: added ? '#10b981' : '#dc2626',
          border: 'none', cursor: outOfStock ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0,
          opacity: outOfStock ? 0.5 : 1,
          transition: 'background 0.2s ease, transform 0.15s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {cartLoading ? (
          <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
        ) : added ? (
          <CheckCircle size={15} />
        ) : (
          <ShoppingCart size={15} />
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={outOfStock || cartLoading}
      className={className}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '12px 20px',
        background: outOfStock
          ? '#e5e7eb'
          : added
          ? 'linear-gradient(135deg,#10b981,#059669)'
          : 'linear-gradient(135deg,#dc2626,#b91c1c)',
        color: outOfStock ? '#9ca3af' : '#fff',
        fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
        borderRadius: 14, border: 'none',
        cursor: outOfStock ? 'not-allowed' : 'pointer',
        boxShadow: outOfStock ? 'none' : '0 6px 20px rgba(220,38,38,0.35)',
        transition: 'all 0.2s ease',
      }}
    >
      {cartLoading ? (
        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
      ) : added ? (
        <CheckCircle size={16} />
      ) : (
        <ShoppingCart size={16} />
      )}
      {outOfStock ? 'Out of Stock' : added ? 'Added!' : 'Add to Cart'}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </button>
  )
}