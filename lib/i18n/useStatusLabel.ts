'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

/** Translated order / payment status label; unknown codes are shown as sent by the API. */
export function useStatusLabel(namespace: 'orderStatus' | 'paymentStatus' = 'orderStatus') {
  const t = useTranslations(namespace)
  return useCallback(
    (status: string | null | undefined) => (status && t.has(status) ? t(status) : (status ?? '')),
    [t],
  )
}
