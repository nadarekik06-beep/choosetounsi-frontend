/**
 * Text direction of a chat message, decided by the text itself.
 *
 * Only Arabic-script text (Tunisian Arabic, MSA) is right-to-left. Arabizi (Tunisian in Latin
 * letters and digits), French and English are left-to-right, even when the storefront
 * language is Arabic and the page itself is RTL.
 */
export type ChatDir = 'rtl' | 'ltr'

export function textDir(text: string | null | undefined): ChatDir {
  const s = text ?? ''
  const arabic = (s.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) ?? []).length
  const latin = (s.match(/[A-Za-zÀ-ɏ]/g) ?? []).length

  return arabic > latin ? 'rtl' : 'ltr'
}

/**
 * Language of the product cards under a chat reply: they follow the SCRIPT of the reply, not the storefront
 * language. "107 DT" next to Arabizi / French / English text, "د.ت" only next to Arabic script.
 */
export function cardLang(text: string | null | undefined, dialect?: string | null, lang?: string | null): 'ar' | 'fr' | 'en' {
  if (textDir(text) === 'rtl') return 'ar'
  if (dialect === 'en' || (!dialect && lang === 'en')) return 'en'
  return 'fr'
}
