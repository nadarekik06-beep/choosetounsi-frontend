'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from './useFormat'

/**
 * Localized plan price labels. planMeta().priceLabel is English-only ("49 DT/month"),
 * so seller screens format meta.price with this instead.
 */
export function usePlanPrice() {
  const t = useTranslations('plans')
  const { price } = useFormat()
  const amount = useCallback((value: number) => price(value, { minimumFractionDigits: 0, maximumFractionDigits: 1 }), [price])
  return {
    /** "Gratuit" · "49 DT/mois" */
    label: useCallback((value: number) => (value === 0 ? t('free') : t('perMonth', { amount: amount(value) })), [t, amount]),
    /** "Gratuit" · "49 DT" */
    short: useCallback((value: number) => (value === 0 ? t('free') : amount(value)), [t, amount]),
  }
}
