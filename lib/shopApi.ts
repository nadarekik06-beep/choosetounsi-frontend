'use client'

/**
 * lib/shopApi.ts
 * Cart, Favorites, and Checkout API calls for the frontend.
 * Updated to support product variants + Buy Now direct checkout.
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
  primary_image?: string | null
}

export interface SelectableAxis {
  slug: string
  name: string
  type: 'select' | 'color' | 'multiselect' | string
  options: VariantOptionEntry[]
}

export interface ProductVariant {
  id: number
  sku: string | null
  stock: number
  is_active: boolean
  price: number
  price_override: number | null
  label: string
  option_map: Record<string, VariantOptionEntry>
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

export interface BuyNowPayload {
  product_id: number
  variant_id?: number | null
  quantity: number
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

  add: (productId: number, variantId?: number | null) =>
    request<{ success: boolean; favorited: boolean; data: FavoriteItem }>('POST', '/favorites', {
      product_id: productId,
      ...(variantId != null ? { variant_id: variantId } : {}),
    }),

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
  /**
   * Cart-based checkout — unchanged.
   * POST /api/checkout
   */
  place: (payload: CheckoutPayload) =>
    request<CheckoutResponse>('POST', '/checkout', payload),

  /**
   * Buy Now — direct single-item order, bypasses cart entirely.
   * POST /api/checkout/buy-now
   */
  buyNow: (payload: BuyNowPayload) =>
    request<CheckoutResponse>('POST', '/checkout/buy-now', payload),
}