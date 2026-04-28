'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Loader2, AlertCircle, Plus, Trash2,
  Search, Package2, Zap, Tag, Calendar,
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
  // Convert ISO → 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
  return new Date(iso).toISOString().slice(0, 16)
}

function toISOFromInput(local: string): string {
  // 'YYYY-MM-DDTHH:mm' → full ISO string
  return new Date(local).toISOString()
}

const inputBase = `
  width:100%; border:1.5px solid #e5e7eb; border-radius:10px;
  padding:9px 13px; font-size:13px; color:#0f172a;
  background:#fff; outline:none; font-family:inherit;
  transition:border-color 0.13s;
`

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
  const [pickerOpen,   setPickerOpen]  = useState(false)

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
    if (!pickerOpen) return
    const t = setTimeout(() => loadProducts(search), 280)
    return () => clearTimeout(t)
  }, [search, pickerOpen, loadProducts])

  // ── Derived: max discount per business rules ────────────────────────────────
  const maxDiscount = type === 'flash_sale' ? 90 : 70
  const minDurationLabel = type === 'flash_sale' ? '1 hour' : '1 day'
  const maxDurationLabel = type === 'flash_sale' ? '72 hours' : '90 days'

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())                   e.name = 'Required.'
    if (!discountValue || parseFloat(discountValue) <= 0)
                                        e.discount_value = 'Must be greater than 0.'
    if (discountType === 'percentage' && parseFloat(discountValue) > maxDiscount)
                                        e.discount_value = `Max ${maxDiscount}% for ${type === 'flash_sale' ? 'flash sales' : 'discounts'}.`
    if (!startsAt)                      e.starts_at = 'Required.'
    if (!endsAt)                        e.ends_at   = 'Required.'
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
                                        e.ends_at   = 'End must be after start.'
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
      const data = err?.response?.data
      if (data?.errors) {
        const first = Object.values(data.errors as Record<string, string[]>)[0]?.[0]
        setApiError(first ?? 'Validation failed.')
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
                  style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = errors.name ? '#fca5a5' : '#e5e7eb'}
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
                        transition: 'all 0.13s',
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
                    style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (TND)</option>
                  </select>
                </Field>
                <Field label={discountType === 'percentage' ? `Value (max ${maxDiscount}%)` : 'Value (TND)'} required error={errors.discount_value}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0.001" step="0.001"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0"
                      style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = '#dc2626'}
                      onBlur={e => e.target.style.borderColor = errors.discount_value ? '#fca5a5' : '#e5e7eb'}
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
                    onChange={e => setStartsAt(e.target.value)}
                    style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#dc2626'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </Field>
                <Field label="Ends At" required error={errors.ends_at}>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#dc2626'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </Field>
              </div>

              <p style={{ fontSize: 10, color: '#94a3b8', margin: '-8px 0 0' }}>
                Duration: min {minDurationLabel} — max {maxDurationLabel}
              </p>

              {/* Flash stock (flash sales only) */}
              {type === 'flash_sale' && (
                <Field label="Flash Stock Cap (optional)">
                  <input
                    type="number" min="1" step="1"
                    value={flashStock}
                    onChange={e => setFlashStock(e.target.value)}
                    placeholder="Leave blank for unlimited"
                    style={{ ...parseStyle(inputBase), width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#dc2626'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
                    Max units sold at the promo price. Does NOT reduce product stock.
                  </p>
                </Field>
              )}
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
                transition: 'border-color 0.13s',
              }}
                onFocus={() => setPickerOpen(true)}
              >
                <Search size={13} color="#94a3b8" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPickerOpen(true) }}
                  onFocus={() => setPickerOpen(true)}
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
                  const checked = selectedProductIds.includes(p.id)
                  return (
                    <button
                      key={p.id} type="button"
                      onClick={() => toggleProduct(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${checked ? '#dc2626' : '#e5e7eb'}`,
                        background: checked ? 'rgba(220,38,38,0.05)' : '#fff',
                        textAlign: 'left', transition: 'all 0.13s',
                        fontFamily: 'inherit',
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
                          {p.price.toFixed(3)} TND
                          {discountValue && parseFloat(discountValue) > 0 && (
                            <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 700 }}>
                              → {discountType === 'percentage'
                                ? (p.price * (1 - parseFloat(discountValue) / 100)).toFixed(3)
                                : Math.max(0, p.price - parseFloat(discountValue)).toFixed(3)
                              } TND
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
                        transition: 'all 0.13s',
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

// Convert CSS-string shorthand to a style object React can use inline
function parseStyle(css: string): React.CSSProperties {
  const result: Record<string, string> = {}
  css.split(';').forEach(rule => {
    const [prop, val] = rule.split(':').map(s => s.trim())
    if (!prop || !val) return
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    result[camel] = val
  })
  return result as React.CSSProperties
}