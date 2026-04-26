'use client'

/**
 * app/products/[slug]/page.tsx
 * ChooseTounsi — Product detail page with variant image switching.
 *
 * FIXES applied in this version
 * ──────────────────────────────
 * FIX A  (duplicate React key `104`)
 *   Both the color-axis map and the non-color-axis map now use a
 *   compound key  `${axis.slug}-${opt.id}`  instead of bare `opt.id`.
 *
 * FIX B  (isOptionAvailable broken for multi-color groups)
 *   selectedOptions['color'] stores the primary color option ID.
 *   Variant matching uses mapEntry.id === sel (primary id match).
 *
 * FIX C  (multi-color swatch shows color circles instead of uploaded image)
 *   BEFORE: `isGroup` (swatches.length > 1) caused color circles to always
 *           render, and `primary_image` was only shown when `!isGroup`.
 *           So multi-color variants NEVER showed their uploaded image even
 *           when opt.primary_image was correctly populated by the backend.
 *   AFTER:  If opt.primary_image exists → always show the image (single or
 *           multi-color). Only fall back to color circles when there is no
 *           image. The button shape stays pill for groups, circle for singles.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, ShoppingCart, ChevronRight, Star, Shield, Truck,
  RotateCcw, Share2, Minus, Plus, ZoomIn, ChevronLeft,
  CheckCircle, Loader2, Tag, Zap,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { isAuthenticated, getUser } from '@/lib/auth'
import type { ProductVariant, SelectableAxis } from '@/lib/shopApi'
import ProductRecommendations from 'app/components/ProductRecommendations'
const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL      = `${STORAGE_BASE}/api`

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number | string) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(n)) + ' DT'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: number; image_path: string; is_primary: boolean; url?: string
  variant_id?: number | null; color_option_id?: number | null
}

interface AttributeData {
  slug: string; name: string; type: string; value: any; label: string
}

interface Product {
  id: number; name: string; slug: string; description: string | null
  short_description: string | null; price: string | number; stock: number
  sku: string | null; views: number; is_approved: boolean; is_active: boolean
  featured: boolean; primary_image_url: string | null; images: ProductImage[]
  category: { id: number; name: string; slug: string } | null
  subcategory: { id: number; name: string; slug: string } | null
  seller: { id: number; name: string; email: string } | null
  attribute_data?: Record<string, AttributeData>
  has_variants: boolean
  variants: (ProductVariant & {
    color_option_id?: number | null
    image_urls: string[]
    primary_image_url?: string | null
  })[]
  selectable_axes: (SelectableAxis & {
    options: (SelectableAxis['options'][0] & {
      primary_image?: string | null
      ids?: number[]
      swatches?: { id: number; value: string; color_hex?: string | null }[]
    })[]
  })[]
  color_images: Record<string, string[]>
}

// ─── Attribute Display ────────────────────────────────────────────────────────

function AttributeRow({ attr }: { attr: AttributeData }) {
  if (attr.type === 'color') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', minWidth: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{attr.name}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {attr.label.split(', ').map((color, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#f8fafc', padding: '2px 8px', borderRadius: 999, border: '1px solid #e5e7eb' }}>{color}</span>
          ))}
        </div>
      </div>
    )
  }
  if (attr.type === 'boolean') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{attr.name}</span>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: attr.value ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: attr.value ? '#10b981' : '#ef4444' }}>
          {attr.value ? 'Yes' : 'No'}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{attr.name}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{attr.label || '—'}</span>
    </div>
  )
}

// ─── VariantSelector ──────────────────────────────────────────────────────────

function VariantSelector({
  axes, selectedOptions, onSelect, isOptionAvailable, selectorError,
}: {
  axes: Product['selectable_axes']
  selectedOptions: Record<string, number>
  onSelect: (axisSlug: string, optionId: number) => void
  isOptionAvailable: (axisSlug: string, optionId: number) => boolean
  selectorError: boolean
}) {
  if (axes.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
      {axes.map(axis => (
        <div key={axis.slug}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 }}>
            {axis.name}
            {selectedOptions[axis.slug] !== undefined && (
              <span style={{ color: '#374151', marginLeft: 6, textTransform: 'none', fontWeight: 600 }}>
                — {axis.options.find(o => o.id === selectedOptions[axis.slug])?.value}
              </span>
            )}
          </p>

          {axis.type === 'color' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {axis.options.map(opt => {
                const chosen    = selectedOptions[axis.slug] === opt.id
                const available = isOptionAvailable(axis.slug, opt.id)
                const swatches  = (opt as any).swatches ?? [{ id: opt.id, value: opt.value, color_hex: opt.color_hex }]
                const isGroup   = swatches.length > 1

                // ── FIX C ────────────────────────────────────────────────────
                // hasImage is true for both single-color and multi-color options
                // as long as the backend populated primary_image.
                // Priority: show image > show color circles > show plain circle.
                const hasImage = !!opt.primary_image

                return (
                  <button
                    key={`${axis.slug}-${opt.id}`}
                    type="button"
                    onClick={() => available && onSelect(axis.slug, opt.id)}
                    title={opt.value}
                    style={{
                      position:       'relative',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      // Shape: pill for groups without image, circle otherwise
                      width:          (isGroup && !hasImage) ? 'auto' : 34,
                      height:         34,
                      padding:        (isGroup && !hasImage) ? '0 8px' : 0,
                      gap:            4,
                      borderRadius:   (isGroup && !hasImage) ? 999 : '50%',
                      cursor:         available ? 'pointer' : 'not-allowed',
                      // Background: transparent when image will cover it, else color
                      background:     hasImage
                                        ? '#f0f0f0'
                                        : isGroup
                                          ? '#f8fafc'
                                          : (opt.color_hex ?? '#e5e7eb'),
                      border:         chosen ? '3px solid #dc2626' : '2px solid #e5e7eb',
                      outline:        chosen ? '2px solid #fff' : 'none',
                      outlineOffset:  '-4px',
                      opacity:        available ? 1 : 0.35,
                      transition:     'all 0.15s',
                      flexShrink:     0,
                      overflow:       'hidden',
                    }}
                  >
                    {/* ── FIX C: image takes priority, works for both single and multi-color ── */}
                    {hasImage ? (
                      <img
                        src={opt.primary_image!}
                        alt={opt.value}
                        style={{
                          position:      'absolute',
                          inset:         chosen ? 3 : 2,   // shrinks slightly when border is thicker
                          borderRadius:  '50%',
                          width:         chosen ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
                          height:        chosen ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
                          objectFit:     'cover',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : isGroup ? (
                      // No image uploaded + multi-color → show color circles (original behaviour)
                      swatches.map((s: { id: number; value: string; color_hex?: string | null }) => (
                        <span
                          key={s.id}
                          title={s.value}
                          style={{
                            display:      'inline-block',
                            width:        16,
                            height:       16,
                            borderRadius: '50%',
                            flexShrink:   0,
                            background:   s.color_hex ?? '#e5e7eb',
                            border:       '1.5px solid rgba(0,0,0,0.10)',
                          }}
                        />
                      ))
                    ) : null
                    // Single-color with no image → background colour of the button itself is enough
                    }

                    {!available && (
                      <svg
                        viewBox="0 0 34 34"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                      >
                        <line x1="5" y1="29" x2="29" y2="5" stroke="#fff" strokeWidth="2" opacity="0.8" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {axis.options.map(opt => {
                const chosen    = selectedOptions[axis.slug] === opt.id
                const available = isOptionAvailable(axis.slug, opt.id)
                return (
                  <button
                    key={`${axis.slug}-${opt.id}`}
                    type="button"
                    onClick={() => available && onSelect(axis.slug, opt.id)}
                    style={{
                      padding:        '6px 14px',
                      borderRadius:   8,
                      cursor:         available ? 'pointer' : 'not-allowed',
                      border:         chosen ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                      background:     chosen ? 'rgba(220,38,38,0.06)' : '#f8fafc',
                      color:          chosen ? '#dc2626' : available ? '#374151' : '#d1d5db',
                      fontSize:       13,
                      fontWeight:     chosen ? 700 : 500,
                      opacity:        available ? 1 : 0.5,
                      textDecoration: available ? 'none' : 'line-through',
                      transition:     'all 0.15s',
                      fontFamily:     'inherit',
                    }}
                  >
                    {opt.value}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {selectorError && (
        <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
          Please select {axes.filter(a => selectedOptions[a.slug] === undefined).map(a => a.name).join(' and ')} before proceeding.
        </p>
      )}
    </div>
  )
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery({ images, productName }: { images: string[]; productName: string }) {
  const [active, setActive]   = useState(0)
  const [zoom, setZoom]       = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  useEffect(() => { setActive(0) }, [images])

  const cur = images[active] ?? null

  return (
    <div style={{ animation: 'fadeUp 0.4s ease both' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {images.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 72 }}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setActive(i)} className="thumb"
                style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: `2px solid ${active === i ? '#dc2626' : '#e5e7eb'}`, background: '#f8fafc', cursor: 'pointer', padding: 0, transition: 'border-color 0.15s', flexShrink: 0 }}>
                {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }} />}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{ width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', cursor: zoom ? 'zoom-out' : 'zoom-in', position: 'relative' }}
            onClick={() => setZoom(z => !z)}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setZoomPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
            onMouseLeave={() => setZoom(false)}
          >
            {cur
              ? <img src={cur} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: zoom ? 'scale(2.2)' : 'scale(1)', transition: zoom ? 'none' : 'transform 0.3s ease' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="48" height="48" fill="none" stroke="#e2e8f0" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
            }
            {!zoom && cur && <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}><ZoomIn size={13} /> Hover to zoom</div>}
          </div>

          {images.length > 1 && (
            <>
              <button onClick={() => setActive(i => (i - 1 + images.length) % images.length)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <ChevronLeft size={16} color="#374151" />
              </button>
              <button onClick={() => setActive(i => (i + 1) % images.length)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <ChevronRight size={16} color="#374151" />
              </button>
            </>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{ width: i === active ? 20 : 7, height: 7, borderRadius: 999, background: i === active ? '#dc2626' : '#e5e7eb', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params?.slug as string

  const { addToCart, isFavorited, toggleFavorite, cartLoading } = useCart()

  const [product,      setProduct]     = useState<Product | null>(null)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState(false)
  const [quantity,     setQuantity]    = useState(1)
  const [addedToCart,  setAddedToCart] = useState(false)
  const [tab,          setTab]         = useState<'description' | 'details' | 'attributes'>('description')
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [selectorError,   setSelectorError]   = useState(false)

  const [buyNowLoading,   setBuyNowLoading]   = useState(false)
  const buyNowRef = useRef(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setSelectedOptions({})
    fetch(`${API_URL}/products/${slug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const prod: Product = json.data
        setProduct(prod)

        if (prod.has_variants && prod.selectable_axes?.length > 0) {
          const autoSelections: Record<string, number> = {}
          for (const axis of prod.selectable_axes) {
            if (axis.options.length === 1) {
              autoSelections[axis.slug] = axis.options[0].id
            }
          }
          if (Object.keys(autoSelections).length > 0) {
            setSelectedOptions(autoSelections)
          }
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  // ── Variant derived values ─────────────────────────────────────────────────
  const axes        = product?.selectable_axes ?? []
  const variants    = product?.variants ?? []
  const hasVariants = product?.has_variants ?? false

  const selectedVariant = (() => {
    if (!hasVariants || axes.length === 0) return undefined
    if (Object.keys(selectedOptions).length < axes.length) return undefined
    return variants.find(v =>
      axes.every(axis => {
        const sel      = selectedOptions[axis.slug]
        const mapEntry = v.option_map[axis.slug]
        if (!mapEntry) return false
        return mapEntry.id === sel
      })
    )
  })()

  const isOptionAvailable = useCallback((axisSlug: string, optionId: number): boolean => {
    return variants.some(v => {
      const entry = v.option_map[axisSlug]
      if (!entry) return false
      if (entry.id !== optionId) return false
      return Object.entries(selectedOptions).every(([slug, selId]) => {
        if (slug === axisSlug) return true
        const otherEntry = v.option_map[slug]
        return otherEntry?.id === selId
      })
    })
  }, [variants, selectedOptions])

  const galleryImages = (() => {
    const colorAxis       = axes.find(a => a.type === 'color')
    const selectedColorId = colorAxis ? selectedOptions[colorAxis.slug] : undefined

    if (selectedVariant && selectedVariant.image_urls.length > 0) {
      return selectedVariant.image_urls
    }

    if (selectedColorId !== undefined) {
      const selectedOpt = colorAxis?.options.find((o: any) => o.id === selectedColorId)

      const groupKey =
        (selectedOpt as any)?.group_key ??
        (selectedOpt as any)?.ids?.join('|') ??
        String(selectedColorId)

      const imgs =
        product?.color_images?.[groupKey] ??
        product?.color_images?.[String(selectedColorId)]

      if (imgs?.length) return imgs
    }

    if (product) {
      const productImgs = product.images
        .filter(i => !i.color_option_id)
        .map(i => resolveImg(i.url ?? i.image_path))
        .filter(Boolean) as string[]

      if (productImgs.length > 0) return productImgs

      const primary = resolveImg(product.primary_image_url)
      if (primary) return [primary]
    }

    return []
  })()

  const currentUser  = getUser()
  const isOwnProduct = !!(currentUser && product && currentUser.id === product.seller?.id)
  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : hasVariants
      ? variants.reduce((s, v) => s + v.stock, 0)
      : (product?.stock ?? 0)

  const effectivePrice = selectedVariant ? selectedVariant.price : (product?.price ?? 0)
  const outOfStock     = effectiveStock <= 0
  const lowStock       = effectiveStock > 0 && effectiveStock <= 10
  const favorited      = product ? isFavorited(product.id, selectedVariant?.id ?? null) : false

  const handleAddToCart = async () => {
    if (!product || outOfStock) return
    if (!isAuthenticated()) { router.push('/auth/login?redirect=' + window.location.pathname); return }
    if (hasVariants && !selectedVariant) { setSelectorError(true); return }
    setSelectorError(false)
    await addToCart(product.id, quantity, selectedVariant?.id ?? null)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2500)
  }

  const handleBuyNow = async () => {
    if (!product || outOfStock || buyNowLoading || buyNowRef.current) return

    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=' + window.location.pathname)
      return
    }

    if (hasVariants && !selectedVariant) {
      setSelectorError(true)
      return
    }

    if (selectedVariant && selectedVariant.stock <= 0) {
      setSelectorError(true)
      return
    }

    buyNowRef.current = true
    setBuyNowLoading(true)
    setSelectorError(false)

    try {
      const qp = new URLSearchParams({
        buy_now:      '1',
        product_slug: product.slug,
        quantity:     String(quantity),
      })

      if (selectedVariant?.id) {
        qp.set('variant_id', String(selectedVariant.id))
      }

      await new Promise(resolve => setTimeout(resolve, 180))
      router.push(`/checkout?${qp.toString()}`)
    } finally {
      setBuyNowLoading(false)
      buyNowRef.current = false
    }
  }

  const handleToggleFavorite = () => {
    if (!product) return
    toggleFavorite(product.id, selectedVariant?.id ?? null)
  }

  const attrEntries   = product?.attribute_data ? Object.values(product.attribute_data) : []
  const hasAttributes = attrEntries.length > 0

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading product…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !product) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>Product not found</p>
        <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>← Back to Shop</Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .thumb:hover{border-color:#dc2626!important}
        .tab-btn:hover{color:#dc2626!important}
        .qty-btn:hover{background:#dc2626!important;color:#fff!important;border-color:#dc2626!important}
        .trust-item{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #f1f5f9}
        .trust-item:last-child{border-bottom:none}
        .buy-now-btn:hover:not(:disabled){background:rgba(220,38,38,0.05)!important;border-color:#b91c1c!important;color:#b91c1c!important}
        @media(max-width:900px){.pd-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>Shop</Link>
            {product.category && (<><ChevronRight size={11} /><Link href={`/category/${product.category.slug}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>{product.category.name}</Link></>)}
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>

        <div className="pd-grid" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          <Gallery images={galleryImages} productName={product.name} />

          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {product.category && (
                <Link href={`/category/${product.category.slug}`}
                  style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', padding: '3px 10px', borderRadius: 999, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {product.category.name}
                </Link>
              )}
            </div>

            {/* Title + share/fav */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.25, flex: 1 }}>{product.name}</h1>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <Share2 size={15} />
                </button>
                <button onClick={handleToggleFavorite}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${favorited ? '#dc2626' : '#e5e7eb'}`, background: favorited ? 'rgba(220,38,38,0.06)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <Heart size={15} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} fill={i <= 4 ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={1.5} />)}
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>4.0 ({product.views} views)</span>
            </div>

            {/* Seller */}
            {product.seller && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  {product.seller.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Sold by </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{product.seller.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 8px', borderRadius: 999 }}>Verified</span>
              </div>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(effectivePrice)}</span>
              {selectedVariant?.price_override && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>variant price</span>}
              {product.sku && <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontFamily: 'monospace' }}>SKU: {selectedVariant?.sku ?? product.sku}</p>}
            </div>

            {product.short_description && (
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px', fontWeight: 500 }}>{product.short_description}</p>
            )}

            {/* Variant selector */}
            {hasVariants && (
              <VariantSelector
                axes={axes}
                selectedOptions={selectedOptions}
                onSelect={(slug, optId) => {
                  setSelectorError(false)
                  setSelectedOptions(prev => ({ ...prev, [slug]: optId }))
                }}
                isOptionAvailable={isOptionAvailable}
                selectorError={selectorError}
              />
            )}

            {/* Quantity */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>Quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'all 0.15s' }}>
                  <Minus size={14} />
                </button>
                <span style={{ width: 48, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#111', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', lineHeight: '40px' }}>{quantity}</span>
                <button className="qty-btn" onClick={() => setQuantity(q => Math.min(effectiveStock, q + 1))} disabled={quantity >= effectiveStock}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: quantity >= effectiveStock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: quantity >= effectiveStock ? '#e5e7eb' : '#374151', transition: 'all 0.15s' }}>
                  <Plus size={14} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 8, fontWeight: 700 }}>
                {outOfStock ? 'Out of stock' : lowStock ? `Only ${effectiveStock} items left` : `${effectiveStock} in stock`}
              </p>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
              {isOwnProduct ? (
                <div style={{
                  flex: 1, height: 52,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'rgba(99,102,241,0.06)',
                  border: '2px dashed rgba(99,102,241,0.35)',
                  borderRadius: 12, color: '#6366f1',
                  fontWeight: 800, fontSize: 13, letterSpacing: '0.02em',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  This is your product
                </div>
              ) : (
                <>
                  <button
                    className="buy-now-btn"
                    onClick={handleBuyNow}
                    disabled={outOfStock || buyNowLoading}
                    style={{
                      flex: 1, height: 52, background: '#fff',
                      color: outOfStock ? '#9ca3af' : '#dc2626',
                      border: `2px solid ${outOfStock ? '#e5e7eb' : '#dc2626'}`,
                      borderRadius: 12,
                      cursor: outOfStock || buyNowLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 800, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s', fontFamily: 'inherit',
                      letterSpacing: '0.01em', opacity: outOfStock ? 0.6 : 1,
                    }}
                  >
                    {buyNowLoading
                      ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626' }} />
                      : <><Zap size={16} />{outOfStock ? 'Out of Stock' : 'Buy Now'}</>
                    }
                  </button>

                  <button
                    onClick={handleAddToCart}
                    disabled={outOfStock || cartLoading}
                    style={{
                      flex: 1, height: 52,
                      background: outOfStock
                        ? '#e5e7eb'
                        : addedToCart
                          ? 'linear-gradient(135deg,#10b981,#059669)'
                          : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                      color: outOfStock ? '#9ca3af' : '#fff',
                      border: 'none', borderRadius: 12,
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                      fontWeight: 800, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: outOfStock ? 'none' : addedToCart ? '0 8px 24px rgba(16,185,129,0.3)' : '0 8px 24px rgba(220,38,38,0.3)',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                    {cartLoading
                      ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : addedToCart
                      ? <><CheckCircle size={18} />Added!</>
                      : <><ShoppingCart size={18} />{outOfStock ? 'Out of Stock' : 'Add to Cart'}</>
                    }
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    style={{
                      width: 52, height: 52, flexShrink: 0,
                      borderRadius: '50%',
                      border: `2px solid ${favorited ? '#dc2626' : '#e5e7eb'}`,
                      background: favorited ? 'rgba(220,38,38,0.06)' : '#fff',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                    <Heart size={20} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
              {[
                { icon: <Truck size={18} color="#10b981" />,       title: 'Free Delivery',   desc: 'On orders over 50 DT across Tunisia' },
                { icon: <RotateCcw size={18} color="#3b82f6" />,   title: 'Easy Returns',    desc: '30-day hassle-free return policy' },
                { icon: <Shield size={18} color="#f59e0b" />,      title: 'Secure Payment',  desc: 'Your transaction is fully protected' },
                { icon: <CheckCircle size={18} color="#dc2626" />, title: 'Verified Seller', desc: 'All sellers are reviewed by our team' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="trust-item">
                  <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 13, color: '#111', margin: '0 0 2px' }}>{title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                {([
                  { key: 'description', label: 'Description' },
                  { key: 'attributes',  label: 'Specifications', hidden: !hasAttributes },
                  { key: 'details',     label: 'Details' },
                ] as { key: string; label: string; hidden?: boolean }[])
                  .filter(t => !t.hidden)
                  .map(t => (
                    <button key={t.key} className="tab-btn" onClick={() => setTab(t.key as any)}
                      style={{ flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: tab === t.key ? '#dc2626' : '#94a3b8', borderBottom: `2px solid ${tab === t.key ? '#dc2626' : 'transparent'}`, textTransform: 'capitalize', transition: 'color 0.15s', fontFamily: 'inherit' }}>
                      {t.label}
                    </button>
                  ))}
              </div>
              <div style={{ padding: '16px 20px' }}>
                {tab === 'description' && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, fontWeight: 500, whiteSpace: 'pre-line' }}>{product.description ?? product.short_description ?? 'No description available.'}</p>}
                {tab === 'attributes' && hasAttributes && <div>{attrEntries.map(attr => <AttributeRow key={attr.slug} attr={attr} />)}</div>}
                {tab === 'details' && (
                  <div>
                    {[
                      { label: 'Category',    value: product.category?.name ?? '—' },
                      { label: 'Subcategory', value: product.subcategory?.name ?? '—' },
                      { label: 'SKU',         value: selectedVariant?.sku ?? product.sku ?? 'N/A' },
                      { label: 'Stock',       value: `${effectiveStock} units` },
                      { label: 'Seller',      value: product.seller?.name ?? '—' },
                      { label: 'Views',       value: String(product.views ?? 0) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>{label}</span>
                        <span style={{ fontSize: 13, color: '#111', fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProductRecommendations slug={slug} sellerId={product.seller?.id} />
    </>
  )
}