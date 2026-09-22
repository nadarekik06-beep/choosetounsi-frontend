'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  X, Loader2, AlertCircle, Plus, Trash2,
  Search, Package2, Zap, Tag, Calendar,
  TrendingDown, TrendingUp,
} from 'lucide-react'
import { sellerPromotionsApi, type Promotion, type PromotionPayload } from '@/lib/promotionsApi'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SellerProduct {
  id: number
  name: string
  price: number
  primary_image_url: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

function toISOFromInput(local: string): string {
  return new Date(local).toISOString()
}

/** Compute the effective (discounted) price for a product */
function computeEffectivePrice(
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

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '')
const API_URL  = `${BASE_URL}/api`

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

function PromotionCommissionPreview({
  products,
  selectedIds,
  discountType,
  discountValue,
}: {
  products:      SellerProduct[]
  selectedIds:   number[]
  discountType:  'percentage' | 'fixed'
  discountValue: string
}) {
  const [results, setResults] = useState<Record<number, CommissionLineData>>({})
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const discountNum = parseFloat(discountValue) || 0
  const selected    = products.filter(p => selectedIds.includes(p.id))

  // Build the key that drives re-fetch: selected IDs + discount
  const fetchKey = `${selectedIds.sort().join(',')}::${discountType}::${discountNum}`

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
        const effectivePrice = computeEffectivePrice(p.price, discountType, discountNum)
        if (effectivePrice <= 0) return { id: p.id, data: null }
        try {
          const res  = await fetch(`${API_URL}/seller/commission/calculate`, {
            method: 'POST', headers,
            body: JSON.stringify({ price: effectivePrice, quantity: 1 }),
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
  const totalOriginal = selected.reduce((s, p) => s + p.price, 0)
  const totalEffective = selected.reduce((s, p) =>
    s + computeEffectivePrice(p.price, discountType, discountNum), 0)
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
          {planLabel} Pepper · Commission after discount
        </span>
        {loading && (
          <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite', color: '#94a3b8' }} />
        )}
      </div>

      {/* Per-product breakdown */}
      {selected.map(p => {
        const effective  = computeEffectivePrice(p.price, discountType, discountNum)
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
              paddingRight: 10,
            }}>
              {p.name}
            </p>

            {/* Original → effective */}
            <div style={{ textAlign: 'right', paddingRight: 14 }}>
              <p style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'line-through', margin: '0 0 1px', fontWeight: 500 }}>
                {p.price.toFixed(3)} TND
              </p>
              <p style={{ fontSize: 12, fontWeight: 900, color: '#dc2626', margin: 0 }}>
                {effective.toFixed(3)} TND
              </p>
            </div>

            {/* Platform fee */}
            <div style={{ textAlign: 'right', paddingRight: 14, minWidth: 80 }}>
              {result ? (
                <>
                  <p style={{ fontSize: 9, color: '#94a3b8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Fee {result.commission_percentage}%
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: 0 }}>
                    −{result.commission_amount.toFixed(3)} TND
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 11, color: '#e5e7eb', margin: 0 }}>—</p>
              )}
            </div>

            {/* Seller net */}
            <div style={{ textAlign: 'right', minWidth: 80 }}>
              {result ? (
                <>
                  <p style={{ fontSize: 9, color: '#94a3b8', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    You get
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#10b981', margin: 0 }}>
                    {result.seller_amount.toFixed(3)} TND
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
            Total ({selected.length} products)
          </p>
          <div style={{ textAlign: 'right', paddingRight: 14 }}>
            <p style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'line-through', margin: '0 0 1px' }}>
              {totalOriginal.toFixed(3)} TND
            </p>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#dc2626', margin: 0 }}>
              {totalEffective.toFixed(3)} TND
            </p>
          </div>
          <div style={{ textAlign: 'right', paddingRight: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: 0 }}>
              −{totalCommission.toFixed(3)} TND
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#10b981', margin: 0 }}>
              {totalSeller.toFixed(3)} TND
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface PromotionModalProps {
  promotion: Promotion | null
  onClose: () => void
  onSaved: () => void
}

export default function PromotionModal({ promotion, onClose, onSaved }: PromotionModalProps) {
  const isEdit = !!promotion

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name,          setName]          = useState(promotion?.name           ?? '')
  const [type,          setType]          = useState<'flash_sale' | 'discount'>(promotion?.type ?? 'flash_sale')
  const [discountType,  setDiscountType]  = useState<'percentage' | 'fixed'>(promotion?.discount_type ?? 'percentage')
  const [discountValue, setDiscountValue] = useState(promotion?.discount_value?.toString() ?? '')
  const [startsAt,      setStartsAt]      = useState(toLocalDateTimeInput(promotion?.starts_at))
  const [endsAt,        setEndsAt]        = useState(toLocalDateTimeInput(promotion?.ends_at))
  const [flashStock,    setFlashStock]    = useState(promotion?.flash_stock?.toString() ?? '')
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(
    promotion?.products?.map(p => p.id) ?? []
  )

  // Product picker
  const [products,     setProducts]    = useState<SellerProduct[]>([])
  const [prodLoading,  setProdLoading] = useState(false)
  const [search,       setSearch]      = useState('')

  // Submission
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  // ── Load seller products ────────────────────────────────────────────────────
  const loadProducts = useCallback(async (q = '') => {
    setProdLoading(true)
    try {
      const token   = localStorage.getItem('ct_auth_token')
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
      const res     = await fetch(
        `${apiBase}/api/seller/products?is_approved=true&is_active=true&per_page=100${q ? `&search=${q}` : ''}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      const json = await res.json()
      setProducts((json.data?.data ?? []).map((p: any) => ({
        id:                p.id,
        name:              p.name,
        price:             parseFloat(p.price),
        primary_image_url: p.primary_image_url,
      })))
    } catch {
      setProducts([])
    } finally {
      setProdLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    const t = setTimeout(() => loadProducts(search), 280)
    return () => clearTimeout(t)
  }, [search, loadProducts])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const maxDiscount      = type === 'flash_sale' ? 90 : 70
  const minDurationLabel = type === 'flash_sale' ? '1 hour' : '1 day'
  const maxDurationLabel = type === 'flash_sale' ? '72 hours' : '90 days'

  // ── Validation ──────────────────────────────────────────────────────────────
 const validate = () => {
  const e: Record<string, string> = {}
  if (!name.trim()) e.name = 'Required.'

  if (!discountValue || parseFloat(discountValue) <= 0)
    e.discount_value = 'Must be greater than 0.'
  if (discountType === 'percentage' && parseFloat(discountValue) > maxDiscount)
    e.discount_value = `Max ${maxDiscount}% for ${type === 'flash_sale' ? 'flash sales' : 'discounts'}.`

  if (!startsAt) e.starts_at = 'Required.'
  if (!endsAt)   e.ends_at   = 'Required.'

  if (startsAt && endsAt) {
    const start = new Date(startsAt)
    const end   = new Date(endsAt)

    if (end <= start) {
      e.ends_at = 'End must be after start.'
    } else {
      const diffMs    = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      const diffDays  = diffHours / 24

      if (type === 'flash_sale') {
        if (diffHours < 1)  e.ends_at = 'Flash sale must last at least 1 hour.'
        if (diffHours > 72) e.ends_at = 'Flash sale cannot exceed 72 hours (3 days).'
      } else {
        if (diffDays < 1)  e.ends_at = 'Discount must last at least 1 full day.'
        if (diffDays > 90) e.ends_at = 'Discount cannot exceed 90 days.'
      }
    }
  }

  if (selectedProductIds.length === 0) e.products = 'Select at least one product.'
  setErrors(e)
  return Object.keys(e).length === 0
}

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true); setApiError('')

    const payload: PromotionPayload = {
      name,
      type,
      discount_type:  discountType,
      discount_value: parseFloat(discountValue),
      starts_at:      toISOFromInput(startsAt),
      ends_at:        toISOFromInput(endsAt),
      product_ids:    selectedProductIds,
      ...(type === 'flash_sale' && flashStock
        ? { flash_stock: parseInt(flashStock) }
        : {}),
    }

    try {
      if (isEdit) {
        await sellerPromotionsApi.update(promotion!.id, payload)
      } else {
        await sellerPromotionsApi.create(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
  const data = err?.response?.data ?? err?.response

  if (data?.errors) {
    const fieldMap: Record<string, string> = {}
    let hasGeneral = false

    for (const [key, msgs] of Object.entries(data.errors as Record<string, string[]>)) {
      const msg = Array.isArray(msgs) ? msgs[0] : String(msgs)
      if (key === 'general') {
        setApiError(msg)
        hasGeneral = true
      } else {
        fieldMap[key] = msg
      }
    }

    if (Object.keys(fieldMap).length > 0) {
      setErrors(prev => ({ ...prev, ...fieldMap }))
      if (!hasGeneral) setApiError('Please fix the errors highlighted below.')
    }
  } else {
    setApiError(data?.message ?? 'Failed to save. Please try again.')
  }
} finally {
      setSaving(false)
    }
  }

  const toggleProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const inputBase: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 13px', fontSize: 13, color: '#0f172a',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: 780,
        maxHeight: '92vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
          borderRadius: '20px 20px 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
              {isEdit ? 'Edit Promotion' : 'Create Promotion'}
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              No admin approval needed — goes live immediately at start time.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: 6, borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {apiError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {apiError}
            </div>
          )}

          {/* ── Two-column grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>

            {/* ══ LEFT ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <SLabel>Promotion Details</SLabel>

              {/* Name */}
              <Field label="Promotion Name" required error={errors.name}>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Summer Flash Sale"
                  style={inputBase}
                  onFocus={e => (e.target.style.borderColor = '#dc2626')}
                  onBlur={e => (e.target.style.borderColor = errors.name ? '#fca5a5' : '#e5e7eb')}
                />
              </Field>

              {/* Type toggle */}
              <Field label="Promotion Type" required>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['flash_sale', 'discount'] as const).map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${type === t ? '#dc2626' : '#e5e7eb'}`,
                        background: type === t ? 'rgba(220,38,38,0.06)' : '#f8fafc',
                        color: type === t ? '#dc2626' : '#64748b',
                        fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      {t === 'flash_sale' ? <><Zap size={13} /> Flash Sale</> : <><Tag size={13} /> Discount</>}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0' }}>
                  Flash sale: max {maxDiscount}%, max 72h, overlap blocked per product.
                  Discount: max {maxDiscount}%, up to 90 days.
                </p>
              </Field>

              {/* Discount type + value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Discount Type" required>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    style={inputBase}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (TND)</option>
                  </select>
                </Field>
                <Field
                  label={discountType === 'percentage' ? `Value (max ${maxDiscount}%)` : 'Value (TND)'}
                  required
                  error={errors.discount_value}
                >
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0.001" step="0.001"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0"
                      style={{ ...inputBase, paddingRight: 40 }}
                      onFocus={e => (e.target.style.borderColor = '#dc2626')}
                      onBlur={e => (e.target.style.borderColor = errors.discount_value ? '#fca5a5' : '#e5e7eb')}
                    />
                    <span style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', fontWeight: 700,
                    }}>
                      {discountType === 'percentage' ? '%' : 'DT'}
                    </span>
                  </div>
                </Field>
              </div>

              {/* Start / End */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Starts At" required error={errors.starts_at}>
                 <input
                    type="datetime-local"
                    value={startsAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={e => {
                      setStartsAt(e.target.value)
                      // Reset end date if it's now invalid relative to the new start
                      if (endsAt && new Date(endsAt) <= new Date(e.target.value)) setEndsAt('')
                    }}
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#dc2626')}
                    onBlur={e => (e.target.style.borderColor = errors.starts_at ? '#fca5a5' : '#e5e7eb')}
                  />
                </Field>
                <Field label="Ends At" required error={errors.ends_at}>
                 <input
                      type="datetime-local"
                      value={endsAt}
                      min={startsAt
                        ? (() => {
                            const minEnd = new Date(startsAt)
                            if (type === 'flash_sale') minEnd.setHours(minEnd.getHours() + 1)
                            else minEnd.setDate(minEnd.getDate() + 1)
                            return minEnd.toISOString().slice(0, 16)
                          })()
                        : new Date().toISOString().slice(0, 16)
                      }
                      max={startsAt
                        ? (() => {
                            const maxEnd = new Date(startsAt)
                            if (type === 'flash_sale') maxEnd.setHours(maxEnd.getHours() + 72)
                            else maxEnd.setDate(maxEnd.getDate() + 90)
                            return maxEnd.toISOString().slice(0, 16)
                          })()
                        : undefined
                      }
                      onChange={e => setEndsAt(e.target.value)}
                      style={inputBase}
                      onFocus={e => (e.target.style.borderColor = '#dc2626')}
                      onBlur={e => (e.target.style.borderColor = errors.ends_at ? '#fca5a5' : '#e5e7eb')}
                    />
                </Field>
              </div>

              <p style={{ fontSize: 10, color: '#94a3b8', margin: '-8px 0 0' }}>
                Duration: min {minDurationLabel} — max {maxDurationLabel}
              </p>

              {/* Flash stock */}
              {type === 'flash_sale' && (
                <Field label="Flash Stock Cap (optional)">
                  <input
                    type="number" min="1" step="1"
                    value={flashStock}
                    onChange={e => setFlashStock(e.target.value)}
                    placeholder="Leave blank for unlimited"
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#dc2626')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
                    Max units sold at promo price. Does NOT reduce product stock.
                  </p>
                </Field>
              )}

              {/*
               * ── COMMISSION PREVIEW ─────────────────────────────────────
               * Shows commission breakdown for each selected product
               * at the discounted price.
               *
               * Commission is calculated on the EFFECTIVE price (after discount),
               * not the original price — because that's the money the platform
               * and seller actually share.
               *
               * This calls POST /seller/commission/calculate per product,
               * the same CommissionService endpoint used everywhere.
               */}
              <PromotionCommissionPreview
                products={products}
                selectedIds={selectedProductIds}
                discountType={discountType}
                discountValue={discountValue}
              />

            </div>

            {/* ══ RIGHT — Product selection ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SLabel>Select Products</SLabel>
                {selectedProductIds.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: '#10b981',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    padding: '2px 8px', borderRadius: 999,
                  }}>
                    {selectedProductIds.length} selected
                  </span>
                )}
              </div>

              {errors.products && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 0' }}>{errors.products}</p>
              )}

              {/* Search */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1.5px solid #e5e7eb',
                borderRadius: 10, padding: '8px 12px',
              }}>
                <Search size={13} color="#94a3b8" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your products…"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a' }}
                />
              </div>

              {/* Product list */}
              <div style={{
                flex: 1, overflowY: 'auto', maxHeight: 380,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {prodLoading ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 6px', display: 'block' }} />
                    Loading…
                  </div>
                ) : products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                    No approved products found.
                  </div>
                ) : products.map(p => {
                  const checked       = selectedProductIds.includes(p.id)
                  const discNum       = parseFloat(discountValue) || 0
                  const effectivePrice = discNum > 0
                    ? computeEffectivePrice(p.price, discountType, discNum)
                    : null

                  return (
                    <button
                      key={p.id} type="button"
                      onClick={() => toggleProduct(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${checked ? '#dc2626' : '#e5e7eb'}`,
                        background: checked ? 'rgba(220,38,38,0.05)' : '#fff',
                        textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                        overflow: 'hidden', background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {p.primary_image_url
                          ? <img src={p.primary_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Package2 size={16} color="#94a3b8" />
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 700, color: checked ? '#dc2626' : '#0f172a',
                          margin: '0 0 2px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                          {/* Original price always shown */}
                          <span style={effectivePrice !== null ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>
                            {p.price.toFixed(3)} TND
                          </span>
                          {/* Discounted price shown when discount is entered */}
                          {effectivePrice !== null && (
                            <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 700 }}>
                              → {effectivePrice.toFixed(3)} TND
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Checkmark */}
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${checked ? '#dc2626' : '#e5e7eb'}`,
                        background: checked ? '#dc2626' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{
            display: 'flex', gap: 12,
            paddingTop: 12,
            position: 'sticky', bottom: 0, background: '#fff',
            borderTop: '1px solid #f0f0f0',
          }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px 0', border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
              borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '12px 0',
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
              opacity: saving ? 0.6 : 1,
            }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {isEdit ? 'Save Changes' : 'Create Promotion'}
            </button>
          </div>

          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#94a3b8',
      paddingBottom: 6, borderBottom: '1px solid #f0f0f0', margin: 0,
    }}>
      {children}
    </p>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 5,
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}