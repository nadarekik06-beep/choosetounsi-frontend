'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: number
  image_path: string
  is_primary: boolean
  url?: string
}

interface Product {
  id: number
  name: string
  slug: string
  price: string
  stock: number
  views?: number
  short_description?: string
  primary_image?: ProductImage | null
  primary_image_url?: string | null
  seller?: { id: number; name: string }
}

interface Category {
  id: number
  name: string
  name_ar: string
  slug: string
  icon: string | null
  image: string | null
  description?: string | null
}

interface PaginatedProducts {
  data: Product[]
  current_page: number
  last_page: number
  total: number
  from: number
  to: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Config & helpers
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type SortKey = 'created_at' | 'views' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: 'Newest' },
  { key: 'views',      label: 'Most Visited' },
  { key: 'price_asc',  label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
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
  if (product.primary_image?.image_path) {
    return `${API_URL}/storage/${product.primary_image.image_path}`
  }
  return null
}

function formatPrice(price: string | number) {
  return `${Number(price).toFixed(2)} DT`
}

// ─────────────────────────────────────────────────────────────────────────────
// Product card — inspired by the Trendyol layout you sent
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product, rank }: { product: Product; rank: number }) {
  const imgSrc = resolveProductImage(product)
  const [wished, setWished] = useState(false)

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative bg-white border border-zinc-100 rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:border-zinc-200 transition-all duration-300"
    >
      {/* ── Product image ── */}
      <div className="relative w-full bg-zinc-50 overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-100">
            <svg className="text-zinc-300" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span className="text-zinc-300 text-xs">No image</span>
          </div>
        )}

        {/* Rank badge — top left */}
        {rank <= 5 && (
          <div
            className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg"
            style={{ background: rank === 1 ? '#dc2626' : rank === 2 ? '#ef4444' : '#f87171' }}
          >
            {rank}
          </div>
        )}

        {/* Ribbon for top 3 */}
        {rank <= 3 && (
          <div className="absolute top-9 left-2 z-10">
            <div className="w-4 h-5 relative">
              <div className="absolute inset-0" style={{
                background: rank === 1 ? '#1d4ed8' : '#1d4ed8',
                clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)',
              }} />
            </div>
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.preventDefault(); setWished(w => !w) }}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          aria-label="Add to wishlist"
        >
          <svg
            width="15" height="15"
            fill={wished ? '#dc2626' : 'none'}
            stroke={wished ? '#dc2626' : '#888'}
            strokeWidth="2" viewBox="0 0 24 24"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* ── Product info ── */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Seller name */}
        {product.seller?.name && (
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
            {product.seller.name}
          </p>
        )}

        {/* Product name */}
        <p className="text-zinc-800 text-sm font-semibold leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
          {product.name}
        </p>

        {/* Price */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-red-600 font-black text-base">
            {formatPrice(product.price)}
          </span>
          {product.stock > 0 && product.stock < 10 && (
            <span className="text-[10px] text-orange-500 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
              Only {product.stock} left
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// Skeleton card
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-zinc-100 animate-pulse">
      <div className="bg-zinc-100" style={{ aspectRatio: '3/4' }} />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-zinc-100 rounded w-1/3" />
        <div className="h-4 bg-zinc-100 rounded w-4/5" />
        <div className="h-4 bg-zinc-100 rounded w-2/3" />
        <div className="h-5 bg-zinc-100 rounded w-1/4 mt-2" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryPage() {
  const params   = useParams()
  const slug     = params?.slug as string

  const [category, setCategory]     = useState<Category | null>(null)
  const [products, setProducts]     = useState<PaginatedProducts | null>(null)
  const [loading, setLoading]       = useState(true)
  const [catError, setCatError]     = useState(false)
  const [sort, setSort]             = useState<SortKey>('created_at')
  const [page, setPage]             = useState(1)

  // ── Fetch category info ──────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/categories/${slug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setCategory(json.data))
      .catch(() => setCatError(true))
  }, [slug])

  // ── Fetch products for this category ────────────────────────────────
  // Uses GET /api/categories/{slug}/products (already in your api.php)
  // which filters is_approved=true, is_active=true, stock>0
  const fetchProducts = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const sortBy    = sort === 'price_asc' || sort === 'price_desc' ? 'price' : sort
      const sortOrder = sort === 'price_asc' ? 'asc' : 'desc'
      const url = `${API_URL}/api/categories/${slug}/products?page=${page}&sort=${sortBy}&order=${sortOrder}`
      const res  = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setProducts(json.data)
    } catch {
      setProducts(null)
    } finally {
      setLoading(false)
    }
  }, [slug, sort, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // reset page when sort changes
  useEffect(() => { setPage(1) }, [sort])

  // ── Breadcrumb ──────────────────────────────────────────────────────
  const categoryOffset = (page - 1) * 20

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.45s ease both; }

        /* Hide scrollbar on sort strip */
        .sort-strip::-webkit-scrollbar { display: none; }
        .sort-strip { scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-zinc-50" style={{ fontFamily: "'Barlow', sans-serif" }}>

        {/* ── Breadcrumb ── */}
        <div className="bg-white border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-zinc-400">
            <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            <Link href="/shop" className="hover:text-red-600 transition-colors">Shop</Link>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            <span className="text-zinc-700 font-semibold">{category?.name ?? '...'}</span>
          </div>
        </div>

        {/* ── Category banner ── */}
        <div
          className="w-full relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fef9ec 0%, #fef3c7 100%)', minHeight: '90px' }}
        >
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {category?.icon && (
                <span className="text-3xl">{category.icon}</span>
              )}
              <div>
                <p className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-0.5">Category</p>
                <h1
                  className="text-zinc-900 font-black text-2xl lg:text-3xl leading-none"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {catError ? 'Category not found' : category?.name ?? (
                    <span className="inline-block w-48 h-7 bg-zinc-200 rounded animate-pulse" />
                  )}
                </h1>
              </div>
            </div>

            {/* Product count */}
            {products && (
              <div className="hidden md:block text-right">
                <p className="text-zinc-900 font-black text-2xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {products.total}
                </p>
                <p className="text-zinc-400 text-xs font-semibold tracking-wide uppercase">Products</p>
              </div>
            )}
          </div>

          {/* Decorative rocket — like the inspiration image */}
          <div className="absolute right-6 bottom-0 text-5xl select-none pointer-events-none opacity-20 hidden lg:block">
            🚀
          </div>
        </div>

        {/* ── Sort / Filter strip ── */}
        <div className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto sort-strip">
            <span className="text-zinc-400 text-xs font-semibold tracking-wide uppercase shrink-0 mr-1">Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className="shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-150"
                style={{
                  backgroundColor: sort === opt.key ? '#dc2626' : 'transparent',
                  color:           sort === opt.key ? '#ffffff' : '#52525b',
                  border:          sort === opt.key ? '2px solid #dc2626' : '2px solid #e4e4e7',
                }}
              >
                {opt.label}
              </button>
            ))}

            {/* Total count on right */}
            {products && (
              <span className="ml-auto shrink-0 text-xs text-zinc-400 font-medium">
                {products.from}–{products.to} of {products.total} products
              </span>
            )}
          </div>
        </div>

        {/* ── Product grid ── */}
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error / empty */}
          {!loading && (!products || products.data.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="text-6xl">🛍️</span>
              <p className="text-zinc-700 font-bold text-lg">No products yet in this category</p>
              <p className="text-zinc-400 text-sm max-w-xs">
                Sellers haven't added approved products here yet. Check back soon!
              </p>
              <Link
                href="/shop"
                className="mt-2 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase transition-colors"
              >
                Browse All Products
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* Product cards — staggered animation */}
          {!loading && products && products.data.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.data.map((product, i) => (
                <div
                  key={product.id}
                  className="fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <ProductCard
                    product={product}
                    rank={categoryOffset + i + 1}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {products && products.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:border-red-600 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>

              {/* Page numbers */}
              {Array.from({ length: products.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === products.last_page || Math.abs(p - page) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="text-zinc-400 px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                      style={{
                        backgroundColor: page === p ? '#dc2626' : 'transparent',
                        color:           page === p ? '#fff' : '#52525b',
                        border:          page === p ? '2px solid #dc2626' : '2px solid #e4e4e7',
                      }}
                    >
                      {p}
                    </button>
                  )
                )
              }

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(products.last_page, p + 1))}
                disabled={page === products.last_page}
                className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:border-red-600 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}