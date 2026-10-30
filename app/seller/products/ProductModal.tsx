'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { X, Upload, Trash2, Star, AlertCircle, ImageIcon, Radio, Check, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Lightbulb, PackageX, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { productsApi, categoriesApi, storageUrl, shippingApi, isNetworkError } from '@/lib/sellerApi'
import type { Category, Subcategory, ProductPayload } from '@/lib/sellerApi'
import DynamicAttributeSection from '../components/attributes/DynamicAttributeSection'
import VariantBuilder, {
  type VariantRow,
  normalizeVariantRow,
  calculateTotalStock,
  validateVariantStocks,
  swatchBackground,
  type VariantIssue,
} from '../components/VariantBuilder'
import ProductImagesEditor, {
  type ImagesState, type ColorGroupDef, type ImgItem,
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
import { productDraft } from '@/lib/productDraft'
import { getUser } from '@/lib/auth'
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
  /** Description of the Multicolore color ("Noir / Blanc") */
  multicolor_label?: string | null
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
  // Free delivery isn't free: the seller pays the admin's contribution per
  // shipment. Both amounts are admin settings, read live (never hardcoded).
  const [shipping, setShipping] = useState<{ cost: number; fee: number } | null>(null)
  useEffect(() => {
    shippingApi.cost()
      .then(r => setShipping({ cost: Number(r.data.free_delivery_contribution), fee: Number(r.data.customer_delivery_fee) }))
      .catch(() => {})
  }, [])
  const cost = shipping ? price(shipping.cost) : '…'
  const fee  = shipping ? price(shipping.fee) : '…'
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
          {!value && (
            <p style={{ fontSize: 11, color: '#b45309', fontWeight: 600, margin: '2px 0 0' }}>
              {t('freeDeliveryCostHint', { cost })}
            </p>
          )}
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
  focus?: ProductFormFocus
}

/** Sections a deep link can scroll to (Growth Radar, Analyse des visiteurs, Qualité des fiches). */
export type ProductFormFocus = 'photos' | 'description' | 'price' | 'title' | 'category' | 'attributes' | 'stock'
export const PRODUCT_FORM_FOCUS: ProductFormFocus[] = ['photos', 'description', 'price', 'title', 'category', 'attributes', 'stock']

// ─── Add-product wizard ───────────────────────────────────────────────────────
// New products go through steps; edits keep the single form. Backend rules:
// App\Support\ProductListingRules (the source of truth — these are UX checks).

type WizardStep = 'category' | 'basic' | 'photos' | 'variants' | 'pricing' | 'review'
const SHORT_MIN = 20
const PHONE_RE = /(?<!\d)(?:\+?216|00216)?[2459]\d{7}(?!\d)/
const hasPhone = (text: string) => PHONE_RE.test(text.replace(/(?<=\d)[\s.\-]+(?=\d)/g, ''))
const GENERIC = ['meilleure prix', 'meilleur prix', 'meilleurs prix', 'best price', 'bon prix', 'prix choc', 'prix bas', 'petit prix',
  'prix imbattable', 'promotion', 'promo', 'soldes', 'solde', 'offre speciale', 'top qualite', 'bonne qualite', 'haute qualite', 'qualite',
  'good quality', 'high quality', 'quality', 'nouveau', 'new', 'disponible', 'available', 'livraison gratuite', 'free delivery', 'a saisir',
  'pas cher', 'cheap', 'اقل سعر', 'أقل سعر', 'افضل سعر', 'أفضل سعر', 'جودة عالية', 'تخفيض', 'عرض']
const unaccent = (x: string) => x.normalize('NFD').replace(/\p{Mn}+/gu, '')
/** Nothing is left once the "best price / promo" filler is removed. */
function isGenericText(text: string) {
  let t = unaccent(text.toLowerCase())
  for (const g of GENERIC) t = t.split(unaccent(g)).join(' ')
  return t.replace(/[^\p{L}]+/gu, '').length < 8
}
/** Wizard step that holds the field of an error key. */
function stepOfKey(k: string): WizardStep {
  if (k === 'category_id' || k === 'subcategory_id') return 'category'
  if (k === 'images' || k.startsWith('images')) return 'photos'
  if (k === 'variants' || k === 'multicolor_label' || k.startsWith('variants.')) return 'variants'
  if (['price', 'stock', 'occasions', 'pack_quantity', 'pack_contents', 'parcel_size', 'low_stock_threshold', 'delivery_fee'].includes(k)) return 'pricing'
  return 'basic'
}

/** Category / subcategory picker as tappable chips (large targets on phones). */
function Chips<T extends { id: number; name: string }>({ items, value, onChange, error, disabled }: {
  items: T[]; value: string; onChange: (id: string) => void; error?: boolean; disabled?: boolean
}) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(it => {
        const on = String(it.id) === value
        return (
          <button key={it.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(String(it.id))} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '8px 14px', borderRadius: 999,
            border: on ? '1.5px solid #db142e' : error ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb',
            background: on ? 'rgba(219,20,46,0.07)' : '#fff', color: on ? '#b91c1c' : '#334155',
            fontSize: 13, fontWeight: on ? 800 : 600, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>
            {on && <Check size={13} />}{it.name}
          </button>
        )
      })}
    </div>
  )
}

