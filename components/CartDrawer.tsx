'use client'

/**
 * components/shop/CartDrawer.tsx
 * Slide-in cart panel triggered by the cart icon in the Navbar.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface Props {
  open: boolean
  onClose: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' DT'

export default function CartDrawer({ open, onClose }: Props) {
  const { items, subtotal, count, updateItem, removeItem, cartLoading } = useCart()

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          width: 420, maxWidth: '95vw',
          background: '#fff',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} color="#dc2626" />
            <h2 style={{ fontWeight: 800, fontSize: 16, color: '#111', margin: 0 }}>
              Your Cart
              {count > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 800,
                  background: '#dc2626', color: '#fff',
                  padding: '2px 8px', borderRadius: 999,
                }}>{count}</span>
              )}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 6, borderRadius: 8, color: '#94a3b8',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 64 }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 16px', display: 'block', color: '#e5e7eb' }} />
              <p style={{ fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>Your cart is empty</p>
              <button onClick={onClose} style={{
                marginTop: 20, padding: '10px 24px',
                background: '#dc2626', color: '#fff',
                fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
              }}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  {/* Image */}
                  <div style={{
                    width: 72, height: 72, borderRadius: 12, overflow: 'hidden',
                    background: '#f8fafc', flexShrink: 0, border: '1px solid #f1f5f9',
                  }}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={20} color="#cbd5e1" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </p>
                    {item.category && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px' }}>{item.category}</p>
                    )}
                    <p style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', margin: '0 0 10px' }}>
                      {fmt(item.price)}
                    </p>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          border: '1px solid #e5e7eb', background: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#64748b',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => item.quantity < item.stock ? updateItem(item.id, item.quantity + 1) : null}
                        disabled={item.quantity >= item.stock}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          border: '1px solid #e5e7eb', background: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer',
                          color: item.quantity >= item.stock ? '#e5e7eb' : '#64748b',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
                        {fmt(item.line_total)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#cbd5e1', padding: 4, borderRadius: 6,
                      transition: 'color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: '#64748b', fontSize: 14 }}>Subtotal</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: '#111' }}>{fmt(subtotal)}</span>
            </div>
            <Link href="/checkout" onClick={onClose} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px 20px',
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
              borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(220,38,38,0.35)',
            }}>
              Checkout <ArrowRight size={16} />
            </Link>
            <Link href="/cart" onClick={onClose} style={{
              display: 'block', textAlign: 'center', marginTop: 10,
              fontSize: 12, fontWeight: 700, color: '#64748b', textDecoration: 'none',
            }}>
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}