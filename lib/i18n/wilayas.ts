'use client'

import { useCallback } from 'react'
import { useLocale } from 'next-intl'

// The stored value stays the canonical (French) name the backend expects;
// only the label shown to the user changes with the locale.
export const WILAYAS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
] as const

const WILAYAS_AR: Record<string, string> = {
  'Ariana': 'أريانة', 'Béja': 'باجة', 'Ben Arous': 'بن عروس', 'Bizerte': 'بنزرت',
  'Gabès': 'قابس', 'Gafsa': 'قفصة', 'Jendouba': 'جندوبة', 'Kairouan': 'القيروان',
  'Kasserine': 'القصرين', 'Kébili': 'قبلي', 'Le Kef': 'الكاف', 'Mahdia': 'المهدية',
  'La Manouba': 'منوبة', 'Médenine': 'مدنين', 'Monastir': 'المنستير', 'Nabeul': 'نابل',
  'Sfax': 'صفاقس', 'Sidi Bouzid': 'سيدي بوزيد', 'Siliana': 'سليانة', 'Sousse': 'سوسة',
  'Tataouine': 'تطاوين', 'Tozeur': 'توزر', 'Tunis': 'تونس', 'Zaghouan': 'زغوان',
}

export function wilayaLabel(value: string, locale: string): string {
  return locale === 'ar' ? (WILAYAS_AR[value] ?? value) : value
}

/** Returns a formatter that turns a stored wilaya value into its localized label. */
export function useWilayaLabel() {
  const locale = useLocale()
  return useCallback((value: string) => wilayaLabel(value, locale), [locale])
}
