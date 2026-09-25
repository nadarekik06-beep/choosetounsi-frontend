'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
  currencyLabel, formatDate, formatNumber, formatPrice, formatRelative, plural,
  type DateStyle, type PriceOptions,
} from './format'

type Numeric = number | string | null | undefined
type DateInput = Date | string | number | null | undefined

/** Formatting helpers bound to the active locale. */
export function useFormat() {
  const locale = useLocale()
  return useMemo(() => ({
    locale,
    isRtl:    locale === 'ar',
    currency: currencyLabel(locale),
    price:    (value: Numeric, options?: PriceOptions) => formatPrice(value, locale, options),
    number:   (value: Numeric, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
    date:     (value: DateInput, style?: DateStyle | Intl.DateTimeFormatOptions) => formatDate(value, locale, style),
    relative: (value: DateInput) => formatRelative(value, locale),
    plural:   (count: number, forms: Parameters<typeof plural>[2]) => plural(count, locale, forms),
  }), [locale])
}
