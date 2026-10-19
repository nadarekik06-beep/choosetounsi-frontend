'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  X, AlertCircle, Plus, Search, Upload, Package2, TrendingDown, ChevronDown, Check,
} from 'lucide-react'
import { packsApi, type PackPayload, type PackItemPayload } from '@/lib/sellerApi'
import CommissionPreview from '@/app/seller/components/CommissionPreview'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

import BrandLoader from '@/components/brand/BrandLoader'
// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerProduct {
  id: number
  name: string
  price: number
  stock?: number
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
  product: SellerProduct
  allowed_variant_ids: number[] | null  // null = all variants
  quantity: number
}

interface PackModalProps {
  pack: any | null
  onClose: () => void
  onSaved: () => void
}

function useFmt() {
  const { price } = useFormat()
  return (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

const newKey = () => Math.random().toString(36).slice(2)

// Case- and accent-insensitive match key ("Été" → "ete").
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Cheapest unit price the customer can get for this row (variants may override the base price).
function rowUnitPrice(row: PackItemRow): number {
  const { product } = row
  if (!product.has_variants || product.variants.length === 0) return product.price
  const relevant = row.allowed_variant_ids
    ? product.variants.filter(v => row.allowed_variant_ids!.includes(v.id))
    : product.variants
  if (relevant.length === 0) return product.price
  return Math.min(...relevant.map(v => v.price_override != null ? v.price_override : product.price))
}

function productStock(p: SellerProduct): number | null {
  if (p.has_variants && p.variants.length > 0) return p.variants.reduce((s, v) => s + (v.stock ?? 0), 0)
  return typeof p.stock === 'number' ? p.stock : null
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function PackModal({ pack, onClose, onSaved }: PackModalProps) {
  const isEdit = !!pack
  const t   = useTranslations('seller.packForm')
  const tc  = useTranslations('seller.commission')
  const fmt = useFmt()
  const { currency } = useFormat()

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
  const [items, setItems] = useState<PackItemRow[]>(() =>
    (pack?.items ?? [])
      .filter((item: any) => item.product)
      .map((item: any) => ({
        _key:    newKey(),
        product: {
          id:                item.product.id,
          name:              item.product.name,
          price:             item.product.price,
          stock:             item.product.stock,
          primary_image_url: item.product.primary_image_url,
          has_variants:      item.product.has_variants ?? (item.available_variants?.length > 0),
          variants:          item.available_variants ?? [],
        },
        allowed_variant_ids: item.allowed_variant_ids ?? null,
        quantity:            item.quantity ?? 1,
      }))
  )

  // Product picker state
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [allProducts,  setAllProducts]  = useState<SellerProduct[]>([])
  const [prodLoading,  setProdLoading]  = useState(true)

  // Submission
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  // ── Load the seller's products once; the picker filters them locally ───────
  useEffect(() => {
    let cancelled = false
    packsApi.getSellerProducts()
      .then(res => { if (!cancelled) setAllProducts(res.data ?? []) })
      .catch(() => { if (!cancelled) setAllProducts([]) })
      .finally(() => { if (!cancelled) setProdLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Pricing calculations ────────────────────────────────────────────────────

  const originalPrice = items.reduce((sum, row) => sum + rowUnitPrice(row) * row.quantity, 0)
  const packPriceNum  = parseFloat(packPrice) || 0
  const savings       = Math.max(0, originalPrice - packPriceNum)
  const savingsPct    = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0
  const priceTooHigh  = originalPrice > 0 && packPriceNum > 0 && packPriceNum >= originalPrice

  // ── Item helpers ────────────────────────────────────────────────────────────

  const addedIds = useMemo(() => new Set(items.map(r => r.product.id)), [items])

  const updateItem = (key: string, patch: Partial<PackItemRow>) =>
    setItems(prev => prev.map(row => row._key === key ? { ...row, ...patch } : row))

  const removeItem = (key: string) =>
    setItems(prev => prev.filter(row => row._key !== key))

  const addProduct = useCallback((product: SellerProduct) => {
    setItems(prev => prev.some(r => r.product.id === product.id)
      ? prev
      : [...prev, { _key: newKey(), product, allowed_variant_ids: null, quantity: 1 }])
    setErrors(e => { const rest = { ...e }; delete rest.items; return rest })
  }, [])

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('errors.required')
    if (!packPrice || isNaN(packPriceNum) || packPriceNum <= 0) e.pack_price = t('errors.price')
    if (items.length === 0) e.items = t('errors.items')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')

    const itemPayload: PackItemPayload[] = items.map(r => ({
      product_id:          r.product.id,
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
      setApiError(data?.message ?? t('errors.saveFailed'))
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
      <div
        role="dialog" aria-modal="true" aria-labelledby="pack-modal-title"
        style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 960,
          height: '92vh', maxHeight: 920,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
        }}>
          <div>
            <h2 id="pack-modal-title" style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
              {isEdit ? t('editTitle') : t('createTitle')}
            </h2>
            <p style={{ fontSize: 11, color: '#5b6472', margin: '3px 0 0' }}>
              {isEdit ? t('editSubtitle') : t('createSubtitle')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} style={{
            padding: 6, borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#5b6472',
          }}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {/* ── Body: the only scroll container ── */}
          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: 24, display: 'flex', flexDirection: 'column', gap: 22,
          }}>

            {apiError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {apiError}
              </div>
            )}

            {/* ── Two-column layout (stacks below 900px) ── */}
            <div className="pack-modal-grid">

              {/* ══ LEFT — Info ══ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

                <SectionLabel>{t('info')}</SectionLabel>

                <Field label={t('name')} required error={errors.name} htmlFor="pack-name">
                  <input
                    id="pack-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className={inputCls(errors.name)}
                  />
                </Field>

                <Field label={t('shortDescription')} htmlFor="pack-short-description">
                  <input
                    id="pack-short-description"
                    value={shortDescription}
                    onChange={e => setShortDescription(e.target.value)}
                    placeholder={t('shortDescriptionPlaceholder')}
                    maxLength={500}
                    className={inputCls()}
                  />
                </Field>

                <Field label={t('description')} htmlFor="pack-description">
                  <textarea
                    id="pack-description"
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    className={`${inputCls()} resize-none`}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('price', { currency })} required error={errors.pack_price} htmlFor="pack-price">
                    <div style={{ position: 'relative' }}>
                      <input
                        id="pack-price"
                        type="number" min="0" step="0.001"
                        value={packPrice}
                        onChange={e => setPackPrice(e.target.value)}
                        placeholder="0.000"
                        className={inputCls(errors.pack_price || (priceTooHigh ? 'warn' : undefined))}
                        style={{ paddingInlineEnd: 44 }}
                      />
                      <span style={{
                        position: 'absolute', insetInlineEnd: 10, top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 11, color: '#5b6472', fontWeight: 600,
                      }}>{currency}</span>
                    </div>
                  </Field>

                  <Field label={t('status')} htmlFor="pack-status">
                    <select
                      id="pack-status"
                      value={isActive ? 'active' : 'inactive'}
                      onChange={e => setIsActive(e.target.value === 'active')}
                      className={inputCls()}
                    >
                      <option value="active">{t('active')}</option>
                      <option value="inactive">{t('inactive')}</option>
                    </select>
                  </Field>
                </div>

                {/* ── Savings next to the pack price ── */}
                {originalPrice > 0 && packPriceNum > 0 && (
                  priceTooHigh ? (
                    <div role="alert" style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      background: '#fffbeb', border: '1px solid #fde68a',
                      borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#92400e', fontWeight: 600,
                    }}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      {t('priceTooHigh', { total: fmt(originalPrice) })}
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(4,120,87,0.06)', border: '1px solid rgba(4,120,87,0.2)',
                      borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#047857', fontWeight: 800,
                    }}>
                      <TrendingDown size={14} />
                      {t('savingsInline', { amount: fmt(savings), pct: savingsPct })}
                    </div>
                  )
                )}

                {/*
                 * Commission is calculated on the WHOLE pack_price as one unit
                 * (not per product) — same CommissionPreview as ProductModal.
                 */}
                <CommissionPreview
                  price={packPrice}
                  label={tc('perPack')}
                  priceLabel={tc('packPrice')}
                />

                {/* ── Image upload ── */}
                <SectionLabel>{t('image')}</SectionLabel>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed #e5e7eb', borderRadius: 14,
                    overflow: 'hidden', cursor: 'pointer', height: 150, flexShrink: 0,
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
                        {t('uploadImage')}
                      </p>
                      <p style={{ fontSize: 11, color: '#5b6472', margin: 0 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1 }}><SectionLabel>{t('items')}</SectionLabel></div>
                  {!pickerOpen && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        fontSize: 11, fontWeight: 700, color: '#db142e',
                        background: 'rgba(219,20,46,0.07)',
                        border: '1px solid rgba(219,20,46,0.2)',
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      <Plus size={12} /> {t('addItem')}
                    </button>
                  )}
                </div>

                {errors.items && (
                  <p style={{ fontSize: 11, color: '#b91c1c', margin: '-8px 0 0' }}>
                    {errors.items}
                  </p>
                )}

                {pickerOpen && (
                  <ProductPicker
                    products={allProducts}
                    loading={prodLoading}
                    addedIds={addedIds}
                    onAdd={addProduct}
                    onClose={() => setPickerOpen(false)}
                  />
                )}

                {/* Selected items */}
                {items.length === 0 ? (
                  !pickerOpen && (
                    <p style={{ fontSize: 12, color: '#5b6472', margin: 0 }}>
                      {t('emptyItems')}
                    </p>
                  )
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(row => (
                      <SelectedRow
                        key={row._key}
                        row={row}
                        onChangeAllowedVariants={ids => updateItem(row._key, { allowed_variant_ids: ids })}
                        onChangeQty={qty => updateItem(row._key, { quantity: qty })}
                        onRemove={() => removeItem(row._key)}
                      />
                    ))}
                  </ul>
                )}

                {/* Totals */}
                {items.length > 0 && (
                  <div style={{
                    marginTop: 'auto',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: '#f8fafc', border: '1px solid #e5e7eb',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t('totalValue')}</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{fmt(originalPrice)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Actions (outside the scroll area → always visible) ── */}
          <div style={{
            display: 'flex', gap: 12, flexShrink: 0,
            padding: '14px 24px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
          }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px 0', border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
              borderRadius: 12, cursor: 'pointer',
            }}>
              {t('cancel')}
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
              {saving && <BrandLoader variant="inline" size={14} />}
              {isEdit ? t('save') : t('create')}
            </button>
          </div>
        </form>

        <style>{`
          .pack-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; flex: 1 0 auto; }
          @media (max-width: 900px) { .pack-modal-grid { grid-template-columns: 1fr; } }
          .pack-picker-option[aria-disabled="false"]:hover,
          .pack-picker-option[data-active="true"] { background: #fef2f2; }
        `}</style>
      </div>
    </div>
  )
}

