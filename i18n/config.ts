// Shared locale config — safe to import from server, client and proxy code.

export const locales = ['fr', 'ar', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'
export const LOCALE_COOKIE = 'NEXT_LOCALE'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export const localeLabels: Record<Locale, { native: string; short: string }> = {
  fr: { native: 'Français', short: 'FR' },
  ar: { native: 'العربية', short: 'AR' },
  en: { native: 'English', short: 'EN' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale
  const ranked = acceptLanguage
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find(p => p.trim().startsWith('q='))
      return { lang: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) || 0 : 1 }
    })
    .sort((a, b) => b.q - a.q)
  return ranked.find(r => isLocale(r.lang))?.lang as Locale ?? defaultLocale
}
