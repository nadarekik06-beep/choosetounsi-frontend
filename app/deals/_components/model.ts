// /deals: one list of offers (products + packs), the filters that live in the URL,
// and the ordering. Pure functions only; the page wires them to state.

import { promoPricing } from '@/app/components/promotions/ProductPrice'
import type { DealsData, DealsPack, DealsProduct } from '@/lib/dealsApi'

export type OfferType = 'flash' | 'promo' | 'pack' | 'coupon'
export type TypeFilter = 'all' | OfferType
export const OFFER_TYPES: OfferType[] = ['flash', 'promo', 'pack', 'coupon']

export const SORT_KEYS = ['recommended', 'savings', 'price_asc', 'price_desc', 'newest'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const DISCOUNT_STEPS = [10, 20, 30, 50]

export interface DealFilters {
  type: TypeFilter
  sort: SortKey
  cats: number[]
  min: number | null
  max: number | null
  /** Minimum discount, percent (0 = any). */
  disc: number
}

export type Facet = 'type' | 'cats' | 'price' | 'disc'

export const DEFAULT_FILTERS: DealFilters = { type: 'all', sort: 'recommended', cats: [], min: null, max: null, disc: 0 }

const ids = (v: string | null) => (v ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)
const num = (v: string | null) => (v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null)

/** ?type=flash&sort=savings&cat=3,7&min=10&max=80&disc=20 → filters (unknown values fall back to defaults). */
export function parseQuery(q: URLSearchParams): DealFilters {
  const type = q.get('type') as TypeFilter
  const sort = q.get('sort') as SortKey
  return {
    type: type && (OFFER_TYPES as string[]).includes(type) ? type : 'all',
    sort: sort && (SORT_KEYS as readonly string[]).includes(sort) ? sort : 'recommended',
    cats: ids(q.get('cat')),
    min: num(q.get('min')),
    max: num(q.get('max')),
    disc: DISCOUNT_STEPS.includes(Number(q.get('disc'))) ? Number(q.get('disc')) : 0,
  }
}

/** Filters → query string, defaults left out so a plain /deals stays plain. */
export function toQuery(f: DealFilters): string {
  const q = new URLSearchParams()
  if (f.type !== 'all') q.set('type', f.type)
  if (f.sort !== 'recommended') q.set('sort', f.sort)
  if (f.cats.length) q.set('cat', f.cats.join(','))
  if (f.min !== null) q.set('min', String(f.min))
  if (f.max !== null) q.set('max', String(f.max))
  if (f.disc) q.set('disc', String(f.disc))
  return q.toString()
}

/** Filters the shopper chose (sort and the offer type tab are not counted). */
export function activeFilterCount(f: DealFilters): number {
  return f.cats.length + (f.min !== null || f.max !== null ? 1 : 0) + (f.disc ? 1 : 0)
}

// ── Items ────────────────────────────────────────────────────────────────────

export interface DealItem {
  key: string
  /** Offers on this item, the one shown on the badge first. */
  offers: OfferType[]
  price: number
  original: number
  /** Real price reduction, percent (promotion or pack). */
  percent: number
  /** Best of the price reduction and the coupon's percentage (the "minimum discount" filter). */
  bestPercent: number
  endsAt: number | null
  categoryId: number | null
  categoryName: { name: string; name_fr?: string | null; name_ar?: string | null } | null
  created: number
  views: number
  product?: DealsProduct
  pack?: DealsPack
}

export function buildItems(data: DealsData): DealItem[] {
  const products = data.products.map<DealItem>(p => {
    const pr = promoPricing(p)
    const offers: OfferType[] = []
    if (p.deal && pr.hasDiscount) offers.push(p.deal.is_flash_sale ? 'flash' : 'promo')
    if (p.coupon) offers.push('coupon')
    const couponPercent = !p.coupon ? 0
      : p.coupon.discount_type === 'percentage' ? p.coupon.discount_value
      : pr.final > 0 ? Math.round((p.coupon.discount_value / pr.final) * 100) : 0
    return {
      key: `p-${p.id}`,
      offers,
      price: pr.final,
      original: pr.original,
      percent: pr.percent,
      bestPercent: Math.max(pr.percent, couponPercent),
      endsAt: p.deal?.ends_at ? new Date(p.deal.ends_at).getTime() : null,
      categoryId: p.category_id,
      categoryName: p.category,
      created: p.created_at ? new Date(p.created_at).getTime() : 0,
      views: p.views ?? 0,
      product: p,
    }
  }).filter(i => i.offers.length > 0)

  const packs = data.packs.map<DealItem>(pack => ({
    key: `k-${pack.id}`,
    offers: ['pack'],
    price: pack.pack_price,
    original: pack.original_price,
    percent: pack.discount_percent,
    bestPercent: pack.discount_percent,
    endsAt: null,
    categoryId: pack.category_id,
    categoryName: null,
    created: pack.created_at ? new Date(pack.created_at).getTime() : 0,
    views: 0,
    pack,
  }))

  return [...products, ...packs]
}

/** Does the item pass every filter except `skip` (facet counts ignore their own facet)? */
export function matches(i: DealItem, f: DealFilters, skip?: Facet): boolean {
  if (skip !== 'type' && f.type !== 'all' && !i.offers.includes(f.type)) return false
  if (skip !== 'cats' && f.cats.length && (i.categoryId === null || !f.cats.includes(i.categoryId))) return false
  if (skip !== 'price') {
    if (f.min !== null && i.price < f.min) return false
    if (f.max !== null && i.price > f.max) return false
  }
  if (skip !== 'disc' && f.disc && i.bestPercent < f.disc) return false
  return true
}

/**
 * recommended: flash sales ending soonest first, then the biggest savings
 * (offers in the shopper's interest categories boosted), then the rest by popularity.
 */
export function sortItems(items: DealItem[], sort: SortKey, interests: number[]): DealItem[] {
  const boost = (i: DealItem) => {
    const at = i.categoryId === null ? -1 : interests.indexOf(i.categoryId)
    return at < 0 ? 0 : 30 - Math.min(at, 10) * 2
  }
  const arr = [...items]
  switch (sort) {
    case 'savings':    return arr.sort((a, b) => b.bestPercent - a.bestPercent || (b.original - b.price) - (a.original - a.price))
    case 'price_asc':  return arr.sort((a, b) => a.price - b.price)
    case 'price_desc': return arr.sort((a, b) => b.price - a.price)
    case 'newest':     return arr.sort((a, b) => b.created - a.created)
    default:
      return arr.sort((a, b) => {
        const fa = a.offers[0] === 'flash', fb = b.offers[0] === 'flash'
        if (fa !== fb) return fa ? -1 : 1
        if (fa && fb) return (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity)
        const sa = a.percent > 0 ? a.percent + boost(a) : -1
        const sb = b.percent > 0 ? b.percent + boost(b) : -1
        if (sa !== sb) return sb - sa
        return boost(b) - boost(a) || b.views - a.views
      })
  }
}