/** Small blocking dialog on top of the product sheet. */
function WizardDialog({ icon, title, children, actions }: { icon: React.ReactNode; title: string; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, maxWidth: 420, width: '100%', padding: 22, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(219,20,46,0.08)', color: '#db142e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 6px' }}>{title}</h3>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 18 }}>{children}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</div>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { padding: '11px 18px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { padding: '11px 18px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }

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
  const tv = useTranslations('seller.variants')
  const tw = useTranslations('seller.productForm.wizard')
  const { currency, price: formatPrice } = useFormat()
  // New products: step-by-step wizard. Edits: the single form.
  const wizard = !isEdit
  const [priceDrops, setPriceDrops] = useState<PriceDrop[] | null>(null)
  useEffect(() => {
    if (!radar?.focus) return
    const id = setTimeout(() => document.getElementById(`pf-${radar.focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400)
    return () => clearTimeout(id)
  }, [radar?.focus])
  const [discountBusy, setDiscountBusy] = useState(false)

  const makeForm = () => ({
    name:              (p?.name              ?? radar?.name ?? '') as string,
    slug:              (p?.slug              ?? '') as string,
    sku:               (p?.sku               ?? '') as string,
    description:       (p?.description       ?? '') as string,
    short_description: (p?.short_description ?? '') as string,
    price:             radar?.price?.toString() ?? p?.price?.toString() ?? '',
    // New product: empty, the seller must enter the real quantity
    stock:             p?.stock?.toString()         ?? '',
    // '' = the shop's threshold (Paramètres de la boutique)
    low_stock_threshold: (p as any)?.low_stock_threshold != null ? String((p as any).low_stock_threshold) : '',
    category_id:       p?.category_id?.toString()   ?? radar?.categoryId?.toString() ?? '',
    subcategory_id:    p?.subcategory_id != null ? String(p.subcategory_id) : '',
    is_active:         p?.is_active ?? true,
    is_pack:           !!(p as any)?.is_pack,
    pack_quantity:     (p as any)?.pack_quantity != null ? String((p as any).pack_quantity) : '',
    pack_contents:     ((p as any)?.pack_contents ?? '') as string,
    occasions:         normalizeOccasions((p as any)?.occasions),
    // Parcel size for the courier (S / L / XL): required, sets the delivery price
    parcel_size:       ((p as any)?.parcel_size ?? '') as '' | 'S' | 'L' | 'XL',
    // FIX: initialise free_delivery from existing product data
    free_delivery:     (p as any)?.delivery_fee !== undefined &&
                       (p as any)?.delivery_fee !== null &&
                       Number((p as any)?.delivery_fee) === 0,
  })
  const [form, setForm] = useState(makeForm)

  const [attrValues,  setAttrValues]  = useState<AttributeValues>(p?.existing_attributes ?? {})
  const [variantRows, setVariantRows] = useState<VariantRow[]>((p?.variant_rows ?? []).map(normalizeVariantRow))
  // Images: one set per color group (or a single gallery) — applied on save
  const [images, setImages] = useState<ImagesState>(() => imagesFromServer((p as any)?.image_sets))
  const [uploadPct, setUploadPct] = useState<number | null>(null)

  const [stockMode, setStockMode] = useState<'auto' | 'manual'>('auto')
  const [variantStockErrors, setVariantStockErrors] = useState<Record<number, string>>({})
  // Multicolore description (one per product) and the builder's setup problems
  const [multicolorLabel, setMulticolorLabel] = useState<string>(p?.multicolor_label ?? '')
  const [variantIssues, setVariantIssues]     = useState<VariantIssue[]>([])
  const [showVariantErrors, setShowVariantErrors] = useState(false)
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

  const set = (field: string, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(prev => (prev[field] ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== field)) : prev))
  }

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
          return { id, value: o?.is_multicolor && multicolorLabel.trim() ? multicolorLabel.trim() : (o?.value ?? '?'), color_hex: o ? swatchBackground(o) : undefined }
        }) })
      }
    }
    return Array.from(seen.values())
  }, [colorAxis, variantRows, multicolorLabel])
  const groupKeys  = colorGroups?.map(g => g.key) ?? null
  const removedKeys = removedColorKeys(images, groupKeys)
  const colorLabel = (key: string) => key.split('|').map(id => {
    const opt = colorAxis?.options.find(o => o.id === Number(id))
    if (opt?.is_multicolor && multicolorLabel.trim()) return multicolorLabel.trim()
    return opt?.value ?? (p as any)?.image_sets?.color_groups?.find((g: any) => g.key === key)?.label ?? `#${id}`
  }).join(' + ')
  const totalImages = images.gallery.length + Object.entries(images.colors)
    .filter(([k]) => !groupKeys || groupKeys.includes(k)).reduce((n, [, l]) => n + l.length, 0)

  // Subcategory is required when the category has some (backend: ProductListingRules)
  const subRequired = !!form.category_id && !subLoading && subcategories.length > 0
  const originalShort = String(p?.short_description ?? '').trim()
  const originalCategory = p?.category_id != null ? String(p.category_id) : ''
  const finalStockValue = hasVariantRows ? variantTotalStock : (form.stock.trim() === '' ? 0 : Number(form.stock))

  /** Every client-side problem, keyed by field (no state changes: also used for the live checklist). */
  const computeErrors = (): Record<string, string> => {
  const e: Record<string, string> = {}

  if (!form.name.trim()) e.name = t('errors.name')
  // New product: always. Edit: only when the category changes (legacy products keep saving)
  if (subRequired && !form.subcategory_id && (!isEdit || form.category_id !== originalCategory)) e.subcategory_id = tw('subcategoryRequired')

  // Short description: required on new products; on edits only checked when changed
  const short = form.short_description.trim()
  if (!isEdit || (short !== '' && short !== originalShort)) {
    if (!short) e.short_description = tw('shortRequired', { min: SHORT_MIN })
    else if (hasPhone(short)) e.short_description = tw('shortPhone')
    else if (short.length < SHORT_MIN) e.short_description = tw('shortMin', { min: SHORT_MIN, count: short.length })
    else if (isGenericText(short)) e.short_description = tw('shortGeneric')
  }
  if (!form.parcel_size) e.parcel_size = t('errors.parcelSize')

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

  // Variants: a color in every slot, the size / pointure chosen, some stock (new products)
  if (variantAxes.length > 0) {
    setShowVariantErrors(true)
    const issue = variantIssues[0]
    if (issue) {
      e.variants = issue.code === 'noAxis' ? tv('errors.noAxis', { axis: issue.axis }) : tv(`errors.${issue.code}`)
    } else if (hasVariantRows && !isEdit && variantTotalStock <= 0) {
      e.variants = tv('errors.noStock')
    }
  }

  if (hasVariantRows) {
    if (Object.keys(validateVariantStocks(variantRows)).length > 0) e.variants ??= t('errors.variants')
  } else if (!isEdit && (form.stock.trim() === '' || Number(form.stock) < 1) && /^\d*$/.test(form.stock.trim())) {
    // New product: at least 1 (the "Your stock is 0" dialog explains why)
    e.stock = tw('stockMin')
  } else if (form.stock === '' || !/^\d+$/.test(form.stock.trim())) {
    e.stock = t('errors.stock')
  }

  // New product: at least one photo
  if (!isEdit && totalImages === 0 && !(colorGroups && colorGroups.length > 0)) e.images = tw('photoRequired')

  // Each color needs at least one image (its main image on the storefront)
  if (colorGroups) {
    const missing = colorGroups.filter(g => (images.colors[g.key] ?? []).length === 0)
    missing.forEach(g => { e[`images.color.${g.key}`] = t('colorImageRequired') })
    if (missing.length) e.images = t('colorImagesRequired', { colors: missing.map(g => colorLabel(g.key)).join(', ') })
  }

  return e
}

  const validate = () => {
    const e = computeErrors()
    if (variantAxes.length > 0) setShowVariantErrors(true)
    setVariantStockErrors(hasVariantRows ? validateVariantStocks(variantRows) : {})
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Wizard state ───────────────────────────────────────────────────────────
  // Color products attach photos per color, so their colors (Variants) come before Photos
  const steps: WizardStep[] = colorAxis
    ? ['category', 'basic', 'variants', 'photos', 'pricing', 'review']
    : ['category', 'basic', 'photos', 'variants', 'pricing', 'review']
  const [stepIdx, setStepIdx] = useState(0)
  const step = steps[Math.min(stepIdx, steps.length - 1)]
  const [visited, setVisited]     = useState<WizardStep[]>([])
  const [attempted, setAttempted] = useState(false)
  const [stockDialog, setStockDialog] = useState(false)
  const [oosConfirm, setOosConfirm]   = useState(false)
  const [builderKey, setBuilderKey]   = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const liveErrors = computeErrors()
  const hide = (s: WizardStep): React.CSSProperties | undefined => (wizard && step !== s ? { display: 'none' } : undefined)
  const stepErrorCount = (s: WizardStep) => Object.keys(liveErrors).filter(k => stepOfKey(k) === s).length
  const showStepMarker = (s: WizardStep) => (attempted || visited.includes(s)) && stepErrorCount(s) > 0

  const goTo = (i: number) => {
    setVisited(v => (v.includes(step) ? v : [...v, step]))
    setStepIdx(Math.max(0, Math.min(i, steps.length - 1)))
    setTimeout(() => sheetRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }

  /** Validates the current step; the 0-stock dialog comes first so nobody continues with 0. */
  const goNext = () => {
    if (step === 'variants') {
      if (variantAxes.length > 0) setShowVariantErrors(true)
      setVariantStockErrors(hasVariantRows ? validateVariantStocks(variantRows) : {})
      if (hasVariantRows && variantTotalStock <= 0) { setStockDialog(true); return }
    }
    if (step === 'pricing' && !hasVariantRows && (form.stock.trim() === '' || Number(form.stock) <= 0)) { setStockDialog(true); return }
    const mine = Object.fromEntries(Object.entries(computeErrors()).filter(([k]) => stepOfKey(k) === step))
    if (Object.keys(mine).length) {
      setErrors(prev => ({ ...prev, ...mine }))
      scrollToFirstError()
      return
    }
    goTo(stepIdx + 1)
  }

  /** "Fix my stock": back to the stock field (or the first variant without stock). */
  const fixStock = () => {
    setStockDialog(false)
    setOosConfirm(false)
    const target = hasVariantRows ? 'variants' : 'pricing'
    if (wizard && step !== target) goTo(steps.indexOf(target))
    setTimeout(() => {
      const el = hasVariantRows
        ? (Array.from(document.querySelectorAll<HTMLInputElement>('[data-variant-stock]')).find(i => Number(i.value) <= 0)
          ?? document.querySelector<HTMLInputElement>('[data-variant-stock]'))
        : document.getElementById('pf-stock-input') as HTMLInputElement | null
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus()
      el?.select?.()
    }, 120)
  }

  // ── Draft (new products): kept in this browser so nothing is lost on refresh ──
  const draftKey = useMemo(() => `new-product:${getUser()?.id ?? 'me'}`, [])
  const [draftReady, setDraftReady]       = useState(isEdit || !!radar)
  const [draftRestored, setDraftRestored] = useState(false)
  useEffect(() => {
    if (draftReady) return
    const asItem = (x: { uid: string; file: File }): ImgItem => ({ uid: x.uid, kind: 'new', file: x.file, url: URL.createObjectURL(x.file) })
    productDraft.load(draftKey).then(d => {
      if (!d || Date.now() - d.savedAt > 30 * 86400_000) return
      setForm(f => ({ ...f, ...(d.form as Partial<typeof f>) }))
      setAttrValues((d.attrValues ?? {}) as AttributeValues)
      setVariantRows(((d.variantRows ?? []) as VariantRow[]).map(normalizeVariantRow))
      setMulticolorLabel(d.multicolorLabel ?? '')
      setImages({
        gallery: (d.images?.gallery ?? []).map(asItem),
        colors: Object.fromEntries(Object.entries(d.images?.colors ?? {}).map(([k, l]) => [k, l.map(asItem)])),
      })
      if ((d.form as { slug?: string })?.slug) slugTouched.current = true
      setStepIdx(Math.min(d.step ?? 0, 4))
      setDraftRestored(true)
    }).finally(() => setDraftReady(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit || !draftReady) return
    const id = setTimeout(() => {
      const started = form.name.trim() || form.category_id || totalImages > 0
      if (!started) { productDraft.clear(draftKey); return }
      const keep = (l: ImgItem[]) => l.flatMap(i => (i.kind === 'new' ? [{ uid: i.uid, file: i.file }] : []))
      productDraft.save(draftKey, {
        savedAt: Date.now(), step: stepIdx, form, attrValues, variantRows, multicolorLabel,
        images: { gallery: keep(images.gallery), colors: Object.fromEntries(Object.entries(images.colors).map(([k, l]) => [k, keep(l)])) },
      })
    }, 600)
    return () => clearTimeout(id)
  }, [form, attrValues, variantRows, multicolorLabel, images, stepIdx, draftReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const startOver = () => {
    productDraft.clear(draftKey)
    revokeImages(images)
    slugTouched.current = false
    setForm(makeForm())
    setAttrValues({}); setVariantRows([]); setMulticolorLabel('')
    setImages({ gallery: [], colors: {} })
    setErrors({}); setVisited([]); setAttempted(false); setStepIdx(0); setDraftRestored(false)
    setBuilderKey(k => k + 1)
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
        parcel_size:       form.parcel_size,
        ...buildImageManifest(images, groupKeys),
        attributes:        serializeAttributes(attrValues),
        price:             baseDropped ? parseFloat(String(p?.price ?? 0)) : parseFloat(form.price),
        stock:             finalStock,
        low_stock_threshold: form.low_stock_threshold.trim() === '' ? null : parseInt(form.low_stock_threshold, 10),
        category_id:       parseInt(form.category_id, 10),
      }

      if (subId !== null) payload.subcategory_id = subId
      if (validVariants.length > 0) {
        payload.variants = validVariants
        // Kept by the server only while a Multicolore variant exists
        payload.multicolor_label = multicolorLabel.trim()
      }

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
        if (wizard) {
          setAttempted(true)
          const first = Object.keys(mapped)[0]
          if (first) goTo(steps.indexOf(stepOfKey(first)))
        }
        if (mapped.variants || mapped.multicolor_label || wizard) scrollToFirstError()
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

  function scrollToFirstError() {
    setTimeout(() => {
      const firstErr = document.querySelector(
        '.border-red-300, [style*="fecaca"], [role="alert"]'
      ) as HTMLElement | null
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const handleSubmit = async (e?: React.FormEvent, stockConfirmed = false) => {
    e?.preventDefault()
    // Enter in a field moves the wizard forward instead of sending
    if (wizard && step !== 'review') { goNext(); return }
    if (!validate()) {
      setAttempted(true)
      if (wizard) {
        const first = Object.keys(computeErrors())[0]
        if (first) goTo(steps.indexOf(stepOfKey(first)))
      }
      scrollToFirstError()
      return
    }
    // New product with 0 stock: explain and send back to the stock field
    if (!isEdit && finalStockValue <= 0) { setStockDialog(true); return }
    // Edit to 0 stock is allowed (sold out) but confirmed
    if (isEdit && finalStockValue <= 0 && !stockConfirmed) { setOosConfirm(true); return }
    if (removedKeys.length && !window.confirm(t('confirmRemovedColors', { colors: removedKeys.map(colorLabel).join(', ') }))) return

    const drops = findPriceDrops()
    if (drops.length) { setPriceDrops(drops); return }

    setSaving(true)
    const ok = await save()
    setSaving(false)
    if (ok) { if (!isEdit) productDraft.clear(draftKey); revokeImages(images); onSaved(); onClose() }
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
      <div data-ct-modal="" style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div className="ct-sheet" ref={sheetRef} style={{
          background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div className="ct-sheet-head" style={{
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
              {!isEdit && <p style={{ fontSize: 11, color: '#5b6472', margin: '3px 0 0' }}>{tw('stepOf', { current: stepIdx + 1, total: steps.length })} · {t('reviewNotice')}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={onClose} aria-label={t('close')} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b6472' }}>
                <X size={18} />
              </button>
            </div>
          </div>


          {/* ── Wizard progress ── */}
          {wizard && (
            <nav aria-label={tw('stepOf', { current: stepIdx + 1, total: steps.length })} style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 24px', borderBottom: '1px solid #f0f0f0', background: '#fcfcfd' }}>
              {steps.map((s, i) => {
                const current = i === stepIdx
                const done = i < stepIdx && stepErrorCount(s) === 0
                const bad = showStepMarker(s)
                const reachable = i <= stepIdx || visited.includes(s)
                return (
                  <button key={s} type="button" disabled={!reachable} onClick={() => goTo(i)} aria-current={current ? 'step' : undefined}
                    title={bad ? tw('stepHasErrors') : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '6px 10px', borderRadius: 999, fontFamily: 'inherit',
                      border: current ? '1.5px solid #db142e' : '1.5px solid transparent', background: current ? 'rgba(219,20,46,0.06)' : 'transparent',
                      cursor: reachable ? 'pointer' : 'default', opacity: reachable ? 1 : 0.55 }}>
                    <span style={{ position: 'relative', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                      background: done ? '#198f41' : current ? '#db142e' : '#e5e7eb', color: done || current ? '#fff' : '#475569' }}>
                      {done ? <Check size={12} /> : i + 1}
                      {bad && <span aria-hidden style={{ position: 'absolute', top: -2, insetInlineEnd: -2, width: 9, height: 9, borderRadius: '50%', background: '#dc2626', border: '2px solid #fff' }} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: current ? 800 : 600, color: bad ? '#b91c1c' : current ? '#111' : '#475569', whiteSpace: 'nowrap' }}>{tw(`steps.${s}`)}</span>
                  </button>
                )
              })}
            </nav>
          )}

          {!draftReady ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><BrandLoader variant="inline" size={22} /></div>
          ) : (
          <form className="ct-sheet-body" onSubmit={handleSubmit} noValidate={wizard} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {draftRestored && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#166534' }}>
                <Check size={14} style={{ flexShrink: 0 }} /> {tw('draftRestored')}
                <button type="button" onClick={startOver} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#166534', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  <RotateCcw size={12} /> {tw('startOver')}
                </button>
              </div>
            )}

            {apiError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{apiError}
              </div>
            )}

            {/* ── Basic Information ── */}
            <section id="pf-title" style={hide('basic')}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>{t('sections.basic')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label={t('name')} required error={errors.name}>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('namePlaceholder')} className={inputCls(errors.name)} />
                </Field>
                <div className="ct-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={t('slug')} hint={t('slugHint')}>
                    <input value={form.slug} onChange={e => { slugTouched.current = true; set('slug', e.target.value) }} placeholder="my-product-name" dir="ltr" className={inputCls()} />
                  </Field>
                  <Field label={t('sku')} hint={t('skuHint')}>
                    <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder={t('skuPlaceholder')} className={inputCls()} />
                  </Field>
                </div>
                <Field label={t('shortDescription')} required={!isEdit} error={errors.short_description}
                  hint={`${tw('shortAvoid')} · ${form.short_description.trim().length}/${SHORT_MIN}+`}>
                  <input value={form.short_description} onChange={e => set('short_description', e.target.value)} maxLength={500}
                    placeholder={tw('shortPlaceholder')} className={inputCls(errors.short_description)} />
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
            <section style={hide('pricing')}>
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
                    <span id="pf-stock" />
                    <input id="pf-stock-input" type="number" min={isEdit ? 0 : 1} step={1} inputMode="numeric" value={form.stock}
                      onChange={e => set('stock', e.target.value.replace(/[^\d]/g, ''))}
                      placeholder={isEdit ? '0' : '1'}
                      className={inputCls(errors.stock ? 'err' : undefined)} />
                  </Field>
                )}
                {hasVariantRows && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'rgba(219,20,46,0.04)', border: '1.5px solid rgba(219,20,46,0.18)', borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: variantTotalStock > 0 ? '#111' : '#b91c1c' }}>{tw('totalFromVariants', { count: variantTotalStock })}</span>
                    <span style={{ fontSize: 11, color: '#5b6472' }}>{tw('variantStockHint')}</span>
                    {wizard && (
                      <button type="button" onClick={() => goTo(steps.indexOf('variants'))} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#db142e', fontWeight: 800, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                        {tw('editVariantStock')}
                      </button>
                    )}
                  </div>
                )}
                <Field label={t('lowStockThreshold')} error={errors.low_stock_threshold} hint={t('lowStockThresholdHint')}>
                  <input type="number" min="1" max="50" inputMode="numeric" value={form.low_stock_threshold}
                    onChange={e => set('low_stock_threshold', e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder={(p as any)?.shop_low_stock_threshold != null
                      ? t('lowStockThresholdShop', { n: (p as any).shop_low_stock_threshold })
                      : t('lowStockThresholdDefault')}
                    className={inputCls(errors.low_stock_threshold ? 'err' : undefined)} />
                </Field>
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
                  <div className="ct-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 1fr', gap: 12, marginTop: 10, marginInlineStart: 26 }}>
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

              {/* Parcel size: the courier's package size, and the delivery price of the parcel */}
              <div id="pf-parcel-size" style={{ marginTop: 14 }}>
                <Field label={t('parcelSize')} required error={errors.parcel_size} hint={t('parcelSizeHint')}>
                  <select value={form.parcel_size} onChange={e => set('parcel_size', e.target.value as '' | 'S' | 'L' | 'XL')}
                    aria-required="true" className={inputCls(errors.parcel_size)}>
                    <option value="">{t('parcelSizeSelect')}</option>
                    {(['S', 'L', 'XL'] as const).map(s => <option key={s} value={s}>{t(`parcelSizes.${s}`)}</option>)}
                  </select>
                </Field>
              </div>

              {/* ── FIX: FreeDeliveryToggle is now a proper component called here ── */}
              <FreeDeliveryToggle
                value={form.free_delivery}
                onChange={(v) => set('free_delivery', v)}
              />
            </section>

            {/* ── Category ── */}
            <section id="pf-category" style={hide('category')}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>{t('sections.category')}</p>
              {wizard && (
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>{tw('categoryTitle')}</h3>
                  <p style={{ fontSize: 12.5, color: '#5b6472', margin: 0 }}>{tw('categoryHint')}</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label={t('category')} required error={errors.category_id}>
                  {(() => {
                    const pickCategory = (v: string) => { if (v === form.category_id) return; set('category_id', v); set('subcategory_id', ''); setAttrValues({}); setVariantRows([]); setVariantAxes([]); setInfoAxes([]); setStockMode('auto'); setVariantStockErrors({}); setBuilderKey(k => k + 1) }
                    return wizard ? (
                      catLoading ? <BrandLoader variant="inline" size={16} /> : <Chips items={categories} value={form.category_id} onChange={pickCategory} error={!!errors.category_id} />
                    ) : (
                      <select value={form.category_id} onChange={e => pickCategory(e.target.value)}
                        className={inputCls(errors.category_id)} disabled={catLoading}>
                        <option value="">{catLoading ? t('loading') : t('selectCategory')}</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    )
                  })()}
                  {catError && (
                    <p role="alert" style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />{t('categoriesFailed')}
                      <button type="button" onClick={loadCategories} style={{ background: 'none', border: 'none', padding: 0, color: '#b91c1c', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                        {t('retry')}
                      </button>
                    </p>
                  )}
                </Field>
                {form.category_id && (
                  <Field label={tw('subcategoryTitle')} required={subRequired} error={errors.subcategory_id}
                    hint={isEdit && subRequired && !form.subcategory_id ? tw('subcategoryMissingEdit') : t('subcategoryHint')}>
                    {subLoading ? <BrandLoader variant="inline" size={16} />
                      : subcategories.length === 0 ? <p style={{ fontSize: 12, color: '#5b6472', margin: 0 }}>{tw('noSubcategories')}</p>
                      : <Chips items={subcategories} value={form.subcategory_id} error={!!errors.subcategory_id || (isEdit && !form.subcategory_id)}
                          onChange={v => { if (v === form.subcategory_id) return; set('subcategory_id', v); setAttrValues({}); setVariantRows([]); setStockMode('auto'); setVariantStockErrors({}); setBuilderKey(k => k + 1) }} />}
                  </Field>
                )}
              </div>
            </section>

            {/* ── Informational Attributes ── */}
            {form.subcategory_id && !axesLoading && infoAxes.length > 0 && (
              <section id="pf-attributes" style={hide('basic')}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
                  {t('sections.details')} <span style={{ marginInlineStart: 8, fontSize: 9, fontWeight: 500, color: '#6d28d9', textTransform: 'none' }}>{t('informational')}</span>
                </p>
                <DynamicAttributeSection subcategoryId={Number(form.subcategory_id)} values={attrValues} onChange={setAttrValues} disabled={saving} overrideAttributes={infoAxes} />
              </section>
            )}

            {/* ── Variants ── */}
            {wizard && step === 'variants' && (!form.subcategory_id || (!axesLoading && variantAxes.length === 0)) && (
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#475569' }}>{tw('noVariantsNeeded')}</div>
            )}
            {form.subcategory_id && (
              <section style={hide('variants')}>
                {wizard && variantAxes.length > 0 && <p style={{ fontSize: 12, color: '#5b6472', margin: '0 0 10px' }}>{tw('variantStockHint')}</p>}
                <div style={{ paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5b6472', margin: 0 }}>{t('sections.variants')}</p>
                  {axesLoading && <span style={{ fontSize: 10, color: '#5b6472', display: 'flex', alignItems: 'center', gap: 4 }}><BrandLoader variant="inline" size={10} />{t('loading')}</span>}
                  {!axesLoading && variantAxes.length > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#4338ca', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: 4 }}>{t('axes', { list: variantAxes.map(a => a.name).join(', ') })}</span>}
                </div>
                {!axesLoading && variantAxes.length === 0 && <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#5b6472' }}>{t('noVariantAxes')}</div>}
                {!axesLoading && variantAxes.length > 0 && (
                  <>
                    <VariantBuilder key={builderKey} axes={variantAxes} existingVariants={variantRows} onChange={rows => { setVariantRows(rows); setVariantStockErrors({}); setErrors(prev => prev.variants ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'variants')) : prev) }} basePrice={form.price} disabled={saving} externalStockErrors={variantStockErrors}
                      multicolorLabel={multicolorLabel} onMulticolorLabelChange={setMulticolorLabel}
                      onIssuesChange={setVariantIssues} showErrors={showVariantErrors} />
                    {/* Setup problems are already shown inline by the builder */}
                    {(errors.variants || errors.multicolor_label) && !(showVariantErrors && variantIssues.length > 0) && (
                      <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 700, margin: '12px 0 0' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} /> {errors.variants ?? errors.multicolor_label}
                      </p>
                    )}
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
            <section id="pf-photos" style={hide('photos')}>
              {/* One product = one article */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 900, color: '#92400e', margin: '0 0 4px' }}>
                  <Lightbulb size={15} /> {tw('photosTipTitle')}
                </p>
                <p style={{ fontSize: 12.5, color: '#78350f', margin: '0 0 10px', lineHeight: 1.5 }}>{tw('photosTip')}</p>
                <div className="ct-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 10px', margin: 0 }}>
                    <ThumbsUp size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {tw('photosGood')}
                  </p>
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', margin: 0 }}>
                    <ThumbsDown size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {tw('photosBad')}
                  </p>
                </div>
                <p style={{ fontSize: 11.5, color: '#78350f', margin: '10px 0 0' }}>📷 {tw('coverTip')}</p>
              </div>
              {totalImages > 5 && !hasVariantRows && (
                <p role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, fontWeight: 600, color: '#b45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {tw('manyPhotos', { count: totalImages })}
                </p>
              )}
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

            {wizard && step === 'review' && (() => {
              const cover = images.gallery[0]?.url ?? (colorGroups ?? []).map(g => images.colors[g.key]?.[0]?.url).find(Boolean)
              const catName = categories.find(c => c.id === Number(form.category_id))?.name
              const subName = subcategories.find(sc => sc.id === Number(form.subcategory_id))?.name
              const priceOk = !liveErrors.price && form.price !== ''
              const checks: { key: string; label: string; ok: boolean; step: WizardStep }[] = [
                { key: 'category', label: tw('checklist.category'), ok: !!form.category_id, step: 'category' },
                { key: 'subcategory', label: tw('checklist.subcategory'), ok: !liveErrors.subcategory_id, step: 'category' },
                { key: 'name', label: tw('checklist.name'), ok: !liveErrors.name, step: 'basic' },
                { key: 'short', label: tw('checklist.shortDescription'), ok: !liveErrors.short_description, step: 'basic' },
                { key: 'photos', label: tw('checklist.photos'), ok: !Object.keys(liveErrors).some(k => k.startsWith('images')) && totalImages > 0, step: 'photos' },
                { key: 'stock', label: tw('checklist.stock'), ok: finalStockValue >= 1 && !liveErrors.stock && !liveErrors.variants, step: hasVariantRows ? 'variants' : 'pricing' },
                { key: 'price', label: tw('checklist.price'), ok: priceOk, step: 'pricing' },
              ]
              return (
                <section>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 14px' }}>{tw('reviewTitle')}</h3>
                  <div className="ct-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: 18, alignItems: 'start' }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5b6472', margin: '0 0 8px' }}>{tw('previewLabel')}</p>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 16px rgba(15,23,42,0.06)', maxWidth: 240 }}>
                        <div style={{ aspectRatio: '1 / 1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {cover ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={32} color="#94a3b8" />}
                        </div>
                        <div style={{ padding: '10px 12px 12px' }}>
                          {catName && <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', fontWeight: 600 }}>{[catName, subName].filter(Boolean).join(' › ')}</p>}
                          <p style={{ fontSize: 13.5, fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.3 }}>{form.name || '—'}</p>
                          {form.short_description.trim() && <p style={{ fontSize: 11.5, color: '#475569', margin: '3px 0 0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.short_description}</p>}
                          <p style={{ fontSize: 15, fontWeight: 900, color: '#db142e', margin: '8px 0 4px' }}>{priceOk ? formatPrice(Number(form.price)) : '—'}</p>
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                            background: finalStockValue > 0 ? 'rgba(25,143,65,0.1)' : 'rgba(219,20,46,0.08)', color: finalStockValue > 0 ? '#198f41' : '#b91c1c' }}>
                            {finalStockValue > 0 ? tw('inStock') : tw('outOfStock')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {checks.map(c => (
                        <li key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${c.ok ? '#bbf7d0' : '#fecaca'}`, background: c.ok ? '#f0fdf4' : '#fef2f2' }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ok ? '#198f41' : '#dc2626', color: '#fff', flexShrink: 0 }}>
                            {c.ok ? <Check size={13} /> : <X size={13} />}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: c.ok ? '#166534' : '#991b1b' }}>{c.label}</span>
                          {!c.ok && (
                            <button type="button" onClick={() => goTo(steps.indexOf(c.step))} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#db142e', fontWeight: 800, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                              {tw('fix')}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )
            })()}

            {!isEdit && step === 'review' && (
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
            {wizard && step === 'review' && Object.keys(liveErrors).length > 0 && (
              <p role="status" style={{ fontSize: 12, color: '#b91c1c', fontWeight: 700, margin: 0 }}>
                {tw('submitDisabled', { reason: Object.values(liveErrors)[0] })}
              </p>
            )}
            {wizard ? (
              <div className="ct-sheet-bar" style={{ display: 'flex', gap: 12, paddingTop: 4, position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 2 }}>
                <button type="button" onClick={() => (stepIdx === 0 ? onClose() : goTo(stepIdx - 1))} style={{ ...btnGhost, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {stepIdx === 0 ? t('cancel') : <><ChevronLeft size={15} className="rtl:rotate-180" /> {tw('back')}</>}
                </button>
                {step !== 'review' ? (
                  <button type="button" onClick={goNext} disabled={catLoading} style={{ ...btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: catLoading ? 0.6 : 1 }}>
                    {tw('next')} <ChevronRight size={15} className="rtl:rotate-180" />
                  </button>
                ) : (
                  <span style={{ flex: 1, display: 'flex' }} title={Object.keys(liveErrors).length ? tw('submitDisabled', { reason: Object.values(liveErrors)[0] }) : undefined}>
                    <button type="submit" disabled={saving || Object.keys(liveErrors).length > 0} style={{ ...btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (saving || Object.keys(liveErrors).length > 0) ? 0.5 : 1, cursor: Object.keys(liveErrors).length ? 'not-allowed' : 'pointer' }}>
                      {saving && <BrandLoader variant="inline" size={14} />}
                      {t('submitForReview')}
                    </button>
                  </span>
                )}
              </div>
            ) : (
            <div className="ct-sheet-bar" style={{ display: 'flex', gap: 12, paddingTop: 4, position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 2 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t('cancel')}</button>
              <button type="submit" disabled={saving || catLoading} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(220,38,38,0.3)', opacity: (saving || catLoading) ? 0.6 : 1, fontFamily: 'inherit' }}>
                {saving && <BrandLoader variant="inline" size={14} />}
                {isEdit ? t('saveChanges') : t('submitForReview')}
              </button>
            </div>
            )}
          </form>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>

      {stockDialog && (
        <WizardDialog icon={<PackageX size={22} />} title={tw('stockZeroTitle')}
          actions={<button type="button" autoFocus onClick={fixStock} style={btnPrimary}>{tw('fixStock')}</button>}>
          {tw('stockZeroText')}
        </WizardDialog>
      )}
      {oosConfirm && (
        <WizardDialog icon={<PackageX size={22} />} title={tw('outOfStockTitle')}
          actions={<>
            <button type="button" onClick={fixStock} style={btnGhost}>{tw('outOfStockCancel')}</button>
            <button type="button" autoFocus onClick={() => { setOosConfirm(false); handleSubmit(undefined, true) }} style={btnPrimary}>{tw('outOfStockConfirm')}</button>
          </>}>
          {tw('outOfStockText')}
        </WizardDialog>
      )}

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