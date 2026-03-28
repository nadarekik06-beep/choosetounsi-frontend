/**
 * FILE: lib/complaintApi.ts  (Customer Frontend — port 3000)  ← ADD new methods
 *
 * Changes from v1: sellerComplaintApi gets approve() and reject() methods.
 * adminComplaintApi gets confirmRejection() and overrideToApproved().
 * Everything else is identical to v1.
 */

import type { Complaint, ComplaintFormPayload, EligibleOrder } from '@/types/complaint'

const RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const API_URL = RAW_URL.endsWith('/api') ? RAW_URL : `${RAW_URL}/api`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}
function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    const err: any = new Error(json.message ?? 'Request failed')
    err.response = { data: json, status: res.status }
    throw err
  }
  return json
}

async function formRequest<T>(path: string, data: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeaders() },
    body: data,
  })
  const json = await res.json()
  if (!res.ok) {
    const err: any = new Error(json.message ?? 'Request failed')
    err.response = { data: json, status: res.status }
    throw err
  }
  return json
}

// ─── Client API ───────────────────────────────────────────────────────────────

export const complaintApi = {
  getEligibleOrders: () =>
    jsonRequest<{ success: boolean; window_days: number; data: EligibleOrder[] }>(
      'GET', '/client/complaints/eligible-orders'
    ),
  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<{ success: boolean; data: any }>('GET', `/client/complaints${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: number) =>
    jsonRequest<{ success: boolean; data: Complaint }>('GET', `/client/complaints/${id}`),
  submit: (payload: ComplaintFormPayload) => {
    const fd = new FormData()
    fd.append('order_id', String(payload.order_id))
    fd.append('complaint_type', payload.complaint_type)
    fd.append('description', payload.description)
    if (payload.other_reason) fd.append('other_reason', payload.other_reason)
    if (payload.image) fd.append('image', payload.image)
    return formRequest<{ success: boolean; message: string; data: Complaint }>('/client/complaints', fd)
  },
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

  // ── NEW ──────────────────────────────────────────────────────────────────

  /** Seller approves → status = APPROVED (direct, client notified) */
  approve: (id: number, seller_note?: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/approve`, { seller_note }
    ),

  /** Seller rejects → status = SELLER_REJECTED_PENDING_ADMIN (admin notified) */
  reject: (id: number, seller_note: string, rejection_reason: string) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/seller/complaints/${id}/reject`, { seller_note, rejection_reason }
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

  // ── NEW ──────────────────────────────────────────────────────────────────

  /** Admin confirms seller's rejection → status = REJECTED (final) */
  confirmRejection: (id: number) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/confirm-rejection`
    ),

  /** Admin overrides seller's rejection → status = APPROVED (final) */
  overrideToApproved: (id: number) =>
    jsonRequest<{ success: boolean; message: string; data: Complaint }>(
      'PATCH', `/admin/complaints/${id}/override-approve`
    ),
}