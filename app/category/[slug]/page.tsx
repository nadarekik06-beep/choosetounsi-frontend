'use client'

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage { id: number; image_path: string; is_primary: boolean; url?: string }
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
interface AttrOption { id: number; value: string; color_hex?: string | null }
interface Attribute  { id: number; slug: string; name: string; type: string; options: AttrOption[] }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
type SortKey = 'created_at' | 'views' | 'price_asc' | 'price_desc'
type ViewMode = 'grid' | 'list'

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'created_at', label: 'Newest',            icon: '✨' },
  { key: 'views',      label: 'Most Popular',      icon: '🔥' },
  { key: 'price_asc',  label: 'Price: Low → High', icon: '↑'  },
  { key: 'price_desc', label: 'Price: High → Low', icon: '↓'  },
]

interface FilterState {
  search: string; priceMin: string; priceMax: string
  inStock: boolean; sort: SortKey
  attrs: Record<string, number[]>
}

// ─── Suggested price ranges ───────────────────────────────────────────────────

const PRICE_RANGES: { label: string; min: string; max: string }[] = [
  { label: '0 – 50 DT',    min: '0',   max: '50'  },
  { label: '50 – 100 DT',  min: '50',  max: '100' },
  { label: '100 – 200 DT', min: '100', max: '200' },
  { label: '200 – 500 DT', min: '200', max: '500' },
]

// ─── Category Icon Map ────────────────────────────────────────────────────────
// Maps category slugs (and common name keywords) to SVG icon components

function getCategoryIcon(slug: string, name: string): React.ReactNode {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()

  // Fashion & Clothing
  if (s.includes('fashion') || s.includes('cloth') || n.includes('fashion') || n.includes('cloth') || n.includes('apparel')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
    )
  }

  // Electronics & Tech
  if (s.includes('electron') || s.includes('tech') || s.includes('digit') || n.includes('electron') || n.includes('tech')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8h2M11 8h6"/>
        <path d="M7 11.5h4M13 11.5h4"/>
      </svg>
    )
  }

  // Home & Living / Furniture
  if (s.includes('home') || s.includes('living') || s.includes('furni') || s.includes('decor') || n.includes('home') || n.includes('living')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  }

  // Food & Grocery
  if (s.includes('food') || s.includes('grocer') || s.includes('eat') || n.includes('food') || n.includes('grocer')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v6M6 14v6M6 8a4 4 0 0 0 4-4M6 8a4 4 0 0 1 4 4M18 2a6 6 0 0 1 0 12v8"/>
      </svg>
    )
  }

  // Beauty & Personal Care
  if (s.includes('beauty') || s.includes('care') || s.includes('cosmet') || s.includes('personal') || n.includes('beauty') || n.includes('care')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a9.96 9.96 0 0 0-3.6.67C6.14 3.67 4 6.1 4 9c0 4.56 5.16 10.15 7.08 12.08a1.3 1.3 0 0 0 1.84 0C14.84 19.15 20 13.56 20 9c0-2.9-2.14-5.33-4.4-6.33A9.96 9.96 0 0 0 12 2z"/>
        <circle cx="12" cy="9" r="3"/>
      </svg>
    )
  }

  // Health & Wellness / Medical
  if (s.includes('health') || s.includes('wellness') || s.includes('medic') || s.includes('pharma') || n.includes('health') || n.includes('wellnes')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    )
  }

  // Sports & Outdoors
  if (s.includes('sport') || s.includes('outdoor') || s.includes('fit') || s.includes('gym') || n.includes('sport') || n.includes('outdoor')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>
      </svg>
    )
  }

  // Automotive / Cars
  if (s.includes('auto') || s.includes('car') || s.includes('motor') || s.includes('vehic') || n.includes('auto') || n.includes('car')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-4h8l2 4h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    )
  }

  // Books / Education
  if (s.includes('book') || s.includes('edu') || s.includes('learn') || s.includes('statio') || n.includes('book') || n.includes('edu')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    )
  }

  // Toys & Kids
  if (s.includes('toy') || s.includes('kid') || s.includes('baby') || s.includes('child') || n.includes('toy') || n.includes('kid') || n.includes('baby')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    )
  }

  // Jewelry & Accessories
  if (s.includes('jewel') || s.includes('access') || s.includes('watch') || s.includes('bag') || n.includes('jewel') || n.includes('access')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
        <path d="M11 3 8 9l4 13 4-13-3-6"/>
        <path d="M2 9h20"/>
      </svg>
    )
  }

  // Garden / Plants
  if (s.includes('garden') || s.includes('plant') || s.includes('outdoor') || n.includes('garden') || n.includes('plant')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12C12 7 7 4 3 6c0 5 4 8 9 6M12 12c0-5 5-8 9-6 0 5-4 8-9 6"/>
      </svg>
    )
  }

  // Pet / Animals
  if (s.includes('pet') || s.includes('animal') || s.includes('vet') || n.includes('pet') || n.includes('animal')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 4 13c0-3.87 3.13-7 7-7h2c3.87 0 7 3.13 7 7a7 7 0 0 1-7 7h-2z"/>
        <path d="M9 13c0-1.66 1.34-3 3-3s3 1.34 3 3"/>
        <path d="M6 8C6 6.34 7.34 5 9 5M18 8c0-1.66-1.34-3-3-3"/>
      </svg>
    )
  }

  // Default fallback — shopping bag
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

// ─── Icon background color palette per category ───────────────────────────────

function getCategoryAccent(slug: string): { bg: string; color: string } {
  const s = slug.toLowerCase()
  if (s.includes('fashion') || s.includes('cloth')) return { bg: '#db142e', color: '#fff' }
  if (s.includes('electron') || s.includes('tech'))  return { bg: '#111827', color: '#fff' }
  if (s.includes('home') || s.includes('living'))    return { bg: '#166534', color: '#fff' }
  if (s.includes('food') || s.includes('grocer'))    return { bg: '#dc2626', color: '#fff' }
  if (s.includes('beauty') || s.includes('care'))    return { bg: '#be185d', color: '#fff' }
  if (s.includes('health') || s.includes('well'))    return { bg: '#047857', color: '#fff' }
  if (s.includes('sport') || s.includes('outdoor'))  return { bg: '#1d4ed8', color: '#fff' }
  if (s.includes('auto') || s.includes('car'))       return { bg: '#374151', color: '#fff' }
  if (s.includes('book') || s.includes('edu'))       return { bg: '#92400e', color: '#fff' }
  if (s.includes('toy') || s.includes('kid'))        return { bg: '#7c3aed', color: '#fff' }
  if (s.includes('jewel') || s.includes('access'))   return { bg: '#b45309', color: '#fff' }
  if (s.includes('garden') || s.includes('plant'))   return { bg: '#166534', color: '#fff' }
  if (s.includes('pet') || s.includes('animal'))     return { bg: '#d97706', color: '#fff' }
  return { bg: '#db142e', color: '#fff' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImage(p: Product): string | null {
  if (p.primary_image_url) return p.primary_image_url.startsWith('http') ? p.primary_image_url : `${API_URL}${p.primary_image_url}`
  if (p.primary_image?.url) { const u = p.primary_image.url; return u.startsWith('http') ? u : `${API_URL}${u}` }
  if (p.primary_image?.image_path) return `${API_URL}/storage/${p.primary_image.image_path}`
  return null
}
const fmt = (p: string | number) => `${Number(p).toFixed(2)} DT`
function discountPct(orig: string, curr: string) {
  const o = Number(orig), c = Number(curr)
  return !o || o <= c ? null : Math.round(((o - c) / o) * 100)
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating = 0, count = 0 }: { rating?: number; count?: number }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i<=Math.round(rating)?'#f59e0b':'#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      {count > 0 && <span style={{ fontSize:10,color:'#9ca3af',marginLeft:3 }}>({count.toLocaleString()})</span>}
    </div>
  )
}

