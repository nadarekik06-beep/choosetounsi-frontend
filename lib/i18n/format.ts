// Locale-aware formatting for prices (DT), numbers, dates, relative time and plurals.
// Arabic keeps Western digits (0-9) via the `nu-latn` numbering system.

import { defaultLocale, isLocale, type Locale } from '@/i18n/config'

const INTL_TAG: Record<Locale, string> = {
  fr: 'fr-TN',
  ar: 'ar-TN-u-nu-latn',
  en: 'en-GB',
}

const CURRENCY: Record<Locale, string> = { fr: 'DT', ar: 'د.ت', en: 'DT' }

const TIME_ZONE = 'Africa/Tunis'

function tag(locale: string | undefined): string {
  return INTL_TAG[isLocale(locale) ? locale : defaultLocale]
}

type Numeric = number | string | null | undefined

function toNumber(value: Numeric): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function currencyLabel(locale: string): string {
  return CURRENCY[isLocale(locale) ? locale : defaultLocale]
}

export function formatNumber(value: Numeric, locale: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(tag(locale), options).format(toNumber(value))
}

export interface PriceOptions {
  /** Fraction digits shown (default: always 2). */
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  /** Drop the currency label and return the bare amount. */
  bare?: boolean
}

/** 1234.5 → "1 234,50 DT" (fr) · "1,234.50 DT" (en) · "1.234,50 د.ت" (ar) */
export function formatPrice(value: Numeric, locale: string, options: PriceOptions = {}): string {
  const { minimumFractionDigits = 2, bare } = options
  const maximumFractionDigits = Math.max(options.maximumFractionDigits ?? 2, minimumFractionDigits)
  const amount = formatNumber(value, locale, { minimumFractionDigits, maximumFractionDigits })
  return bare ? amount : `${amount} ${currencyLabel(locale)}`
}

export type DateStyle = 'short' | 'medium' | 'long' | 'full' | 'datetime' | 'time' | 'monthYear' | 'dayMonth'

const DATE_PRESETS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short:     { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium:    { day: 'numeric', month: 'short', year: 'numeric' },
  long:      { day: 'numeric', month: 'long', year: 'numeric' },
  full:      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  datetime:  { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  time:      { hour: '2-digit', minute: '2-digit' },
  monthYear: { month: 'long', year: 'numeric' },
  dayMonth:  { weekday: 'long', day: 'numeric', month: 'long' },
}

type DateInput = Date | string | number | null | undefined

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value: DateInput, locale: string, style: DateStyle | Intl.DateTimeFormatOptions = 'medium'): string {
  const d = toDate(value)
  if (!d) return ''
  const opts = typeof style === 'string' ? DATE_PRESETS[style] : style
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, ...opts }).format(d)
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

/** "il y a 3 heures" · "قبل 3 ساعات" · "3 hours ago" */
export function formatRelative(value: DateInput, locale: string, now: Date = new Date()): string {
  const d = toDate(value)
  if (!d) return ''
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(tag(locale), { numeric: 'auto' })
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return rtf.format(0, 'second')
}

/** CLDR plural category (Arabic has zero/one/two/few/many/other). */
export function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(tag(locale)).select(count)
}

/** Pick a form by CLDR category, falling back to `other`; `#` is replaced by the count.
 *  Prefer ICU plurals inside messages when the text lives in messages/*.json. */
export function plural(
  count: number,
  locale: string,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  const form = forms[pluralCategory(count, locale)] ?? forms.other
  return form.replace('#', formatNumber(count, locale))
}
