/**
 * lib/sellerApi.ts
 * All API calls for the seller dashboard.
 *
 * The default export mimics axios:
 *   - api.get(path, { params })  →  Promise<{ data: any }>
 *   - api.post(path, body)       →  Promise<{ data: any }>
 *   etc.
 *
 * Named exports (productsApi, categoriesApi, etc.) return raw JSON directly.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Auth token ───────────────────────────────────────────────────────────────
// Tries every key name @/lib/auth might use to store the Sanctum token.

const TOKEN_KEYS = [
  'auth_token',
  'token',
  'ct_auth_token',
  'access_token',
  'sanctum_token',
  'user_token',
]

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key)
    if (val) return val
  }
  for (const key of TOKEN_KEYS) {
    const val = sessionStorage.getItem(key)
    if (val) return val
  }
  return null
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err: any = new Error(data?.message ?? 'API error')
    err.response = { data, status: res.status }
    throw err
  }
  return res.json()
}

async function apiJSON(path: string, method: string, body: unknown): Promise<any> {
  return apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

/** Ensures path always starts with /api */
function normalizePath(path: string): string {
  if (path.startsWith('/api/') || path === '/api') return path
  return `/api${path.startsWith('/') ? path : '/' + path}`
}

/** Appends query params to a path */
function withParams(path: string, params?: Record<string, any>): string {
  if (!params) return path
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  }
  const q = qs.toString()
  return q ? `${path}?${q}` : path
}

// ─── FormData builder ─────────────────────────────────────────────────────────

function buildFormData(payload: Record<string, any>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue

    if (key === 'images' && Array.isArray(value)) {
      value.forEach((file: File) => fd.append('images[]', file))
      continue
    }
    if (key === 'delete_image_ids' && Array.isArray(value)) {
      value.forEach((id: number) => fd.append('delete_image_ids[]', String(id)))
      continue
    }
    if (key === 'attributes' && typeof value === 'object' && !Array.isArray(value)) {
      for (const [slug, val] of Object.entries(value)) {
        if (val === null || val === undefined || val === '') continue
        fd.append(`attributes[${slug}]`, String(val))
      }
      continue
    }
    if (typeof value === 'boolean') { fd.append(key, value ? '1' : '0'); continue }
    if (typeof value === 'number')  { fd.append(key, String(value)); continue }
    if (typeof value === 'string' && value !== '') { fd.append(key, value); continue }
  }
  return fd
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  name_ar?: string
  slug: string
  icon?: string | null
  image?: string | null
  is_active?: boolean
  order?: number
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  name_ar?: string
  slug: string
  icon?: string | null
}

export interface ProductPayload {
  name: string
  slug?: string
  sku?: string
  description?: string | null
  short_description?: string | null
  price: number
  stock: number
  category_id: number
  subcategory_id?: number | null
  is_active?: boolean
  images?: File[]
  delete_image_ids?: number[]
  attributes?: Record<string, string>
}

// ─── Storage URL ──────────────────────────────────────────────────────────────

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const base = API_URL.replace(/\/api\/?$/, '')
  return `${base}/storage/${path.replace(/^\/?(storage\/)?/, '')}`
}

// ─── Named API exports ────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: (): Promise<{ success: boolean; data: Category[] }> =>
    apiFetch('/api/categories'),

  getSubcategories: (categorySlug: string): Promise<{ success: boolean; data: Subcategory[] }> =>
    apiFetch(`/api/categories/${categorySlug}/subcategories`),
}

export const productsApi = {
  getAll: (params: Record<string, any> = {}) =>
    apiFetch(withParams('/api/seller/products', params)),

  getOne: (id: number) =>
    apiFetch(`/api/seller/products/${id}`),

  getStats: () =>
    apiFetch('/api/seller/products/stats'),

  create: (payload: ProductPayload) => {
    const fd = buildFormData(payload as any)
    return apiFetch('/api/seller/products', { method: 'POST', body: fd })
  },

  update: (id: number, payload: ProductPayload) => {
    const fd = buildFormData(payload as any)
    fd.append('_method', 'PUT')
    return apiFetch(`/api/seller/products/${id}`, { method: 'POST', body: fd })
  },

  delete: (id: number) =>
    apiFetch(`/api/seller/products/${id}`, { method: 'DELETE' }),

  deleteImage: (productId: number, imageId: number) =>
    apiFetch(`/api/seller/products/${productId}/images/${imageId}`, { method: 'DELETE' }),

  setPrimaryImage: (productId: number, imageId: number) =>
    apiFetch(`/api/seller/products/${productId}/images/${imageId}/primary`, { method: 'PATCH' }),
}

export const dashboardApi = {
  get:         () => apiFetch('/api/seller/dashboard'),
  getOverview: () => apiFetch('/api/seller/dashboard'),
}

export const ordersApi = {
  getAll: (params: Record<string, any> = {}) =>
    apiFetch(withParams('/api/seller/orders', params)),

  getOne: (id: number) =>
    apiFetch(`/api/seller/orders/${id}`),

  getStats: () =>
    apiFetch('/api/seller/orders/stats'),

  updateStatus: (id: number, status: string) =>
    apiJSON(`/api/seller/orders/${id}/status`, 'PATCH', { status }),
}

// ─── Default export — axios-compatible ───────────────────────────────────────
//
// Returns { data: <parsed json> } to match axios response shape.
// Supports:
//   api.get('/notifications', { params: { page: 1 } })
//   api.patch('/notifications/uuid/read')
//   api.get('/notifications/unread-count')   ← /api auto-prepended
//
// ─────────────────────────────────────────────────────────────────────────────

type ApiOptions = { params?: Record<string, any> }

async function axiosFetch(
  path: string,
  method: string,
  body?: unknown,
  options?: ApiOptions
): Promise<{ data: any }> {
  const url = withParams(normalizePath(path), options?.params)

  const fetchOptions: RequestInit = { method }
  if (body !== undefined) {
    fetchOptions.headers = { 'Content-Type': 'application/json' }
    fetchOptions.body = JSON.stringify(body)
  }

  const raw = await apiFetch(url, fetchOptions)
  // Wrap in { data } to match axios shape
  return { data: raw }
}

const api = {
  get:    (path: string, options?: ApiOptions) =>
    axiosFetch(path, 'GET', undefined, options),

  post:   (path: string, body: unknown = {}, options?: ApiOptions) =>
    axiosFetch(path, 'POST', body, options),

  put:    (path: string, body: unknown = {}, options?: ApiOptions) =>
    axiosFetch(path, 'PUT', body, options),

  patch:  (path: string, body: unknown = {}, options?: ApiOptions) =>
    axiosFetch(path, 'PATCH', body, options),

  delete: (path: string, options?: ApiOptions) =>
    axiosFetch(path, 'DELETE', undefined, options),
}

export default api