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
