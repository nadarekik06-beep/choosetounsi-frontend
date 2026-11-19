import { apiUrl } from '@/lib/constants'
import { DEFAULT_DELIVERY_TIME_SETTINGS, normalizeSettings, type DeliveryTimeSettings } from '@/lib/deliveryEstimate'

/**
 * Delivery-time rules (public, read-only): GET /api/delivery-time.
 * One shared request per page load; any failure falls back to the defaults, so the estimate never breaks.
 */
let pending: Promise<DeliveryTimeSettings> | null = null

export function loadDeliveryTimeSettings(): Promise<DeliveryTimeSettings> {
  if (!pending) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null
    pending = fetch(apiUrl('/delivery-time'), { headers: { Accept: 'application/json' }, signal: ctrl?.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(json => (json?.data ? normalizeSettings(json.data) : DEFAULT_DELIVERY_TIME_SETTINGS))
      .catch(() => DEFAULT_DELIVERY_TIME_SETTINGS)
      .finally(() => { if (timer) clearTimeout(timer) })
  }
  return pending
}
