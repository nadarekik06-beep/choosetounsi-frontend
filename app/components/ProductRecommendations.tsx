'use client'

/**
 * components/ProductRecommendations.tsx
 *
 * CHANGES vs previous version:
 *  ✅ RecProduct type: added effective_price, discount_amount, promotion fields
 *  ✅ MiniCard: shows discounted price + crossed-out original + discount badge
 *  ✅ Everything else unchanged
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Store, Star, Zap, Heart } from 'lucide-react'
import { getToken } from '@/lib/auth'
import type { PricedProduct } from '@/app/components/promotions/ProductPrice'
import ProductCard, { ProductCardSkeleton } from '@/app/components/product/ProductCard'
import type { CardSwatch } from '@/app/components/product/cardData'
import { useTranslations } from 'next-intl'

const API_URL      = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'


// ─── Types ────────────────────────────────────────────────────────────────────

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

interface RecProduct extends PricedProduct {
  id: number
  name: string
  slug: string
  short_description: string | null
  price: number                      // original base price
  effective_price?: number | null    // ← discounted price
  original_price?: number | null     // crossed-out price (30-day lowest) when discounted
  discount_amount?: number | null
  promotion?: ActivePromotion | null
  stock: number
  primary_image_url: string | null
  featured: boolean
  seller: { id: number; name: string; business_name?: string | null; avatar?: string | null } | null
  _score?: number | null
  card_images?: string[]
  card_swatches?: CardSwatch[]
  variant_images?: string[]
  variants?: { id: number; stock: number }[]
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

// ─── Mini product card — the shared storefront card ───────────────────────────

function MiniCard({ product, index, section }: { product: RecProduct; index: number; section: string }) {
  const t = useTranslations('recommendations')
  return (
    <ProductCard product={product} index={index} section={section}
      badge={product.featured ? <span className="pc-badge pc-badge--new">{t('top')}</span> : undefined} />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>{title}</h3>
        </div>
        {extra}
      </div>

      {loading ? (
        <div className="rec-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="rec-grid">
          {products.map((p, i) => <MiniCard key={p.id} product={p} index={i} section={`product_${endpoint}`} />)}
        </div>
      )}
    </div>
  )
}

// ─── From-seller section ──────────────────────────────────────────────────────

function FromSellerSection({ slug }: { slug: string }) {
  const t = useTranslations('recommendations')
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
  const planLabel      = seller?.plan === 'black' ? 'Black Pepper' : seller?.plan === 'red' ? 'Red Pepper' : 'Green Pepper'  // plan names are brand names

  return (
    <div style={{ marginBottom: 48 }}>
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
                {t('productsCount', { count: seller.total_products })}
                {seller.wilaya && ` · ${seller.wilaya}`}
              </p>
            </div>
          </div>
          <Link href={`/sellers/${seller.id}`} style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            {t('viewShop')} <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {!seller && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={16} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('fromSeller')}</h3>
        </div>
      )}

      {loading ? (
        <div className="rec-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="rec-grid">
          {products.map((p, i) => <MiniCard key={p.id} product={p} index={i} section="product_from_seller" />)}
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
  const t = useTranslations('recommendations')
  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .rec-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        @media(max-width:1024px) { .rec-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media(max-width:640px)  { .rec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ height: 1, background: '#f1f5f9', margin: '48px 0' }} />

        <RecommendationSection
          title={t('similar')}
          icon={<Star size={16} />}
          endpoint="similar"
          slug={slug}
          emptyMsg={t('similarEmpty')}
        />

        <RecommendationSection
          title={t('completeLook')}
          icon={<Zap size={16} />}
          endpoint="complementary"
          slug={slug}
          emptyMsg={t('completeLookEmpty')}
        />

        <FromSellerSection slug={slug} />

        <RecommendationSection
          title={t('alsoLike')}
          icon={<Heart size={16} />}
          endpoint="recommended"
          slug={slug}
          emptyMsg={t('alsoLikeEmpty')}
        />
      </div>
    </>
  )
}