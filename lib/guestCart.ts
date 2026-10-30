// Guest checkout (order without an account).
//
// - The guest cart lives on the server, keyed by a random token kept in
//   localStorage ("ct_cart_token") so it survives closing the browser. It is
//   sent as X-Cart-Token on cart / checkout calls made without a login.
// - After login the guest cart is merged into the account (POST /cart/merge)
//   and the token is dropped; it is also dropped once a guest order leaves the
//   cart empty.
// - Whether guest checkout is on comes from GET /checkout/payment-info
//   (php artisan guest-checkout on|off on the server).

import { API_BASE } from '@/lib/constants'
import { getSessionId } from '@/lib/tracking'
import { currentLocale } from '@/lib/i18n/clientLocale'

const CART_TOKEN_KEY = 'ct_cart_token'
export const CART_HEADER = 'X-Cart-Token'

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  try { crypto.getRandomValues(bytes) } catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256) }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') // 48 hex chars
}

/** The guest cart token, or null when this browser never added anything as a guest. */
export function getCartToken(): string | null {
  try { return storage()?.getItem(CART_TOKEN_KEY) ?? null } catch { return null }
}

/** The guest cart token, created on first use. */
export function ensureCartToken(): string {
  const existing = getCartToken()
  if (existing) return existing
  const token = randomToken()
  try { storage()?.setItem(CART_TOKEN_KEY, token) } catch { /* private mode: lives for this page only */ }
  return token
}

export function clearCartToken(): void {
  try { storage()?.removeItem(CART_TOKEN_KEY) } catch { /* ignore */ }
}

/**
 * Headers for a call made WITHOUT a login: the guest cart, the browser's
 * session id (so ad clicks made before ordering are credited to the seller)
 * and the language (e-mails and messages in the buyer's language).
 */
export function guestHeaders(createToken = true): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = createToken ? ensureCartToken() : getCartToken()
  if (token) headers[CART_HEADER] = token
  const sid = getSessionId()
  if (sid) headers['X-Session-Id'] = sid
  try { headers['Accept-Language'] = currentLocale() } catch { /* server default */ }
  return headers
}

// ── Expired login (the API answered 401 to a stored token) ───────────────────

const EXPIRED_KEY = 'ct_session_expired'

/** Remembered for this tab so checkout can say why the cart looks empty. */
export function markSessionExpired(): void {
  try { window.sessionStorage.setItem(EXPIRED_KEY, '1') } catch { /* ignore */ }
}
export function sessionExpired(): boolean {
  try { return window.sessionStorage.getItem(EXPIRED_KEY) === '1' } catch { return false }
}
export function clearSessionExpired(): void {
  try { window.sessionStorage.removeItem(EXPIRED_KEY) } catch { /* ignore */ }
}

// ── Signed in? (live: login / logout / expired token, this tab or another) ───

/** For useSyncExternalStore(subscribeAuth, isSignedInSnapshot, notSignedInOnServer). */
export function isSignedInSnapshot(): boolean {
  try { return !!storage()?.getItem('ct_auth_token') && !!storage()?.getItem('ct_auth_user') } catch { return false }
}
export const notSignedInOnServer = (): boolean => false

// ── Is guest checkout on? (one request per page load) ────────────────────────

let enabledPromise: Promise<boolean> | null = null

export function guestCheckoutEnabled(): Promise<boolean> {
  if (!enabledPromise) {
    enabledPromise = fetch(`${API_BASE}/checkout/payment-info`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(json => json?.data?.guest_checkout === true)
      .catch(() => false)
  }
  return enabledPromise
}

// ── Tracking links of guest orders placed in this browser ────────────────────

const LAST_ORDER_KEY = 'ct_last_guest_order'

/** Remembered so "Create your account" can attach it, and for a quick "track my order" link. */
export function rememberGuestOrder(trackingToken: string, orderNumber: string): void {
  try { storage()?.setItem(LAST_ORDER_KEY, JSON.stringify({ token: trackingToken, number: orderNumber, at: Date.now() })) } catch { /* ignore */ }
}

export function lastGuestOrder(): { token: string; number: string } | null {
  try {
    const raw = storage()?.getItem(LAST_ORDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
