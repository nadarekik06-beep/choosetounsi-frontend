'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, MapPin, Package, Loader2, Store, Heart, Users, Search,
  Star, Truck, Tag, Copy, Check, Zap, Home as HomeIcon,
} from 'lucide-react'
import PriceDisplay from '@/app/components/promotions/PriceDisplay'
import type { ActivePromotion } from '@/lib/promotionsApi'
import { getToken, isAuthenticated } from '@/lib/auth'
import ProductFilterSidebar, { DEFAULT_FILTERS, type F } from '@/app/components/filters/ProductFilterSidebar'

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL      = `${STORAGE_BASE}/api`

const RED   = '#db142e'
const GREEN = '#198f41'

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerPromotionProduct {
  id: number; name: string; slug: string
  price: number; original_price: number; effective_price: number
  discount_amount: number
  primary_image_url: string | null
  stock: number
}

interface SellerPromotion {
  id: number; name: string
  type: 'flash_sale' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  products: SellerPromotionProduct[]
}

interface CouponSummary {
  code: string
  discount_label: string
  min_order_amount: number | null
  product_count: number
}

interface SellerProfile {
  id: number
  name: string
  business_name: string
  business_description: string | null
  wilaya: string | null
  avatar: string | null
  cover_photo: string | null
  total_products: number
  followers_count: number
  promotions: SellerPromotion[]
  coupons: CouponSummary[]
}

interface GridProduct {
  id: number; name: string; slug: string
  price: number | string; stock: number
  primary_image_url: string | null
  effective_price?: number
  promotion?: ActivePromotion | null
}

interface Pack {
  id: number; name: string; slug: string
  image_url: string | null
  pack_price: number; original_price: number; savings: number
  items_count: number
}

interface Paginated<T> {
  current_page: number; data: T[]; last_page: number; total: number
}

type Tab = 'home' | 'products' | 'offers'

function promoToActivePromotion(promo: SellerPromotion): ActivePromotion {
  return {
    id: promo.id, type: promo.type, name: promo.name,
    discount_type: promo.discount_type, discount_value: promo.discount_value,
    discount_label: promo.discount_label, ends_at: promo.ends_at,
    flash_stock_remaining: promo.flash_stock_remaining, is_flash_sale: promo.type === 'flash_sale',
  }
}

function promoProductsToGrid(promo: SellerPromotion): GridProduct[] {
  return promo.products.map(p => ({
    id: p.id, name: p.name, slug: p.slug, stock: p.stock,
    primary_image_url: p.primary_image_url,
    price: p.original_price, effective_price: p.effective_price,
    promotion: promoToActivePromotion(promo),
  }))
}

// ─── Product card — one shared design everywhere on this page ─────────────────

