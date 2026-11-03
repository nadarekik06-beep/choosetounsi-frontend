'use client'

/**
 * Intigo bordereau printing for the seller orders page.
 *
 *   BordereauButton  "Print bordereau" (or a disabled button until the order is
 *                    prepared); hidden while the feature is off (bordereau.enabled=false)
 *   PrintedBadge     "Printed ✓ {date}" after the first print
 *   openPdf()        fetches the PDF with the seller's token and opens it in a new tab
 */

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'
import BrandLoader from '@/components/brand/BrandLoader'
import { useFormat } from '@/lib/i18n/useFormat'
import { ink } from '@/app/seller/ink'
import type { ParcelDelivery } from '@/types/seller'

export type BordereauView = 'hidden' | 'waiting' | 'ready'

/** The API's friendly message (sellerApi errors carry it as .message). */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : ''
}

/** What to show for this order: nothing, a disabled button, or the print button. */
export function bordereauView(delivery: ParcelDelivery | undefined | null, status: string): BordereauView {
  const b = delivery?.bordereau
  if (!b || b.enabled === false) return 'hidden'
  if (b.available) return 'ready'
  return status === 'confirmed' ? 'waiting' : 'hidden'
}

/**
 * Opens the tab synchronously (so the click is not treated as a popup), then
 * loads the PDF into it. Blocked tab → the PDF is downloaded instead.
 * @returns 'opened' | 'downloaded'
 */
export async function openPdf(load: () => Promise<Blob>, filename: string): Promise<'opened' | 'downloaded'> {
  const tab = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await load())
    setTimeout(() => URL.revokeObjectURL(url), 120_000)
    if (tab && !tab.closed) {
      tab.location.href = url
      return 'opened'
    }
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    return 'downloaded'
  } catch (e) {
    tab?.close()
    throw e
  }
}

export function PrintedBadge({ delivery, dark }: { delivery?: ParcelDelivery | null; dark: boolean }) {
  const t = useTranslations('seller.orders.bordereau')
  const { date } = useFormat()
  const b = delivery?.bordereau
  if (!b || b.enabled === false || !b.first_printed_at) return null
  return (
    <span
      title={t('printedTitle', { count: b.print_count })}
      style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 800, color: ink('#2563eb', dark), background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap' }}
    >
      {t('printed', { date: date(b.first_printed_at, 'short') })}
    </span>
  )
}

export function BordereauButton({ sellerOrderId, orderNumber, delivery, status, dark, compact = false, load, onPrinted, onError }: {
  sellerOrderId: number
  orderNumber: string
  delivery?: ParcelDelivery | null
  status: string
  dark: boolean
  /** compact = icon button for the list row */
  compact?: boolean
  load: (id: number) => Promise<Blob>
  onPrinted: (how: 'opened' | 'downloaded') => void
  onError: (message: string) => void
}) {
  const t = useTranslations('seller.orders.bordereau')
  const [busy, setBusy] = useState(false)
  const view = bordereauView(delivery, status)
  if (view === 'hidden') return null

  const printed = !!delivery?.bordereau?.first_printed_at
  const label = view === 'waiting' ? t('notYet') : busy ? t('printing') : printed ? t('reprint') : t('print')

  const click = async () => {
    if (view !== 'ready' || busy) return
    setBusy(true)
    try {
      onPrinted(await openPdf(() => load(sellerOrderId), `bordereau-${orderNumber}.pdf`))
    } catch (e: unknown) {
      onError(errorMessage(e) || t('failed'))
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={click}
        disabled={view !== 'ready' || busy}
        aria-label={label}
        title={label}
        className="eye-btn"
        style={{ background: 'transparent', border: 'none', padding: 6, borderRadius: 8, color: view === 'ready' ? '#2563eb' : (dark ? 'rgba(255,255,255,0.3)' : '#cbd5e1'), cursor: view === 'ready' && !busy ? 'pointer' : 'not-allowed' }}
      >
        {busy ? <BrandLoader variant="inline" size={14} /> : <Printer size={14} />}
      </button>
    )
  }

  const ready = view === 'ready'
  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={click}
        disabled={!ready || busy}
        title={ready ? undefined : t('notYet')}
        style={{
          width: '100%', padding: '12px 18px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: ready ? 'none' : `1px dashed ${dark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'}`,
          background: ready ? (busy ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)') : 'transparent',
          color: ready ? '#fff' : (dark ? 'rgba(255,255,255,0.45)' : '#64748b'),
          cursor: ready && !busy ? 'pointer' : 'not-allowed',
          boxShadow: ready ? '0 4px 16px rgba(37,99,235,0.3)' : 'none',
        }}
      >
        {busy ? <BrandLoader variant="inline" size={16} /> : <Printer size={16} />}
        {ready ? label : t('print')}
      </button>
      <div style={{ marginTop: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: dark ? 'rgba(255,255,255,0.55)' : '#5b6472' }}>
        {ready ? (
          <>
            <PrintedBadge delivery={delivery} dark={dark} />
            {!printed && <span>{t('hint')}</span>}
          </>
        ) : (
          <span>{t('notYet')}</span>
        )}
      </div>
    </div>
  )
}
