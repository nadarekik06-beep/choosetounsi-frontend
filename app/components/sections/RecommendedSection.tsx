'use client'

/**
 * app/components/sections/RecommendedSection.tsx
 *
 * "Recommended for You" homepage section.
 *
 * Behavior:
 *   - Authenticated users: personalized ranked feed (preference + activity + sponsorship)
 *   - Guests: popular + sponsored products
 *   - Sends auth token in request so the backend can personalize server-side
 *   - Shows a "Sponsored" badge on sponsored cards
 *   - Never empty: backend guarantees fallback results
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API    = `${ORIGIN}/api`

// ── Types ─────────────────────────────────────────────────────────────────────

interface Promotion {
  id: number
  type: 'flash_sale' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  is_flash_sale: boolean
}

interface RecommendedProduct {
  id: number
  name: string
  slug: string
  price: string | number
  stock: number
  is_sponsored: boolean
  sponsored_priority?: number
  primary_image_url?: string | null
  effective_price?: number | null
  discount_amount?: number | null
  promotion?: Promotion | null
  category?: { id: number; name: string; slug: string }
  seller?: { id: number; name: string }
}

interface ApiResponse {
  success: boolean
  personalized: boolean
  has_preferences?: boolean
  data: RecommendedProduct[]
}

// ── Token helper ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  for (const k of ['ct_auth_token', 'auth_token', 'token', 'access_token']) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k)
    if (v) return v
  }
  return null
}

// ── Price helpers ─────────────────────────────────────────────────────────────

function money(v: number | string) {
  return `${Number(v).toFixed(2)} DT`
}

function getDisplayPrice(p: RecommendedProduct): {
  display: number
  original: number | null
  badge: string | null
  isFlash: boolean
} {
  const base      = Number(p.price)
  const effective = p.effective_price != null ? Number(p.effective_price) : base
  const hasDiscount = effective < base - 0.001

  if (!hasDiscount || !p.promotion) {
    return { display: base, original: null, badge: null, isFlash: false }
  }

  let badge: string | null = null
  if (p.promotion.discount_type === 'percentage') {
    const pct = Math.round(((base - effective) / base) * 100)
    if (pct > 0) badge = `-${pct}%`
  } else {
    const saved = base - effective
    if (saved > 0) badge = `-${saved.toFixed(0)} DT`
  }

  return {
    display:  effective,
    original: base,
    badge,
    isFlash: p.promotion.is_flash_sale,
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RecommendedCard({ product, index }: { product: RecommendedProduct; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [imgErr,  setImgErr]  = useState(false)
  const { display, original, badge, isFlash } = getDisplayPrice(product)
  const oos = product.stock <= 0

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'block',
        textDecoration:  'none',
        color:           'inherit',
        background:      '#fff',
        border:          `1.5px solid ${hovered ? '#e0e0e0' : '#eee'}`,
        borderRadius:    12,
        overflow:        'hidden',
        flexShrink:      0,
        width:           170,
        transform:       hovered ? 'translateY(-5px)' : 'none',
        boxShadow:       hovered ? '0 10px 28px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
        transition:      'transform 0.25s cubic-bezier(.34,1.4,.64,1), box-shadow 0.25s ease, border-color 0.2s',
        animation:       `recFadeUp 0.4s ease both`,
        animationDelay:  `${Math.min(index * 0.045, 0.5)}s`,
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f5f5f5', overflow: 'hidden' }}>
        {product.primary_image_url && !imgErr ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" fill="none" stroke="#ddd" strokeWidth="1.2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 7, left: 7, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 3 }}>
          {/* Smart badge — never reveals "Sponsored" to customers */}
{(() => {
  if (product.stock > 0 && product.stock <= 5) return null // low stock shown below already
  if (product.promotion?.is_flash_sale) return null        // flash badge already shown
if (product.is_sponsored && (product.sponsored_priority ?? 0) >= 70) {
    return (
      <span style={{
        background: '#111', color: '#fff',
        fontSize: 8, fontWeight: 900,
        padding: '2px 7px', borderRadius: 999,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>🔥 Hot</span>
    )
  }
if (product.is_sponsored && (product.sponsored_priority ?? 0) >= 30) {
    return (
      <span style={{
        background: '#db142e', color: '#fff',
        fontSize: 8, fontWeight: 900,
        padding: '2px 7px', borderRadius: 999,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>⚡ Trending</span>
    )
  }
  if (product.is_sponsored) {
    return (
      <span style={{
        background: '#198f41', color: '#fff',
        fontSize: 8, fontWeight: 900,
        padding: '2px 7px', borderRadius: 999,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>✨ Popular</span>
    )
  }
  return null
})()}
          {badge && (
            <span style={{
              background: isFlash
                ? 'linear-gradient(135deg,#dc2626,#f97316)'
                : '#db142e',
              color: '#fff', fontSize: 8, fontWeight: 900,
              padding: '2px 6px', borderRadius: 999,
              textTransform: 'uppercase',
            }}>
              {badge}
            </span>
          )}
        </div>

        {oos && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4,
          }}>
            <span style={{
              background: '#111', color: '#fff',
              fontSize: 8, fontWeight: 900,
              padding: '4px 10px', borderRadius: 999,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '9px 11px 11px' }}>
        {product.seller?.name && (
          <p style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>
            {product.seller.name}
          </p>
        )}
        <p style={{
          fontSize: 12.5, fontWeight: 600, color: hovered ? '#db142e' : '#1f2937',
          margin: '0 0 5px', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          transition: 'color 0.15s',
        }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 13.5, fontWeight: 900, color: '#db142e' }}>
            {money(display)}
          </span>
          {original !== null && (
            <span style={{ fontSize: 10, color: '#bbb', textDecoration: 'line-through' }}>
              {money(original)}
            </span>
          )}
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <p style={{ fontSize: 9.5, color: '#f97316', fontWeight: 700, margin: '4px 0 0' }}>
            Only {product.stock} left!
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ width: 170, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #eee' }}>
      <div style={{ aspectRatio: '3/4', background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)', backgroundSize: '600px 100%', animation: 'recShimmer 1.3s infinite linear' }} />
      <div style={{ padding: '9px 11px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 8,  width: '45%', borderRadius: 4, background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)', backgroundSize: '600px 100%', animation: 'recShimmer 1.3s infinite linear' }} />
        <div style={{ height: 12, width: '80%', borderRadius: 4, background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)', backgroundSize: '600px 100%', animation: 'recShimmer 1.3s infinite linear' }} />
        <div style={{ height: 14, width: '40%', borderRadius: 4, background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)', backgroundSize: '600px 100%', animation: 'recShimmer 1.3s infinite linear' }} />
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

interface Props {
  limit?: number
  title?: string
}

export default function RecommendedSection({ limit = 16, title }: Props) {
  const [products,     setProducts]     = useState<RecommendedProduct[]>([])
  const [loading,      setLoading]      = useState(true)
  const [personalized, setPersonalized] = useState(false)

  useEffect(() => {
    const token = getToken()

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    fetch(`${API}/recommendations?limit=${limit}`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((json: ApiResponse) => {
        if (json.success) {
          setProducts(json.data ?? [])
          setPersonalized(json.personalized ?? false)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [limit])

  // Don't render the section at all if there's nothing to show
  if (!loading && products.length === 0) return null

  const sectionTitle = title ?? (personalized ? '✨ Recommended for You' : '🔥 Popular Right Now')
  const subtitle     = personalized
    ? 'Based on your interests and browsing history'
    : 'Trending across ChooseTounsi'

  return (
    <>
      <style>{`
        @keyframes recFadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes recShimmer { 0%{ background-position:-600px 0 } 100%{ background-position:600px 0 } }
      `}</style>

      <section style={{ padding: '28px 0 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: '0 0 3px', fontFamily: "'Outfit', sans-serif" }}>
                {sectionTitle}
              </h2>
              <p style={{ fontSize: 12, color: '#bbb', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                {subtitle}
              </p>
            </div>
            <Link href="/shop" style={{
              fontSize: 11, fontWeight: 700, color: '#db142e',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              opacity: 0.8,
            }}>
              View All
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* Scrollable row */}
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            paddingBottom: 8, scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
              : products.map((p, i) => <RecommendedCard key={p.id} product={p} index={i} />)
            }
          </div>
        </div>
      </section>
    </>
  )
}