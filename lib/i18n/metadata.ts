import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

/** generateMetadata for a page whose title is a plain message key. */
export function staticMeta(namespace: string, key = 'metaTitle') {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations(namespace)
    return { title: t(key) }
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '') + '/api'

/** Server-side JSON fetch in the visitor's language (short cache, never throws). */
export async function fetchLocalized<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json', 'Accept-Language': await getLocale() },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}
