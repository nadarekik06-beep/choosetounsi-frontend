'use client'

/**
 * components/shop/FlashToast.tsx
 * Shows global cart/favorites flash messages.
 * Place inside your layout, next to <CartProvider>.
 */

import { useCart } from '@/context/CartContext'
import { CheckCircle, X } from 'lucide-react'

export default function FlashToast() {
  const { flash, clearFlash } = useCart()

  if (!flash) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: 'translateX(-50%)',
        background: '#111', color: '#fff',
        padding: '12px 22px', borderRadius: 999,
        fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        zIndex: 9999,
        animation: 'toastIn 0.28s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <CheckCircle size={15} color="#10b981" />
      {flash}
      <button
        onClick={clearFlash}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2 }}
      >
        <X size={13} />
      </button>
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform: translateX(-50%) translateY(10px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}