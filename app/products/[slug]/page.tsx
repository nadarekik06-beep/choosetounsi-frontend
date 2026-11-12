'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, ShoppingCart, ChevronRight, Star, Shield, Truck,
  RotateCcw, Share2, Minus, Plus,
  CheckCircle, Zap, Check,
} from 'lucide-react'
import ProductGallery, { type GalleryFocusRequest } from '@/app/components/product/gallery/ProductGallery'
import { buildGallerySlides, type GalleryColor } from '@/app/components/product/gallery/gallerySlides'
import { useCart } from '@/context/CartContext'
import { getUser } from '@/lib/auth'
import { trackView } from '@/lib/tracking'
import type { ProductVariant, SelectableAxis } from '@/lib/shopApi'
import ProductRecommendations from 'app/components/ProductRecommendations'
import AdStrip from '@/components/ads/AdStrip'
import CountdownTimer from '@/app/components/promotions/CountdownTimer'
import ProductPrice, { ProductPromoBadges, type PricedProduct } from '@/app/components/promotions/ProductPrice'
import FreeDeliveryBadge from '@/app/components/product/FreeDeliveryBadge'
import ProductReviewsSection from '@/app/components/reviews/ProductReviewsSection';
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import { API_BASE, STORAGE_URL } from '@/lib/constants'

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: number; image_path: string; is_primary: boolean; url?: string
  variant_id?: number | null; color_option_id?: number | null
}

interface AttributeData {
  slug: string; name: string; type: string; value: any; label: string
}

interface ColorOption {
  id: number
  group_key: string
  ids: number[]
  value: string
  color_hex?: string | null
  primary_image?: string | null
  swatches?: { id: number; value: string; color_hex?: string | null }[]
}

interface ActivePromotion {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  is_flash_sale: boolean
}

interface Product {
  id: number; name: string; slug: string; description: string | null
  short_description: string | null; price: string | number; stock: number
  sku: string | null; views: number; is_approved: boolean; is_active: boolean
  avg_rating?: number | null; reviews_count?: number | null
  featured: boolean; primary_image_url: string | null; images: ProductImage[]
  category: { id: number; name: string; slug: string } | null
  subcategory: { id: number; name: string; slug: string } | null
  is_platform_product?: boolean
  seller: { id: number; name: string; email: string; business_name?: string; avatar?: string | null } | null
  attribute_data?: Record<string, AttributeData>
  has_variants: boolean
  effective_price?: number
  /** Crossed-out price when discounted: the current price (product or variant) */
  original_price?: number
  discount_amount?: number
  promotion?: ActivePromotion | null
  variants: (ProductVariant & {
    color_option_id?: number | null
    color_group_key?: string | null
    effective_price?: number
    original_price?: number
    image_urls: string[]
    primary_image_url?: string | null
  })[]
  selectable_axes: (SelectableAxis & {
    options: (ColorOption | SelectableAxis['options'][0] & {
      primary_image?: string | null
      ids?: number[]
      group_key?: string
      swatches?: { id: number; value: string; color_hex?: string | null }[]
    })[]
  })[]
  color_images: Record<string, string[]>
  is_free_delivery?: boolean
  // Multi-pack: pack_quantity is null for packs saved before it existed
  is_pack?: boolean
  pack_quantity?: number | null
  pack_contents?: string | null
  occasions?: string[]
}

// ─── Attribute Display ────────────────────────────────────────────────────────

