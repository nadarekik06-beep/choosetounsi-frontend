// Homepage personalization signals (fire-and-forget).
//
// - Guests get a random id (localStorage "ct_sid") sent as X-Session-Id, so their
//   activity counts too and is merged into their account when they log in.
// - Events are queued and flushed in small batches with `keepalive`, so a click
//   that navigates away is still delivered. Nothing here ever throws or awaits in the UI.
// - Repeats are dropped client-side (the API dedupes as well): one view per product
//   per 30 min, one click per product+section per 5 min.

import { API_BASE } from '@/lib/constants'

export type TrackEventType = 'view' | 'click'

interface TrackEvent {
  type: TrackEventType
  product_id: number
  source_section?: string
}

const SESSION_KEY = 'ct_sid'
const TOKEN_KEY   = 'ct_auth_token'
const DEDUPE_KEY  = 'ct_track_seen'
const DEDUPE_MS: Record<TrackEventType, number> = { view: 30 * 60_000, click: 5 * 60_000 }
const FLUSH_DELAY_MS = 1500
const MAX_BATCH      = 20

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
  const key = `${e.type}:${e.product_id}:${e.type === 'click' ? e.source_section ?? '' : ''}`
  try {
    const seen: Record<string, number> = JSON.parse(ss.getItem(DEDUPE_KEY) ?? '{}')
    const now = Date.now()
    if (seen[key] && now - seen[key] < DEDUPE_MS[e.type]) return true
    seen[key] = now
    // keep the map small
    for (const k of Object.keys(seen)) if (now - seen[k] > DEDUPE_MS.view) delete seen[k]
    ss.setItem(DEDUPE_KEY, JSON.stringify(seen))
  } catch { /* ignore */ }
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

export function track(type: TrackEventType, productId: number, sourceSection?: string) {
  if (typeof window === 'undefined' || !productId) return
  const event: TrackEvent = { type, product_id: productId, ...(sourceSection ? { source_section: sourceSection } : {}) }
  if (alreadySent(event)) return
  listenForPageHide()
  queue.push(event)
  if (queue.length >= MAX_BATCH) flush()
  else if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS)
}

export const trackView  = (productId: number) => track('view', productId)
export const trackClick = (productId: number, section: string) => track('click', productId, section)

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
