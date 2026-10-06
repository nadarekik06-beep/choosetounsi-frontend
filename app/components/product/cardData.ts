// Shared shape and image list of the storefront product card (app/components/product/ProductCard.tsx).
//
// Every list endpoint (search, /api/products, home feed, ads, recommendations, deals,
// flash sales, favourites, brand) sends `card_images` (cover + one image per color,
// max 6) and `card_swatches` (one per color with images). Older payloads only have
// primary_image_url / variant_images, so those are read as a fallback.

import type { PricedProduct } from '@/app/components/promotions/ProductPrice'
import { resolveImageUrl } from '@/lib/dealsApi'

export interface CardSwatch {
  id: number
  name: string
  hex: string | null
  image: string
}

/** Anything a product grid renders: /api/products, search rows, feed / ad cards, favourites… */
export interface CardProduct extends PricedProduct {
  id: number
  name: string
  slug: string
  stock: number
  /** Paid placements (ad server): no label, but impressions / clicks are reported with the token. */
  is_sponsored?: boolean
  placement?: string
  sponsor_data?: { id: number; ai_ad_copy?: string | null; token?: string } | null
  ad_token?: string
  primary_image_url?: string | null
  variant_images?: string[]
  card_images?: string[]
  card_swatches?: CardSwatch[]
  /** search / by-ids rows */
  primary_image?: string | null | { url?: string; image_path?: string }
  /** favourites: the favourited color's image */
  image_url?: string | null
  avg_rating?: number | null
  reviews_count?: number
  /** Active variants; undefined = unknown (the card then sends the shopper to the product page). */
  variants?: { id: number; stock: number }[]
  seller?: { id?: number; name: string; business_name?: string | null; plan?: string | null; avatar?: string | null } | null
}

/** Max slides on a card (cover + colors); the backend already caps card_images at 6. */
export const MAX_CARD_IMAGES = 8

function primaryOf(p: CardProduct): string | null | undefined {
  if (p.image_url) return p.image_url
  if (p.primary_image_url) return p.primary_image_url
  const pi = p.primary_image
  if (typeof pi === 'string') return pi
  return pi?.url ?? pi?.image_path ?? null
}

/** Deduplicated, absolute image urls for the card slider; the cover is always first. */
export function cardImages(p: CardProduct): string[] {
  const out: string[] = []
  const add = (u: string | null | undefined) => {
    const url = resolveImageUrl(u ?? null)
    if (url && !out.includes(url)) out.push(url)
  }
  add(primaryOf(p))
  if (p.card_images?.length) p.card_images.forEach(add)
  else (p.variant_images ?? []).forEach(add)
  // A swatch's image is always reachable, even past the backend's cap
  ;(p.card_swatches ?? []).forEach(s => add(s.image))
  return out.slice(0, MAX_CARD_IMAGES)
}

export function cardSwatches(p: CardProduct): CardSwatch[] {
  return (p.card_swatches ?? [])
    .map(s => ({ ...s, image: resolveImageUrl(s.image) ?? s.image }))
    .filter(s => !!s.image)
}
