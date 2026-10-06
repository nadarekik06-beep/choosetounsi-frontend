'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { PricedProduct } from '@/app/components/promotions/ProductPrice'
import ProductCard from '@/app/components/product/ProductCard'
import type { CardSwatch } from '@/app/components/product/cardData'
import { useTranslations } from 'next-intl'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface FlashProduct extends PricedProduct {
  id: number
  name: string
  slug: string
  price: number
  primary_image_url: string | null
  stock: number
  seller: { id?: number; name: string; business_name?: string | null; plan?: string | null; avatar?: string | null } | null
  original_price: number
  effective_price: number
  discount_amount: number
  variant_images?: string[]
  card_images?: string[]
  card_swatches?: CardSwatch[]
  variants?: { id: number; stock: number }[]

}

interface FlashPromotion {
  id: number
  name: string
  discount_label: string
  ends_at: string
  flash_stock: number | null
  flash_stock_remaining: number | null
  products: FlashProduct[]
}

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now()
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true }
    const sec = Math.floor(diff / 1000)
    return { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60, expired: false }
  }, [endsAt])
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [calc])
  return time
}

/** The shared storefront card (square "deal" layout) with the flash stock meter under the price. */
function FlashDealCard({ product, promo, index }: { product: FlashProduct; promo: FlashPromotion; index: number }) {
  const sold = promo.flash_stock && promo.flash_stock_remaining !== null
    ? Math.min(100, ((promo.flash_stock - promo.flash_stock_remaining) / promo.flash_stock) * 100)
    : null
  return (
    <div className="fds-card">
      <ProductCard product={product} index={index} section="home_flash" layout="deal"
        footer={sold !== null ? <div className="fds-stock-bar"><div className="fds-stock-fill" style={{ width: `${sold}%` }} /></div> : undefined} />
    </div>
  )
}

export default function FlashDealsSection() {
  const t = useTranslations('home')
  const [promotions, setPromotions] = useState<FlashPromotion[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/flash-sales`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((json: { success: boolean; data: FlashPromotion[] }) => {
        const data = json.data ?? []
        const live = data.filter(p => new Date(p.ends_at) > new Date() && p.products.length > 0)
        setPromotions(live)
      })
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && promotions.length === 0) return null

  const allItems: { product: FlashProduct; promo: FlashPromotion }[] = []
  promotions.forEach(promo => {
    promo.products.forEach(product => allItems.push({ product, promo }))
  })

  const soonestPromo = promotions[0]

  return (
    <>
      <style>{`
        @keyframes fdsShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        @keyframes fdsPulse{0%,100%{opacity:1}50%{opacity:.5}}

        .fds-section { background:#fff; padding:0 0 32px; border-top:1px solid #f0f0f0; }
        .fds-inner   { max-width:1280px; margin:0 auto; padding:0 24px; }
        .fds-header  { display:flex; align-items:center; justify-content:space-between; padding:24px 0 14px; flex-wrap:wrap; gap:12px; }
        .fds-title-wrap { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .fds-title   { font-family:'Barlow',sans-serif; font-size:1.1rem; font-weight:800; color:#111; letter-spacing:-.02em; margin:0; display:flex; align-items:center; gap:8px; }
        .fds-bolt    { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:7px; background:#db142e; color:#fff; flex-shrink:0; }
        .fds-cd      { display:flex; align-items:center; gap:4px; background:#fef2f2; border:1px solid #fecaca; padding:4px 10px; border-radius:999px; }
        .fds-cd-dot  { width:5px; height:5px; border-radius:50%; background:#db142e; animation:fdsPulse 1.2s ease-in-out infinite; }
        .fds-cd-text { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:900; color:#db142e; letter-spacing:.02em; }
        .fds-cd-label{ font-family:'Barlow',sans-serif; font-size:9px; font-weight:700; color:#ef4444; letter-spacing:.06em; text-transform:uppercase; }
        .fds-view-all{ font-family:'Barlow',sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#888; text-decoration:none; transition:color .18s; }
        .fds-view-all:hover { color:#db142e; }
        .fds-row     { display:flex; gap:12px; overflow-x:auto; padding:4px 2px 10px; scrollbar-width:none; -ms-overflow-style:none; }
        .fds-row::-webkit-scrollbar { display:none; }
        .fds-card    { flex:0 0 auto; width:220px; }
        @media(max-width:640px){ .fds-card { width:160px; } }
        .fds-stock-bar  { height:3px; background:#f3f4f6; border-radius:2px; margin-top:6px; overflow:hidden; }
        .fds-stock-fill { height:100%; background:linear-gradient(90deg,#10b981,#fbbf24 55%,#db142e); border-radius:2px; transition:width .5s; }
        .fds-skel    { flex:0 0 auto; width:220px; }
        .fds-skel-img{ aspect-ratio:1/1; border-radius:12px; background:linear-gradient(90deg,#efefef 25%,#f8f8f8 50%,#efefef 75%); background-size:600px 100%; animation:fdsShimmer 1.3s infinite linear; }
        .fds-skel-line{ height:10px; border-radius:4px; margin-top:8px; background:linear-gradient(90deg,#efefef 25%,#f8f8f8 50%,#efefef 75%); background-size:600px 100%; animation:fdsShimmer 1.3s infinite linear; }
        @media(max-width:640px){ .fds-skel { width:160px; } }
      `}</style>

      <section className="fds-section">
        <div className="fds-inner">
          <div className="fds-header">
            <div className="fds-title-wrap">
              <h2 className="fds-title">
                <span className="fds-bolt">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </span>
                {t('flashSales')}
              </h2>
              {!loading && soonestPromo && <FlashCountdown endsAt={soonestPromo.ends_at} />}
            </div>
            <Link href="/deals" className="fds-view-all">{t('seeAllDeals')}</Link>
          </div>

          <div className="fds-row">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="fds-skel">
                    <div className="fds-skel-img" style={{ animationDelay:`${i*.06}s` }} />
                    <div className="fds-skel-line" style={{ width:'90%' }} />
                    <div className="fds-skel-line" style={{ width:'55%', marginTop:4 }} />
                  </div>
                ))
              : allItems.map(({ product, promo }, i) => (
                  <FlashDealCard key={`${promo.id}-${product.id}`} product={product} promo={promo} index={i} />
                ))
            }
          </div>
        </div>
      </section>
    </>
  )
}

function FlashCountdown({ endsAt }: { endsAt: string }) {
  const t = useTranslations('home')
  const { h, m, s, expired } = useCountdown(endsAt)
  if (expired) return null
  return (
    <div className="fds-cd">
      <span className="fds-cd-dot" />
      <span className="fds-cd-label">{t('endsIn')}</span>
      <span className="fds-cd-text" dir="ltr">
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  )
}