'use client'

/**
 * A paid placement. Looks like the product cards around it, with:
 *   - an explicit "Sponsored" label (EN/FR/AR) and a subtle gold ring
 *   - the ad line (ai_ad_copy) when there is one
 *   - promotion pricing (crossed-out reference price + discount badge)
 *   - impression after ≥ 50 % visible for 1 s, click reported with the ad token
 *
 * `layout="row"` is a compact horizontal card (cart drawer, popup-sized spaces).
 */

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { recordAdClick, type AdCard } from '@/lib/adsApi'
import ProductPrice, { ProductPromoBadges, ProductPromoOverlay } from '@/app/components/promotions/ProductPrice'
import { useAdImpression } from './useAdImpression'
import { useImpression } from '@/app/components/product/useImpression'
import { trackClick } from '@/lib/tracking'

export function SponsoredLabel({ dark = false }: { dark?: boolean }) {
  const t = useTranslations('ads')
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1,
      padding: '3px 7px', borderRadius: 999, whiteSpace: 'nowrap',
      background: dark ? 'rgba(17,17,17,0.78)' : 'rgba(245,158,11,0.14)',
      color: dark ? '#fbbf24' : '#92400e', border: dark ? 'none' : '1px solid rgba(245,158,11,0.35)',
    }}>
      {t('sponsored')}
    </span>
  )
}

export default function SponsoredCard({ ad, index = 0, layout = 'grid', onNavigate }: {
  ad: AdCard
  index?: number
  layout?: 'grid' | 'row'
  onNavigate?: () => void
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [imgErr, setImgErr] = useState(false)
  useAdImpression(ref, ad.ad_token)
  // Seller funnel (Visitor Insights): sponsored traffic
  const funnelSection = `sponsored_${ad.ad_placement ?? 'card'}`
  useImpression(ref, ad.id, funnelSection)

  const image = !imgErr ? ad.primary_image_url : null
  const copy  = ad.sponsor_data?.ai_ad_copy
  const shop  = ad.seller?.business_name || ad.seller?.name

  const onClick = () => {
    recordAdClick(ad.ad_token)
    trackClick(ad.id, funnelSection)
    onNavigate?.()
  }

  const img = (
    <div style={{
      position: 'relative', background: '#f5f5f5', overflow: 'hidden', flexShrink: 0,
      ...(layout === 'row' ? { width: 72, height: 72, borderRadius: 10 } : { aspectRatio: '3/4' }),
    }}>
      {image ? (
        <img src={image} alt={ad.name} loading={index < 2 ? 'eager' : 'lazy'} onError={() => setImgErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : null}
      {layout === 'grid' && (
        <div style={{ position: 'absolute', top: 7, insetInlineStart: 7, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <SponsoredLabel dark />
          <ProductPromoBadges product={ad} inline />
        </div>
      )}
      {layout === 'grid' && <ProductPromoOverlay product={ad} badges={false} />}
    </div>
  )

  const body = (
    <div style={{ padding: layout === 'row' ? 0 : '9px 11px 11px', minWidth: 0, flex: 1 }}>
      {layout === 'row' && <div style={{ marginBottom: 4 }}><SponsoredLabel /></div>}
      {shop && (
        <p style={{ fontSize: 9, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shop}
        </p>
      )}
      <p style={{
        fontSize: 12.5, fontWeight: 600, color: '#1f2937', margin: '0 0 4px', lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {ad.name}
      </p>
      {copy && (
        <p style={{
          fontSize: 10.5, color: '#6b7280', margin: '0 0 5px', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {copy}
        </p>
      )}
      <ProductPrice product={ad} />
    </div>
  )

  return (
    <Link
      ref={ref}
      href={`/products/${ad.slug}`}
      onClick={onClick}
      data-ad-placement={ad.ad_placement}
      style={{
        display: layout === 'row' ? 'flex' : 'block', gap: layout === 'row' ? 12 : 0, alignItems: 'center',
        padding: layout === 'row' ? 10 : 0, textDecoration: 'none', color: 'inherit', background: '#fff',
        border: `1.5px solid rgba(245,158,11,0.45)`, borderRadius: 12, overflow: 'hidden',
        boxShadow: `0 0 0 3px rgba(245,158,11,0.07), 0 2px 6px rgba(0,0,0,0.04)`,
        minWidth: 0,
      }}
    >
      {img}
      {body}
    </Link>
  )
}
