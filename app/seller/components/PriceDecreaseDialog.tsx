'use client'

/**
 * Shown when a seller lowers the price of a live product. Lowering a price is
 * done with a discount (crossed-out price + "-X%" badge), which converts better
 * and keeps the price history honest. "Create a discount" saves the seller's
 * other edits with the current price, then opens the promotions page pre-filled.
 */

import { Loader2, TrendingDown, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

export interface PriceDrop {
  id?: number              // variant id; absent for the base price
  label?: string
  current_price: number
  requested_price: number
  reference_price: number  // lowest price of the last 30 days = crossed-out price
}

/** Discount that makes customers pay the requested price(s). */
export function discountFor(drops: PriceDrop[]): { type: 'fixed' | 'percentage'; value: number } {
  const base = drops.find(d => d.id === undefined)
  if (base) return { type: 'fixed', value: round3(base.reference_price - base.requested_price) }
  // Variant-only drops: one product-wide percentage (the largest requested cut)
  const pct = Math.max(...drops.map(d => ((d.reference_price - d.requested_price) / d.reference_price) * 100))
  return { type: 'percentage', value: Math.min(70, Math.max(1, Math.round(pct))) }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

interface Props {
  drops: PriceDrop[]
  windowDays: number
  busy: boolean
  onCreateDiscount: () => void
  onCancel: () => void
}

export default function PriceDecreaseDialog({ drops, windowDays, busy, onCreateDiscount, onCancel }: Props) {
  const t = useTranslations('seller.productForm.priceDialog')
  const { price } = useFormat()
  const fmt = (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="price-dialog-title" style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 0' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(219,20,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={18} color="#db142e" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 id="price-dialog-title" style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('title')}</h3>
            <p style={{ fontSize: 12.5, color: '#475569', margin: '6px 0 0', lineHeight: 1.55 }}>{t('body')}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('cancel')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b6472', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {drops.map((d, i) => {
            const pct = Math.round(((d.reference_price - d.requested_price) / d.reference_price) * 100)
            return (
              <div key={d.id ?? `base-${i}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', background: '#f8fafc' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 6px' }}>{d.label ?? t('basePrice')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#5b6472', textDecoration: 'line-through' }}>{fmt(d.reference_price)}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#db142e' }}>{fmt(d.requested_price)}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#db142e', borderRadius: 6, padding: '2px 6px' }}>-{pct}%</span>
                </div>
                {d.reference_price < d.current_price && (
                  <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0' }}>
                    {t('referenceNote', { days: windowDays, price: fmt(d.reference_price) })}
                  </p>
                )}
              </div>
            )
          })}
          {drops.some(d => d.id !== undefined) && (
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{t('variantNote')}</p>
          )}
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{t('saveNote')}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: 20 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('cancel')}
          </button>
          <button type="button" onClick={onCreateDiscount} disabled={busy} style={{ flex: 1.4, padding: '10px 0', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#db142e,#b80f25)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
            {busy && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {t('createDiscount')}
          </button>
        </div>
      </div>
    </div>
  )
}