function ProductCard({ product }: { product: GridProduct }) {
  const [imgErr, setImgErr] = useState(false)
  const img = resolveImg(product.primary_image_url)
  const outOfStock = product.stock <= 0

  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div
        style={{ transition: 'transform 0.18s ease' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
      >
        <div style={{
          position: 'relative', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden',
          background: '#f4f5f7',
        }}>
          {img && !imgErr
            ? <img src={img} alt={product.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: 0.4 }}>📦</div>
          }
          {product.promotion?.is_flash_sale && (
            <span style={{
              position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 800,
              background: 'rgba(17,17,17,0.75)', color: '#fff', padding: '3px 8px', borderRadius: 999,
              letterSpacing: '0.05em', backdropFilter: 'blur(2px)',
            }}>
              ⚡ FLASH
            </span>
          )}
          {outOfStock && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#111', color: '#fff', padding: '4px 10px', borderRadius: 999, letterSpacing: '0.05em' }}>Sold Out</span>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 2px 0' }}>
          <p style={{
            fontSize: 12.5, fontWeight: 600, color: '#374151', margin: '0 0 6px', lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {product.name}
          </p>
          <PriceDisplay price={product.price} effectivePrice={product.effective_price} promotion={product.promotion} size="sm" />
        </div>
      </div>
    </Link>
  )
}

function ProductRow({ products }: { products: GridProduct[] }) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6 }}>
      {products.map(p => (
        <div key={p.id} style={{ flex: '0 0 auto', width: 160 }}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  )
}

// ─── Pack card — static, no detail page exists yet to link to ─────────────────

function PackCard({ pack }: { pack: Pack }) {
  const img = resolveImg(pack.image_url)
  return (
    <div style={{ flex: '0 0 auto', width: 180 }}>
      <div style={{ aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#f4f5f7', position: 'relative' }}>
        {img
          ? <img src={img} alt={pack.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: 0.4 }}>🎁</div>
        }
        <span style={{
          position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 800,
          background: GREEN, color: '#fff', padding: '3px 8px', borderRadius: 999, letterSpacing: '0.05em',
        }}>
          {pack.items_count} ITEMS
        </span>
      </div>
      <div style={{ padding: '10px 2px 0' }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', margin: '0 0 6px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {pack.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: RED }}>{Number(pack.pack_price).toFixed(2)} DT</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textDecoration: 'line-through' }}>{Number(pack.original_price).toFixed(2)} DT</span>
        </div>
        {pack.savings > 0 && (
          <p style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: '#f0fdf4', padding: '2px 6px', borderRadius: 999, display: 'inline-block', marginTop: 4 }}>
            Save {Number(pack.savings).toFixed(2)} DT
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Coupon chip — copy-to-clipboard ───────────────────────────────────────────

function CouponChip({ coupon }: { coupon: CouponSummary }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable — no-op */ }
  }
  return (
    <button
      onClick={copy}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        border: `1.5px dashed ${RED}55`, borderRadius: 12, background: '#fff8f8', cursor: 'pointer',
        textAlign: 'left', minWidth: 220,
      }}
    >
      <Tag size={16} color={RED} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '0.03em' }}>{coupon.code}</p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
          {coupon.discount_label}
          {coupon.min_order_amount != null && ` · min ${Number(coupon.min_order_amount).toFixed(0)} DT`}
          {` · ${coupon.product_count} item${coupon.product_count === 1 ? '' : 's'}`}
        </p>
      </div>
      {copied ? <Check size={15} color={GREEN} /> : <Copy size={15} color="#9ca3af" />}
    </button>
  )
}

// ─── Top nav tabs ───────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'home',     label: 'Home',           Icon: HomeIcon },
    { key: 'products', label: 'All Products',   Icon: Package },
    { key: 'offers',   label: 'Special Offers', Icon: Tag },
  ]
  return (
    <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid #f3f4f6' }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700, padding: '14px 2px', background: 'none', border: 'none',
            borderBottom: active === t.key ? `2.5px solid ${RED}` : '2.5px solid transparent',
            color: active === t.key ? '#111' : '#9ca3af', cursor: 'pointer', transition: 'color 0.15s',
          }}
        >
          <t.Icon size={14} />
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Filter chips (All Products tab) ───────────────────────────────────────────

interface ChipFilters { topRated: boolean; freeShipping: boolean; couponDeals: boolean }

