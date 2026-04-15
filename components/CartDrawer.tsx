'use client'

/**
 * components/CartDrawer.tsx
 * Slide-in cart drawer with per-item selection for checkout.
 * Selected item IDs are written to sessionStorage (ct_selected_items)
 * before navigating to /checkout — identical handoff as cart/page.tsx.
 *
 * CHANGES vs previous version:
 *   - CartRow now uses loadingItemId (from CartContext) instead of the
 *     global cartLoading flag — so only the specific item being updated
 *     is disabled, not the entire cart.
 *   - Plus button is disabled when item.quantity >= item.stock (unchanged)
 *     AND when this specific item is loading (was: any item loading).
 *   - Loader spinner shown on the quantity number when item is busy.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X, ShoppingCart, Trash2, Plus, Minus,
  ArrowRight, Package, CheckSquare, Square, Loader2,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import type { CartItem } from '@/lib/shopApi'

// ─── Shared sessionStorage key ────────────────────────────────────────────────
const SELECTED_ITEMS_KEY = 'ct_selected_items'

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

function CartRow({
  item,
  isSelected,
  onToggle,
}: {
  item: CartItem
  isSelected: boolean
  onToggle: (id: number) => void
}) {
  // ── KEY CHANGE: use loadingItemId instead of global cartLoading ──────────
  const { updateItem, removeItem, cartLoading, loadingItemId } = useCart()
  const imgSrc = resolveImg(item.image_url)

  // This item is "busy" only if IT specifically is being updated/removed.
  // Other items in the cart remain fully interactive.
  const itemBusy = loadingItemId === item.id

  const variantEntries = item.variant_options
    ? Object.values(item.variant_options)
    : []

  const atStockLimit = item.quantity >= item.stock

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '14px 0',
      borderBottom: '1px solid #f1f5f9',
      opacity: isSelected ? 1 : 0.45,
      transition: 'opacity 0.15s',
    }}>

      {/* ── Checkbox ── */}
      <button
        onClick={() => onToggle(item.id)}
        title={isSelected ? 'Deselect item' : 'Select item'}
        style={{
          background: 'none', border: 'none', padding: '0 2px',
          cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
          marginTop: 2,
          color: isSelected ? '#dc2626' : '#cbd5e1',
          transition: 'color 0.15s',
        }}
      >
        {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
      </button>

      {/* Thumbnail */}
      <div style={{
        width: 68, height: 68, flexShrink: 0,
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
        <Link
          href={`/products/${item.slug}`}
          style={{
            fontSize: 13, fontWeight: 700, color: '#0f172a',
            textDecoration: 'none', lineHeight: 1.3, display: 'block',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </Link>

        {/* Variant label */}
        {item.variant_label && (
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
            {item.variant_label}
          </p>
        )}

        {/* Color swatches */}
        {variantEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {variantEntries.map((opt, i) =>
              opt.color_hex ? (
                <span
                  key={i}
                  title={opt.value}
                  style={{
                    display: 'inline-block', width: 12, height: 12,
                    borderRadius: '50%', background: opt.color_hex,
                    border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0,
                  }}
                />
              ) : (
                <span key={i} style={{
                  fontSize: 10, color: '#94a3b8', background: '#f1f5f9',
                  padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                }}>
                  {opt.value}
                </span>
              )
            )}
          </div>
        )}

        {/* Stock limit warning */}
        {atStockLimit && (
          <p style={{
            fontSize: 10, color: '#d97706', fontWeight: 700,
            margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            Max quantity reached ({item.stock} available)
          </p>
        )}

        {/* Price + qty controls */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
            {fmt(item.price)}
          </span>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Minus / remove */}
            <button
              onClick={() => item.quantity > 1
                ? updateItem(item.id, item.quantity - 1)
                : removeItem(item.id)
              }
              disabled={itemBusy}
              style={{
                width: 28, height: 28, border: 'none', background: '#f8fafc',
                cursor: itemBusy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: itemBusy ? '#cbd5e1' : '#374151',
                transition: 'background 0.15s',
              }}
            >
              <Minus size={11} />
            </button>

            {/* Quantity display — shows spinner when this item is busy */}
            <span style={{
              width: 32, textAlign: 'center', fontSize: 13, fontWeight: 700,
              color: '#111', borderLeft: '1px solid #e5e7eb',
              borderRight: '1px solid #e5e7eb', lineHeight: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 28,
            }}>
              {itemBusy
                ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626' }} />
                : item.quantity
              }
            </span>

            {/* Plus */}
            <button
              onClick={() => updateItem(item.id, item.quantity + 1)}
              disabled={itemBusy || atStockLimit}
              title={atStockLimit ? `Only ${item.stock} in stock` : 'Increase quantity'}
              style={{
                width: 28, height: 28, border: 'none', background: '#f8fafc',
                cursor: (itemBusy || atStockLimit) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: (itemBusy || atStockLimit) ? '#e5e7eb' : '#374151',
                transition: 'background 0.15s',
              }}
            >
              <Plus size={11} />
            </button>
          </div>
        </div>

        {/* Line total + remove */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 6,
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
            {item.quantity} × {fmt(item.price)} = <strong style={{ color: '#374151' }}>{fmt(item.line_total)}</strong>
          </span>
          <button
            onClick={() => removeItem(item.id)}
            disabled={itemBusy}
            style={{
              background: 'none', border: 'none', cursor: itemBusy ? 'not-allowed' : 'pointer',
              color: '#ef4444', padding: '2px 4px', borderRadius: 4,
              opacity: itemBusy ? 0.3 : 0.7, transition: 'opacity 0.15s',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const router = useRouter()
  const { items, count, subtotal, drawerOpen, closeDrawer, clearCart, cartLoading } = useCart()
  const overlayRef = useRef<HTMLDivElement>(null)

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())

  // Sync selection when items change: new items auto-selected, removed ones cleaned up
  useEffect(() => {
    if (cartLoading) return
    setSelectedIds(prev => {
      const next = new Set<number>()
      items.forEach(item => {
        if (!prev.size || prev.has(item.id)) next.add(item.id)
      })
      return next
    })
  }, [items, cartLoading])

  const allSelected  = items.length > 0 && selectedIds.size === items.length
  const noneSelected = selectedIds.size === 0

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map(i => i.id)))
  }, [allSelected, items])

  const toggleItem = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Derived totals for selected items only
  const selectedItems    = items.filter(i => selectedIds.has(i.id))
  const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.line_total, 0)
  const selectedCount    = selectedItems.reduce((sum, i) => sum + i.quantity, 0)

  // ── Checkout navigation ────────────────────────────────────────────────────
  const handleCheckout = useCallback(() => {
    if (noneSelected) return
    sessionStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify([...selectedIds]))
    closeDrawer()
    router.push('/checkout')
  }, [selectedIds, noneSelected, closeDrawer, router])

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
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes spin    { to   { transform: rotate(360deg) } }
        .cb-btn:hover { color: #dc2626 !important; }
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

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(220,38,38,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <button
            onClick={closeDrawer}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid #f1f5f9', background: '#f8fafc',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Select-all bar ── */}
        {items.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 20px', borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc', flexShrink: 0,
          }}>
            <button
              onClick={toggleAll}
              className="cb-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, fontFamily: 'inherit',
                color: allSelected ? '#dc2626' : '#64748b',
                fontSize: 12, fontWeight: 700,
                transition: 'color 0.15s',
              }}
            >
              {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              {noneSelected
                ? 'None selected'
                : selectedIds.size === items.length
                  ? 'All selected'
                  : `${selectedIds.size} of ${items.length} selected`
              }
            </span>
          </div>
        )}

        {/* ── Items ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <ShoppingCart size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>Your cart is empty</p>
              <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 20px' }}>Add some products to get started</p>
              <button
                onClick={closeDrawer}
                style={{
                  fontSize: 13, fontWeight: 700, color: '#dc2626',
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8, padding: '8px 18px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {items.map(item => (
                <CartRow
                  key={`${item.id}-${item.variant_id ?? 'base'}`}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggle={toggleItem}
                />
              ))}

              {items.length > 1 && (
                <button
                  onClick={clearCart}
                  disabled={cartLoading}
                  style={{
                    width: '100%', marginTop: 8, marginBottom: 4, padding: '8px',
                    border: '1px solid #fee2e2', background: '#fff',
                    color: '#ef4444', fontSize: 12, fontWeight: 700,
                    borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'inherit', opacity: cartLoading ? 0.5 : 1,
                  }}
                >
                  Clear all items
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div style={{
            borderTop: '1px solid #f1f5f9', padding: '16px 20px',
            flexShrink: 0, background: '#fff',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 4,
            }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                {selectedIds.size > 0 && selectedIds.size < items.length
                  ? `Selected (${selectedCount} of ${count} items)`
                  : `Subtotal (${count} items)`
                }
              </span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
                {fmt(selectedIds.size > 0 ? selectedSubtotal : subtotal)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px', fontWeight: 500 }}>
              Shipping calculated at checkout
            </p>

            {selectedIds.size > 0 && selectedIds.size < items.length && (
              <div style={{
                marginBottom: 12, padding: '8px 12px',
                background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.15)',
                borderRadius: 8, fontSize: 11,
                color: '#b91c1c', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <CheckSquare size={12} />
                Only {selectedIds.size} selected item{selectedIds.size > 1 ? 's' : ''} will be checked out.
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={noneSelected}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 0',
                background: noneSelected
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: noneSelected ? '#9ca3af' : '#fff',
                fontWeight: 800, fontSize: 14, border: 'none',
                borderRadius: 12, cursor: noneSelected ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: noneSelected ? 'none' : '0 6px 20px rgba(220,38,38,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {noneSelected
                ? 'Select items to checkout'
                : <>Proceed to Checkout <ArrowRight size={16} /></>
              }
            </button>

            <button
              onClick={closeDrawer}
              style={{
                width: '100%', marginTop: 10, padding: '10px 0',
                border: '1px solid #e5e7eb', background: '#fff',
                color: '#374151', fontSize: 13, fontWeight: 700,
                borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}