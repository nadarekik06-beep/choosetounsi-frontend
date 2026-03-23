'use client'

/**
 * app/favorites/page.tsx
 */

import Link from 'next/link'
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import AddToCartButton from '@/components/AddToCartButton'
import FavoriteButton from '@/components/FavoriteButton'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n) + ' DT'

export default function FavoritesPage() {
  const { favorites, favLoading } = useCart()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        .fav-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Barlow', sans-serif" }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} color="#dc2626" fill="#dc2626" />
              <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>
                Favorites {favorites.length > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>({favorites.length} items)</span>}
              </h1>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
          {favorites.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: '80px 24px', textAlign: 'center', border: '1px solid #eee' }}>
              <Heart size={56} style={{ margin: '0 auto 16px', display: 'block', color: '#fecdd3' }} fill="#fecdd3" />
              <p style={{ fontWeight: 800, fontSize: 20, color: '#374151', margin: '0 0 8px' }}>No favorites yet</p>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 28px' }}>Save products you love by tapping the heart icon.</p>
              <Link href="/shop" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', background: '#dc2626', color: '#fff',
                fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none',
              }}>
                Browse Products
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 18,
            }}>
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className="fav-card"
                  style={{
                    background: '#fff', borderRadius: 18, border: '1px solid #eee',
                    overflow: 'hidden', position: 'relative',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                  }}
                >
                  {/* Image */}
                  <Link href={`/products/${fav.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
                      {fav.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fav.image_url} alt={fav.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag size={32} color="#e2e8f0" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Remove favorite */}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <FavoriteButton productId={fav.product_id} />
                  </div>

                  {/* Out of stock */}
                  {fav.stock === 0 && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(0,0,0,0.7)', color: '#fff',
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                      padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase',
                    }}>
                      Out of Stock
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    {fav.category && (
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {fav.category}
                      </p>
                    )}
                    <Link href={`/products/${fav.slug}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#111', margin: '0 0 10px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {fav.name}
                      </p>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontWeight: 900, fontSize: 16, color: '#dc2626' }}>{fmt(fav.price)}</span>
                      {fav.stock > 0 && fav.stock <= 10 && (
                        <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>
                          Only {fav.stock} left
                        </span>
                      )}
                    </div>
                    <AddToCartButton productId={fav.product_id} stock={fav.stock} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}