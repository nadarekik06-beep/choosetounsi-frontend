'use client'

/**
 * Delivery estimate (product page + quick view). All the dates come from lib/deliveryEstimate.ts;
 * this file only renders them. Wording is an ESTIMATE, never a promise. Nothing internal
 * (pickup delays, courier, fees) is shown. The city only appears when it comes from the
 * logged-in customer's own saved address.
 *
 * Computed after mount (it depends on the clock): server render and first client render are the same
 * stable placeholder, so there is no hydration mismatch.
 */

import { useLocale, useTranslations } from 'next-intl'
import { formatDeliveryDate } from '@/lib/deliveryEstimate'
import { useDeliveryEstimate, useSavedCity } from './useDeliveryEstimate'

const TEAL = '#0f766e'

function Truck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

/** "Sur commande" badge + "Préparé en N jours ouvrables", shown ABOVE the estimate (which already includes it). */
export function MadeToOrderInfo({ preparationDays, compact = false }: { preparationDays: number; compact?: boolean }) {
  const t = useTranslations('deliveryEstimate')
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: compact ? 6 : 8, marginBottom: 8 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: compact ? '2px 9px' : '3px 11px', borderRadius: 999,
        background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 800, fontSize: compact ? 11 : 12, lineHeight: 1.4,
      }}>
        {t('madeToOrder')}
      </span>
      <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#475569' }}>{t('readyIn', { days: preparationDays })}</span>
    </div>
  )
}

export default function DeliveryEstimateBox({ preparationDays, compact = false }: {
  /** null / 0 for regular products */
  preparationDays?: number | null
  /** Quick view: tighter paddings */
  compact?: boolean
}) {
  const t = useTranslations('deliveryEstimate')
  const locale = useLocale()
  const live = useDeliveryEstimate(preparationDays)
  const city = useSavedCity()

  const pad = compact ? '10px 12px' : '12px 14px'

  if (!live) {
    // Same markup on the server and on the first client render
    return <div aria-hidden="true" style={{ minHeight: compact ? 78 : 88, borderRadius: 12, background: '#f0fdfa', border: '1px solid #ccfbf1' }} />
  }

  const { estimate: e, minutesToCutoff } = live
  const from = formatDeliveryDate(e.deliveryMin, locale)
  const to = formatDeliveryDate(e.deliveryMax, locale)
  const sameDay = e.deliveryMin === e.deliveryMax

  const headline = sameDay
    ? (city ? t('estimatedSingleCity', { date: from, city }) : t('estimatedSingle', { date: from }))
    : (city ? t('estimatedRangeCity', { from, to, city }) : t('estimatedRange', { from, to }))

  const within = e.businessDaysMin === e.businessDaysMax
    ? t('withinSingle', { n: e.businessDaysMax })
    : t('withinRange', { range: `${e.businessDaysMin}–${e.businessDaysMax}`, max: e.businessDaysMax })

  let countdown: string | null = null
  if (minutesToCutoff !== null) {
    const hours = Math.floor(minutesToCutoff / 60)
    const minutes = minutesToCutoff % 60
    countdown = hours > 0 ? t('orderInHours', { hours, minutes }) : t('orderInMinutes', { minutes })
  }

  return (
    <div style={{ borderRadius: 12, background: '#f0fdfa', border: '1px solid #99f6e4', padding: pad, color: TEAL }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Truck size={compact ? 18 : 20} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: compact ? 13 : 14, lineHeight: 1.4, color: '#134e4a' }}>{headline}</p>
          {countdown && (
            <p style={{ margin: '3px 0 0', fontWeight: 700, fontSize: compact ? 12 : 12.5, color: TEAL }}>{countdown}</p>
          )}
        </div>
      </div>
      <p style={{ margin: compact ? '8px 0 0' : '10px 0 0', paddingTop: compact ? 8 : 10, borderTop: '1px solid #ccfbf1', fontSize: compact ? 12 : 12.5, fontWeight: 600, color: '#475569' }}>
        {within} · {t('cod')}
      </p>
    </div>
  )
}
