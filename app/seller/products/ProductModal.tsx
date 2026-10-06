'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { X, Upload, Trash2, Star, AlertCircle, ImageIcon, Radio } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { productsApi, categoriesApi, storageUrl, shippingApi, isNetworkError } from '@/lib/sellerApi'
import type { Category, Subcategory, ProductPayload } from '@/lib/sellerApi'
import DynamicAttributeSection from '../components/attributes/DynamicAttributeSection'
import VariantBuilder, {
  type VariantRow,
  normalizeVariantRow,
  calculateTotalStock,
  validateVariantStocks,
} from '../components/VariantBuilder'
import ProductImagesEditor, {
  type ImagesState, type ColorGroupDef,
  imagesFromServer, buildImageManifest, removedColorKeys, revokeImages,
} from '../components/ProductImagesEditor'
import type { AttributeValues, Attribute } from '@/types/Attributes'
import PriceDecreaseDialog, { type PriceDrop, discountFor } from '../components/PriceDecreaseDialog'
import AiDescriptionPanel from '../components/AiDescriptionPanel';
import CommissionPreview from '@/app/seller/components/CommissionPreview'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { OCCASIONS, normalizeOccasions, useOccasionCategories, type Occasion } from '@/lib/occasions'

import BrandLoader from '@/components/brand/BrandLoader'
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

interface ServerVariantRow extends VariantRow {
  label?: string
  option_map?: Record<string, {
    id: number; ids?: number[]; value: string; color_hex?: string | null
  }>
  image_urls?: string[]
  existing_images?: Array<{ id: number; url: string; is_primary?: boolean }>
}

