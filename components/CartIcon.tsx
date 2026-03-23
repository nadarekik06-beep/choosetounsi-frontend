'use client'

/**
 * components/shop/CartIcon.tsx
 * Drop-in cart icon with item count badge for the Navbar.
 * Usage:
 *   const [cartOpen, setCartOpen] = useState(false)
 *   <CartIcon onClick={() => setCartOpen(true)} />
 *   <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
 */

import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface Props {
  onClick: () => void
}

export default function CartIcon({ onClick }: Props) {
  const { count } = useCart()

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', background: 'transparent', border: 'none',
        cursor: 'pointer', padding: 8, borderRadius: 10, color: '#374151',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s ease',
      }}
      aria-label={`Cart (${count} items)`}
    >
      <ShoppingBag size={22} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: '#dc2626', color: '#fff',
          fontSize: 9, fontWeight: 900, lineHeight: 1,
          minWidth: 17, height: 17,
          borderRadius: '50%', border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}