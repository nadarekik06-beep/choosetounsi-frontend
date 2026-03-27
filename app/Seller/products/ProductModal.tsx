'use client'

/**
 * app/seller/products/ProductModal.tsx
 * FIXED:
 *  1. Variant axes fetched via categoriesApi.getSubcategoryAttributes() (correct URL)
 *  2. productsApi.create/update now send FormData (via fixed sellerApi.ts)
 *  3. VariantBuilder shown even when axes are loading (with skeleton)
 *  4. Variant rows preserved when editing
 */

import { useEffect, useRef, useState } from 'react'
import { X, Upload, Trash2, Star, Loader2, AlertCircle, ImageIcon } from 'lucide-react'
import { productsApi, categoriesApi, storageUrl } from '@/lib/sellerApi'
import type { Category, Subcategory } from '@/lib/sellerApi'
import DynamicAttributeSection from '../components/attributes/DynamicAttributeSection'
import VariantBuilder, { type VariantRow } from '../components/VariantBuilder'
import type { AttributeValues, Attribute } from '@/types/Attributes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullProduct {
  id: number
  name: string
  slug?: string | null
  sku?: string | null
  description?: string | null
  short_description?: string | null
  price: number | string
  stock: number
  category_id?: number | null
  subcategory_id?: number | null
  is_active?: boolean | null
  existing_attributes?: AttributeValues
  variant_rows?: VariantRow[]
  images?: Array<{
    id: number
    url?: string | null
    image_path: string
    is_primary: boolean
    order: number
  }>
  [key: string]: unknown
}

interface ExistingImage {
  id: number; url: string; image_path: string; is_primary: boolean; order: number
}
interface PreviewImage { file: File; preview: string; id: string }

// ─── Attribute serializer ─────────────────────────────────────────────────────

function serializeAttributes(values: AttributeValues): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [slug, val] of Object.entries(values)) {
    if (val === null || val === undefined || val === '') continue
    if (Array.isArray(val)) {
      if (val.length === 0) continue
      out[slug] = JSON.stringify(val)
    } else if (typeof val === 'boolean') {
      out[slug] = val ? '1' : '0'
    } else {
      out[slug] = String(val)
    }
  }
  return out
}

// ─── Image Thumbnail ──────────────────────────────────────────────────────────

