'use client'

/**
 * app/products/[slug]/page.tsx
 * Product detail page — SHEIN-style layout with ChooseTounsi branding.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, ChevronRight, Star, Shield, Truck, RotateCcw, Share2, Minus, Plus, ZoomIn, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/* ── Types ── */
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
  description: string | null
  short_description: string | null
  price: string | number
  stock: number
  sku: string | null
  views: number
  is_approved: boolean
  is_active: boolean
  featured: boolean
  primary_image_url: string | null
  images: ProductImage[]
  category: { id: number; name: string; slug: string } | null
  seller: { id: number; name: string; email: string } | null
}

/* ── Helpers ── */
function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_URL}/storage/${path.replace(/^\//, '')}`
}

const fmt = (n: number | string) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(n)) + ' DT'

/* ── Star rating (static display) ── */
function Stars({ n = 4.5, count = 0 }: { n?: number; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13}
          fill={i <= Math.floor(n) ? '#f59e0b' : i - n < 1 ? '#f59e0b' : 'none'}
          stroke="#f59e0b" strokeWidth={1.5}
          style={{ opacity: i > Math.ceil(n) ? 0.25 : 1 }}
        />
      ))}
      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
        {n.toFixed(1)} {count > 0 && `(${count} reviews)`}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params?.slug as string

  const { addToCart, isFavorited, toggleFavorite, cartLoading } = useCart()

  const [product,    setProduct]    = useState<Product | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  const [activeImg,  setActiveImg]  = useState(0)
  const [quantity,   setQuantity]   = useState(1)
  const [addedToCart,setAddedToCart]= useState(false)
  const [zoom,       setZoom]       = useState(false)
  const [zoomPos,    setZoomPos]    = useState({ x: 50, y: 50 })
  const [tab,        setTab]        = useState<'description'|'details'>('description')

  /* fetch product */
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`${API_URL}/api/products/${slug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setProduct(json.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  /* all images array */
  const allImages = useCallback(() => {
    if (!product) return []
    const imgs: string[] = []
    if (product.primary_image_url) imgs.push(resolveImg(product.primary_image_url)!)
    product.images?.forEach(img => {
      const url = resolveImg(img.url ?? img.image_path)
      if (url && !imgs.includes(url)) imgs.push(url)
    })
    return imgs.length ? imgs : [null]
  }, [product])

  const images      = allImages()
  const currentImg  = images[activeImg] ?? null
  const favorited   = product ? isFavorited(product.id) : false
  const outOfStock  = product ? product.stock <= 0 : false
  const lowStock    = product ? product.stock > 0 && product.stock <= 10 : false

  const handleAddToCart = async () => {
    if (!product || outOfStock) return
    if (!isAuthenticated()) { router.push('/auth/login?redirect=' + window.location.pathname); return }
    await addToCart(product.id, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2500)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    })
  }

  /* ── Loading / Error ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading product…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !product) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>Product not found</p>
        <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>Back to Shop</Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .thumb:hover { border-color: #dc2626 !important; }
        .tab-btn:hover { color: #dc2626 !important; }
        .share-btn:hover { background: #f1f5f9 !important; }
        .trust-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .trust-item:last-child { border-bottom: none; }
        .qty-btn:hover { background: #dc2626 !important; color: #fff !important; border-color: #dc2626 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }} className="hover:text-red-600">Home</Link>
            <ChevronRight size={11} />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }} className="hover:text-red-600">Shop</Link>
            {product.category && <>
              <ChevronRight size={11} />
              <Link href={`/category/${product.category.slug}`} style={{ color: '#94a3b8', textDecoration: 'none' }} className="hover:text-red-600">
                {product.category.name}
              </Link>
            </>}
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </span>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* ════ LEFT: Image gallery ════ */}
          <div style={{ animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ display: 'flex', gap: 12 }}>

              {/* Thumbnails column */}
              {images.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 72 }}>
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className="thumb"
                      style={{
                        width: 72, height: 72, borderRadius: 8, overflow: 'hidden',
                        border: `2px solid ${activeImg === i ? '#dc2626' : '#e5e7eb'}`,
                        background: '#f8fafc', cursor: 'pointer', padding: 0,
                        transition: 'border-color 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div style={{ flex: 1, position: 'relative' }}>
                <div
                  style={{
                    width: '100%', aspectRatio: '3/4',
                    borderRadius: 16, overflow: 'hidden',
                    background: '#f8fafc', border: '1px solid #f1f5f9',
                    cursor: zoom ? 'zoom-out' : 'zoom-in',
                    position: 'relative',
                  }}
                  onClick={() => setZoom(z => !z)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setZoom(false)}
                >
                  {currentImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImg}
                      alt={product.name}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transform: zoom ? 'scale(2.2)' : 'scale(1)',
                        transition: zoom ? 'none' : 'transform 0.3s ease',
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="48" height="48" fill="none" stroke="#e2e8f0" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                      </svg>
                    </div>
                  )}

                  {/* Badges */}
                  {outOfStock && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Out of Stock
                    </div>
                  )}
                  {product.featured && !outOfStock && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Featured
                    </div>
                  )}
                  {lowStock && (
                    <div style={{ position: 'absolute', top: outOfStock || product.featured ? 44 : 12, left: 12, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>
                      Only {product.stock} left
                    </div>
                  )}

                  {/* Zoom hint */}
                  {!zoom && currentImg && (
                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <ZoomIn size={13} /> Hover to zoom
                    </div>
                  )}
                </div>

                {/* Prev / Next arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <ChevronLeft size={16} color="#374151" />
                    </button>
                    <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <ChevronRight size={16} color="#374151" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Image dots */}
            {images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    style={{ width: i === activeImg ? 20 : 7, height: 7, borderRadius: 999, background: i === activeImg ? '#dc2626' : '#e5e7eb', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease' }} />
                ))}
              </div>
            )}
          </div>

          {/* ════ RIGHT: Product info ════ */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>

            {/* Category tag */}
            {product.category && (
              <Link href={`/category/${product.category.slug}`}
                style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', padding: '3px 10px', borderRadius: 999, textDecoration: 'none', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {product.category.name}
              </Link>
            )}

            {/* Title + share + favorite row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.25, letterSpacing: '-0.01em', flex: 1 }}>
                {product.name}
              </h1>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="share-btn"
                  onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'background 0.15s' }}
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `1.5px solid ${favorited ? '#dc2626' : '#e5e7eb'}`,
                    background: favorited ? 'rgba(220,38,38,0.06)' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Heart size={15} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: 14 }}>
              <Stars n={4.5} count={product.views} />
            </div>

            {/* Seller */}
            {product.seller && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  {product.seller.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Sold by </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>{product.seller.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                  Verified
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmt(product.price)}
                </span>
              </div>
              {product.sku && (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontFamily: 'monospace' }}>
                  SKU: {product.sku}
                </p>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px', fontWeight: 500 }}>
                {product.short_description}
              </p>
            )}

            {/* Quantity selector */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>
                Quantity
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'all 0.15s', fontSize: 16, fontWeight: 700 }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ width: 48, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#111', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', lineHeight: '40px' }}>
                  {quantity}
                </span>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  style={{ width: 40, height: 40, border: 'none', background: '#f8fafc', cursor: quantity >= product.stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: quantity >= product.stock ? '#e5e7eb' : '#374151', transition: 'all 0.15s' }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 8, fontWeight: 700 }}>
                {outOfStock ? 'Out of stock' : lowStock ? `Only ${product.stock} items left` : `${product.stock} in stock`}
              </p>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={outOfStock || cartLoading}
                style={{
                  flex: 1, height: 52,
                  background: outOfStock
                    ? '#e5e7eb'
                    : addedToCart
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  color: outOfStock ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 12, cursor: outOfStock ? 'not-allowed' : 'pointer',
                  fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: outOfStock ? 'none' : '0 8px 24px rgba(220,38,38,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {cartLoading ? (
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                ) : addedToCart ? (
                  <><CheckCircle size={18} /> Added to Cart!</>
                ) : (
                  <><ShoppingCart size={18} /> {outOfStock ? 'Out of Stock' : 'Add to Cart'}</>
                )}
              </button>

              {/* Favorite */}
              <button
                onClick={() => toggleFavorite(product.id)}
                style={{
                  width: 52, height: 52, borderRadius: 12,
                  border: `1.5px solid ${favorited ? '#dc2626' : '#e5e7eb'}`,
                  background: favorited ? 'rgba(220,38,38,0.06)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <Heart size={20} fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : '#94a3b8'} strokeWidth={2} />
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
              {[
                { icon: <Truck size={18} color="#10b981" />,     title: 'Free Delivery',       desc: 'On orders over 50 DT across Tunisia' },
                { icon: <RotateCcw size={18} color="#3b82f6" />, title: 'Easy Returns',         desc: '30-day hassle-free return policy' },
                { icon: <Shield size={18} color="#f59e0b" />,    title: 'Secure Payments',      desc: 'Your transaction is fully protected' },
                { icon: <CheckCircle size={18} color="#dc2626"/>,title: 'Verified Seller',      desc: 'All sellers are reviewed by our team' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="trust-item" style={{ padding: '12px 16px' }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 13, color: '#111', margin: '0 0 2px' }}>{title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description tabs */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              {/* Tab header */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                {(['description', 'details'] as const).map(t => (
                  <button
                    key={t}
                    className="tab-btn"
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, height: 44, border: 'none', background: 'transparent',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em',
                      color: tab === t ? '#dc2626' : '#94a3b8',
                      borderBottom: tab === t ? '2px solid #dc2626' : '2px solid transparent',
                      textTransform: 'capitalize', transition: 'color 0.15s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ padding: '16px 20px' }}>
                {tab === 'description' ? (
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0, fontWeight: 500, whiteSpace: 'pre-line' }}>
                    {product.description ?? product.short_description ?? 'No description available for this product.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: 'Category',  value: product.category?.name ?? '—' },
                      { label: 'SKU',       value: product.sku ?? 'N/A' },
                      { label: 'Stock',     value: `${product.stock} units` },
                      { label: 'Seller',    value: product.seller?.name ?? '—' },
                      { label: 'Views',     value: product.views?.toString() ?? '0' },
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

        {/* Responsive */}
        <style>{`
          @media (max-width: 900px) {
            div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}