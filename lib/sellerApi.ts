/**
 * lib/sellerApi.ts
 * Seller-side API calls.
 * FIXED: variants are serialized into FormData using PHP-style array notation.
 *        e.g. variants[0][option_ids][0]=3&variants[0][stock]=10
 * UPDATED: color_images support added for per-color variant image uploads.
 */

const RAW_URL   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
// Strip trailing /api so we can build both /api/... and /storage/... URLs
const BASE_URL  = RAW_URL.replace(/\/api\/?$/, '')
const API_URL   = `${BASE_URL}/api`

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const clean = path.replace(/^\/storage\//, '').replace(/^\//, '')
  return `${BASE_URL}/storage/${clean}`
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null

  // Try all possible key names in order of preference
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

// ─── JSON request (GET, DELETE, PATCH) ────────────────────────────────────────

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
      // Do NOT set Content-Type — browser sets it with the correct boundary
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

/**
 * Converts a product payload into a FormData object that Laravel can parse.
 *
 * Variants are serialized as PHP array notation:
 *   variants[0][option_ids][0] = 3
 *   variants[0][option_ids][1] = 7
 *   variants[0][stock]         = 10
 *   variants[0][price_override]= ""
 *   variants[0][sku]           = ""
 *   variants[0][is_active]     = 1
 *
 * Attributes are serialized as:
 *   attributes[color] = "[1,2]"
 *   attributes[size]  = "[3]"
 *
 * Images are File objects appended as:
 *   images[0], images[1], ...
 *
 * Color images are serialized as:
 *   color_images[{colorOptionId}][0] = File
 *   color_images[{colorOptionId}][1] = File
 *
 * For PUT requests, Laravel doesn't parse FormData body directly — we use
 * POST + _method=PUT (method spoofing).
 */
function buildFormData(payload: ProductPayload, isUpdate = false): FormData {
  const fd = new FormData()

  // Method spoofing for PUT
  if (isUpdate) fd.append('_method', 'PUT')

  // Scalar fields
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

  // Boolean
  fd.append('is_active', payload.is_active === false ? '0' : '1')

  // Images (File[])
  if (payload.images?.length) {
    payload.images.forEach((file, i) => {
      fd.append(`images[${i}]`, file)
    })
  }

  // Delete image IDs
  if (payload.delete_image_ids?.length) {
    payload.delete_image_ids.forEach((id, i) => {
      fd.append(`delete_image_ids[${i}]`, String(id))
    })
  }

  // Attributes (Record<string, string>)
  if (payload.attributes) {
    Object.entries(payload.attributes).forEach(([slug, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        fd.append(`attributes[${slug}]`, String(val))
      }
    })
  }

  // Variants — PHP array notation
  if (payload.variants?.length) {
    payload.variants.forEach((variant, i) => {
      if (variant.id != null) {
        fd.append(`variants[${i}][id]`, String(variant.id))
      }
      variant.option_ids.forEach((optId, j) => {
        fd.append(`variants[${i}][option_ids][${j}]`, String(optId))
      })
      fd.append(`variants[${i}][stock]`,     String(variant.stock ?? 0))
      fd.append(`variants[${i}][is_active]`, variant.is_active === false ? '0' : '1')
      if (variant.price_override != null && variant.price_override !== '') {
        fd.append(`variants[${i}][price_override]`, String(variant.price_override))
      }
      if (variant.sku) {
        fd.append(`variants[${i}][sku]`, variant.sku)
      }
    })
  }

  // Color images — PHP array notation
  // color_images[{colorOptionId}][0] = File, color_images[{colorOptionId}][1] = File …
  // Backend: SellerProductController::saveColorImages() reads $request->file('color_images')
  if (payload.color_images) {
    Object.entries(payload.color_images).forEach(([colorOptionId, files]) => {
      if (!Array.isArray(files)) return
      files.forEach((file, j) => {
        fd.append(`color_images[${colorOptionId}][${j}]`, file)
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
  /** Per-color images: Record<colorOptionId, File[]> — sent as color_images[id][0] */
  color_images?: Record<number, File[]>
  [key: string]: any
}

// ─── Subcategory Attributes Response ─────────────────────────────────────────

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

  /**
   * Fetch attributes for a subcategory.
   * Returns { variant_attributes: [...], info_attributes: [...] }
   * variant_attributes can be used as variant axes (is_variant: true).
   */
  getSubcategoryAttributes: (subcategoryId: number) =>
    jsonRequest<{ data: SubcategoryAttributesResponse }>('GET', `/subcategories/${subcategoryId}/attributes`),
}

// ─── Seller Dashboard API ─────────────────────────────────────────────────────

export const dashboardApi = {
  get: () =>
    jsonRequest<any>('GET', '/seller/dashboard'),

  getOverview: () =>
    jsonRequest<any>('GET', '/seller/dashboard'),

  stats: () =>
    jsonRequest<any>('GET', '/seller/products/stats'),
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

  get: (id: number) =>
    jsonRequest<any>('GET', `/seller/orders/${id}`),

  getOne: (id: number) =>
    jsonRequest<any>('GET', `/seller/orders/${id}`),

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

  getOne: (id: number) =>
    jsonRequest<any>('GET', `/seller/products/${id}`),

  /**
   * Create a new product.
   * Uses FormData POST so images + variants + color_images are sent together.
   */
  create: (payload: ProductPayload) =>
    formRequest<any>('POST', '/seller/products', buildFormData(payload, false)),

  /**
   * Update a product.
   * Uses FormData POST with _method=PUT (Laravel method spoofing).
   */
  update: (id: number, payload: ProductPayload) =>
    formRequest<any>('POST', `/seller/products/${id}`, buildFormData(payload, true)),

  delete: (id: number) =>
    jsonRequest<any>('DELETE', `/seller/products/${id}`),

  setPrimaryImage: (productId: number, imageId: number) =>
    jsonRequest<any>('PATCH', `/seller/products/${productId}/images/${imageId}/primary`),

  deleteImage: (productId: number, imageId: number) =>
    jsonRequest<any>('DELETE', `/seller/products/${productId}/images/${imageId}`),

  stats: () =>
    jsonRequest<any>('GET', '/seller/products/stats'),
}
// ─── Product Update Requests API (Seller) ─────────────────────────────────────

export interface UpdateRequestPayload {
  price?:          number | string
  stock?:          number | string
  category_id?:    number
  subcategory_id?: number | null
  variants?:       VariantPayload[]
  note?:           string
}

export const productUpdateRequestsApi = {
  /** List all requests for a specific product */
  getAll: (productId: number) =>
    jsonRequest<any>('GET', `/seller/products/${productId}/update-requests`),

  /** Submit a new update request for an approved product */
  submit: (productId: number, payload: UpdateRequestPayload) =>
    jsonRequest<any>('POST', `/seller/products/${productId}/request-update`, payload),
}

// ─── Default axios-compatible export ─────────────────────────────────────────
// Some files (notificationApi.ts, etc.) import this as:
//   import api from './sellerApi'
// and call api.get('/path'), api.post('/path', data), etc.
// This shim preserves that interface without requiring axios.

const api = {
  get:    <T = any>(path: string)             => jsonRequest<T>('GET',    path),
  post:   <T = any>(path: string, body?: any) => jsonRequest<T>('POST',   path, body),
  put:    <T = any>(path: string, body?: any) => jsonRequest<T>('PUT',    path, body),
  patch:  <T = any>(path: string, body?: any) => jsonRequest<T>('PATCH',  path, body),
  delete: <T = any>(path: string)             => jsonRequest<T>('DELETE', path),
}

export default api