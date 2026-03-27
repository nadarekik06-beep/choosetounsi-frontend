'use client'

/**
 * components/CartDrawer.tsx
 * Slide-in cart drawer.
 * Updated to display variant labels and per-variant pricing.
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import type { CartItem } from '@/lib/shopApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(n) + ' DT'

// ─── Single cart row ──────────────────────────────────────────────────────────

function CartRow({ item }: { item: CartItem }) {
  const { updateItem, removeItem, cartLoading } = useCart()
  const imgSrc = resolveImg(item.image_url)

  const variantEntries = item.variant_options
    ? Object.values(item.variant_options)
    : []

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 0',
      borderBottom: '1px solid #f1f5f9',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: 72, height: 72, flexShrink: 0,
        borderRadius: 10, overflow: 'hidden',
        background: '#f8fafc', border: '1px solid #f1f5f9',
      }}>
        {imgSrc
          ? <img src={imgSrc} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color="#e2e8f0" />
            </div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/products/${item.slug}`}
          style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textDecoration: 'none', lineHeight: 1.3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </Link>

        {/* Variant label */}
        {item.variant_label && (
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
            {item.variant_label}
          </p>
        )}

        {/* Color swatches inline when color axis present */}
        {variantEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {variantEntries.map((opt, i) =>
              opt.color_hex ? (
                <span key={i}
                  title={opt.value}
                  style={{
                    display: 'inline-block', width: 12, height: 12,
                    borderRadius: '50%', background: opt.color_hex,
                    border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0,
                  }}
                />
              ) : (
                <span key={i} style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  {opt.value}
                </span>
              )
            )}
          </div>
        )}

        {/* Price + qty controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
            {fmt(item.price)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
              disabled={cartLoading}
              style={{ width: 28, height: 28, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'background 0.15s' }}
            >
              <Minus size={11} />
            </button>
            <span style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#111', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', lineHeight: '28px' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateItem(item.id, item.quantity + 1)}
              disabled={cartLoading || item.quantity >= item.stock}
              style={{ width: 28, height: 28, border: 'none', background: '#f8fafc', cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.quantity >= item.stock ? '#e5e7eb' : '#374151', transition: 'background 0.15s' }}
            >
              <Plus size={11} />
            </button>
          </div>
        </div>

        {/* Line total + remove */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
            {item.quantity} × {fmt(item.price)} = <strong style={{ color: '#374151' }}>{fmt(item.line_total)}</strong>
          </span>
          <button onClick={() => removeItem(item.id)} disabled={cartLoading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', borderRadius: 4, opacity: cartLoading ? 0.4 : 0.7, transition: 'opacity 0.15s' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { items, count, subtotal, drawerOpen, closeDrawer, clearCart, cartLoading } = useCart()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeDrawer])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      <style>{`
        @keyframes slideIn  { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        .cart-row-btn:hover { background: #f1f5f9 !important; }
      `}</style>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          ref={overlayRef}
          onClick={closeDrawer}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 9998, animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 420,
        background: '#fff',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: "'Barlow', sans-serif",
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(220,38,38,0.08)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={16} color="#dc2626" />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>Your Cart</h2>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                {count} {count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button onClick={closeDrawer}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #f1f5f9', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <X size={15} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <ShoppingCart size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>Your cart is empty</p>
              <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 20px' }}>Add some products to get started</p>
              <button onClick={closeDrawer}
                style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {items.map(item => <CartRow key={`${item.id}-${item.variant_id ?? 'base'}`} item={item} />)}

              {/* Clear all */}
              {items.length > 1 && (
                <button onClick={clearCart} disabled={cartLoading}
                  style={{ width: '100%', marginTop: 8, marginBottom: 4, padding: '8px', border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', opacity: cartLoading ? 0.5 : 1 }}>
                  Clear all items
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', flexShrink: 0, background: '#fff' }}>

            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Subtotal ({count} items)</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{fmt(subtotal)}</span>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', fontWeight: 500 }}>
              Shipping calculated at checkout
            </p>

            {/* Checkout CTA */}
            <Link href="/checkout" onClick={closeDrawer}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 0',
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff', fontWeight: 800, fontSize: 14,
                borderRadius: 12, textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
              }}>
              Proceed to Checkout <ArrowRight size={16} />
            </Link>

            {/* Continue shopping */}
            <button onClick={closeDrawer}
              style={{ width: '100%', marginTop: 10, padding: '10px 0', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}