function FilterChipsRow({ chips, setChips, hasCoupons }: {
  chips: ChipFilters; setChips: (c: ChipFilters) => void; hasCoupons: boolean
}) {
  const items: { key: keyof ChipFilters; label: string; Icon: React.ElementType; show: boolean }[] = [
    { key: 'topRated',     label: 'Top-rated products', Icon: Star,  show: true },
    { key: 'freeShipping', label: 'Free shipping',      Icon: Truck, show: true },
    { key: 'couponDeals',  label: 'Coupon deals',       Icon: Tag,   show: hasCoupons },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
      {items.filter(i => i.show).map(i => (
        <button
          key={i.key}
          onClick={() => setChips({ ...chips, [i.key]: !chips[i.key] })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1.5px solid ${chips[i.key] ? RED : '#e5e7eb'}`,
            background: chips[i.key] ? `${RED}0d` : '#fff',
            color: chips[i.key] ? RED : '#4b5563',
          }}
        >
          <i.Icon size={13} />
          {i.label}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerStorefrontPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [sellerLoading, setSellerLoading] = useState(true)
  const [sellerError, setSellerError] = useState(false)

  const [tab, setTab] = useState<Tab>('home')

  // ── All Products tab state ──
  const [f, setF] = useState<F>(DEFAULT_FILTERS)
  const [chips, setChips] = useState<ChipFilters>({ topRated: false, freeShipping: false, couponDeals: false })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mOpen, setMOpen] = useState(false)
  const [products, setProducts] = useState<GridProduct[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [productsTotal, setProductsTotal] = useState(0)
  const [productsLoading, setProductsLoading] = useState(true)

  // ── Home tab teaser ──
  const [recent, setRecent] = useState<GridProduct[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  // ── Special Offers tab ──
  const [packs, setPacks] = useState<Pack[]>([])
  const [packsLoading, setPacksLoading] = useState(true)

  // ── Follow ──
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setSellerLoading(true)
    setSellerError(false)
    fetch(`${API_URL}/sellers/${id}`, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(json => {
        if (json.success) { setSeller(json.data); setFollowersCount(json.data.followers_count) }
        else setSellerError(true)
      })
      .catch(() => setSellerError(true))
      .finally(() => setSellerLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !isAuthenticated()) return
    fetch(`${API_URL}/seller-follows/check/${id}`, { headers: { Accept: 'application/json', ...authHeaders() } })
      .then(r => r.json())
      .then(json => { if (json.success) setFollowing(json.data.following) })
      .catch(() => {})
  }, [id])

  // Recent-products teaser for Home — independent of the All Products pagination
  useEffect(() => {
    if (!id) return
    setRecentLoading(true)
    fetch(`${API_URL}/products?seller_id=${id}&sort=created_at&per_page=8`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((json: { success: boolean; data: Paginated<GridProduct> }) => { if (json.success) setRecent(json.data.data) })
      .catch(() => {})
      .finally(() => setRecentLoading(false))
  }, [id])

  // Packs for Special Offers — fetched once, not tab-gated, so switching tabs is instant
  useEffect(() => {
    if (!id) return
    setPacksLoading(true)
    fetch(`${API_URL}/packs?seller_id=${id}&per_page=12`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((json: { success: boolean; data: Paginated<Pack> }) => { if (json.success) setPacks(json.data.data) })
      .catch(() => {})
      .finally(() => setPacksLoading(false))
  }, [id])

  // Debounce the sidebar's search field before it hits the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(f.q), 400)
    return () => clearTimeout(t)
  }, [f.q])

  const attrQP = useMemo(
    () => Object.entries(f.attrs).filter(([, v]) => v.length).map(([s, ids]) => `${s}:${ids.join(',')}`).join('|'),
    [f.attrs]
  )

  useEffect(() => { setPage(1) }, [tab, f.sort, f.pMin, f.pMax, f.inStock, f.isPack, attrQP, debouncedSearch, chips])

  useEffect(() => {
    if (!id || tab !== 'products') return
    setProductsLoading(true)
    const qp = new URLSearchParams()
    qp.set('seller_id', String(id))
    qp.set('sort', f.sort)
    qp.set('page', String(page))
    qp.set('per_page', '20')
    if (debouncedSearch) qp.set('search', debouncedSearch)
    if (f.pMin) qp.set('price_min', f.pMin)
    if (f.pMax) qp.set('price_max', f.pMax)
    if (f.inStock) qp.set('in_stock', '1')
    if (f.isPack) qp.set('is_pack', '1')
    Object.entries(f.attrs).forEach(([s, ids]) => ids.forEach(v => qp.append(`attrs[${s}][]`, String(v))))
    if (chips.topRated) qp.set('min_rating', '4')
    if (chips.freeShipping) qp.set('free_delivery', '1')
    if (chips.couponDeals) qp.set('has_coupon', '1')

    fetch(`${API_URL}/products?${qp}`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((json: { success: boolean; data: Paginated<GridProduct> }) => {
        if (!json.success) return
        setProducts(prev => page === 1 ? json.data.data : [...prev, ...json.data.data])
        setLastPage(json.data.last_page)
        setProductsTotal(json.data.total)
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false))
  }, [id, tab, page, f.sort, f.pMin, f.pMax, f.inStock, f.isPack, attrQP, debouncedSearch, chips])

  const flashPromos    = useMemo(() => seller?.promotions.filter(p => p.type === 'flash_sale') ?? [], [seller])
  const discountPromos = useMemo(() => seller?.promotions.filter(p => p.type === 'discount') ?? [], [seller])
  const hasCoupons     = (seller?.coupons.length ?? 0) > 0

  const handleFollow = async () => {
    if (!isAuthenticated()) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(`/sellers/${id}`)}`)
      return
    }
    setFollowLoading(true)
    try {
      const res = await fetch(`${API_URL}/seller-follows/${id}`, { method: 'POST', headers: { Accept: 'application/json', ...authHeaders() } })
      const json = await res.json()
      if (json.success) { setFollowing(json.data.following); setFollowersCount(json.data.followers_count) }
    } catch { /* button stays in its previous state */ }
    finally { setFollowLoading(false) }
  }

  if (sellerLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" color={RED} />
      </div>
    )
  }

  if (sellerError || !seller) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'Barlow', sans-serif" }}>
        <Store size={40} color="#cbd5e1" />
        <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b' }}>This seller isn't available.</p>
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: RED, textDecoration: 'none' }}>Back to Home</Link>
      </div>
    )
  }

  const cover = resolveImg(seller.cover_photo)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`
        @media(max-width:920px) {
          .seller-pfs-col { display: none; }
          .seller-mobile-filters-btn { display: flex !important; }
        }
        @media(max-width:768px) { .seller-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      <div style={{ borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={11} />
          <span style={{ color: '#374151', fontWeight: 600 }}>{seller.business_name}</span>
        </div>
      </div>

      {/* Banner — persists across every tab */}
      <div style={{
        position: 'relative', padding: '36px 24px',
        background: cover
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${cover}) center/cover no-repeat`
          : `linear-gradient(135deg, ${RED}, #7f1d1d)`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: RED, flexShrink: 0, overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.6)',
          }}>
            {seller.avatar
              ? <img src={resolveImg(seller.avatar) ?? seller.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : seller.business_name.charAt(0).toUpperCase()
            }
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.01em' }}>{seller.business_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                <Package size={13} /> {seller.total_products} products
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                <Users size={13} /> {followersCount.toLocaleString()} followers
              </span>
              {seller.wilaya && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  <MapPin size={13} /> {seller.wilaya}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 999,
              border: following ? '1.5px solid rgba(255,255,255,0.5)' : 'none',
              background: following ? 'transparent' : '#fff',
              color: following ? '#fff' : RED,
              cursor: followLoading ? 'default' : 'pointer',
              opacity: followLoading ? 0.7 : 1,
            }}
          >
            <Heart size={14} fill={following ? '#fff' : 'none'} />
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        {seller.business_description && (
          <p style={{ maxWidth: 700, margin: '16px auto 0', fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
            {seller.business_description}
          </p>
        )}
      </div>

      {/* Promo/coupon chip strip — informational, jumps to Special Offers */}
      {(seller.promotions.length > 0 || seller.coupons.length > 0) && (
        <div style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6', padding: '10px 24px', overflowX: 'auto' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {seller.promotions.map(promo => (
              <button
                key={`promo-${promo.id}`}
                onClick={() => setTab('offers')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: '#fff', border: `1px solid ${promo.type === 'flash_sale' ? RED : GREEN}33`,
                  color: promo.type === 'flash_sale' ? RED : GREEN,
                  fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {promo.type === 'flash_sale' ? '⚡' : '🏷️'} {promo.name} · {promo.discount_label}
              </button>
            ))}
            {seller.coupons.map(c => (
              <button
                key={`coupon-${c.code}`}
                onClick={() => setTab('offers')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: '#fff', border: `1px solid ${RED}33`, color: RED,
                  fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                🎟️ {c.code} · {c.discount_label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* ══════════════════ HOME ══════════════════ */}
      {tab === 'home' && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 56px' }}>
          {flashPromos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} color={RED} fill={RED} />
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>Flash Sale Highlights</h2>
                </div>
                <button onClick={() => setTab('offers')} style={{ background: 'none', border: 'none', color: RED, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                  View All <ChevronRight size={13} />
                </button>
              </div>
              <ProductRow products={flashPromos.flatMap(promoProductsToGrid).slice(0, 8)} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>Recently Added</h2>
              <button onClick={() => setTab('products')} style={{ background: 'none', border: 'none', color: RED, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                View All Products <ChevronRight size={13} />
              </button>
            </div>
            {recentLoading ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</p>
            ) : recent.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>This seller has no products yet.</p>
            ) : (
              <div className="seller-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
                {recent.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ ALL PRODUCTS ══════════════════ */}
      {tab === 'products' && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 56px', display: 'grid', gridTemplateColumns: '246px 1fr', gap: 22, alignItems: 'start' }}>
          <div className="seller-pfs-col">
            <ProductFilterSidebar
              f={f} setF={setF} total={productsTotal}
              sellerId={id} hideSearch
              mOpen={mOpen} setMOpen={setMOpen}
            />
          </div>

          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f8f8', border: '1.5px solid #eee', borderRadius: 10, padding: '9px 12px', flex: 1, maxWidth: 420 }}>
                <Search size={14} color="#9ca3af" />
                <input
                  value={f.q}
                  onChange={e => setF({ ...f, q: e.target.value })}
                  placeholder="Search in store…"
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, flex: 1, fontFamily: 'inherit' }}
                />
              </div>
              <button
                onClick={() => setMOpen(true)}
                className="seller-mobile-filters-btn"
                style={{ display: 'none', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', flexShrink: 0 }}
              >
                Filters
              </button>
            </div>

            <FilterChipsRow chips={chips} setChips={setChips} hasCoupons={hasCoupons} />

            {products.length === 0 && !productsLoading ? (
              <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>No products match these filters.</p>
            ) : (
              <div className="seller-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {page < lastPage && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={productsLoading}
                  style={{
                    background: 'transparent', border: '1.5px solid #e5e7eb', color: '#374151',
                    fontSize: 13, fontWeight: 700, padding: '10px 28px', borderRadius: 999,
                    cursor: productsLoading ? 'default' : 'pointer', opacity: productsLoading ? 0.6 : 1,
                  }}
                >
                  {productsLoading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ SPECIAL OFFERS ══════════════════ */}
      {tab === 'offers' && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 56px' }}>
          {flashPromos.length === 0 && discountPromos.length === 0 && packs.length === 0 && seller.coupons.length === 0 && !packsLoading ? (
            <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>No special offers right now — check back soon.</p>
          ) : (
            <>
              {flashPromos.map(promo => (
                <div key={`flash-${promo.id}`} style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Zap size={16} color={RED} fill={RED} />
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>{promo.name}</h2>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: RED, padding: '2px 9px', borderRadius: 999 }}>{promo.discount_label}</span>
                  </div>
                  <ProductRow products={promoProductsToGrid(promo)} />
                </div>
              ))}

              {discountPromos.map(promo => (
                <div key={`discount-${promo.id}`} style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Tag size={16} color={GREEN} />
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0 }}>{promo.name}</h2>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: GREEN, padding: '2px 9px', borderRadius: 999 }}>{promo.discount_label}</span>
                  </div>
                  <ProductRow products={promoProductsToGrid(promo)} />
                </div>
              ))}

              {packs.length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 14px' }}>Bundles &amp; Packs</h2>
                  <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6 }}>
                    {packs.map(p => <PackCard key={p.id} pack={p} />)}
                  </div>
                </div>
              )}

              {seller.coupons.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 14px' }}>Coupon Codes</h2>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {seller.coupons.map(c => <CouponChip key={c.code} coupon={c} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
