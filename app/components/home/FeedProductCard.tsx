'use client'

/**
 * A homepage feed row item: the shared ProductCard in a fixed-width rail slot, plus
 * the row's own badges:
 *   - variant "ranked" (Trending): rank numeral on the image, flame on the top 3
 *   - variant "bestseller" (Best sellers): trophy chip on the top 3
 * Clicks are tracked with the section they came from; paid placements report their
 * impressions / clicks through the card.
 */

import { useTranslations } from 'next-intl'
import ProductCard, { ProductCardSkeleton } from '@/app/components/product/ProductCard'
import type { FeedProduct } from '@/lib/homeFeedApi'

export type CardVariant = 'ranked' | 'bestseller'

export default function FeedProductCard({ product, index, section, variant }: {
  product: FeedProduct
  index: number
  section: string
  variant?: CardVariant
}) {
  const tf = useTranslations('homeFeed')
  const top3 = index < 3

  const badge = variant === 'ranked' && top3
    ? <span className="pc-badge pc-badge--hot">🔥 {tf('hot')}</span>
    : variant === 'bestseller' && top3
      ? <span className="pc-badge pc-badge--gold">🏆 {tf('bestSellerRank', { rank: index + 1 })}</span>
      : undefined

  return (
    <div className="feed-card" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
      <ProductCard product={product} index={index} section={section} eager={index < 4} badge={badge}
        overlay={variant === 'ranked'
          ? <span aria-hidden="true" className={`pc-rank${top3 ? ' is-top' : ''}`}>{index + 1}</span>
          : undefined} />
    </div>
  )
}

export function FeedCardSkeleton() {
  return (
    <div className="feed-card" style={{ flexShrink: 0 }}>
      <ProductCardSkeleton />
    </div>
  )
}
