'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import PriceDisplay from '@/app/components/promotions/PriceDisplay'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ActivePromotion {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  is_flash_sale: boolean
}

interface Product {
  id: number
  name: string
  slug: string
  price: number | string           // original base price
  effective_price?: number | null  // ← NEW: discounted price from backend
  discount_amount?: number | null
  promotion?: ActivePromotion | null
  stock: number
  primary_image_url: string | null
  category?: { name: string; slug: string } | null
  is_featured?: boolean
}

function CompactProductCard({ product }: { product: Product }) {
  const { addToCart, isFavorited, toggleFavorite } = useCart()
  const router = useRouter()
  const [imgErr, setImgErr] = useState(false)
  const [added, setAdded]   = useState(false)

  const favorited  = isFavorited(product.id)
  const outOfStock = product.stock <= 0

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
    <Link href={`/products/${product.slug}`} className="cpc-card">
      <div className="cpc-img-wrap">
        {product.primary_image_url && !imgErr
          ? <img src={product.primary_image_url} alt={product.name} className="cpc-img" onError={() => setImgErr(true)} />
          : <div className="cpc-img-placeholder">🛍️</div>
        }

        {/* Discount badge — only when a real promotion exists */}
        {product.promotion && product.effective_price != null &&
          Number(product.effective_price) < Number(product.price) && (
          <span className="cpc-discount">
            -{Math.round(((Number(product.price) - Number(product.effective_price)) / Number(product.price)) * 100)}%
          </span>
        )}

        {outOfStock && <div className="cpc-sold-overlay"><span>Sold Out</span></div>}

        <div className="cpc-hover-actions">
          <button className="cpc-btn" onClick={handleFav} title="Wishlist">
            <svg width="13" height="13" fill={favorited ? '#dc2626' : 'none'} stroke={favorited ? '#dc2626' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button className={`cpc-btn ${added ? 'cpc-btn--added' : ''}`} onClick={handleCart} disabled={outOfStock} title="Add to cart">
            {added
              ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            }
          </button>
        </div>
      </div>

      <div className="cpc-info">
        <p className="cpc-name">{product.name}</p>

        {/* ── FIXED: replaced manual price JSX with PriceDisplay ── */}
        <PriceDisplay
          price={product.price}
          effectivePrice={product.effective_price}
          promotion={product.promotion}
          size="sm"
        />
      </div>
    </Link>
  )
}

export default function AboveFoldProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/products?per_page=8&sort=latest`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => setProducts(json.data?.data ?? json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes cpcShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}

        .cpc-section{background:#fff;padding:28px 0 32px}
        .cpc-inner{max-width:1280px;margin:0 auto;padding:0 24px}
        .cpc-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .cpc-title{font-family:'Barlow',sans-serif;font-size:1.1rem;font-weight:800;color:#111;letter-spacing:-.02em;margin:0}
        .cpc-view-all{font-family:'Barlow',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#888;text-decoration:none;transition:color .18s}
        .cpc-view-all:hover{color:#dc2626}
        .cpc-row{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 10px;scrollbar-width:none;-ms-overflow-style:none}
        .cpc-row::-webkit-scrollbar{display:none}
        .cpc-card{flex:0 0 auto;width:140px;text-decoration:none;color:inherit;display:block}
        @media(max-width:640px){.cpc-card{width:120px}}
        .cpc-img-wrap{position:relative;width:100%;aspect-ratio:3/4;background:#f7f7f7;border-radius:10px;overflow:hidden;border:1.5px solid #efefef;transition:transform .22s ease,box-shadow .22s ease}
        .cpc-card:hover .cpc-img-wrap{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.10)}
        .cpc-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}
        .cpc-card:hover .cpc-img{transform:scale(1.05)}
        .cpc-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.4rem}
        .cpc-discount{position:absolute;top:6px;left:6px;background:#dc2626;color:#fff;font-size:8px;font-weight:800;padding:2px 5px;border-radius:999px;letter-spacing:.05em;text-transform:uppercase}
        .cpc-sold-overlay{position:absolute;inset:0;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center}
        .cpc-sold-overlay span{background:#111;color:#fff;font-size:8px;font-weight:900;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.08em}
        .cpc-hover-actions{position:absolute;bottom:6px;right:5px;display:flex;flex-direction:column;gap:4px;opacity:0;transform:translateX(4px);transition:opacity .2s ease,transform .2s ease;z-index:2}
        .cpc-card:hover .cpc-hover-actions{opacity:1;transform:translateX(0)}
        .cpc-btn{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.9);border:1px solid rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#444;box-shadow:0 2px 6px rgba(0,0,0,0.10);transition:background .15s,color .15s}
        .cpc-btn:hover{background:#dc2626;color:#fff}
        .cpc-btn--added{background:#10b981!important;color:#fff!important}
        .cpc-info{padding:7px 2px 0}
        .cpc-name{font-family:'Barlow',sans-serif;font-size:11.5px;font-weight:700;color:#111;margin:0 0 4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .cpc-skel{flex:0 0 auto;width:140px}
        .cpc-skel-img{aspect-ratio:3/4;border-radius:10px;background:linear-gradient(90deg,#efefef 25%,#f8f8f8 50%,#efefef 75%);background-size:600px 100%;animation:cpcShimmer 1.3s infinite linear}
        .cpc-skel-line{height:10px;border-radius:4px;margin-top:8px;background:linear-gradient(90deg,#efefef 25%,#f8f8f8 50%,#efefef 75%);background-size:600px 100%;animation:cpcShimmer 1.3s infinite linear}
        @media(max-width:640px){.cpc-skel{width:120px}}
      `}</style>

      <section className="cpc-section">
        <div className="cpc-inner">
          <div className="cpc-header">
            <h2 className="cpc-title">New Arrivals</h2>
            <Link href="/shop" className="cpc-view-all">See All →</Link>
          </div>
          <div className="cpc-row">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="cpc-skel">
                    <div className="cpc-skel-img" style={{ animationDelay: `${i * 0.06}s` }} />
                    <div className="cpc-skel-line" style={{ width: '80%' }} />
                    <div className="cpc-skel-line" style={{ width: '45%', marginTop: 4 }} />
                  </div>
                ))
              : products.map(p => <CompactProductCard key={p.id} product={p} />)
            }
          </div>
        </div>
      </section>
    </>
  )
}