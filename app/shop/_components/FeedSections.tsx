'use client'

/**
 * Rows built from GET /api/home/feed (same recommendation engine as the homepage,
 * deduplicated server-side so no product repeats across rows).
 *   ForYouSection — "recommended" for a known visitor; for a new one, top-rated
 *                   picks with the sponsored row woven in (always labelled).
 *   ListsSection  — Trending / Best sellers / New arrivals as tabs.
 */

import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import type { HomeFeed, FeedSection } from '@/lib/homeFeedApi'
import type { ShopProduct } from '@/lib/shopPageApi'
import ProductCard from '@/app/components/product/ProductCard'
import { CardSkeleton, Rail, SectionHead } from './primitives'

// Slots where paid placements sit in a mixed row (homepage convention)
const SPONSORED_SLOTS = [1, 5]

const rowOf = (feed: HomeFeed | null, type: FeedSection['type']) =>
  (feed?.sections.find(s => s.type === type)?.products ?? []) as ShopProduct[]

function ProductRail({ products, section, label }: { products: ShopProduct[] | null; section: string; label: string }) {
  return (
    <Rail className="sp-rail--products" label={label}>
      {!products
        ? Array.from({ length: 6 }, (_, i) => <div key={i} role="listitem"><CardSkeleton /></div>)
        : products.map((p, i) => (
          <div key={`${p.placement ?? 'o'}-${p.id}`} role="listitem">
            <ProductCard product={p} index={i} section={section} />
          </div>
        ))}
    </Rail>
  )
}

export function ForYouSection({ feed, loading }: { feed: HomeFeed | null; loading: boolean }) {
  const t = useTranslations('shopPage.forYou')

  const { products, warm } = useMemo(() => {
    const recommended = rowOf(feed, 'recommended')
    const warm = recommended.length > 0
    // New visitor: organic top-rated (or trending) picks
    const organic = warm ? recommended : (rowOf(feed, 'top_rated').length ? rowOf(feed, 'top_rated') : rowOf(feed, 'trending'))
    const mixed = organic.slice(0, 14)
    // Paid placements in their labelled slots, unless the engine already placed some
    if (!mixed.some(p => p.placement === 'sponsored')) {
      const ads = rowOf(feed, 'sponsored').filter(p => !mixed.some(o => o.id === p.id))
      SPONSORED_SLOTS.forEach((slot, i) => { if (ads[i] && slot <= mixed.length) mixed.splice(slot, 0, ads[i]) })
    }
    return { products: mixed, warm }
  }, [feed])

  if (!loading && products.length === 0) return null

  return (
    <section id="for-you" className="sp-section" aria-labelledby="sp-foryou-title">
      <div className="sp-container">
        <SectionHead id="sp-foryou-title" tone="green" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')}
          lead={warm ? t('leadWarm') : t('leadCold')} />
        <ProductRail products={loading ? null : products} section={warm ? 'recommended' : 'shop_for_you'} label={t('eyebrow')} />
      </div>
    </section>
  )
}

const LIST_TYPES = ['trending', 'best_sellers', 'new_arrivals'] as const

export function ListsSection({ feed, loading }: { feed: HomeFeed | null; loading: boolean }) {
  const t  = useTranslations('shopPage.lists')
  const th = useTranslations('homeFeed')
  const lists = LIST_TYPES.map(type => ({ type, products: rowOf(feed, type) })).filter(l => loading || l.products.length > 0)
  const [active, setActive] = useState<string>(LIST_TYPES[0])
  const current = lists.find(l => l.type === active) ?? lists[0]

  if (!loading && lists.length === 0) return null

  // Arrow keys move between tabs (WAI-ARIA tabs pattern), mirrored in RTL
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1
    const i = lists.findIndex(l => l.type === current?.type)
    const next = lists[(i + step + lists.length) % lists.length]
    setActive(next.type)
    e.currentTarget.querySelector<HTMLButtonElement>(`#sp-tab-${next.type}`)?.focus()
  }

  return (
    <section className="sp-section sp-section--tint" aria-labelledby="sp-lists-title">
      <div className="sp-container">
        <SectionHead id="sp-lists-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')}
          action={
            <div className="sp-tabs" role="tablist" aria-label={t('tabsLabel')} onKeyDown={onKey}>
              {lists.map(l => (
                <button key={l.type} id={`sp-tab-${l.type}`} type="button" role="tab" className="sp-tab"
                  aria-selected={current?.type === l.type} aria-controls="sp-lists-panel" tabIndex={current?.type === l.type ? 0 : -1}
                  onClick={() => setActive(l.type)}>
                  {th(`titles.${l.type}`)}
                </button>
              ))}
            </div>
          } />
        {current && (
          <div key={current.type} id="sp-lists-panel" role="tabpanel" aria-labelledby={`sp-tab-${current.type}`} className="sp-panel">
            <ProductRail products={loading ? null : current.products} section={current.type} label={th(`titles.${current.type}`)} />
          </div>
        )}
      </div>
    </section>
  )
}
