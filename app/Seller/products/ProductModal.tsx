'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { X, Upload, Trash2, Star, Loader2, AlertCircle, ImageIcon, Lock, Send } from 'lucide-react'
import { productsApi, categoriesApi, storageUrl, productUpdateRequestsApi } from '@/lib/sellerApi'
import type { Category, Subcategory, ProductPayload } from '@/lib/sellerApi'
import DynamicAttributeSection from '../components/attributes/DynamicAttributeSection'
import VariantBuilder, {
  type VariantRow,
  normalizeVariantRow,
  calculateTotalStock,
  validateVariantStocks,
} from '../components/VariantBuilder'
import ColorGroupImageUploader from '../components/ColorGroupImageUploader'
import VariantImageManager, { type VariantForImageManager } from '../components/VariantImageManager'
import type { AttributeValues, Attribute } from '@/types/Attributes'
import UpdateRequestModal from 'app/seller/components/UpdateRequestModal'

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
  is_approved?: boolean
  existing_attributes?: AttributeValues
  variant_rows?: VariantRow[]
  images?: Array<{
    id: number; url?: string | null; image_path: string
    is_primary: boolean; order: number
    variant_id?: number | null
    color_option_id?: number | null
  }>
  [key: string]: unknown
}

interface ExistingImage {
  id: number; url: string; image_path: string; is_primary: boolean; order: number
}
interface PreviewImage { file: File; preview: string; id: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Locked Field Wrapper ─────────────────────────────────────────────────────

function LockedField({ children, locked }: { children: React.ReactNode; locked: boolean }) {
  if (!locked) return <>{children}</>
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>{children}</div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'flex-end', paddingRight: 10, pointerEvents: 'none',
      }}>
        <Lock size={13} color="#94a3b8" />
      </div>
    </div>
  )
}

// ─── Image Thumbnail ──────────────────────────────────────────────────────────

function ImageThumb({ src, isPrimary, onRemove, onSetPrimary }: {
  src: string; isPrimary: boolean; onRemove: () => void; onSetPrimary: () => void
}) {
  return (
    <div style={{
      position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
      border: '1.5px solid #e5e7eb', background: '#f8fafc',
    }} className="group">
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {isPrimary && (
        <div style={{
          position: 'absolute', top: 4, left: 4, background: '#dc2626', color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
        }}>Primary</div>
      )}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: 0, transition: 'opacity 0.2s',
      }} className="group-hover:opacity-100">
        {!isPrimary && (
          <button type="button" onClick={onSetPrimary} style={{
            padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.9)',
            border: 'none', cursor: 'pointer', color: '#f59e0b',
          }}>
            <Star size={13} />
          </button>
        )}
        <button type="button" onClick={onRemove} style={{
          padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.9)',
          border: 'none', cursor: 'pointer', color: '#ef4444',
        }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Locked Variant Row ───────────────────────────────────────────────────────
// Displays a single existing variant in read-only mode with its label,
// stock, price, and images.  Used in the isLocked branch of the modal.

interface LockedVariantRowData extends VariantRow {
  label?: string
  option_map?: Record<string, {
    id: number; ids?: number[]; value: string; color_hex?: string | null
  }>
  image_urls?: string[]
  existing_images?: Array<{ id: number; url: string; is_primary?: boolean }>
}

