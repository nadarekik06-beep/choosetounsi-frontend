'use client'

/**
 * app/favorites/page.tsx
 *
 * Client wishlist / saved items.
 * image_url is now variant-aware — fixed in FavoriteController.php.
 * Shows the color the customer favorited, not always the default product photo.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart, ShoppingCart, ChevronRight, Trash2, Package, Loader2,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import type { FavoriteItem } from '@/lib/shopApi'

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

// ─── Favorite Card ────────────────────────────────────────────────────────────

function FavoriteCard({ item, onRemove }: { item: FavoriteItem; onRemove: () => void }) {
  const { addToCart, cartLoading } = useCart()
  const [adding, setAdding] = useState(false)

  // image_url is already resolved by backend (variant color → product primary fallback)
  const imgSrc = resolveImg(item.image_url)

  const colorOptions = Object.values(item.variant_options ?? {}).filter(o => o.color_hex)
  const otherOptions = Object.values(item.variant_options ?? {}).filter(o => !o.color_hex)

  const handleAddToCart = async () => {
    setAdding(true)
    try {
      await addToCart(item.product_id, 1, item.variant_id ?? null)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Image */}
      <Link href={`/products/${item.slug}`} style={{ display: 'block', position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: '#f8fafc' }}>
        {imgSrc
          ? <img src={imgSrc} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={28} color="#e2e8f0" />
            </div>
        }
        {item.stock <= 0 && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>
            Out of stock
          </div>
        )}
      </Link>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link href={`/products/${item.slug}`}
          style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textDecoration: 'none', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.name}
        </Link>

        {/* Variant indicators */}
        {item.variant_label && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {colorOptions.map((opt, i) => (
              <span key={i} title={opt.value} style={{
                display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                background: opt.color_hex!, border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0,
              }} />
            ))}
            {otherOptions.map((opt, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 700, color: '#6366f1',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                padding: '1px 7px', borderRadius: 4,
              }}>
                {opt.value}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <p style={{ fontSize: 16, fontWeight: 900, color: '#dc2626', margin: 0 }}>
          {fmt(item.price)}
        </p>

        {/* Low stock */}
        {item.stock > 0 && item.stock <= 10 && (
          <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, margin: 0 }}>
            Only {item.stock} left
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={handleAddToCart}
            disabled={item.stock <= 0 || cartLoading || adding}
            style={{
              flex: 1, height: 38, borderRadius: 10, border: 'none',
              cursor: item.stock <= 0 ? 'not-allowed' : 'pointer',
              background: item.stock <= 0 ? '#f1f5f9' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: item.stock <= 0 ? '#94a3b8' : '#fff',
              fontSize: 12, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: item.stock <= 0 ? 'none' : '0 4px 14px rgba(220,38,38,0.25)',
              opacity: (cartLoading || adding) ? 0.6 : 1,
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {adding
              ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <ShoppingCart size={13} />
            }
            {item.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>

          <button
            onClick={onRemove}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: '1px solid #fee2e2', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444', transition: 'background 0.15s',
            }}
            title="Remove from favorites"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const router = useRouter()
  const { favorites, toggleFavorite, favLoading } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/favorites')
    }
  }, [router])

  const items = favorites as FavoriteItem[]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>My Favorites</span>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', animation: 'fadeUp 0.4s ease both' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={18} color="#dc2626" fill="rgba(220,38,38,0.2)" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>My Favorites</h1>
              {mounted && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                  {items.length} saved item{items.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Loading */}
          {favLoading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Loading favorites…</p>
            </div>
          )}

          {/* Empty */}
          {mounted && !favLoading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Heart size={48} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>No favorites yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
                Browse products and tap ♡ to save them here.
              </p>
              <Link href="/shop"
                style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                Browse Products
              </Link>
            </div>
          )}

          {/* Grid */}
          {items.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {items.map(item => (
                <FavoriteCard
                  key={`${item.product_id}-${item.variant_id ?? 'base'}`}
                  item={item}
                  onRemove={() => toggleFavorite(item.product_id, item.variant_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}