function OccasionPicker({ selected, onChange }: { selected: Occasion[]; onChange: (v: Occasion[]) => void }) {
  const to = useTranslations('occasions')
  const toggle = (value: Occasion) => {
    if (value === 'all_season') {
      onChange(selected.includes('all_season') ? [] : ['all_season'])
      return
    }
    const without = selected.filter(s => s !== 'all_season')
    if (without.includes(value)) {
      const next = without.filter(s => s !== value)
      onChange(next.length > 0 ? next : [])
    } else {
      onChange([...without, value])
    }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 7 }}>
      {OCCASIONS.map(season => {
        const isChecked = selected.includes(season.value)
        return (
          <button key={season.value} type="button" onClick={() => toggle(season.value)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 6px', borderRadius: 10,
            border: isChecked ? '1.5px solid #dc2626' : '1.5px solid #e5e7eb',
            background: isChecked ? 'rgba(220,38,38,0.06)' : '#f8fafc',
            cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative', outline: 'none',
          }}>
            {isChecked && (
              <span style={{
                position: 'absolute', top: 4, insetInlineEnd: 4, width: 12, height: 12,
                borderRadius: '50%', background: '#dc2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                  <path d="M1 3.5L2.8 5.5L6 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            <span style={{ fontSize: 18, lineHeight: 1 }}>{season.emoji}</span>
            <span style={{ fontSize: 9, fontWeight: isChecked ? 800 : 600, color: isChecked ? '#dc2626' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>
              {to(season.value)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── FreeDeliveryToggle — defined HERE, OUTSIDE ProductModal ──────────────────
// FIX: was incorrectly placed as a const inside the JSX return of ProductModal.

function FreeDeliveryToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useTranslations('seller.productForm')
  const { price } = useFormat()
  // Free shipping isn't free: the agency still bills the order and the seller pays it.
  const [shipping, setShipping] = useState({ cost: 8, fee: 8 })
  useEffect(() => {
    shippingApi.cost()
      .then(r => setShipping({ cost: Number(r.data.shipping_cost), fee: Number(r.data.customer_delivery_fee) }))
      .catch(() => {})
  }, [])
  const cost = price(shipping.cost)
  const fee  = price(shipping.fee)
  return (
    <div style={{ marginTop: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}>
        <div
          onClick={() => onChange(!value)}
          style={{
            width: 40, height: 22, borderRadius: 999, flexShrink: 0,
            background: value ? '#10b981' : '#e5e7eb',
            position: 'relative', transition: 'background 0.2s ease', cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute', top: 3,
            insetInlineStart: value ? 'calc(100% - 19px)' : '3px',
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'inset-inline-start 0.2s ease',
          }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{t('freeDelivery')}</span>
            {value && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                background: 'rgba(16,185,129,0.12)', color: '#047857',
                border: '1px solid rgba(16,185,129,0.25)',
              }}>
                {t('freeDeliveryOn')}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#5b6472', margin: '2px 0 0' }}>
            {value ? t('freeDeliveryYes') : t('freeDeliveryNo', { fee })}
          </p>
        </div>
      </label>
      {value && (
        <div style={{
          marginTop: 10, marginInlineStart: 50,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💸</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#b45309', margin: '0 0 3px' }}>
              {t('freeDeliverySellerPays', { cost })}
            </p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
              {t('freeDeliveryExplain', { fee })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition bg-white
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

function Field({ label, required, error, hint, children, labelAction }: {
  label: string; required?: boolean; error?: string; hint?: string
  children: React.ReactNode; labelAction?: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5b6472', marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: '#b91c1c' }}>*</span>}
        {labelAction && (
          <span style={{ marginInlineStart: 'auto', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {labelAction}
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: '#5b6472', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

/** Opened from a Growth Radar card: starting values and the part of the form to show first. */
export interface ProductRadarPrefill {
  name?: string
  price?: number
  categoryId?: number
  focus?: 'photos' | 'description' | 'price'
}

interface ProductModalProps {
  product: Record<string, any> | null
  radar?: ProductRadarPrefill | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductModal({ product, radar, onClose, onSaved }: ProductModalProps) {
  const isEdit   = !!product
  const p        = product as FullProduct | null
  // Live (approved) products are edited directly; changes are logged for the admin
  const isLive   = !!(p?.is_approved)
  const pricing  = (p as any)?.pricing as undefined | {
    discount_rule: boolean; reference_price: number
    variant_reference_prices: Record<string, number>; window_days: number
  }
  const router   = useRouter()
  const t = useTranslations('seller.productForm')
  const { currency } = useFormat()
  const [priceDrops, setPriceDrops] = useState<PriceDrop[] | null>(null)
  useEffect(() => {
    if (!radar?.focus) return
    const id = setTimeout(() => document.getElementById(`pf-${radar.focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400)
    return () => clearTimeout(id)
  }, [radar?.focus])
  const [discountBusy, setDiscountBusy] = useState(false)

  const [form, setForm] = useState({
    name:              (p?.name              ?? radar?.name ?? '') as string,
    slug:              (p?.slug              ?? '') as string,
    sku:               (p?.sku               ?? '') as string,
    description:       (p?.description       ?? '') as string,
    short_description: (p?.short_description ?? '') as string,
    price:             radar?.price?.toString() ?? p?.price?.toString() ?? '',
    stock:             p?.stock?.toString()         ?? '0',
    category_id:       p?.category_id?.toString()   ?? radar?.categoryId?.toString() ?? '',
    subcategory_id:    p?.subcategory_id != null ? String(p.subcategory_id) : '',
    is_active:         p?.is_active ?? true,
    is_pack:           !!(p as any)?.is_pack,
    pack_quantity:     (p as any)?.pack_quantity != null ? String((p as any).pack_quantity) : '',
    pack_contents:     ((p as any)?.pack_contents ?? '') as string,
    occasions:         normalizeOccasions((p as any)?.occasions),
    // FIX: initialise free_delivery from existing product data
    free_delivery:     (p as any)?.delivery_fee !== undefined &&
                       (p as any)?.delivery_fee !== null &&
                       Number((p as any)?.delivery_fee) === 0,
  })

  const [attrValues,  setAttrValues]  = useState<AttributeValues>(p?.existing_attributes ?? {})
  const [variantRows, setVariantRows] = useState<VariantRow[]>((p?.variant_rows ?? []).map(normalizeVariantRow))
  // Images: one set per color group (or a single gallery) — applied on save
  const [images, setImages] = useState<ImagesState>(() => imagesFromServer((p as any)?.image_sets))
  const [uploadPct, setUploadPct] = useState<number | null>(null)

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
    if (!hasVariantRows) { setStockMode('auto'); setVariantStockErrors({}) }
  }, [hasVariantRows])

  const [categories,    setCategories]    = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [catLoading,    setCatLoading]    = useState(true)
  const [catError,      setCatError]      = useState(false)
  const [subLoading,    setSubLoading]    = useState(false)
  const [variantAxes, setVariantAxes]    = useState<Attribute[]>([])
  const [infoAxes,    setInfoAxes]        = useState<Attribute[]>([])
  const [axesLoading, setAxesLoading]    = useState(false)
  const [saving,      setSaving]          = useState(false)
  const [errors,      setErrors]          = useState<Record<string, string>>({})
  const [apiError,    setApiError]        = useState('')

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  // Season / Occasion only for the categories listed by the backend (App\Support\Occasions)
  const occasionCategories = useOccasionCategories()
  const categorySlug       = categories.find(c => c.id === Number(form.category_id))?.slug
  const occasionsApply     = !!categorySlug && !!occasionCategories?.includes(categorySlug)

  // API down → message + retry in the category field; the rest of the form stays usable
  const loadCategories = useCallback(() => {
    setCatLoading(true)
    setCatError(false)
    categoriesApi.getAll()
      .then(res => setCategories(res.data ?? []))
      .catch(err => { console.warn('[ProductModal] categories not loaded:', err?.message); setCatError(true) })
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    if (!form.category_id) { setSubcategories([]); set('subcategory_id', ''); setVariantAxes([]); setInfoAxes([]); return }
    const cat = categories.find(c => c.id === Number(form.category_id))
    if (!cat?.slug) return
    setSubLoading(true)
    categoriesApi.getSubcategories(cat.slug)
      .then(res => setSubcategories(res.data ?? []))
      .catch(() => setSubcategories([]))
      .finally(() => setSubLoading(false))
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

  useEffect(() => () => revokeImages(images), [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Color groups come from the variants: a new color adds a card, a removed one drops it
  const colorAxis = useMemo(() => variantAxes.find(a => a.type === 'color' || a.slug === 'color') ?? null, [variantAxes])
  const colorGroups = useMemo((): ColorGroupDef[] | null => {
    if (!colorAxis) return null
    const seen = new Map<string, ColorGroupDef>()
    for (const row of variantRows) {
      const ids = row.option_ids.filter(id => colorAxis.options.some(o => o.id === id)).sort((a, b) => a - b)
      if (!ids.length) continue
      const key = ids.join('|')
      if (!seen.has(key)) {
        seen.set(key, { key, swatches: ids.map(id => {
          const o = colorAxis.options.find(x => x.id === id)
          return { id, value: o?.value ?? '?', color_hex: o?.color_hex }
        }) })
      }
    }
    return Array.from(seen.values())
  }, [colorAxis, variantRows])
  const groupKeys  = colorGroups?.map(g => g.key) ?? null
  const removedKeys = removedColorKeys(images, groupKeys)
  const colorLabel = (key: string) => key.split('|').map(id => {
    const opt = colorAxis?.options.find(o => o.id === Number(id))
    return opt?.value ?? (p as any)?.image_sets?.color_groups?.find((g: any) => g.key === key)?.label ?? `#${id}`
  }).join(' + ')
  const totalImages = images.gallery.length + Object.entries(images.colors)
    .filter(([k]) => !groupKeys || groupKeys.includes(k)).reduce((n, [, l]) => n + l.length, 0)

 const validate = () => {
  const e: Record<string, string> = {}

  if (!form.name.trim()) e.name = t('errors.name')

  if (!form.category_id) e.category_id = t('errors.category')

  // ── Price: clearer message with value context ──────────────────────────
  if (form.price === '' || isNaN(Number(form.price))) {
    e.price = t('errors.priceRequired')
  } else if (Number(form.price) <= 0) {
    e.price = t('errors.pricePositive')
  }

  if (occasionsApply && form.occasions.length === 0) e.occasions = t('errors.occasions')

  if (form.is_pack) {
    const qty = Number(form.pack_quantity)
    if (!/^\d+$/.test(form.pack_quantity.trim()) || qty < 2 || qty > 1000) e.pack_quantity = t('errors.packQuantity')
  }
  if (form.pack_contents.length > 500) e.pack_contents = t('errors.packContents')

  if (hasVariantRows) {
    const varStockErrs = validateVariantStocks(variantRows)
    if (Object.keys(varStockErrs).length > 0) {
      setVariantStockErrors(varStockErrs)
      e.variants = t('errors.variants')
    } else {
      setVariantStockErrors({})
    }

  } else {
    // ── No-variant product: require at least 1 image ──────────────────────
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      e.stock = t('errors.stock')
    }

  }

  // Each color needs at least one image (its main image on the storefront)
  if (colorGroups) {
    const missing = colorGroups.filter(g => (images.colors[g.key] ?? []).length === 0)
    missing.forEach(g => { e[`images.color.${g.key}`] = t('colorImageRequired') })
    if (missing.length) e.images = t('colorImagesRequired', { colors: missing.map(g => colorLabel(g.key)).join(', ') })
  }

  setErrors(e)
  return Object.keys(e).length === 0
}

  /**
   * Price cuts on a live product must be discounts. Same rule as the backend:
   * below both today's price and the lowest price of the last 30 days.
   */
  const findPriceDrops = (): PriceDrop[] => {
    if (!isLive || !pricing?.discount_rule) return []
    const below = (next: number, cur: number, ref: number) => next < cur - 0.0005 && next < ref - 0.0005
    const drops: PriceDrop[] = []
    const curBase = Number(p?.price ?? 0)
    const newBase = form.price === '' ? curBase : Number(form.price)
    if (below(newBase, curBase, pricing.reference_price)) {
      drops.push({ current_price: curBase, requested_price: newBase, reference_price: pricing.reference_price })
    }
    const serverRows = (p?.variant_rows ?? []) as ServerVariantRow[]
    for (const row of variantRows) {
      if (!row.id) continue
      const orig    = serverRows.find(r => r.id === row.id)
      const follows = row.price_override === '' || row.price_override == null
      const curEff  = orig && orig.price_override !== '' && orig.price_override != null ? Number(orig.price_override) : curBase
      const newEff  = follows ? newBase : Number(row.price_override)
      const ref     = Number(pricing.variant_reference_prices?.[row.id] ?? curEff)
      if (below(newEff, curEff, ref) && !(drops.some(d => d.id === undefined) && follows)) {
        drops.push({ id: row.id, label: (orig as any)?.label, current_price: curEff, requested_price: newEff, reference_price: ref })
      }
    }
    return drops
  }

  /**
   * Saves the form. With keepCurrentPrices, the lowered prices are put back to
   * today's values so the rest of the edit is saved before opening the
   * discount flow. Returns true on success.
   */
  const save = async (keepCurrentPrices = false): Promise<boolean> => {
    setApiError('')
    try {
      const subId = form.subcategory_id ? parseInt(form.subcategory_id, 10) : null
      const serverRows = (p?.variant_rows ?? []) as ServerVariantRow[]
      const droppedIds = new Set((priceDrops ?? []).map(d => d.id).filter(Boolean) as number[])
      const validVariants = variantRows
        .filter(row => variantAxes.length > 0 && row.option_ids.filter(id => id > 0).length > 0)
        .map(row => {
          const keep = keepCurrentPrices && row.id != null && droppedIds.has(row.id)
          const orig = keep ? serverRows.find(r => r.id === row.id) : undefined
          const override = keep ? (orig?.price_override ?? '') : row.price_override
          return {
            ...(row.id ? { id: row.id } : {}),
            option_ids:     row.option_ids.filter(id => id > 0),
            stock:          row.stock,
            price_override: override !== '' && override != null ? override : null,
            sku:            row.sku || undefined,
            is_active:      row.is_active,
          }
        })
      const finalStock      = hasVariantRows ? variantTotalStock : parseInt(form.stock, 10)
      const baseDropped = keepCurrentPrices && (priceDrops ?? []).some(d => d.id === undefined)

      const payload: Record<string, any> = {
        name:              form.name.trim(),
        slug:              form.slug.trim()              || undefined,
        sku:               form.sku.trim()               || undefined,
        description:       form.description.trim()       || undefined,
        short_description: form.short_description.trim() || undefined,
        is_active:         form.is_active,
        is_pack:           form.is_pack ? 1 : 0,
        pack_quantity:     form.is_pack ? form.pack_quantity.trim() : '',
        pack_contents:     form.is_pack ? form.pack_contents.trim() : '',
        // Other categories are stored as all_season by the backend
        occasions:         occasionsApply ? form.occasions : undefined,
        // FIX: map free_delivery boolean to delivery_fee value for the backend
        delivery_fee:      form.free_delivery ? '0' : '',
        ...buildImageManifest(images, groupKeys),
        attributes:        serializeAttributes(attrValues),
        price:             baseDropped ? parseFloat(String(p?.price ?? 0)) : parseFloat(form.price),
        stock:             finalStock,
        category_id:       parseInt(form.category_id, 10),
      }

      if (subId !== null) payload.subcategory_id = subId
      if (validVariants.length > 0) payload.variants = validVariants

      const hasUploads = Object.keys(payload.uploads ?? {}).length > 0
      setUploadPct(hasUploads ? 0 : null)
      const progress = hasUploads ? setUploadPct : undefined
      if (isEdit) {
        await productsApi.update(product!.id, payload as ProductPayload, progress)
      } else {
        await productsApi.create(payload as ProductPayload, progress)
      }
      return true
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.code === 'PRICE_DECREASE_REQUIRES_DISCOUNT' && !keepCurrentPrices) {
        // Server-side rule (e.g. the price history changed since the form opened)
        const drops: PriceDrop[] = [
          ...(data.data?.product ? [data.data.product] : []),
          ...((data.data?.variants ?? []) as PriceDrop[]),
        ]
        setPriceDrops(drops.length ? drops : null)
      } else if (data?.errors) {
        const mapped: Record<string, string> = {}
        Object.entries(data.errors).forEach(([key, msgs]) => {
          // images.color_groups.N… → the card of that color group
          const m = key.match(/^images\.color_groups\.(\d+)/)
          const k = m && groupKeys?.[Number(m[1])] ? `images.color.${groupKeys[Number(m[1])]}`
            : key.startsWith('occasions.') ? 'occasions' : key
          mapped[k] ??= (msgs as string[])[0]
        })
        setErrors(mapped)
        const imageMsg = Object.entries(mapped).find(([k]) => k.startsWith('images'))?.[1]
        if (imageMsg) setApiError(imageMsg)
      } else if (isNetworkError(err)) {
        setApiError(t('networkError'))
      } else {
        setApiError(data?.message ?? t('errors.saveFailed'))
      }
      return false
    } finally {
      setUploadPct(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      setTimeout(() => {
        const firstErr = document.querySelector(
          '.border-red-300, [style*="fecaca"], [role="alert"]'
        ) as HTMLElement | null
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    if (removedKeys.length && !window.confirm(t('confirmRemovedColors', { colors: removedKeys.map(colorLabel).join(', ') }))) return

    const drops = findPriceDrops()
    if (drops.length) { setPriceDrops(drops); return }

    setSaving(true)
    const ok = await save()
    setSaving(false)
    if (ok) { revokeImages(images); onSaved(); onClose() }
  }

  /** Save everything else at today's prices, then open the discount form pre-filled. */
  const createDiscount = async () => {
    if (!priceDrops || !product) return
    setDiscountBusy(true)
    const ok = await save(true)
    setDiscountBusy(false)
    if (!ok) { setPriceDrops(null); return }
    const { type, value } = discountFor(priceDrops)
    const params = new URLSearchParams({
      create: 'discount', product: String(product.id), discount_type: type, discount_value: String(value),
    })
    const base = priceDrops.find(d => d.id === undefined)
    if (base) params.set('target', String(base.requested_price))
    onSaved()
    router.push(`/seller/promotions?${params.toString()}`)
  }


  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
            position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '20px 20px 0 0',
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>
                {isEdit ? t('editTitle') : t('addTitle')}
              </h2>
              {isLive && (
                <p style={{ fontSize: 11, color: '#047857', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <Radio size={10} /> {t('liveNotice')}
                </p>
              )}
              {!isEdit && <p style={{ fontSize: 11, color: '#5b6472', margin: '3px 0 0' }}>{t('reviewNotice')}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={onClose} aria-label={t('close')} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b6472' }}>
                <X size={18} />
              </button>
            </div>
          </div>


          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {apiError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiError}
              </div>
            )}

            {/* ── Basic Information ── */}
            <section>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>{t('sections.basic')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label={t('name')} required error={errors.name}>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('namePlaceholder')} className={inputCls(errors.name)} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('slug')} hint={t('slugHint')}>
                    <input value={form.slug} onChange={e => { slugTouched.current = true; set('slug', e.target.value) }} placeholder="my-product-name" dir="ltr" className={inputCls()} />
                  </Field>
                  <Field label={t('sku')} hint={t('skuHint')}>
                    <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder={t('skuPlaceholder')} className={inputCls()} />
                  </Field>
                </div>
                <Field label={t('shortDescription')} hint={t('shortDescriptionHint')}>
                  <input value={form.short_description} onChange={e => set('short_description', e.target.value)} maxLength={500} placeholder={t('shortDescriptionPlaceholder')} className={inputCls()} />
                </Field>
                <Field label={t('description')}>
                  <span id="pf-description" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('descriptionPlaceholder')} className={`${inputCls()} resize-none`} />
                    <AiDescriptionPanel
                      productId={p?.id}
                      productName={form.name} categoryId={form.category_id}
                      categoryName={categories.find(c => c.id === Number(form.category_id))?.name}
                      subcategoryName={subcategories.find(s => s.id === Number(form.subcategory_id))?.name}
                      price={form.price} shortDescription={form.short_description}
                      attrValues={attrValues} variantRows={variantRows}
                      variantAxes={variantAxes} infoAxes={infoAxes}
                      occasions={occasionsApply ? form.occasions : undefined}
                      isPack={form.is_pack} packQuantity={form.pack_quantity} packContents={form.pack_contents}
                      onInsert={({ short_description, description }) => {
                        if (short_description !== undefined) set('short_description', short_description)
                        if (description !== undefined) set('description', description)
                      }}
                    />
                  </div>
                </Field>
              </div>
            </section>

            {/* ── Pricing & Inventory ── */}
            <section>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>{t('sections.pricing')}</p>
              <div id="pf-price" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label={t('basePrice', { currency })} required error={errors.price}
                  hint={isLive && pricing?.discount_rule ? t('priceLowerHint') : undefined}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" min="0" step="0.001" value={form.price}
                        onChange={e => {
                          set('price', e.target.value)
                          if (errors.price) setErrors(prev => ({ ...prev, price: '' }))
                        }}
                        placeholder="0.000"
                        className={inputCls(errors.price)}
                        style={{ paddingInlineEnd: 44 }}
                      />
                      <span style={{
                        position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 11, color: errors.price ? '#b91c1c' : '#5b6472', fontWeight: 600,
                      }}>{currency}</span>
                    </div>
                    {errors.price && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7, marginTop: 6,
                        background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 8, padding: '8px 12px',
                      }}>
                        <AlertCircle size={13} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>{errors.price}</span>
                      </div>
                    )}
                  </div>
                </Field>
                <CommissionPreview price={form.price} />
                {!hasVariantRows && (
                  <Field label={t('stock')} required error={errors.stock}>
                    <input type="number" min="0" value={form.stock}
                      onChange={e => set('stock', e.target.value)}
                      placeholder="0"
                      className={inputCls(errors.stock ? 'err' : undefined)} />
                  </Field>
                )}
                <Field label={t('status')}>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => set('is_active', e.target.value === 'active')} className={inputCls()}>
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                </Field>
              </div>

              {/* Season / Occasion — only for the categories that use it */}
              {occasionsApply && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5b6472', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t('occasions')} <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    {form.occasions.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                        {t('selectedCount', { count: form.occasions.length })}
                      </span>
                    )}
                  </div>
                  <div style={{ border: errors.occasions ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb', borderRadius: 14, padding: 10, background: errors.occasions ? '#fef2f2' : '#f8fafc' }}>
                    <OccasionPicker selected={form.occasions} onChange={v => set('occasions', v)} />
                  </div>
                  {errors.occasions && <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{errors.occasions}</p>}
                  <p style={{ fontSize: 11, color: '#5b6472', marginTop: 5 }}>{t('occasionsHint')}</p>
                </div>
              )}

              {/* Multi-pack */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', width: 'fit-content' }}>
                  <input type="checkbox" checked={form.is_pack} onChange={e => set('is_pack', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#dc2626', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{t('isPack')}</span>
                </label>
                <p style={{ fontSize: 11, color: '#5b6472', marginBlock: '4px 0', marginInlineStart: 26 }}>{t('isPackHint')}</p>
                {form.is_pack && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 1fr', gap: 12, marginTop: 10, marginInlineStart: 26 }}>
                    <Field label={t('packQuantity')} required error={errors.pack_quantity} hint={t('packQuantityHint')}>
                      <input type="number" min={2} max={1000} step={1} inputMode="numeric" value={form.pack_quantity}
                        onChange={e => set('pack_quantity', e.target.value)} className={inputCls(errors.pack_quantity)} />
                    </Field>
                    <Field label={t('packContents')} error={errors.pack_contents}>
                      <input value={form.pack_contents} maxLength={500} onChange={e => set('pack_contents', e.target.value)}
                        placeholder={t('packContentsPlaceholder')} className={inputCls(errors.pack_contents)} />
                    </Field>
                  </div>
                )}
              </div>

              {/* ── FIX: FreeDeliveryToggle is now a proper component called here ── */}
              <FreeDeliveryToggle
                value={form.free_delivery}
                onChange={(v) => set('free_delivery', v)}
              />
            </section>

            {/* ── Category ── */}
            <section>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>{t('sections.category')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={t('category')} required error={errors.category_id}>
                  <select value={form.category_id} onChange={e => { set('category_id', e.target.value); set('subcategory_id', ''); setAttrValues({}); setVariantRows([]); setVariantAxes([]); setInfoAxes([]); setStockMode('auto'); setVariantStockErrors({}) }}
                    className={inputCls(errors.category_id)} disabled={catLoading}>
                    <option value="">{catLoading ? t('loading') : t('selectCategory')}</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  {catError && (
                    <p role="alert" style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />{t('categoriesFailed')}
                      <button type="button" onClick={loadCategories} style={{ background: 'none', border: 'none', padding: 0, color: '#b91c1c', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                        {t('retry')}
                      </button>
                    </p>
                  )}
                </Field>
                <Field label={t('subcategory')} hint={t('subcategoryHint')}>
                  <select value={form.subcategory_id} onChange={e => { set('subcategory_id', e.target.value); setAttrValues({}); setVariantRows([]); setStockMode('auto'); setVariantStockErrors({}) }}
                    className={inputCls()} disabled={!form.category_id || subLoading}>
                    <option value="">{subLoading ? t('loading') : !form.category_id ? t('selectCategoryFirst') : t('noneOptional')}</option>
                    {subcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            {/* ── Informational Attributes ── */}
            {form.subcategory_id && !axesLoading && infoAxes.length > 0 && (
              <section>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
                  {t('sections.details')} <span style={{ marginInlineStart: 8, fontSize: 9, fontWeight: 500, color: '#6d28d9', textTransform: 'none' }}>{t('informational')}</span>
                </p>
                <DynamicAttributeSection subcategoryId={Number(form.subcategory_id)} values={attrValues} onChange={setAttrValues} disabled={saving} overrideAttributes={infoAxes} />
              </section>
            )}

            {/* ── Variants ── */}
            {form.subcategory_id && (
              <section>
                <div style={{ paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', margin: 0 }}>{t('sections.variants')}</p>
                  {axesLoading && <span style={{ fontSize: 10, color: '#5b6472', display: 'flex', alignItems: 'center', gap: 4 }}><BrandLoader variant="inline" size={10} />{t('loading')}</span>}
                  {!axesLoading && variantAxes.length > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#4338ca', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: 4 }}>{t('axes', { list: variantAxes.map(a => a.name).join(', ') })}</span>}
                </div>
                {!axesLoading && variantAxes.length === 0 && <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#5b6472' }}>{t('noVariantAxes')}</div>}
                {!axesLoading && variantAxes.length > 0 && (
                  <>
                    <VariantBuilder axes={variantAxes} existingVariants={variantRows} onChange={rows => { setVariantRows(rows); setVariantStockErrors({}) }} basePrice={form.price} disabled={saving} externalStockErrors={variantStockErrors} />
                    {variantRows.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.05)', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '10px 16px' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#5b6472', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('totalStock')}</span>
                          <span style={{ fontSize: 22, fontWeight: 900, color: '#db142e', lineHeight: 1 }}>{variantTotalStock}</span>
                          <span style={{ fontSize: 11, color: '#5b6472', fontWeight: 500 }}>{t('unitsAuto')}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ── Images: color groups (shared by all sizes) or a single gallery ── */}
            <section id="pf-photos">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', margin: 0 }}>
                  {colorGroups ? t('sections.colorImages') : t('sections.images')}
                </p>
                {axesLoading && <BrandLoader variant="inline" size={12} style={{ color: '#94a3b8' }} />}
              </div>
              <ProductImagesEditor
                groups={colorGroups}
                value={images}
                onChange={next => {
                  setImages(next)
                  if (Object.keys(errors).some(k => k === 'images' || k.startsWith('images.'))) {
                    setErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'images' && !k.startsWith('images.'))))
                  }
                }}
                removed={removedKeys.map(key => ({ key, label: colorLabel(key), count: images.colors[key].length }))}
                errors={errors}
                disabled={saving}
              />
              {errors.images && <p role="alert" style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, margin: '10px 0 0' }}>{errors.images}</p>}
            </section>

            {!isEdit && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#92400e' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('liveAfterApproval')}
              </div>
            )}

            {uploadPct !== null && (
              <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#475569' }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadPct}%`, height: '100%', background: '#198f41', transition: 'width .2s' }} />
                </div>
                {uploadPct < 100 ? t('uploadingImages', { percent: uploadPct }) : t('savingProduct')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, paddingTop: 4, position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 2 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t('cancel')}</button>
              <button type="submit" disabled={saving || catLoading} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(220,38,38,0.3)', opacity: (saving || catLoading) ? 0.6 : 1, fontFamily: 'inherit' }}>
                {saving && <BrandLoader variant="inline" size={14} />}
                {isEdit ? t('saveChanges') : t('submitForReview')}
              </button>
            </div>
          </form>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>

      {priceDrops && (
        <PriceDecreaseDialog
          drops={priceDrops}
          windowDays={pricing?.window_days ?? 30}
          busy={discountBusy}
          onCreateDiscount={createDiscount}
          onCancel={() => setPriceDrops(null)}
        />
      )}
    </>
  )
}