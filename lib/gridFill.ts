// Extra cards slipped into product grids (search, category pages, /shop catalogue):
//
//   - sponsored products from the ad server (GET /api/ads — active, funded campaigns only;
//     budgets, frequency caps and relevance are the server's job). Rendered with the normal
//     ProductCard, which reports impressions / clicks with the ad token. Relevant ads come
//     from the page's placement (search_top with the query, category_top with the category);
//     when those run short, general picks from home_row fill the gap.
//   - promo flyers (GET /api/promo-flyers): a live promotion / flash sale with a CTA.
//
// Spacing comes from GET /api/ads/config (grid_ad_every, grid_flyer_every): one sponsored
// card per N cards, one flyer per M cards. A product already in the grid is never repeated,
// and the grid always ends on an organic product; what doesn't fit is handed back
// (`rest`) for a "You might also like" block.

import { useEffect, useMemo, useState } from 'react'
import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { fetchAds, fetchAdsConfig, type AdCard, type AdPlacement } from '@/lib/adsApi'

export interface PromoFlyer {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  ends_at: string
  products_count: number
  images: string[]
  seller: { id: number; name: string | null } | null
  product: { id: number; slug: string; name: string; image: string | null; final_price: number; original_price: number }
  link: { type: 'product' | 'seller' | 'deals'; href: string }
}

export type GridCell<T> =
  | { kind: 'product'; item: T }
  | { kind: 'ad'; ad: AdCard }
  | { kind: 'flyer'; flyer: PromoFlyer }

export interface GridExtras { ads: AdCard[]; flyers: PromoFlyer[] }

const DEFAULT_AD_EVERY = 8
const DEFAULT_FLYER_EVERY = 12
const NONE_ADS: AdCard[] = []
const NONE_FLYERS: PromoFlyer[] = []
/** First flyer this many cards in, so it doesn't sit next to the first sponsored card. */
const FLYER_OFFSET = 6

export async function fetchPromoFlyers(
  query: { q?: string; categorySlug?: string; exclude?: number[]; limit?: number },
  signal?: AbortSignal,
): Promise<PromoFlyer[]> {
  const qs = new URLSearchParams()
  if (query.q) qs.set('q', query.q)
  if (query.categorySlug) qs.set('category_slug', query.categorySlug)
  if (query.limit) qs.set('limit', String(query.limit))
  query.exclude?.slice(0, 200).forEach(id => qs.append('exclude[]', String(id)))
  try {
    const res = await fetch(`${API_BASE}/promo-flyers?${qs}`, { headers: { Accept: 'application/json', 'Accept-Language': currentLocale() }, signal })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.data) ? json.data : []
  } catch {
    return []   // like ads: never worth breaking a page for
  }
}

/**
 * Interleave sponsored cards and flyers into organic items.
 * Sponsored cards go at positions every, 2·every…; flyers at FLYER_OFFSET, +flyerEvery…
 * (1-based positions in the final grid). Nothing is placed after the last organic item.
 */
export function fillGrid<T extends { id: number }>(
  items: T[], extras: GridExtras, opts: { adEvery?: number; flyerEvery?: number; startAt?: number } = {},
): { cells: GridCell<T>[]; rest: GridExtras } {
  const adEvery = opts.adEvery ?? DEFAULT_AD_EVERY
  const flyerEvery = opts.flyerEvery ?? DEFAULT_FLYER_EVERY
  const inGrid = new Set(items.map(i => i.id))
  const ads = extras.ads.filter(a => !inGrid.has(a.id))
  const flyers = [...extras.flyers]
  // Several grids on one page (search sections) share one sequence of positions
  const startAt = opts.startAt ?? 0

  const cells: GridCell<T>[] = []
  let next = 0
  let nextFlyer = flyerEvery > 0 ? Math.min(FLYER_OFFSET, flyerEvery) : Infinity
  while (nextFlyer <= startAt) nextFlyer += flyerEvery
  while (next < items.length) {
    const pos = startAt + cells.length + 1
    if (adEvery > 0 && pos % adEvery === 0 && ads.length) {
      cells.push({ kind: 'ad', ad: ads.shift()! })
    } else if (pos >= nextFlyer && flyers.length) {
      cells.push({ kind: 'flyer', flyer: flyers.shift()! })
      nextFlyer = pos + flyerEvery
    } else {
      cells.push({ kind: 'product', item: items[next++] })
    }
  }
  return { cells, rest: { ads, flyers } }
}

/**
 * Loads the extras for a grid once its organic items are known.
 * `ids` should hold every product id already on the page (all sections).
 */
export function useGridExtras({ placement, q, categorySlug, ids, enabled, minAds = 0, generalFallback = true }: {
  placement: AdPlacement
  q?: string
  categorySlug?: string
  ids: number[]
  enabled: boolean
  /** Ask for at least this many ads (e.g. to fill a "You might also like" block). */
  minAds?: number
  /** Top up with general (personalised) sponsored picks when too few relevant ones (off on a text search). */
  generalFallback?: boolean
}): GridExtras & { adEvery: number; flyerEvery: number; ready: boolean } {
  const idsKey = useMemo(() => ids.join(','), [ids])
  // Results are tagged with the request they answer; a stale answer is never shown
  const key = JSON.stringify([placement, q ?? '', categorySlug ?? '', idsKey, minAds, generalFallback])
  const [state, setState] = useState<(GridExtras & { key: string; adEvery: number; flyerEvery: number }) | null>(null)

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    const exclude = idsKey ? idsKey.split(',').map(Number) : []

    ;(async () => {
      const cfg = await fetchAdsConfig()
      const adEvery = cfg?.grid_ad_every ?? DEFAULT_AD_EVERY
      const flyerEvery = cfg?.grid_flyer_every ?? DEFAULT_FLYER_EVERY
      const wanted = Math.max(minAds, adEvery > 0 ? Math.floor(exclude.length / Math.max(1, adEvery - 1)) : 0)
      const flyersWanted = flyerEvery > 0 ? Math.min(6, Math.max(1, Math.ceil(exclude.length / flyerEvery))) : 0

      const [relevant, flyers] = await Promise.all([
        wanted > 0 ? fetchAds(placement, { q, categorySlug, exclude, limit: wanted }, ctrl.signal) : Promise.resolve([]),
        flyersWanted > 0 ? fetchPromoFlyers({ q, categorySlug, exclude, limit: flyersWanted }, ctrl.signal) : Promise.resolve([]),
      ])
      let ads = relevant
      // Not enough relevant campaigns: general (personalised) sponsored picks
      if (generalFallback && ads.length < wanted && !ctrl.signal.aborted) {
        const more = await fetchAds('home_row', { exclude: [...exclude, ...ads.map(a => a.id)], limit: Math.min(8, wanted - ads.length) }, ctrl.signal)
        ads = [...ads, ...more]
      }
      const seen = new Set<number>()
      ads = ads.filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      if (!ctrl.signal.aborted) setState({ key, ads, flyers, adEvery, flyerEvery })
    })()

    return () => ctrl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers placement, q, category, ids, minAds, generalFallback
  }, [key, enabled])

  const fresh = enabled && state?.key === key
  return {
    ads: fresh ? state.ads : NONE_ADS,
    flyers: fresh ? state.flyers : NONE_FLYERS,
    adEvery: state?.adEvery ?? DEFAULT_AD_EVERY,
    flyerEvery: state?.flyerEvery ?? DEFAULT_FLYER_EVERY,
    ready: fresh,
  }
}
