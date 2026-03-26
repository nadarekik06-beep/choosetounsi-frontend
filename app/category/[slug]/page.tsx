'use client'

/**
 * app/category/[slug]/page.tsx
 * Design: EXACT ORIGINAL (Trendyol-inspired #db142e / #198f41)
 * Fix: useSearchParams wrapped in Suspense, ?sub= correctly sent to API as subcategory_slug
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: number; image_path: string; is_primary: boolean; url?: string
}
interface Product {
  id: number; name: string; slug: string; price: string; stock: number
  views?: number; short_description?: string
  primary_image?: ProductImage | null; primary_image_url?: string | null
  seller?: { id: number; name: string }
  rating?: number; review_count?: number
  original_price?: string; is_new?: boolean; is_bestseller?: boolean
}
interface Category {
  id: number; name: string; name_ar: string; slug: string
  icon: string | null; image: string | null; description?: string | null
}
interface PaginatedProducts {
  data: Product[]; current_page: number; last_page: number
  total: number; from: number; to: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
type SortKey = 'created_at' | 'views' | 'price_asc' | 'price_desc'
type ViewMode = 'grid' | 'list'

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'created_at', label: 'Newest',            icon: '✨' },
  { key: 'views',      label: 'Most Popular',      icon: '🔥' },
  { key: 'price_asc',  label: 'Price: Low → High', icon: '↑'  },
  { key: 'price_desc', label: 'Price: High → Low', icon: '↓'  },
]

function resolveProductImage(product: Product): string | null {
  if (product.primary_image_url) {
    return product.primary_image_url.startsWith('http')
      ? product.primary_image_url
      : `${API_URL}${product.primary_image_url}`
  }
  if (product.primary_image?.url) {
    const u = product.primary_image.url
    return u.startsWith('http') ? u : `${API_URL}${u}`
  }
  if (product.primary_image?.image_path) return `${API_URL}/storage/${product.primary_image.image_path}`
  return null
}

const formatPrice = (price: string | number) => `${Number(price).toFixed(2)} DT`

function discountPercent(original: string, current: string) {
  const o = Number(original); const c = Number(current)
  if (!o || o <= c) return null
  return Math.round(((o - c) / o) * 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (exact original design)
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({ rating = 0, count = 0 }: { rating?: number; count?: number }) {
  return (
    <div className="ct-stars">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#f59e0b' : '#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      {count > 0 && <span className="ct-review-count">({count.toLocaleString()})</span>}
    </div>
  )
}

function CartBtn({ productId, stock }: { productId: number; stock: number }) {
  const { addToCart } = useCart()
  const [state, setState] = useState<'idle'|'loading'|'done'>('idle')
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (stock <= 0 || state !== 'idle') return
    setState('loading'); await addToCart(productId); setState('done')
    setTimeout(() => setState('idle'), 2000)
  }
  const oos = stock <= 0
  return (
    <button className={`ct-cart-btn ${oos?'ct-cart-btn--oos':''} ${state==='done'?'ct-cart-btn--done':''}`}
      onClick={handle} disabled={oos||state==='loading'}>
      {state==='loading' && <span className="ct-spinner"/>}
      {state==='done' && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
      {state==='idle' && !oos && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
      <span>{oos?'Out of Stock':state==='done'?'Added!':'Add to Cart'}</span>
    </button>
  )
}

function WishBtn({ productId }: { productId: number }) {
  const [active, setActive] = useState(false)
  return (
    <button className={`ct-wish-btn ${active?'ct-wish-btn--on':''}`}
      onClick={e => { e.preventDefault(); e.stopPropagation(); setActive(v=>!v) }} aria-label="Wishlist">
      <svg width="16" height="16" fill={active?'#db142e':'none'} stroke={active?'#db142e':'#888'} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const imgSrc = resolveProductImage(product)
  const [imgErr, setImgErr] = useState(false)
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null
  return (
    <Link href={`/products/${product.slug}`} className="ct-card" style={{ animationDelay:`${Math.min(index*0.05,0.5)}s` }}>
      <div className="ct-card__img-wrap">
        {imgSrc && !imgErr
          ? <Image src={imgSrc} alt={product.name} fill className="ct-card__img" onError={() => setImgErr(true)} unoptimized/>
          : <div className="ct-card__no-img"><svg width="36" height="36" fill="none" stroke="#d1d5db" strokeWidth="1.4" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>
        }
        <div className="ct-card__badges">
          {product.is_bestseller && <span className="ct-badge ct-badge--hot">🏆 Bestseller</span>}
          {product.is_new && <span className="ct-badge ct-badge--new">NEW</span>}
          {discount && <span className="ct-badge ct-badge--sale">-{discount}%</span>}
        </div>
        {product.stock === 0 && <div className="ct-card__oos"><span>Out of Stock</span></div>}
        <WishBtn productId={product.id}/>
        <div className="ct-card__hover-bar"><CartBtn productId={product.id} stock={product.stock}/></div>
      </div>
      <div className="ct-card__body">
        {product.seller?.name && <p className="ct-card__seller">{product.seller.name}</p>}
        <p className="ct-card__name">{product.name}</p>
        {product.rating !== undefined && <StarRating rating={product.rating} count={product.review_count}/>}
        <div className="ct-card__price-row">
          <span className="ct-card__price">{formatPrice(product.price)}</span>
          {product.original_price && Number(product.original_price) > Number(product.price) && (
            <span className="ct-card__orig">{formatPrice(product.original_price)}</span>
          )}
        </div>
        {product.stock > 0 && product.stock < 10 && <p className="ct-card__low-stock">Only {product.stock} left!</p>}
      </div>
    </Link>
  )
}

function ProductListCard({ product, index }: { product: Product; index: number }) {
  const imgSrc = resolveProductImage(product)
  const [imgErr, setImgErr] = useState(false)
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null
  return (
    <Link href={`/products/${product.slug}`} className="ct-list-card" style={{ animationDelay:`${Math.min(index*0.04,0.4)}s` }}>
      <div className="ct-list-card__img-wrap">
        {imgSrc && !imgErr
          ? <Image src={imgSrc} alt={product.name} fill className="ct-list-card__img" onError={() => setImgErr(true)} unoptimized/>
          : <div className="ct-card__no-img"/>}
        {discount && <span className="ct-badge ct-badge--sale" style={{ position:'absolute',top:8,left:8,zIndex:2 }}>-{discount}%</span>}
      </div>
      <div className="ct-list-card__body">
        {product.seller?.name && <p className="ct-card__seller">{product.seller.name}</p>}
        <p className="ct-list-card__name">{product.name}</p>
        {product.short_description && <p className="ct-list-card__desc">{product.short_description}</p>}
        {product.rating !== undefined && <StarRating rating={product.rating} count={product.review_count}/>}
        <div className="ct-list-card__footer">
          <div className="ct-card__price-row">
            <span className="ct-card__price">{formatPrice(product.price)}</span>
            {product.original_price && Number(product.original_price) > Number(product.price) && (
              <span className="ct-card__orig">{formatPrice(product.original_price)}</span>
            )}
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <WishBtn productId={product.id}/><CartBtn productId={product.id} stock={product.stock}/>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="ct-skeleton">
      <div className="ct-skeleton__img"/>
      <div className="ct-skeleton__body">
        <div className="ct-skeleton__line" style={{ width:'40%',height:10 }}/>
        <div className="ct-skeleton__line" style={{ width:'85%',height:14 }}/>
        <div className="ct-skeleton__line" style={{ width:'60%',height:14 }}/>
        <div className="ct-skeleton__line" style={{ width:'35%',height:18,marginTop:8 }}/>
      </div>
    </div>
  )
}

interface FilterState { search: string; priceMin: string; priceMax: string; inStock: boolean; sort: SortKey }

function Sidebar({ filters, setFilters, total, mobileOpen, setMobileOpen }: {
  filters: FilterState; setFilters: (f: FilterState) => void
  total: number; mobileOpen: boolean; setMobileOpen: (v: boolean) => void
}) {
  const upd = (p: Partial<FilterState>) => setFilters({ ...filters, ...p })
  const hasActive = !!(filters.search || filters.inStock || filters.priceMin || filters.priceMax)
  const reset = () => setFilters({ search:'',priceMin:'',priceMax:'',inStock:false,sort:filters.sort })
  const content = (
    <aside className="ct-sidebar">
      <div className="ct-sidebar__header">
        <div>
          <h3 className="ct-sidebar__title">Filters</h3>
          <p className="ct-sidebar__count">{total.toLocaleString()} products</p>
        </div>
        {hasActive && (
          <button className="ct-sidebar__reset" onClick={reset}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 3l18 18M3 21L21 3"/></svg>
            Clear all
          </button>
        )}
      </div>
      <div className="ct-filter-section">
        <p className="ct-filter-label">Search in category</p>
        <div className="ct-filter-search">
          <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search products..." value={filters.search} onChange={e => upd({ search:e.target.value })}/>
          {filters.search && (
            <button onClick={() => upd({ search:'' })} style={{ background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:0 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>
      <div className="ct-filter-section">
        <p className="ct-filter-label">Sort by</p>
        <div className="ct-filter-sort-list">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} className={`ct-sort-option ${filters.sort===opt.key?'ct-sort-option--active':''}`} onClick={() => upd({ sort:opt.key })}>
              <span>{opt.icon}</span><span>{opt.label}</span>
              {filters.sort===opt.key && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft:'auto' }}><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      </div>
      <div className="ct-filter-section">
        <p className="ct-filter-label">Price range</p>
        <div className="ct-price-inputs">
          <input type="number" min="0" placeholder="Min" value={filters.priceMin} onChange={e => upd({ priceMin:e.target.value })} className="ct-price-input"/>
          <span className="ct-price-sep">–</span>
          <input type="number" min="0" placeholder="Max" value={filters.priceMax} onChange={e => upd({ priceMax:e.target.value })} className="ct-price-input"/>
          <button className="ct-price-go"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></button>
        </div>
      </div>
      <div className="ct-filter-section">
        <p className="ct-filter-label">Availability</p>
        <label className="ct-toggle-label">
          <span>In stock only</span>
          <div className={`ct-toggle ${filters.inStock?'ct-toggle--on':''}`} onClick={() => upd({ inStock:!filters.inStock })}>
            <div className="ct-toggle__thumb"/>
          </div>
        </label>
      </div>
      <button className="ct-sidebar__mobile-close" onClick={() => setMobileOpen(false)}>Apply Filters</button>
    </aside>
  )
  return (
    <>
      <div className="ct-sidebar-desktop">{content}</div>
      {mobileOpen && (
        <>
          <div className="ct-sidebar-backdrop" onClick={() => setMobileOpen(false)}/>
          <div className="ct-sidebar-mobile">{content}</div>
        </>
      )}
    </>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  const pages = Array.from({ length:total },(_,i)=>i+1)
    .filter(p => p===1||p===total||Math.abs(p-current)<=1)
    .reduce<(number|'...')[]>((acc,p,idx,arr) => {
      if (idx>0&&(p as number)-(arr[idx-1] as number)>1) acc.push('...')
      acc.push(p); return acc
    },[])
  return (
    <div className="ct-pagination">
      <button className="ct-page-btn" onClick={() => onChange(Math.max(1,current-1))} disabled={current===1}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {pages.map((p,i) => p==='...'
        ? <span key={`e${i}`} className="ct-page-ellipsis">…</span>
        : <button key={p} className={`ct-page-btn ${current===p?'ct-page-btn--active':''}`} onClick={() => onChange(p as number)}>{p}</button>
      )}
      <button className="ct-page-btn" onClick={() => onChange(Math.min(total,current+1))} disabled={current===total}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner page — uses useSearchParams (must be inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

function CategoryPageInner() {
  const params       = useParams()
  const searchParams = useSearchParams()           // ← requires Suspense boundary
  const slug         = params?.slug as string

  // Read ?sub= from URL — set by Navbar when user clicks a subcategory link
  const subSlug = searchParams.get('sub') ?? ''

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<PaginatedProducts | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [catError, setCatError] = useState(false)
  const [page,     setPage]     = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    search:'', priceMin:'', priceMax:'', inStock:false, sort:'created_at',
  })

  useEffect(() => { setMounted(true) }, [])

  // Fetch category info
  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/categories/${slug}`, { headers:{ Accept:'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setCategory(json.data))
      .catch(() => setCatError(true))
  }, [slug])

  // Fetch products — re-runs whenever slug, subSlug, sort, price filters, inStock, or page changes
  const fetchProducts = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const sortBy    = filters.sort === 'price_asc' || filters.sort === 'price_desc' ? 'price' : filters.sort
      const sortOrder = filters.sort === 'price_asc' ? 'asc' : 'desc'

      const qp = new URLSearchParams()
      qp.set('page',  String(page))
      qp.set('sort',  sortBy)
      qp.set('order', sortOrder)

      // ✅ Send subcategory_slug to the backend when ?sub= is present in URL
      if (subSlug) qp.set('subcategory_slug', subSlug)

      // Server-side price / stock filters
      if (filters.priceMin) qp.set('price_min', filters.priceMin)
      if (filters.priceMax) qp.set('price_max', filters.priceMax)
      if (filters.inStock)  qp.set('in_stock', '1')

      const url = `${API_URL}/api/categories/${slug}/products?${qp.toString()}`
      const res = await fetch(url, { headers:{ Accept:'application/json' } })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setProducts(json.data)
    } catch {
      setProducts(null)
    } finally {
      setLoading(false)
    }
  }, [slug, subSlug, filters.sort, filters.priceMin, filters.priceMax, filters.inStock, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Reset to page 1 when filters or subcategory changes
  useEffect(() => { setPage(1) }, [filters.sort, filters.priceMin, filters.priceMax, filters.inStock, subSlug])

  // Client-side search filter (fast, no extra API call)
  const filteredProducts = useMemo(() => {
    if (!products?.data) return []
    if (!filters.search) return products.data
    const q = filters.search.toLowerCase()
    return products.data.filter(p => p.name.toLowerCase().includes(q))
  }, [products, filters.search])

  const activeFilterCount = [
    filters.search !== '',
    filters.inStock,
    filters.priceMin !== '' || filters.priceMax !== '',
    subSlug !== '',
  ].filter(Boolean).length

  // Human-readable subcategory label for display
  const subLabel = subSlug
    ? subSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        .ct-page{min-height:100vh;background:#f6f6f8;font-family:'DM Sans',sans-serif;color:#111}
        @keyframes ct-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ct-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes ct-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        @keyframes ct-spin{to{transform:rotate(360deg)}}
        @keyframes ct-pop{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}
        .ct-breadcrumb{background:#fff;border-bottom:1px solid #eee;padding:0}
        .ct-breadcrumb__inner{max-width:1440px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af;font-weight:500}
        .ct-breadcrumb__inner a{color:#9ca3af;text-decoration:none;transition:color 0.15s}
        .ct-breadcrumb__inner a:hover{color:#db142e}
        .ct-breadcrumb__inner span{color:#374151;font-weight:600}
        .ct-hero{background:linear-gradient(135deg,#fff5f5 0%,#fef2f2 40%,#fff 100%);border-bottom:1px solid #fde8e8;padding:36px 28px 32px;position:relative;overflow:hidden}
        .ct-hero__inner{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .ct-hero__left{display:flex;align-items:center;gap:20px}
        .ct-hero__icon-wrap{width:72px;height:72px;border-radius:20px;background:#db142e;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;box-shadow:0 8px 24px rgba(219,20,46,0.3)}
        .ct-hero__eyebrow{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#db142e;margin:0 0 6px}
        .ct-hero__title{font-family:'DM Serif Display',serif;font-size:clamp(2rem,4vw,3rem);color:#111;margin:0 0 8px;line-height:1}
        .ct-hero__sub-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(219,20,46,0.08);border:1px solid rgba(219,20,46,0.2);color:#db142e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;margin-top:4px;text-transform:capitalize;letter-spacing:0.02em}
        .ct-hero__desc{font-size:13px;color:#6b7280;margin:0;max-width:420px;line-height:1.6}
        .ct-hero__stats{display:flex;align-items:center;gap:28px;flex-shrink:0}
        .ct-hero__stat{text-align:center}
        .ct-hero__stat-num{font-family:'DM Serif Display',serif;font-size:2rem;color:#111;line-height:1;display:block}
        .ct-hero__stat-label{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em}
        .ct-hero__bg-shape{position:absolute;right:-60px;top:-40px;width:300px;height:300px;border-radius:50%;background:rgba(219,20,46,0.04);pointer-events:none}
        .ct-hero__bg-shape2{position:absolute;right:80px;bottom:-80px;width:200px;height:200px;border-radius:50%;background:rgba(25,143,65,0.04);pointer-events:none}
        .ct-toolbar{background:#fff;border-bottom:1px solid #eee;position:sticky;top:0;z-index:40;box-shadow:0 1px 12px rgba(0,0,0,0.04)}
        .ct-toolbar__inner{max-width:1440px;margin:0 auto;padding:10px 28px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .ct-toolbar__left{display:flex;align-items:center;gap:10px;flex:1;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
        .ct-toolbar__left::-webkit-scrollbar{display:none}
        .ct-toolbar__right{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .ct-toolbar__result-count{font-size:12px;color:#9ca3af;font-weight:500;white-space:nowrap}
        .ct-filter-toggle{display:none;align-items:center;gap:7px;padding:8px 14px;background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:all 0.18s;white-space:nowrap;flex-shrink:0}
        .ct-filter-toggle:hover{border-color:#db142e;color:#db142e}
        .ct-filter-badge{background:#db142e;color:#fff;font-size:10px;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px}
        .ct-sort-pill{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:999px;border:1.5px solid #e5e7eb;background:transparent;font-size:12px;font-weight:600;color:#52525b;cursor:pointer;transition:all 0.18s;white-space:nowrap;flex-shrink:0}
        .ct-sort-pill:hover{border-color:#db142e;color:#db142e}
        .ct-sort-pill--active{background:#db142e;border-color:#db142e;color:#fff}
        .ct-view-btn{width:36px;height:36px;border-radius:8px;border:1.5px solid #e5e7eb;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9ca3af;transition:all 0.18s}
        .ct-view-btn:hover{border-color:#db142e;color:#db142e}
        .ct-view-btn--active{border-color:#db142e;color:#db142e;background:#fef2f2}
        .ct-layout{max-width:1440px;margin:0 auto;padding:28px;display:grid;grid-template-columns:270px 1fr;gap:24px;align-items:start}
        .ct-sidebar-desktop{display:block}
        .ct-sidebar{background:#fff;border-radius:16px;border:1px solid #f0f0f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);position:sticky;top:70px}
        .ct-sidebar__header{padding:18px 20px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
        .ct-sidebar__title{font-size:15px;font-weight:800;color:#111;margin:0 0 2px}
        .ct-sidebar__count{font-size:11px;color:#9ca3af;font-weight:500;margin:0}
        .ct-sidebar__reset{display:flex;align-items:center;gap:5px;background:#fef2f2;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:#db142e;cursor:pointer;transition:background 0.15s}
        .ct-sidebar__reset:hover{background:#fee2e2}
        .ct-filter-section{padding:16px 20px;border-bottom:1px solid #f7f7f7}
        .ct-filter-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin:0 0 10px}
        .ct-filter-search{display:flex;align-items:center;gap:8px;background:#f8f8f8;border:1.5px solid #f0f0f0;border-radius:10px;padding:8px 12px;transition:border-color 0.18s}
        .ct-filter-search:focus-within{border-color:#db142e}
        .ct-filter-search input{flex:1;border:none;background:transparent;font-size:13px;font-family:'DM Sans',sans-serif;color:#111;outline:none}
        .ct-filter-search input::placeholder{color:#c4c4c4}
        .ct-filter-sort-list{display:flex;flex-direction:column;gap:2px}
        .ct-sort-option{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;font-size:13px;font-weight:500;color:#52525b;border:none;background:transparent;cursor:pointer;transition:all 0.15s;text-align:left}
        .ct-sort-option:hover{background:#f8f8f8;color:#db142e}
        .ct-sort-option--active{background:#fef2f2;color:#db142e;font-weight:700}
        .ct-price-inputs{display:flex;align-items:center;gap:6px}
        .ct-price-input{flex:1;min-width:0;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:'DM Sans',sans-serif;color:#111;background:#f8f8f8;outline:none;transition:border-color 0.18s;-moz-appearance:textfield}
        .ct-price-input::-webkit-outer-spin-button,.ct-price-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .ct-price-input:focus{border-color:#db142e;background:#fff}
        .ct-price-input::placeholder{color:#c4c4c4}
        .ct-price-sep{font-size:13px;color:#9ca3af;font-weight:600;flex-shrink:0}
        .ct-price-go{width:34px;height:34px;background:#db142e;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;flex-shrink:0;transition:background 0.18s}
        .ct-price-go:hover{background:#b91c1c}
        .ct-toggle-label{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;color:#374151;cursor:pointer}
        .ct-toggle{width:40px;height:22px;border-radius:999px;background:#e5e7eb;position:relative;transition:background 0.22s;cursor:pointer;flex-shrink:0}
        .ct-toggle--on{background:#db142e}
        .ct-toggle__thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.18);transition:transform 0.22s}
        .ct-toggle--on .ct-toggle__thumb{transform:translateX(18px)}
        .ct-sidebar__mobile-close{display:none;width:calc(100% - 40px);margin:16px 20px;padding:13px;background:#db142e;color:#fff;font-weight:800;font-size:14px;border:none;border-radius:12px;cursor:pointer}
        .ct-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;backdrop-filter:blur(2px)}
        .ct-sidebar-mobile{position:fixed;left:0;top:0;bottom:0;z-index:201;width:300px;max-width:90vw;overflow-y:auto;background:#fff;box-shadow:6px 0 32px rgba(0,0,0,0.15);animation:ct-fade-in 0.2s ease}
        .ct-sidebar-mobile .ct-sidebar{border-radius:0;position:static;box-shadow:none;border:none}
        .ct-sidebar-mobile .ct-sidebar__mobile-close{display:block}
        .ct-main{}
        .ct-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;background:#fff;border-radius:16px;border:1px solid #f0f0f0;text-align:center;gap:12px}
        .ct-empty__emoji{font-size:4rem}
        .ct-empty__title{font-size:18px;font-weight:800;color:#374151;margin:0}
        .ct-empty__sub{font-size:13px;color:#9ca3af;margin:0;max-width:300px;line-height:1.6}
        .ct-empty__link{margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:11px 24px;background:#db142e;color:#fff;font-weight:800;font-size:13px;border-radius:12px;text-decoration:none;transition:background 0.18s}
        .ct-empty__link:hover{background:#b91c1c}
        .ct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
        .ct-list{display:flex;flex-direction:column;gap:12px}
        .ct-card{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;animation:ct-fade-up 0.42s ease both;transition:box-shadow 0.24s ease,border-color 0.24s ease,transform 0.24s ease;will-change:transform;cursor:pointer}
        .ct-card:hover{box-shadow:0 12px 40px rgba(0,0,0,0.1);border-color:#e5e7eb;transform:translateY(-4px)}
        .ct-card__img-wrap{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#f8f8f8;flex-shrink:0}
        .ct-card__img{object-fit:cover!important;object-position:top center!important;transition:transform 0.5s ease}
        .ct-card:hover .ct-card__img{transform:scale(1.07)}
        .ct-card__no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f4f4f6}
        .ct-card__badges{position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:5px;z-index:3}
        .ct-badge{font-size:9px;font-weight:800;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap}
        .ct-badge--hot{background:#111;color:#fbbf24}
        .ct-badge--new{background:#198f41;color:#fff}
        .ct-badge--sale{background:#db142e;color:#fff}
        .ct-card__oos{position:absolute;inset:0;z-index:5;background:rgba(255,255,255,0.72);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center}
        .ct-card__oos span{background:#1f2937;color:#fff;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:6px 14px;border-radius:999px}
        .ct-wish-btn{position:absolute;top:10px;right:10px;z-index:4;width:32px;height:32px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.12);transition:transform 0.2s ease,background 0.2s;backdrop-filter:blur(4px)}
        .ct-wish-btn:hover{transform:scale(1.15);background:#fff}
        .ct-wish-btn--on{animation:ct-pop 0.35s ease}
        .ct-card__hover-bar{position:absolute;bottom:0;left:0;right:0;padding:0 10px 10px;z-index:4;transform:translateY(100%);transition:transform 0.26s cubic-bezier(0.34,1.56,0.64,1)}
        .ct-card:hover .ct-card__hover-bar{transform:translateY(0)}
        .ct-cart-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:10px;background:#db142e;color:#fff;font-size:12px;font-weight:800;letter-spacing:0.02em;border:none;border-radius:10px;cursor:pointer;box-shadow:0 4px 16px rgba(219,20,46,0.4);transition:background 0.18s,transform 0.15s;font-family:'DM Sans',sans-serif}
        .ct-cart-btn:hover{background:#b91c1c;transform:scale(1.02)}
        .ct-cart-btn:disabled{cursor:not-allowed}
        .ct-cart-btn--oos{background:#e5e7eb;color:#9ca3af;box-shadow:none}
        .ct-cart-btn--done{background:#198f41;box-shadow:0 4px 16px rgba(25,143,65,0.35)}
        .ct-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:ct-spin 0.7s linear infinite}
        .ct-card__body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
        .ct-card__seller{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.07em;margin:0}
        .ct-card__name{font-size:13px;font-weight:600;color:#1f2937;line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color 0.15s}
        .ct-card:hover .ct-card__name{color:#db142e}
        .ct-card__price-row{display:flex;align-items:baseline;gap:6px;margin-top:4px}
        .ct-card__price{font-size:15px;font-weight:800;color:#db142e}
        .ct-card__orig{font-size:11px;font-weight:500;color:#9ca3af;text-decoration:line-through}
        .ct-card__low-stock{font-size:10px;font-weight:700;color:#f97316;margin:2px 0 0;background:#fff7ed;padding:2px 8px;border-radius:999px;display:inline-block}
        .ct-stars{display:flex;align-items:center;gap:2px;margin-top:2px}
        .ct-review-count{font-size:10px;color:#9ca3af;font-weight:500;margin-left:3px}
        .ct-list-card{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden;display:flex;flex-direction:row;text-decoration:none;animation:ct-fade-up 0.42s ease both;transition:box-shadow 0.22s,border-color 0.22s,transform 0.22s}
        .ct-list-card:hover{box-shadow:0 8px 28px rgba(0,0,0,0.08);border-color:#e5e7eb;transform:translateX(3px)}
        .ct-list-card__img-wrap{position:relative;width:160px;flex-shrink:0}
        .ct-list-card__img{object-fit:cover!important;transition:transform 0.4s ease}
        .ct-list-card:hover .ct-list-card__img{transform:scale(1.05)}
        .ct-list-card__body{padding:20px 20px;display:flex;flex-direction:column;gap:6px;flex:1}
        .ct-list-card__name{font-size:16px;font-weight:700;color:#1f2937;margin:0;line-height:1.4;transition:color 0.15s}
        .ct-list-card:hover .ct-list-card__name{color:#db142e}
        .ct-list-card__desc{font-size:13px;color:#6b7280;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ct-list-card__footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px;gap:12px;flex-wrap:wrap}
        .ct-skeleton{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden}
        .ct-skeleton__img{aspect-ratio:3/4;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:600px 100%;animation:ct-shimmer 1.3s infinite linear}
        .ct-skeleton__body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px}
        .ct-skeleton__line{height:12px;border-radius:4px;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:600px 100%;animation:ct-shimmer 1.3s infinite linear}
        .ct-pagination{display:flex;align-items:center;justify-content:center;gap:6px;padding:32px 0 0;flex-wrap:wrap}
        .ct-page-btn{width:38px;height:38px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#52525b;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s;font-family:'DM Sans',sans-serif}
        .ct-page-btn:hover:not(:disabled){border-color:#db142e;color:#db142e}
        .ct-page-btn:disabled{opacity:0.35;cursor:not-allowed}
        .ct-page-btn--active{background:#db142e;border-color:#db142e;color:#fff}
        .ct-page-ellipsis{color:#9ca3af;font-size:14px;font-weight:600;padding:0 4px}
        @media(max-width:1100px){.ct-layout{grid-template-columns:240px 1fr}}
        @media(max-width:880px){
          .ct-layout{grid-template-columns:1fr;padding:16px}
          .ct-sidebar-desktop{display:none}
          .ct-filter-toggle{display:flex}
          .ct-hero__stats{display:none}
          .ct-hero__title{font-size:1.8rem}
          .ct-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
          .ct-list-card__img-wrap{width:120px}
        }
        @media(max-width:540px){
          .ct-hero__inner{flex-direction:column;align-items:flex-start;gap:12px}
          .ct-hero{padding:24px 20px}
          .ct-breadcrumb__inner{padding:10px 20px}
          .ct-toolbar__inner{padding:10px 20px}
          .ct-layout{padding:12px 16px}
          .ct-grid{grid-template-columns:repeat(2,1fr);gap:10px}
          .ct-hero__icon-wrap{width:56px;height:56px;font-size:1.5rem}
        }
      `}</style>

      <div className="ct-page">

        {/* BREADCRUMB */}
        <div className="ct-breadcrumb">
          <div className="ct-breadcrumb__inner">
            <Link href="/">Home</Link>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            <Link href="/shop">Shop</Link>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            {subSlug ? (
              <>
                <Link href={`/category/${slug}`}>{category?.name ?? '...'}</Link>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                <span>{subLabel}</span>
              </>
            ) : (
              <span>{category?.name ?? '...'}</span>
            )}
          </div>
        </div>

        {/* HERO */}
        <div className="ct-hero">
          <div className="ct-hero__bg-shape"/>
          <div className="ct-hero__bg-shape2"/>
          <div className="ct-hero__inner">
            <div className="ct-hero__left" style={{ opacity:mounted?1:0, transform:mounted?'none':'translateY(12px)', transition:'opacity 0.5s ease,transform 0.5s ease' }}>
              {category?.icon && <div className="ct-hero__icon-wrap">{category.icon}</div>}
              <div>
                <p className="ct-hero__eyebrow">Category</p>
                <h1 className="ct-hero__title">
                  {catError ? 'Not Found' : category?.name ?? (
                    <span style={{ display:'inline-block',width:220,height:38,background:'#f0f0f0',borderRadius:8,animation:'ct-shimmer 1.3s infinite linear',backgroundSize:'600px 100%' }}/>
                  )}
                </h1>
                {/* Show subcategory badge when filtering */}
                {subSlug && (
                  <span className="ct-hero__sub-badge">
                    <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                    {subLabel}
                  </span>
                )}
                {!subSlug && category?.description && <p className="ct-hero__desc">{category.description}</p>}
              </div>
            </div>
            {products && (
              <div className="ct-hero__stats" style={{ opacity:mounted?1:0,transition:'opacity 0.6s ease 0.2s' }}>
                <div className="ct-hero__stat">
                  <span className="ct-hero__stat-num">{products.total.toLocaleString()}</span>
                  <span className="ct-hero__stat-label">Products</span>
                </div>
                <div style={{ width:1,height:40,background:'#f0d0d0' }}/>
                <div className="ct-hero__stat">
                  <span className="ct-hero__stat-num">{products.last_page}</span>
                  <span className="ct-hero__stat-label">Pages</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="ct-toolbar">
          <div className="ct-toolbar__inner">
            <div className="ct-toolbar__left">
              <button className="ct-filter-toggle" onClick={() => setMobileFilterOpen(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
                Filters
                {activeFilterCount > 0 && <span className="ct-filter-badge">{activeFilterCount}</span>}
              </button>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.key} className={`ct-sort-pill ${filters.sort===opt.key?'ct-sort-pill--active':''}`}
                  onClick={() => setFilters({ ...filters,sort:opt.key })}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            <div className="ct-toolbar__right">
              {products && (
                <span className="ct-toolbar__result-count">{filteredProducts.length} of {products.total}</span>
              )}
              <button className={`ct-view-btn ${viewMode==='grid'?'ct-view-btn--active':''}`} onClick={() => setViewMode('grid')} title="Grid view">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button className={`ct-view-btn ${viewMode==='list'?'ct-view-btn--active':''}`} onClick={() => setViewMode('list')} title="List view">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="ct-layout">
          <Sidebar filters={filters} setFilters={setFilters} total={products?.total??0}
            mobileOpen={mobileFilterOpen} setMobileOpen={setMobileFilterOpen}/>
          <div className="ct-main">
            {loading && (
              <div className={viewMode==='grid'?'ct-grid':'ct-list'}>
                {Array.from({ length:10 }).map((_,i) => <SkeletonCard key={i}/>)}
              </div>
            )}
            {!loading && filteredProducts.length === 0 && (
              <div className="ct-empty">
                <span className="ct-empty__emoji">🛍️</span>
                <p className="ct-empty__title">
                  {filters.search || filters.inStock || filters.priceMin || filters.priceMax
                    ? 'No products match your filters'
                    : subSlug
                    ? `No products in "${subLabel}" yet`
                    : 'No products yet in this category'}
                </p>
                <p className="ct-empty__sub">
                  {subSlug
                    ? 'Try browsing all products in this category instead.'
                    : filters.search||filters.inStock
                    ? "Try adjusting your search or filters."
                    : "Sellers haven't added approved products here yet. Check back soon!"}
                </p>
                {subSlug ? (
                  <Link href={`/category/${slug}`} className="ct-empty__link">
                    View all {category?.name}
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                ) : (
                  <Link href="/shop" className="ct-empty__link">
                    Browse All Products
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                )}
              </div>
            )}
            {!loading && filteredProducts.length > 0 && (
              <>
                {viewMode==='grid' ? (
                  <div className="ct-grid">
                    {filteredProducts.map((p,i) => <ProductCard key={p.id} product={p} index={i}/>)}
                  </div>
                ) : (
                  <div className="ct-list">
                    {filteredProducts.map((p,i) => <ProductListCard key={p.id} product={p} index={i}/>)}
                  </div>
                )}
                {products && (
                  <Pagination current={page} total={products.last_page}
                    onChange={p => { setPage(p); window.scrollTo({ top:0,behavior:'smooth' }) }}/>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — wraps inner component in Suspense (required for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh',background:'#f6f6f8',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <div style={{ width:36,height:36,border:'3px solid #eee',borderTopColor:'#db142e',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <CategoryPageInner/>
    </Suspense>
  )
}