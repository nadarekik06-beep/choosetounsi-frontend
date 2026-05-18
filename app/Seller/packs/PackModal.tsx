'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Loader2, AlertCircle, Plus, Trash2,
  Search, Upload, Package2, TrendingDown,
} from 'lucide-react'
import { packsApi, type PackPayload, type PackItemPayload } from '@/lib/sellerApi'
import CommissionPreview from '@/app/seller/components/CommissionPreview'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerProduct {
  id: number
  name: string
  price: number
  primary_image_url: string | null
  has_variants: boolean
  variants: Array<{
    id: number
    label: string
    stock: number
    price_override: number | null
    is_active: boolean
  }>
}

interface PackItemRow {
  _key: string
  product: SellerProduct | null
  allowed_variant_ids: number[] | null  // null = all variants
  quantity: number
}

interface PackModalProps {
  pack: any | null
  onClose: () => void
  onSaved: () => void
}

function fmt(n: number) {
  return n.toFixed(3) + ' TND'
}

function makeEmptyRow(): PackItemRow {
  return {
    _key:                Math.random().toString(36).slice(2),
    product:             null,
    allowed_variant_ids: null,
    quantity:            1,
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function PackModal({ pack, onClose, onSaved }: PackModalProps) {
  const isEdit = !!pack

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,             setName]             = useState(pack?.name              ?? '')
  const [description,      setDescription]      = useState(pack?.description       ?? '')
  const [shortDescription, setShortDescription] = useState(pack?.short_description ?? '')
  const [packPrice,        setPackPrice]         = useState(pack?.pack_price?.toString() ?? '')
  const [isActive,         setIsActive]          = useState(pack?.is_active ?? true)

  // Image
  const [imagePreview, setImagePreview] = useState<string | null>(pack?.image_url ?? null)
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Items — initialized from server data (edit) or empty (create)
  const [items, setItems] = useState<PackItemRow[]>(() => {
    if (!pack?.items?.length) return [makeEmptyRow()]
    return pack.items.map((item: any) => ({
      _key:                Math.random().toString(36).slice(2),
      product:             item.product
        ? {
            id:                item.product.id,
            name:              item.product.name,
            price:             item.product.price,
            primary_image_url: item.product.primary_image_url,
            has_variants:      item.product.has_variants ?? (item.available_variants?.length > 0),
            variants:          item.available_variants ?? [],
          }
        : null,
      allowed_variant_ids: item.allowed_variant_ids ?? null,
      quantity:            item.quantity ?? 1,
    }))
  })

  // Product picker state
  const [pickerIdx,    setPickerIdx]    = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [allProducts,  setAllProducts]  = useState<SellerProduct[]>([])
  const [prodLoading,  setProdLoading]  = useState(false)

  // Submission
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  // ── Load products for picker ────────────────────────────────────────────────
  const loadProducts = useCallback(async (search = '') => {
    setProdLoading(true)
    try {
      const res = await packsApi.getSellerProducts(search)
      setAllProducts(res.data ?? [])
    } catch {
      setAllProducts([])
    } finally {
      setProdLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Debounced picker search
  useEffect(() => {
    if (pickerIdx === null) return
    const t = setTimeout(() => loadProducts(pickerSearch), 300)
    return () => clearTimeout(t)
  }, [pickerSearch, pickerIdx, loadProducts])

  // ── Pricing calculations ────────────────────────────────────────────────────

  const originalPrice = items.reduce((sum, row) => {
    if (!row.product) return sum
    let unitPrice = row.product.price
    if (row.product.has_variants && row.product.variants.length > 0) {
      const relevant = row.allowed_variant_ids
        ? row.product.variants.filter(v => row.allowed_variant_ids!.includes(v.id))
        : row.product.variants
      if (relevant.length > 0) {
        const prices = relevant.map(v =>
          v.price_override != null ? v.price_override : row.product!.price
        )
        unitPrice = Math.min(...prices)
      }
    }
    return sum + unitPrice * row.quantity
  }, 0)

  const packPriceNum = parseFloat(packPrice) || 0
  const savings      = Math.max(0, originalPrice - packPriceNum)
  const savingsPct   = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0

  // ── Item helpers ────────────────────────────────────────────────────────────

  const updateItem = (idx: number, patch: Partial<PackItemRow>) =>
    setItems(prev => prev.map((row, i) => i === idx ? { ...row, ...patch } : row))

  const removeItem = (idx: number) =>
    setItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))

  const selectProduct = (idx: number, product: SellerProduct) => {
    updateItem(idx, { product, allowed_variant_ids: null })
    setPickerIdx(null)
    setPickerSearch('')
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Required.'
    if (!packPrice || isNaN(packPriceNum) || packPriceNum <= 0) e.pack_price = 'Enter a valid price.'
    if (items.every(r => !r.product)) e.items = 'Add at least one product.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')

    const itemPayload: PackItemPayload[] = items
      .filter(r => r.product !== null)
      .map(r => ({
        product_id:          r.product!.id,
        allowed_variant_ids: r.allowed_variant_ids ?? null,
        quantity:            r.quantity,
      }))

    const payload: PackPayload = {
      name,
      description:       description      || undefined,
      short_description: shortDescription || undefined,
      pack_price:        packPriceNum,
      is_active:         isActive,
      items:             itemPayload,
      image:             imageFile ?? undefined,
    }

    try {
      if (isEdit) {
        await packsApi.update(pack.id, payload)
      } else {
        await packsApi.create(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      setApiError(data?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
        width: '100%', maxWidth: 860,
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
              {isEdit ? 'Edit Pack' : 'Create New Pack'}
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
              {isEdit
                ? 'Update your bundle.'
                : 'Bundle your products and set a special pack price.'}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: 6, borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}
        >

          {apiError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {apiError}
            </div>
          )}

          {/* ── Two-column layout ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* ══ LEFT — Info ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <SectionLabel>Pack Information</SectionLabel>

              <Field label="Pack Name" required error={errors.name}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Summer Starter Kit"
                  className={inputCls(errors.name)}
                />
              </Field>

              <Field label="Short Description">
                <input
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  placeholder="One-line summary…"
                  maxLength={500}
                  className={inputCls()}
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What's included and why it's a great deal…"
                  className={`${inputCls()} resize-none`}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Pack Price (TND)" required error={errors.pack_price}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" step="0.001"
                      value={packPrice}
                      onChange={e => setPackPrice(e.target.value)}
                      placeholder="0.000"
                      className={inputCls(errors.pack_price)}
                      style={{ paddingRight: 44 }}
                    />
                    <span style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 11, color: '#94a3b8', fontWeight: 600,
                    }}>TND</span>
                  </div>
                </Field>

                <Field label="Status">
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={e => setIsActive(e.target.value === 'active')}
                    className={inputCls()}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              {/*
               * ── COMMISSION PREVIEW ──────────────────────────────────────
               * Commission is calculated on the WHOLE pack_price as one unit.
               * This is the same CommissionPreview used in ProductModal,
               * just with a different label to make it clear to the seller.
               *
               * The seller sees:
               *   - Commission % on pack_price (not per product)
               *   - Platform fee amount
               *   - Their net earnings per pack sold
               */}
              <CommissionPreview
                price={packPrice}
                label="per pack sold"
                priceLabel="pack price"
              />

              {/* ── Pricing summary ── */}
              {originalPrice > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg,rgba(219,20,46,0.05),rgba(219,20,46,0.02))',
                  border: '1.5px solid rgba(219,20,46,0.2)',
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Customer Savings
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                    <span>Items total (min prices)</span>
                    <span style={{ fontWeight: 700 }}>{fmt(originalPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                    <span>Pack price</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      {packPriceNum > 0 ? fmt(packPriceNum) : '—'}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(219,20,46,0.15)', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 13, fontWeight: 800,
                        color: savings > 0 ? '#10b981' : '#ef4444',
                      }}>
                        <TrendingDown size={13} />
                        {savings > 0 ? 'Customer saves' : 'No savings yet'}
                      </span>
                      {savings > 0 && (
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>
                          {fmt(savings)}
                          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 4 }}>
                            ({savingsPct}%)
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Image upload ── */}
              <SectionLabel>Pack Image</SectionLabel>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #e5e7eb', borderRadius: 14,
                  overflow: 'hidden', cursor: 'pointer', height: 150,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: imagePreview ? 'transparent' : '#f8fafc',
                  position: 'relative',
                }}
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Upload
                      size={24} color="#94a3b8"
                      style={{ margin: '0 auto 8px', display: 'block' }}
                    />
                    <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, margin: '0 0 3px' }}>
                      Upload pack image
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                      JPG, PNG, WebP
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef} type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setImageFile(file)
                    setImagePreview(URL.createObjectURL(file))
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* ══ RIGHT — Items ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>Pack Items</SectionLabel>
                <button
                  type="button"
                  onClick={() => setItems(prev => [...prev, makeEmptyRow()])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, color: '#db142e',
                    background: 'rgba(219,20,46,0.07)',
                    border: '1px solid rgba(219,20,46,0.2)',
                    padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>

              {errors.items && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: '-8px 0 0' }}>
                  {errors.items}
                </p>
              )}

              {/* Items list */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                maxHeight: 560, overflowY: 'auto', overflowX: 'visible',
                paddingRight: 2,
              }}>
                {items.map((row, idx) => (
                  <ItemRow
                    key={row._key}
                    row={row}
                    products={allProducts}
                    prodLoading={prodLoading}
                    pickerOpen={pickerIdx === idx}
                    pickerSearch={pickerSearch}
                    onOpenPicker={() => { setPickerIdx(idx); setPickerSearch('') }}
                    onClosePicker={() => setPickerIdx(null)}
                    onSearchChange={setPickerSearch}
                    onSelectProduct={p => selectProduct(idx, p)}
                    onChangeAllowedVariants={ids => updateItem(idx, { allowed_variant_ids: ids })}
                    onChangeQty={qty => updateItem(idx, { quantity: qty })}
                    onRemove={() => removeItem(idx)}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{
            display: 'flex', gap: 12,
            paddingTop: 12, paddingBottom: 2,
            position: 'sticky', bottom: 0, background: '#fff',
            borderTop: '1px solid #f0f0f0',
          }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px 0', border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
              borderRadius: 12, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '12px 0',
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
              opacity: saving ? 0.6 : 1,
            }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {isEdit ? 'Save Pack' : 'Create Pack'}
            </button>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </form>
      </div>
    </div>
  )
}

