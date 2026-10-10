'use client'

/**
 * lib/sellerApi.ts
 * Seller-side API calls.
 *
 * CHANGES vs previous version:
 *   1. Added `restockApi` — direct stock updates (no admin approval)
 *   2. (removed) product update requests — sellers now edit live products directly
 *   3. color_images key typed as string (was already done, kept)
 *   4. ProductPayload: occasions (array, sent as occasions[]) + multi-pack fields
 *   5. buildFormData updated: occasions, is_pack / pack_quantity / pack_contents, variant_images
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

// ─── Errors ───────────────────────────────────────────────────────────────────
// Every failed call rejects with an Error carrying `response: { data, status }`.
// status 0 = the API could not be reached (server down, timeout, CORS);
// data is {} when the server answered with something that is not JSON (PHP fatal page, proxy).

function apiError(message: string, status: number, data: any = {}): Error {
  const err: any = new Error(message)
  err.response = { data, status }
  return err
}

export function isNetworkError(err: unknown): boolean {
  return (err as any)?.response?.status === 0
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw apiError('Network error', 0)
  }

  const text = await res.text().catch(() => '')
  let json: any = null
  try { json = text ? JSON.parse(text) : {} } catch { /* non-JSON body */ }

  if (!res.ok) {
    throw apiError(json?.message ?? `Request failed (HTTP ${res.status})`, res.status, json ?? {})
  }
  if (json === null) {
    throw apiError(`Invalid server response (HTTP ${res.status})`, res.status)
  }
  return json
}

// ─── JSON request (GET, DELETE, PATCH, POST) ──────────────────────────────────

function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return send<T>(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

// ─── Upload with progress (fetch can't report upload progress) ────────────────

function uploadRequest<T>(path: string, data: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    xhr.setRequestHeader('Accept', 'application/json')
    Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    if (onProgress) {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    }
    xhr.onload = () => {
      let json: any = {}
      try { json = JSON.parse(xhr.responseText) } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(json)
      reject(apiError(json.message ?? `Request failed (HTTP ${xhr.status})`, xhr.status, json))
    }
    xhr.onerror = () => reject(apiError('Network error', 0))
    xhr.ontimeout = () => reject(apiError('Network error', 0))
    xhr.send(data)
  })
}

// ─── FormData request (POST/PUT with file uploads) ────────────────────────────

function formRequest<T>(method: string, path: string, data: FormData): Promise<T> {
  return send<T>(path, {
    method,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: data,
  })
}

// ─── FormData builder ─────────────────────────────────────────────────────────

