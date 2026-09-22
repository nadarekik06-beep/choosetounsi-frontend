'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, Loader2, AlertCircle, Search, Package2 } from 'lucide-react'
import { sellerCouponsApi, type Coupon, type CouponPayload } from '@/lib/couponsApi'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SellerProduct {
  id: number
  name: string
  price: number
  primary_image_url: string | null
}

function computeEffectivePrice(basePrice: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (!discountValue || discountValue <= 0) return basePrice
  if (discountType === 'percentage') return Math.max(0, basePrice * (1 - discountValue / 100))
  return Math.max(0, basePrice - discountValue)
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface CouponModalProps {
  coupon: Coupon | null
  onClose: () => void
  onSaved: () => void
}

export default function CouponModal({ coupon, onClose, onSaved }: CouponModalProps) {
  const isEdit = !!coupon

  const [code,                    setCode]                   = useState(coupon?.code ?? '')
  const [discountType,            setDiscountType]            = useState<'percentage' | 'fixed'>(coupon?.discount_type ?? 'percentage')
  const [discountValue,           setDiscountValue]           = useState(coupon?.discount_value?.toString() ?? '')
  const [minOrderAmount,          setMinOrderAmount]          = useState(coupon?.min_order_amount?.toString() ?? '')
  const [usageLimit,              setUsageLimit]              = useState(coupon?.usage_limit?.toString() ?? '')
  const [usageLimitPerCustomer,   setUsageLimitPerCustomer]   = useState(coupon?.usage_limit_per_customer?.toString() ?? '')
  const [isActive,                setIsActive]                = useState(coupon?.is_active ?? true)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(coupon?.products?.map(p => p.id) ?? [])

  const [products,    setProducts]    = useState<SellerProduct[]>([])
  const [prodLoading, setProdLoading] = useState(false)
  const [search,      setSearch]      = useState('')

  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

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
        id: p.id, name: p.name, price: parseFloat(p.price), primary_image_url: p.primary_image_url,
      })))
    } catch { setProducts([]) } finally { setProdLoading(false) }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { const t = setTimeout(() => loadProducts(search), 280); return () => clearTimeout(t) }, [search, loadProducts])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = 'Required.'
    else if (!/^[A-Za-z0-9_-]+$/.test(code.trim())) e.code = 'Letters, numbers, - and _ only.'

    if (!discountValue || parseFloat(discountValue) <= 0) e.discount_value = 'Must be greater than 0.'
    if (discountType === 'percentage' && parseFloat(discountValue) > 100) e.discount_value = 'Cannot exceed 100%.'

    if (minOrderAmount && parseFloat(minOrderAmount) < 0) e.min_order_amount = 'Cannot be negative.'
    if (usageLimit && parseInt(usageLimit) < 1) e.usage_limit = 'Must be at least 1.'
    if (usageLimitPerCustomer && parseInt(usageLimitPerCustomer) < 1) e.usage_limit_per_customer = 'Must be at least 1.'

    if (selectedProductIds.length === 0) e.products = 'Select at least one product.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true); setApiError('')

    const payload: CouponPayload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      usage_limit_per_customer: usageLimitPerCustomer ? parseInt(usageLimitPerCustomer) : null,
      is_active: isActive,
      product_ids: selectedProductIds,
    }

    try {
      if (isEdit) await sellerCouponsApi.update(coupon!.id, payload)
      else await sellerCouponsApi.create(payload)
      onSaved()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data ?? err?.response
      if (data?.errors) {
        const fieldMap: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(data.errors as Record<string, string[]>)) {
          fieldMap[key] = Array.isArray(msgs) ? msgs[0] : String(msgs)
        }
        setErrors(prev => ({ ...prev, ...fieldMap }))
        setApiError('Please fix the errors highlighted below.')
      } else {
        setApiError(data?.message ?? 'Failed to save. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleProduct = (id: number) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const inputBase: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 13px', fontSize: 13, color: '#0f172a',
    background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '20px 20px 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
              {isEdit ? 'Edit Coupon' : 'Create Coupon'}
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              Applies only to the products selected below, and only for this store.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {apiError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {apiError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            {/* ══ LEFT ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SLabel>Coupon Details</SLabel>

              <Field label="Coupon Code" required error={errors.code}>
                <input
                  value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  style={{ ...inputBase, fontWeight: 800, letterSpacing: '0.04em' }}
                  disabled={isEdit}
                  onFocus={e => (e.target.style.borderColor = '#dc2626')}
                  onBlur={e => (e.target.style.borderColor = errors.code ? '#fca5a5' : '#e5e7eb')}
                />
                {isEdit && <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>Code can't be changed after creation.</p>}
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Discount Type" required>
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} style={inputBase}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (TND)</option>
                  </select>
                </Field>
                <Field label={discountType === 'percentage' ? 'Value (max 100%)' : 'Value (TND)'} required error={errors.discount_value}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0.001" step="0.001"
                      value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0" style={{ ...inputBase, paddingRight: 40 }}
                      onFocus={e => (e.target.style.borderColor = '#dc2626')}
                      onBlur={e => (e.target.style.borderColor = errors.discount_value ? '#fca5a5' : '#e5e7eb')}
                    />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                      {discountType === 'percentage' ? '%' : 'DT'}
                    </span>
                  </div>
                </Field>
              </div>

              <Field label="Minimum Order Amount (optional)" error={errors.min_order_amount}>
                <input
                  type="number" min="0" step="0.001"
                  value={minOrderAmount} onChange={e => setMinOrderAmount(e.target.value)}
                  placeholder="No minimum" style={inputBase}
                  onFocus={e => (e.target.style.borderColor = '#dc2626')}
                  onBlur={e => (e.target.style.borderColor = errors.min_order_amount ? '#fca5a5' : '#e5e7eb')}
                />
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
                  Checked against the total of eligible items only, not the whole cart.
                </p>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Total Uses (optional)" error={errors.usage_limit}>
                  <input
                    type="number" min="1" step="1"
                    value={usageLimit} onChange={e => setUsageLimit(e.target.value)}
                    placeholder="Unlimited" style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#dc2626')}
                    onBlur={e => (e.target.style.borderColor = errors.usage_limit ? '#fca5a5' : '#e5e7eb')}
                  />
                </Field>
                <Field label="Uses Per Customer (optional)" error={errors.usage_limit_per_customer}>
                  <input
                    type="number" min="1" step="1"
                    value={usageLimitPerCustomer} onChange={e => setUsageLimitPerCustomer(e.target.value)}
                    placeholder="Unlimited" style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#dc2626')}
                    onBlur={e => (e.target.style.borderColor = errors.usage_limit_per_customer ? '#fca5a5' : '#e5e7eb')}
                  />
                </Field>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div
                  onClick={() => setIsActive(v => !v)}
                  style={{ width: 35, height: 19, borderRadius: 999, background: isActive ? '#dc2626' : '#e5e7eb', position: 'relative', cursor: 'pointer', transition: 'background 0.19s' }}
                >
                  <div style={{ position: 'absolute', top: 2, left: isActive ? 18 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.14)', transition: 'left 0.19s' }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Active</span>
              </label>
            </div>

            {/* ══ RIGHT — Product selection ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SLabel>Select Products</SLabel>
                {selectedProductIds.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 8px', borderRadius: 999 }}>
                    {selectedProductIds.length} selected
                  </span>
                )}
              </div>

              {errors.products && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 0' }}>{errors.products}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px' }}>
                <Search size={13} color="#94a3b8" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search your products…"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a' }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prodLoading ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 6px', display: 'block' }} />
                    Loading…
                  </div>
                ) : products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>No approved products found.</div>
                ) : products.map(p => {
                  const checked = selectedProductIds.includes(p.id)
                  const discNum = parseFloat(discountValue) || 0
                  const effectivePrice = discNum > 0 ? computeEffectivePrice(p.price, discountType, discNum) : null
                  return (
                    <button
                      key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${checked ? '#dc2626' : '#e5e7eb'}`, background: checked ? 'rgba(220,38,38,0.05)' : '#fff',
                        textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.primary_image_url ? <img src={p.primary_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package2 size={16} color="#94a3b8" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: checked ? '#dc2626' : '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                          <span style={effectivePrice !== null ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.price.toFixed(3)} TND</span>
                          {effectivePrice !== null && <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 700 }}>→ {effectivePrice.toFixed(3)} TND</span>}
                        </p>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${checked ? '#dc2626' : '#e5e7eb'}`, background: checked ? '#dc2626' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {checked && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 12, position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #f0f0f0' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '12px 0', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(220,38,38,0.3)', opacity: saving ? 0.6 : 1,
            }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {isEdit ? 'Save Changes' : 'Create Coupon'}
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
    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: 6, borderBottom: '1px solid #f0f0f0', margin: 0 }}>
      {children}
    </p>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
