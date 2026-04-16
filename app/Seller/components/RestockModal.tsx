'use client'

import { useState, useCallback } from 'react'
import {
  X, Package, RefreshCw, Loader2, AlertCircle,
  CheckCircle, Plus, Trash2, ChevronDown, ChevronUp,
  Info, Zap,
} from 'lucide-react'
import api from '@/lib/sellerApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptionEntry {
  id: number
  value: string
  color_hex?: string | null
  // color axis carries these extra fields
  ids?: number[]
  color_hex_primary?: string | null
}

export interface RestockVariant {
  id: number
  label: string
  stock: number
  is_active: boolean
  option_ids?: number[]
  /** Keyed by attribute slug e.g. { color: { id, value, color_hex }, size: { id, value } } */
  option_map?: Record<string, OptionEntry>
}

export interface RestockProduct {
  id: number
  name: string
  stock: number
  has_variants: boolean
  variant_stock?: number
  variants?: RestockVariant[]
}

interface NewVariantRow {
  key: string
  option_ids: number[]
  stock: number
  price_override: string
  sku: string
  is_active: boolean
}

interface Props {
  product: RestockProduct
  onClose: () => void
  onRestocked: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKey() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── VariantLabel ─────────────────────────────────────────────────────────────
/**
 * Renders a rich label for a variant using option_map when available.
 * Falls back to the plain label string, then to "Variant #id".
 *
 * Example output:
 *   🔴 Red+Blue  /  XL
 *   (color swatch circles) (size chip)
 */
function VariantLabel({ variant }: { variant: RestockVariant }) {
  const map = variant.option_map

  // ── Rich rendering from option_map ────────────────────────────────────────
  if (map && Object.keys(map).length > 0) {
    const parts: React.ReactNode[] = []

    // Color axis first (renders as swatches)
    if (map.color) {
      const colorEntry = map.color
      // Multi-color group: IDs array exists
      const hexList: string[] = []
      const nameList: string[] = []

      if (colorEntry.ids && colorEntry.ids.length > 0) {
        // For multi-color we only have one hex (primary), display swatch + combined name
        if (colorEntry.color_hex) hexList.push(colorEntry.color_hex)
        nameList.push(colorEntry.value ?? '')
      } else {
        if (colorEntry.color_hex) hexList.push(colorEntry.color_hex)
        nameList.push(colorEntry.value ?? '')
      }

      parts.push(
        <span key="color" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {hexList.map((hex, i) => (
            <span
              key={i}
              title={nameList[i] ?? ''}
              style={{
                display: 'inline-block',
                width: 13, height: 13,
                borderRadius: '50%',
                background: hex,
                border: '1.5px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            />
          ))}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            {nameList.join('+')}
          </span>
        </span>
      )
    }

    // Non-color axes (size, material, etc.) → plain chips
    const nonColorKeys = Object.keys(map).filter(k => k !== 'color')
    nonColorKeys.forEach((slug, i) => {
      const entry = map[slug]
      if (!entry) return
      if (parts.length > 0) {
        parts.push(
          <span key={`sep-${slug}`} style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 400, margin: '0 2px' }}>
            /
          </span>
        )
      }
      parts.push(
        <span
          key={slug}
          style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 12, fontWeight: 700,
            color: '#374151',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 5,
            padding: '1px 7px',
          }}
        >
          {entry.value}
        </span>
      )
    })

