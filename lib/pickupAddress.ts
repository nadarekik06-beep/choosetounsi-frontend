// Seller pickup address, 1:1 with Intigo's "Nouvelle adresse" form:
// Adresse complète, Zone (Délégation/Secteur), map pin; plus contact, phone,
// postal code and notes for the courier. Same rules as the backend
// (App\Services\Sellers\PickupAddressService::rules).

import { API_BASE } from '@/lib/constants'
import { validateTunisianPhone } from '@/lib/shippingAddress'

export type ZoneType = 'DELEGATION' | 'SECTEUR'

export interface ZoneOption {
  id: number
  type: ZoneType
  intigo_id: number
  name: string
  name_ar: string | null
  delegation: string
  gouvernorat: string
  display_label: string
  latitude: number | null
  longitude: number | null
}

export interface ZoneCenter {
  latitude: number
  longitude: number
  precision: 'secteur' | 'delegation' | 'gouvernorat'
  warn_km: number
}

export interface PickupAddressValue {
  adresse_complete: string
  zone: ZoneOption | null
  latitude: number | null
  longitude: number | null
  contact_name: string
  phone: string
  code_postal: string
  indications: string
}

export type PickupField = 'adresse_complete' | 'zone' | 'pin' | 'contact_name' | 'phone' | 'code_postal' | 'indications'
export type PickupErrors = Partial<Record<PickupField, string>>

/** Status of the address on the admin side (seller_pickup_addresses). */
export type PickupStatus = 'needs_review' | 'changed' | 'unverified' | 'verified' | 'created'

/** Tunisia's bounding box: a pin outside is refused (backend too). */
export const TUNISIA_BOUNDS = { latMin: 30.2, latMax: 37.6, lngMin: 7.5, lngMax: 11.7 }
export const TUNISIA_CENTER: [number, number] = [34.0, 9.6]

export const emptyPickupAddress = (): PickupAddressValue => ({
  adresse_complete: '', zone: null, latitude: null, longitude: null,
  contact_name: '', phone: '', code_postal: '', indications: '',
})

/** From an API "pickup" object (seller settings, application pre-fill). */
export function pickupFromApi(raw: unknown): PickupAddressValue {
  const p = (raw ?? {}) as Partial<{
    adresse_complete: string | null; zone: ZoneOption | null; latitude: number | null; longitude: number | null
    contact_name: string | null; phone: string | null; code_postal: string | null; indications: string | null
  }>
  return {
    adresse_complete: p?.adresse_complete ?? '',
    zone: p?.zone ?? null,
    latitude: p?.latitude ?? null,
    longitude: p?.longitude ?? null,
    contact_name: p?.contact_name ?? '',
    phone: p?.phone ?? '',
    code_postal: p?.code_postal ?? '',
    indications: p?.indications ?? '',
  }
}

/** The request body (JSON or FormData fields) expected by the backend. */
export function pickupPayload(v: PickupAddressValue): Record<string, string | number | null> {
  return {
    adresse_complete: v.adresse_complete.trim(),
    intigo_zone_id: v.zone?.id ?? null,
    latitude: v.latitude != null ? Number(v.latitude.toFixed(7)) : null,
    longitude: v.longitude != null ? Number(v.longitude.toFixed(7)) : null,
    contact_name: v.contact_name.trim(),
    phone: validateTunisianPhone(v.phone).clean,
    code_postal: v.code_postal.trim(),
    indications: v.indications.trim() || null,
  }
}

export function inTunisia(lat: number | null, lng: number | null): boolean {
  const b = TUNISIA_BOUNDS
  return lat != null && lng != null && lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax
}

/** Error keys (pickupAddress.errors.*), same rules as the backend. */
export function validatePickupAddress(v: PickupAddressValue): PickupErrors {
  const e: PickupErrors = {}
  const street = v.adresse_complete.trim()
  if (street.length < 5)                         e.adresse_complete = 'adresse'
  else if (street.length > 200)                  e.adresse_complete = 'adresseTooLong'
  if (!v.zone)                                   e.zone = 'zone'
  if (v.latitude == null || v.longitude == null) e.pin = 'pin'
  else if (!inTunisia(v.latitude, v.longitude))  e.pin = 'pinOutside'
  if (v.contact_name.trim().length < 3)          e.contact_name = 'contact'
  if (!validateTunisianPhone(v.phone).valid)     e.phone = 'phone'
  if (!/^\d{4}$/.test(v.code_postal.trim()))     e.code_postal = 'postalCode'
  return e
}

/** Laravel 422 field errors → our field names. */
export function pickupErrorsFromApi(errors: Record<string, string[]> | undefined): PickupErrors {
  if (!errors) return {}
  const map: Record<string, PickupField> = {
    adresse_complete: 'adresse_complete', intigo_zone_id: 'zone', latitude: 'pin', longitude: 'pin',
    contact_name: 'contact_name', phone: 'phone', code_postal: 'code_postal', indications: 'indications',
  }
  const out: PickupErrors = {}
  for (const [k, msgs] of Object.entries(errors)) {
    const f = map[k]
    if (f && !out[f]) out[f] = msgs[0]
  }
  return out
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Public zone API ──────────────────────────────────────────────────────────

export async function searchZones(q: string, signal?: AbortSignal, limit = 20): Promise<ZoneOption[]> {
  const res = await fetch(`${API_BASE}/intigo-zones?q=${encodeURIComponent(q)}&limit=${limit}`, {
    headers: { Accept: 'application/json' }, signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.data ?? []
}

const centerCache = new Map<number, ZoneCenter | null>()

/** Approximate centre of a zone (backend → Nominatim, cached on both sides). */
export async function zoneCenter(zoneId: number): Promise<ZoneCenter | null> {
  if (centerCache.has(zoneId)) return centerCache.get(zoneId) ?? null
  try {
    const res = await fetch(`${API_BASE}/intigo-zones/${zoneId}/center`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    centerCache.set(zoneId, json.data ?? null)
    return json.data ?? null
  } catch {
    return null
  }
}
