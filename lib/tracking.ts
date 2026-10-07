// Storefront signals (fire-and-forget): homepage personalization + the sellers'
// Visitor Insights funnel (impression → click → view → cart → checkout → order).
//
// - Guests get a random id (localStorage "ct_sid") sent as X-Session-Id, so their
//   activity counts too and is merged into their account when they log in.
// - Events are queued and flushed in small batches with `keepalive`, so a click
//   that navigates away is still delivered. Nothing here ever throws or awaits in the UI.
// - Repeats are dropped client-side (the API dedupes as well): one view per product
//   per 30 min, one click per product+section per 5 min, one impression per product
//   and listing context for the whole browser session, one checkout start per
//   product per checkout attempt.
// - A product view carries its traffic source: the section of the click that led to
//   it (remembered for 30 min), else "external" (came from another site) or "direct".

import { API_BASE } from '@/lib/constants'

export type TrackEventType = 'view' | 'click' | 'impression' | 'checkout_start'

interface TrackEvent {
  type: TrackEventType
  product_id: number
  source_section?: string
  ref?: string
}

const SESSION_KEY  = 'ct_sid'
const TOKEN_KEY    = 'ct_auth_token'
const DEDUPE_KEY   = 'ct_track_seen'
const IMPRESS_KEY  = 'ct_track_imp'
const CLICKS_KEY   = 'ct_track_clicks'
const CHECKOUT_KEY = 'ct_checkout_ref'
const DEDUPE_MS: Record<'view' | 'click', number> = { view: 30 * 60_000, click: 5 * 60_000 }
const CLICK_ATTRIBUTION_MS = 30 * 60_000
const FLUSH_DELAY_MS       = 1500
const IMPRESSION_FLUSH_MS  = 4000   // impressions are the bulk: send them in groups
const MAX_BATCH            = 50

const queue: TrackEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let listening = false

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function readJson<T>(store: Storage | null, key: string, fallback: T): T {
  try { return store ? (JSON.parse(store.getItem(key) ?? '') as T) ?? fallback : fallback } catch { return fallback }
}

function writeJson(store: Storage | null, key: string, value: unknown) {
  try { store?.setItem(key, JSON.stringify(value)) } catch { /* storage full / blocked */ }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Stable anonymous id for this browser (created on first use). */
export function getSessionId(): string | null {
  const ls = safeStorage('local')
  if (!ls) return null
  try {
    let sid = ls.getItem(SESSION_KEY)
    if (!sid) {
      sid = uuid()
      ls.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return null
  }
}

/** Headers that identify the viewer to personalization endpoints (token and/or guest id). */
export function identityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const sid = getSessionId()
  if (sid) headers['X-Session-Id'] = sid
  try {
    const token = safeStorage('local')?.getItem(TOKEN_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch { /* storage blocked */ }
  return headers
}

function alreadySent(e: TrackEvent): boolean {
  const ss = safeStorage('session')
  if (!ss) return false
  const now = Date.now()

  if (e.type === 'impression') {
    // Once per product and listing context for the whole browser session
    const seen = readJson<Record<string, 1>>(ss, IMPRESS_KEY, {})
    const key = `${e.product_id}:${e.source_section ?? ''}`
    if (seen[key]) return true
    seen[key] = 1
    writeJson(ss, IMPRESS_KEY, seen)
    return false
  }
  if (e.type === 'checkout_start') {
    const key = `ck:${e.product_id}:${e.ref}`
    const seen = readJson<Record<string, number>>(ss, DEDUPE_KEY, {})
    if (seen[key]) return true
    seen[key] = now
    writeJson(ss, DEDUPE_KEY, seen)
    return false
  }

  const key = `${e.type}:${e.product_id}:${e.type === 'click' ? e.source_section ?? '' : ''}`
  const seen = readJson<Record<string, number>>(ss, DEDUPE_KEY, {})
  if (seen[key] && now - seen[key] < DEDUPE_MS[e.type]) return true
  seen[key] = now
  // keep the map small
  for (const k of Object.keys(seen)) if (now - seen[k] > DEDUPE_MS.view) delete seen[k]
  writeJson(ss, DEDUPE_KEY, seen)
  return false
}

function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  const batch = queue.splice(0, MAX_BATCH)
  try {
    fetch(`${API_BASE}/track`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...identityHeaders() },
      body: JSON.stringify({ events: batch }),
    }).catch(() => {})
  } catch { /* never surface tracking errors */ }
  if (queue.length) flush()
}

function listenForPageHide() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

function enqueue(event: TrackEvent) {
  if (typeof window === 'undefined' || !event.product_id) return
  if (alreadySent(event)) return
  listenForPageHide()
  queue.push(event)
  if (queue.length >= MAX_BATCH) flush()
  // Impressions alone wait a little longer, so a scrolled grid goes out as one request
  else if (!timer) timer = setTimeout(flush, event.type === 'impression' ? IMPRESSION_FLUSH_MS : FLUSH_DELAY_MS)
}

export function track(type: TrackEventType, productId: number, sourceSection?: string) {
  enqueue({ type, product_id: productId, ...(sourceSection ? { source_section: sourceSection } : {}) })
}

/** The section of the last click on this product (if recent), else where the visitor came from. */
function viewSource(productId: number): string {
  const clicks = readJson<Record<string, { s: string; t: number }>>(safeStorage('session'), CLICKS_KEY, {})
  const c = clicks[productId]
  if (c && Date.now() - c.t < CLICK_ATTRIBUTION_MS) return c.s
  try {
    const ref = document.referrer ? new URL(document.referrer) : null
    if (ref && ref.host !== window.location.host) return 'external'
  } catch { /* bad referrer */ }
  return 'direct'
}

export const trackView = (productId: number) => track('view', productId, viewSource(productId))

export function trackClick(productId: number, section: string) {
  const ss = safeStorage('session')
  const clicks = readJson<Record<string, { s: string; t: number }>>(ss, CLICKS_KEY, {})
  const now = Date.now()
  for (const k of Object.keys(clicks)) if (now - clicks[k].t > CLICK_ATTRIBUTION_MS) delete clicks[k]
  clicks[productId] = { s: section, t: now }
  writeJson(ss, CLICKS_KEY, clicks)
  track('click', productId, section)
}

export const trackImpression = (productId: number, section: string) => track('impression', productId, section)

/**
 * Checkout page: one start per product per checkout attempt. The attempt id lives in
 * sessionStorage until the order is placed (clearCheckoutAttempt), so a refresh doesn't
 * count twice but the next order does.
 */
export function trackCheckoutStart(productIds: number[]) {
  const ss = safeStorage('session')
  let ref: string | null = null
  try { ref = ss?.getItem(CHECKOUT_KEY) ?? null } catch { /* blocked */ }
  if (!ref) {
    ref = uuid()
    try { ss?.setItem(CHECKOUT_KEY, ref) } catch { /* blocked */ }
  }
  for (const id of new Set(productIds)) enqueue({ type: 'checkout_start', product_id: id, ref })
}

export function clearCheckoutAttempt() {
  try { safeStorage('session')?.removeItem(CHECKOUT_KEY) } catch { /* blocked */ }
}

/** Attach this browser's guest history to the account that just signed in. */
export function mergeGuestHistory(token: string) {
  const sid = getSessionId()
  if (!sid || !token) return
  try {
    fetch(`${API_BASE}/track/merge`, {
      method: 'POST',
      keepalive: true,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Session-Id': sid },
    }).catch(() => {})
  } catch { /* ignore */ }
}
