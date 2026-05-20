'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import PriceDisplay from '@/app/components/promotions/PriceDisplay'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface FlashProduct {
  id: number
  name: string
  slug: string
  price: number
  primary_image_url: string | null
  seller: { name: string } | null
  original_price: number
  effective_price: number
  discount_amount: number
  promotion: Record<string, unknown> | null
    variant_images?: string[]   // ← ADD

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

function MiniCountdown({ endsAt }: { endsAt: string }) {
  const { h, m, s, expired } = useCountdown(endsAt)
  if (expired) return null
  return (
    <span className="fds-timer">
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

function FlashDealCard({ product, promo }: { product: FlashProduct; promo: FlashPromotion }) {
  const [imgErr, setImgErr] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)          // ← NEW
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null) // ← NEW

  const allImages = useMemo(() => {                    // ← NEW
    const imgs: string[] = []
    if (product.primary_image_url) imgs.push(product.primary_image_url)
    ;(product.variant_images ?? []).forEach(url => {
      if (url && !imgs.includes(url)) imgs.push(url)
    })
    return imgs
  }, [product.primary_image_url, product.variant_images])

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current)
  }, [])

  return (
    <Link
      href={`/products/${product.slug}`}
      className="fds-card"
      onMouseEnter={() => {                            // ← ADD
        if (allImages.length > 1) {
          tickRef.current = setInterval(() => {
            setImgIndex(i => (i + 1) % allImages.length)
          }, 1400)
        }
      }}
      onMouseLeave={() => {                            // ← ADD
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
        setImgIndex(0)
      }}
    >
      <div className="fds-img-wrap">
        {allImages.length > 0 && !imgErr   // ← CHANGED from product.primary_image_url &&
          ? <img
              src={allImages[imgIndex]}    // ← CHANGED from product.primary_image_url
              alt={product.name}
              className="fds-img"
              onError={() => setImgErr(true)}
            />
          : <div className="fds-img-placeholder">⚡</div>
        }
        {/* rest unchanged */}
        {product.original_price > product.effective_price && (
          <span className="fds-discount">
            -{Math.round(((product.original_price - product.effective_price) / product.original_price) * 100)}%
          </span>
        )}
        <div className="fds-flash-badge">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          FLASH
        </div>
        <MiniCountdown endsAt={promo.ends_at} />
      </div>
      <div className="fds-info">
        <p className="fds-name">{product.name}</p>
        <PriceDisplay price={product.original_price} effectivePrice={product.effective_price} promotion={product.promotion as any} size="sm" />
        {promo.flash_stock_remaining !== null && (
          <div className="fds-stock-bar">
            <div className="fds-stock-fill" style={{
              width: promo.flash_stock
                ? `${Math.min(100, ((promo.flash_stock - (promo.flash_stock_remaining ?? promo.flash_stock)) / promo.flash_stock) * 100)}%`
                : '0%'
            }} />
          </div>
        )}
      </div>
    </Link>
  )
}
export default function FlashDealsSection() {
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
        .fds-card    { flex:0 0 auto; width:220px; text-decoration:none; color:inherit; display:block; }
        @media(max-width:640px){ .fds-card { width:160px; } }
        .fds-img-wrap{ position:relative; width:100%; aspect-ratio:1/1; background:#f7f7f7; border-radius:12px; overflow:hidden; border:1.5px solid #efefef; transition:transform .22s ease, box-shadow .22s ease; }
        .fds-card:hover .fds-img-wrap { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.10); }
        .fds-img     { width:100%; height:100%; object-fit:cover; display:block; transition:transform .35s ease; }
        .fds-card:hover .fds-img { transform:scale(1.05); }
        .fds-img-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.8rem; }
        .fds-discount{ position:absolute; top:6px; left:6px; background:#db142e; color:#fff; font-size:8px; font-weight:800; padding:2px 5px; border-radius:999px; letter-spacing:.04em; }
        .fds-flash-badge { position:absolute; top:6px; right:6px; display:flex; align-items:center; gap:2px; background:rgba(0,0,0,.6); color:#fbbf24; font-family:'Barlow',sans-serif; font-size:7px; font-weight:900; padding:2px 6px; border-radius:999px; backdrop-filter:blur(4px); letter-spacing:.06em; }
        .fds-timer   { position:absolute; bottom:6px; left:6px; right:6px; background:rgba(0,0,0,.65); color:rgba(255,255,255,.9); font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:800; letter-spacing:.03em; padding:2px 6px; border-radius:999px; text-align:center; backdrop-filter:blur(4px); }
        .fds-info    { padding:7px 2px 0; }
        .fds-name    { font-family:'Barlow',sans-serif; font-size:11.5px; font-weight:700; color:#111; margin:0 0 4px; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
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
                Flash Sales
              </h2>
              {!loading && soonestPromo && <FlashCountdown endsAt={soonestPromo.ends_at} />}
            </div>
            <Link href="/deals" className="fds-view-all">See All Deals →</Link>
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
              : allItems.map(({ product, promo }) => (
                  <FlashDealCard key={`${promo.id}-${product.id}`} product={product} promo={promo} />
                ))
            }
          </div>
        </div>
      </section>
    </>
  )
}

function FlashCountdown({ endsAt }: { endsAt: string }) {
  const { h, m, s, expired } = useCountdown(endsAt)
  if (expired) return null
  return (
    <div className="fds-cd">
      <span className="fds-cd-dot" />
      <span className="fds-cd-label">Ends in</span>
      <span className="fds-cd-text">
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  )
}