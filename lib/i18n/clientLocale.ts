// Client-side access to the active locale + Accept-Language on every API call.

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, defaultLocale, dirOf, isLocale, type Locale } from '@/i18n/config'

export function currentLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale
  const lang = document.documentElement.lang
  if (isLocale(lang)) return lang
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))
  return match && isLocale(match[1]) ? match[1] : defaultLocale
}

export function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
  const html = document.documentElement
  html.lang = locale
  html.dir = dirOf(locale)
}

function apiOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').origin
  } catch {
    return null
  }
}

function isApiRequest(url: string): boolean {
  if (url.startsWith('/api/')) return true // Next route handlers that proxy to Laravel
  const origin = apiOrigin()
  return !!origin && url.startsWith(origin)
}

let installed = false

/** Patch window.fetch once so every call to the Laravel API carries Accept-Language. */
export function installLocaleFetch() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!isApiRequest(url)) return nativeFetch(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (!headers.has('Accept-Language')) headers.set('Accept-Language', currentLocale())
    return nativeFetch(input, { ...init, headers })
  }
}

// Fallback error texts for plain (non-React) API helpers, when the server sent no message.
const FALLBACK_ERRORS: Record<Locale, { network: string; request: string }> = {
  fr: { network: 'Connexion impossible. Vérifiez votre réseau.', request: 'La requête a échoué. Veuillez réessayer.' },
  ar: { network: 'تعذّر الاتصال. تحقّق من الشبكة.', request: 'فشل الطلب. يرجى المحاولة مرة أخرى.' },
  en: { network: 'Unable to connect.', request: 'Request failed. Please try again.' },
}

export function fallbackError(kind: 'network' | 'request'): string {
  return FALLBACK_ERRORS[currentLocale()][kind]
}
