// lib/couponsApi.ts

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '')
const API_URL  = `${BASE_URL}/api`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error(json.message ?? 'Request failed'), { response: json })
  return json
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouponProduct {
  id: number
  name: string
  slug: string
  price: number
  primary_image_url: string | null
}

export interface Coupon {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  min_order_amount: number | null
  usage_limit: number | null
  usage_limit_per_customer: number | null
  usage_count: number
  is_active: boolean
  products_count: number
  products: CouponProduct[]
  created_at: string
}

export interface CouponPayload {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount?: number | null
  usage_limit?: number | null
  usage_limit_per_customer?: number | null
  is_active?: boolean
  product_ids: number[]
}

export interface CouponStats {
  total: number
  active: number
  total_redemptions: number
  total_discount_given: number
}

// ─── Seller Coupons API ────────────────────────────────────────────────────────

export const sellerCouponsApi = {
  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()
    return req<any>('GET', `/seller/coupons${qs ? `?${qs}` : ''}`)
  },
  getOne:  (id: number)                                  => req<any>('GET',    `/seller/coupons/${id}`),
  stats:   ()                                            => req<{ success: boolean; data: CouponStats }>('GET', '/seller/coupons/stats'),
  create:  (payload: CouponPayload)                      => req<any>('POST',   '/seller/coupons', payload),
  update:  (id: number, payload: Partial<CouponPayload>) => req<any>('PUT',    `/seller/coupons/${id}`, payload),
  delete:  (id: number)                                  => req<any>('DELETE', `/seller/coupons/${id}`),
}