function buildFormData(payload: ProductPayload, isUpdate = false): FormData {
  const fd = new FormData()

  if (isUpdate) fd.append('_method', 'PUT')

  // ── Scalar fields ──────────────────────────────────────────────────────────
  const scalars: string[] = [
    'name', 'slug', 'sku', 'description', 'short_description',
    'price', 'stock', 'category_id', 'subcategory_id', 'delivery_fee',
  ]
  scalars.forEach(key => {
    const val = (payload as Record<string, any>)[key]
    if (val !== undefined && val !== null && val !== '') {
      fd.append(key, String(val))
    }
  })

  // Low-stock threshold override: sent even when empty ('' = use the shop default)
  if (payload.low_stock_threshold !== undefined) {
    fd.append('low_stock_threshold', payload.low_stock_threshold === null ? '' : String(payload.low_stock_threshold))
  }

  // ── Season / Occasion (omitted → backend keeps the stored value, or all_season) ──
  if (payload.occasions) {
    payload.occasions.forEach(o => fd.append('occasions[]', o))
  }

  // ── Boolean fields ─────────────────────────────────────────────────────────
  fd.append('is_active', payload.is_active === false ? '0' : '1')

  if (payload.is_pack !== undefined) {
    fd.append('is_pack', payload.is_pack ? '1' : '0')
    // Sent even when empty so the backend validates (and clears) them with is_pack
    fd.append('pack_quantity', payload.is_pack ? String(payload.pack_quantity ?? '') : '')
    fd.append('pack_contents', payload.is_pack ? (payload.pack_contents ?? '') : '')
  }

  // ── Images ─────────────────────────────────────────────────────────────────
  if (payload.images?.length) {
    payload.images.forEach((file, i) => fd.append(`images[${i}]`, file))
  }

  if (payload.delete_image_ids?.length) {
    payload.delete_image_ids.forEach((id, i) =>
      fd.append(`delete_image_ids[${i}]`, String(id))
    )
  }

  // ── Attributes ─────────────────────────────────────────────────────────────
  if (payload.attributes) {
    Object.entries(payload.attributes).forEach(([slug, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        fd.append(`attributes[${slug}]`, String(val))
      }
    })
  }

  // ── Variants ───────────────────────────────────────────────────────────────
  if (payload.variants?.length) {
    payload.variants.forEach((variant, i) => {
      if (variant.id != null) fd.append(`variants[${i}][id]`, String(variant.id))
      variant.option_ids.forEach((optId, j) =>
        fd.append(`variants[${i}][option_ids][${j}]`, String(optId))
      )
      fd.append(`variants[${i}][stock]`,     String(variant.stock ?? 0))
      fd.append(`variants[${i}][is_active]`, variant.is_active === false ? '0' : '1')
      if (variant.price_override != null && variant.price_override !== '') {
        fd.append(`variants[${i}][price_override]`, String(variant.price_override))
      }
      if (variant.sku) fd.append(`variants[${i}][sku]`, variant.sku)
    })
  }

  // ── Color group images ─────────────────────────────────────────────────────
  // The '|' → '_' replacement is the existing fix for the Laravel key parsing bug.
  if (payload.color_images) {
    Object.entries(payload.color_images).forEach(([groupKey, files]) => {
      if (!Array.isArray(files)) return
      files.forEach((file, j) => {
        fd.append(`color_images[${groupKey.replace(/\|/g, '_')}][${j}]`, file)
      })
    })
  }

  // ── Image manifest: ordered gallery + color groups, new files under uploads[key]
  if (payload.image_manifest) {
    fd.append('image_manifest', payload.image_manifest)
    Object.entries(payload.uploads ?? {}).forEach(([key, file]) => fd.append(`uploads[${key}]`, file, file.name))
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

export interface ProductPayload {
  name: string
  slug?: string
  sku?: string
  description?: string
  short_description?: string
  price: number | string
  stock: number | string
  /** Low-stock alert threshold for this product; null = shop default */
  low_stock_threshold?: number | null
  category_id: number | string
  subcategory_id?: number | string | null
  is_active?: boolean
  is_pack?: boolean | number
  pack_quantity?: number | string
  pack_contents?: string
  occasions?: string[]
  delivery_fee?: string      
  images?: File[]
  delete_image_ids?: number[]
  attributes?: Record<string, string>
  variants?: VariantPayload[]
  color_images?: Record<string, File[]>
  /** JSON: { gallery: Item[], color_groups: { color_option_ids, items: Item[] }[] }, Item = {id} | {upload, replaces?} */
  image_manifest?: string
  uploads?: Record<string, File>
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

// ─── Shipping cost (agency) ───────────────────────────────────────────────────
// What the seller pays per order when they offer free shipping.

export const shippingApi = {
  cost: () =>
    // free_delivery_contribution: what free delivery costs the seller per shipment (admin setting)
    jsonRequest<{ data: { free_delivery_contribution: number; shipping_cost: number; customer_delivery_fee: number } }>('GET', '/seller/shipping-cost'),
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
  create:   (payload: ProductPayload, onProgress?: (percent: number) => void) =>
    uploadRequest<any>('/seller/products', buildFormData(payload, false), onProgress),
  update:   (id: number, payload: ProductPayload, onProgress?: (percent: number) => void) =>
    uploadRequest<any>(`/seller/products/${id}`, buildFormData(payload, true), onProgress),
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

// ─── Default fetch-based API export ──────────────────────────────────────────

const api = {
  get:    <T = any>(path: string)             => jsonRequest<T>('GET',    path),
  post:   <T = any>(path: string, body?: any) => jsonRequest<T>('POST',   path, body),
  put:    <T = any>(path: string, body?: any) => jsonRequest<T>('PUT',    path, body),
  patch:  <T = any>(path: string, body?: any) => jsonRequest<T>('PATCH',  path, body),
  delete: <T = any>(path: string)             => jsonRequest<T>('DELETE', path),
}

// ─── Packs API ────────────────────────────────────────────────────────────────

export interface PackItemPayload {
  product_id: number
  allowed_variant_ids?: number[] | null  // null = all variants
  quantity: number
}

export interface PackPayload {
  name: string
  description?: string
  short_description?: string
  pack_price: number | string
  is_active?: boolean
  items: PackItemPayload[]
  image?: File | null
}

function buildPackFormData(payload: PackPayload, isUpdate = false): FormData {
  const fd = new FormData()
  if (isUpdate) fd.append('_method', 'PUT')

  fd.append('name',       payload.name)
  fd.append('pack_price', String(payload.pack_price))
  fd.append('is_active',  payload.is_active === false ? '0' : '1')

  if (payload.description)       fd.append('description',       payload.description)
  if (payload.short_description) fd.append('short_description', payload.short_description)
  if (payload.image)             fd.append('image',             payload.image)

  payload.items.forEach((item, i) => {
    fd.append(`items[${i}][product_id]`, String(item.product_id))
    fd.append(`items[${i}][quantity]`,   String(item.quantity))
    if (item.allowed_variant_ids != null) {
      item.allowed_variant_ids.forEach((vid, j) => {
        fd.append(`items[${i}][allowed_variant_ids][${j}]`, String(vid))
      })
    }
  })

  return fd
}

export const packsApi = {
  getAll: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return jsonRequest<any>('GET', `/seller/packs${qs ? `?${qs}` : ''}`)
  },

  getOne:  (id: number) => jsonRequest<any>('GET', `/seller/packs/${id}`),
  stats:   ()           => jsonRequest<any>('GET', '/seller/packs/stats'),

  /** Products picker — seller's own approved products with variants */
  getSellerProducts: (search = '') =>
    jsonRequest<any>('GET', `/seller/packs/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  create: (payload: PackPayload) =>
    formRequest<any>('POST', '/seller/packs', buildPackFormData(payload, false)),

  update: (id: number, payload: PackPayload) =>
    formRequest<any>('POST', `/seller/packs/${id}`, buildPackFormData(payload, true)),

  delete: (id: number) => jsonRequest<any>('DELETE', `/seller/packs/${id}`),
}

export const invoiceApi = {
  /**
   * GET /api/seller/orders/{id}/invoice
   * Returns enriched invoice data: seller info, customer, items, totals.
   */
  get: (sellerOrderId: number) =>
    jsonRequest<any>('GET', `/seller/orders/${sellerOrderId}/invoice`),
}

export const storeProfileApi = {
  /** GET /api/seller/store-profile — current branding for the settings page */
  get: () => jsonRequest<any>('GET', '/seller/store-profile'),

  /** POST /api/seller/store-profile/cover-photo */
  updateCoverPhoto: (file: File) => {
    const fd = new FormData()
    fd.append('cover_photo', file)
    return formRequest<any>('POST', '/seller/store-profile/cover-photo', fd)
  },

  /** GET /api/seller/pickup-address — where the courier collects parcels (+ missing fields) */
  getPickup: () => jsonRequest<any>('GET', '/seller/pickup-address'),

  /** PUT /api/seller/pickup-address — pickup fields only, no re-review */
  updatePickup: (data: PickupAddressInput) => jsonRequest<any>('PUT', '/seller/pickup-address', data),

  /** GET /api/seller/stock-alerts — low-stock alert settings of the shop */
  getStockAlerts: () => jsonRequest<{ success: boolean; data: StockAlertSettings }>('GET', '/seller/stock-alerts'),

  /** PUT /api/seller/stock-alerts */
  updateStockAlerts: (data: StockAlertSettingsInput) =>
    jsonRequest<{ success: boolean; message?: string; data: StockAlertSettings }>('PUT', '/seller/stock-alerts', data),
}

export type StockAlertChannel = 'in_app' | 'in_app_email'

export interface StockAlertSettingsInput {
  enabled:   boolean
  threshold: number
  channel:   StockAlertChannel
}

export interface StockAlertSettings extends StockAlertSettingsInput {
  has_email:    boolean
  /** minutes: crossings within this window are grouped into one alert */
  group_window: number
}

export interface PickupAddressInput {
  full_name:          string
  phone_number:       string
  pickup_address:     string
  city:               string
  pickup_postal_code: string
  wilaya:             string
  pickup_notes?:      string
}

export default api