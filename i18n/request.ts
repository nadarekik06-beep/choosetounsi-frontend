import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, defaultLocale, isLocale, negotiateLocale, type Locale } from './config'
import fr from '../messages/fr.json'

type Messages = Record<string, unknown>

// Missing keys fall back to French: the locale's messages are layered on top of fr.json.
function mergeDeep(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const prev = out[key]
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && prev && typeof prev === 'object'
        ? mergeDeep(prev as Messages, value as Messages)
        : value
  }
  return out
}

export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie
  return negotiateLocale((await headers()).get('accept-language'))
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()
  const messages =
    locale === defaultLocale
      ? (fr as Messages)
      : mergeDeep(fr as Messages, (await import(`../messages/${locale}.json`)).default as Messages)

  return {
    locale,
    messages,
    timeZone: 'Africa/Tunis',
    // A key missing in every file should never crash a page — show the key path instead.
    onError(error) {
      if (process.env.NODE_ENV !== 'production') console.warn('[i18n]', error.message)
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join('.')
    },
  }
})
