// GET /api/home/feed — every homepage section in one response, deduplicated server-side.

import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { identityHeaders } from '@/lib/tracking'

export interface FeedPromotion {
  id: number
  type: 'flash_sale' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  is_flash_sale: boolean
}

export interface FeedProduct {
  id: number
  name: string
  slug: string
  price: string | number
  stock: number
  category_id?: number | null
  seller_id?: number | null
  is_sponsored: boolean
  placement: 'sponsored' | 'organic'
  sponsored_priority?: number
  sponsor_data?: { id: number; ai_ad_copy?: string | null } | null
  primary_image_url?: string | null
  variant_images?: string[]
  effective_price?: number | null
  original_price?: number | null
  discount_amount?: number | null
  promotion?: FeedPromotion | null
  category?: { id: number; name: string; name_fr?: string | null; name_ar?: string | null; slug: string } | null
  seller?: { id: number; name: string; business_name?: string | null } | null
}

export type FeedSectionType =
  | 'recommended' | 'sponsored' | 'trending' | 'best_sellers' | 'similar' | 'favorites'
  | 'favorite_sellers' | 'recently_viewed' | 'new_arrivals' | 'top_rated' | 'popular_in_category'

export interface FeedSellerBadge {
  id: number
  business_name?: string | null
  avatar?: string | null
  plan: 'free' | 'red' | 'black' | string
  followed: boolean
}

export interface FeedSection {
  key: string
  type: FeedSectionType
  meta: {
    category?: { id: number; slug: string; name: string; name_fr?: string | null; name_ar?: string | null }
    sellers?: FeedSellerBadge[]
  }
  products: FeedProduct[]
}

export interface HomeFeed {
  success: boolean
  personalized: boolean
  profile_state: 'warm' | 'cold'
  catalog_mode?: 'small' | 'standard'
  generated_at: string
  sections: FeedSection[]
}

export async function fetchHomeFeed(signal?: AbortSignal): Promise<HomeFeed> {
  const res = await fetch(`${API_BASE}/home/feed`, {
    headers: { Accept: 'application/json', 'Accept-Language': currentLocale(), ...identityHeaders() },
    signal,
  })
  if (!res.ok) throw new Error(`home feed ${res.status}`)
  return res.json()
}
