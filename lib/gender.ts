// Gender browsing for gendered categories (Mode & Vêtements → Femme / Homme).
// Data comes from the backend: GET /categories/mega-menu and /categories/{slug}/gender-bar.

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

export interface GenderMenuItem extends Localized { id: number; slug: string; category_slug: string }
export interface GenderMenuGroup extends Localized { key: string; items: GenderMenuItem[] }
export interface GenderMenuCategory extends Localized {
  id: number; slug: string
  genders: Record<Gender, GenderMenuGroup[]>
}
export interface GenderBarItem extends Localized {
  id: number; slug: string; category_slug: string
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

/** Gendered categories with their Femme / Homme columns; null while loading. */
export function useGenderMenu(): GenderMenuCategory[] | null {
  const [data, setData] = useState<GenderMenuCategory[] | null>(null)
  useEffect(() => {
    let alive = true
    loadMenu().then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])
  return data
}

/** Subcategory bar of a gendered category × gender (empty subcategories already left out). */
export function useGenderBar(categorySlug: string, gender: Gender | ''): { items: GenderBarItem[]; loading: boolean } {
  const [state, setState] = useState<{ key: string; items: GenderBarItem[] }>({ key: '', items: [] })
  const key = gender && categorySlug ? `${categorySlug}:${gender}` : ''

  useEffect(() => {
    if (!key) return
    let alive = true
    fetch(`${API_BASE}/categories/${encodeURIComponent(categorySlug)}/gender-bar?gender=${gender}`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => { if (alive) setState({ key, items: Array.isArray(j.data) ? j.data : [] }) })
      .catch(() => { if (alive) setState({ key, items: [] }) })
    return () => { alive = false }
  }, [key, categorySlug, gender])

  return { items: state.key === key ? state.items : [], loading: !!key && state.key !== key }
}

/** Category page link with gender (and optional subcategory) preselected. */
export function genderHref(categorySlug: string, gender: Gender, sub?: string): string {
  const qp = new URLSearchParams()
  if (sub) qp.set('sub', sub)
  qp.set('gender', gender)
  return `/category/${categorySlug}?${qp}`
}
