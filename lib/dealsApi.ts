// Data for the /deals page.
//   GET /api/deals     — products under a promotion or coupon, packs, the shopper's interest categories
//   GET /api/products  — "Vous aimerez aussi" fill (same category / shop as the visible deals)

import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { identityHeaders } from '@/lib/tracking'
import type { DealProduct, PepperTier, ShopProduct } from '@/lib/shopPageApi'

export interface DealCoupon {
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number | null
}

/** A product card with its promotion (`deal`, null for coupon-only products) and best coupon. */
export interface DealsProduct extends Omit<DealProduct, 'deal'> {
  deal: DealProduct['deal'] | null
  coupon: DealCoupon | null
  category_id: number | null
  category: { id: number; name: string; name_fr?: string | null; name_ar?: string | null; slug: string } | null
  views: number
  created_at: string | null
}

export interface DealsPack {
  id: number
  name: string
  slug: string
  short_description: string | null
  image_url: string | null
  pack_price: number
  original_price: number
  savings: number
  discount_percent: number
  items_count: number
  available_stock: number
  category_id: number | null
  created_at: string | null
  seller: { id: number; name: string; business_name?: string | null; plan?: PepperTier | string; avatar?: string | null } | null
  items: { id: number; quantity: number; product: { name: string; primary_image_url: string | null } | null }[]
}

export interface DealsData {
  products: DealsProduct[]
  packs: DealsPack[]
  interest_category_ids: number[]
}

export async function fetchDeals(signal?: AbortSignal): Promise<DealsData> {
  const res = await fetch(`${API_BASE}/deals`, {
    headers: { Accept: 'application/json', 'Accept-Language': currentLocale(), ...identityHeaders() },
    signal,
  })
  if (!res.ok) throw new Error(`deals ${res.status}`)
  return (await res.json()).data
}

/** Popular in-stock products for one category or shop (empty on any error). */
export async function fetchPopular(params: { category_id?: number; seller_id?: number; per_page?: number }, signal?: AbortSignal): Promise<ShopProduct[]> {
  const q = new URLSearchParams({ sort: 'views', in_stock: '1', per_page: String(params.per_page ?? 12) })
  if (params.category_id) q.set('category_id', String(params.category_id))
  if (params.seller_id) q.set('seller_id', String(params.seller_id))
  try {
    const res = await fetch(`${API_BASE}/products?${q}`, {
      headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
      signal,
    })
    if (!res.ok) return []
    return (await res.json()).data?.data ?? []
  } catch {
    return []
  }
}

/** Absolute image URL (the API normally sends absolute URLs; older rows may hold a storage path). */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  const origin = API_BASE.replace(/\/api\/?$/, '')
  return `${origin}/storage/${url.replace(/^\/?storage\//, '').replace(/^\//, '')}`
}
