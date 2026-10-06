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
import { Heart, ChevronRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import type { FavoriteItem } from '@/lib/shopApi'
import { useTranslations } from 'next-intl'
import ProductCard from '@/app/components/product/ProductCard'
import type { CardSwatch } from '@/app/components/product/cardData'
import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'

// ─── Favorite Card ────────────────────────────────────────────────────────────
// The shared product card on the favourited variant: its color image first, the cart
// adds that exact variant, and the heart removes this favourite.

type FavoriteCardItem = FavoriteItem & {
  card_images?: string[]
  card_swatches?: CardSwatch[]
  variants?: { id: number; stock: number }[]
}

function FavoriteCard({ item, index, onRemove }: { item: FavoriteCardItem; index: number; onRemove: () => void }) {
  const options = Object.values(item.variant_options ?? {})
  const footer = item.variant_label ? (
    <div className="fav-variant">
      {options.filter(o => o.color_hex).map((o, i) => (
        <span key={`c${i}`} className="fav-variant__dot" title={o.value} style={{ background: o.color_hex! }} />
      ))}
      {options.filter(o => !o.color_hex).map((o, i) => <span key={`o${i}`} className="fav-variant__opt">{o.value}</span>)}
    </div>
  ) : undefined

  return (
    <ProductCard
      product={{ ...item, id: item.product_id ?? item.id }}
      index={index} section="favorites" eager={index < 4}
      variantId={item.variant_id} onFavorite={onRemove} footer={footer} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const t      = useTranslations('favorites')
  const tc     = useTranslations('common')
  const router = useRouter()
  const { favorites, toggleFavorite, favLoading } = useCart()
  // holds the navigation loader until the first load is done
  usePageLoading(favLoading && favorites.length === 0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/favorites')
    }
  }, [router])

  const items = (favorites as (FavoriteCardItem | null)[]).filter((f): f is FavoriteCardItem => f != null && f.product_id != null)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(200px,45%),1fr));gap:18px}
        @media(max-width:640px){.fav-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
        .fav-variant{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
        .fav-variant__dot{width:13px;height:13px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
        .fav-variant__opt{font-size:10px;font-weight:700;color:#4f46e5;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);padding:1px 7px;border-radius:4px}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{t('title')}</span>
          </nav>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', animation: 'fadeUp 0.4s ease both' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={18} color="#dc2626" fill="rgba(220,38,38,0.2)" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('title')}</h1>
              {mounted && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                  {t('count', { count: items.length })}
                </p>
              )}
            </div>
          </div>

          {/* Loading */}
          {favLoading && items.length === 0 && (
            <BrandLoader variant="section" label={t('loading')} minHeight={240} />
          )}

          {/* Empty */}
          {mounted && !favLoading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Heart size={48} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('emptyTitle')}</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
                {t('emptyBody')}
              </p>
              <Link href="/shop"
                style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                {t('browse')}
              </Link>
            </div>
          )}

          {/* Grid */}
          {items.length > 0 && (
            <div className="fav-grid">
              {items.map((item, i) => (
                <FavoriteCard
                  key={`${item.product_id}-${item.variant_id ?? 'base'}`}
                  item={item} index={i}
                  onRemove={() => { if (item.product_id != null) toggleFavorite(item.product_id, item.variant_id) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}