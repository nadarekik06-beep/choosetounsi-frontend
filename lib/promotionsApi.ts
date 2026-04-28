// lib/promotionsApi.ts

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

export interface PromotionProduct {
  id: number
  name: string
  slug: string
  price: number
  primary_image_url: string | null
}

export interface Promotion {
  id: number
  name: string
  type: 'flash_sale' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  starts_at: string
  ends_at: string
  flash_stock: number | null
  flash_stock_remaining: number | null
  status: 'scheduled' | 'active' | 'paused' | 'expired'
  is_flash_sale: boolean
  products: PromotionProduct[]
  products_count: number
  created_at: string
}

export interface PromotionPayload {
  name: string
  type: 'flash_sale' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  starts_at: string   // ISO string
  ends_at: string
  flash_stock?: number | null
  product_ids: number[]
}

// ─── Active promotion shape (returned by public API + ProductResource) ────────

export interface ActivePromotion {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  is_flash_sale: boolean
}

// ─── Seller Promotions API ────────────────────────────────────────────────────

export const sellerPromotionsApi = {
  getAll:  (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => [k, String(v)])
    ).toString()
    return req<any>('GET', `/seller/promotions${qs ? `?${qs}` : ''}`)
  },
  getOne:  (id: number)                     => req<any>('GET',    `/seller/promotions/${id}`),
  stats:   ()                               => req<any>('GET',    '/seller/promotions/stats'),
  create:  (payload: PromotionPayload)      => req<any>('POST',   '/seller/promotions', payload),
  update:  (id: number, payload: Partial<PromotionPayload>) =>
                                               req<any>('PUT',    `/seller/promotions/${id}`, payload),
  delete:  (id: number)                     => req<any>('DELETE', `/seller/promotions/${id}`),
}

// ─── Public Promotions API ────────────────────────────────────────────────────

export const publicPromotionsApi = {
  flashSales:   ()             => req<any>('GET', '/flash-sales'),
  forProduct:   (id: number)   => req<any>('GET', `/promotions/product/${id}`),
}