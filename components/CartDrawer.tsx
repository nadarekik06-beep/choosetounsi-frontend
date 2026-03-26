'use client'

/**
 * components/CartDrawer.tsx
 * Slide-in cart drawer — opens automatically after "Add to Cart".
 * Inspired by SHEIN-style overlay panel.
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart, Package } from 'lucide-react'
import { useCart } from '@/context/CartContext'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' DT'

export default function CartDrawer() {
  const {
    items, subtotal, count,
    updateItem, removeItem,
    drawerOpen, closeDrawer,
  } = useCart()

  const drawerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDrawer])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');

        @keyframes drawerSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cd-item { animation: itemFadeIn 0.25s ease both; }

        .cd-qty-btn {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748b;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .cd-qty-btn:hover:not(:disabled) {
          border-color: #dc2626 !important;
          color: #dc2626 !important;
          background: rgba(220,38,38,0.04) !important;
        }
        .cd-qty-btn:disabled { cursor: not-allowed; color: #e5e7eb; }

        .cd-remove-btn {
          background: transparent; border: none; cursor: pointer;
          color: #d1d5db; padding: 6px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease; flex-shrink: 0;
        }
        .cd-remove-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.07) !important; }

        .cd-checkout-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 14px 20px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff; font-weight: 800; font-size: 14px;
          letter-spacing: 0.02em; border-radius: 13px;
          text-decoration: none; border: none; cursor: pointer;
          box-shadow: 0 8px 24px rgba(220,38,38,0.3);
          transition: all 0.2s ease; font-family: 'Barlow', sans-serif;
        }
        .cd-checkout-btn:hover {
          box-shadow: 0 12px 32px rgba(220,38,38,0.45);
          transform: translateY(-1px);
        }

        .cd-viewcart-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          width: 100%; padding: 11px 20px;
          background: transparent;
          color: #374151; font-weight: 700; font-size: 13px;
          border-radius: 11px; border: 1.5px solid #e5e7eb;
          text-decoration: none; cursor: pointer;
          transition: all 0.18s ease; font-family: 'Barlow', sans-serif;
        }
        .cd-viewcart-btn:hover {
          border-color: #374151;
          background: #f8fafc;
        }

        .cd-item-img {
          width: 74px; height: 74px; border-radius: 11px;
          overflow: hidden; background: #f8fafc;
          flex-shrink: 0; border: 1px solid #f1f5f9;
        }

        .cd-close-btn {
          width: 34px; height: 34px; border-radius: 9px;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748b;
          transition: all 0.15s ease;
        }
        .cd-close-btn:hover { border-color: #dc2626; color: #dc2626; }

        .cd-scrollarea::-webkit-scrollbar { width: 4px; }
        .cd-scrollarea::-webkit-scrollbar-track { background: transparent; }
        .cd-scrollarea::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
        .cd-scrollarea::-webkit-scrollbar-thumb:hover { background: #dc2626; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      <div
        onClick={closeDrawer}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          animation: drawerOpen ? 'backdropFadeIn 0.3s ease' : 'none',
        }}
      />

      {/* ── Drawer panel ─────────────────────────────────────── */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 999,
          width: 430, maxWidth: '96vw',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0, 0.16, 1)',
          fontFamily: "'Barlow', sans-serif",
          borderLeft: '1px solid rgba(0,0,0,0.05)',
        }}
      >

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 16px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(220,38,38,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={17} color="#dc2626" />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 15, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Shopping Cart
              </h2>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                {count > 0 ? `${count} item${count > 1 ? 's' : ''} in your cart` : 'Your cart is empty'}
              </p>
            </div>
          </div>
          <button onClick={closeDrawer} className="cd-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* ── Items list ── */}
        <div
          className="cd-scrollarea"
          style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}
        >
          {items.length === 0 ? (

            /* Empty state */
            <div style={{ textAlign: 'center', paddingTop: 72 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: '#f8fafc', border: '2px dashed #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <ShoppingBag size={32} color="#e2e8f0" />
              </div>
              <p style={{ fontWeight: 800, color: '#374151', fontSize: 15, margin: '0 0 6px' }}>
                Nothing here yet
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 28px', fontWeight: 500 }}>
                Add some products and they'll show up here.
              </p>
              <button
                onClick={closeDrawer}
                className="cd-checkout-btn"
                style={{ maxWidth: 200, margin: '0 auto' }}
              >
                Keep Shopping
              </button>
            </div>

          ) : (

            /* Item rows */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {items.map((item, i) => (
                <div
                  key={item.id}
                  className="cd-item"
                  style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '14px 0',
                    borderBottom: '1px solid #f8fafc',
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Image */}
                  <div className="cd-item-img">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Package size={22} color="#cbd5e1" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Name */}
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeDrawer}
                      style={{
                        fontWeight: 700, fontSize: 13, color: '#0f172a',
                        textDecoration: 'none', display: 'block',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 2,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#0f172a')}
                    >
                      {item.name}
                    </Link>

                    {/* Category */}
                    {item.category && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px', fontWeight: 600 }}>
                        {item.category}
                      </p>
                    )}

                    {/* Price row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: '#dc2626' }}>
                        {fmt(item.price)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        = {fmt(item.line_total)}
                      </span>
                    </div>

                    {/* Qty controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="cd-qty-btn"
                        onClick={() =>
                          item.quantity > 1
                            ? updateItem(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                      >
                        <Minus size={11} />
                      </button>

                      <span style={{
                        fontWeight: 800, fontSize: 14,
                        minWidth: 24, textAlign: 'center', color: '#111',
                      }}>
                        {item.quantity}
                      </span>

                      <button
                        className="cd-qty-btn"
                        onClick={() =>
                          item.quantity < item.stock
                            ? updateItem(item.id, item.quantity + 1)
                            : null
                        }
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus size={11} />
                      </button>

                      {item.stock <= 5 && (
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          color: '#f59e0b', marginLeft: 4,
                        }}>
                          {item.stock} left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    className="cd-remove-btn"
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div style={{
            padding: '16px 22px 22px',
            borderTop: '1px solid #f1f5f9',
            flexShrink: 0,
            background: '#fff',
          }}>

            {/* Free shipping nudge */}
            <div style={{
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 10, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 14 }}>🚚</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                Free shipping on your order!
              </span>
            </div>

            {/* Subtotal */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14,
            }}>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Subtotal ({count} items)
                </p>
              </div>
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {fmt(subtotal)}
              </span>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/checkout" onClick={closeDrawer} className="cd-checkout-btn">
                Checkout <ArrowRight size={16} />
              </Link>
              <Link href="/cart" onClick={closeDrawer} className="cd-viewcart-btn">
                <ShoppingBag size={14} />
                View Full Cart
              </Link>
            </div>

            {/* Secure badge */}
            <p style={{
              fontSize: 11, color: '#94a3b8', textAlign: 'center',
              marginTop: 12, marginBottom: 0, fontWeight: 600,
            }}>
              🔒 Secure & encrypted checkout
            </p>
          </div>
        )}
      </div>
    </>
  )
}