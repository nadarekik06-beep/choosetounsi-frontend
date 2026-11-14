/**
 * Returns API — client, seller (owner) and the storefront's legacy admin calls.
 */

import { currentLocale, fallbackError } from '@/lib/i18n/clientLocale'
import type {
  AfterSaleFees, BuyerComplaint, ClosedReturnOrder, Complaint, ComplaintFormPayload, ComplaintType, EligibleOrder, RefundPreview, ReturnPolicyInfo,
} from '@/types/complaint'
import { API_BASE } from '@/lib/constants'


function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? null
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type Headers = () => Record<string, string>

async function jsonRequest<T>(method: string, path: string, body?: unknown, headers: Headers = authHeaders): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers() },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    const err: any = new Error(json.message ?? fallbackError('request'))
    err.response = { data: json, status: res.status }
    throw err
  }
  return json
}

async function formRequest<T>(path: string, data: FormData, headers: Headers = authHeaders): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...headers() },
    body: data,
  })
  const json = await res.json()
  if (!res.ok) {
    const err: any = new Error(json.message ?? fallbackError('request'))
    err.response = { data: json, status: res.status }
    throw err
  }
  return json
}

// ─── Client API ───────────────────────────────────────────────────────────────

/**
 * The buyer's returns API. `base` + `headers` say whose: the signed-in account
 * (/client, bearer token) or a guest's one order (/guest, X-Order-Token) — same
 * endpoints, same payloads, so the form and the tracking are shared.
 */
function buyerComplaintClient(base: '/client' | '/guest', headers: Headers) {
  return {
    getEligibleOrders: () =>
      jsonRequest<{
        success: boolean; window_hours: number; window_days: number; return_shipping_fee: number; data: EligibleOrder[]
        /** Per parcel size; one fee per shop parcel, at its largest size */
        after_sale_fees?: AfterSaleFees
        seller_fault_types?: ComplaintType[]
        /** Exchange-first policy (v2): off until the admin switches it on */
        policy?: ReturnPolicyInfo
        /** Parcels delivered within 30 days whose 48 h are over, with the reason */
        closed_orders?: ClosedReturnOrder[]
      }>(
        'GET', `${base}/complaints/eligible-orders`, undefined, headers
      ),

    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
      ).toString()
      return jsonRequest<{ success: boolean; data: any }>('GET', `${base}/complaints${qs ? `?${qs}` : ''}`, undefined, headers)
    },

    getOne: (id: number) =>
      jsonRequest<{ success: boolean; data: BuyerComplaint }>('GET', `${base}/complaints/${id}`, undefined, headers),

    /**
     * Multipart: proof photos + either return_all or items[i][order_item_id|quantity].
     * Exchange: always items, each with its replacement_variant_id.
     */
    submit: (payload: ComplaintFormPayload) => {
      const fd = new FormData()
      fd.append('order_id',       String(payload.order_id))
      fd.append('complaint_type', payload.complaint_type)
      fd.append('description',    payload.description)
      if (payload.other_reason) fd.append('other_reason', payload.other_reason)
      if (payload.resolution_type) fd.append('resolution_type', payload.resolution_type)
      if (payload.item_unused_confirmed != null) fd.append('item_unused_confirmed', payload.item_unused_confirmed ? '1' : '0')
      payload.images.forEach(f => fd.append('images[]', f))
      if (payload.return_all && payload.resolution_type !== 'exchange') {
        fd.append('return_all', '1')
      } else {
        (payload.items ?? []).forEach((l, i) => {
          fd.append(`items[${i}][order_item_id]`, String(l.order_item_id))
          fd.append(`items[${i}][quantity]`,      String(l.quantity))
          if (l.replacement_variant_id) fd.append(`items[${i}][replacement_variant_id]`, String(l.replacement_variant_id))
        })
      }
      return formRequest<{ success: boolean; message: string; data: BuyerComplaint; returns: BuyerComplaint[] }>(`${base}/complaints`, fd, headers)
    },

    /**
     * What returning these units would refund, computed by the server (delivery
     * is included in the prices, so a refund is not a sum of unit prices).
     */
    preview: (payload: { order_id: number; complaint_type: string; resolution_type?: string; return_all?: boolean; items?: { order_item_id: number; quantity: number }[] }) =>
      jsonRequest<{ success: boolean; data: RefundPreview }>(
        'POST', `${base}/complaints/preview`, payload.return_all ? { ...payload, items: undefined, return_all: 1 } : payload, headers
      ),

    /** Contest the shop's refusal: ChooseTounsi decides. */
    escalate: (id: number, note?: string) =>
      jsonRequest<{ success: boolean; message: string; data: BuyerComplaint }>('PATCH', `${base}/complaints/${id}/escalate`, { note }, headers),

    /** The shop said the exchange is impossible: one click turns the request into a refund. */
    switchToRefund: (id: number, itemUnusedConfirmed?: boolean) =>
      jsonRequest<{ success: boolean; message: string; data: BuyerComplaint }>(
        'PATCH', `${base}/complaints/${id}/switch-to-refund`,
        itemUnusedConfirmed == null ? undefined : { item_unused_confirmed: itemUnusedConfirmed }, headers
      ),

    /** Withdraw a request the shop hasn't answered yet. */
    cancel: (id: number) =>
      jsonRequest<{ success: boolean; message: string; data: BuyerComplaint }>('PATCH', `${base}/complaints/${id}/cancel`, undefined, headers),
  }
}

