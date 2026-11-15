'use client'

// Seller-only commission breakdown shown in the promotion wizard summary (moved out of
// PromotionModal.tsx unchanged: same /seller/commission/calculate calls and maths).

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import BrandLoader from '@/components/brand/BrandLoader'
import { API_BASE } from '@/lib/constants'

export interface SellerProduct {
  id: number
  name: string
  /** Current price, fetched fresh each time the form opens — what a discount is computed from. */
  price: number
  primary_image_url: string | null
}

/**
 * What buyers would really pay, per product, from the server (POST
 * /seller/promotions/preview): the exact pricing checkout charges
 * (current price read from the database, millime rounding). AUDIT M-6.
 */
export interface ServerPrice {
  original: number; final: number; valid: boolean
  /** Seller-side reduction, percent (server figure) */
  percent?: number
  /** What the client will see: delivery is included in the displayed price and never discounted */
  clientOriginal?: number; clientFinal?: number; clientPercent?: number
}

function useDt() {
  const { price } = useFormat()
  return (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

/** Compute the effective (discounted) price for a product */
export function computeEffectivePrice(
  basePrice: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
): number {
  if (!discountValue || discountValue <= 0) return basePrice
  if (discountType === 'percentage') {
    return Math.max(0, basePrice * (1 - discountValue / 100))
  }
  return Math.max(0, basePrice - discountValue)
}


function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? null
}

// ─── Promotion Commission Preview ─────────────────────────────────────────────
//
// Shown inside PromotionModal.
//
// Key design decision:
//   Commission is always calculated on the EFFECTIVE (discounted) price.
//   This is what the seller actually receives — the platform takes its cut
//   from money that actually changes hands, not the original price.
//
// Shows for each selected product:
//   original price → discounted price → commission → seller net
//
// Calls POST /seller/commission/calculate with the effective price.
// Uses the same CommissionService as everything else.

interface CommissionLineData {
  unit_price:            number
  commission_percentage: number
  commission_amount:     number
  seller_amount:         number
  plan_used:             string
}

const PLAN_COLORS: Record<string, string> = {
  free:  '#198f41',
  red:   '#db142e',
  black: '#f59e0b',
}

const PLAN_LABELS: Record<string, string> = {
  free:  'Green',
  red:   'Red',
  black: 'Black',
}

export default function PromotionCommissionPreview({
  products,
  selectedIds,
  discountType,
  discountValue,
  serverPrices,
}: {
  products:      SellerProduct[]
  selectedIds:   number[]
  discountType:  'percentage' | 'fixed'
  discountValue: string
  serverPrices:  Record<number, ServerPrice>
}) {
  const t  = useTranslations('seller.promotionForm')
  const dt = useDt()
  const { number } = useFormat()
  const [results, setResults] = useState<Record<number, CommissionLineData>>({})
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const discountNum = parseFloat(discountValue) || 0
  const selected    = products.filter(p => selectedIds.includes(p.id))

  // Build the key that drives re-fetch: selected IDs + discount
  const fetchKey = `${selectedIds.sort().join(',')}::${discountType}::${discountNum}::${JSON.stringify(serverPrices)}`
  // Server price (what buyers pay) when known; the local estimate only while it loads
  const finalOf    = (p: SellerProduct) => serverPrices[p.id]?.final ?? computeEffectivePrice(p.price, discountType, discountNum)
  const originalOf = (p: SellerProduct) => serverPrices[p.id]?.original ?? p.price

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (selected.length === 0 || discountNum <= 0) {
      setResults({})
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const token = getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      // Fetch commission for each selected product's effective price in parallel
      const fetches = selected.map(async p => {
        const effectivePrice = finalOf(p)
        if (effectivePrice <= 0 || serverPrices[p.id]?.valid === false) return { id: p.id, data: null }
        try {
          // Commission bracket from the original price, rate on the final price (AUDIT M-7)
          const res  = await fetch(`${API_BASE}/seller/commission/calculate`, {
            method: 'POST', headers,
            body: JSON.stringify({ price: effectivePrice, quantity: 1, tier_price: originalOf(p) }),
          })
          const json = await res.json()
          return { id: p.id, data: json.success ? json.data as CommissionLineData : null }
        } catch {
          return { id: p.id, data: null }
        }
      })

      const settled = await Promise.all(fetches)
      const map: Record<number, CommissionLineData> = {}
      for (const { id, data } of settled) {
        if (data) map[id] = data
      }
      setResults(map)
      setLoading(false)
    }, 500)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey])

  if (selected.length === 0 || discountNum <= 0) return null

  const planUsed   = Object.values(results)[0]?.plan_used ?? 'free'
  const planColor  = PLAN_COLORS[planUsed] ?? '#198f41'
  const planLabel  = PLAN_LABELS[planUsed] ?? planUsed

  // Aggregate totals across all selected products
  const totalOriginal = selected.reduce((s, p) => s + originalOf(p), 0)
  const totalEffective = selected.reduce((s, p) => s + finalOf(p), 0)
  const totalCommission = Object.values(results).reduce((s, r) => s + r.commission_amount, 0)
  const totalSeller     = Object.values(results).reduce((s, r) => s + r.seller_amount, 0)

  return (
    <div style={{
      marginTop: 12,
      border: '1.5px solid #e5e7eb',
      borderRadius: 14,
      overflow: 'hidden',
      background: '#fdfdfd',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: `${planColor}0d`,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 800, color: planColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: planColor, display: 'inline-block' }} />
          {t('commissionHeader', { plan: planLabel })}
        </span>
        {loading && (
          <BrandLoader variant="inline" size={11} style={{ color: '#5b6472' }} />
        )}
      </div>

      {/* Per-product breakdown */}
      {selected.map(p => {
        const effective  = finalOf(p)
        const result     = results[p.id]

        return (
          <div key={p.id} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
            gap: 0, alignItems: 'center',
            padding: '9px 14px',
            borderBottom: '1px solid #f8fafc',
          }}>
            {/* Product name */}
            <p style={{
              fontSize: 12, fontWeight: 700, color: '#374151', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              paddingInlineEnd: 10,
            }}>
              {p.name}
            </p>

            {/* Original → effective */}
            <div style={{ textAlign: 'end', paddingInlineEnd: 14 }}>
              <p style={{ fontSize: 10, color: '#5b6472', textDecoration: 'line-through', margin: '0 0 1px', fontWeight: 500 }}>
                {dt(originalOf(p))}
              </p>
              <p style={{ fontSize: 12, fontWeight: 900, color: '#dc2626', margin: 0 }}>
                {dt(effective)}
              </p>
            </div>

            {/* Platform fee */}
            <div style={{ textAlign: 'end', paddingInlineEnd: 14, minWidth: 80 }}>
              {result ? (
                <>
                  <p style={{ fontSize: 9, color: '#5b6472', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('fee', { pct: number(result.commission_percentage) })}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#b91c1c', margin: 0 }}>
                    −{dt(result.commission_amount)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 11, color: '#e5e7eb', margin: 0 }}>—</p>
              )}
            </div>

            {/* Seller net */}
            <div style={{ textAlign: 'end', minWidth: 80 }}>
              {result ? (
                <>
                  <p style={{ fontSize: 9, color: '#5b6472', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('youGet')}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#047857', margin: 0 }}>
                    {dt(result.seller_amount)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 11, color: '#e5e7eb', margin: 0 }}>—</p>
              )}
            </div>
          </div>
        )
      })}

      {/* Aggregate totals row (only when multiple products selected) */}
      {selected.length > 1 && Object.keys(results).length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto auto',
          gap: 0, alignItems: 'center',
          padding: '9px 14px',
          background: 'rgba(0,0,0,0.02)',
          borderTop: '1.5px solid #e5e7eb',
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: 0 }}>
            {t('totalProducts', { count: selected.length })}
          </p>
          <div style={{ textAlign: 'end', paddingInlineEnd: 14 }}>
            <p style={{ fontSize: 10, color: '#5b6472', textDecoration: 'line-through', margin: '0 0 1px' }}>
              {dt(totalOriginal)}
            </p>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#dc2626', margin: 0 }}>
              {dt(totalEffective)}
            </p>
          </div>
          <div style={{ textAlign: 'end', paddingInlineEnd: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#b91c1c', margin: 0 }}>
              −{dt(totalCommission)}
            </p>
          </div>
          <div style={{ textAlign: 'end' }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#047857', margin: 0 }}>
              {dt(totalSeller)}
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
