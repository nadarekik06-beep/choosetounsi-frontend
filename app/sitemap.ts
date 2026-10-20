import type { MetadataRoute } from 'next'
import { API_BASE, SITE_ORIGIN } from '@/lib/constants'

export const revalidate = 3600

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' }[] = [
  { path: '/',                priority: 1,   changeFrequency: 'daily' },
  { path: '/shop',            priority: 0.9, changeFrequency: 'daily' },
  { path: '/deals',           priority: 0.8, changeFrequency: 'daily' },
  { path: '/discover',        priority: 0.7, changeFrequency: 'daily' },
  { path: '/brand',           priority: 0.6, changeFrequency: 'weekly' },
  { path: '/become-a-vendor', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact',         priority: 0.4, changeFrequency: 'weekly' },
  { path: '/privacy',         priority: 0.3, changeFrequency: 'weekly' },
  { path: '/terms',           priority: 0.3, changeFrequency: 'weekly' },
]

/** Category slugs from the API; the sitemap still lists the main pages if the API is down. */
async function categorySlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, { headers: { Accept: 'application/json' }, next: { revalidate } })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: { slug?: string }[] }
    return (json.data ?? []).map(c => c.slug).filter((s): s is string => !!s)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages = STATIC_PAGES.map(p => ({ url: `${SITE_ORIGIN}${p.path === '/' ? '' : p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }))
  const categories = (await categorySlugs()).map(slug => ({
    url: `${SITE_ORIGIN}/category/${encodeURIComponent(slug)}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7,
  }))
  return [...pages, ...categories]
}