export type BuyerComplaintClient = ReturnType<typeof buyerComplaintClient>

/** Signed-in buyer. */
export const complaintApi = buyerComplaintClient('/client', authHeaders)

/** Guest (no account): the returns of the one order this device token opens. */
export function guestComplaintApi(orderToken: string): BuyerComplaintClient {
  return buyerComplaintClient('/guest', () => ({ 'X-Order-Token': orderToken, 'Accept-Language': currentLocale() }))
}

// ─── Seller API ───────────────────────────────────────────────────────────────

export const sellerComplaintApi = {
  stats: () =>
    jsonRequest<{ success: boolean; data: any }>('GET', '/seller/complaints/stats'),

  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<{ success: boolean; data: any }>('GET', `/seller/complaints${qs ? `?${qs}` : ''}`)
  },

  getOne: (id: number) =>
    jsonRequest<{ success: boolean; data: Complaint }>('GET', `/seller/complaints/${id}`),

  addNote: (id: number, seller_note: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/note`, { seller_note }
    ),

  approve: (id: number, seller_note?: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/approve`, { seller_note }
    ),

  reject: (id: number, seller_note: string, rejection_reason: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/reject`, { seller_note, rejection_reason }
    ),

  /** Exchange-first policy: the shop cannot do this exchange (the client may then switch to a refund). */
  exchangeImpossible: (id: number, reason: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>('PATCH', `/seller/complaints/${id}/exchange-impossible`, { reason }),

  /** « Colis retour reçu »: starts the inspection clock. */
  received: (id: number, note?: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>('PATCH', `/seller/complaints/${id}/received`, { note }),

  /** Conforme / Non conforme (photos + comment required for Non conforme). */
  inspect: (id: number, result: 'conform' | 'nonconform', comment?: string, photos: File[] = []) => {
    const fd = new FormData()
    fd.append('result', result)
    if (comment) fd.append('comment', comment)
    photos.forEach(f => fd.append('photos[]', f))
    return formRequest<{ success: boolean; message: string; data: Complaint }>(`/seller/complaints/${id}/inspect`, fd)
  },

  /** Parcel back at the shop: condition of each returned line (resaleable → restocked). */
  receive: (id: number, conditions: Record<number, 'resaleable' | 'damaged'>, note?: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/receive`, { conditions, note }
    ),
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminComplaintApi = {
  stats: () =>
    jsonRequest<{ success: boolean; data: any }>('GET', '/admin/complaints/stats'),

  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<{ success: boolean; data: any }>('GET', `/admin/complaints${qs ? `?${qs}` : ''}`)
  },

  getOne: (id: number) =>
    jsonRequest<{ success: boolean; data: Complaint }>('GET', `/admin/complaints/${id}`),

  approve: (id: number) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/approve`
    ),

  reject: (id: number, rejection_reason: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/reject`, { rejection_reason }
    ),

  confirmRejection: (id: number) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/confirm-rejection`
    ),

  overrideToApproved: (id: number) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/override-approve`
    ),
}