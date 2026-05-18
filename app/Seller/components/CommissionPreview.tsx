'use client'

/**
 * CommissionPreview
 *
 * Live commission calculator — reused across:
 *   - ProductModal  (normal products)
 *   - PackModal     (pass packPrice, set label="Pack Commission")
 *   - PromotionModal (pass effectivePrice per product)
 *
 * ONLY CHANGE from original:
 *   - Added optional `label` prop (default: "per unit sold")
 *   - Added optional `priceLabel` prop (shown in the fee breakdown line)
 *   - No logic changes — CommissionService is the single source of truth.
 *
 * Usage:
 *   // Normal product
 *   <CommissionPreview price={form.price} />
 *
 *   // Pack
 *   <CommissionPreview price={packPrice} label="per pack sold" priceLabel="pack price" />
 *
 *   // After discount (promotion)
 *   <CommissionPreview price={effectivePrice} label="after discount" priceLabel="discounted price" />
 */

import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight, Loader2, Flame, Crown } from 'lucide-react'

interface CommissionData {
  unit_price:             number
  total_price:            number
  commission_percentage:  number
  commission_amount:      number
  seller_amount:          number
  plan_used:              string
  base_rate:              number
  plan_reduction:         number
  saved_with_plan:        number
  upgrade_suggestions: Array<{
    plan:              string
    plan_name:         string
    monthly_cost:      number
    saved_per_sale:    number
    new_rate:          number
    new_seller_amount: number
    message:           string
  }>
}

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '')
const API_URL  = `${BASE_URL}/api`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? null
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  red:   Flame,
  black: Crown,
}

const PLAN_COLORS: Record<string, string> = {
  free:  '#198f41',
  red:   '#db142e',
  black: '#f59e0b',
}

const PLAN_LABELS: Record<string, string> = {
  free:  'Green Pepper',
  red:   'Red Pepper',
  black: 'Black Pepper',
}

interface CommissionPreviewProps {
  price:       string | number
  quantity?:   number
  /** Shown in the card header where it previously said "per unit sold" */
  label?:      string
  /** Shown in the breakdown line: "X% of {priceLabel}" */
  priceLabel?: string
}

export default function CommissionPreview({
  price,
  quantity   = 1,
  label      = 'per unit sold',
  priceLabel,
}: CommissionPreviewProps) {
  const [data,    setData]    = useState<CommissionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const numericPrice = parseFloat(String(price))

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!numericPrice || numericPrice <= 0 || isNaN(numericPrice)) {
      setData(null)
      setError(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/seller/commission/calculate`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept:         'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ price: numericPrice, quantity }),
        })
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [numericPrice, quantity])

  if (!numericPrice || numericPrice <= 0) return null

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 8, padding: '8px 12px',
        background: '#f8fafc', borderRadius: 10,
        border: '1px solid #e5e7eb',
      }}>
        <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite', color: '#94a3b8', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
          Calculating commission…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !data) return null

  const planColor = PLAN_COLORS[data.plan_used] ?? '#198f41'
  const planLabel = PLAN_LABELS[data.plan_used] ?? data.plan_used
  // The price description in the breakdown line
  const priceLine = priceLabel
    ? `${data.commission_percentage}% of ${data.unit_price.toFixed(3)} TND (${priceLabel})`
    : `${data.commission_percentage}% of ${data.unit_price.toFixed(3)} TND`

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* ── Main breakdown card ── */}
      <div style={{
        borderRadius: 12,
        border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
        background: '#fdfdfd',
      }}>

        {/* Plan badge header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px',
          background: `${planColor}0d`,
          borderBottom: '1px solid #f0f0f0',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: planColor,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6,
              borderRadius: '50%', background: planColor,
            }} />
            {planLabel}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
            {label}
          </span>
        </div>

        {/* Two rows: fee / earnings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

          {/* Marketplace fee */}
          <div style={{ padding: '10px 12px', borderRight: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <TrendingDown size={11} color="#ef4444" />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Marketplace Fee
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
              {data.commission_amount.toFixed(3)}
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginLeft: 3 }}>TND</span>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
              {priceLine}
            </p>
          </div>

          {/* Seller earnings */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <TrendingUp size={11} color="#10b981" />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Your Earnings
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
              {data.seller_amount.toFixed(3)}
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginLeft: 3 }}>TND</span>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
              after platform fee
            </p>
          </div>
        </div>

        {/* "You saved X TND with [Plan]" — only for paid plans */}
        {data.plan_reduction > 0 && data.saved_with_plan > 0 && (
          <div style={{
            padding: '7px 12px',
            borderTop: '1px solid #f0f0f0',
            background: `${planColor}08`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 15 }}>🎉</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: planColor }}>
              You saved {data.saved_with_plan.toFixed(3)} TND with {planLabel}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
              vs free plan ({data.base_rate}% → {data.commission_percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Upgrade nudges (only for free plan) ── */}
      {data.upgrade_suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data.upgrade_suggestions.map(suggestion => {
            const Icon  = PLAN_ICONS[suggestion.plan] ?? Flame
            const color = PLAN_COLORS[suggestion.plan] ?? '#db142e'

            return (
              <a
                key={suggestion.plan}
                href="/become-a-vendor"
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 10,
                  border: `1px solid ${color}25`,
                  background: `${color}06`,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: `${color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={12} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#374151' }}>
                      Upgrade to {suggestion.plan_name}
                      <span style={{ fontWeight: 500, color: '#94a3b8' }}>
                        {' '}({suggestion.monthly_cost} DT/mo)
                      </span>
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                      Fee drops to {suggestion.new_rate}% → you'd earn{' '}
                      <span style={{ color, fontWeight: 700 }}>
                        {suggestion.new_seller_amount.toFixed(3)} TND
                      </span>
                      {' '}(save {suggestion.saved_per_sale.toFixed(3)} TND per sale)
                    </p>
                  </div>
                  <ArrowUpRight size={12} color={color} style={{ flexShrink: 0 }} />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}