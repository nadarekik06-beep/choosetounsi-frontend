// Gender browsing for gendered categories (Mode & Vêtements → Femme / Homme).
// Data comes from the backend: GET /categories/mega-menu and /categories/{slug}/subcategory-bar.

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/constants'

export type Gender = 'women' | 'men'
export const GENDERS: Gender[] = ['women', 'men']

/** ?gender= value → Gender, anything else → '' (no gender selected). */
export function parseGender(v: string | null | undefined): Gender | '' {
  return v === 'women' || v === 'men' ? v : ''
}

type Localized = { name: string; name_fr?: string | null; name_ar?: string | null }

/** DB names: name is English, name_fr / name_ar the translations. */
export function localName(item: Localized, locale: string): string {
  if (locale === 'fr' && item.name_fr) return item.name_fr
  if (locale === 'ar' && item.name_ar) return item.name_ar
  return item.name
}

export interface GenderMenuItem extends Localized { id: number; slug: string; category_slug: string; count?: number }
export interface GenderMenuGroup extends Localized { key: string; items: GenderMenuItem[] }
/** One category of the admin-managed mega-menu (only subcategories with products are listed). */
export interface GenderMenuCategory extends Localized {
  id: number; slug: string
  // Optional: missing from the older API (gendered categories only), so both shapes keep working
  is_gendered?: boolean
  has_products?: boolean
  product_count?: number
  /** false only when the admin hides empty categories; missing from older APIs */
  show_in_menu?: boolean
  /** Gendered categories (Mode & Vêtements): Femme / Homme columns */
  genders?: Record<Gender, GenderMenuGroup[]>
  /** Other categories: one set of columns */
  groups?: GenderMenuGroup[]
}
/** One icon of the subcategory bar shown on every category page. */
export interface SubcategoryBarItem extends Localized {
  id: number; slug: string
  count: number; image: string | null; image_source: 'admin' | 'product' | null
}

// One request per page load, shared by the navbar and the category page
let menuPromise: Promise<GenderMenuCategory[]> | null = null
function loadMenu(): Promise<GenderMenuCategory[]> {
  if (!menuPromise) {
    menuPromise = fetch(`${API_BASE}/categories/mega-menu`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => (Array.isArray(j.data) ? j.data : []))
      .catch(() => { menuPromise = null; return [] })
  }
  return menuPromise
}

/** Mega-menu of every active category (null while loading, [] if the request failed). */
export function useMegaMenu(): GenderMenuCategory[] | null {
  const [data, setData] = useState<GenderMenuCategory[] | null>(null)
  useEffect(() => {
    let alive = true
    loadMenu().then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])
  return data
}

// Bars already loaded this session: back / forward and revisits show at once
const barCache = new Map<string, SubcategoryBarItem[]>()

/**
 * Subcategory bar of any category, fetched from the slug in the URL (GET /categories/{slug}/subcategory-bar).
 * ?gender only counts on gendered categories (the backend ignores it elsewhere); empty subcategories are left out.
 */
export function useSubcategoryBar(categorySlug: string, gender: Gender | ''): { items: SubcategoryBarItem[]; loading: boolean } {
  const key = categorySlug ? `${categorySlug}:${gender}` : ''
  const [state, setState] = useState<{ key: string; items: SubcategoryBarItem[] }>(() =>
    ({ key: barCache.has(key) ? key : '', items: barCache.get(key) ?? [] }))

  useEffect(() => {
    if (!key) return
    const hit = barCache.get(key)
    if (hit) { setState({ key, items: hit }); return }
    let alive = true
    const qs = gender ? `?gender=${gender}` : ''
    fetch(`${API_BASE}/categories/${encodeURIComponent(categorySlug)}/subcategory-bar${qs}`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => {
        const items: SubcategoryBarItem[] = Array.isArray(j.data) ? j.data : []
        barCache.set(key, items)
        if (alive) setState({ key, items })
      })
      .catch(() => { if (alive) setState({ key, items: [] }) })
    return () => { alive = false }
  }, [key, categorySlug, gender])

  const ready = state.key === key
  return { items: ready ? state.items : [], loading: !!key && !ready }
}

/** Category page link with gender (and optional subcategory) preselected. */
export function genderHref(categorySlug: string, gender: Gender, sub?: string): string {
  const qp = new URLSearchParams()
  if (sub) qp.set('sub', sub)
  qp.set('gender', gender)
  return `/category/${categorySlug}?${qp}`
}