    if (parts.length > 0) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          {parts}
        </span>
      )
    }
  }

  // ── Fallback: plain label string ──────────────────────────────────────────
  if (variant.label && variant.label.trim()) {
    return <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{variant.label}</span>
  }

  // ── Last resort: ID ───────────────────────────────────────────────────────
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
      Variant #{variant.id}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RestockModal({ product, onClose, onRestocked }: Props) {
  const [simpleStock, setSimpleStock] = useState(String(product.stock ?? 0))

  const [variantStocks, setVariantStocks] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    ;(product.variants ?? []).forEach(v => { map[v.id] = String(v.stock) })
    return map
  })

  const [newVariants,     setNewVariants]     = useState<NewVariantRow[]>([])
  const [showAddVariants, setShowAddVariants] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [errors,          setErrors]          = useState<Record<string, string>>({})
  const [apiError,        setApiError]        = useState('')
  const [success,         setSuccess]         = useState(false)
  const [result,          setResult]          = useState<{ message: string; totalStock: number } | null>(null)

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!product.has_variants) {
      const v = parseInt(simpleStock, 10)
      if (isNaN(v) || v < 0) e.stock = 'Enter a valid stock quantity (≥ 0).'
    } else {
      Object.entries(variantStocks).forEach(([id, val]) => {
        if (isNaN(parseInt(val, 10)) || parseInt(val, 10) < 0) e[`variant_${id}`] = 'Invalid.'
      })
      newVariants.forEach((row, idx) => {
        if (row.option_ids.length === 0) e[`new_${idx}_options`] = 'Select at least one option.'
        if (isNaN(parseInt(String(row.stock), 10)) || parseInt(String(row.stock), 10) < 0) e[`new_${idx}_stock`] = 'Invalid stock.'
      })
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setApiError('')

    try {
      let payload: Record<string, any>

      if (!product.has_variants) {
        payload = { stock: parseInt(simpleStock, 10) }
      } else {
        const variantUpdates = Object.entries(variantStocks).map(([id, stock]) => ({
          id:    parseInt(id, 10),
          stock: parseInt(stock, 10),
        }))
        const newVariantPayload = newVariants
          .filter(row => row.option_ids.length > 0)
          .map(row => ({
            option_ids:     row.option_ids,
            stock:          parseInt(String(row.stock), 10) || 0,
            price_override: row.price_override !== '' ? parseFloat(row.price_override) : null,
            sku:            row.sku || undefined,
            is_active:      row.is_active,
          }))
        payload = { variants: [...variantUpdates, ...newVariantPayload] }
      }

      const res  = await (api as any).post(`/seller/products/${product.id}/restock`, payload)
      const data = res?.data ?? res
      const msg  = data?.message ?? 'Stock updated successfully.'
      const total = data?.data?.stock ?? data?.data?.variant_stock ?? 0

      setResult({ message: msg, totalStock: total })
      setSuccess(true)
      setTimeout(() => { onRestocked(); onClose() }, 1800)
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? 'Restock failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateVariantStock = useCallback((variantId: number, val: string) => {
    setVariantStocks(prev => ({ ...prev, [variantId]: val }))
  }, [])

  const addNewVariantRow = () => {
    setNewVariants(prev => [...prev, { key: makeKey(), option_ids: [], stock: 0, price_override: '', sku: '', is_active: true }])
    setShowAddVariants(true)
  }

  const removeNewVariantRow = (key: string) => setNewVariants(prev => prev.filter(r => r.key !== key))

  const updateNewVariant = (key: string, field: keyof NewVariantRow, value: any) =>
    setNewVariants(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r))

  const variants    = product.variants ?? []
  const hasVariants = product.has_variants && variants.length > 0

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 22,
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: hasVariants ? 560 : 420,
        maxHeight: '88vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid #f0f2f5',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
          borderRadius: '22px 22px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,rgba(219,20,46,0.12),rgba(219,20,46,0.06))',
              border: '1px solid rgba(219,20,46,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={16} color="#db142e" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>Restock Product</h2>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontWeight: 500 }}>
                Updates stock directly — no admin approval needed
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Success */}
          {success && result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 16px' }}>
              <div style={{ width: 56, height: 56, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} color="#10b981" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 900, fontSize: 16, color: '#111', margin: '0 0 4px' }}>Stock updated!</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{result.message}</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '8px 16px' }}>
                <Package size={14} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>{result.totalStock} units</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>now in stock</span>
              </div>
            </div>
          )}

          {!success && (
            <>
              {apiError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#dc2626' }}>
                  <AlertCircle size={13} /> {apiError}
                </div>
              )}

              {/* Info badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(219,20,46,0.04)', border: '1px solid rgba(219,20,46,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#64748b' }}>
                <Zap size={13} style={{ color: '#db142e', marginTop: 1, flexShrink: 0 }} />
                <span>
                  <strong style={{ color: '#111' }}>Direct update.</strong>{' '}
                  Stock changes take effect immediately. To change price, description, or variant structure, use <strong>Request Update</strong> instead.
                </span>
              </div>

              {/* Product pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' }}>
                <Package size={14} color="#94a3b8" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                    Current stock:{' '}
                    <strong style={{ color: '#ef4444' }}>
                      {hasVariants ? (product.variant_stock ?? 0) : product.stock} units
                    </strong>
                    {hasVariants && <span> (across {variants.length} variants)</span>}
                  </p>
                </div>
              </div>

              {/* Simple product */}
              {!hasVariants && (
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 5 }}>
                    New Stock Quantity
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min={0} step={1}
                      value={simpleStock}
                      onChange={e => setSimpleStock(e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${errors.stock ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, padding: '9px 44px 9px 12px', fontSize: 14, fontWeight: 700, background: errors.stock ? '#fef2f2' : '#f8fafc', color: '#111', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', fontWeight: 600, pointerEvents: 'none' }}>units</span>
                  </div>
                  {errors.stock && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.stock}</p>}
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Enter the total units you want to set.</p>
                </div>
              )}

              {/* Variant product */}
              {hasVariants && (
                <>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>
                      Update Stock per Variant
                    </p>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Variant</span>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#db142e' }}>Stock *</span>
                      </div>

                      {/* Rows */}
                      {variants.map((variant, idx) => {
                        const stockVal = variantStocks[variant.id] ?? '0'
                        const err      = errors[`variant_${variant.id}`]
                        const isLast   = idx === variants.length - 1

                        return (
                          <div
                            key={variant.id}
                            style={{
                              display: 'grid', gridTemplateColumns: '1fr 120px',
                              alignItems: 'center',
                              padding: '11px 14px',
                              borderBottom: isLast ? 'none' : '1px solid #f0f2f5',
                              background: variant.is_active ? '#fff' : '#fafafa',
                            }}
                          >
                            <div style={{ paddingRight: 12 }}>
                              {/* ── Rich label with swatches ── */}
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                                {variant.label || `Variant #${variant.id}`}
                              </span>

                              <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>
                                Current: <strong style={{ color: parseInt(stockVal, 10) > 0 ? '#10b981' : '#ef4444' }}>{variant.stock}</strong>
                                {!variant.is_active && (
                                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1px 5px', borderRadius: 3 }}>
                                    Inactive
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <input
                                type="number" min={0} step={1}
                                value={stockVal}
                                onChange={e => updateVariantStock(variant.id, e.target.value)}
                                style={{ width: '100%', border: `1.5px solid ${err ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 700, background: err ? '#fef2f2' : '#fff', color: '#111', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                              />
                              {err && <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0' }}>{err}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Running total */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(219,20,46,0.05)', border: '1px solid rgba(219,20,46,0.15)', borderRadius: 8, padding: '6px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Total</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#db142e', lineHeight: 1 }}>
                          {Object.values(variantStocks).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0) +
                           newVariants.reduce((sum, r) => sum + (parseInt(String(r.stock), 10) || 0), 0)}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>units</span>
                      </div>
                    </div>
                  </div>

                  {/* Add new variants */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddVariants(v => !v)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={13} color="#6366f1" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#4b5563' }}>Add new variants (optional)</span>
                        {newVariants.length > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                            {newVariants.length} new
                          </span>
                        )}
                      </div>
                      {showAddVariants ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                    </button>

                    {showAddVariants && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#1e40af' }}>
                          <Info size={11} style={{ flexShrink: 0 }} />
                          Enter option IDs (comma-separated) for new variants. Structural changes require a <strong>Request Update</strong>.
                        </div>

                        {newVariants.length === 0 && (
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>No new variants added yet.</p>
                        )}

                        {newVariants.map((row, idx) => (
                          <div key={row.key} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px', marginBottom: 10, background: '#fafafa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>New Variant #{idx + 1}</span>
                              <button type="button" onClick={() => removeNewVariantRow(row.key)} style={{ padding: 4, borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Option IDs (comma-separated) *</label>
                                <input
                                  type="text" placeholder="e.g. 3,7"
                                  value={row.option_ids.join(',')}
                                  onChange={e => {
                                    const ids = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                                    updateNewVariant(row.key, 'option_ids', ids)
                                  }}
                                  style={{ width: '100%', border: `1px solid ${errors[`new_${idx}_options`] ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }}
                                />
                                {errors[`new_${idx}_options`] && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 3 }}>{errors[`new_${idx}_options`]}</p>}
                              </div>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Stock *</label>
                                <input
                                  type="number" min={0}
                                  value={row.stock}
                                  onChange={e => updateNewVariant(row.key, 'stock', parseInt(e.target.value, 10) || 0)}
                                  style={{ width: '100%', border: `1px solid ${errors[`new_${idx}_stock`] ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Price Override (TND)</label>
                                <input type="number" min={0} step="0.001" value={row.price_override} onChange={e => updateNewVariant(row.key, 'price_override', e.target.value)} placeholder="base" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>SKU</label>
                                <input type="text" value={row.sku} onChange={e => updateNewVariant(row.key, 'sku', e.target.value)} placeholder="optional" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }} />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={addNewVariantRow} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Plus size={12} /> Add another variant
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div style={{ display: 'flex', gap: 10, padding: '16px 24px 20px', borderTop: '1px solid #f0f2f5', position: 'sticky', bottom: 0, background: '#fff', borderRadius: '0 0 22px 22px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '11px 0', background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(219,20,46,0.3)', opacity: saving ? 0.65 : 1, fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
              {saving
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Updating…</>
                : <><RefreshCw size={14} /> Confirm Restock</>
              }
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}