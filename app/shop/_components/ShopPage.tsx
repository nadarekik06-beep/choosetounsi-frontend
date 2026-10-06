'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Navbar from '@/app/components/layout/Navbar'
import { fetchHomeFeed, type HomeFeed } from '@/lib/homeFeedApi'
import { fetchShopOverview, type ShopOverview } from '@/lib/shopPageApi'
import { QuickViewProvider } from './QuickView'
import ShopHero from './ShopHero'
import DealsSection from './DealsSection'
import { ForYouSection, ListsSection } from './FeedSections'
import LocalSpotlight from './LocalSpotlight'
import Catalog from './Catalog'
import { TrustStrip, VendorCta } from './Closing'
import { useHeaderHeight } from './primitives'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import './shop.css'

export default function ShopPage({ initialOverview }: { initialOverview: ShopOverview | null }) {
  const [overview, setOverview] = useState<ShopOverview | null>(initialOverview)
  const [feed, setFeed] = useState<HomeFeed | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(feedLoading)
  const headerH = useHeaderHeight()

  // The server render normally brings the overview; fetch it here only if that failed
  useEffect(() => {
    if (initialOverview) return
    const ctrl = new AbortController()
    fetchShopOverview(ctrl.signal).then(setOverview).catch(() => {})
    return () => ctrl.abort()
  }, [initialOverview])

  // Personal rows: same engine (and viewer identity) as the homepage
  useEffect(() => {
    const ctrl = new AbortController()
    fetchHomeFeed(ctrl.signal)
      .then(setFeed)
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setFeedLoading(false) })
    return () => ctrl.abort()
  }, [])

  // Ads already shown in the feed rows aren't repeated in the catalogue
  const feedAds = useMemo(
    () => feed?.sections.flatMap(s => s.products.filter(p => p.placement === 'sponsored').map(p => p.id)) ?? [],
    [feed],
  )

  return (
    <>
      <Navbar />
      <main className="sp" style={{ '--nav-h': `${headerH}px` } as CSSProperties}>
        <QuickViewProvider>
          <ShopHero overview={overview} />
          <DealsSection deals={overview?.deals ?? []} />
          <ForYouSection feed={feed} loading={feedLoading} />
          <ListsSection feed={feed} loading={feedLoading} />
          <LocalSpotlight categories={overview?.categories ?? null} />
          <Catalog categories={overview?.categories ?? null} excludeAds={feedAds} />
          <VendorCta />
          <TrustStrip stats={overview?.stats ?? null} />
        </QuickViewProvider>
      </main>
    </>
  )
}
