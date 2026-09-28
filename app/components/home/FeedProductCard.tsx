'use client'

/**
 * Product card for the personalized homepage rows.
 * Same look as the previous RecommendedSection card, plus:
 *   - paid placements carry a clear "Sponsored" label (organic cards never do)
 *   - sponsored impressions are recorded once the card is actually visible
 *   - clicks are tracked with the section they came from
 *   - variant "ranked" (Trending): rank numeral on the image, flame on the top 3
 *   - variant "bestseller" (Best sellers): trophy chip on the top 3
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import FlashCountdownBadge from '@/app/components/promotions/FlashCountdownBadge'
import { useFormat } from '@/lib/i18n/useFormat'
import type { PriceOptions } from '@/lib/i18n/format'
import type { FeedProduct } from '@/lib/homeFeedApi'
import { sponsorshipApi } from '@/lib/sponsorshipApi'
import { trackClick } from '@/lib/tracking'

type PriceFn = (v: number | string, o?: PriceOptions) => string

function displayPrice(p: FeedProduct, price: PriceFn) {
  const base      = Number(p.original_price ?? p.price)   // 30-day lowest when discounted
  const effective = p.effective_price != null ? Number(p.effective_price) : base
  if (!(effective < base - 0.001) || !p.promotion) {
    return { display: base, original: null as number | null, badge: null as string | null, isFlash: false }
  }
  let badge: string | null = null
  if (p.promotion.discount_type === 'percentage') {
    const pct = Math.round(((base - effective) / base) * 100)
    if (pct > 0) badge = `-${pct}%`
  } else if (base - effective > 0) {
    badge = `-${price(base - effective, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return { display: effective, original: base, badge, isFlash: p.promotion.is_flash_sale }
}

export type CardVariant = 'ranked' | 'bestseller'

const pill: React.CSSProperties = {
  fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 999,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff',
}

export default function FeedProductCard({ product, index, section, variant }: {
  product: FeedProduct
  index: number
  section: string
  variant?: CardVariant
}) {
  const t    = useTranslations('productCard')
  const tf   = useTranslations('homeFeed')
  const fmt  = useFormat()
  const ref  = useRef<HTMLAnchorElement>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const [hovered,  setHovered]  = useState(false)
  const [imgErr,   setImgErr]   = useState(false)
  const [imgIndex, setImgIndex] = useState(0)

  const isPaid = product.placement === 'sponsored' && product.is_sponsored
  const sponsorshipId = isPaid ? product.sponsor_data?.id : undefined

  const images = useMemo(() => {
    const out: string[] = []
    if (product.primary_image_url) out.push(product.primary_image_url)
    for (const url of product.variant_images ?? []) if (url && !out.includes(url)) out.push(url)
    return out
  }, [product.primary_image_url, product.variant_images])

  // Count a sponsored impression only once at least half the card has been on screen.
  useEffect(() => {
    const el = ref.current
    if (!sponsorshipId || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        sponsorshipApi.recordImpression(sponsorshipId)
        io.disconnect()
      }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [sponsorshipId])

  useEffect(() => () => { if (tick.current) clearInterval(tick.current) }, [])

  const onEnter = () => {
    setHovered(true)
    if (images.length > 1) tick.current = setInterval(() => setImgIndex(i => (i + 1) % images.length), 1400)
  }
  const onLeave = () => {
    setHovered(false)
    if (tick.current) { clearInterval(tick.current); tick.current = null }
    setImgIndex(0)
  }
  const onClick = () => {
    trackClick(product.id, section)
    if (sponsorshipId) sponsorshipApi.recordClick(sponsorshipId)
  }

  const image = images[imgIndex] ?? null
  const { display, original, badge, isFlash } = displayPrice(product, fmt.price)
  const oos = product.stock <= 0

  return (
    <Link
      ref={ref}
      href={`/products/${product.slug}`}
      className="feed-card"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit', background: '#fff',
        border: `1.5px solid ${hovered ? '#e0e0e0' : '#eee'}`, borderRadius: 12, overflow: 'hidden',
        flexShrink: 0, scrollSnapAlign: 'start',
        transform: hovered ? 'translateY(-5px)' : 'none',
        boxShadow: hovered ? '0 10px 28px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
        transition: 'transform 0.25s cubic-bezier(.34,1.4,.64,1), box-shadow 0.25s ease, border-color 0.2s',
        animation: 'feedFadeUp 0.4s ease both',
        animationDelay: `${Math.min(index * 0.045, 0.5)}s`,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f5f5f5', overflow: 'hidden' }}>
        {image && !imgErr ? (
          <img
            src={image}
            alt={product.name}
            loading={index < 4 ? 'eager' : 'lazy'}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" fill="none" stroke="#ddd" strokeWidth="1.2" viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        <div style={{ position: 'absolute', top: 7, insetInlineStart: 7, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, zIndex: 3 }}>
          {isPaid && (
            <span style={{ ...pill, background: 'rgba(17,17,17,0.78)', color: '#fbbf24' }}>{tf('sponsoredBadge')}</span>
          )}
          {variant === 'ranked' && index < 3 && !isPaid && (
            <span style={{ ...pill, background: 'linear-gradient(135deg,#f97316,#db142e)' }}>🔥 {tf('hot')}</span>
          )}
          {variant === 'bestseller' && index < 3 && !isPaid && (
            <span style={{ ...pill, background: 'linear-gradient(135deg,#ca8a04,#a16207)' }}>🏆 {tf('bestSellerRank', { rank: index + 1 })}</span>
          )}
          {badge && (
            <span style={{ ...pill, padding: '2px 6px', background: isFlash ? 'linear-gradient(135deg,#dc2626,#f97316)' : '#db142e' }}>
              {badge}
            </span>
          )}
        </div>

        <FlashCountdownBadge promotion={product.promotion} />

        {variant === 'ranked' && (
          <span aria-hidden className="feed-rank" style={{
            position: 'absolute', bottom: 2, insetInlineStart: 8, zIndex: 3, pointerEvents: 'none',
            fontFamily: "'Outfit', sans-serif", fontSize: 46, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em',
            color: '#fff', WebkitTextStroke: index < 3 ? '1.5px #db142e' : '1.5px #111',
            textShadow: '0 4px 14px rgba(0,0,0,0.35)',
          }}>{index + 1}</span>
        )}

        {oos && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4,
          }}>
            <span style={{ ...pill, background: '#111', padding: '4px 10px', letterSpacing: '0.1em' }}>{t('soldOut')}</span>
          </div>
        )}

        {images.length > 1 && hovered && (
          <div style={{
            position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4, zIndex: 5, pointerEvents: 'none',
          }}>
            {images.slice(0, 5).map((_, i) => (
              <span key={i} style={{
                display: 'block', width: i === imgIndex ? 14 : 5, height: 5, borderRadius: 999,
                background: i === imgIndex ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'all 0.22s ease',
              }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '9px 11px 11px' }}>
        {(product.seller?.business_name || product.seller?.name) && (
          <p style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.seller?.business_name || product.seller?.name}
          </p>
        )}
        <p style={{
          fontSize: 12.5, fontWeight: 600, color: hovered ? '#db142e' : '#1f2937', margin: '0 0 5px', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.15s',
        }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 900, color: '#db142e' }}>{fmt.price(display)}</span>
          {original !== null && (
            <span style={{ fontSize: 10, color: '#bbb', textDecoration: 'line-through' }}>{fmt.price(original)}</span>
          )}
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <p style={{ fontSize: 9.5, color: '#f97316', fontWeight: 700, margin: '4px 0 0' }}>
            {t('onlyLeft', { count: product.stock })}
          </p>
        )}
      </div>
    </Link>
  )
}

export function FeedCardSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)',
    backgroundSize: '600px 100%', animation: 'feedShimmer 1.3s infinite linear', borderRadius: 4,
  }
  return (
    <div className="feed-card" aria-hidden style={{ flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: '#fff', border: '1px solid #eee' }}>
      <div style={{ ...shimmer, aspectRatio: '3/4', borderRadius: 0 }} />
      <div style={{ padding: '9px 11px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...shimmer, height: 8, width: '45%' }} />
        <div style={{ ...shimmer, height: 12, width: '80%' }} />
        <div style={{ ...shimmer, height: 14, width: '40%' }} />
      </div>
    </div>
  )
}
