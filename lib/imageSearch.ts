// Search by photo: client side of POST /api/search/image (backend: SearchController::searchImage).
//
// The shopper picks or takes a photo, frames the item in a crop box (ImageSearchModal), and only
// that area is sent, resized to ≤ 512 px JPEG (a few dozen KB instead of a 5 MB phone photo).
// The result travels to /search?mode=image&t=… through sessionStorage, with the cropped photo,
// so a reload can search again (the backend caches results per photo for a few minutes).

import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const STORE_KEY = 'imageSearch'
export const MAX_SIDE = 512
export const OPEN_EVENT = 'open-image-search'

/** Crop box, as fractions of the (EXIF-rotated) photo: 0..1 */
export interface CropBox { x: number; y: number; w: number; h: number }

export interface PredictedCategory {
  id: number
  type: 'category' | 'subcategory'
  name: string
  slug: string
  category: { id: number; name: string; slug: string }
  confident: boolean
}

export interface ImageSearchResponse<P> {
  success: true
  search_id?: number
  count: number
  fallback: boolean
  predicted_category?: PredictedCategory
  sections: { exact: P[]; similar: P[] }
  message?: string
}

export type ImageSearchError = 'unavailable' | 'rate_limited' | 'unreadable' | 'failed'

export type ImageSearchOutcome<P> = { ok: true; data: ImageSearchResponse<P> } | { ok: false; error: ImageSearchError }

/** Auto-centered starting box: the middle 80 % of the photo. */
export const DEFAULT_BOX: CropBox = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

/** The boxed area of the photo as a JPEG blob, longest side ≤ MAX_SIDE. */
export function cropToBlob(img: HTMLImageElement, box: CropBox, maxSide = MAX_SIDE): Promise<Blob> {
  const sx = box.x * img.naturalWidth, sy = box.y * img.naturalHeight
  const sw = box.w * img.naturalWidth, sh = box.h * img.naturalHeight
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('no canvas'))
  ctx.fillStyle = '#fff'   // transparent PNGs go on white, as on the server
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.86))
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

export async function searchByPhoto<P>(blob: Blob): Promise<ImageSearchOutcome<P>> {
  const form = new FormData()
  form.append('image', blob, 'photo.jpg')
  try {
    const res = await fetch(`${API_URL}/api/search/image`, {
      method: 'POST', body: form,
      headers: { Accept: 'application/json' },   // Accept-Language: added by clientLocale's fetch patch
    })
    if (res.ok) return { ok: true, data: await res.json() }
    if (res.status === 503) return { ok: false, error: 'unavailable' }
    if (res.status === 429) return { ok: false, error: 'rate_limited' }
    if (res.status === 422) return { ok: false, error: 'unreadable' }
    return { ok: false, error: 'failed' }
  } catch {
    return { ok: false, error: 'unavailable' }
  }
}

export async function fetchPhotoSearchAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/search/image/status`, { headers: { Accept: 'application/json' } })
    return res.ok ? !!(await res.json()).available : false
  } catch {
    return false
  }
}

/** Camera button state: null while unknown (shown as usable), re-checked on demand. */
export function usePhotoSearchAvailable(): [boolean | null, () => Promise<boolean>] {
  const [available, setAvailable] = useState<boolean | null>(null)
  const recheck = useCallback(async () => {
    const ok = await fetchPhotoSearchAvailable()
    setAvailable(ok)
    return ok
  }, [])
  useEffect(() => {
    let live = true
    fetchPhotoSearchAvailable().then(ok => { if (live) setAvailable(ok) })
    return () => { live = false }
  }, [])
  return [available, recheck]
}

/** Which result was opened (first click per search; tunes the thresholds). */
export function logPhotoSearchClick(searchId: number | undefined, productId: number, rank: number) {
  if (!searchId) return
  fetch(`${API_URL}/api/search/image/click`, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ search_id: searchId, product_id: productId, rank }),
  }).catch(() => {})
}

export interface StoredPhotoSearch<P> { t: string; preview: string; result?: ImageSearchResponse<P> }

export function savePhotoSearch<P>(entry: StoredPhotoSearch<P>) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(entry)) } catch {
    // Quota: keep at least the photo, the results page searches again
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ t: entry.t, preview: entry.preview })) } catch { /* private mode */ }
  }
}

export function loadPhotoSearch<P>(t: string | null): StoredPhotoSearch<P> | null {
  try {
    const entry = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as StoredPhotoSearch<P> | null
    return entry && (!t || entry.t === t) ? entry : null
  } catch {
    return null
  }
}

/** Opens the photo picker from anywhere (the Navbar listens). */
export function openPhotoSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}
