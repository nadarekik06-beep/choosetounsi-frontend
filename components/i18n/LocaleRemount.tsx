'use client'

import { Fragment, useState, type ReactNode } from 'react'
import { isLocaleRemountHeld } from '@/lib/i18n/localeRemount'

/**
 * Keyed by locale: switching language remounts the page so it refetches API content in the
 * new language. Skipped while a form holds it (lib/i18n/localeRemount): the page then stays
 * mounted and reloads what it needs itself.
 */
export default function LocaleRemount({ locale, children }: { locale: string; children: ReactNode }) {
  const [seen, setSeen] = useState(locale)
  const [key, setKey] = useState(locale)
  if (seen !== locale) {
    setSeen(locale)
    if (!isLocaleRemountHeld()) setKey(locale)
  }
  return <Fragment key={key}>{children}</Fragment>
}
