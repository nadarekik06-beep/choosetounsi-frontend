'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Product {
  id: number
  name: string
  slug: string
  price: number | string
  original_price?: number | string | null
  stock: number
  primary_image_url: string | null
  category?: { name: string; slug: string } | null
  is_featured?: boolean
  is_platform_product?: boolean
}

function BrandProductCard({ product, index }: { product: Product; index: number }) {
  const { addToCart, isFavorited, toggleFavorite } = useCart()
  const router = useRouter()
  const [imgErr, setImgErr] = useState(false)
  const [added, setAdded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const favorited = isFavorited(product.id)
  const outOfStock = product.stock <= 0
  const discount = product.original_price
    ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100)
    : null

  const handleCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    if (outOfStock) return
    await addToCart(product.id, 1, null)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleFavorite(product.id, null)
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bpc-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="bpc-img-wrap">
        {product.primary_image_url && !imgErr ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="bpc-img"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="bpc-img-fallback">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Official badge */}
        <div className="bpc-official-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
          Official
        </div>

        {/* Discount badge */}
        {discount && <div className="bpc-discount-badge">-{discount}%</div>}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="bpc-sold-overlay">
            <span>Sold Out</span>
          </div>
        )}

        {/* Hover actions */}
        <div className="bpc-actions">
          <button className={`bpc-action-btn ${favorited ? 'bpc-action-btn--fav' : ''}`} onClick={handleFav} title="Wishlist">
            <svg width="14" height="14" fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button
            className={`bpc-action-btn bpc-action-btn--cart ${added ? 'bpc-action-btn--added' : ''}`}
            onClick={handleCart}
            disabled={outOfStock}
            title="Add to cart"
          >
            {added ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            )}
          </button>
        </div>

        {/* Shine effect */}
        <div className="bpc-shine" />
      </div>

      {/* Info */}
      <div className="bpc-info">
        {product.category && (
          <span className="bpc-cat">{product.category.name}</span>
        )}
        <p className="bpc-name">{product.name}</p>
        <div className="bpc-price-row">
          <span className="bpc-price">{Number(product.price).toFixed(2)} <span className="bpc-currency">DT</span></span>
          {product.original_price && (
            <span className="bpc-original">{Number(product.original_price).toFixed(2)} DT</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function BrandSkeleton() {
  return (
    <div className="bpc-skeleton">
      <div className="bpc-skel-img" />
      <div style={{ padding: '12px 14px' }}>
        <div className="bpc-skel-line" style={{ width: '40%', height: 9, marginBottom: 8 }} />
        <div className="bpc-skel-line" style={{ width: '85%', height: 12, marginBottom: 5 }} />
        <div className="bpc-skel-line" style={{ width: '55%', height: 12 }} />
        <div className="bpc-skel-line" style={{ width: '45%', height: 16, marginTop: 10 }} />
      </div>
    </div>
  )
}

export default function BrandCollectionSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/brand-products?per_page=8&sort=created_at`, {

      headers: { Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(json => setProducts(json.data?.data ?? json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800&display=swap');

        @keyframes bpcShimmer {
          0%  { background-position: -600px 0 }
          100%{ background-position:  600px 0 }
        }
        @keyframes bpcFadeUp {
          from { opacity:0; transform:translateY(20px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes bpcGlow {
          0%,100% { box-shadow: 0 0 16px rgba(219,20,46,0.18); }
          50%      { box-shadow: 0 0 32px rgba(219,20,46,0.38); }
        }
        @keyframes bpcFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes bpcBadgePop {
          0%   { transform: scale(0.7); opacity:0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity:1; }
        }

        /* ── Section ── */
        .bpc-section {
          background: #0a0a0a;
          padding: 56px 0 64px;
          position: relative;
          overflow: hidden;
        }

        /* Decorative background pattern */
        .bpc-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 15% 50%, rgba(219,20,46,0.07) 0%, transparent 50%),
            radial-gradient(circle at 85% 20%, rgba(25,143,65,0.06) 0%, transparent 40%);
          pointer-events: none;
        }

        /* Fine grid overlay */
        .bpc-section::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .bpc-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        /* ── Header ── */
        .bpc-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 36px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .bpc-header-left {}
        .bpc-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .bpc-eyebrow-line {
          width: 28px;
          height: 2px;
          background: linear-gradient(90deg, #db142e, #ff6b6b);
          border-radius: 2px;
        }
        .bpc-eyebrow-text {
          font-family: 'Barlow', sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #db142e;
        }
        .bpc-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 900;
          color: #fff;
          letter-spacing: -.01em;
          line-height: 1.0;
          margin: 0;
        }
        .bpc-title span {
          background: linear-gradient(135deg, #db142e 0%, #ff6b6b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bpc-subtitle {
          font-family: 'Barlow', sans-serif;
          font-size: .82rem;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          margin: 8px 0 0;
          letter-spacing: .01em;
        }

        /* View all link */
        .bpc-view-all {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'Barlow', sans-serif;
          font-size: .75rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #fff;
          text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.15);
          padding: 10px 20px;
          border-radius: 999px;
          transition: border-color .2s ease, background .2s ease, color .2s ease;
          white-space: nowrap;
        }
        .bpc-view-all:hover {
          border-color: #db142e;
          background: #db142e;
          color: #fff;
        }
        .bpc-view-all svg {
          transition: transform .2s ease;
        }
        .bpc-view-all:hover svg {
          transform: translateX(3px);
        }

        /* ── Grid ── */
        .bpc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1024px) { .bpc-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  { .bpc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .bpc-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

        /* ── Product card ── */
        .bpc-card {
          display: flex;
          flex-direction: column;
          background: #141414;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.07);
          text-decoration: none;
          overflow: hidden;
          opacity: 0;
          animation: bpcFadeUp .5s ease both;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
          cursor: pointer;
          will-change: transform;
        }
        .bpc-card:hover {
          transform: translateY(-6px);
          border-color: rgba(219,20,46,0.35);
          box-shadow: 0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(219,20,46,0.12);
        }

        /* ── Image container ── */
        .bpc-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          background: #1a1a1a;
          overflow: hidden;
          flex-shrink: 0;
        }
        .bpc-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .4s ease;
        }
        .bpc-card:hover .bpc-img {
          transform: scale(1.06);
        }
        .bpc-img-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.2);
        }

        /* Official badge */
        .bpc-official-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #db142e, #991b1b);
          color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 999px;
          animation: bpcBadgePop .4s ease both;
          box-shadow: 0 2px 10px rgba(219,20,46,0.4);
        }

        /* Discount badge */
        .bpc-discount-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #fff;
          color: #db142e;
          font-family: 'Barlow', sans-serif;
          font-size: 9px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: .04em;
        }

        /* Sold out */
        .bpc-sold-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
        }
        .bpc-sold-overlay span {
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: 9px; font-weight: 900;
          padding: 4px 12px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: .1em;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
        }

        /* Hover action buttons */
        .bpc-actions {
          position: absolute;
          bottom: 10px; right: 8px;
          display: flex; flex-direction: column; gap: 6px;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity .22s ease, transform .22s ease;
          z-index: 3;
        }
        .bpc-card:hover .bpc-actions {
          opacity: 1; transform: translateX(0);
        }
        .bpc-action-btn {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #fff;
          backdrop-filter: blur(6px);
          transition: background .15s, transform .15s;
        }
        .bpc-action-btn:hover { background: #db142e; transform: scale(1.1); }
        .bpc-action-btn--fav  { }
        .bpc-action-btn--cart:disabled { opacity: .4; cursor: not-allowed; }
        .bpc-action-btn--added { background: #10b981 !important; }

        /* Shine */
        .bpc-shine {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%);
          pointer-events: none;
          opacity: 0;
          transition: opacity .3s ease;
        }
        .bpc-card:hover .bpc-shine { opacity: 1; }

        /* ── Info ── */
        .bpc-info {
          padding: 9px 11px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }
        .bpc-cat {
          font-family: 'Barlow', sans-serif;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.3);
        }
        .bpc-name {
          font-family: 'Barlow', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.88);
          margin: 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color .18s ease;
        }
        .bpc-card:hover .bpc-name { color: #fff; }
        .bpc-price-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .bpc-price {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px;
          font-weight: 900;
          color: #db142e;
          line-height: 1;
        }
        .bpc-currency {
          font-size: 11px;
          font-weight: 700;
        }
        .bpc-original {
          font-family: 'Barlow', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          text-decoration: line-through;
          font-weight: 500;
        }

        /* ── Skeleton ── */
        .bpc-skeleton {
          border-radius: 16px;
          background: #141414;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .bpc-skel-img {
          width: 100%;
          aspect-ratio: 3/4;
          background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%);
          background-size: 600px 100%;
          animation: bpcShimmer 1.3s infinite linear;
        }
        .bpc-skel-line {
          border-radius: 4px;
          background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%);
          background-size: 600px 100%;
          animation: bpcShimmer 1.3s infinite linear;
        }

        /* Bottom CTA strip */
        .bpc-cta-strip {
          margin-top: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          background: rgba(255,255,255,0.02);
          position: relative;
          overflow: hidden;
        }
        .bpc-cta-strip::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(219,20,46,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .bpc-cta-text {
          font-family: 'Barlow', sans-serif;
          font-size: .85rem;
          font-weight: 600;
          color: rgba(255,255,255,0.55);
          text-align: center;
        }
        .bpc-cta-text strong {
          color: rgba(255,255,255,0.85);
        }
        .bpc-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #db142e, #991b1b);
          color: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: .75rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 12px 24px;
          border-radius: 999px;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 4px 20px rgba(219,20,46,0.35);
          transition: transform .2s ease, box-shadow .2s ease;
          animation: bpcGlow 2.5s ease-in-out infinite;
        }
        .bpc-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(219,20,46,0.5);
        }

        @media (max-width: 640px) {
          .bpc-section { padding: 40px 0 48px; }
          .bpc-cta-strip { flex-direction: column; text-align: center; }
        }
      `}</style>

      <section className="bpc-section" ref={sectionRef}>
        <div className="bpc-inner">

          {/* Header */}
          <div className="bpc-header">
            <div className="bpc-header-left">
              <div className="bpc-eyebrow">
                <div className="bpc-eyebrow-line" />
                <span className="bpc-eyebrow-text">Exclusive Collection</span>
              </div>
              <h2 className="bpc-title">
                Choose<span>Tounsi</span><br />
                Originals
              </h2>
              <p className="bpc-subtitle">Curated. Verified. Exclusively ours.</p>
            </div>
            <Link href="/brand" className="bpc-view-all">
              Explore All
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* Grid */}
          <div className="bpc-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <BrandSkeleton key={i} />)
              : products.map((p, i) => (
                  <BrandProductCard key={p.id} product={p} index={i} />
                ))
            }
          </div>

         </div>
      </section>
    </>
  )
}