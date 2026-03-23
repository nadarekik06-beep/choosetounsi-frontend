'use client'

/**
 * app/cart/page.tsx  — Full cart page
 */

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' DT'

export default function CartPage() {
  const { items, subtotal, count, updateItem, removeItem, clearCart, cartLoading } = useCart()
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    if (!confirm('Clear your entire cart?')) return
    setClearing(true)
    await clearCart()
    setClearing(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .cart-row:hover { background: #fafafa; }
        .qty-btn:hover { border-color: #dc2626 !important; color: #dc2626 !important; }
        .remove-btn:hover { color: #ef4444 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Barlow', sans-serif" }}>

        {/* Header bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Continue Shopping
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>
              Shopping Cart {count > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>({count} items)</span>}
            </h1>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* ── Left: Items ── */}
          <div>
            {items.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, padding: '64px 24px', textAlign: 'center', border: '1px solid #eee' }}>
                <ShoppingBag size={56} style={{ margin: '0 auto 16px', display: 'block', color: '#e5e7eb' }} />
                <p style={{ fontWeight: 800, fontSize: 18, color: '#374151', margin: '0 0 8px' }}>Your cart is empty</p>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px' }}>Browse our products and add items you love.</p>
                <Link href="/shop" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px', background: '#dc2626', color: '#fff',
                  fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none',
                }}>
                  Start Shopping <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #eee', overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                  gap: 16, padding: '12px 24px',
                  background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8',
                }}>
                  <span>Product</span>
                  <span style={{ textAlign: 'center', minWidth: 120 }}>Quantity</span>
                  <span style={{ textAlign: 'right', minWidth: 90 }}>Price</span>
                  <span style={{ textAlign: 'right', minWidth: 100 }}>Total</span>
                </div>

                {items.map(item => (
                  <div key={item.id} className="cart-row" style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: 16, padding: '18px 24px', borderBottom: '1px solid #f8fafc',
                    alignItems: 'center', transition: 'background 0.15s',
                  }}>
                    {/* Product */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 68, height: 68, borderRadius: 12, overflow: 'hidden',
                        background: '#f8fafc', flexShrink: 0, border: '1px solid #f1f5f9',
                      }}>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingBag size={22} color="#e2e8f0" />
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/products/${item.slug}`} style={{ fontWeight: 700, fontSize: 14, color: '#111', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {item.name}
                        </Link>
                        {item.category && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{item.category}</p>}
                        {item.sku && <p style={{ fontSize: 10, color: '#cbd5e1', margin: '2px 0 0', fontFamily: 'monospace' }}>SKU: {item.sku}</p>}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="remove-btn"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#cbd5e1', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, justifyContent: 'center' }}>
                      <button
                        className="qty-btn"
                        onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb',
                          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#64748b', transition: 'all 0.15s',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 800, fontSize: 15, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => item.quantity < item.stock ? updateItem(item.id, item.quantity + 1) : null}
                        disabled={item.quantity >= item.stock}
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb',
                          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer',
                          color: item.quantity >= item.stock ? '#e5e7eb' : '#64748b', transition: 'all 0.15s',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Unit price */}
                    <div style={{ textAlign: 'right', minWidth: 90 }}>
                      <span style={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>{fmt(item.price)}</span>
                    </div>

                    {/* Line total */}
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <span style={{ fontWeight: 900, color: '#dc2626', fontSize: 15 }}>{fmt(item.line_total)}</span>
                    </div>
                  </div>
                ))}

                {/* Clear cart */}
                <div style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
                      padding: '7px 16px', fontSize: 12, fontWeight: 700, color: '#94a3b8',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Trash2 size={12} /> {clearing ? 'Clearing…' : 'Clear Cart'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Order summary ── */}
          {items.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #eee', padding: 24, position: 'sticky', top: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: 15, color: '#111', margin: '0 0 20px' }}>Order Summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                  <span>Subtotal ({count} items)</span>
                  <span style={{ fontWeight: 700 }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>Free</span>
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '14px 0', borderTop: '2px solid #f1f5f9', borderBottom: '2px solid #f1f5f9',
                marginBottom: 20,
              }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: '#dc2626' }}>{fmt(subtotal)}</span>
              </div>

              <Link href="/checkout" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 20px',
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.01em',
                borderRadius: 14, textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(220,38,38,0.3)',
              }}>
                Proceed to Checkout <ArrowRight size={17} />
              </Link>

              <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                🔒 Secure checkout
              </p>
            </div>
          )}
        </div>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 340px"] {
              grid-template-columns: 1fr !important;
            }
            div[style*="grid-template-columns: 1fr auto auto auto"] {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}