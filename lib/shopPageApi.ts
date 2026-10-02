// Data for the /shop page.
//   GET /api/shop/overview  — live counts, category rail, pepper sellers, deals (cached server-side)
//   GET /api/products       — the filterable catalogue (see buildCatalogQuery)
// Personalised / trending / best-seller / new rows come from lib/homeFeedApi.ts.

import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import type { FeedProduct, FeedPromotion } from '@/lib/homeFeedApi'

export type PepperTier = 'free' | 'red' | 'black'

export interface ShopStats {
  products: number
  sellers: number
  categories: number
  average_rating: number | null
  reviews: number
  delivery_fee: number
  free_delivery_products: number
  complaint_window_hours: number
}

export interface ShopCategory {
  id: number
  slug: string
  name: string
  name_fr?: string | null
  name_ar?: string | null
  icon: string | null
  cover: string | null
  products_count: number
}

export interface ShopSeller {
  id: number
  business_name: string
  avatar: string | null
  cover: string | null
  wilaya: string | null
  plan: PepperTier
  products_count: number
  followers: number
  rating: number | null
  reviews: number
}

export interface DealProduct extends ShopProduct {
  deal: {
    promotion_id: number
    is_flash_sale: boolean
    ends_at: string
    flash_stock: number | null
    flash_remaining: number | null
  }
}

export interface ShopOverview {
  stats: ShopStats
  categories: ShopCategory[]
  sellers: ShopSeller[]
  deals: DealProduct[]
}

/** A product card payload: catalogue (/api/products), feed rows and ads share this shape. */
export interface ShopProduct extends Omit<FeedProduct, 'seller' | 'is_sponsored' | 'placement' | 'promotion'> {
  is_sponsored?: boolean
  placement?: 'sponsored' | 'organic'
  promotion?: Partial<FeedPromotion> | null
  avg_rating?: number | null
  reviews_count?: number
  final_price?: number | null
  discount_percent?: number | null
  promo_type?: 'flash_sale' | 'promotion' | null
  ends_at?: string | null
  is_pack?: boolean | null
  pack_quantity?: number | null
  variants?: { id: number; stock: number }[]
  seller?: { id?: number; name: string; business_name?: string | null; plan?: PepperTier | string } | null
}

export async function fetchShopOverview(signal?: AbortSignal): Promise<ShopOverview> {
  const res = await fetch(`${API_BASE}/shop/overview`, {
    headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
    signal,
  })
  if (!res.ok) throw new Error(`shop overview ${res.status}`)
  return (await res.json()).data
}

/** Category name in the visitor's language (falls back to the default name). */
export function categoryName(c: { name: string; name_fr?: string | null; name_ar?: string | null }, locale: string): string {
  if (locale === 'ar' && c.name_ar) return c.name_ar
  if (locale === 'fr' && c.name_fr) return c.name_fr
  return c.name
}

// ── Catalogue ────────────────────────────────────────────────────────────────

export const SHOP_SORTS = ['views', 'newest', 'price_asc', 'price_desc', 'rating'] as const
export type ShopSort = (typeof SHOP_SORTS)[number]
export const DEFAULT_SHOP_SORT: ShopSort = 'views'

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export async function fetchCatalogPage(query: URLSearchParams, signal?: AbortSignal): Promise<Paginated<ShopProduct>> {
  // Explicit sorts only (never `created_at`), so the listing is the same for everyone;
  // personal picks live in the "for you" row.
  const res = await fetch(`${API_BASE}/products?${query}`, {
    headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
    signal,
  })
  if (!res.ok) throw new Error(`products ${res.status}`)
  return (await res.json()).data
}

/** WearTounsi (platform brand) products — same card payload as the catalogue. */
export async function fetchBrandProducts(limit = 8, signal?: AbortSignal): Promise<ShopProduct[]> {
  const res = await fetch(`${API_BASE}/brand-products?in_stock=1&sort=views&per_page=${limit}`, {
    headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
    signal,
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data?.data ?? []
}
