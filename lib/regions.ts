'use client'

/**
 * Governorates (cities) and delegations (districts) from the courier's lists
 * (Intigo, synced by the backend: GET /api/regions/cities,
 * /api/regions/cities/{id}/districts). Once they are available, addresses
 * must pick from them; before that the free-text fields apply.
 *
 * Cached for the page's lifetime: the lists change a few times a year.
 */

import { useCallback, useEffect, useState } from 'react'
import { API_BASE } from '@/lib/constants'

export interface RegionCity { id: number; name: string; name_ar: string | null; wilaya: string | null }
export interface RegionDistrict { id: number; name: string; name_ar: string | null }

let citiesCache: { available: boolean; cities: RegionCity[] } | null = null
let citiesPromise: Promise<{ available: boolean; cities: RegionCity[] }> | null = null
const districtsCache = new Map<number, RegionDistrict[]>()
const districtsPromises = new Map<number, Promise<RegionDistrict[]>>()
type CitiesState = { available: boolean; cities: RegionCity[] }
const citiesListeners = new Set<(c: CitiesState) => void>()   // mounted useRegions() hooks

export function loadCities(): Promise<{ available: boolean; cities: RegionCity[] }> {
  if (citiesCache) return Promise.resolve(citiesCache)
  citiesPromise ??= fetch(`${API_BASE}/regions/cities`, { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(json => {
      const loaded: CitiesState = { available: Boolean(json.available) && Array.isArray(json.data) && json.data.length > 0, cities: json.data ?? [] }
      citiesCache = loaded
      citiesListeners.forEach(l => l(loaded))
      return loaded
    })
    .catch(() => {
      citiesPromise = null   // try again next time; free-text fields meanwhile
      return { available: false, cities: [] }
    })
  return citiesPromise
}

export function loadDistricts(cityId: number): Promise<RegionDistrict[]> {
  const cached = districtsCache.get(cityId)
  if (cached) return Promise.resolve(cached)
  let p = districtsPromises.get(cityId)
  if (!p) {
    p = fetch(`${API_BASE}/regions/cities/${cityId}/districts`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(json => {
        const list: RegionDistrict[] = json.data ?? []
        districtsCache.set(cityId, list)
        return list
      })
      .catch(() => { districtsPromises.delete(cityId); return [] as RegionDistrict[] })
    districtsPromises.set(cityId, p)
  }
  return p
}

/** Last known availability (false until the lists are loaded). */
export const regionsRequired = (): boolean => citiesCache?.available ?? false

/**
 * { ready, available, cities, reload } — re-renders once the lists arrive.
 * reload() asks again after a failed load (e.g. the server said a city must be
 * picked); every mounted hook gets the lists when they arrive.
 */
export function useRegions() {
  const [state, setState] = useState(() => ({ ready: citiesCache !== null, available: citiesCache?.available ?? false, cities: citiesCache?.cities ?? [] }))
  useEffect(() => {
    let alive = true
    const listener = (c: CitiesState) => { if (alive) setState({ ready: true, available: c.available, cities: c.cities }) }
    citiesListeners.add(listener)
    loadCities().then(listener)
    return () => { alive = false; citiesListeners.delete(listener) }
  }, [])
  const reload = useCallback(() => loadCities(), [])
  return { ...state, reload }
}

export function useDistricts(cityId: number | null) {
  const [list, setList] = useState<RegionDistrict[]>(() => (cityId ? districtsCache.get(cityId) ?? [] : []))
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let alive = true
    if (!cityId) { setList([]); return }
    const cached = districtsCache.get(cityId)
    if (cached) { setList(cached); return }
    setLoading(true)
    loadDistricts(cityId).then(l => { if (alive) { setList(l); setLoading(false) } })
    return () => { alive = false }
  }, [cityId])
  return { districts: list, loading }
}

/** Name in the reader's language (Arabic when available, else the French/Latin name). */
export const regionLabel = (r: { name: string; name_ar: string | null }, locale: string) =>
  locale === 'ar' && r.name_ar ? r.name_ar : r.name
