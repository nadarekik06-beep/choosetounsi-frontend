'use client'

/**
 * FlashSalesSection.tsx — ChooseTounsi
 * Redesigned: Trendyol-style flash cards in a 4-col grid.
 * Cards match bundle card size (aspect-ratio 3/4 image stage).
 * Each card: discount badge, pulsing FLASH badge, stock progress bar,
 *            full-width countdown bar at bottom (Trendyol style).
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { publicPromotionsApi } from '@/lib/promotionsApi'
import CountdownTimer from './CountdownTimer'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')

function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${ORIGIN}/storage/${url.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const money = (n: number | string) => `${Number(n).toFixed(2)} DT`

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlashProduct {
  id: number
  name: string
  slug: string
  effective_price: number
  original_price: number
  primary_image_url?: string | null
  seller?: { name: string } | null
  stock?: number
}

interface FlashSale {
  id: number
  name: string
  discount_label: string
  ends_at: string
  flash_stock?: number | null
  flash_stock_remaining?: number | null
  products: FlashProduct[]
}

// ─── Flash Card — Trendyol-style ──────────────────────────────────────────────
function FlashCard({ product, sale, idx }: { product: FlashProduct; sale: FlashSale; idx: number }) {
  const [hov, setHov] = useState(false)
  const [imgErr, setErr] = useState(false)

  const img = resolveImg(product.primary_image_url)
  const discPct = product.original_price > 0
    ? Math.round(((product.original_price - product.effective_price) / product.original_price) * 100)
    : 0

  // Stock progress
  const hasStock = sale.flash_stock != null && sale.flash_stock > 0
  const stockUsed = hasStock
    ? Math.max(0, sale.flash_stock! - (sale.flash_stock_remaining ?? sale.flash_stock!))
    : 0
  const stockPct = hasStock ? Math.min(100, (stockUsed / sale.flash_stock!) * 100) : 0
  const remaining = sale.flash_stock_remaining ?? product.stock ?? null

  // Urgency level for styling
  const isUrgent = remaining != null && remaining <= 3

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="fsc"
      style={{ '--d': `${Math.min(idx * 0.055, 0.5)}s` } as React.CSSProperties}
    >
      {/* ── Image stage — same 3/4 as bundle cards ── */}
      <div className="fsc-stage">
        {img && !imgErr ? (
          <img
            src={img}
            alt={product.name}
            className={`fsc-img${hov ? ' fsc-img-zoom' : ''}`}
            onError={() => setErr(true)}
            draggable={false}
          />
        ) : (
          <div className="fsc-noimg">
            <svg width="36" height="36" fill="none" stroke="#ccc" strokeWidth="1.2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Badges top-left */}
        <div className="fsc-badges">
          {discPct > 0 && (
            <span className="fsc-badge fsc-disc">-{discPct}%</span>
          )}
          <span className="fsc-badge fsc-flash">
            <span className="fsc-pulse" />
            ⚡ FLASH
          </span>
        </div>

        {/* Urgency overlay when very low stock */}
        {isUrgent && (
          <div className="fsc-urgent">
            🔥 Only {remaining} left!
          </div>
        )}

        {/* CTA bar */}
        <div className={`fsc-cta${hov ? ' show' : ''}`}>
          <button className="fsc-add" onClick={e => e.preventDefault()}>
            <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>View Deal</span>
          </button>
        </div>

        {/* ── Countdown bar — full width at bottom (Trendyol style) ── */}
        <div className="fsc-countdown-bar">
          <CountdownTimer endsAt={sale.ends_at} compact={false} />
        </div>
      </div>

      {/* ── Stock progress bar ── */}
      {hasStock && (
        <div className="fsc-stock-wrap">
          <div className="fsc-stock-bar">
            <div
              className={`fsc-stock-fill${stockPct > 75 ? ' hot' : ''}`}
              style={{ width: `${stockPct}%` }}
            />
          </div>
          <span className="fsc-stock-label">
            {remaining != null ? `${remaining} left` : 'Limited stock'}
          </span>
        </div>
      )}

      {/* ── Info ── */}
      <div className="fsc-info">
        {product.seller?.name && (
          <p className="fsc-seller">{product.seller.name}</p>
        )}
        <p className="fsc-name">{product.name}</p>
        <div className="fsc-prices">
          <span className="fsc-price">{money(product.effective_price)}</span>
          {product.original_price > product.effective_price && (
            <span className="fsc-orig">{money(product.original_price)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const FlashSkel = () => (
  <div className="fsk">
    <div className="fsk-img" />
    <div className="fsk-bar" />
    <div className="fsk-body">
      <div className="fsk-ln" style={{ width: '40%', height: 9 }} />
      <div className="fsk-ln" style={{ width: '75%', height: 13, marginTop: 5 }} />
      <div className="fsk-ln" style={{ width: '45%', height: 15, marginTop: 6 }} />
    </div>
  </div>
)

// ─── Section ──────────────────────────────────────────────────────────────────
interface Props {
  // Optionally pre-pass data from parent to avoid double fetch
  preloadedSales?: FlashSale[]
  loading?: boolean
}

export default function FlashSalesSection({ preloadedSales, loading: extLoading }: Props) {
  const [flashSales, setFlashSales] = useState<FlashSale[]>(preloadedSales ?? [])
  const [loading, setLoading] = useState(extLoading ?? !preloadedSales)

  useEffect(() => {
    if (preloadedSales) return
    publicPromotionsApi.flashSales()
      .then(res => setFlashSales(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [preloadedSales])

  // All products flattened across all sales (for unified grid)
  const allProducts: Array<{ product: FlashProduct; sale: FlashSale }> = flashSales.flatMap(sale =>
    (sale.products ?? []).map(p => ({ product: p, sale }))
  )

  if (!loading && allProducts.length === 0) return null

  // Nearest ending sale for section-level countdown
  const nearestSale = flashSales.length > 0
    ? flashSales.reduce((a, b) => new Date(a.ends_at) < new Date(b.ends_at) ? a : b)
    : null

  return (
    <section className="fss" id="flash-sales">
      {/* Section header */}
      <div className="fss-header">
        <div className="fss-header-left">
          <div className="fss-icon">⚡</div>
          <div>
            <h2 className="fss-title">Flash Sales</h2>
            <p className="fss-sub">Limited time · Limited stock</p>
          </div>
        </div>
        {nearestSale && !loading && (
          <div className="fss-global-timer">
            <span className="fss-timer-label">Ends in</span>
            <CountdownTimer endsAt={nearestSale.ends_at} />
          </div>
        )}
      </div>

      {/* Sale name labels if multiple sales */}
      {!loading && flashSales.length > 1 && (
        <div className="fss-sale-tabs">
          {flashSales.map(sale => (
            <div key={sale.id} className="fss-sale-tab">
              <span className="fss-sale-name">{sale.name}</span>
              <span className="fss-sale-badge">{sale.discount_label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="fss-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <FlashSkel key={i} />)
          : allProducts.map(({ product, sale }, i) => (
              <FlashCard key={`${sale.id}-${product.id}`} product={product} sale={sale} idx={i} />
            ))
        }
      </div>
    </section>
  )
}