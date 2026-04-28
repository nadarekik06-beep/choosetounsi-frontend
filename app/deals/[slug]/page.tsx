'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, ChevronLeft, Heart, ShoppingCart,
  Zap, CheckCircle, Loader2, Shield, Truck,
  RotateCcw, Package2, TrendingDown, ZoomIn,
  AlertCircle, Tag,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'

const ORIGIN  = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL = `${ORIGIN}/api`

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${ORIGIN}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' TND'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantOption {
  id: number
  label: string
  stock: number
  price_override: number | null
  option_map: Record<string, { id: number; value: string; color_hex?: string | null; ids?: number[] }>
}

interface PackItemData {
  id: number
  product_id: number
  quantity: number
  allowed_variant_ids: number[] | null
  available_variants: VariantOption[]
  product: {
    id: number; name: string; slug: string
    price: number; primary_image_url: string | null
    has_variants: boolean
  } | null
}

interface PackDetail {
  id: number; name: string; slug: string
  description: string | null; short_description: string | null
  image_url: string | null
  pack_price: number; original_price: number; savings: number
  is_active: boolean
  seller: { id: number; name: string } | null
  items: PackItemData[]
  items_count: number
}

// ─── Gallery component (matches product detail page style) ────────────────────
function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [zoom,   setZoom]   = useState(false)
  const [pos,    setPos]    = useState({ x: 50, y: 50 })

  useEffect(() => { setActive(0) }, [images])

  const cur = images[active] ?? null

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>
      <div style={{ display: 'flex', gap: 12 }}>

        {/* Thumbnails column */}
        {images.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 72 }}>
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  width: 72, height: 72, borderRadius: 8,
                  overflow: 'hidden', padding: 0,
                  border: `2px solid ${active === i ? '#db142e' : '#e5e7eb'}`,
                  background: '#f8fafc', cursor: 'pointer',
                  transition: 'border-color 0.15s', flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              width: '100%', aspectRatio: '3/4',
              borderRadius: 16, overflow: 'hidden',
              background: '#f8fafc', border: '1px solid #f1f5f9',
              cursor: zoom ? 'zoom-out' : 'zoom-in',
              position: 'relative',
            }}
            onClick={() => setZoom(z => !z)}
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect()
              setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
            }}
            onMouseLeave={() => setZoom(false)}
          >
            {cur ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cur} alt={name}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transformOrigin: `${pos.x}% ${pos.y}%`,
                  transform: zoom ? 'scale(2.2)' : 'scale(1)',
                  transition: zoom ? 'none' : 'transform 0.3s ease',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package2 size={48} color="#e2e8f0" />
              </div>
            )}
            {!zoom && cur && (
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                background: 'rgba(0,0,0,0.45)', color: '#fff',
                borderRadius: 8, padding: '5px 8px',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600,
              }}>
                <ZoomIn size={13} /> Hover to zoom
              </div>
            )}
          </div>

          {/* Prev/Next arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setActive(i => (i - 1 + images.length) % images.length)}
                style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <ChevronLeft size={16} color="#374151" />
              </button>
              <button
                onClick={() => setActive(i => (i + 1) % images.length)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <ChevronRight size={16} color="#374151" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {images.map((_, i) => (
            <button
              key={i} onClick={() => setActive(i)}
              style={{
                width: i === active ? 20 : 7, height: 7,
                borderRadius: 999,
                background: i === active ? '#db142e' : '#e5e7eb',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single pack item row with variant selector ───────────────────────────────
function PackItemRow({
  item, selectedVariantId, onSelectVariant, hasError,
}: {
  item: PackItemData
  selectedVariantId: number | null | undefined
  onSelectVariant: (variantId: number | null) => void
  hasError: boolean
}) {
  const product = item.product
  if (!product) return null

  const selectedVariant = item.available_variants.find(v => v.id === selectedVariantId)
  const unitPrice       = selectedVariant?.price_override != null ? selectedVariant.price_override : product.price
  const needsVariant    = product.has_variants && item.available_variants.length > 0
  const variantChosen   = !needsVariant || selectedVariantId != null

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${hasError && !variantChosen ? '#fca5a5' : variantChosen ? '#e5e7eb' : '#e5e7eb'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Product header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        borderBottom: needsVariant ? '1px solid #f3f4f6' : 'none',
        background: '#fafafa',
      }}>
        {/* Thumbnail */}
        <div style={{
          width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
          flexShrink: 0, background: '#f1f5f9', border: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.primary_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImg(product.primary_image_url) ?? ''}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Package2 size={20} color="#d1d5db" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: '#0f172a',
            margin: '0 0 4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {product.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#db142e' }}>{fmt(unitPrice)}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#64748b',
              background: '#f1f5f9', border: '1px solid #e5e7eb',
              padding: '1px 7px', borderRadius: 999,
            }}>
              × {item.quantity}
            </span>
            {hasError && !variantChosen && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#dc2626',
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                padding: '1px 7px', borderRadius: 999,
              }}>
                ⚠ Select variant
              </span>
            )}
            {variantChosen && needsVariant && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#10b981',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                padding: '1px 7px', borderRadius: 999,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <CheckCircle size={9} /> Selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Variant selector */}
      {needsVariant && (
        <div style={{ padding: '12px 16px' }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px',
          }}>
            Choose variant
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {item.available_variants.map(v => {
              const chosen     = selectedVariantId === v.id
              const outOfStock = v.stock === 0
              const colorEntry = v.option_map?.['color']
              const price      = v.price_override != null ? v.price_override : product.price

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => !outOfStock && onSelectVariant(v.id)}
                  disabled={outOfStock}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '8px 12px', borderRadius: 10,
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    border: `2px solid ${chosen ? '#db142e' : '#e5e7eb'}`,
                    background: chosen ? 'rgba(219,20,46,0.05)' : outOfStock ? '#fafafa' : '#fff',
                    opacity: outOfStock ? 0.45 : 1,
                    transition: 'all 0.15s', textAlign: 'left', position: 'relative',
                    minWidth: 90,
                  }}
                >
                  {chosen && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#db142e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: '#fff', fontSize: 8, fontWeight: 900 }}>✓</span>
                    </div>
                  )}
                  {colorEntry && (
                    <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                      {(colorEntry.ids ?? [colorEntry.id]).slice(0, 3).map((cid: number, i: number) => (
                        <span key={i} style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: colorEntry.color_hex ?? '#e5e7eb',
                          border: '1.5px solid rgba(0,0,0,0.1)', display: 'inline-block',
                        }} />
                      ))}
                    </div>
                  )}
                  <p style={{
                    fontSize: 11, fontWeight: 700, margin: '0 0 2px',
                    color: chosen ? '#db142e' : '#374151',
                  }}>
                    {v.label}
                  </p>
                  <p style={{ fontSize: 10, margin: 0, color: '#94a3b8', fontWeight: 500 }}>
                    {fmt(price)} ·{' '}
                    <span style={{
                      color: outOfStock ? '#ef4444' : v.stock <= 5 ? '#f59e0b' : '#10b981',
                      fontWeight: 700,
                    }}>
                      {outOfStock ? 'Out of stock' : `${v.stock} left`}
                    </span>
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!needsVariant && (
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={13} color="#10b981" />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Ready to add — no variant needed</span>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params?.slug as string

  const { addToCart, cartLoading, isFavorited, toggleFavorite } = useCart()

  const [pack,          setPack]          = useState<PackDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(false)
  const [selections,    setSelections]    = useState<Record<number, number | null>>({})
  const [selectorError, setSelectorError] = useState(false)
  const [addingToCart,  setAddingToCart]  = useState(false)
  const [addedToCart,   setAddedToCart]   = useState(false)
  const [cartError,     setCartError]     = useState('')
  const [tab,           setTab]           = useState<'description' | 'items'>('description')

  // Fetch pack
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`${API_URL}/packs/${slug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const p: PackDetail = json.data
        setPack(p)
        // Auto-select single-option or no-variant items
        const auto: Record<number, number | null> = {}
        for (const item of p.items) {
          if (!item.product?.has_variants || item.available_variants.length === 0) {
            auto[item.id] = null
          } else if (item.available_variants.length === 1) {
            auto[item.id] = item.available_variants[0].id
          }
        }
        setSelections(auto)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  const allVariantsSelected = useCallback(() => {
    if (!pack) return false
    return pack.items.every(item => {
      const needsVariant = item.product?.has_variants && item.available_variants.length > 0
      return !needsVariant || selections[item.id] != null
    })
  }, [pack, selections])

  // Add all items to cart via existing CartContext
  const handleAddToCart = useCallback(async () => {
    if (!pack) return
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/deals/' + slug)
      return
    }
    if (!allVariantsSelected()) {
      setSelectorError(true)
      setCartError('Please select a variant for each item.')
      return
    }
    setSelectorError(false); setCartError(''); setAddingToCart(true)
    try {
      for (const item of pack.items) {
        if (!item.product) continue
        await addToCart(item.product.id, item.quantity, selections[item.id] ?? null)
      }
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 3000)
    } catch (err: any) {
      setCartError(err?.message ?? 'Failed to add some items.')
    } finally {
      setAddingToCart(false)
    }
  }, [pack, selections, allVariantsSelected, addToCart, router, slug])

  // Buy now: add to cart then go to checkout
  const handleBuyNow = useCallback(async () => {
    if (!pack) return
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/deals/' + slug)
      return
    }
    if (!allVariantsSelected()) {
      setSelectorError(true)
      setCartError('Please select a variant for each item.')
      return
    }
    setSelectorError(false); setCartError(''); setAddingToCart(true)
    try {
      for (const item of pack.items) {
        if (!item.product) continue
        await addToCart(item.product.id, item.quantity, selections[item.id] ?? null)
      }
      router.push('/checkout')
    } catch (err: any) {
      setCartError(err?.message ?? 'Failed to proceed.')
    } finally {
      setAddingToCart(false)
    }
  }, [pack, selections, allVariantsSelected, addToCart, router, slug])

  // Gallery: pack image + product thumbnails
  const galleryImages = pack
    ? [
        ...(pack.image_url ? [resolveImg(pack.image_url)!] : []),
        ...pack.items.map(i => resolveImg(i.product?.primary_image_url)).filter(Boolean) as string[],
      ].filter(Boolean)
    : []

  const savingsPct = pack && pack.original_price > 0
    ? Math.round((pack.savings / pack.original_price) * 100) : 0

  const totalItemsCount = pack?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  // Loading
  if (loading) return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#db142e', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading bundle…</p>
        </div>
      </div>
    </>
  )

  // Error
  if (error || !pack) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Package2 size={48} color="#d1d5db" style={{ margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>Bundle not found</p>
        <Link href="/deals" style={{ color: '#db142e', fontWeight: 700, fontSize: 14 }}>← Back to Deals</Link>
      </div>
    </div>
  )

  const favorited = isFavorited(pack.id)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .pd-thumb:hover { border-color: #db142e !important; }
        .pd-tab:hover   { color: #db142e !important; }
        .buy-btn:hover:not(:disabled) { background: rgba(219,20,46,0.06) !important; border-color: #b91c1c !important; }
        .fav-btn:hover { transform: scale(1.1) !important; }
        @media(max-width:900px) { .pd-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/deals" style={{ color: '#94a3b8', textDecoration: 'none' }}>Deals</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{pack.name}</span>
          </div>
        </div>

        {/* Main 2-col grid */}
        <div
          className="pd-grid"
          style={{
            maxWidth: 1280, margin: '0 auto',
            padding: '24px 24px 60px',
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 32, alignItems: 'start',
          }}
        >

          {/* ══ LEFT — Gallery ══ */}
          <Gallery images={galleryImages} name={pack.name} />

          {/* ══ RIGHT — Details ══ */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>

            {/* Bundle badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: '#db142e',
                background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)',
                padding: '3px 10px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Package2 size={11} /> Bundle Deal
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#64748b',
                background: '#f1f5f9', border: '1px solid #e5e7eb',
                padding: '3px 10px', borderRadius: 999,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Tag size={10} /> {pack.items_count} products · {totalItemsCount} items total
              </span>
            </div>

            {/* Title + Favorite */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.25, flex: 1 }}>
                {pack.name}
              </h1>
              <button
                className="fav-btn"
                onClick={() => toggleFavorite(pack.id)}
                style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${favorited ? '#db142e' : '#e5e7eb'}`,
                  background: favorited ? 'rgba(219,20,46,0.06)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Heart size={17} fill={favorited ? '#db142e' : 'none'} stroke={favorited ? '#db142e' : '#94a3b8'} strokeWidth={2} />
              </button>
            </div>

            {/* Seller */}
            {pack.seller && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#db142e,#7f1d1d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 800,
                }}>
                  {pack.seller.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  Bundle by <strong style={{ color: '#db142e' }}>{pack.seller.name}</strong>
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#db142e',
                  background: 'rgba(219,20,46,0.08)', border: '1px solid rgba(219,20,46,0.2)',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  Verified
                </span>
              </div>
            )}

            {/* Short description */}
            {pack.short_description && (
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 18px', fontWeight: 500 }}>
                {pack.short_description}
              </p>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 18px' }} />

            {/* Pricing */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#db142e', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmt(pack.pack_price)}
                </span>
                {pack.original_price > pack.pack_price && (
                  <span style={{ fontSize: 16, color: '#94a3b8', textDecoration: 'line-through', fontWeight: 500 }}>
                    {fmt(pack.original_price)}
                  </span>
                )}
              </div>
              {pack.savings > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 800, color: '#10b981',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  padding: '4px 12px', borderRadius: 999,
                }}>
                  <TrendingDown size={13} />
                  Save {fmt(pack.savings)} ({savingsPct}%)
                </div>
              )}
            </div>

            {/* Pack items — variant selectors */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 12px',
              }}>
                What's in this bundle — select your variants
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pack.items.map(item => (
                  <PackItemRow
                    key={item.id}
                    item={item}
                    selectedVariantId={selections[item.id]}
                    hasError={selectorError}
                    onSelectVariant={variantId => {
                      setSelectorError(false); setCartError('')
                      setSelections(prev => ({ ...prev, [item.id]: variantId }))
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {cartError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: '#dc2626', fontWeight: 600,
                marginBottom: 14,
              }}>
                <AlertCircle size={14} /> {cartError}
              </div>
            )}

            {/* CTA Buttons — same style as product page */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
              {/* Buy Now */}
              <button
                className="buy-btn"
                onClick={handleBuyNow}
                disabled={addingToCart || cartLoading}
                style={{
                  flex: 1, height: 52,
                  background: '#fff', color: '#db142e',
                  border: '2px solid #db142e', borderRadius: 12,
                  cursor: addingToCart ? 'wait' : 'pointer',
                  fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  opacity: addingToCart ? 0.7 : 1,
                }}
              >
                {addingToCart
                  ? <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <><Zap size={16} /> Buy Now</>
                }
              </button>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || cartLoading}
                style={{
                  flex: 1, height: 52,
                  background: addedToCart
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'linear-gradient(135deg,#db142e,#b91c1c)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  cursor: addingToCart ? 'wait' : 'pointer',
                  fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: addedToCart
                    ? '0 8px 24px rgba(16,185,129,0.3)'
                    : '0 8px 24px rgba(219,20,46,0.3)',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  opacity: addingToCart ? 0.7 : 1,
                }}
              >
                {addingToCart
                  ? <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : addedToCart
                    ? <><CheckCircle size={17} /> Added to Cart!</>
                    : <><ShoppingCart size={17} /> Add to Cart</>
                }
              </button>

              {/* Favorite */}
              <button
                className="fav-btn"
                onClick={() => toggleFavorite(pack.id)}
                style={{
                  width: 52, height: 52, flexShrink: 0,
                  borderRadius: '50%',
                  border: `2px solid ${favorited ? '#db142e' : '#e5e7eb'}`,
                  background: favorited ? 'rgba(219,20,46,0.06)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Heart size={20} fill={favorited ? '#db142e' : 'none'} stroke={favorited ? '#db142e' : '#94a3b8'} strokeWidth={2} />
              </button>
            </div>

            {/* Trust badges — same as product page */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
              {[
                { icon: <Truck size={17} color="#10b981" />,       title: 'Free Delivery',   desc: 'On orders over 50 DT across Tunisia' },
                { icon: <RotateCcw size={17} color="#3b82f6" />,   title: 'Easy Returns',    desc: '30-day hassle-free return policy' },
                { icon: <Shield size={17} color="#f59e0b" />,      title: 'Secure Payment',  desc: 'Your transaction is fully protected' },
                { icon: <CheckCircle size={17} color="#db142e" />, title: 'Verified Bundle', desc: 'All sellers are reviewed by our team' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px', borderBottom: '1px solid #f8fafc',
                }}>
                  <div style={{ flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 13, color: '#111', margin: '0 0 1px' }}>{title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs — Description / Items */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                {([
                  { key: 'description', label: 'Description' },
                  { key: 'items',       label: `Items (${pack.items_count})` },
                ] as { key: 'description' | 'items'; label: string }[]).map(t => (
                  <button
                    key={t.key}
                    className="pd-tab"
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1, height: 44, border: 'none', background: 'transparent',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      color: tab === t.key ? '#db142e' : '#94a3b8',
                      borderBottom: `2px solid ${tab === t.key ? '#db142e' : 'transparent'}`,
                      transition: 'color 0.15s', fontFamily: 'inherit',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '16px 20px' }}>
                {tab === 'description' && (
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, fontWeight: 500, whiteSpace: 'pre-line' }}>
                    {pack.description || pack.short_description || 'No description available.'}
                  </p>
                )}
                {tab === 'items' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pack.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                          flexShrink: 0, background: '#f1f5f9', border: '1px solid #e5e7eb',
                        }}>
                          {item.product?.primary_image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImg(item.product.primary_image_url) ?? ''}
                              alt={item.product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product?.name}
                          </p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                            Qty: {item.quantity} · {fmt(item.product?.price ?? 0)}
                          </p>
                        </div>
                        {item.product?.slug && (
                          <Link
                            href={`/products/${item.product.slug}`}
                            style={{ fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}