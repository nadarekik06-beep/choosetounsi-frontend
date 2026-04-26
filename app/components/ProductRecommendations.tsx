'use client'

/**
 * components/ProductRecommendations.tsx
 *
 * Renders all 4 recommendation sections on the product detail page.
 * Each section fetches independently so they don't block each other.
 *
 * Usage:
 *   import ProductRecommendations from '@/components/ProductRecommendations'
 *
 *   // At the bottom of your product detail page:
 *   <ProductRecommendations slug={product.slug} sellerId={product.seller?.id} />
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, Store, Star, Zap, Heart } from 'lucide-react'
import { getToken } from '@/lib/auth'

const API_URL     = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const STORAGE_BASE = API_URL.replace(/\/api\/?$/, '')

function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${STORAGE_BASE}/storage/${url.replace(/^\/storage\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' DT'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecProduct {
  id: number
  name: string
  slug: string
  short_description: string | null
  price: number
  stock: number
  primary_image_url: string | null
  is_sponsored: boolean
  featured: boolean
  seller: { id: number; name: string } | null
  _score?: number | null
}

interface SellerInfo {
  id: number
  name: string
  business_name: string | null
  plan: string
  wilaya: string | null
  avatar: string | null
  total_products: number
}

// ─── Mini product card ────────────────────────────────────────────────────────

function MiniCard({ product }: { product: RecProduct }) {
  const [imgErr, setImgErr] = useState(false)
  const img = resolveImg(product.primary_image_url)
  const outOfStock = product.stock <= 0

  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none'
          ;(e.currentTarget as HTMLElement).style.transform = 'none'
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f8fafc', overflow: 'hidden' }}>
          {img && !imgErr
            ? <img src={img} alt={product.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📦</div>
          }
          {product.is_sponsored && (
            <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 8, fontWeight: 800, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⭐ Ad
            </span>
          )}
          {product.featured && (
            <span style={{ position: 'absolute', top: 6, left: product.is_sponsored ? 42 : 6, fontSize: 8, fontWeight: 800, background: '#198f41', color: '#fff', padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase' }}>
              TOP
            </span>
          )}
          {outOfStock && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 900, background: '#111', color: '#fff', padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sold Out</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '8px 10px 10px' }}>
          {product.seller?.name && (
            <p style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
              {product.seller.name}
            </p>
          )}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', margin: '0 0 5px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.name}
          </p>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', margin: 0 }}>
            {fmt(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function RecommendationSection({
  title, icon, endpoint, slug, emptyMsg, extra,
}: {
  title: string
  icon: React.ReactNode
  endpoint: string
  slug: string
  emptyMsg: string
  extra?: React.ReactNode
}) {
  const [products, setProducts] = useState<RecProduct[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const token = getToken()
    fetch(`${API_URL}/products/${slug}/${endpoint}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(r => r.json())
      .then(json => { if (json.success) setProducts(json.data ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, endpoint])

  if (!loading && products.length === 0) return null

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>{title}</h3>
        </div>
        {extra}
      </div>

      {/* Products grid / loading */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', aspectRatio: '3/4', animation: 'shimmer 1.3s infinite linear', backgroundSize: '600px 100%' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {products.map(p => <MiniCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── From-seller section (special: includes seller info header) ───────────────

function FromSellerSection({ slug }: { slug: string }) {
  const [products, setProducts] = useState<RecProduct[]>([])
  const [seller,   setSeller]   = useState<SellerInfo | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const token = getToken()
    fetch(`${API_URL}/products/${slug}/from-seller`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setProducts(json.data ?? [])
          setSeller(json.seller ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (!loading && products.length === 0) return null

  const planBadgeColor = seller?.plan === 'black' ? '#f59e0b' : seller?.plan === 'red' ? '#dc2626' : '#198f41'
  const planLabel      = seller?.plan === 'black' ? 'Black Pepper' : seller?.plan === 'red' ? 'Red Pepper' : 'Green Pepper'

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Seller header */}
      {seller && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
              {seller.avatar
                ? <img src={seller.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : (seller.business_name ?? seller.name).charAt(0).toUpperCase()
              }
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {seller.business_name ?? seller.name}
                </h3>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: `${planBadgeColor}18`, color: planBadgeColor, border: `1px solid ${planBadgeColor}33`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {planLabel}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                {seller.total_products} products
                {seller.wilaya && ` · ${seller.wilaya}`}
              </p>
            </div>
          </div>
          <Link href={`/shop?seller_id=${seller.id}`} style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            View Shop <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {!seller && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={16} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>From This Seller</h3>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 12, background: '#f1f5f9', aspectRatio: '3/4' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {products.map(p => <MiniCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  slug:      string
  sellerId?: number | null
}

export default function ProductRecommendations({ slug, sellerId }: Props) {
  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @media(max-width:768px) {
          .rec-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px', fontFamily: "'Barlow', sans-serif" }}>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '48px 0' }} />

        {/* 1. Similar Items */}
        <RecommendationSection
          title="Similar Items"
          icon={<Star size={16} />}
          endpoint="similar"
          slug={slug}
          emptyMsg="No similar products found."
        />

        {/* 2. Complementary Items */}
        <RecommendationSection
          title="Complete the Look"
          icon={<Zap size={16} />}
          endpoint="complementary"
          slug={slug}
          emptyMsg="No complementary products yet."
        />

        {/* 3. From This Seller */}
        <FromSellerSection slug={slug} />

        {/* 4. You Might Also Like */}
        <RecommendationSection
          title="You Might Also Like"
          icon={<Heart size={16} />}
          endpoint="recommended"
          slug={slug}
          emptyMsg="No recommendations yet."
        />

      </div>
    </>
  )
}