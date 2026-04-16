'use client'

/**
 * UpdateRequestModal.tsx
 *
 * Drop-in replacement for the UpdateRequestModal defined inside ProductModal.tsx.
 *
 * WHAT CHANGED vs the previous inline version:
 *   1. Full variant CRUD — seller can now:
 *        • Edit existing variant stock, price_override, sku, is_active
 *        • Add new variants (option_ids + stock + price + sku)
 *        • Mark variants for deletion (_delete: true)
 *   2. Scalar fields (price, stock) still work as before
 *   3. Note field unchanged
 *   4. Variant section shows a clear read-only label for each existing variant
 *      with editable fields underneath
 *
 * Usage — replace the inline `UpdateRequestModal` in ProductModal.tsx with:
 *
 *   import UpdateRequestModal from './UpdateRequestModal'
 *
 * and pass the same props.
 *
 * Props are identical to the previous inline version.
 */

import { useState } from 'react'
import {
  X, Send, Loader2, AlertCircle, Plus, Trash2,
  Lock, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { productUpdateRequestsApi } from '@/lib/sellerApi'
import type { VariantRow } from './VariantBuilder'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullProduct {
  id: number
  name: string
  price: number | string
  stock: number
  variant_rows?: VariantRow[]
  [key: string]: unknown
}

interface UpdateRequestVariant {
  id?: number
  option_ids?: number[]
  stock?: number
  price_override?: string | number | null
  sku?: string | null
  is_active?: boolean
  _delete?: boolean
}

interface Props {
  product: FullProduct
  /** Current variantRows from VariantBuilder (used to pre-populate edit fields) */
  variantRows: VariantRow[]
  onClose: () => void
  onSubmitted: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKey() {
  return Math.random().toString(36).slice(2, 9)
}

/** Shallow label for a variant row — built from option_ids when no label available */
function rowLabel(row: VariantRow, index: number): string {
  if ((row as any).label) return (row as any).label as string
  if (row.option_ids?.length) return `Option IDs: ${row.option_ids.join(', ')}`
  return `Variant ${index + 1}`
}

// ─── EditVariantRow ───────────────────────────────────────────────────────────

interface EditRow {
  key: string
  originalId?: number
  label: string
  stock: string
  price_override: string
  sku: string
  is_active: boolean
  _delete: boolean
  /** For new variants — option_ids entered as comma string */
  newOptionIdsStr: string
  isNew: boolean
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function UpdateRequestModal({ product, variantRows, onClose, onSubmitted }: Props) {
  // ── Scalar state ──────────────────────────────────────────────────────────
  const [price, setPrice] = useState(String(product.price ?? ''))
  const [stock, setStock] = useState(String(product.stock ?? '0'))
  const [note,  setNote]  = useState('')

  // ── Variant state ─────────────────────────────────────────────────────────
  const [editRows, setEditRows] = useState<EditRow[]>(() =>
    variantRows.map((row, idx) => ({
      key:             makeKey(),
      originalId:      row.id,
      label:           rowLabel(row, idx),
      stock:           String(row.stock ?? 0),
      price_override:  row.price_override !== '' && row.price_override != null ? String(row.price_override) : '',
      sku:             row.sku ?? '',
      is_active:       row.is_active ?? true,
      _delete:         false,
      newOptionIdsStr: '',
      isNew:           false,
    }))
  )

  const [showVariants, setShowVariants] = useState(false)
  const hasVariants = variantRows.length > 0

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // ── Row helpers ───────────────────────────────────────────────────────────

  const updateRow = (key: string, field: keyof EditRow, value: any) => {
    setEditRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r))
  }

  const addNewRow = () => {
    setEditRows(prev => [...prev, {
      key:             makeKey(),
      originalId:      undefined,
      label:           'New Variant',
      stock:           '0',
      price_override:  '',
      sku:             '',
      is_active:       true,
      _delete:         false,
      newOptionIdsStr: '',
      isNew:           true,
    }])
    setShowVariants(true)
  }

  const removeNewRow = (key: string) => {
    setEditRows(prev => prev.filter(r => r.key !== key))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload: Record<string, any> = {}

      // Scalar changes
      if (price !== String(product.price)) payload.price = parseFloat(price)
      if (!hasVariants && stock !== String(product.stock)) payload.stock = parseInt(stock, 10)
      if (note.trim()) payload.note = note.trim()

      // Variant changes (only include rows that were actually modified or are new/deleted)
      if (hasVariants || editRows.some(r => r.isNew)) {
        const variants: UpdateRequestVariant[] = []

        for (const row of editRows) {
          if (row.isNew) {
            // New variant
            const optionIds = row.newOptionIdsStr
              .split(',')
              .map(s => parseInt(s.trim(), 10))
              .filter(n => !isNaN(n) && n > 0)

            if (optionIds.length === 0) continue

            variants.push({
              option_ids:     optionIds,
              stock:          parseInt(row.stock, 10) || 0,
              price_override: row.price_override !== '' ? parseFloat(row.price_override) : null,
              sku:            row.sku || null,
              is_active:      row.is_active,
            })
          } else if (row._delete && row.originalId) {
            // Deletion
            variants.push({ id: row.originalId, _delete: true })
          } else if (row.originalId) {
            // Existing — check if anything changed vs the original row
            const orig = variantRows.find(r => r.id === row.originalId)
            const stockChanged         = orig ? parseInt(row.stock, 10)              !== orig.stock         : true
            const priceChanged         = orig ? (row.price_override || '')           !== String(orig.price_override ?? '') : true
            const skuChanged           = orig ? row.sku                              !== (orig.sku ?? '')   : true
            const activeChanged        = orig ? row.is_active                        !== orig.is_active     : true

            if (stockChanged || priceChanged || skuChanged || activeChanged) {
              const v: UpdateRequestVariant = {
                id:         row.originalId,
                stock:      parseInt(row.stock, 10) || 0,
                is_active:  row.is_active,
              }
              if (row.price_override !== '') v.price_override = parseFloat(row.price_override)
              else v.price_override = null
              if (row.sku) v.sku = row.sku
              variants.push(v)
            }
          }
        }

        if (variants.length > 0) payload.variants = variants
      }

      if (Object.keys(payload).length === 0 || (Object.keys(payload).length === 1 && payload.note)) {
        setError('No changes detected.')
        setSaving(false)
        return
      }

      await productUpdateRequestsApi.submit(product.id, payload)
      setSuccess(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1600)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit request.')
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px 14px',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
          borderRadius: '20px 20px 0 0',
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
              Request Product Update
            </h3>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              Changes will be reviewed by an admin before applying.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: 6, borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: 52, height: 52, background: '#d1fae5', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Send size={22} color="#10b981" />
            </div>
            <p style={{ fontWeight: 800, color: '#111', margin: '0 0 4px', fontSize: 15 }}>
              Request submitted!
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              You'll be notified when the admin reviews it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#dc2626',
              }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            {/* Product pill */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#64748b',
            }}>
              <strong style={{ color: '#0f172a' }}>Product:</strong> {product.name}
            </div>

            {/* ── Scalar fields ── */}
            <section>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 10px' }}>
                Price &amp; Stock Changes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: hasVariants ? '1fr' : '1fr 1fr', gap: 12 }}>
                {/* Price */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    New Price (TND)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" step="0.001"
                      value={price} onChange={e => setPrice(e.target.value)}
                      style={{
                        width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                        padding: '8px 44px 8px 12px', fontSize: 13, fontWeight: 600,
                        outline: 'none', background: '#fff', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, color: '#94a3b8', fontWeight: 600,
                    }}>TND</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                    Current: {Number(product.price).toFixed(3)} TND
                  </p>
                </div>

                {/* Stock (only for simple products) */}
                {!hasVariants && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                      New Stock
                    </label>
                    <input
                      type="number" min="0"
                      value={stock} onChange={e => setStock(e.target.value)}
                      style={{
                        width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                        padding: '8px 12px', fontSize: 13, fontWeight: 600,
                        outline: 'none', background: '#fff',
                      }}
                    />
                    <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                      Current: {product.stock}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Full Variant CRUD ── */}
            {(hasVariants || editRows.some(r => r.isNew)) && (
              <section>
                {/* Section header + toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: showVariants ? 12 : 0,
                }}>
                  <button
                    type="button"
                    onClick={() => setShowVariants(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                      Variant Changes
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: '#6366f1',
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {editRows.length} variant{editRows.length !== 1 ? 's' : ''}
                    </span>
                    {showVariants ? <ChevronUp size={12} color="#94a3b8" /> : <ChevronDown size={12} color="#94a3b8" />}
                  </button>

                  <button
                    type="button"
                    onClick={addNewRow}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 700, color: '#6366f1',
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 7, padding: '4px 10px',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <Plus size={11} /> Add variant
                  </button>
                </div>

                {showVariants && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                      background: '#eff6ff', border: '1px solid #bfdbfe',
                      borderRadius: 8, padding: '8px 10px',
                      fontSize: 11, color: '#1e40af',
                    }}>
                      <Info size={11} style={{ flexShrink: 0 }} />
                      Variant changes (stock, price, new/deleted variants) go through admin approval.
                      For stock-only updates, use the <strong>Restock</strong> button instead — it's instant.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {editRows.map((row, idx) => (
                        <div
                          key={row.key}
                          style={{
                            border: `1px solid ${row._delete ? 'rgba(239,68,68,0.3)' : row.isNew ? 'rgba(99,102,241,0.3)' : '#e5e7eb'}`,
                            borderRadius: 10, overflow: 'hidden',
                            opacity: row._delete ? 0.55 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {/* Row header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: row._delete ? 'rgba(239,68,68,0.06)' : row.isNew ? 'rgba(99,102,241,0.06)' : '#f8fafc',
                            borderBottom: '1px solid #e5e7eb',
                          }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: row._delete ? '#ef4444' : row.isNew ? '#6366f1' : '#374151',
                            }}>
                              {row.isNew ? `New Variant #${idx + 1}` : row.label}
                              {row._delete && <span style={{ marginLeft: 6, fontSize: 9, color: '#ef4444' }}>[Marked for deletion]</span>}
                            </span>

                            {row.isNew ? (
                              <button
                                type="button"
                                onClick={() => removeNewRow(row.key)}
                                style={{ padding: 4, borderRadius: 5, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                              >
                                <Trash2 size={11} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateRow(row.key, '_delete', !row._delete)}
                                style={{
                                  padding: '2px 8px', borderRadius: 5,
                                  border: row._delete ? '1px solid rgba(239,68,68,0.4)' : '1px solid #e5e7eb',
                                  background: row._delete ? 'rgba(239,68,68,0.08)' : 'transparent',
                                  cursor: 'pointer', color: row._delete ? '#ef4444' : '#94a3b8',
                                  fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <Trash2 size={10} />
                                {row._delete ? 'Undo' : 'Delete'}
                              </button>
                            )}
                          </div>

                          {/* Row fields (hidden if marked for deletion) */}
                          {!row._delete && (
                            <div style={{ padding: '10px 12px' }}>

                              {/* New variant: option IDs input */}
                              {row.isNew && (
                                <div style={{ marginBottom: 8 }}>
                                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    Option IDs (comma-separated) *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 3,7  (the attribute option IDs)"
                                    value={row.newOptionIdsStr}
                                    onChange={e => updateRow(row.key, 'newOptionIdsStr', e.target.value)}
                                    style={{
                                      width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
                                      padding: '7px 10px', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box',
                                    }}
                                  />
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 }}>
                                {/* Stock */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Stock</label>
                                  <input
                                    type="number" min={0}
                                    value={row.stock}
                                    onChange={e => updateRow(row.key, 'stock', e.target.value)}
                                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                  />
                                </div>

                                {/* Price override */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Price Override</label>
                                  <input
                                    type="number" min={0} step="0.001"
                                    value={row.price_override}
                                    onChange={e => updateRow(row.key, 'price_override', e.target.value)}
                                    placeholder="base"
                                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                  />
                                </div>

                                {/* SKU */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>SKU</label>
                                  <input
                                    type="text"
                                    value={row.sku}
                                    onChange={e => updateRow(row.key, 'sku', e.target.value)}
                                    placeholder="optional"
                                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>

                              {/* Active toggle */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={row.is_active}
                                  onChange={e => updateRow(row.key, 'is_active', e.target.checked)}
                                  style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: 11, color: '#64748b' }}>Active</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Note */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
              }}>
                Note to admin (optional)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Explain why you're requesting this change…"
                style={{
                  width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, outline: 'none',
                  resize: 'none', background: '#fff', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '10px 0', border: '1.5px solid #e5e7eb',
                background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
                borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{
                flex: 1, padding: '10px 0',
                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}