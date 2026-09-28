'use client'

/**
 * Personalized homepage rows, rendered from GET /api/home/feed.
 * The backend decides which sections exist, their order, and guarantees a
 * product never appears in two rows — this component just renders them.
 */

import { useEffect, useState } from 'react'
import { fetchHomeFeed, type FeedSection as FeedSectionData } from '@/lib/homeFeedApi'
import FeedSection, { FeedSectionSkeleton } from './FeedSection'

const FEED_CSS = `
  @keyframes feedFadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
  @keyframes feedShimmer { 0% { background-position:-600px 0 } 100% { background-position:600px 0 } }
  .feed-section { padding: 26px 0 8px; background: #fff; }
  .feed-wrap    { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
  .feed-track   {
    display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 10px;
    scroll-snap-type: x mandatory; scroll-padding-inline: 2px;
    scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior-x: contain;
  }
  .feed-track::-webkit-scrollbar { display: none; }
  .feed-card    { width: 170px; }
  @media (max-width: 640px) {
    .feed-section { padding: 20px 0 4px; }
    .feed-wrap    { padding: 0 16px; }
    .feed-card    { width: 42vw; max-width: 165px; }
    .feed-arrows  { display: none !important; }
    .feed-section h2 { font-size: 17px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .feed-card { animation: none !important; transition: none !important; }
  }
`

export default function HomeFeed() {
  const [sections, setSections] = useState<FeedSectionData[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchHomeFeed(ctrl.signal)
      .then(feed => setSections(feed.sections ?? []))
      .catch(err => {
        if ((err as Error)?.name !== 'AbortError') setFailed(true)
      })
    return () => ctrl.abort()
  }, [])

  // The rest of the homepage still renders; a failed feed just leaves no rows.
  if (failed || (sections && sections.length === 0)) return <style>{FEED_CSS}</style>

  return (
    <div className="home-feed">
      <style>{FEED_CSS}</style>
      {sections === null
        ? Array.from({ length: 3 }).map((_, i) => <FeedSectionSkeleton key={i} />)
        : sections.map(s => <FeedSection key={s.key} section={s} />)}
    </div>
  )
}
