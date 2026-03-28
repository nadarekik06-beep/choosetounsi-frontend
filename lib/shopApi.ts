'use client'

/**
 * lib/shopApi.ts
 * Cart, Favorites, and Checkout API calls for the frontend.
 * Updated to support product variants.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()

  if (!res.ok) {
    throw Object.assign(new Error(json.message ?? 'Request failed'), {
      status: res.status,
      data: json,
    })
  }

  return json
}

// ─── Variant types ────────────────────────────────────────────────────────────

export interface VariantOptionEntry {
  id: number
  value: string
  color_hex?: string | null
  /** Primary image URL for this color option — set by the backend when color images exist */
  primary_image?: string | null
}

/**
 * One selectable axis (e.g. "Color" or "Size") with its available options.
 * Returned in GET /api/products/{slug} as `selectable_axes`.
 */
export interface SelectableAxis {
  slug: string
  name: string
  type: 'select' | 'color' | 'multiselect' | string
  options: VariantOptionEntry[]
}

/**
 * A single variant as returned by the API.
 * `option_map` is keyed by attribute slug for O(1) lookup.
 */
export interface ProductVariant {
  id: number
  sku: string | null
  stock: number
  is_active: boolean
  price: number                                     // effective price (override ?? base)
  price_override: number | null
  label: string                                     // e.g. "Red / M"
  option_map: Record<string, VariantOptionEntry>    // { color: {...}, size: {...} }
}

// ─── Cart types ───────────────────────────────────────────────────────────────

export interface CartItem {
  id: number
  product_id: number
  variant_id: number | null
  variant_label: string | null
  variant_options: Record<string, VariantOptionEntry>
  name: string
  slug: string
  sku: string | null
  price: number
  quantity: number
  line_total: number
  stock: number
  image_url: string | null
  category: string | null
}

export interface CartResponse {
  success: boolean
  data: {
    items: CartItem[]
    count: number
    subtotal: number
  }
}

// ─── Favorites types ──────────────────────────────────────────────────────────

export interface FavoriteItem {
  id: number
  product_id: number
  variant_id: number | null
  variant_label: string | null
  variant_options: Record<string, VariantOptionEntry>
  name: string
  slug: string
  price: number
  stock: number
  image_url: string | null
  category: string | null
}

// ─── Checkout types ───────────────────────────────────────────────────────────

export interface CheckoutPayload {
  wilaya: string
  address: string
  phone: string
  notes?: string
}

export interface CheckoutResponse {
  success: boolean
  message: string
  order_number: string
  order_id: number
  total: number
}

// ─── Cart API ─────────────────────────────────────────────────────────────────

export const cartApi = {
  get: () =>
    request<CartResponse>('GET', '/cart'),

  /**
   * Add a product (or a specific variant) to the cart.
   * Pass variantId when the product has variants — the backend will
   * reject the request if variants exist but no variantId is given.
   */
  add: (productId: number, quantity = 1, variantId?: number | null) =>
    request<{ success: boolean; message: string; data: CartItem }>('POST', '/cart', {
      product_id: productId,
      quantity,
      ...(variantId != null ? { variant_id: variantId } : {}),
    }),

  update: (cartItemId: number, quantity: number) =>
    request<{ success: boolean; data: CartItem }>('PUT', `/cart/${cartItemId}`, { quantity }),

  remove: (cartItemId: number) =>
    request<{ success: boolean; message: string }>('DELETE', `/cart/${cartItemId}`),

  clear: () =>
    request<{ success: boolean; message: string }>('DELETE', '/cart'),
}

// ─── Favorites API ────────────────────────────────────────────────────────────

export const favoritesApi = {
  get: () =>
    request<{ success: boolean; data: FavoriteItem[] }>('GET', '/favorites'),

  /**
   * Favorite a product or a specific variant of a product.
   */
  add: (productId: number, variantId?: number | null) =>
    request<{ success: boolean; favorited: boolean; data: FavoriteItem }>('POST', '/favorites', {
      product_id: productId,
      ...(variantId != null ? { variant_id: variantId } : {}),
    }),

  /**
   * Remove favorite. Pass variantId to remove only that specific variant,
   * omit to remove all favorites for this product.
   */
  remove: (productId: number, variantId?: number | null) =>
    request<{ success: boolean; favorited: boolean }>('DELETE', `/favorites/${productId}`, {
      ...(variantId != null ? { variant_id: variantId } : {}),
    }),

  check: (productId: number, variantId?: number | null) =>
    request<{ success: boolean; favorited: boolean }>(
      'GET',
      `/favorites/check/${productId}${variantId != null ? `?variant_id=${variantId}` : ''}`
    ),
}

// ─── Checkout API ─────────────────────────────────────────────────────────────

export const checkoutApi = {
  place: (payload: CheckoutPayload) =>
    request<CheckoutResponse>('POST', '/checkout', payload),
}