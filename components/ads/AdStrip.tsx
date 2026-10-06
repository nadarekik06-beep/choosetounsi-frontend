'use client'

/**
 * A small titled strip of ads for one placement:
 *   - product page: "Sponsored — similar items" (product_similar, grid of the shared ProductCard)
 *   - cart drawer:  "Sponsored — you might also like" (cart_cross_sell, compact rows)
 * Renders nothing when the ad server has nothing relevant.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { fetchAds, type AdCard, type AdPlacement, type AdQuery } from '@/lib/adsApi'
import SponsoredCard from './SponsoredCard'
import ProductCard from '@/app/components/product/ProductCard'

export default function AdStrip({ placement, query, title, layout = 'grid', onNavigate }: {
  placement: Extract<AdPlacement, 'product_similar' | 'cart_cross_sell'>
  query: AdQuery
  title: 'similarTitle' | 'cartTitle'
  layout?: 'grid' | 'row'
  onNavigate?: () => void
}) {
  const t = useTranslations('ads')
  const [ads, setAds] = useState<AdCard[]>([])
  const key = JSON.stringify(query)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchAds(placement, query, ctrl.signal).then(setAds)
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, key])

  if (!ads.length) return null

  return (
    <section aria-label={t(title)} style={{ margin: layout === 'row' ? '12px 0 4px' : '28px 0 8px' }}>
      <h2 style={{ fontSize: layout === 'row' ? 12 : 16, fontWeight: 800, color: '#374151', margin: '0 0 10px' }}>
        {t(title)}
      </h2>
      <div style={layout === 'row'
        ? { display: 'flex', flexDirection: 'column', gap: 8 }
        : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 45%), 1fr))', gap: 12 }}>
        {ads.map((ad, i) => layout === 'row'
          ? <SponsoredCard key={ad.sponsor_data.id} ad={ad} index={i} layout="row" onNavigate={onNavigate} />
          // Grid: the shared storefront card (slider, swatches); it reports the ad's impression / click
          : <ProductCard key={ad.sponsor_data.id} product={ad} index={i} section={placement} />)}
      </div>
    </section>
  )
}
