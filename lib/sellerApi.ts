'use client'

/**
 * lib/sellerApi.ts
 * Seller-side API calls.
 *
 * CHANGES vs previous version:
 *   1. Added `restockApi` — direct stock updates (no admin approval)
 *   2. Updated `productUpdateRequestsApi.submit` type to include full variant CRUD
 *   3. color_images key typed as string (was already done, kept)
 *
 * Everything else is IDENTICAL to the original.
 */

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '')
const API_URL  = `${BASE_URL}/api`

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const clean = path.replace(/^\/storage\//, '').replace(/^\//, '')
  return `${BASE_URL}/storage/${clean}`
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null

  const candidates = [
    'ct_auth_token',
    'auth_token',
    'token',
    'access_token',
  ]

  for (const key of candidates) {
    const val = localStorage.getItem(key) ?? sessionStorage.getItem(key)
    if (val) return val
  }

  return null
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── JSON request (GET, DELETE, PATCH, POST) ──────────────────────────────────

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
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

// ─── FormData request (POST/PUT with file uploads) ────────────────────────────

async function formRequest<T>(method: string, path: string, data: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
    },
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

// ─── FormData builder ─────────────────────────────────────────────────────────

function buildFormData(payload: ProductPayload, isUpdate = false): FormData {
  const fd = new FormData()

  if (isUpdate) fd.append('_method', 'PUT')

  const scalars: string[] = [
    'name', 'slug', 'sku', 'description', 'short_description',
    'price', 'stock', 'category_id', 'subcategory_id',
  ]
  scalars.forEach(key => {
    const val = (payload as Record<string, any>)[key]
    if (val !== undefined && val !== null && val !== '') {
      fd.append(key, String(val))
    }
  })

  fd.append('is_active', payload.is_active === false ? '0' : '1')

  if (payload.images?.length) {
    payload.images.forEach((file, i) => fd.append(`images[${i}]`, file))
  }

  if (payload.delete_image_ids?.length) {
    payload.delete_image_ids.forEach((id, i) => fd.append(`delete_image_ids[${i}]`, String(id)))
  }

  if (payload.attributes) {
    Object.entries(payload.attributes).forEach(([slug, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        fd.append(`attributes[${slug}]`, String(val))
      }
    })
  }

  if (payload.variants?.length) {
    payload.variants.forEach((variant, i) => {
      if (variant.id != null) fd.append(`variants[${i}][id]`, String(variant.id))
      variant.option_ids.forEach((optId, j) => fd.append(`variants[${i}][option_ids][${j}]`, String(optId)))
      fd.append(`variants[${i}][stock]`,     String(variant.stock ?? 0))
      fd.append(`variants[${i}][is_active]`, variant.is_active === false ? '0' : '1')
      if (variant.price_override != null && variant.price_override !== '') {
        fd.append(`variants[${i}][price_override]`, String(variant.price_override))
      }
      if (variant.sku) fd.append(`variants[${i}][sku]`, variant.sku)
    })
  }

  if (payload.color_images) {
    Object.entries(payload.color_images).forEach(([groupKey, files]) => {
      if (!Array.isArray(files)) return
      files.forEach((file, j) => {
        fd.append(`color_images[${groupKey.replace(/\|/g, '_')}][${j}]`, file)
      })
    })
  }

  return fd
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  slug: string
  subcategories?: Subcategory[]
}

export interface Subcategory {
  id: number
  name: string
  slug: string
  category_id: number
}

export interface VariantPayload {
  id?: number
  option_ids: number[]
  stock: number
  price_override?: number | string | null
  sku?: string
  is_active?: boolean
}

/**
 * Variant payload for update requests — includes structural change fields
 * and deletion flag.
 */
export interface UpdateRequestVariantPayload {
  id?: number
  /** Required for new variants, optional for existing (structural change) */
  option_ids?: number[]
  stock?: number
  price_override?: number | string | null
  sku?: string | null
  is_active?: boolean
  /** Set to true to request deletion of this variant */
  _delete?: boolean
}

export interface ProductPayload {
  name: string
  slug?: string
  sku?: string
  description?: string
  short_description?: string
  price: number | string
  stock: number | string
  category_id: number | string
  subcategory_id?: number | string | null
  is_active?: boolean
  images?: File[]
  delete_image_ids?: number[]
  attributes?: Record<string, string>
  variants?: VariantPayload[]
  color_images?: Record<string, File[]>
  [key: string]: any
}

export interface SubcategoryAttributesResponse {
  variant_attributes: import('@/types/Attributes').Attribute[]
  info_attributes:    import('@/types/Attributes').Attribute[]
}

// ─── Categories API ───────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: () =>
    jsonRequest<{ data: Category[] }>('GET', '/categories'),

  getSubcategories: (categorySlug: string) =>
    jsonRequest<{ data: Subcategory[] }>('GET', `/categories/${categorySlug}/subcategories`),

  getSubcategoryAttributes: (subcategoryId: number) =>
    jsonRequest<{ data: SubcategoryAttributesResponse }>('GET', `/subcategories/${subcategoryId}/attributes`),
}

