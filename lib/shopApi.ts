/**
 * lib/shopApi.ts
 * Cart, Favorites, and Checkout API calls for the frontend.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number
  product_id: number
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

export interface FavoriteItem {
  id: number
  product_id: number
  name: string
  slug: string
  price: number
  stock: number
  image_url: string | null
  category: string | null
}

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

  add: (productId: number, quantity = 1) =>
    request<{ success: boolean; message: string; data: CartItem }>('POST', '/cart', {
      product_id: productId,
      quantity,
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

  add: (productId: number) =>
    request<{ success: boolean; favorited: boolean; data: FavoriteItem }>('POST', '/favorites', {
      product_id: productId,
    }),

  remove: (productId: number) =>
    request<{ success: boolean; favorited: boolean }>('DELETE', `/favorites/${productId}`),

  check: (productId: number) =>
    request<{ success: boolean; favorited: boolean }>('GET', `/favorites/check/${productId}`),
}

// ─── Checkout API ─────────────────────────────────────────────────────────────

export const checkoutApi = {
  place: (payload: CheckoutPayload) =>
    request<CheckoutResponse>('POST', '/checkout', payload),
}