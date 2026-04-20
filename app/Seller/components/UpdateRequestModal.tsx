'use client'

/**
 * UpdateRequestModal.tsx  — FULL REWRITE (compatible with existing ProductVariant.php)
 *
 * option_map shape (from YOUR ProductVariant::getOptionMapAttribute):
 *
 *   Non-color axis:
 *     { id: number, value: string, color_hex: string|null }
 *
 *   Color axis (single OR multi-color group):
 *     { id: number, ids: number[], value: string, color_hex: string|null }
 *       └─ id  = primary (lowest) color option ID
 *       └─ ids = all color option IDs in the group
 *       └─ value = "Red" or "Black+Blue"
 *
 * This component handles both shapes correctly.
 */

import { useRef, useState } from 'react'
import {
  X, Send, Loader2, AlertCircle, Plus, Trash2,
  Info, ChevronDown, ChevronUp, Upload,
} from 'lucide-react'
import { productUpdateRequestsApi } from '@/lib/sellerApi'
import type { VariantRow } from './VariantBuilder'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColorOptionInfo {
  id: number          // primary id
  ids?: number[]      // all ids in the group (multi-color)
  value: string       // "Red" or "Black+Blue"
  color_hex?: string | null
}

interface NonColorOptionInfo {
  id: number
  value: string
  color_hex?: string | null
}

type OptionMap = {
  color?: ColorOptionInfo
  [slug: string]: ColorOptionInfo | NonColorOptionInfo | undefined
}

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
  variantRows: VariantRow[]
  onClose: () => void
  onSubmitted: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
    .replace(/\/api\/?$/, '')
}

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ct_auth_token') ?? ''
}

// ─── Visual combination display ───────────────────────────────────────────────

function CombinationDisplay({ row }: { row: VariantRow }) {
  const map    = (row as any).option_map as OptionMap | undefined | null
  const label  = (row as any).label as string | undefined

  if (!map || Object.keys(map).length === 0) {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
        {label || `Option IDs: ${(row.option_ids ?? []).join(', ')}`}
      </span>
    )
  }

  const colorEntry = map['color'] as ColorOptionInfo | undefined
  const otherAxes  = Object.entries(map).filter(([s]) => s !== 'color') as [string, NonColorOptionInfo][]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {colorEntry && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 999, padding: '3px 8px 3px 4px',
          fontSize: 11, fontWeight: 700, color: '#1e293b',
        }}>
          {/* Multi-color: multiple swatches side-by-side */}
          {colorEntry.ids && colorEntry.ids.length > 1 ? (
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {colorEntry.value.split('+').map((v, i) => (
                <ColorDot key={i} hex={i === 0 ? colorEntry.color_hex : null} value={v} />
              ))}
            </span>
          ) : (
            <ColorDot hex={colorEntry.color_hex} value={colorEntry.value} />
          )}
          {colorEntry.value}
        </div>
      )}
      {otherAxes.map(([slug, opt]) => (
        <span key={slug} style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 6, padding: '3px 8px',
          fontSize: 11, fontWeight: 700, color: '#4f46e5',
        }}>
          {opt.value}
        </span>
      ))}
    </div>
  )
}

function ColorDot({ hex, value }: { hex?: string | null; value: string }) {
  return (
    <span title={value} style={{
      display: 'inline-block', width: 13, height: 13,
      borderRadius: '50%', background: hex || '#e5e7eb',
      border: '1.5px solid rgba(0,0,0,0.14)', flexShrink: 0,
    }} />
  )
}

// ─── State types ──────────────────────────────────────────────────────────────

interface EditRow {
  key: string
  originalId?: number
  origRow: VariantRow
  stock: string
  price_override: string
  sku: string
  is_active: boolean
  _delete: boolean
  newOptionIdsStr: string
  isNew: boolean
}

