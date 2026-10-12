/**
 * Shipping address — same fields and rules as the backend
 * (App\Support\ShippingAddress): checkout, buy-now and the address book all
 * send exactly this shape, so a saved address always passes checkout.
 *
 * Governorate and delegation are picked from the courier's lists
 * (lib/regions.ts) once they are available: intigo_city_id / intigo_district_id
 * are then required, and wilaya / delegation follow the picked names. A saved
 * address without them is asked again at checkout.
 */

import { regionsRequired } from '@/lib/regions'

export interface ShippingAddressForm {
  recipient_name:  string
  phone:           string
  phone_secondary: string
  wilaya:          string
  delegation:      string
  intigo_city_id:     string   // '' until picked from the list
  intigo_district_id: string
  address:         string      // street, building, floor…
  postal_code:     string      // 4 digits (optional)
  notes:           string      // landmark / delivery notes (optional)
}

/** Field → message key in the `shippingAddress.errors` namespace. */
export type ShippingAddressErrors = Partial<Record<keyof ShippingAddressForm, string>>

export const emptyShippingAddress = (): ShippingAddressForm => ({
  recipient_name: '', phone: '', phone_secondary: '', wilaya: '',
  delegation: '', intigo_city_id: '', intigo_district_id: '', address: '', postal_code: '', notes: '',
})

/** Anything shaped like a saved address (older ones lack the newer fields). */
export function shippingAddressFrom(a: Partial<Record<keyof ShippingAddressForm, string | number | null>>): ShippingAddressForm {
  const v = (k: keyof ShippingAddressForm) => (a[k] === null || a[k] === undefined ? '' : String(a[k]))
  return {
    recipient_name: v('recipient_name'), phone: v('phone'), phone_secondary: v('phone_secondary'),
    wilaya: v('wilaya'), delegation: v('delegation'), address: v('address'),
    intigo_city_id: v('intigo_city_id'), intigo_district_id: v('intigo_district_id'),
    postal_code: v('postal_code'), notes: v('notes'),
  }
}

// ─── Tunisian phone ───────────────────────────────────────────────────────────
// `hint` is a message key in the `checkout.phone` namespace (with optional values).
export function validateTunisianPhone(raw: string): { clean: string; valid: boolean; hint: string; hintValues?: Record<string, number> } {
  const stripped      = raw.replace(/[\s\-.()]/g, '')
  const withoutPrefix = stripped.replace(/^(\+216|00216)/, '')
  const isValid       = /^[2459][0-9]{7}$/.test(withoutPrefix)

  let hint = ''
  let hintValues: Record<string, number> | undefined
  if (raw.trim() === '') {
    hint = ''
  } else if (withoutPrefix.length < 8) {
    hint = 'hintDigits'
    hintValues = { count: withoutPrefix.replace(/\D/g, '').length }
  } else if (withoutPrefix.length > 8) {
    hint = 'hintTooMany'
  } else if (!/^[2459]/.test(withoutPrefix)) {
    hint = 'hintPrefix'
  }

  return { clean: withoutPrefix, valid: isValid, hint, hintValues }
}

/** Returns error message KEYS (shippingAddress.errors.*), empty when valid. */
export function validateShippingAddress(f: ShippingAddressForm, regions: boolean = regionsRequired()): ShippingAddressErrors {
  const e: ShippingAddressErrors = {}
  if (f.recipient_name.trim().length < 3) e.recipient_name = 'recipient'
  if (!f.phone.trim()) e.phone = 'phoneRequired'
  else if (!validateTunisianPhone(f.phone).valid) e.phone = 'phoneInvalid'
  if (f.phone_secondary.trim()) {
    const second = validateTunisianPhone(f.phone_secondary)
    if (!second.valid) e.phone_secondary = 'phoneInvalid'
    else if (second.clean === validateTunisianPhone(f.phone).clean) e.phone_secondary = 'phoneSame'
  }
  if (regions) {
    if (!f.intigo_city_id) e.wilaya = 'wilaya'
    if (!f.intigo_district_id) e.delegation = 'delegationPick'
  } else {
    if (!f.wilaya) e.wilaya = 'wilaya'
    if (f.delegation.trim().length < 2) e.delegation = 'delegation'
  }
  if (f.address.trim().length < 5) e.address = 'address'
  if (f.postal_code.trim() && !/^\d{4}$/.test(f.postal_code.trim())) e.postal_code = 'postalCode'
  return e
}

/** A saved address from before structured addresses / the courier's lists: needs completing at checkout. */
export const isCompleteShippingAddress = (f: ShippingAddressForm, regions: boolean = regionsRequired()) =>
  Object.keys(validateShippingAddress(f, regions)).length === 0

/** Payload for /checkout, /checkout/buy-now and /addresses. */
export function shippingAddressPayload(f: ShippingAddressForm) {
  return {
    recipient_name:  f.recipient_name.trim(),
    phone:           validateTunisianPhone(f.phone).clean,
    phone_secondary: f.phone_secondary.trim() ? validateTunisianPhone(f.phone_secondary).clean : undefined,
    wilaya:          f.wilaya,
    delegation:      f.delegation.trim(),
    intigo_city_id:     f.intigo_city_id ? Number(f.intigo_city_id) : undefined,
    intigo_district_id: f.intigo_district_id ? Number(f.intigo_district_id) : undefined,
    address:         f.address.trim(),
    postal_code:     f.postal_code.trim() || undefined,
    notes:           f.notes.trim() || undefined,
  }
}

/** "12 rue X, El Mourouj, 2074 Ben Arous" */
export function formatShippingAddress(f: Pick<ShippingAddressForm, 'address' | 'delegation' | 'postal_code' | 'wilaya'>, wilayaLabel: (w: string) => string = w => w) {
  const city = [f.postal_code, f.wilaya ? wilayaLabel(f.wilaya) : ''].filter(Boolean).join(' ')
  return [f.address, f.delegation, city].filter(Boolean).join(', ')
}