// ─── Cart button ──────────────────────────────────────────────────────────────

function CartBtn({ productId, stock }: { productId: number; stock: number }) {
  const { addToCart } = useCart()
  const [st, setSt] = useState<'idle'|'loading'|'done'>('idle')
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (stock <= 0 || st !== 'idle') return
    setSt('loading'); await addToCart(productId); setSt('done')
    setTimeout(() => setSt('idle'), 2000)
  }
  const oos = stock <= 0
  return (
    <button className={`ct-cart-btn${oos?' ct-cart-btn--oos':''}${st==='done'?' ct-cart-btn--done':''}`}
      onClick={handle} disabled={oos||st==='loading'}>
      {st==='loading' && <span className="ct-spinner"/>}
      {st==='done' && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
      {st==='idle'&&!oos && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
      <span>{oos?'Out of Stock':st==='done'?'Added!':'Add to Cart'}</span>
    </button>
  )
}

function WishBtn({ productId }: { productId: number }) {
  const [on, setOn] = useState(false)
  return (
    <button className={`ct-wish-btn${on?' ct-wish-btn--on':''}`}
      onClick={e=>{e.preventDefault();e.stopPropagation();setOn(v=>!v)}} aria-label="Wishlist">
      <svg width="16" height="16" fill={on?'#db142e':'none'} stroke={on?'#db142e':'#888'} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}

// ─── Product Card (grid) ──────────────────────────────────────────────────────

function ProductCard({ product, index }: { product: Product; index: number }) {
  const img = resolveImage(product)
  const [err, setErr] = useState(false)
  const disc = product.original_price ? discountPct(product.original_price, product.price) : null
  return (
    <Link href={`/products/${product.slug}`} className="ct-card" style={{ animationDelay:`${Math.min(index*0.05,0.5)}s` }}>
      <div className="ct-card__img-wrap">
        {img&&!err ? <Image src={img} alt={product.name} fill className="ct-card__img" onError={()=>setErr(true)} unoptimized/>
          : <div className="ct-card__no-img"><svg width="36" height="36" fill="none" stroke="#d1d5db" strokeWidth="1.4" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>}
        <div className="ct-card__badges">
          {product.is_bestseller && <span className="ct-badge ct-badge--hot">🏆 Bestseller</span>}
          {product.is_new        && <span className="ct-badge ct-badge--new">NEW</span>}
          {disc                  && <span className="ct-badge ct-badge--sale">-{disc}%</span>}
        </div>
        {product.stock===0 && <div className="ct-card__oos"><span>Out of Stock</span></div>}
        <WishBtn productId={product.id}/>
        <div className="ct-card__hover-bar"><CartBtn productId={product.id} stock={product.stock}/></div>
      </div>
      <div className="ct-card__body">
        {product.seller?.name && <p className="ct-card__seller">{product.seller.name}</p>}
        <p className="ct-card__name">{product.name}</p>
        {product.rating!==undefined && <Stars rating={product.rating} count={product.review_count}/>}
        <div className="ct-card__price-row">
          <span className="ct-card__price">{fmt(product.price)}</span>
          {product.original_price&&Number(product.original_price)>Number(product.price) && <span className="ct-card__orig">{fmt(product.original_price)}</span>}
        </div>
        {product.stock>0&&product.stock<10 && <p className="ct-card__low-stock">Only {product.stock} left!</p>}
      </div>
    </Link>
  )
}

function ProductListCard({ product, index }: { product: Product; index: number }) {
  const img = resolveImage(product)
  const [err, setErr] = useState(false)
  const disc = product.original_price ? discountPct(product.original_price, product.price) : null
  return (
    <Link href={`/products/${product.slug}`} className="ct-list-card" style={{ animationDelay:`${Math.min(index*0.04,0.4)}s` }}>
      <div className="ct-list-card__img-wrap">
        {img&&!err ? <Image src={img} alt={product.name} fill className="ct-list-card__img" onError={()=>setErr(true)} unoptimized/> : <div className="ct-card__no-img"/>}
        {disc && <span className="ct-badge ct-badge--sale" style={{ position:'absolute',top:8,left:8,zIndex:2 }}>-{disc}%</span>}
      </div>
      <div className="ct-list-card__body">
        {product.seller?.name && <p className="ct-card__seller">{product.seller.name}</p>}
        <p className="ct-list-card__name">{product.name}</p>
        {product.short_description && <p className="ct-list-card__desc">{product.short_description}</p>}
        {product.rating!==undefined && <Stars rating={product.rating} count={product.review_count}/>}
        <div className="ct-list-card__footer">
          <div className="ct-card__price-row">
            <span className="ct-card__price">{fmt(product.price)}</span>
            {product.original_price&&Number(product.original_price)>Number(product.price) && <span className="ct-card__orig">{fmt(product.original_price)}</span>}
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
        <div className="ct-skeleton__line" style={{ width:'35%',height:18,marginTop:8 }}/>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function SmartSidebar({
  filters, setFilters, total,
  categorySlug, subcategorySlug,
  mobileOpen, setMobileOpen,
}: {
  filters: FilterState
  setFilters: (f: FilterState) => void
  total: number
  categorySlug: string
  subcategorySlug: string
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}) {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [attrLoading, setAttrLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const upd = (p: Partial<FilterState>) => setFilters({ ...filters, ...p })

  useEffect(() => {
    if (!categorySlug) return
    setAttrLoading(true)
    setAttributes([])
    setExpanded(new Set())

    const loadAttributes = async () => {
      try {
        if (subcategorySlug) {
          const subRes = await fetch(
            `${API_URL}/api/categories/${categorySlug}/subcategories`,
            { headers: { Accept: 'application/json' } }
          )
          if (!subRes.ok) throw new Error()
          const subJson = await subRes.json()
          const subcategories: Array<{ id: number; slug: string }> = subJson.data ?? []
          const sub = subcategories.find(s => s.slug === subcategorySlug)

          if (!sub) {
            const catRes = await fetch(
              `${API_URL}/api/categories/${categorySlug}/filter-attributes`,
              { headers: { Accept: 'application/json' } }
            )
            if (!catRes.ok) throw new Error()
            const catJson = await catRes.json()
            const raw: Attribute[] = catJson.data ?? []
            const filterable = raw.filter(a => a.options?.length > 0)
            setAttributes(filterable)
            setExpanded(new Set(filterable.slice(0, 4).map((a: Attribute) => a.slug)))
            return
          }

          const attrRes = await fetch(
            `${API_URL}/api/subcategories/${sub.id}/attributes`,
            { headers: { Accept: 'application/json' } }
          )
          if (!attrRes.ok) throw new Error()
          const attrJson = await attrRes.json()

          const raw: Attribute[] = attrJson.attributes ?? []
          const filterable = raw.filter(
            (a: any) => a.is_filterable !== false && a.options?.length > 0
          )
          setAttributes(filterable)
          setExpanded(new Set(filterable.slice(0, 4).map((a: Attribute) => a.slug)))

        } else {
          const res = await fetch(
            `${API_URL}/api/categories/${categorySlug}/filter-attributes`,
            { headers: { Accept: 'application/json' } }
          )
          if (!res.ok) throw new Error()
          const json = await res.json()
          const raw: Attribute[] = json.data ?? json.attributes ?? []
          const filterable = raw.filter(a => a.options?.length > 0)
          setAttributes(filterable)
          setExpanded(new Set(filterable.slice(0, 4).map((a: Attribute) => a.slug)))
        }
      } catch {
        setAttributes([])
      } finally {
        setAttrLoading(false)
      }
    }

    loadAttributes()
  }, [categorySlug, subcategorySlug])

  const toggleExpanded = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const toggleAttrOption = (slug: string, optId: number) => {
    const curr = filters.attrs[slug] ?? []
    const next = curr.includes(optId) ? curr.filter(id => id !== optId) : [...curr, optId]
    upd({ attrs: { ...filters.attrs, [slug]: next } })
  }

  const setAttrSingle = (slug: string, optId: number) => {
    const curr = filters.attrs[slug] ?? []
    const next = curr.includes(optId) ? [] : [optId]
    upd({ attrs: { ...filters.attrs, [slug]: next } })
  }

  const totalActiveAttrs = Object.values(filters.attrs).filter(v => v.length > 0).length
  const hasAny = !!(filters.search || filters.inStock || filters.priceMin || filters.priceMax || totalActiveAttrs > 0)

  const reset = () => setFilters({ search:'', priceMin:'', priceMax:'', inStock:false, sort:filters.sort, attrs:{} })

  const isRangeActive = (min: string, max: string) =>
    filters.priceMin === min && filters.priceMax === max

  const applyRange = (min: string, max: string) => {
    if (isRangeActive(min, max)) {
      upd({ priceMin: '', priceMax: '' })
    } else {
      upd({ priceMin: min, priceMax: max })
    }
  }

  const content = (
    <aside className="ct-sidebar">

      {/* Header */}
      <div className="ct-sidebar__header">
        <div>
          <h3 className="ct-sidebar__title">Filters</h3>
          <p className="ct-sidebar__count">{total.toLocaleString()} products</p>
        </div>
        {hasAny && (
          <button className="ct-sidebar__reset" onClick={reset}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 3l18 18M3 21L21 3"/></svg>
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="ct-filter-section">
        <p className="ct-filter-label">Search in category</p>
        <div className="ct-filter-search">
          <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search products..." value={filters.search} onChange={e => upd({ search:e.target.value })}/>
          {filters.search && (
            <button onClick={() => upd({ search:'' })} style={{ background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:0,display:'flex' }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="ct-filter-section">
        <p className="ct-filter-label">Sort by</p>
        <div className="ct-filter-sort-list">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} className={`ct-sort-option${filters.sort===opt.key?' ct-sort-option--active':''}`} onClick={() => upd({ sort:opt.key })}>
              <span>{opt.icon}</span><span>{opt.label}</span>
              {filters.sort===opt.key && <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft:'auto' }}><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="ct-filter-section">
        <p className="ct-filter-label">Price range</p>
        <div className="ct-price-inputs">
          <input type="number" min="0" placeholder="Min" value={filters.priceMin} onChange={e => upd({ priceMin:e.target.value })} className="ct-price-input"/>
          <span className="ct-price-sep">–</span>
          <input type="number" min="0" placeholder="Max" value={filters.priceMax} onChange={e => upd({ priceMax:e.target.value })} className="ct-price-input"/>
          <button className="ct-price-go" onClick={() => setFilters({...filters})}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>
        <div className="ct-price-ranges">
          {PRICE_RANGES.map(r => (
            <button
              key={r.label}
              type="button"
              className={`ct-price-range-btn${isRangeActive(r.min, r.max) ? ' ct-price-range-btn--active' : ''}`}
              onClick={() => applyRange(r.min, r.max)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="ct-filter-section">
        <p className="ct-filter-label">Availability</p>
        <label className="ct-toggle-label">
          <span>In stock only</span>
          <div className={`ct-toggle${filters.inStock?' ct-toggle--on':''}`} onClick={() => upd({ inStock:!filters.inStock })}>
            <div className="ct-toggle__thumb"/>
          </div>
        </label>
      </div>

      {/* Dynamic attribute filters */}
      {attrLoading && (
        <div className="ct-filter-section">
          {[1,2,3].map(i => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ height:10,width:'50%',borderRadius:4,marginBottom:8,background:'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)',backgroundSize:'600px 100%',animation:'ct-shimmer 1.3s infinite linear' }}/>
              <div style={{ height:28,borderRadius:8,background:'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)',backgroundSize:'600px 100%',animation:'ct-shimmer 1.3s infinite linear' }}/>
            </div>
          ))}
        </div>
      )}

      {!attrLoading && attributes.map(attr => {
        const isOpen   = expanded.has(attr.slug)
        const selected = filters.attrs[attr.slug] ?? []

        return (
          <div key={attr.id} className="ct-attr-section">
            <button type="button" className="ct-attr-header" onClick={() => toggleExpanded(attr.slug)}>
              <span className="ct-attr-header__label">
                {attr.name}
                {selected.length > 0 && (
                  <span className="ct-attr-badge">{selected.length}</span>
                )}
              </span>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {isOpen && (
              <div className="ct-attr-options">

                {attr.type === 'color' && (
                  <div className="ct-color-swatches">
                    {attr.options.map(opt => {
                      const on = selected.includes(opt.id)
                      return (
                        <button key={opt.id} type="button" title={opt.value}
                          onClick={() => toggleAttrOption(attr.slug, opt.id)}
                          className={`ct-swatch${on?' ct-swatch--on':''}`}
                          style={{ '--swatch-color': opt.color_hex ?? '#ccc' } as React.CSSProperties}>
                          {on && (
                            <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {attr.type === 'boolean' && (
                  <label className="ct-toggle-label" style={{ padding:'4px 0' }}>
                    <span style={{ fontSize:13,fontWeight:500,color:'#374151' }}>Yes</span>
                    <div className={`ct-toggle${(filters.attrs[attr.slug]??[]).includes(1)?' ct-toggle--on':''}`}
                      onClick={() => setAttrSingle(attr.slug, 1)}>
                      <div className="ct-toggle__thumb"/>
                    </div>
                  </label>
                )}

                {attr.type === 'multiselect' && (
                  <div className="ct-check-list">
                    {attr.options.map(opt => {
                      const on = selected.includes(opt.id)
                      return (
                        <label key={opt.id} className={`ct-check-item${on?' ct-check-item--on':''}`}>
                          <div className={`ct-checkbox${on?' ct-checkbox--on':''}`}
                            onClick={() => toggleAttrOption(attr.slug, opt.id)}>
                            {on && <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                          <span onClick={() => toggleAttrOption(attr.slug, opt.id)}
                            className="ct-check-label">{opt.value}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {(attr.type === 'select' || attr.type === 'text') && (
                  <div className="ct-pill-list">
                    {attr.options.map(opt => {
                      const on = selected.includes(opt.id)
                      return (
                        <button key={opt.id} type="button"
                          className={`ct-pill${on?' ct-pill--on':''}`}
                          onClick={() => setAttrSingle(attr.slug, opt.id)}>
                          {opt.value}
                        </button>
                      )
                    })}
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}

      <button className="ct-sidebar__mobile-close" onClick={() => setMobileOpen(false)}>
        Apply Filters {hasAny ? `(${[filters.search?1:0,filters.inStock?1:0,(filters.priceMin||filters.priceMax)?1:0,totalActiveAttrs].reduce((a,b)=>a+b,0)} active)` : ''}
      </button>
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

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ current, total, onChange }: { current:number; total:number; onChange:(p:number)=>void }) {
  if (total <= 1) return null
  const pages = Array.from({ length:total },(_,i)=>i+1)
    .filter(p => p===1||p===total||Math.abs(p-current)<=1)
    .reduce<(number|'...')[]>((acc,p,idx,arr) => {
      if (idx>0&&(p as number)-(arr[idx-1] as number)>1) acc.push('...')
      acc.push(p); return acc
    },[])
  return (
    <div className="ct-pagination">
      <button className="ct-page-btn" onClick={()=>onChange(Math.max(1,current-1))} disabled={current===1}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {pages.map((p,i) => p==='...'
        ? <span key={`e${i}`} className="ct-page-ellipsis">…</span>
        : <button key={p} className={`ct-page-btn${current===p?' ct-page-btn--active':''}`} onClick={()=>onChange(p as number)}>{p}</button>
      )}
      <button className="ct-page-btn" onClick={()=>onChange(Math.min(total,current+1))} disabled={current===total}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRO CATEGORY NAV BAR
// ═══════════════════════════════════════════════════════════════════════════════

function CategoryNavBar({
  allCategories,
  activeSlug,
  filters,
  setFilters,
  viewMode,
  setViewMode,
  mobileFilterOpen,
  setMobileFilterOpen,
  activeFilterCount,
  filteredCount,
  totalCount,
}: {
  allCategories: Category[]
  activeSlug: string
  filters: FilterState
  setFilters: (f: FilterState) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  mobileFilterOpen: boolean
  setMobileFilterOpen: (v: boolean) => void
  activeFilterCount: number
  filteredCount: number
  totalCount: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging,     setIsDragging]     = useState(false)
  const dragStartX   = useRef(0)
  const dragScrollX  = useRef(0)

  // Check overflow state
  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [allCategories, checkScroll])

  // Scroll active category into view on mount/change
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !activeSlug) return
    const active = el.querySelector(`[data-slug="${activeSlug}"]`) as HTMLElement | null
    if (active) {
      const containerRect = el.getBoundingClientRect()
      const activeRect    = active.getBoundingClientRect()
      const offset        = activeRect.left - containerRect.left - (containerRect.width / 2) + (activeRect.width / 2)
      el.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }, [activeSlug, allCategories])

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' })
  }

  // Drag-to-scroll
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    dragStartX.current  = e.clientX
    dragScrollX.current = scrollRef.current.scrollLeft
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    const dx = e.clientX - dragStartX.current
    scrollRef.current.scrollLeft = dragScrollX.current - dx
  }
  const onMouseUp = () => setIsDragging(false)

  return (
    <div className="ct-catbar">
      <div className="ct-catbar__inner">

        {/* Left scroll arrow */}
        <button
          className={`ct-catbar__arrow ct-catbar__arrow--left${canScrollLeft ? ' ct-catbar__arrow--visible' : ''}`}
          onClick={() => scrollBy('left')}
          aria-label="Scroll categories left"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {/* Fade left edge */}
        <div className={`ct-catbar__fade ct-catbar__fade--left${canScrollLeft ? ' ct-catbar__fade--visible' : ''}`}/>

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          className="ct-catbar__list"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {allCategories.map(cat => {
            const isActive = cat.slug === activeSlug
            const accent   = getCategoryAccent(cat.slug)
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                data-slug={cat.slug}
                className={`ct-catbar__item${isActive ? ' ct-catbar__item--active' : ''}`}
                style={isActive ? {
                  '--cat-bg':    accent.bg,
                  '--cat-color': accent.color,
                } as React.CSSProperties : undefined}
                draggable={false}
              >
                <span className={`ct-catbar__icon-wrap${isActive ? ' ct-catbar__icon-wrap--active' : ''}`}
                  style={isActive ? { background: accent.color === '#fff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.1)' } : undefined}>
                  {getCategoryIcon(cat.slug, cat.name)}
                </span>
                <span className="ct-catbar__label">{cat.name}</span>
                {isActive && <span className="ct-catbar__active-dot"/>}
              </Link>
            )
          })}
        </div>

        {/* Fade right edge */}
        <div className={`ct-catbar__fade ct-catbar__fade--right${canScrollRight ? ' ct-catbar__fade--visible' : ''}`}/>

        {/* Right scroll arrow */}
        <button
          className={`ct-catbar__arrow ct-catbar__arrow--right${canScrollRight ? ' ct-catbar__arrow--visible' : ''}`}
          onClick={() => scrollBy('right')}
          aria-label="Scroll categories right"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Controls */}
        <div className="ct-catbar__controls">
          <button className="ct-filter-toggle" onClick={() => setMobileFilterOpen(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            Filters
            {activeFilterCount > 0 && <span className="ct-filter-badge">{activeFilterCount}</span>}
          </button>
          {totalCount > 0 && (
            <span className="ct-toolbar__result-count">{filteredCount} of {totalCount}</span>
          )}
          <button className={`ct-view-btn${viewMode==='grid'?' ct-view-btn--active':''}`} onClick={() => setViewMode('grid')} title="Grid">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`ct-view-btn${viewMode==='list'?' ct-view-btn--active':''}`} onClick={() => setViewMode('list')} title="List">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INNER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function CategoryPageInner() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const slug    = params?.slug as string
  const subSlug = searchParams.get('sub') ?? ''

  const [category,      setCategory]      = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [products,      setProducts]      = useState<PaginatedProducts | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [catError,      setCatError]      = useState(false)
  const [page,          setPage]          = useState(1)
  const [viewMode,      setViewMode]      = useState<ViewMode>('grid')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [mounted,       setMounted]       = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    search:'', priceMin:'', priceMax:'', inStock:false, sort:'created_at', attrs:{},
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/categories`, { headers:{ Accept:'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => {
        const list: Category[] = Array.isArray(j) ? j : (j.data ?? [])
        setAllCategories(list.filter((c: Category) => c.slug !== 'other'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/categories/${slug}`, { headers:{ Accept:'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setCategory(j.data))
      .catch(() => setCatError(true))
  }, [slug])

  const attrQueryParams = useMemo(() => {
    const parts: string[] = []
    Object.entries(filters.attrs).forEach(([attrSlug, ids]) => {
      if (ids.length > 0) parts.push(`${attrSlug}:${ids.join(',')}`)
    })
    return parts.join('|')
  }, [filters.attrs])

  const fetchProducts = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      qp.set('page',          String(page))
      qp.set('sort',          filters.sort)
      qp.set('category_slug', slug)
      if (subSlug)          qp.set('subcategory_slug', subSlug)
      if (filters.priceMin) qp.set('price_min', filters.priceMin)
      if (filters.priceMax) qp.set('price_max', filters.priceMax)
      if (filters.inStock)  qp.set('in_stock', '1')

      Object.entries(filters.attrs).forEach(([attrSlug, ids]) => {
        ids.forEach(id => qp.append(`attrs[${attrSlug}][]`, String(id)))
      })

      const url = `${API_URL}/api/products?${qp.toString()}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setProducts(json.data)
    } catch {
      setProducts(null)
    } finally {
      setLoading(false)
    }
  }, [slug, subSlug, filters.sort, filters.priceMin, filters.priceMax, filters.inStock, attrQueryParams, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => { setPage(1) }, [filters.sort, filters.priceMin, filters.priceMax, filters.inStock, attrQueryParams, subSlug])

  const filteredProducts = useMemo(() => {
    if (!products?.data) return []
    if (!filters.search) return products.data
    const q = filters.search.toLowerCase()
    return products.data.filter(p => p.name.toLowerCase().includes(q))
  }, [products, filters.search])

  const subLabel = subSlug ? subSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''

  const activeFilterCount = [
    filters.search !== '',
    filters.inStock,
    filters.priceMin !== '' || filters.priceMax !== '',
    subSlug !== '',
    Object.values(filters.attrs).some(v => v.length > 0),
  ].filter(Boolean).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Serif+Display&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        .ct-page{min-height:100vh;background:#f6f6f8;font-family:'DM Sans',sans-serif;color:#111}
        @keyframes ct-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ct-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes ct-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        @keyframes ct-spin{to{transform:rotate(360deg)}}
        @keyframes ct-pop{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}
        @keyframes ct-dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.7)}}
        @keyframes ct-arrow-bounce-left{0%,100%{transform:translateX(0)}50%{transform:translateX(-2px)}}
        @keyframes ct-arrow-bounce-right{0%,100%{transform:translateX(0)}50%{transform:translateX(2px)}}

        /* ── Breadcrumb ── */
        .ct-breadcrumb{background:#fff;border-bottom:1px solid #eee;padding:0}
        .ct-breadcrumb__inner{max-width:1440px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af;font-weight:500}
        .ct-breadcrumb__inner a{color:#9ca3af;text-decoration:none;transition:color 0.15s}
        .ct-breadcrumb__inner a:hover{color:#db142e}
        .ct-breadcrumb__inner span{color:#374151;font-weight:600}

        /* ── Hero ── */
        .ct-hero{background:linear-gradient(135deg,#fff5f5 0%,#fef2f2 40%,#fff 100%);border-bottom:1px solid #fde8e8;padding:36px 28px 32px;position:relative;overflow:hidden}
        .ct-hero__inner{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .ct-hero__left{display:flex;align-items:center;gap:20px}
        .ct-hero__icon-wrap{width:72px;height:72px;border-radius:20px;background:#db142e;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;box-shadow:0 8px 24px rgba(219,20,46,0.3)}
        .ct-hero__eyebrow{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#db142e;margin:0 0 6px}
        .ct-hero__title{font-family:'DM Serif Display',serif;font-size:clamp(2rem,4vw,3rem);color:#111;margin:0 0 8px;line-height:1}
        .ct-hero__sub-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(219,20,46,0.08);border:1px solid rgba(219,20,46,0.2);color:#db142e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;margin-top:4px;text-transform:capitalize;letter-spacing:0.02em}
        .ct-hero__desc{font-size:13px;color:#6b7280;margin:0;max-width:420px;line-height:1.6}
        .ct-hero__stats{display:flex;align-items:center;gap:28px;flex-shrink:0}
        .ct-hero__stat-num{font-family:'DM Serif Display',serif;font-size:2rem;color:#111;line-height:1;display:block}
        .ct-hero__stat-label{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em}
        .ct-hero__bg-shape{position:absolute;right:-60px;top:-40px;width:300px;height:300px;border-radius:50%;background:rgba(219,20,46,0.04);pointer-events:none}

        /* ════════════════════════════════════════════════
           PRO CATEGORY NAV BAR
        ════════════════════════════════════════════════ */
        .ct-catbar{
          background:#fff;
          border-bottom:1px solid #eee;
          position:sticky;
          top:0;
          z-index:40;
          box-shadow:0 2px 20px rgba(0,0,0,0.06);
        }
        .ct-catbar__inner{
          max-width:1440px;
          margin:0 auto;
          padding:0 8px 0 8px;
          display:flex;
          align-items:stretch;
          position:relative;
        }

        /* ── Scroll arrow buttons ── */
        .ct-catbar__arrow{
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          width:36px;
          height:100%;
          min-height:56px;
          background:transparent;
          border:none;
          cursor:pointer;
          color:#9ca3af;
          opacity:0;
          pointer-events:none;
          transition:opacity 0.22s,color 0.18s;
          z-index:5;
          border-radius:0;
          padding:0;
        }
        .ct-catbar__arrow--visible{
          opacity:1;
          pointer-events:auto;
        }
        .ct-catbar__arrow:hover{color:#db142e}
        .ct-catbar__arrow--left:hover svg{animation:ct-arrow-bounce-left 0.5s ease infinite}
        .ct-catbar__arrow--right:hover svg{animation:ct-arrow-bounce-right 0.5s ease infinite}

        /* ── Fade gradient edges ── */
        .ct-catbar__fade{
          position:absolute;
          top:0;
          bottom:0;
          width:56px;
          pointer-events:none;
          z-index:4;
          opacity:0;
          transition:opacity 0.25s;
        }
        .ct-catbar__fade--left{
          left:44px;
          background:linear-gradient(to right, #fff 0%, transparent 100%);
        }
        .ct-catbar__fade--right{
          right:44px;
          background:linear-gradient(to left, #fff 0%, transparent 100%);
        }
        .ct-catbar__fade--visible{opacity:1}

        /* ── The scrollable list ── */
        .ct-catbar__list{
          display:flex;
          align-items:center;
          gap:4px;
          flex:1;
          overflow-x:auto;
          scrollbar-width:none;
          padding:8px 4px;
          user-select:none;
          -webkit-overflow-scrolling:touch;
        }
        .ct-catbar__list::-webkit-scrollbar{display:none}

        /* ── Category item chip ── */
        .ct-catbar__item{
          display:flex;
          align-items:center;
          gap:8px;
          padding:7px 14px 7px 8px;
          border-radius:12px;
          border:1.5px solid transparent;
          background:transparent;
          font-size:13px;
          font-weight:600;
          color:#52525b;
          cursor:pointer;
          transition:
            background 0.2s,
            color 0.2s,
            border-color 0.2s,
            transform 0.18s,
            box-shadow 0.2s;
          white-space:nowrap;
          flex-shrink:0;
          font-family:'DM Sans',sans-serif;
          text-decoration:none;
          position:relative;
        }
        .ct-catbar__item:hover{
          background:#f4f4f6;
          color:#111;
          border-color:#e5e7eb;
          transform:translateY(-1px);
        }
        .ct-catbar__item--active{
          background:var(--cat-bg, #db142e);
          color:var(--cat-color, #fff) !important;
          border-color:transparent;
          box-shadow:0 4px 14px rgba(0,0,0,0.18);
          transform:translateY(-1px);
        }
        .ct-catbar__item--active:hover{
          filter:brightness(1.08);
          transform:translateY(-2px);
          box-shadow:0 6px 20px rgba(0,0,0,0.22);
        }

        /* ── Icon wrapper inside chip ── */
        .ct-catbar__icon-wrap{
          width:28px;
          height:28px;
          border-radius:8px;
          background:rgba(0,0,0,0.06);
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          transition:background 0.2s;
        }
        .ct-catbar__item:hover .ct-catbar__icon-wrap{
          background:rgba(0,0,0,0.08);
        }
        .ct-catbar__icon-wrap--active{
          /* set inline */
        }

        /* ── Category label ── */
        .ct-catbar__label{
          line-height:1;
        }

        /* ── Active dot indicator ── */
        .ct-catbar__active-dot{
          position:absolute;
          bottom:-8px;
          left:50%;
          transform:translateX(-50%);
          width:4px;
          height:4px;
          border-radius:50%;
          background:currentColor;
          animation:ct-dot-pulse 2s ease-in-out infinite;
        }

        /* ── Controls (filters + view toggle) ── */
        .ct-catbar__controls{
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
          border-left:1px solid #f0f0f0;
          padding:8px 8px 8px 16px;
          margin-left:4px;
        }
        .ct-toolbar__result-count{font-size:12px;color:#9ca3af;font-weight:500;white-space:nowrap}
        .ct-filter-toggle{display:none;align-items:center;gap:7px;padding:8px 14px;background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:all 0.18s;white-space:nowrap;flex-shrink:0}
        .ct-filter-toggle:hover{border-color:#db142e;color:#db142e}
        .ct-filter-badge{background:#db142e;color:#fff;font-size:10px;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px}
        .ct-view-btn{width:36px;height:36px;border-radius:8px;border:1.5px solid #e5e7eb;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9ca3af;transition:all 0.18s}
        .ct-view-btn:hover{border-color:#db142e;color:#db142e}
        .ct-view-btn--active{border-color:#db142e;color:#db142e;background:#fef2f2}

        /* ── Layout ── */
        .ct-layout{max-width:1440px;margin:0 auto;padding:28px;display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start}
        .ct-sidebar-desktop{display:block}

        /* ── Sidebar ── */
        .ct-sidebar{background:#fff;border-radius:16px;border:1px solid #f0f0f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);position:sticky;top:70px;max-height:calc(100vh - 90px);overflow-y:auto}
        .ct-sidebar__header{padding:18px 20px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:2}
        .ct-sidebar__title{font-size:15px;font-weight:800;color:#111;margin:0 0 2px}
        .ct-sidebar__count{font-size:11px;color:#9ca3af;font-weight:500;margin:0}
        .ct-sidebar__reset{display:flex;align-items:center;gap:5px;background:#fef2f2;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:#db142e;cursor:pointer;transition:background 0.15s;font-family:'DM Sans',sans-serif}
        .ct-sidebar__reset:hover{background:#fee2e2}
        .ct-sidebar__mobile-close{display:none;width:calc(100% - 40px);margin:16px 20px 20px;padding:13px;background:#db142e;color:#fff;font-weight:800;font-size:14px;border:none;border-radius:12px;cursor:pointer;font-family:'DM Sans',sans-serif}

        /* ── Filter sections ── */
        .ct-filter-section{padding:14px 20px;border-bottom:1px solid #f7f7f7}
        .ct-filter-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin:0 0 10px}
        .ct-filter-search{display:flex;align-items:center;gap:8px;background:#f8f8f8;border:1.5px solid #f0f0f0;border-radius:10px;padding:8px 12px;transition:border-color 0.18s}
        .ct-filter-search:focus-within{border-color:#db142e}
        .ct-filter-search input{flex:1;border:none;background:transparent;font-size:13px;font-family:'DM Sans',sans-serif;color:#111;outline:none}
        .ct-filter-search input::placeholder{color:#c4c4c4}
        .ct-filter-sort-list{display:flex;flex-direction:column;gap:2px}
        .ct-sort-option{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;font-size:13px;font-weight:500;color:#52525b;border:none;background:transparent;cursor:pointer;transition:all 0.15s;text-align:left;font-family:'DM Sans',sans-serif}
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

        /* ── Suggested price ranges ── */
        .ct-price-ranges{display:flex;flex-direction:column;gap:3px;margin-top:10px}
        .ct-price-range-btn{display:flex;align-items:center;width:100%;padding:8px 10px;border-radius:8px;border:none;background:transparent;font-size:13px;font-weight:500;color:#52525b;cursor:pointer;transition:all 0.15s;text-align:left;font-family:'DM Sans',sans-serif}
        .ct-price-range-btn::before{content:'';display:inline-block;width:14px;height:14px;border-radius:50%;border:1.5px solid #d1d5db;margin-right:9px;flex-shrink:0;transition:all 0.15s;background:#fff}
        .ct-price-range-btn:hover{background:#f8f8f8;color:#db142e}
        .ct-price-range-btn:hover::before{border-color:#db142e}
        .ct-price-range-btn--active{background:#fef2f2;color:#db142e;font-weight:700}
        .ct-price-range-btn--active::before{background:#db142e;border-color:#db142e;box-shadow:inset 0 0 0 3px #fff}

        /* ── Attribute sections ── */
        .ct-attr-section{border-bottom:1px solid #f7f7f7}
        .ct-attr-header{width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif}
        .ct-attr-header__label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#374151}
        .ct-attr-badge{background:#db142e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px}
        .ct-attr-options{padding:2px 20px 14px}

        /* Color swatches */
        .ct-color-swatches{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0}
        .ct-swatch{width:28px;height:28px;border-radius:50%;background:var(--swatch-color,#ccc);border:2px solid #e5e7eb;cursor:pointer;transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s;display:flex;align-items:center;justify-content:center;padding:0}
        .ct-swatch:hover{transform:scale(1.12)}
        .ct-swatch--on{border-color:#db142e !important;transform:scale(1.15);box-shadow:0 0 0 3px rgba(219,20,46,0.2)}

        /* Checkbox list */
        .ct-check-list{display:flex;flex-direction:column;gap:2px}
        .ct-check-item{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:8px;cursor:pointer;transition:background 0.12s}
        .ct-check-item:hover{background:#f8f8f8}
        .ct-check-item--on{background:rgba(219,20,46,0.05)}
        .ct-checkbox{width:16px;height:16px;border-radius:4px;flex-shrink:0;border:1.5px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;transition:all 0.15s;cursor:pointer}
        .ct-checkbox--on{background:#db142e;border-color:#db142e}
        .ct-check-label{font-size:13px;font-weight:500;color:#374151;flex:1;cursor:pointer}
        .ct-check-item--on .ct-check-label{color:#db142e;font-weight:700}

        /* Pill list */
        .ct-pill-list{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0}
        .ct-pill{padding:5px 12px;border-radius:999px;border:1.5px solid #e5e7eb;background:#fff;font-size:12px;font-weight:600;color:#52525b;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .ct-pill:hover{border-color:#db142e;color:#db142e}
        .ct-pill--on{background:#db142e;border-color:#db142e;color:#fff}

        /* Sidebar overlays */
        .ct-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;backdrop-filter:blur(2px)}
        .ct-sidebar-mobile{position:fixed;left:0;top:0;bottom:0;z-index:201;width:300px;max-width:90vw;overflow-y:auto;background:#fff;box-shadow:6px 0 32px rgba(0,0,0,0.15);animation:ct-fade-in 0.2s ease}
        .ct-sidebar-mobile .ct-sidebar{border-radius:0;position:static;box-shadow:none;border:none;max-height:none}
        .ct-sidebar-mobile .ct-sidebar__mobile-close{display:block}

        /* ── Product grid/list ── */
        .ct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
        .ct-list{display:flex;flex-direction:column;gap:12px}
        .ct-card{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;animation:ct-fade-up 0.42s ease both;transition:box-shadow 0.24s,border-color 0.24s,transform 0.24s;will-change:transform}
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
        .ct-wish-btn{position:absolute;top:10px;right:10px;z-index:4;width:32px;height:32px;background:rgba(255,255,255,0.9);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.12);transition:transform 0.2s,background 0.2s;backdrop-filter:blur(4px)}
        .ct-wish-btn:hover{transform:scale(1.15);background:#fff}
        .ct-wish-btn--on{animation:ct-pop 0.35s ease}
        .ct-card__hover-bar{position:absolute;bottom:0;left:0;right:0;padding:0 10px 10px;z-index:4;transform:translateY(100%);transition:transform 0.26s cubic-bezier(0.34,1.56,0.64,1)}
        .ct-card:hover .ct-card__hover-bar{transform:translateY(0)}
        .ct-cart-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:10px;background:#db142e;color:#fff;font-size:12px;font-weight:800;border:none;border-radius:10px;cursor:pointer;box-shadow:0 4px 16px rgba(219,20,46,0.4);transition:background 0.18s,transform 0.15s;font-family:'DM Sans',sans-serif}
        .ct-cart-btn:hover{background:#b91c1c;transform:scale(1.02)}
        .ct-cart-btn:disabled{cursor:not-allowed}
        .ct-cart-btn--oos{background:#e5e7eb;color:#9ca3af;box-shadow:none}
        .ct-cart-btn--done{background:#198f41;box-shadow:0 4px 16px rgba(25,143,65,0.35)}
        .ct-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:ct-spin 0.7s linear infinite}
        .ct-card__body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
        .ct-card__seller{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.07em;margin:0}
        .ct-card__name{font-size:13px;font-weight:600;color:#1f2937;line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ct-card:hover .ct-card__name{color:#db142e}
        .ct-card__price-row{display:flex;align-items:baseline;gap:6px;margin-top:4px}
        .ct-card__price{font-size:15px;font-weight:800;color:#db142e}
        .ct-card__orig{font-size:11px;font-weight:500;color:#9ca3af;text-decoration:line-through}
        .ct-card__low-stock{font-size:10px;font-weight:700;color:#f97316;margin:2px 0 0;background:#fff7ed;padding:2px 8px;border-radius:999px;display:inline-block}
        .ct-list-card{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden;display:flex;flex-direction:row;text-decoration:none;animation:ct-fade-up 0.42s ease both;transition:box-shadow 0.22s,border-color 0.22s,transform 0.22s}
        .ct-list-card:hover{box-shadow:0 8px 28px rgba(0,0,0,0.08);border-color:#e5e7eb;transform:translateX(3px)}
        .ct-list-card__img-wrap{position:relative;width:160px;flex-shrink:0}
        .ct-list-card__img{object-fit:cover!important;transition:transform 0.4s ease}
        .ct-list-card:hover .ct-list-card__img{transform:scale(1.05)}
        .ct-list-card__body{padding:20px;display:flex;flex-direction:column;gap:6px;flex:1}
        .ct-list-card__name{font-size:16px;font-weight:700;color:#1f2937;margin:0;line-height:1.4}
        .ct-list-card:hover .ct-list-card__name{color:#db142e}
        .ct-list-card__desc{font-size:13px;color:#6b7280;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ct-list-card__footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:8px;gap:12px;flex-wrap:wrap}
        .ct-skeleton{background:#fff;border-radius:16px;border:1.5px solid #f0f0f0;overflow:hidden}
        .ct-skeleton__img{aspect-ratio:3/4;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:600px 100%;animation:ct-shimmer 1.3s infinite linear}
        .ct-skeleton__body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px}
        .ct-skeleton__line{height:12px;border-radius:4px;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:600px 100%;animation:ct-shimmer 1.3s infinite linear}

        /* ── Pagination ── */
        .ct-pagination{display:flex;align-items:center;justify-content:center;gap:6px;padding:32px 0 0;flex-wrap:wrap}
        .ct-page-btn{width:38px;height:38px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#52525b;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s;font-family:'DM Sans',sans-serif}
        .ct-page-btn:hover:not(:disabled){border-color:#db142e;color:#db142e}
        .ct-page-btn:disabled{opacity:0.35;cursor:not-allowed}
        .ct-page-btn--active{background:#db142e;border-color:#db142e;color:#fff}
        .ct-page-ellipsis{color:#9ca3af;font-size:14px;font-weight:600;padding:0 4px}

        /* ── Empty state ── */
        .ct-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;background:#fff;border-radius:16px;border:1px solid #f0f0f0;text-align:center;gap:12px}
        .ct-empty__emoji{font-size:4rem}
        .ct-empty__title{font-size:18px;font-weight:800;color:#374151;margin:0}
        .ct-empty__sub{font-size:13px;color:#9ca3af;margin:0;max-width:300px;line-height:1.6}
        .ct-empty__link{margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:11px 24px;background:#db142e;color:#fff;font-weight:800;font-size:13px;border-radius:12px;text-decoration:none;transition:background 0.18s}
        .ct-empty__link:hover{background:#b91c1c}

        /* ── Responsive ── */
        @media(max-width:1100px){.ct-layout{grid-template-columns:240px 1fr}}
        @media(max-width:880px){
          .ct-layout{grid-template-columns:1fr;padding:16px}
          .ct-sidebar-desktop{display:none}
          .ct-filter-toggle{display:flex}
          .ct-hero__stats{display:none}
          .ct-hero__title{font-size:1.8rem}
          .ct-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
          .ct-list-card__img-wrap{width:120px}
          .ct-catbar__item{padding:6px 11px 6px 7px;font-size:12px}
          .ct-catbar__icon-wrap{width:24px;height:24px;border-radius:6px}
        }
        @media(max-width:540px){
          .ct-hero{padding:24px 20px}
          .ct-breadcrumb__inner,.ct-layout{padding-left:16px;padding-right:16px}
          .ct-catbar__inner{padding:0 4px}
          .ct-grid{grid-template-columns:repeat(2,1fr);gap:10px}
          .ct-hero__icon-wrap{width:56px;height:56px;font-size:1.5rem}
          .ct-catbar__controls{padding-left:8px;gap:6px}
          .ct-catbar__label{display:none}
          .ct-catbar__item{padding:6px}
          .ct-catbar__item--active .ct-catbar__label{display:block}
        }
      `}</style>

      <div className="ct-page">

        {/* Breadcrumb */}
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

        {/* Hero */}
        <div className="ct-hero">
          <div className="ct-hero__bg-shape"/>
          <div className="ct-hero__inner">
            <div className="ct-hero__left" style={{ opacity:mounted?1:0,transform:mounted?'none':'translateY(12px)',transition:'opacity 0.5s,transform 0.5s' }}>
              {category?.icon && <div className="ct-hero__icon-wrap">{category.icon}</div>}
              <div>
                <p className="ct-hero__eyebrow">Category</p>
                <h1 className="ct-hero__title">
                  {catError ? 'Not Found' : category?.name ?? (
                    <span style={{ display:'inline-block',width:220,height:38,background:'#f0f0f0',borderRadius:8,animation:'ct-shimmer 1.3s infinite linear',backgroundSize:'600px 100%' }}/>
                  )}
                </h1>
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
              <div className="ct-hero__stats" style={{ opacity:mounted?1:0,transition:'opacity 0.6s 0.2s' }}>
                <div style={{ textAlign:'center' }}>
                  <span className="ct-hero__stat-num">{products.total.toLocaleString()}</span>
                  <span className="ct-hero__stat-label">Products</span>
                </div>
                <div style={{ width:1,height:40,background:'#f0d0d0' }}/>
                <div style={{ textAlign:'center' }}>
                  <span className="ct-hero__stat-num">{products.last_page}</span>
                  <span className="ct-hero__stat-label">Pages</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PRO Category Nav Bar ── */}
        <CategoryNavBar
          allCategories={allCategories}
          activeSlug={slug}
          filters={filters}
          setFilters={setFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          mobileFilterOpen={mobileFilterOpen}
          setMobileFilterOpen={setMobileFilterOpen}
          activeFilterCount={activeFilterCount}
          filteredCount={filteredProducts.length}
          totalCount={products?.total ?? 0}
        />

        {/* Layout */}
        <div className="ct-layout">
          <SmartSidebar
            filters={filters}
            setFilters={setFilters}
            total={products?.total ?? 0}
            categorySlug={slug}
            subcategorySlug={subSlug}
            mobileOpen={mobileFilterOpen}
            setMobileOpen={setMobileFilterOpen}
          />

          <div>
            {loading && (
              <div className={viewMode==='grid'?'ct-grid':'ct-list'}>
                {Array.from({ length:10 }).map((_,i) => <SkeletonCard key={i}/>)}
              </div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="ct-empty">
                <span className="ct-empty__emoji">🛍️</span>
                <p className="ct-empty__title">
                  {Object.values(filters.attrs).some(v=>v.length>0) || filters.inStock || filters.priceMin || filters.priceMax
                    ? 'No products match your filters'
                    : subSlug ? `No products in "${subLabel}" yet` : 'No products yet in this category'}
                </p>
                <p className="ct-empty__sub">
                  {subSlug ? 'Try browsing all products in this category instead.'
                    : 'Try adjusting your filters or check back soon!'}
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
                    onChange={p => { setPage(p); window.scrollTo({ top:0, behavior:'smooth' }) }}/>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Default export wrapped in Suspense ───────────────────────────────────────

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