function AttributeRow({ attr }: { attr: AttributeData }) {
  const tc = useTranslations('common')
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
          {attr.value ? tc('yes') : tc('no')}
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
  axes, selectedOptions, onSelect, isOptionAvailable, missingAxes, shakeKey, previewColorKey,
}: {
  axes: Product['selectable_axes']
  selectedOptions: Record<string, string>
  onSelect: (axisSlug: string, value: string) => void
  isOptionAvailable: (axisSlug: string, value: string) => boolean
  /** Axes the buyer must still pick (after tapping Buy / Add to cart) */
  missingAxes: string[]
  /** Changes on every failed tap so the shake replays */
  shakeKey: number
  /** Color of the gallery photo on screen: display only (soft outline + reminder line) */
  previewColorKey?: string | null
}) {
  const t = useTranslations('product')
  if (axes.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20 }}>
      {axes.map(axis => {
        const isColor  = axis.type === 'color'
        const selKey   = selectedOptions[axis.slug]
        const selName  = selKey === undefined ? null
          : isColor
            ? (axis.options as ColorOption[]).find(o => (o.group_key ?? String(o.id)) === selKey)?.value ?? null
            : axis.options.find(o => String(o.id) === selKey)?.value ?? null
        const missing  = missingAxes.includes(axis.slug)
        return (
          <div
            key={axis.slug}
            data-axis={axis.slug}
            className={missing ? 'pd-axis pd-axis--missing' : 'pd-axis'}
            // key on the wrapper's animation: a new shakeKey replays the shake
            style={missing ? { animation: `pdShake${shakeKey % 2} 0.45s ease` } : undefined}
          >
            <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: '0 0 10px', display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span>{t('axisLabel', { axis: axis.name })}</span>
              {selName ? (
                <span style={{ color: '#0f172a', textTransform: 'none', letterSpacing: 0, fontSize: 14, fontWeight: 800 }}>{selName}</span>
              ) : (
                <span style={{ color: missing ? '#db142e' : '#94a3b8', textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 600 }}>
                  {isColor ? t('colorHint') : t('optionHint')}
                </span>
              )}
            </p>

            {isColor ? (
              <div role="radiogroup" aria-label={axis.name} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(axis.options as ColorOption[]).map(opt => {
                  const selectionKey = opt.group_key ?? String(opt.id)
                  const chosen       = selKey === selectionKey
                  const available    = isOptionAvailable(axis.slug, selectionKey)
                  const swatches     = opt.swatches ?? [{ id: opt.id, value: opt.value, color_hex: opt.color_hex }]
                  // Shown in the gallery but not chosen: soft dashed outline, no check, not red
                  const previewed    = !chosen && previewColorKey === selectionKey
                  return (
                    <button
                      key={`${axis.slug}-${selectionKey}`}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      aria-label={available ? opt.value : `${opt.value} — ${t('unavailable')}`}
                      title={opt.value}
                      disabled={!available}
                      onClick={() => onSelect(axis.slug, selectionKey)}
                      className={`pd-swatch${chosen ? ' is-on' : ''}${previewed ? ' is-preview' : ''}`}
                    >
                      <span className="pd-swatch__fill">
                        {opt.primary_image ? (
                          <img src={opt.primary_image} alt="" />
                        ) : swatches.length > 1 ? (
                          swatches.slice(0, 2).map(s => <span key={s.id} style={{ flex: 1, background: s.color_hex ?? '#e5e7eb' }} />)
                        ) : (
                          <span style={{ flex: 1, background: opt.color_hex ?? '#e5e7eb' }} />
                        )}
                      </span>
                      {!available && (
                        <svg viewBox="0 0 60 60" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <line x1="6" y1="54" x2="54" y2="6" stroke="#94a3b8" strokeWidth="2" />
                        </svg>
                      )}
                      {chosen && (
                        <span className="pd-swatch__check" aria-hidden="true">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div role="radiogroup" aria-label={axis.name} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {axis.options.map(opt => {
                  const selectionKey = String(opt.id)
                  const chosen       = selKey === selectionKey
                  const available    = isOptionAvailable(axis.slug, selectionKey)
                  return (
                    <button
                      key={`${axis.slug}-${opt.id}`}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      aria-label={available ? opt.value : `${opt.value} — ${t('unavailable')}`}
                      disabled={!available}
                      onClick={() => onSelect(axis.slug, selectionKey)}
                      className={`pd-size${chosen ? ' is-on' : ''}`}
                    >
                      {opt.value}
                    </button>
                  )
                })}
              </div>
            )}

            {/* The gallery shows another color than the one chosen: say what is being bought.
                (Nothing chosen yet: the "Choose a color" hint above already says it.) */}
            {isColor && selName && previewColorKey && previewColorKey !== selKey
              && (axis.options as ColorOption[]).some(o => (o.group_key ?? String(o.id)) === previewColorKey) && (
              <p className="pd-preview-note" data-testid="preview-note">
                {t('galleryChosenColor', { color: selName })}
              </p>
            )}

            {missing && (
              <p role="alert" style={{ fontSize: 12.5, color: '#db142e', fontWeight: 700, margin: '8px 0 0' }}>
                {t('selectOptions', { options: axis.name })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const t      = useTranslations('product')
  const tc     = useTranslations('common')
  const format = useFormat()
  const params = useParams()
  const router = useRouter()
  const slug   = params?.slug as string

  const { addToCart, isFavorited, toggleFavorite, cartLoading, mustLogIn } = useCart()

  const [product,         setProduct]         = useState<Product | null>(null)
  const [loading,         setLoading]         = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(loading)
  const [error,           setError]           = useState(false)
  const [quantity,        setQuantity]        = useState(1)
  const [addedToCart,     setAddedToCart]     = useState(false)
  const [tab,             setTab]             = useState<'description' | 'details' | 'attributes'>('description')
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  // Axes still to pick after a Buy / Add to cart tap (highlighted + scrolled to)
  const [missingAxes,     setMissingAxes]     = useState<string[]>([])
  const [shakeKey,        setShakeKey]        = useState(0)
  const [buyNowLoading,   setBuyNowLoading]   = useState(false)
  const [activePromotion, setActivePromotion] = useState<ActivePromotion | null>(null)
  const [sellerImgErr,    setSellerImgErr]    = useState(false)
  const buyNowRef = useRef(false)

  // ── Gallery state: kept apart from the selection on purpose ──────────────────
  // The selected variant (selectedOptions) changes ONLY in VariantSelector's onSelect,
  // i.e. when the buyer taps a swatch or a size. The gallery never receives
  // setSelectedOptions; it gets a one-way "show this color" request (galleryFocus) and
  // reports back only which color is ON SCREEN (previewColorKey), for display hints.
  // Never derive the selection from the gallery: a buyer who chose Noir and swipes onto
  // a white photo still buys Noir (cart, checkout and order use selectedVariant.id).
  const [galleryLeadColor, setGalleryLeadColor] = useState<string | undefined>(undefined)
  const [galleryFocus,     setGalleryFocus]     = useState<GalleryFocusRequest | null>(null)
  const [previewColorKey,  setPreviewColorKey]  = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setSelectedOptions({})
    setGalleryLeadColor(undefined)
    setGalleryFocus(null)
    setPreviewColorKey(null)
    setActivePromotion(null)
    fetch(`${API_BASE}/products/${slug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const prod: Product = json.data
        setProduct(prod)
        trackView(prod.id)
        if (prod.promotion) {
          setActivePromotion(prod.promotion)
        }
        if (prod.has_variants && prod.selectable_axes?.length > 0) {
          const auto: Record<string, string> = {}
          // ?color=<attribute option id>: the color photo search matched (or any link to one color)
          const wanted = Number(new URLSearchParams(window.location.search).get('color'))
          for (const axis of prod.selectable_axes) {
            if (wanted && axis.type === 'color') {
              const o = (axis.options as ColorOption[]).find(o => o.id === wanted || o.ids?.includes(wanted))
              if (o) { auto[axis.slug] = o.group_key ?? String(o.id); continue }
            }
            if (axis.options.length === 1) {
              if (axis.type === 'color') {
                const o = axis.options[0] as ColorOption
                auto[axis.slug] = o.group_key ?? String(o.id)
              } else {
                auto[axis.slug] = String(axis.options[0].id)
              }
            }
          }
          if (Object.keys(auto).length > 0) setSelectedOptions(auto)
          // The color selected on arrival leads the gallery order
          const colorSlug = prod.selectable_axes.find(a => a.type === 'color')?.slug
          setGalleryLeadColor(colorSlug ? auto[colorSlug] : undefined)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  const axes        = product?.selectable_axes ?? []
  const variants    = product?.variants ?? []
  const hasVariants = product?.has_variants ?? false
  const colorAxis   = axes.find(a => a.type === 'color')

  const selectedColorKey = colorAxis ? selectedOptions[colorAxis.slug] : undefined

  const selectedVariant = (() => {
    if (!hasVariants || axes.length === 0) return undefined
    if (Object.keys(selectedOptions).length < axes.length) return undefined
    return variants.find(v =>
      axes.every(axis => {
        const selVal = selectedOptions[axis.slug]
        if (selVal === undefined) return false
        if (axis.type === 'color') return v.color_group_key === selVal
        const mapEntry = v.option_map[axis.slug]
        return mapEntry && String(mapEntry.id) === selVal
      })
    )
  })()

  const isOptionAvailable = useCallback((axisSlug: string, selectionValue: string): boolean => {
    const axis = axes.find(a => a.slug === axisSlug)
    return variants.some(v => {
      if (v.stock <= 0) return false   // out of stock: greyed, not clickable
      if (axis?.type === 'color') {
        if (v.color_group_key !== selectionValue) return false
      } else {
        const entry = v.option_map[axisSlug]
        if (!entry || String(entry.id) !== selectionValue) return false
      }
      return Object.entries(selectedOptions).every(([slug, selVal]) => {
        if (slug === axisSlug) return true
        const otherAxis = axes.find(a => a.slug === slug)
        if (otherAxis?.type === 'color') return v.color_group_key === selVal
        const otherEntry = v.option_map[slug]
        return otherEntry && String(otherEntry.id) === selVal
      })
    })
  }, [variants, selectedOptions, axes])

  // One gallery with every photo: each color's set (swatch order, sizes share a color's
  // photos) + the general photos. Built once per product, so tapping a swatch scrolls to
  // that color instead of reshuffling the photos under the buyer's finger.
  const gallerySlides = useMemo(() => {
    if (!product) return []
    const colorAx = product.has_variants ? product.selectable_axes?.find(a => a.type === 'color') : undefined
    const colors: GalleryColor[] = colorAx
      ? (colorAx.options as ColorOption[]).map(o => {
          const key = o.group_key ?? String(o.id)
          return { key, label: o.value, images: product.color_images?.[key] ?? product.color_images?.[String(o.id)] ?? [] }
        })
      : []
    const general = product.images
      .filter(i => !i.color_option_id && !i.variant_id)
      .map(i => resolveImg(i.url ?? i.image_path))
      .filter(Boolean) as string[]
    const slides = buildGallerySlides(colors, general, galleryLeadColor)
    if (slides.length > 0) return slides
    const primary = resolveImg(product.primary_image_url)
    return primary ? [{ src: primary, colorKey: null, colorLabel: null }] : []
  }, [product, galleryLeadColor])

  const currentUser    = getUser()
  const isOwnProduct   = !!(currentUser && product && currentUser.id === product.seller?.id)
  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : hasVariants
      ? variants.reduce((s, v) => s + v.stock, 0)
      : (product?.stock ?? 0)

  // Same prices as cart/checkout: the promotion applies to the selected variant too,
  // and the crossed-out price is the current price (product or variant).
  const effectivePrice = selectedVariant
    ? (activePromotion && selectedVariant.effective_price != null ? selectedVariant.effective_price : selectedVariant.price)
    : (activePromotion && product?.effective_price != null)
      ? product.effective_price
      : (product?.price ?? 0)

  const originalPrice = selectedVariant
    ? Number(selectedVariant.original_price ?? selectedVariant.price)
    : Number(product?.original_price ?? product?.price ?? 0)

  // The selected line (variant or product) as the shared price/badge components read it
  const linePrice: PricedProduct = {
    price:          effectivePrice,
    final_price:    effectivePrice,
    original_price: originalPrice,
    promo_type:     activePromotion ? (activePromotion.is_flash_sale ? 'flash_sale' : 'promotion') : null,
    // Server's -X% for this exact line (same number as cards, cart and checkout)
    discount_percent: activePromotion
      ? ((selectedVariant as { discount_percent?: number | null } | null)?.discount_percent
          ?? (product as { discount_percent?: number | null } | null)?.discount_percent ?? null)
      : null,
    is_pack:        product?.is_pack ?? false,
    pack_quantity:  product?.pack_quantity ?? null,
  }

  const outOfStock = effectiveStock <= 0
  const lowStock   = effectiveStock > 0 && effectiveStock <= 10
  const favorited  = product ? isFavorited(product.id, selectedVariant?.id ?? null) : false

  /** A required option is missing: scroll to the first one and shake it. Returns true when blocked. */
  const flagMissingOptions = (): boolean => {
    if (!hasVariants || selectedVariant) return false
    const missing = axes.filter(a => selectedOptions[a.slug] === undefined).map(a => a.slug)
    // Every axis picked but no variant matches: flag them all
    const flagged = missing.length > 0 ? missing : axes.map(a => a.slug)
    setMissingAxes(flagged)
    setShakeKey(k => k + 1)
    const el = document.querySelector<HTMLElement>(`[data-axis="${CSS.escape(flagged[0])}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return true
  }

  const handleAddToCart = async () => {
    if (!product || outOfStock) return
    if (mustLogIn()) { router.push('/auth/login?redirect=' + window.location.pathname); return }
    if (flagMissingOptions()) return
    setMissingAxes([])
    await addToCart(product.id, quantity, selectedVariant?.id ?? null)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2500)
  }

  const handleBuyNow = async () => {
    if (!product || outOfStock || buyNowLoading || buyNowRef.current) return
    if (mustLogIn()) { router.push('/auth/login?redirect=' + window.location.pathname); return }
    if (flagMissingOptions()) return
    if (selectedVariant && selectedVariant.stock <= 0) return
    buyNowRef.current = true; setBuyNowLoading(true); setMissingAxes([])
    try {
      const qp = new URLSearchParams({ buy_now: '1', product_slug: product.slug, quantity: String(quantity) })
      if (selectedVariant?.id) qp.set('variant_id', String(selectedVariant.id))
      await new Promise(r => setTimeout(r, 180))
      router.push(`/checkout?${qp.toString()}`)
    } finally { setBuyNowLoading(false); buyNowRef.current = false }
  }

  const handleToggleFavorite = () => { if (product) toggleFavorite(product.id, selectedVariant?.id ?? null) }

  const attrEntries   = product?.attribute_data ? Object.values(product.attribute_data) : []
  const hasAttributes = attrEntries.length > 0

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <BrandLoader variant="section" label={t('loading')} />
    </div>
  )

  if (error || !product) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>{t('notFound')}</p>
        <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{t('backToShop')}</Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .thumb:hover{border-color:#dc2626!important}
        .tab-btn:hover{color:#dc2626!important}
        .qty-btn:hover{background:#dc2626!important;color:#fff!important;border-color:#dc2626!important}
        .trust-item{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #f1f5f9}
        .trust-item:last-child{border-bottom:none}
        .buy-now-btn:hover:not(:disabled){filter:brightness(0.94)}
        .add-cart-btn:hover:not(:disabled){background:rgba(219,20,46,0.05)!important}
        @media(max-width:900px){.pd-grid{grid-template-columns:1fr!important}}
        /* Color swatches: big tiles, the variant photo fills them */
        .pd-swatch{position:relative;width:60px;height:60px;padding:0;border-radius:14px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s;flex-shrink:0}
        .pd-swatch__fill{position:absolute;inset:4px;border-radius:10px;overflow:hidden;display:flex;background:#f5f5f5;pointer-events:none}
        .pd-swatch__fill img{width:100%;height:100%;object-fit:contain}
        .pd-swatch:hover:not(:disabled){border-color:#94a3b8}
        .pd-swatch.is-on{border-color:#db142e;box-shadow:0 0 0 1.5px #db142e}
        .pd-swatch:disabled{cursor:not-allowed;opacity:.4}
        /* On screen in the gallery but NOT chosen: grey dashed outline (chosen = red + check) */
        .pd-swatch.is-preview{border-color:#64748b;border-style:dashed}
        .pd-preview-note{font-size:12.5px;color:#64748b;font-weight:600;margin:8px 0 0;line-height:1.45}
        .pd-swatch__check{position:absolute;top:-7px;inset-inline-end:-7px;width:20px;height:20px;border-radius:50%;background:#db142e;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2)}
        .pd-size{min-height:44px;min-width:52px;padding:0 16px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#0f172a;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,box-shadow .15s}
        .pd-size:hover:not(:disabled){border-color:#94a3b8}
        .pd-size.is-on{border-color:#db142e;box-shadow:0 0 0 1.5px #db142e;background:rgba(219,20,46,.06);color:#db142e;font-weight:800}
        .pd-size:disabled{background:#f1f5f9;color:#b6bfcc;border-color:#f1f5f9;text-decoration:line-through;cursor:not-allowed}
        .pd-swatch:focus-visible,.pd-size:focus-visible{outline:2px solid #0f172a;outline-offset:3px}
        .pd-axis{scroll-margin:120px}
        .pd-axis--missing{outline:2px solid #db142e;outline-offset:6px;border-radius:12px}
        @keyframes pdShake0{0%,100%{transform:none}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        @keyframes pdShake1{0%,100%{transform:none}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        @media(prefers-reduced-motion:reduce){.pd-axis--missing{animation:none!important}}
        /* Phones: price + Buy now + cart in a bar stuck to the bottom */
        .pd-sticky{display:none}
        @media(max-width:768px){
          .pd-actions{display:none!important}
          .pd-sticky{display:flex;position:fixed;inset-inline:0;bottom:0;z-index:900;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -6px 20px rgba(15,23,42,.08);padding:10px 16px calc(10px + env(safe-area-inset-bottom));gap:10px;align-items:center}
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "var(--ct-barlow), sans-serif" }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('shop')}</Link>
            {product.category && (
              <>
                <ChevronRight size={11} />
                <Link href={`/category/${product.category.slug}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>{product.category.name}</Link>
              </>
            )}
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{product.name}</span>
          </nav>
        </div>

        <div className="pd-grid" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* One-way: selection → gallery (selectedColorKey, galleryFocus). No setter goes in. */}
          <ProductGallery key={product.id} slides={gallerySlides} productName={product.name}
            selectedColorKey={selectedColorKey}
            focusRequest={galleryFocus}
            onPreviewChange={setPreviewColorKey}
            badge={<ProductPromoBadges product={linePrice} size="lg" style={{ top: 12, insetInlineStart: 12 }} />} />

          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {product.category && (
                <Link href={`/category/${product.category.slug}`}
                  style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', padding: '3px 10px', borderRadius: 999, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {product.category.name}
                </Link>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.25, flex: 1 }}>{product.name}</h1>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => navigator.share?.({ title: product.name, url: window.location.href })} aria-label={tc('share')} title={tc('share')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <Share2 size={15} />
                </button>
                <button onClick={handleToggleFavorite} aria-label={favorited ? t('removeFavorite') : t('addFavorite')} aria-pressed={favorited}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${favorited ? '#dc2626' : '#e5e7eb'}`, background: favorited ? 'rgba(220,38,38,0.06)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <Heart size={15} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              {(product.reviews_count ?? 0) > 0 && product.avg_rating != null ? (
                <>
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} fill={i <= Math.round(product.avg_rating ?? 0) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={1.5} />)}
                  <span style={{ fontSize: 12, color: '#64748b', marginInlineStart: 4 }}>{t('ratingReviews', { rating: format.number(product.avg_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), count: product.reviews_count ?? 0 })}</span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: '#64748b' }}>{t('noReviews')}</span>
              )}
            </div>

            {product.is_platform_product ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <img
                  src="/logo.png"
                  alt={tc('logoAlt')}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(219,20,46,0.3)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{t('soldBy')}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>CHOOSE'Tounsi</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 8px', borderRadius: 999 }}>{t('official')}</span>
              </div>
            ) : product.seller && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, overflow: 'hidden', flexShrink: 0 }}>
                  {product.seller.avatar && !sellerImgErr
                    ? <img src={product.seller.avatar} alt="" onError={() => setSellerImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (product.seller.business_name ?? product.seller.name).charAt(0).toUpperCase()
                  }
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{t('soldBy')}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{product.seller.business_name ?? product.seller.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 8px', borderRadius: 999 }}>{t('verified')}</span>
                <Link href={`/sellers/${product.seller.id}`} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 800, color: '#dc2626', textDecoration: 'none', marginInlineStart: 'auto' }}>
                  {t('visitStore')} <ChevronRight size={12} />
                </Link>
              </div>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {/* Promotion banner */}
            {activePromotion && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                marginBottom: 14, padding: '10px 14px',
                background: activePromotion.is_flash_sale
                  ? 'linear-gradient(135deg,rgba(220,38,38,0.08),rgba(220,38,38,0.03))'
                  : 'rgba(219,20,46,0.06)',
                border: `1px solid ${activePromotion.is_flash_sale ? 'rgba(220,38,38,0.2)' : 'rgba(219,20,46,0.18)'}`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProductPromoBadges product={linePrice} inline />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{activePromotion.name}</span>
                {activePromotion.is_flash_sale && (
                  <>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{t('endsIn')}</span>
                    <CountdownTimer endsAt={activePromotion.ends_at} compact onExpire={() => setActivePromotion(null)} />
                  </>
                )}
                {activePromotion.flash_stock_remaining !== null && (
                  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginInlineStart: 'auto' }}>
                    {t('flashStockLeft', { count: activePromotion.flash_stock_remaining })}
                  </span>
                )}
              </div>
            )}

            {/* Price block */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <ProductPrice product={linePrice} size="xl" pack style={{ gap: 10 }} />
                {selectedVariant?.price_override && !activePromotion && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('variantPrice')}</span>
                )}
              </div>
              {product.is_pack && product.pack_contents && (
                <p style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>{t('packContents')}:</span> {product.pack_contents}
                </p>
              )}
              <div style={{ marginTop: 8 }}><FreeDeliveryBadge size="md" /></div>
              {product.sku && (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontFamily: 'monospace' }}>
                  {t('sku', { sku: selectedVariant?.sku ?? product.sku })}
                </p>
              )}
            </div>

            {product.short_description && (
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px', fontWeight: 500 }}>
                {product.short_description}
              </p>
            )}

            {hasVariants && (
              <VariantSelector
                axes={axes}
                selectedOptions={selectedOptions}
                // The ONLY place the selection changes: an explicit tap on a swatch / size
                onSelect={(axisSlug, value) => {
                  setMissingAxes(m => m.filter(s => s !== axisSlug))
                  setSelectedOptions(prev => ({ ...prev, [axisSlug]: value }))
                  // variant → gallery: show the tapped color's first photo
                  if (axisSlug === colorAxis?.slug) {
                    setGalleryFocus(f => ({ colorKey: value, nonce: (f?.nonce ?? 0) + 1 }))
                  }
                }}
                isOptionAvailable={isOptionAvailable}
                missingAxes={missingAxes}
                shakeKey={shakeKey}
                previewColorKey={previewColorKey}
              />
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>{tc('quantity')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label={t('decrease')}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'all 0.15s' }}>
                  <Minus size={14} />
                </button>
                <span style={{ width: 48, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#111', borderInlineStart: '1px solid #e5e7eb', borderInlineEnd: '1px solid #e5e7eb', lineHeight: '40px' }} aria-live="polite">{quantity}</span>
                <button className="qty-btn" onClick={() => setQuantity(q => Math.min(effectiveStock, q + 1))} disabled={quantity >= effectiveStock} aria-label={t('increase')}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: quantity >= effectiveStock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: quantity >= effectiveStock ? '#e5e7eb' : '#374151', transition: 'all 0.15s' }}>
                  <Plus size={14} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 8, fontWeight: 700 }}>
                {outOfStock ? tc('outOfStock') : lowStock ? t('lowStock', { count: effectiveStock }) : t('inStock', { count: effectiveStock })}
              </p>
            </div>

            <div className="pd-actions" style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
              {isOwnProduct ? (
                <div style={{ flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(99,102,241,0.06)', border: '2px dashed rgba(99,102,241,0.35)', borderRadius: 12, color: '#6366f1', fontWeight: 800, fontSize: 13 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  {t('ownProduct')}
                </div>
              ) : (
                <>
                  {/* Buy now is the main action: filled brand red */}
                  <button className="buy-now-btn" onClick={handleBuyNow} disabled={outOfStock || buyNowLoading}
                    style={{ flex: 1.3, height: 52, background: outOfStock ? '#e5e7eb' : '#db142e', color: outOfStock ? '#9ca3af' : '#fff', border: 'none', borderRadius: 12, cursor: outOfStock || buyNowLoading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: outOfStock ? 'none' : '0 8px 24px rgba(219,20,46,0.3)', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                    {buyNowLoading ? <BrandLoader variant="inline" size={18} /> : <><Zap size={17} />{outOfStock ? tc('outOfStock') : tc('buyNow')}</>}
                  </button>
                  <button className="add-cart-btn" onClick={handleAddToCart} disabled={outOfStock || cartLoading}
                    style={{ flex: 1, height: 52, background: addedToCart ? 'rgba(16,185,129,0.08)' : '#fff', color: outOfStock ? '#9ca3af' : addedToCart ? '#059669' : '#db142e', border: `2px solid ${outOfStock ? '#e5e7eb' : addedToCart ? '#10b981' : '#db142e'}`, borderRadius: 12, cursor: outOfStock ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'inherit', opacity: outOfStock ? 0.6 : 1 }}>
                    {cartLoading ? <BrandLoader variant="inline" size={18} style={{ color: '#db142e' }} /> : addedToCart ? <><CheckCircle size={18} />{tc('added')}</> : <><ShoppingCart size={18} />{outOfStock ? tc('outOfStock') : tc('addToCart')}</>}
                  </button>
                  <button onClick={handleToggleFavorite} aria-label={favorited ? t('removeFavorite') : t('addFavorite')} aria-pressed={favorited}
                    style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', border: `2px solid ${favorited ? '#dc2626' : '#e5e7eb'}`, background: favorited ? 'rgba(220,38,38,0.06)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Heart size={20} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
              {[
                {
                  icon: <Truck size={18} color="#10b981" />,
                  title: t('freeDelivery'),
                  desc: t('trustFreeDeliveryDesc'),
                },
                { icon: <RotateCcw size={18} color="#3b82f6" />,   title: t('trustReturns'),  desc: t('trustReturnsDesc') },
                { icon: <Shield size={18} color="#f59e0b" />,      title: t('trustPayment'),  desc: t('trustPaymentDesc') },
                { icon: <CheckCircle size={18} color="#dc2626" />, title: t('trustSeller'),   desc: t('trustSellerDesc') },
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

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                {([
                  { key: 'description', label: t('tabDescription') },
                  { key: 'attributes',  label: t('tabSpecs'), hidden: !hasAttributes },
                  { key: 'details',     label: t('tabDetails') },
                ] as { key: string; label: string; hidden?: boolean }[])
                  .filter(tb => !tb.hidden)
                  .map(tb => (
                    <button key={tb.key} role="tab" aria-selected={tab === tb.key} className="tab-btn" onClick={() => setTab(tb.key as any)}
                      style={{ flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: tab === tb.key ? '#dc2626' : '#94a3b8', borderBottom: `2px solid ${tab === tb.key ? '#dc2626' : 'transparent'}`, transition: 'color 0.15s', fontFamily: 'inherit' }}>
                      {tb.label}
                    </button>
                  ))}
              </div>
              <div style={{ padding: '16px 20px' }}>
                {tab === 'description' && (
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, fontWeight: 500, whiteSpace: 'pre-line' }}>
                    {product.description ?? product.short_description ?? t('noDescription')}
                  </p>
                )}
                {tab === 'attributes' && hasAttributes && (
                  <div>{attrEntries.map(attr => <AttributeRow key={attr.slug} attr={attr} />)}</div>
                )}
                {tab === 'details' && (
                  <div>
                    {[
                      { label: t('detailCategory'),    value: product.category?.name ?? '—' },
                      { label: t('detailSubcategory'), value: product.subcategory?.name ?? '—' },
                      { label: t('detailSku'),         value: selectedVariant?.sku ?? product.sku ?? t('na') },
                      { label: t('detailStock'),       value: t('units', { count: effectiveStock }) },
                      { label: t('detailSeller'),      value: product.is_platform_product ? t('platformSeller') : (product.seller?.business_name ?? product.seller?.name ?? '—') },
                      { label: t('detailViews'),       value: format.number(product.views ?? 0) },
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
      {/* Phones: always-visible price + Buy now + cart (CSS hides it from 769px) */}
      {!isOwnProduct && (
        <div className="pd-sticky">
          <div style={{ minWidth: 0, flexShrink: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            {originalPrice > Number(effectivePrice) && (
              <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{format.price(originalPrice)}</span>
            )}
            <span style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{format.price(Number(effectivePrice))}</span>
          </div>
          <button type="button" onClick={handleAddToCart} disabled={outOfStock || cartLoading}
            aria-label={addedToCart ? tc('added') : tc('addToCart')} title={tc('addToCart')}
            style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 12, border: `2px solid ${addedToCart ? '#10b981' : outOfStock ? '#e5e7eb' : '#db142e'}`, background: '#fff', color: addedToCart ? '#059669' : outOfStock ? '#9ca3af' : '#db142e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: outOfStock ? 'not-allowed' : 'pointer' }}>
            {cartLoading ? <BrandLoader variant="inline" size={18} /> : addedToCart ? <CheckCircle size={20} /> : <ShoppingCart size={20} />}
          </button>
          <button type="button" onClick={handleBuyNow} disabled={outOfStock || buyNowLoading}
            style={{ flex: 1, minWidth: 0, height: 50, borderRadius: 12, border: 'none', background: outOfStock ? '#e5e7eb' : '#db142e', color: outOfStock ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', cursor: outOfStock ? 'not-allowed' : 'pointer', boxShadow: outOfStock ? 'none' : '0 6px 18px rgba(219,20,46,0.3)', whiteSpace: 'nowrap' }}>
            {buyNowLoading ? <BrandLoader variant="inline" size={18} /> : <><Zap size={16} />{outOfStock ? tc('outOfStock') : tc('buyNow')}</>}
          </button>
        </div>
      )}
      <ProductReviewsSection slug={slug} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <AdStrip placement="product_similar" title="similarTitle" query={{ contextProductId: product.id }} />
      </div>
      <ProductRecommendations slug={slug} sellerId={product.seller?.id} />
    </>
  )
}