interface PreviewFile { id: string; file: File; preview: string }

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function UpdateRequestModal({ product, variantRows, onClose, onSubmitted }: Props) {

  const [price, setPrice] = useState(String(product.price ?? ''))
  const [stock, setStock] = useState(String(product.stock ?? '0'))
  const [note,  setNote]  = useState('')

  const hasVariants = variantRows.length > 0

  const [editRows, setEditRows] = useState<EditRow[]>(() =>
    variantRows.map(row => ({
      key:             uid(),
      originalId:      row.id,
      origRow:         row,
      stock:           String(row.stock ?? 0),
      price_override:  (row.price_override !== '' && row.price_override != null)
                         ? String(row.price_override) : '',
      sku:             row.sku ?? '',
      is_active:       row.is_active ?? true,
      _delete:         false,
      newOptionIdsStr: '',
      isNew:           false,
    }))
  )

  const [showVariants, setShowVariants] = useState(false)

  const updateRow = (key: string, field: keyof EditRow, value: any) =>
    setEditRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r))

  const addNewRow = () => {
    setEditRows(prev => [...prev, {
      key: uid(), originalId: undefined, origRow: {} as VariantRow,
      stock: '0', price_override: '', sku: '', is_active: true,
      _delete: false, newOptionIdsStr: '', isNew: true,
    }])
    setShowVariants(true)
  }

  // Image upload (instant — bypasses admin approval)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews,     setPreviews]     = useState<PreviewFile[]>([])
  const [imgUploading, setImgUploading] = useState(false)

  const addImageFiles = (files: File[]) => {
    const toAdd = files.slice(0, 8 - previews.length).map(f => ({
      id: uid(), file: f, preview: URL.createObjectURL(f),
    }))
    setPreviews(prev => [...prev, ...toAdd])
  }

  const removePreview = (id: string) =>
    setPreviews(prev => {
      const found = prev.find(p => p.id === id)
      if (found) URL.revokeObjectURL(found.preview)
      return prev.filter(p => p.id !== id)
    })

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let imagesUploaded = false

      // Step 1 — upload images directly (no approval queue)
      if (previews.length > 0) {
        setImgUploading(true)
        try {
          const fd = new FormData()
          fd.append('_method', 'PUT')
          previews.forEach((p, i) => fd.append(`images[${i}]`, p.file))
          const res = await fetch(`${getApiBase()}/api/seller/products/${product.id}`, {
            method: 'POST',
            headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
            body: fd,
          })
          imagesUploaded = res.ok
        } catch { /* non-fatal */ } finally { setImgUploading(false) }
      }

      // Step 2 — build approval-required payload
      const payload: Record<string, any> = {}

      if (price !== String(product.price)) payload.price = parseFloat(price)
      if (!hasVariants && stock !== String(product.stock)) payload.stock = parseInt(stock, 10)
      if (note.trim()) payload.note = note.trim()

      if (hasVariants || editRows.some(r => r.isNew)) {
        const variants: UpdateRequestVariant[] = []

        for (const er of editRows) {
          if (er.isNew) {
            const ids = er.newOptionIdsStr.split(',')
              .map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
            if (!ids.length) continue
            variants.push({
              option_ids: ids, stock: parseInt(er.stock, 10) || 0,
              price_override: er.price_override !== '' ? parseFloat(er.price_override) : null,
              sku: er.sku || null, is_active: er.is_active,
            })
          } else if (er._delete && er.originalId) {
            variants.push({ id: er.originalId, _delete: true })
          } else if (er.originalId) {
            const orig = er.origRow
            const changed =
              parseInt(er.stock, 10) !== orig.stock ||
              (er.price_override || '') !== String(orig.price_override ?? '') ||
              er.sku !== (orig.sku ?? '') ||
              er.is_active !== orig.is_active
            if (changed) {
              variants.push({
                id: er.originalId,
                stock: parseInt(er.stock, 10) || 0,
                is_active: er.is_active,
                price_override: er.price_override !== '' ? parseFloat(er.price_override) : null,
                ...(er.sku ? { sku: er.sku } : {}),
              })
            }
          }
        }

        if (variants.length) payload.variants = variants
      }

      // If only images were uploaded and nothing else changed
      if (Object.keys(payload).length === 0 || (Object.keys(payload).length === 1 && payload.note)) {
        if (imagesUploaded) { setSuccess(true); setTimeout(() => { onSubmitted(); onClose() }, 1500); return }
        setError('No changes detected.')
        setSaving(false)
        return
      }

      await productUpdateRequestsApi.submit(product.id, payload)
      setSuccess(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1500)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px 14px', borderBottom: '1px solid #f0f0f0',
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
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
            }}>
              <Send size={22} color="#059669" />
            </div>
            <p style={{ fontWeight: 900, color: '#111', margin: '0 0 6px', fontSize: 16 }}>
              Request submitted!
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              You'll be notified once the admin reviews it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#dc2626',
              }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div style={{
              background: '#f8fafc', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#64748b',
            }}>
              <strong style={{ color: '#0f172a' }}>Product:</strong> {product.name}
            </div>

            {/* Price & Stock */}
            <section>
              <SLabel>Price &amp; Stock Changes</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: hasVariants ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <FLabel>New Price (TND)</FLabel>
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="0" step="0.001" value={price}
                      onChange={e => setPrice(e.target.value)} style={INPUT} />
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, color: '#94a3b8', fontWeight: 600,
                    }}>TND</span>
                  </div>
                  <Hint>Current: {Number(product.price).toFixed(3)} TND</Hint>
                </div>
                {!hasVariants && (
                  <div>
                    <FLabel>New Stock</FLabel>
                    <input type="number" min="0" value={stock}
                      onChange={e => setStock(e.target.value)} style={INPUT} />
                    <Hint>Current: {product.stock}</Hint>
                  </div>
                )}
              </div>
            </section>

            {/* Variants */}
            {(hasVariants || editRows.some(r => r.isNew)) && (
              <section>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: showVariants ? 10 : 0,
                }}>
                  <button type="button" onClick={() => setShowVariants(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                      Variant Changes
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: '#6366f1',
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {editRows.length} variant{editRows.length !== 1 ? 's' : ''}
                    </span>
                    {showVariants ? <ChevronUp size={12} color="#94a3b8" /> : <ChevronDown size={12} color="#94a3b8" />}
                  </button>
                  <button type="button" onClick={addNewRow} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, color: '#6366f1',
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <Plus size={11} /> Add variant
                  </button>
                </div>

                {showVariants && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      background: '#eff6ff', border: '1px solid #bfdbfe',
                      borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#1e40af', marginBottom: 10,
                    }}>
                      <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        Variant changes go through admin approval. For <strong>stock-only</strong> updates use the{' '}
                        <strong>Restock</strong> button — it's instant.
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {editRows.map((er, idx) => (
                        <VariantCard key={er.key} er={er} index={idx}
                          onUpdate={(f, v) => updateRow(er.key, f, v)}
                          onRemoveNew={() => setEditRows(p => p.filter(r => r.key !== er.key))}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Images — instant, no approval */}
            {!hasVariants && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                      Add Images
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#10b981',
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      ✓ Instant — no approval
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{previews.length}/8</span>
                </div>

                {previews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    {previews.map(p => (
                      <div key={p.id} style={{
                        position: 'relative', aspectRatio: '1',
                        borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb',
                      }}>
                        <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => removePreview(p.id)} style={{
                          position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                          background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#fff',
                        }}>
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {previews.length < 8 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); addImageFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }}
                    style={{
                      border: '2px dashed #e5e7eb', borderRadius: 12, padding: '16px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#10b981')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <Upload size={18} color="#94a3b8" />
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0 }}>
                      Drop images or <span style={{ color: '#db142e' }}>browse</span>
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>JPG, PNG, WebP · max 5 MB each</p>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => { addImageFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                  </div>
                )}
              </section>
            )}

            {/* Note */}
            <div>
              <FLabel>Note to admin (optional)</FLabel>
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Explain why you're requesting this change…"
                style={{ ...INPUT, resize: 'none', lineHeight: 1.5 }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '10px 0', border: '1.5px solid #e5e7eb',
                background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
                borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button type="submit" disabled={saving} style={{
                flex: 2, padding: '10px 0',
                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.65 : 1, fontFamily: 'inherit',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'opacity 0.2s',
              }}>
                {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {imgUploading ? 'Uploading images…' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── VariantCard ──────────────────────────────────────────────────────────────

function VariantCard({ er, index, onUpdate, onRemoveNew }: {
  er: EditRow
  index: number
  onUpdate: (f: keyof EditRow, v: any) => void
  onRemoveNew: () => void
}) {
  const orig = er.origRow
  const stockChanged  = !!orig.id && parseInt(er.stock, 10) !== orig.stock
  const priceChanged  = !!orig.id && (er.price_override || '') !== String(orig.price_override ?? '')
  const skuChanged    = !!orig.id && er.sku !== (orig.sku ?? '')
  const activeChanged = !!orig.id && er.is_active !== orig.is_active
  const anyChanged    = stockChanged || priceChanged || skuChanged || activeChanged
  const isDeleted     = er._delete

  const borderColor = isDeleted ? 'rgba(239,68,68,0.4)' : er.isNew ? 'rgba(99,102,241,0.35)' : anyChanged ? 'rgba(245,158,11,0.4)' : '#e5e7eb'
  const headerBg    = isDeleted ? 'rgba(239,68,68,0.05)' : er.isNew ? 'rgba(99,102,241,0.05)' : anyChanged ? 'rgba(245,158,11,0.04)' : '#f8fafc'

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden', opacity: isDeleted ? 0.55 : 1, transition: 'all 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {er.isNew ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>New Variant #{index + 1}</span>
          ) : (
            <>
              <CombinationDisplay row={er.origRow} />
              {isDeleted  && <Bdg color="red">Pending deletion</Bdg>}
              {anyChanged && !isDeleted && <Bdg color="amber">Modified</Bdg>}
            </>
          )}
        </div>
        {er.isNew ? (
          <button type="button" onClick={onRemoveNew} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', fontSize: 10, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={10} /> Remove
          </button>
        ) : (
          <button type="button" onClick={() => onUpdate('_delete', !er._delete)} style={{ padding: '3px 8px', borderRadius: 5, border: er._delete ? '1px solid rgba(239,68,68,0.4)' : '1px solid #e5e7eb', background: er._delete ? 'rgba(239,68,68,0.08)' : 'transparent', cursor: 'pointer', color: er._delete ? '#ef4444' : '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={10} /> {er._delete ? 'Undo' : 'Delete'}
          </button>
        )}
      </div>

      {/* Body */}
      {!isDeleted && (
        <div style={{ padding: '10px 12px' }}>
          {er.isNew && (
            <div style={{ marginBottom: 10 }}>
              <MLabel>Option IDs (comma-separated) <span style={{ color: '#ef4444' }}>*</span></MLabel>
              <input type="text" placeholder="e.g. 3, 7" value={er.newOptionIdsStr}
                onChange={e => onUpdate('newOptionIdsStr', e.target.value)} style={INPUT} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 }}>
            <div>
              <MLabel>Stock {stockChanged && <Dot />}</MLabel>
              <input type="number" min={0} value={er.stock}
                onChange={e => onUpdate('stock', e.target.value)}
                style={{ ...INPUT, textAlign: 'center' }} />
              {orig.id && <span style={{ fontSize: 9, color: '#94a3b8' }}>was {orig.stock}</span>}
            </div>
            <div>
              <MLabel>Price Override {priceChanged && <Dot />}</MLabel>
              <input type="number" min={0} step="0.001" value={er.price_override} placeholder="base"
                onChange={e => onUpdate('price_override', e.target.value)} style={INPUT} />
            </div>
            <div>
              <MLabel>SKU {skuChanged && <Dot />}</MLabel>
              <input type="text" value={er.sku} placeholder="optional"
                onChange={e => onUpdate('sku', e.target.value)} style={INPUT} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
            <input type="checkbox" id={`active-${er.key}`} checked={er.is_active}
              onChange={e => onUpdate('is_active', e.target.checked)}
              style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
            <label htmlFor={`active-${er.key}`} style={{ fontSize: 11, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Active {activeChanged && <Dot />}
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Micro-components & constants ─────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', border: '1px solid #e5e7eb', borderRadius: 10,
  padding: '8px 12px', fontSize: 13, fontWeight: 500,
  outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 10px' }}>{children}</p>
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{children}</label>
}
function MLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{children}</div>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>{children}</p>
}
function Dot() {
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
}
function Bdg({ children, color }: { children: React.ReactNode; color: 'red' | 'amber' }) {
  const s = color === 'red'
    ? { c: '#ef4444', bg: 'rgba(239,68,68,0.1)',  b: 'rgba(239,68,68,0.25)'  }
    : { c: '#b45309', bg: 'rgba(245,158,11,0.1)', b: 'rgba(245,158,11,0.3)'  }
  return <span style={{ fontSize: 9, fontWeight: 800, color: s.c, background: s.bg, border: `1px solid ${s.b}`, padding: '1px 5px', borderRadius: 4 }}>{children}</span>
}