function LockedVariantCard({ variant }: { variant: LockedVariantRowData }) {
  const colorEntry = variant.option_map?.['color']
  const otherEntries = Object.entries(variant.option_map ?? {}).filter(([s]) => s !== 'color')

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header — label + badges */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: '#f8fafc',
        borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap',
      }}>
        {/* Color swatches */}
        {colorEntry && (
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {(colorEntry.ids ?? [colorEntry.id]).map(id => (
              <span key={id} title={colorEntry.value} style={{
                display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                background: colorEntry.color_hex ?? '#e5e7eb',
                border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0,
              }} />
            ))}
          </span>
        )}

        {/* Human-readable label */}
        <span style={{
          fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1,
        }}>
          {variant.label || [
            colorEntry?.value,
            ...otherEntries.map(([, v]) => (v as any).value),
          ].filter(Boolean).join(' / ')}
        </span>

        {/* Active badge */}
        <span style={{
          fontSize: 9, fontWeight: 800,
          color: variant.is_active ? '#10b981' : '#94a3b8',
          background: variant.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
          border: `1px solid ${variant.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.2)'}`,
          padding: '1px 6px', borderRadius: 4,
        }}>
          {variant.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Body — stock, price, images */}
      <div style={{
        padding: '10px 12px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12, alignItems: 'start',
      }}>
        {/* Stock — read-only */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px',
          }}>Stock</p>
          <div style={{
            background: '#f8fafc', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            opacity: 0.7,
          }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: variant.stock === 0 ? '#ef4444' : '#0f172a' }}>
              {variant.stock}
            </span>
            <Lock size={11} color="#94a3b8" />
          </div>
        </div>

        {/* Price override — read-only */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px',
          }}>Price Override</p>
          <div style={{
            background: '#f8fafc', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            opacity: 0.7,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {variant.price_override ? `${Number(variant.price_override).toFixed(3)} TND` : '—'}
            </span>
            <Lock size={11} color="#94a3b8" />
          </div>
        </div>

        {/* SKU — read-only */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px',
          }}>SKU</p>
          <div style={{
            background: '#f8fafc', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '6px 10px',
            opacity: 0.7,
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', fontFamily: 'monospace' }}>
              {variant.sku || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Image thumbnails — read-only display */}
      {(variant.image_urls ?? []).length > 0 && (
        <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(variant.image_urls ?? []).map((url, i) => (
            <div key={i} style={{
              width: 48, height: 48, borderRadius: 6, overflow: 'hidden',
              border: '1px solid #e5e7eb', flexShrink: 0,
            }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition bg-white
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

function Field({ label, required, error, hint, children, locked }: {
  label: string; required?: boolean; error?: string; hint?: string
  children: React.ReactNode; locked?: boolean
}) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        {locked && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700,
            color: '#6366f1', background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)', padding: '1px 6px',
            borderRadius: 4, textTransform: 'none', letterSpacing: 0,
          }}>
            <Lock size={8} /> Requires admin approval
          </span>
        )}
      </label>
      <LockedField locked={!!locked}>{children}</LockedField>
      {hint && !error && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

interface ProductModalProps {
  product: Record<string, any> | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const isEdit   = !!product
  const p        = product as FullProduct | null
  const isLocked = !!(p?.is_approved)

  const [updateRequestModalOpen, setUpdateRequestModalOpen] = useState(false)

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
  const [variantRows, setVariantRows] = useState<VariantRow[]>(
    (p?.variant_rows ?? []).map(normalizeVariantRow)
  )

  const [colorGroupImages, setColorGroupImages] = useState<Record<string, File[]>>({})

  // ── VARIANT IMAGE MANAGEMENT (edit mode) ──────────────────────────────────
  // Tracks new uploads + deletion requests for existing variant images.
  // Only used when isEdit=true and the product has variant_rows.
  const [variantImageChanges, setVariantImageChanges] = useState<{
    newImagesByVariantId: Record<number, File[]>
    deleteImageIds: number[]
  }>({ newImagesByVariantId: {}, deleteImageIds: [] })

  // Build the VariantForImageManager[] from server data (memoized, never changes
  // after mount since locked variants can't be structurally modified)
  const variantsForImageManager = useMemo((): VariantForImageManager[] => {
    if (!isEdit) return []

    const serverVariants = (p?.variant_rows ?? []) as LockedVariantRowData[]
    if (serverVariants.length === 0) return []

    // Build a map of variant_id → image rows (need DB id for deletion)
    const imagesByVariantId: Record<number, Array<{ id: number; url: string; is_primary?: boolean }>> = {}
    if (p?.images) {
      for (const img of p.images) {
        if (img.variant_id != null) {
          const url = storageUrl(img.url ?? img.image_path)
          if (!url) continue
          if (!imagesByVariantId[img.variant_id]) imagesByVariantId[img.variant_id] = []
          imagesByVariantId[img.variant_id].push({
            id:         img.id,
            url,
            is_primary: img.is_primary,
          })
        }
      }
    }

    return serverVariants
      .filter(v => v.id != null)
      .map(v => ({
        id:              v.id!,
        label:           (v as any).label ?? '',
        option_map:      (v as any).option_map,
        image_urls:      (v as any).image_urls ?? [],
        existing_images: imagesByVariantId[v.id!] ?? [],
      }))
  }, [isEdit, p?.variant_rows, p?.images])

  // ── Stock management state ─────────────────────────────────────────────────
  const [stockMode, setStockMode] = useState<'auto' | 'manual'>('auto')
  const [variantStockErrors, setVariantStockErrors] = useState<Record<number, string>>({})

  const hasVariantRows    = variantRows.length > 0
  const variantTotalStock = useMemo(() => calculateTotalStock(variantRows), [variantRows])

  useEffect(() => {
    if (hasVariantRows && stockMode === 'auto') {
      setForm(f => ({ ...f, stock: String(variantTotalStock) }))
    }
  }, [variantTotalStock, hasVariantRows, stockMode])

  useEffect(() => {
    if (!hasVariantRows) {
      setStockMode('auto')
      setVariantStockErrors({})
    }
  }, [hasVariantRows])

  // ── Categories ─────────────────────────────────────────────────────────────
  const [categories,    setCategories]    = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [catLoading,    setCatLoading]    = useState(true)
  const [subLoading,    setSubLoading]    = useState(false)

  const [variantAxes, setVariantAxes] = useState<Attribute[]>([])
  const [infoAxes,    setInfoAxes]    = useState<Attribute[]>([])
  const [axesLoading, setAxesLoading] = useState(false)

  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')

  // ── Product-level Images ───────────────────────────────────────────────────
  // These are images NOT attached to any variant (variant_id = null, color_option_id = null).
  // In edit mode we separate them from variant images.
  const [existingImages,  setExistingImages]  = useState<ExistingImage[]>(() => {
    if (!p?.images) return []
    return p.images
      .filter(img => img.variant_id == null && img.color_option_id == null)
      .map(img => ({
        id:         img.id,
        image_path: img.image_path,
        is_primary: img.is_primary,
        order:      img.order,
        url:        storageUrl(img.url ?? img.image_path) ?? img.image_path,
      }))
  })
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [primaryImageId,  setPrimaryImageId]  = useState<number | null>(
    existingImages.find(i => i.is_primary)?.id ?? null
  )
  const [previews,   setPreviews]   = useState<PreviewImage[]>([])
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const set = (field: string, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    categoriesApi.getAll()
      .then(res => setCategories(res.data ?? []))
      .catch(console.error)
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([])
      set('subcategory_id', '')
      setVariantAxes([])
      setInfoAxes([])
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

  useEffect(() => {
    if (!form.subcategory_id) { setVariantAxes([]); setInfoAxes([]); return }
    const subId = Number(form.subcategory_id)
    if (!subId) return
    setAxesLoading(true)
    categoriesApi.getSubcategoryAttributes(subId)
      .then(res => {
        const data = res.data as { variant_attributes: Attribute[]; info_attributes: Attribute[] }
        setVariantAxes((data.variant_attributes ?? []).filter(a => a.options && a.options.length > 0))
        setInfoAxes(data.info_attributes ?? [])
      })
      .catch(() => { setVariantAxes([]); setInfoAxes([]) })
      .finally(() => setAxesLoading(false))
  }, [form.subcategory_id])

  const slugTouched = useRef(!!(p?.slug))
  useEffect(() => {
    if (!slugTouched.current && form.name) {
      set('slug', form.name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'))
    }
  }, [form.name])

  useEffect(() => () => previews.forEach(prev => URL.revokeObjectURL(prev.preview)), [])

  const existingByColorGroup = useMemo(() => {
    const map: Record<string, string[]> = {}
    if (p?.images) {
      for (const img of p.images as any[]) {
        if (img.color_option_id != null) {
          const url = storageUrl(img.url ?? img.image_path)
          if (url) {
            const key = String(img.color_option_id)
            map[key] = [...(map[key] ?? []), url]
          }
        }
      }
    }
    return map
  }, [p?.images])

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
    if (primaryImageId === id) {
      setPrimaryImageId(existingImages.find(img => img.id !== id)?.id ?? null)
    }
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

    if (!form.name.trim()) e.name = 'Required.'
    if (!form.category_id && !isLocked) e.category_id = 'Select a category.'
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) {
      e.price = 'Enter a valid price.'
    }

    if (hasVariantRows) {
      const varStockErrs = validateVariantStocks(variantRows)
      if (Object.keys(varStockErrs).length > 0) {
        setVariantStockErrors(varStockErrs)
        e.variants = 'Fix variant stock errors below.'
      } else {
        setVariantStockErrors({})
      }
    } else {
      if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0) {
        e.stock = 'Enter a valid quantity.'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')

    try {
      const subId = form.subcategory_id ? parseInt(form.subcategory_id, 10) : null

      const validVariants = variantRows
        .filter(row => {
          if (variantAxes.length === 0) return false
          return row.option_ids.filter(id => id > 0).length > 0
        })
        .map(row => ({
          ...(row.id ? { id: row.id } : {}),
          option_ids:     row.option_ids.filter(id => id > 0),
          stock:          row.stock,
          price_override: row.price_override !== '' ? row.price_override : null,
          sku:            row.sku || undefined,
          is_active:      row.is_active,
        }))

      const finalStock = hasVariantRows
        ? variantTotalStock
        : parseInt(form.stock, 10)

      // Merge product-level deleted IDs with variant image deleted IDs
      const allDeletedImageIds = [
        ...deletedImageIds,
        ...variantImageChanges.deleteImageIds,
      ]

      const payload: Record<string, any> = {
        name:              form.name.trim(),
        slug:              form.slug.trim()              || undefined,
        sku:               form.sku.trim()               || undefined,
        description:       form.description.trim()       || undefined,
        short_description: form.short_description.trim() || undefined,
        is_active:         form.is_active,
        // Product-level new images
        images:            previews.map(prev => prev.file),
        delete_image_ids:  allDeletedImageIds.length ? allDeletedImageIds : undefined,
        attributes:        serializeAttributes(attrValues),
        price:       isLocked ? parseFloat(String(p?.price ?? 0)) : parseFloat(form.price),
        stock:       isLocked ? (p?.stock ?? 0) : finalStock,
        category_id: isLocked ? (p?.category_id ?? 0) : parseInt(form.category_id, 10),
      }

      // Variant-level new images: sent as variant_images[{variantId}][j]
      // The backend's saveVariantImages() method reads this key.
      if (Object.keys(variantImageChanges.newImagesByVariantId).length > 0) {
        payload.variant_images = variantImageChanges.newImagesByVariantId
      }

      if (!isLocked) {
        if (subId !== null) payload.subcategory_id = subId
        if (validVariants.length > 0) payload.variants = validVariants
        if (Object.keys(colorGroupImages).length > 0) payload.color_images = colorGroupImages
      }

      if (isEdit) {
        await productsApi.update(product!.id, payload as ProductPayload)
        if (primaryImageId !== null) {
          const orig = p?.images?.find(i => i.is_primary)
          if (!orig || orig.id !== primaryImageId) {
            await productsApi.setPrimaryImage(product!.id, primaryImageId)
          }
        }
      } else {
        await productsApi.create(payload as ProductPayload)
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

  // Whether we should show the VariantImageManager section:
  // - Only in edit mode
  // - Only when the product already has server-side variants with IDs
  const showVariantImageManager = isEdit && variantsForImageManager.length > 0

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 780, maxHeight: '92vh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
            position: 'sticky', top: 0, background: '#fff', zIndex: 10,
            borderRadius: '20px 20px 0 0',
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              {isLocked && (
                <p style={{
                  fontSize: 11, color: '#6366f1', margin: '3px 0 0',
                  display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
                }}>
                  <Lock size={10} /> Some fields are locked — product is approved
                </p>
              )}
              {!isEdit && (
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
                  Will be reviewed by admin before going live.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isLocked && isEdit && (
                <button
                  type="button"
                  onClick={() => setUpdateRequestModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    borderRadius: 10, border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  }}
                >
                  <Send size={12} /> Request Update
                </button>
              )}
              <button type="button" onClick={onClose} style={{
                padding: 6, borderRadius: 10, border: 'none',
                background: 'transparent', cursor: 'pointer', color: '#94a3b8',
              }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {isLocked && (
            <div style={{
              margin: '16px 24px 0',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#1e40af',
            }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>Product is approved and live.</strong> Price, stock, category, and variants are locked.
                {' '}Use <strong>"Request Update"</strong> to propose changes — an admin will review them.
                Other fields (name, description) can still be edited directly.
                {' '}<strong>Images can be added/removed for any variant instantly.</strong>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {apiError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiError}
              </div>
            )}

            {/* ── Basic Information ── */}
            <section>
              <p style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#94a3b8',
                paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
              }}>Basic Information</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Product Name" required error={errors.name}>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. White Cotton T-Shirt"
                    className={inputCls(errors.name)}
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="URL Slug" hint="Auto-generated from name">
                    <input
                      value={form.slug}
                      onChange={e => { slugTouched.current = true; set('slug', e.target.value) }}
                      placeholder="my-product-name"
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="SKU" hint="Auto-generated if empty">
                    <input
                      value={form.sku}
                      onChange={e => set('sku', e.target.value)}
                      placeholder="Leave blank"
                      className={inputCls()}
                    />
                  </Field>
                </div>
                <Field label="Short Description" hint="Max 500 chars">
                  <input
                    value={form.short_description}
                    onChange={e => set('short_description', e.target.value)}
                    maxLength={500}
                    placeholder="One-line summary…"
                    className={inputCls()}
                  />
                </Field>
                <Field label="Full Description">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Describe your product in detail…"
                    className={`${inputCls()} resize-none`}
                  />
                </Field>
              </div>
            </section>

            {/* ── Pricing & Inventory ── */}
            <section>
              <p style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#94a3b8',
                paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
              }}>Pricing & Inventory</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: hasVariantRows ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 12,
              }}>
                {/* Price */}
                <Field label="Base Price (TND)" required error={errors.price} locked={isLocked}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" step="0.001"
                      value={form.price}
                      onChange={e => !isLocked && set('price', e.target.value)}
                      readOnly={isLocked}
                      placeholder="0.000"
                      className={inputCls(errors.price)}
                      style={{ paddingRight: 44, cursor: isLocked ? 'not-allowed' : undefined }}
                    />
                    <span style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 11, color: '#94a3b8', fontWeight: 600,
                    }}>TND</span>
                  </div>
                </Field>

                {/* Stock — ONLY shown when no variants exist */}
                {!hasVariantRows && (
                  <Field
                    label="Stock"
                    required
                    error={errors.stock}
                    locked={isLocked}
                  >
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={e => {
                        if (isLocked) return
                        set('stock', e.target.value)
                      }}
                      readOnly={isLocked}
                      placeholder="0"
                      className={inputCls(errors.stock ? 'err' : undefined)}
                      style={{ cursor: isLocked ? 'not-allowed' : undefined }}
                    />
                  </Field>
                )}

                {/* Status */}
                <Field label="Status">
                  <select
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={e => set('is_active', e.target.value === 'active')}
                    className={inputCls()}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
            </section>

            {/* ── Category ── */}
            <section>
              <p style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#94a3b8',
                paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
              }}>Category</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Category" required={!isLocked} error={errors.category_id} locked={isLocked}>
                  <select
                    value={form.category_id}
                    onChange={e => {
                      if (isLocked) return
                      set('category_id', e.target.value)
                      set('subcategory_id', '')
                      setAttrValues({})
                      setVariantRows([])
                      setVariantAxes([])
                      setInfoAxes([])
                      setStockMode('auto')
                      setVariantStockErrors({})
                    }}
                    className={inputCls(errors.category_id)}
                    disabled={catLoading || isLocked}
                    style={{ cursor: isLocked ? 'not-allowed' : undefined }}
                  >
                    <option value="">{catLoading ? 'Loading…' : '— Select category —'}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Subcategory"
                  hint={!isLocked ? 'Select to unlock attributes & variants' : undefined}
                  locked={isLocked}
                >
                  <select
                    value={form.subcategory_id}
                    onChange={e => {
                      if (isLocked) return
                      set('subcategory_id', e.target.value)
                      setAttrValues({})
                      setVariantRows([])
                      setStockMode('auto')
                      setVariantStockErrors({})
                    }}
                    className={inputCls()}
                    disabled={(!form.category_id && !isLocked) || subLoading || isLocked}
                    style={{ cursor: isLocked ? 'not-allowed' : undefined }}
                  >
                    <option value="">
                      {subLoading
                        ? 'Loading…'
                        : !form.category_id
                          ? '— Select category first —'
                          : '— None (optional) —'}
                    </option>
                    {subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* ── Informational Attributes ── */}
            {form.subcategory_id && !axesLoading && infoAxes.length > 0 && (
              <section>
                <p style={{
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#94a3b8',
                  paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
                }}>
                  Product Details
                  <span style={{
                    marginLeft: 8, fontSize: 9, fontWeight: 500,
                    color: '#c4b5fd', textTransform: 'none',
                  }}>informational only</span>
                </p>
                <DynamicAttributeSection
                  subcategoryId={Number(form.subcategory_id)}
                  values={attrValues}
                  onChange={setAttrValues}
                  disabled={saving}
                  overrideAttributes={infoAxes}
                />
              </section>
            )}

            {/* ── Variants (unlocked products only) ── */}
            {form.subcategory_id && !isLocked && (
              <section>
                <div style={{
                  paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
                  }}>Variants</p>
                  {axesLoading && (
                    <span style={{
                      fontSize: 10, color: '#94a3b8',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
                      Loading…
                    </span>
                  )}
                  {!axesLoading && variantAxes.length > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#6366f1',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      padding: '2px 8px', borderRadius: 4,
                    }}>
                      axes: {variantAxes.map(a => a.name).join(', ')}
                    </span>
                  )}
                </div>

                {!axesLoading && variantAxes.length === 0 && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e5e7eb',
                    borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#94a3b8',
                  }}>
                    This subcategory has no variant attributes configured.
                  </div>
                )}

                {!axesLoading && variantAxes.length > 0 && (
                  <>
                    <VariantBuilder
                      axes={variantAxes}
                      existingVariants={variantRows}
                      onChange={rows => {
                        setVariantRows(rows)
                        setVariantStockErrors({})
                      }}
                      basePrice={form.price}
                      disabled={saving}
                      externalStockErrors={variantStockErrors}
                    />

                    {variantRows.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <ColorGroupImageUploader
                          variantRows={variantRows}
                          colorAxis={variantAxes.find(a => a.type === 'color') ?? null}
                          onChange={setColorGroupImages}
                          existingByColorGroup={existingByColorGroup}
                          disabled={saving}
                        />
                      </div>
                    )}

                    {variantRows.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 10,
                          background: 'rgba(220,38,38,0.05)',
                          border: '1.5px solid rgba(220,38,38,0.2)',
                          borderRadius: 12, padding: '10px 16px',
                        }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: '#94a3b8',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>
                            Total Stock
                          </span>
                          <span style={{
                            fontSize: 22, fontWeight: 900, color: '#db142e',
                            lineHeight: 1,
                          }}>
                            {variantTotalStock}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                            units (auto-calculated)
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                LOCKED VARIANTS DISPLAY — full read-only table
                Shows every variant with its human-readable label,
                stock, price, SKU, active status, and thumbnail images.
                REPLACES the old "9 variant(s) — use Request Update" message.
            ════════════════════════════════════════════════════════════════*/}
            {isLocked && (p?.variant_rows ?? []).length > 0 && (
              <section>
                <div style={{
                  paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
                    }}>Variants</p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#6366f1',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      padding: '1px 6px', borderRadius: 4,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <Lock size={8} /> Locked — use Request Update
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#94a3b8',
                      background: '#f1f5f9',
                      border: '1px solid #e5e7eb',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {(p?.variant_rows ?? []).length} variant{(p?.variant_rows ?? []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {((p?.variant_rows ?? []) as LockedVariantRowData[]).map((variant, idx) => (
                    <LockedVariantCard
                      key={variant.id ?? idx}
                      variant={variant}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                VARIANT IMAGE MANAGEMENT
                Shown in edit mode for ALL products that have variants,
                whether locked or not. Allows instant upload/deletion of
                per-variant images with NO admin approval required.
            ════════════════════════════════════════════════════════════════*/}
            {showVariantImageManager && (
              <section>
                <VariantImageManager
                  variants={variantsForImageManager}
                  onChange={setVariantImageChanges}
                  disabled={saving}
                />
              </section>
            )}

            {/* ── General Images ──
                Shown when:
                  (a) Add mode (no variants yet), OR
                  (b) Edit mode with no server-side variants
                When a product has variants, images are managed per-variant above.
                We still show product-level images (no variant_id) for edit mode
                so sellers can manage cover / gallery images.
            ── */}
            {(!hasVariantRows || (isEdit && existingImages.length > 0)) && !showVariantImageManager && (
              <section>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 14,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
                  }}>Images</p>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{totalImages}/8</span>
                </div>

                {existingImages.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
                      Current Images
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {existingImages.map(img => (
                        <ImageThumb
                          key={img.id} src={img.url}
                          isPrimary={img.id === primaryImageId}
                          onRemove={() => removeExisting(img.id)}
                          onSetPrimary={() => setExistingPrimary(img.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {previews.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
                      New Images
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {previews.map(prev => (
                        <ImageThumb
                          key={prev.id} src={prev.preview}
                          isPrimary={existingImages.length === 0 && previews[0]?.id === prev.id}
                          onRemove={() => removePreview(prev.id)}
                          onSetPrimary={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {totalImages < 8 && (
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      addFiles(
                        Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                      )
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #e5e7eb', borderRadius: 14,
                      padding: '20px 16px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      cursor: 'pointer',
                    }}
                    className="hover:border-red-300"
                  >
                    <Upload size={20} color="#94a3b8" />
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>
                      Drop images or <span style={{ color: '#dc2626' }}>browse</span>
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                      JPG, PNG, WebP · max 5 MB each
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file" accept="image/*" multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        addFiles(Array.from(e.target.files ?? []))
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}
              </section>
            )}

            {!isEdit && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#92400e',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Your product will go live after admin approval.
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex', gap: 12, paddingTop: 4,
              position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 2,
            }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb',
                background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13,
                borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={saving || catLoading} style={{
                flex: 1, padding: '11px 0',
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
                opacity: (saving || catLoading) ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {saving && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {isEdit ? 'Save Changes' : 'Submit for Review'}
              </button>
            </div>
          </form>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>

      {updateRequestModalOpen && p && (
        <UpdateRequestModal
          product={p}
          variantRows={(p?.variant_rows ?? []) as any}
          onClose={() => setUpdateRequestModalOpen(false)}
          onSubmitted={() => { setUpdateRequestModalOpen(false); onSaved() }}
        />
      )}
    </>
  )
}