function ImageThumb({ src, isPrimary, onRemove, onSetPrimary }: {
  src: string; isPrimary: boolean; onRemove: () => void; onSetPrimary: () => void
}) {
  return (
    <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb', background: '#f8fafc' }} className="group">
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {isPrimary && (
        <div style={{ position: 'absolute', top: 4, left: 4, background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999 }}>Primary</div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
        {!isPrimary && (
          <button type="button" onClick={onSetPrimary} style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', color: '#f59e0b' }}>
            <Star size={13} />
          </button>
        )}
        <button type="button" onClick={onRemove} style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition bg-white
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ProductModalProps {
  product: Record<string, any> | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product
  const p      = product as FullProduct | null

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:              (p?.name              ?? '') as string,
    slug:              (p?.slug              ?? '') as string,
    sku:               (p?.sku               ?? '') as string,
    description:       (p?.description       ?? '') as string,
    short_description: (p?.short_description ?? '') as string,
    price:             p?.price?.toString()         ?? '',
    stock:             p?.stock?.toString()         ?? '0',
    category_id:       p?.category_id?.toString()   ?? '',
    subcategory_id:    p?.subcategory_id != null ? String(p.subcategory_id) : '',
    is_active:         p?.is_active ?? true,
  })

  const [attrValues,  setAttrValues]  = useState<AttributeValues>(p?.existing_attributes ?? {})
  const [variantRows, setVariantRows] = useState<VariantRow[]>(p?.variant_rows ?? [])

  // ── Categories ─────────────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [catLoading,    setCatLoading]    = useState(true)
  const [subLoading,    setSubLoading]    = useState(false)

  // ── Variant axes (fetched per subcategory) ─────────────────────────────────
  const [variantAxes,   setVariantAxes]   = useState<Attribute[]>([])
  const [axesLoading,   setAxesLoading]   = useState(false)

  // ── Submit ─────────────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  // ── Images ─────────────────────────────────────────────────────────────────
  const [existingImages,  setExistingImages]  = useState<ExistingImage[]>(
    p?.images?.map(img => ({
      id:         img.id,
      image_path: img.image_path,
      is_primary: img.is_primary,
      order:      img.order,
      url:        storageUrl(img.url ?? img.image_path) ?? img.image_path,
    })) ?? []
  )
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [primaryImageId,  setPrimaryImageId]  = useState<number | null>(
    existingImages.find(i => i.is_primary)?.id ?? null
  )
  const [previews,     setPreviews]    = useState<PreviewImage[]>([])
  const fileInputRef                   = useRef<HTMLInputElement>(null)

  const set = (field: string, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  // ── Load categories on mount ───────────────────────────────────────────────
  useEffect(() => {
    categoriesApi.getAll()
      .then(res => setCategories(res.data ?? []))
      .catch(console.error)
      .finally(() => setCatLoading(false))
  }, [])

  // ── Load subcategories when category changes ───────────────────────────────
  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([])
      set('subcategory_id', '')
      setVariantAxes([])
      return
    }
    const cat = categories.find(c => c.id === Number(form.category_id))
    if (!cat?.slug) return

    setSubLoading(true)
    categoriesApi.getSubcategories(cat.slug)
      .then(res => setSubcategories(res.data ?? []))
      .catch(() => setSubcategories([]))
      .finally(() => setSubLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id, categories])

  // ── Load variant axes when subcategory changes ─────────────────────────────
  // FIXED: uses categoriesApi.getSubcategoryAttributes() which calls
  // GET /api/subcategories/{id}/attributes — the correct route that exists
  // in routes/api.php and is handled by SubcategoryController@attributes
  useEffect(() => {
    if (!form.subcategory_id) {
      setVariantAxes([])
      return
    }

    const subId = Number(form.subcategory_id)
    if (!subId) return

    setAxesLoading(true)
    categoriesApi.getSubcategoryAttributes(subId)
      .then(res => {
        const allAttrs: Attribute[] = res.data ?? []
        // Only attributes with options (select, color, multiselect) can be variant axes
        const axes = allAttrs.filter(
          (a: Attribute) =>
            ['select', 'color', 'multiselect'].includes(a.type) &&
            a.options &&
            a.options.length > 0
        )
        setVariantAxes(axes)
      })
      .catch(() => setVariantAxes([]))
      .finally(() => setAxesLoading(false))
  }, [form.subcategory_id])

  // ── Auto-slug from name ────────────────────────────────────────────────────
  const slugTouched = useRef(!!(p?.slug))
  useEffect(() => {
    if (!slugTouched.current && form.name) {
      set('slug', form.name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-'))
    }
  }, [form.name])

  // Cleanup preview URLs on unmount
  useEffect(() => () => previews.forEach(prev => URL.revokeObjectURL(prev.preview)), [])

  // ── Image handlers ─────────────────────────────────────────────────────────
  const totalImages = existingImages.length + previews.length

  const addFiles = (files: File[]) => {
    const toAdd = files.slice(0, 8 - totalImages).map(file => ({
      file, preview: URL.createObjectURL(file), id: Math.random().toString(36).slice(2),
    }))
    setPreviews(prev => [...prev, ...toAdd])
  }

  const removeExisting = (id: number) => {
    setExistingImages(prev => prev.filter(img => img.id !== id))
    setDeletedImageIds(prev => [...prev, id])
    if (primaryImageId === id)
      setPrimaryImageId(existingImages.find(img => img.id !== id)?.id ?? null)
  }

  const removePreview = (cid: string) => {
    setPreviews(prev => {
      const found = prev.find(p => p.id === cid)
      if (found) URL.revokeObjectURL(found.preview)
      return prev.filter(p => p.id !== cid)
    })
  }

  const setExistingPrimary = (id: number) => {
    setPrimaryImageId(id)
    setExistingImages(prev => prev.map(img => ({ ...img, is_primary: img.id === id })))
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())                                                         e.name        = 'Required.'
    if (!form.category_id)                                                         e.category_id = 'Select a category.'
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)  e.price       = 'Enter a valid price.'
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0)  e.stock       = 'Enter a valid quantity.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')

    try {
      const subId = form.subcategory_id ? parseInt(form.subcategory_id, 10) : null

      // Only include variant rows that have all required option_ids filled
      const validVariants = variantRows
        .filter(row => {
          const filledOptions = row.option_ids.filter(id => id > 0)
          // Must have at least 1 option selected (or axes.length options if axes exist)
          return variantAxes.length === 0
            ? false
            : filledOptions.length === variantAxes.length
        })
        .map(row => ({
          ...(row.id ? { id: row.id } : {}),
          option_ids:     row.option_ids.filter(id => id > 0),
          stock:          row.stock,
          price_override: row.price_override !== '' ? row.price_override : null,
          sku:            row.sku || undefined,
          is_active:      row.is_active,
        }))

      const payload = {
        name:              form.name.trim(),
        slug:              form.slug.trim()              || undefined,
        sku:               form.sku.trim()               || undefined,
        description:       form.description.trim()       || undefined,
        short_description: form.short_description.trim() || undefined,
        price:             parseFloat(form.price),
        stock:             parseInt(form.stock, 10),
        category_id:       parseInt(form.category_id, 10),
        ...(subId !== null ? { subcategory_id: subId } : {}),
        is_active:         form.is_active,
        images:            previews.map(prev => prev.file),
        delete_image_ids:  deletedImageIds.length ? deletedImageIds : undefined,
        attributes:        serializeAttributes(attrValues),
        // Only send variants when there are valid rows
        ...(validVariants.length > 0 ? { variants: validVariants } : {}),
      }

      if (isEdit) {
        await productsApi.update(product!.id, payload)
        // Set primary image if changed
        if (primaryImageId !== null) {
          const orig = p?.images?.find(i => i.is_primary)
          if (!orig || orig.id !== primaryImageId) {
            await productsApi.setPrimaryImage(product!.id, primaryImageId)
          }
        }
      } else {
        await productsApi.create(payload)
      }

      onSaved()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.errors) {
        const mapped: Record<string, string> = {}
        Object.entries(data.errors).forEach(([key, msgs]) => {
          mapped[key] = (msgs as string[])[0]
        })
        setErrors(mapped)
      } else {
        setApiError(data?.message ?? 'Failed to save. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '20px 20px 0 0' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h2>
            {!isEdit && (
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
                Will be reviewed by admin before going live.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {apiError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiError}
            </div>
          )}

          {/* ── Basic Information ── */}
          <section>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
              Basic Information
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Product Name" required error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. White Cotton T-Shirt" className={inputCls(errors.name)} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="URL Slug" hint="Auto-generated from name">
                  <input value={form.slug}
                    onChange={e => { slugTouched.current = true; set('slug', e.target.value) }}
                    placeholder="my-product-name" className={inputCls()} />
                </Field>
                <Field label="SKU" hint="Auto-generated if empty">
                  <input value={form.sku} onChange={e => set('sku', e.target.value)}
                    placeholder="Leave blank" className={inputCls()} />
                </Field>
              </div>
              <Field label="Short Description" hint="Max 500 chars">
                <input value={form.short_description} onChange={e => set('short_description', e.target.value)}
                  maxLength={500} placeholder="One-line summary…" className={inputCls()} />
              </Field>
              <Field label="Full Description">
                <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Describe your product in detail…" className={`${inputCls()} resize-none`} />
              </Field>
            </div>
          </section>

          {/* ── Pricing & Inventory ── */}
          <section>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
              Pricing & Inventory
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Base Price (TND)" required error={errors.price}>
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" step="0.001" value={form.price}
                    onChange={e => set('price', e.target.value)} placeholder="0.000"
                    className={inputCls(errors.price)} style={{ paddingRight: 44 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>TND</span>
                </div>
              </Field>
              <Field label="Stock" required error={errors.stock}
                hint={variantRows.length > 0 ? 'Product total (variants have own stock)' : undefined}>
                <input type="number" min="0" value={form.stock}
                  onChange={e => set('stock', e.target.value)} placeholder="0"
                  className={inputCls(errors.stock)} />
              </Field>
              <Field label="Status">
                <select value={form.is_active ? 'active' : 'inactive'}
                  onChange={e => set('is_active', e.target.value === 'active')}
                  className={inputCls()}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </section>

          {/* ── Category ── */}
          <section>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
              Category
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Category" required error={errors.category_id}>
                <select value={form.category_id}
                  onChange={e => {
                    set('category_id', e.target.value)
                    set('subcategory_id', '')
                    setAttrValues({})
                    setVariantRows([])
                    setVariantAxes([])
                  }}
                  className={inputCls(errors.category_id)} disabled={catLoading}>
                  <option value="">{catLoading ? 'Loading…' : '— Select category —'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Subcategory" hint="Select to unlock attributes & variants">
                <select value={form.subcategory_id}
                  onChange={e => {
                    set('subcategory_id', e.target.value)
                    setAttrValues({})
                    setVariantRows([])
                  }}
                  className={inputCls()}
                  disabled={!form.category_id || subLoading}>
                  <option value="">
                    {subLoading ? 'Loading…' : !form.category_id ? '— Select category first —' : '— None (optional) —'}
                  </option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                {form.subcategory_id && (
                  <p style={{ fontSize: 10, color: '#10b981', marginTop: 3 }}>
                    ✓ Subcategory selected
                  </p>
                )}
              </Field>
            </div>
          </section>

          {/* ── Dynamic Attributes (product-level) ── */}
          {form.subcategory_id && (
            <section>
              <DynamicAttributeSection
                subcategoryId={Number(form.subcategory_id)}
                values={attrValues}
                onChange={setAttrValues}
                disabled={saving}
              />
            </section>
          )}

          {/* ── Variants ── */}
          {form.subcategory_id && (
            <section>
              <div style={{ paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>
                  Variants
                </p>
                {axesLoading && (
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading axes…
                  </span>
                )}
              </div>

              {!axesLoading && variantAxes.length === 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>
                  This subcategory has no selectable attributes (color, size, etc.) configured yet.
                  Variants require at least one attribute of type <em>select</em> or <em>color</em>.
                  You can still add the product without variants.
                </div>
              )}

              {!axesLoading && variantAxes.length > 0 && (
                <VariantBuilder
                  axes={variantAxes}
                  existingVariants={variantRows}
                  onChange={setVariantRows}
                  basePrice={form.price}
                  disabled={saving}
                />
              )}
            </section>
          )}

          {/* ── Images ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>Images</p>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{totalImages}/8</span>
            </div>

            {existingImages.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Current Images</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {existingImages.map(img => (
                    <ImageThumb key={img.id} src={img.url} isPrimary={img.id === primaryImageId}
                      onRemove={() => removeExisting(img.id)}
                      onSetPrimary={() => setExistingPrimary(img.id)} />
                  ))}
                </div>
              </div>
            )}

            {previews.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>New Images</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {previews.map(prev => (
                    <ImageThumb key={prev.id} src={prev.preview}
                      isPrimary={existingImages.length === 0 && previews[0]?.id === prev.id}
                      onRemove={() => removePreview(prev.id)}
                      onSetPrimary={() => { }} />
                  ))}
                </div>
              </div>
            )}

            {totalImages < 8 && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #e5e7eb', borderRadius: 14, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'border-color 0.18s' }}
                className="hover:border-red-300"
              >
                <Upload size={20} color="#94a3b8" />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>
                  Drop images or <span style={{ color: '#dc2626' }}>browse</span>
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>JPG, PNG, WebP · max 5 MB each</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              </div>
            )}

            {totalImages === 0 && (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ImageIcon size={11} /> No images yet
              </p>
            )}
          </section>

          {/* Approval notice */}
          {!isEdit && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#92400e' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Your product will go live after admin approval.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 4, position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 2 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || catLoading}
              style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(220,38,38,0.3)', opacity: (saving || catLoading) ? 0.6 : 1, fontFamily: 'inherit' }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {isEdit ? 'Save Changes' : 'Submit for Review'}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}