// ── Product picker (inline panel: pushes content down, never clipped) ───────────

function ProductPicker({ products, loading, addedIds, onAdd, onClose }: {
  products: SellerProduct[]
  loading: boolean
  addedIds: Set<number>
  onAdd: (p: SellerProduct) => void
  onClose: () => void
}) {
  const t   = useTranslations('seller.packForm')
  const fmt = useFmt()
  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const q = normalize(query)
    return q ? products.filter(p => normalize(p.name).includes(q)) : products
  }, [products, query])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (p: SellerProduct | undefined) => {
    if (p && !addedIds.has(p.id)) onAdd(p)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the pack form from the search box
      pick(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  const activeId = results[active] ? `pack-picker-opt-${results[active].id}` : undefined

  return (
    <div style={{
      border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#fff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: '1px solid #f3f4f6',
      }}>
        <Search size={14} color="#94a3b8" aria-hidden />
        <label htmlFor="pack-picker-search" className="sr-only">{t('pickerLabel')}</label>
        <input
          id="pack-picker-search"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="pack-picker-list"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          value={query}
          onChange={e => { setQuery(e.target.value); setActive(0) }}
          onKeyDown={onKeyDown}
          placeholder={t('searchProducts')}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none',
            fontSize: 13, color: '#0f172a', background: 'transparent',
          }}
        />
        <button
          type="button" onClick={onClose}
          aria-label={t('closeSearch')}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
        >
          <X size={14} color="#94a3b8" />
        </button>
      </div>

      {loading ? (
        <div role="status" style={{ padding: 28, textAlign: 'center', color: '#5b6472', fontSize: 13 }}>
          <BrandLoader variant="inline" size={16} style={{ margin: '0 auto 6px', display: 'block' }} />
          {t('loading')}
        </div>
      ) : results.length === 0 ? (
        <div role="status" style={{ padding: 28, textAlign: 'center', color: '#5b6472', fontSize: 13 }}>
          {products.length === 0 ? t('noProducts') : t('noMatch')}
        </div>
      ) : (
        <ul
          id="pack-picker-list"
          ref={listRef}
          role="listbox"
          aria-label={t('pickerLabel')}
          style={{
            listStyle: 'none', margin: 0, padding: 4,
            minHeight: Math.min(results.length * 72, 320), maxHeight: 360, overflowY: 'auto',
          }}
        >
          {results.map((p, i) => {
            const added = addedIds.has(p.id)
            const stock = productStock(p)
            return (
              <li
                key={p.id}
                id={`pack-picker-opt-${p.id}`}
                data-index={i}
                data-active={i === active}
                role="option"
                aria-selected={i === active}
                aria-disabled={added}
                className="pack-picker-option"
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()} // keep focus in the search box
                onClick={() => pick(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', borderRadius: 10,
                  cursor: added ? 'default' : 'pointer',
                  opacity: added ? 0.6 : 1,
                }}
              >
                <Thumb src={p.primary_image_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 3px',
                    lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', wordBreak: 'break-word',
                  }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                    <strong style={{ color: '#0f172a' }}>{fmt(p.price)}</strong>
                    {stock !== null && (
                      <span style={{ color: stock > 0 ? '#64748b' : '#b91c1c' }}>
                        {stock > 0 ? t('inStock', { count: stock }) : t('outOfStock')}
                      </span>
                    )}
                    {p.has_variants && <span>{t('variantCount', { count: p.variants.length })}</span>}
                  </p>
                </div>
                {added ? (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    fontSize: 11, fontWeight: 700, color: '#047857',
                  }}>
                    <Check size={12} /> {t('alreadyAdded')}
                  </span>
                ) : (
                  <span aria-hidden style={{
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    fontSize: 11, fontWeight: 800, color: '#fff',
                    background: '#db142e', padding: '6px 10px', borderRadius: 8,
                  }}>
                    <Plus size={12} /> {t('addToPack')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Selected item row ───────────────────────────────────────────────────────────

function SelectedRow({ row, onChangeAllowedVariants, onChangeQty, onRemove }: {
  row: PackItemRow
  onChangeAllowedVariants: (ids: number[] | null) => void
  onChangeQty: (q: number) => void
  onRemove: () => void
}) {
  const t   = useTranslations('seller.packForm')
  const fmt = useFmt()
  const [showVariants, setShowVariants] = useState(false)
  const { product } = row
  const hasVariants   = product.has_variants && product.variants.length > 0
  const totalVariants = product.variants.length
  const checkedIds    = row.allowed_variant_ids
  const checkedCount  = checkedIds === null ? totalVariants : checkedIds.length

  const isChecked = (vid: number) => checkedIds === null || checkedIds.includes(vid)

  const toggleVariant = (vid: number) => {
    const allIds = product.variants.map(v => v.id)
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
    <li style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
        <Thumb src={product.primary_image_url} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', wordBreak: 'break-word',
          }}>
            {product.name}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
            {t('unitPrice', { price: fmt(rowUnitPrice(row)) })}
          </p>
          {hasVariants && (
            <button
              type="button"
              onClick={() => setShowVariants(s => !s)}
              aria-expanded={showVariants}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: 0,
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: checkedCount === totalVariants ? '#198f41' : '#92400e',
              }}
            >
              {t('variantsRatio', { checked: checkedCount, total: totalVariants })}
              <ChevronDown size={12} style={{ transform: showVariants ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </div>

        {/* Quantity stepper */}
        <div
          role="group" aria-label={t('quantity')}
          style={{
            display: 'flex', alignItems: 'center', flexShrink: 0,
            border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => onChangeQty(Math.max(1, row.quantity - 1))}
            disabled={row.quantity <= 1}
            aria-label={t('decrease')}
            style={stepBtn(row.quantity <= 1)}
          >
            −
          </button>
          <span aria-live="polite" style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
            {row.quantity}
          </span>
          <button
            type="button"
            onClick={() => onChangeQty(row.quantity + 1)}
            aria-label={t('increase')}
            style={stepBtn(false)}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t('removeItem')}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.06)',
            cursor: 'pointer', color: '#b91c1c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {hasVariants && showVariants && (
        <div style={{ padding: '0 12px 12px' }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px',
          }}>
            {t('variantsChoice')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
            {product.variants.map(v => {
              const checked    = isChecked(v.id)
              const outOfStock = v.stock === 0
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVariant(v.id)}
                  aria-pressed={checked}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '7px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'start',
                    border: `1.5px solid ${checked ? (outOfStock ? 'rgba(239,68,68,0.5)' : '#dc2626') : '#e5e7eb'}`,
                    background: checked ? (outOfStock ? 'rgba(239,68,68,0.05)' : 'rgba(220,38,38,0.05)') : '#f8fafc',
                  }}
                >
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: checked ? (outOfStock ? '#b91c1c' : '#dc2626') : '#374151',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {checked && <Check size={11} />}
                    {v.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: outOfStock ? '#b91c1c' : '#5b6472' }}>
                    {outOfStock ? t('outOfStock') : t('inStock', { count: v.stock })}
                  </span>
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: '#5b6472', margin: '6px 0 0', fontStyle: 'italic' }}>
            {checkedIds === null
              ? t('allIncluded', { count: totalVariants })
              : t('someAvailable', { checked: checkedCount, total: totalVariants })}
          </p>
        </div>
      )}
    </li>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Thumb({ src }: { src: string | null }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
      overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <Package2 size={18} color="#94a3b8" />}
    </div>
  )
}

const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 30, height: 30, border: 'none', background: '#f8fafc',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700,
  color: disabled ? '#cbd5e1' : '#374151',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#5b6472',
      paddingBottom: 6, borderBottom: '1px solid #f0f0f0', margin: 0,
    }}>
      {children}
    </p>
  )
}

function Field({ label, required, error, htmlFor, children }: {
  label: string; required?: boolean; error?: string; htmlFor?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        color: '#5b6472', marginBottom: 5,
      }}>
        {label} {required && <span style={{ color: '#b91c1c' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition bg-white
   ${err === 'warn' ? 'border-amber-300' : err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`
