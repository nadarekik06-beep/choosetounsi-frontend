// Buyer-side ads: GET /api/ads, GET /api/ads/popup, GET /api/ads/config, POST /api/ads/events.
//
// - Every ad carries a signed `ad_token`; impressions and clicks are reported with it
//   (batched, `keepalive`, like lib/tracking.ts), never with raw ids.
// - The viewer is identified the same way as personalization: Bearer token and/or the
//   browser's guest id (X-Session-Id).
// - Numbers (slots, caps, popup timing) come from GET /api/ads/config — never hard-coded here.

import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { identityHeaders } from '@/lib/tracking'
import type { FeedProduct } from '@/lib/homeFeedApi'

export type AdPlacement =
  | 'home_row' | 'home_inline' | 'search_top' | 'category_top'
  | 'product_similar' | 'cart_cross_sell' | 'entry_popup'

export interface AdCard extends FeedProduct {
  is_sponsored: true
  placement: 'sponsored'
  ad_placement: AdPlacement
  ad_token: string
  sponsor_data: { id: number; ai_ad_copy?: string | null; token: string }
}

export interface AdsConfig {
  placements: string[]
  max_ads: Record<string, number>
  reserved_slots: number[]
  popup: { enabled: boolean; delay_seconds: number; dismiss_hours: number; dismiss_days_after_3: number }
}

export interface AdQuery {
  q?: string
  contextProductId?: number
  categorySlug?: string
  cart?: boolean
  cartProductIds?: number[]
  exclude?: number[]
  limit?: number
}

function headers(): Record<string, string> {
  return { Accept: 'application/json', 'Accept-Language': currentLocale(), ...identityHeaders() }
}

export async function fetchAds(placement: AdPlacement, query: AdQuery = {}, signal?: AbortSignal): Promise<AdCard[]> {
  const qs = new URLSearchParams({ placement })
  if (query.q) qs.set('q', query.q)
  if (query.contextProductId) qs.set('context_product_id', String(query.contextProductId))
  if (query.categorySlug) qs.set('category_slug', query.categorySlug)
  if (query.cart) qs.set('cart', '1')
  if (query.limit) qs.set('limit', String(query.limit))
  query.cartProductIds?.forEach(id => qs.append('cart_product_ids[]', String(id)))
  query.exclude?.slice(0, 200).forEach(id => qs.append('exclude[]', String(id)))

  try {
    const res = await fetch(`${API_BASE}/ads?${qs}`, { headers: headers(), signal })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.ads) ? json.ads : []
  } catch {
    return []   // ads are never worth breaking a page for
  }
}

export async function fetchPopupAd(): Promise<AdCard | null> {
  try {
    const res = await fetch(`${API_BASE}/ads/popup`, { headers: headers() })
    if (!res.ok) return null
    return (await res.json()).ad ?? null
  } catch {
    return null
  }
}

let configPromise: Promise<AdsConfig | null> | null = null

/** Buyer-side ad settings (cached for the page lifetime). */
export function fetchAdsConfig(): Promise<AdsConfig | null> {
  configPromise ??= fetch(`${API_BASE}/ads/config`, { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then(j => (j?.data ?? null) as AdsConfig | null)
    .catch(() => null)
  return configPromise
}

// ── Events ──────────────────────────────────────────────────────────────────

type AdEvent = { token: string; event: 'impression' | 'click' }

const queue: AdEvent[] = []
const sentImpressions = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null
let listening = false

function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  const batch = queue.splice(0, 20)
  try {
    fetch(`${API_BASE}/ads/events`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ events: batch }),
    }).catch(() => {})
  } catch { /* never surface */ }
  if (queue.length) flush()
}

function enqueue(e: AdEvent, immediate = false) {
  if (typeof window === 'undefined' || !e.token) return
  if (!listening) {
    listening = true
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  }
  queue.push(e)
  if (immediate || queue.length >= 20) flush()
  else if (!timer) timer = setTimeout(flush, 1000)
}

/** Once per token per page load (the server deduplicates too). */
export function recordAdImpression(token: string) {
  if (!token || sentImpressions.has(token)) return
  sentImpressions.add(token)
  enqueue({ token, event: 'impression' })
}

/** Sent immediately with keepalive, so a click that navigates away still arrives. */
export function recordAdClick(token: string) {
  enqueue({ token, event: 'click' }, true)
}

/**
 * Put ads into reserved 1-based grid slots (e.g. [1, 7]); ads that don't fit
 * (the list is shorter) go at the end only if there are organic items at all.
 */
export function withAdSlots<T>(items: T[], ads: AdCard[], slots: number[]): Array<{ ad: AdCard } | { item: T }> {
  const out: Array<{ ad: AdCard } | { item: T }> = items.map(item => ({ item }))
  const sorted = [...slots].sort((a, b) => a - b)
  ads.slice(0, sorted.length).forEach((ad, i) => {
    const at = Math.min(sorted[i] - 1, out.length)
    if (items.length > 0) out.splice(at, 0, { ad })
  })
  return out
}
