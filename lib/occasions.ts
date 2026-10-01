'use client'

/**
 * Season / Occasion tags (backend: App\Support\Occasions, product_occasions pivot).
 * Labels live in the `occasions` message namespace. Which categories use them comes
 * from GET /api/product-occasions so the list is only maintained on the backend.
 */

import { useEffect, useState } from 'react'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')

export const OCCASIONS = [
  { value: 'all_season',     emoji: '🌍' },
  { value: 'summer',         emoji: '☀️' },
  { value: 'winter',         emoji: '❄️' },
  { value: 'ramadan',        emoji: '🌙' },
  { value: 'aid',            emoji: '🎉' },
  { value: 'back_to_school', emoji: '📚' },
  { value: 'wedding_season', emoji: '💍' },
] as const

export type Occasion = typeof OCCASIONS[number]['value']
export const DEFAULT_OCCASION: Occasion = 'all_season'
const VALUES = OCCASIONS.map(o => o.value) as readonly string[]

export const isOccasion = (v: unknown): v is Occasion => typeof v === 'string' && VALUES.includes(v)

/** Known values only; all_season is exclusive and the fallback (mirrors the backend). */
export function normalizeOccasions(raw: unknown): Occasion[] {
  const picked = (Array.isArray(raw) ? raw : []).filter(isOccasion)
  const specific = VALUES.filter(v => v !== DEFAULT_OCCASION && picked.includes(v as Occasion)) as Occasion[]
  return specific.length ? specific : [DEFAULT_OCCASION]
}

let cache: Promise<string[]> | null = null

/** Category slugs that use occasions (null while loading). */
export function useOccasionCategories(): string[] | null {
  const [slugs, setSlugs] = useState<string[] | null>(null)
  useEffect(() => {
    cache ??= fetch(`${ORIGIN}/api/product-occasions`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(j => (j?.data?.category_slugs ?? []) as string[])
      .catch(() => { cache = null; return [] })
    let alive = true
    cache.then(s => { if (alive) setSlugs(s) })
    return () => { alive = false }
  }, [])
  return slugs
}