// ── Item Row ───────────────────────────────────────────────────────────────────
// (Identical to original — no commission changes needed here.
//  Commission on packs is on pack_price only, not per item.)

function ItemRow({
  row, products, prodLoading,
  pickerOpen, pickerSearch,
  onOpenPicker, onClosePicker, onSearchChange,
  onSelectProduct, onChangeAllowedVariants, onChangeQty, onRemove, canRemove,
}: {
  row: PackItemRow
  products: SellerProduct[]; prodLoading: boolean
  pickerOpen: boolean; pickerSearch: string
  onOpenPicker: () => void; onClosePicker: () => void
  onSearchChange: (v: string) => void
  onSelectProduct: (p: SellerProduct) => void
  onChangeAllowedVariants: (ids: number[] | null) => void
  onChangeQty: (q: number) => void
  onRemove: () => void; canRemove: boolean
}) {
  const totalVariants = row.product?.variants.length ?? 0
  const checkedIds    = row.allowed_variant_ids
  const checkedCount  = checkedIds === null ? totalVariants : checkedIds.length

  const isChecked = (vid: number) =>
    checkedIds === null || checkedIds.includes(vid)

  const toggleVariant = (vid: number) => {
    if (!row.product) return
    const allIds = row.product.variants.map(v => v.id)
    if (checkedIds === null) {
      const next = allIds.filter(id => id !== vid)
      onChangeAllowedVariants(next.length === 0 ? [vid] : next)
    } else {
      const next = checkedIds.includes(vid)
        ? checkedIds.filter(id => id !== vid)
        : [...checkedIds, vid]
      if (next.length === 0) return
      onChangeAllowedVariants(next.length === allIds.length ? null : next)
    }
  }

  return (
    <div style={{
      border: '1.5px solid #e5e7eb',
      borderRadius: 16,
      background: '#ffffff',
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'visible',
    }}>

      {/* ── TOP BAR ── */}
      <div
        onClick={onOpenPicker}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          background: '#fafafa',
          borderRadius: row.product ? '16px 16px 0 0' : 16,
          borderBottom: row.product ? '1px solid #f0f0f0' : 'none',
          cursor: 'pointer',
        }}
      >
        {/* Thumbnail */}
        <div style={{
          width: 54, height: 54, borderRadius: 12, flexShrink: 0,
          overflow: 'hidden', background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #e5e7eb',
        }}>
          {row.product?.primary_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.product.primary_image_url} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Package2 size={22} color={row.product ? '#94a3b8' : '#dc2626'} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {row.product ? (
            <>
              <p style={{
                fontSize: 14, fontWeight: 800, color: '#0f172a',
                margin: '0 0 4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row.product.name}
              </p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>
                Base: <strong style={{ color: '#0f172a' }}>
                  {row.product.price.toFixed(3)} TND
                </strong>
                {row.product.has_variants && (
                  <span style={{
                    marginLeft: 8, fontWeight: 700,
                    color: checkedCount > 0 ? '#198f41' : '#ef4444',
                  }}>
                    · {checkedCount}/{totalVariants} variants
                  </span>
                )}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: 0 }}>
              Click to select a product…
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <span
            style={{
              fontSize: 10, fontWeight: 700, color: '#94a3b8',
              background: '#f1f5f9', border: '1px solid #e5e7eb',
              padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
            }}
            onClick={onOpenPicker}
          >
            {row.product ? 'Change ↓' : 'Select ↓'}
          </span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.06)',
                cursor: 'pointer', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── PICKER DROPDOWN ── */}
      {pickerOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 200,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid #f3f4f6',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              autoFocus
              value={pickerSearch}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search your products…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 13, color: '#0f172a', background: 'transparent',
              }}
            />
            <button
              type="button" onClick={onClosePicker}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} color="#94a3b8" />
            </button>
          </div>

          {prodLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 6px', display: 'block' }} />
              Loading…
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No approved products found.
            </div>
          ) : products.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid #f8fafc',
              }}
              className="picker-row"
            >
              <div style={{
                width: 42, height: 42, borderRadius: 8, flexShrink: 0,
                overflow: 'hidden', background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.primary_image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.primary_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Package2 size={16} color="#94a3b8" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: '#0f172a',
                  margin: '0 0 2px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.name}
                </p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  {p.price.toFixed(3)} TND
                </p>
              </div>
              {p.has_variants && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  padding: '2px 7px', borderRadius: 5, flexShrink: 0,
                }}>
                  {p.variants.length} variants
                </span>
              )}
            </div>
          ))}
          <style>{`.picker-row:hover { background: #f8fafc !important; }`}</style>
        </div>
      )}

      {/* ── BODY: variants + quantity ── */}
      {row.product && (
        <div style={{ padding: '16px 16px 14px' }}>

          {row.product.has_variants && row.product.variants.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 10,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
                }}>
                  Variants client can choose from
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                  color: checkedCount === totalVariants ? '#198f41' : '#f59e0b',
                  background: checkedCount === totalVariants
                    ? 'rgba(25,143,65,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${checkedCount === totalVariants
                    ? 'rgba(25,143,65,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                  {checkedCount}/{totalVariants} selected
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 8,
              }}>
                {row.product.variants.map(v => {
                  const checked    = isChecked(v.id)
                  const outOfStock = v.stock === 0
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVariant(v.id)}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${
                          checked
                            ? outOfStock ? 'rgba(239,68,68,0.5)' : '#dc2626'
                            : '#e5e7eb'
                        }`,
                        background: checked
                          ? outOfStock ? 'rgba(239,68,68,0.05)' : 'rgba(220,38,38,0.05)'
                          : '#f8fafc',
                        textAlign: 'left',
                      }}
                    >
                      <p style={{
                        fontSize: 12, fontWeight: 700, margin: '0 0 3px',
                        color: checked
                          ? outOfStock ? '#ef4444' : '#dc2626'
                          : '#374151',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {checked && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 14, height: 14, borderRadius: '50%',
                            background: outOfStock ? '#ef4444' : '#dc2626',
                            color: '#fff', fontSize: 8, flexShrink: 0,
                          }}>✓</span>
                        )}
                        {v.label}
                      </p>
                      <p style={{
                        fontSize: 10, margin: 0, fontWeight: 600,
                        color: outOfStock ? '#ef4444' : '#94a3b8',
                      }}>
                        {outOfStock ? '⚠ Out of stock' : `${v.stock} in stock`}
                      </p>
                    </button>
                  )
                })}
              </div>

              <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0', fontStyle: 'italic' }}>
                {checkedIds === null
                  ? `All ${totalVariants} variants included — client picks at checkout`
                  : `${checkedCount} of ${totalVariants} variant${totalVariants !== 1 ? 's' : ''} available to client`
                }
              </p>
            </div>
          )}

          {!row.product.has_variants && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: '#f8fafc', border: '1px solid #e5e7eb',
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>
                Simple product — no variants. Added as-is.
              </p>
            </div>
          )}

          {/* ── Quantity row ── */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: '#f8fafc', borderRadius: 12,
            border: '1px solid #e5e7eb',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#374151', margin: '0 0 2px' }}>
                Quantity per pack
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                Units the client gets of this product
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => onChangeQty(Math.max(1, row.quantity - 1))}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  cursor: 'pointer', fontSize: 20, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#374151',
                }}
              >
                −
              </button>
              <span style={{ minWidth: 36, textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                {row.quantity}
              </span>
              <button
                type="button"
                onClick={() => onChangeQty(row.quantity + 1)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  cursor: 'pointer', fontSize: 20, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#374151',
                }}
              >
                +
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
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
        fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        color: '#94a3b8', marginBottom: 5,
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition bg-white
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`