// ─── Seller Dashboard API ─────────────────────────────────────────────────────

export const dashboardApi = {
  get: () =>       jsonRequest<any>('GET', '/seller/dashboard'),
  getOverview: () => jsonRequest<any>('GET', '/seller/dashboard'),
  stats: () =>     jsonRequest<any>('GET', '/seller/products/stats'),
}

// ─── Seller Orders API ────────────────────────────────────────────────────────

export const ordersApi = {
  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<any>('GET', `/seller/orders${qs ? `?${qs}` : ''}`)
  },
  get:         (id: number) => jsonRequest<any>('GET',   `/seller/orders/${id}`),
  getOne:      (id: number) => jsonRequest<any>('GET',   `/seller/orders/${id}`),
  updateStatus: (id: number, status: string) =>
    jsonRequest<any>('PATCH', `/seller/orders/${id}/status`, { status }),
  updatePayment: (id: number, payment_status: string) =>
    jsonRequest<any>('PATCH', `/seller/orders/${id}/payment`, { payment_status }),
}

// ─── Seller Products API ──────────────────────────────────────────────────────

export const productsApi = {
  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<any>('GET', `/seller/products${qs ? `?${qs}` : ''}`)
  },
  getOne:   (id: number)                    => jsonRequest<any>('GET',    `/seller/products/${id}`),
  create:   (payload: ProductPayload)        => formRequest<any>('POST',   '/seller/products', buildFormData(payload, false)),
  update:   (id: number, payload: ProductPayload) => formRequest<any>('POST', `/seller/products/${id}`, buildFormData(payload, true)),
  delete:   (id: number)                    => jsonRequest<any>('DELETE', `/seller/products/${id}`),
  setPrimaryImage: (productId: number, imageId: number) =>
    jsonRequest<any>('PATCH', `/seller/products/${productId}/images/${imageId}/primary`),
  deleteImage: (productId: number, imageId: number) =>
    jsonRequest<any>('DELETE', `/seller/products/${productId}/images/${imageId}`),
  stats: () => jsonRequest<any>('GET', '/seller/products/stats'),
}

// ─── Restock API (direct, no admin approval) ──────────────────────────────────

export interface SimpleRestockPayload {
  stock: number
}

export interface VariantRestockPayload {
  variants: Array<{
    /** Existing variant ID (required for update) */
    id?: number
    stock: number
    /** For new variants only */
    option_ids?: number[]
    price_override?: number | null
    sku?: string
    is_active?: boolean
  }>
}

export type RestockPayload = SimpleRestockPayload | VariantRestockPayload

export interface RestockResponse {
  success: boolean
  message: string
  data: {
    id:            number
    stock:         number
    is_active:     boolean
    has_variants:  boolean
    variant_stock?: number
    variants?:     Array<{ id: number; label: string; stock: number }>
  }
}

export const restockApi = {
  /**
   * POST /api/seller/products/{id}/restock
   * Direct stock update — NO admin approval required.
   * Only stock fields are written; structural changes are ignored server-side.
   */
  restock: (productId: number, payload: RestockPayload): Promise<RestockResponse> =>
    jsonRequest<RestockResponse>('POST', `/seller/products/${productId}/restock`, payload),
}

// ─── Product Update Requests API (Seller) ─────────────────────────────────────

export interface UpdateRequestPayload {
  price?:          number | string
  stock?:          number | string
  category_id?:    number
  subcategory_id?: number | null
  /** Full variant CRUD — see UpdateRequestVariantPayload */
  variants?:       UpdateRequestVariantPayload[]
  note?:           string
}

export const productUpdateRequestsApi = {
  getAll: (productId: number) =>
    jsonRequest<any>('GET', `/seller/products/${productId}/update-requests`),

  submit: (productId: number, payload: UpdateRequestPayload) =>
    jsonRequest<any>('POST', `/seller/products/${productId}/request-update`, payload),
}

// ─── Default fetch-based API export ──────────────────────────────────────────

const api = {
  get:    <T = any>(path: string)             => jsonRequest<T>('GET',    path),
  post:   <T = any>(path: string, body?: any) => jsonRequest<T>('POST',   path, body),
  put:    <T = any>(path: string, body?: any) => jsonRequest<T>('PUT',    path, body),
  patch:  <T = any>(path: string, body?: any) => jsonRequest<T>('PATCH',  path, body),
  delete: <T = any>(path: string)             => jsonRequest<T>('DELETE', path),
}

export default api