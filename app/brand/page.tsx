'use client'

/**
 * app/brand/page.tsx — CHOOSE'Tounsi Brand Page
 *
 * CHANGES vs previous version:
 *   - Hero section: UNCHANGED (same slides, animations, buttons)
 *   - Products section: replaces static placeholder with live API data
 *     from GET /api/brand-products
 *   - ProductCard: minimal, matches the brand aesthetic
 *   - Keeps all existing UI intact — only adds the product grid below the hero
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import { isAuthenticated } from '@/lib/auth'
import { ShoppingCart, Heart, Star, Loader2, AlertCircle, Package } from 'lucide-react'
import { useCart } from '@/context/CartContext'

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
const STORAGE_BASE = API_BASE.replace(/\/api\/?$/, '')

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandProduct {
  id: number
  name: string
  slug: string
  short_description: string | null
  price: number
  stock: number
  featured: boolean
  primary_image_url: string | null
  category: { id: number; name: string; slug: string } | null
}

// ─── Hero slides (unchanged) ──────────────────────────────────────────────────

const HERO_SLIDES = [
  { id: 1, tag: 'Latest Drop',  title: 'A New Era Of', headline: 'TUNISIAN STYLE',  bg: '#f5c518', src: '/images/im1.jpg', alt: 'Latest Drop' },
  { id: 2, tag: 'New Arrivals', title: 'Tunisian',     headline: 'FASHION',          bg: '#1a1a1a', src: '/images/im2.jpg', alt: 'New Arrivals' },
  { id: 3, tag: 'Fresh Drop',   title: 'Premium',      headline: 'SETS & HOODIES',   bg: '#dc2626', src: '/images/im3.jpg', alt: 'Fresh Drop' },
  { id: 4, tag: 'Best Deal',    title: 'Luxury',       headline: 'WEAR TOUNSI',      bg: '#0f172a', src: '/images/im4.jpg', alt: 'Best Deal' },
]

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: BrandProduct }) {
  const { addToCart, isFavorited, toggleFavorite } = useCart()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [added,  setAdded]  = useState(false)

  const imgUrl   = resolveImg(product.primary_image_url)
  const outOfStock = product.stock <= 0
  const favorited  = isFavorited(product.id, null)

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (outOfStock || adding) return
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/brand'); return }
    setAdding(true)
    await addToCart(product.id, 1, null)
    setAdded(true)
    setAdding(false)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleFavorite(product.id, null)
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">

        {/* Image */}
        <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
          {imgUrl
            ? <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={32} className="text-gray-300" />
              </div>
            )
          }

          {/* Featured badge */}
          {product.featured && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
              <Star size={8} fill="currentColor" /> Featured
            </div>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full uppercase tracking-widest">
                Out of Stock
              </span>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleFav}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-all"
            >
              <Heart
                size={14}
                fill={favorited ? '#dc2626' : 'none'}
                stroke={favorited ? '#dc2626' : '#94a3b8'}
                strokeWidth={2}
              />
            </button>
            <button
              onClick={handleAdd}
              disabled={outOfStock || adding}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-all disabled:opacity-50"
            >
              {adding
                ? <Loader2 size={13} className="animate-spin text-gray-400" />
                : <ShoppingCart size={13} className={added ? 'text-green-500' : 'text-gray-600'} />
              }
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          {product.category && (
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">
              {product.category.name}
            </p>
          )}
          <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-2">
            {product.name}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-black text-red-600">{fmt(product.price)}</span>
            {!outOfStock && product.stock <= 10 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                {product.stock} left
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandPage() {
  const [mounted,      setMounted]      = useState(false)
  const [activeSlide,  setActiveSlide]  = useState(0)
  const [transitioning,setTransitioning]= useState(false)
  const router = useRouter()

  // ── Products state ─────────────────────────────────────────────────────────
  const [products,     setProducts]     = useState<BrandProduct[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState(false)
  const [page,         setPage]         = useState(1)
  const [lastPage,     setLastPage]     = useState(1)
  const [total,        setTotal]        = useState(0)
  const [sortBy,       setSortBy]       = useState('created_at')
  const [filterFeatured, setFilterFeatured] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // ── Fetch brand products ───────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const params = new URLSearchParams({
        page:     String(page),
        per_page: '12',
        sort:     sortBy,
      })
      if (filterFeatured) params.set('featured', '1')

      const res  = await fetch(`${API_BASE}/brand-products?${params}`, {
        headers: { Accept: 'application/json' },
      })
      const json = await res.json()

      if (json.success) {
        setProducts(json.data.data)
        setLastPage(json.data.last_page)
        setTotal(json.data.total)
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, filterFeatured])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // ── Hero slide logic (unchanged) ───────────────────────────────────────────

  const goToSlide = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => { setActiveSlide(index); setTransitioning(false) }, 300)
  }, [transitioning])

  useEffect(() => {
    const timer = setInterval(() => goToSlide((activeSlide + 1) % HERO_SLIDES.length), 4000)
    return () => clearInterval(timer)
  }, [activeSlide, goToSlide])

  const handleBecomeVendor = () => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/become-a-vendor'); return }
    router.push('/become-a-vendor')
  }

  const slide = HERO_SLIDES[activeSlide]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
        @keyframes heroFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .hero-text-1{animation:heroFadeIn 0.6s ease 0.1s both}
        .hero-text-2{animation:heroFadeIn 0.6s ease 0.2s both}
        .hero-text-3{animation:heroFadeIn 0.6s ease 0.3s both}
        .hero-text-4{animation:heroFadeIn 0.6s ease 0.4s both}
        .dot-btn{transition:width .3s ease,background .3s ease}
        .thumb-btn{transition:opacity .2s ease,transform .2s ease,box-shadow .2s ease}
        .thumb-btn:hover{opacity:1!important;transform:scale(1.05)}
        .btn-shop{transition:background .2s ease,transform .15s ease}
        .btn-shop:hover{transform:translateY(-1px);background:#b91c1c}
        .btn-vendor{transition:background .2s ease,color .2s ease,transform .15s ease}
        .btn-vendor:hover{transform:translateY(-1px)}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <Navbar />

      {/* ══════════════════════════════════════════════════════════════════
          HERO — completely unchanged from original
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#f0f0f0 0%,#e8e8e8 50%,#dcdcdc 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch min-h-[420px] lg:min-h-[520px]">

          {/* LEFT text */}
          <div className="flex-1 z-10 px-6 lg:px-12 py-10 lg:py-16 flex flex-col justify-center">
            <p
              className={`text-zinc-500 text-sm font-semibold tracking-widest uppercase mb-2 ${mounted ? 'hero-text-1' : 'opacity-0'}`}
              style={{ fontFamily: "'Barlow',sans-serif" }}
            >
              {slide.tag}
            </p>
            <p
              className={`text-zinc-900 text-3xl lg:text-4xl font-bold leading-tight mb-1 ${mounted ? 'hero-text-2' : 'opacity-0'}`}
              style={{ fontFamily: "'Barlow',sans-serif" }}
            >
              {slide.title}
            </p>
            <div className="relative">
              <h1
                className="select-none pointer-events-none absolute -top-6 -left-2 font-black text-zinc-900 leading-none whitespace-nowrap"
                style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(4rem,10vw,9rem)', opacity: 0.07 }}
                aria-hidden="true"
              >
                {slide.headline}
              </h1>
              <h2
                className={`relative z-10 text-zinc-900 font-black leading-none tracking-tight ${mounted ? 'hero-text-3' : 'opacity-0'}`}
                style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(3rem,7vw,5.5rem)' }}
              >
                {slide.headline}
              </h2>
            </div>
            <div className={`flex flex-wrap gap-3 mt-6 ${mounted ? 'hero-text-4' : 'opacity-0'}`}>
              <Link
                href="/shop"
                className="btn-shop inline-flex items-center gap-2 bg-red-600 text-white font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase shadow-md shadow-red-200"
                style={{ fontFamily: "'Barlow',sans-serif" }}
              >
                SHOP THE COLLECTION
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <button
                onClick={handleBecomeVendor}
                className="btn-vendor inline-flex items-center gap-2 border-2 border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-800 font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase"
                style={{ fontFamily: "'Barlow',sans-serif" }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                BECOME A VENDOR
              </button>
            </div>
            <div className="flex items-center gap-2 mt-8">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToSlide(i)}
                  className="dot-btn h-2 rounded-full"
                  style={{ width: i === activeSlide ? '28px' : '8px', backgroundColor: i === activeSlide ? '#dc2626' : '#a1a1aa' }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT image */}
          <div
            className="relative flex-shrink-0 w-full lg:w-[52%] min-h-[260px] lg:min-h-[520px] overflow-hidden"
            style={{ backgroundColor: slide.bg, transition: 'background-color 0.5s ease' }}
          >
            {HERO_SLIDES.map((s, i) => (
              <div
                key={s.id}
                className="absolute inset-0"
                style={{
                  opacity: i === activeSlide && !transitioning ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: i === activeSlide ? 'auto' : 'none',
                }}
              >
                <Image src={s.src} alt={s.alt} fill className="object-cover object-center" priority={i === 0} unoptimized />
              </div>
            ))}

            {/* Thumbnail strip */}
            <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-gradient-to-t from-black/40 to-transparent z-10">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToSlide(i)}
                  className="thumb-btn relative flex-1 h-14 overflow-hidden rounded"
                  style={{ opacity: i === activeSlide ? 1 : 0.55, boxShadow: i === activeSlide ? '0 0 0 2px #dc2626' : 'none' }}
                  aria-label={`View ${s.headline}`}
                >
                  <Image src={s.src} alt={s.alt} fill className="object-cover object-center" unoptimized />
                </button>
              ))}
            </div>

            {/* Prev / Next arrows */}
            <button
              onClick={() => goToSlide((activeSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
              aria-label="Previous slide"
            >
              <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              onClick={() => goToSlide((activeSlide + 1) % HERO_SLIDES.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
              aria-label="Next slide"
            >
              <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PRODUCTS SECTION — dynamic, replaces static placeholder
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#f9f9f9', padding: '48px 24px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            marginBottom: 32,
          }}>
            <div>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#dc2626',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
                fontFamily: "'Barlow',sans-serif",
              }}>
                CHOOSE'Tounsi Originals
              </p>
              <h2 style={{
                fontSize: 'clamp(1.5rem,3vw,2.25rem)', fontWeight: 900,
                color: '#0f172a', margin: 0, letterSpacing: '-0.02em',
                fontFamily: "'Barlow Condensed',sans-serif",
              }}>
                THE COLLECTION
                {total > 0 && (
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: '#94a3b8',
                    marginLeft: 12, letterSpacing: 0, fontFamily: "'Barlow',sans-serif",
                  }}>
                    {total} product{total !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setFilterFeatured(f => !f); setPage(1) }}
                style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '6px 14px', borderRadius: 999,
                  border: `1.5px solid ${filterFeatured ? '#dc2626' : '#e5e7eb'}`,
                  background: filterFeatured ? 'rgba(220,38,38,0.07)' : '#fff',
                  color: filterFeatured ? '#dc2626' : '#64748b',
                  cursor: 'pointer', fontFamily: "'Barlow',sans-serif",
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                <Star size={11} fill={filterFeatured ? '#dc2626' : 'none'} stroke="currentColor" />
                Featured
              </button>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1) }}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#374151',
                  padding: '6px 12px', borderRadius: 10,
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  cursor: 'pointer', fontFamily: "'Barlow',sans-serif",
                  outline: 'none',
                }}
              >
                <option value="created_at">Latest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Products grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
              <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626' }} />
            </div>
          ) : fetchError ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '64px 0', gap: 12,
            }}>
              <AlertCircle size={28} color="#dc2626" />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Failed to load products.
              </p>
              <button
                onClick={fetchProducts}
                style={{
                  fontSize: 12, fontWeight: 700, color: '#dc2626',
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  padding: '8px 20px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: "'Barlow',sans-serif",
                }}
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '64px 0', gap: 12,
            }}>
              <Package size={40} color="#e5e7eb" />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                {filterFeatured ? 'No featured products yet.' : 'No products in the collection yet.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 20,
            }}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && !loading && !fetchError && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 8, marginTop: 40,
            }}>
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `2px solid ${p === page ? '#dc2626' : '#e5e7eb'}`,
                    background: p === page ? '#dc2626' : '#fff',
                    color: p === page ? '#fff' : '#374151',
                    fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: "'Barlow',sans-serif",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{
              fontFamily: "'Barlow',sans-serif", fontSize: 13, color: '#888',
              fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Also browse the full marketplace
            </p>
            <Link
              href="/shop"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#dc2626', color: '#fff',
                fontFamily: "'Barlow',sans-serif", fontWeight: 800,
                fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '13px 32px', borderRadius: 999, textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
              }}
            >
              Shop All Products
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}