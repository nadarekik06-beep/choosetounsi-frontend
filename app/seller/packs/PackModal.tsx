'use client'

/**
 * "Nouveau pack" / "Modifier le pack" — 3-step wizard (same for create and edit):
 *   1 · Produits  → pick the products (quantity + variants per item)
 *   2 · Détails   → name, descriptions, pack price (live savings), status, image
 *   3 · Aperçu    → the real storefront pack card + summary, then "Créer le pack"
 *
 * Every value lives in this component's state, so moving between steps loses nothing.
 * The payload sent to the API is unchanged (packsApi.create / update).
 * Validation mirrors SellerPackController: name required, price > 0 with ≤ 3 decimals and
 * strictly below Σ(product base price × quantity), at least one item.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Upload, TrendingDown, ChevronDown, Check, X, AlertCircle } from 'lucide-react'
import { packsApi, type PackPayload, type PackItemPayload } from '@/lib/sellerApi'
import CommissionPreview from '@/app/seller/components/CommissionPreview'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { holdLocaleRemount } from '@/lib/i18n/localeRemount'
import WizardShell, { type WizardStep } from '@/app/seller/components/wizard/WizardShell'
import ProductPickStep, { toWizProduct, type WizProduct } from '@/app/seller/components/wizard/ProductPickStep'
import { Field, SectionLabel, Thumb, Notice, focusFirstField, inputStyle, BRAND } from '@/app/seller/components/wizard/fields'
import { PackCard } from '@/app/deals/_components/DealCards'
import type { DealItem } from '@/app/deals/_components/model'
import type { DealsPack } from '@/lib/dealsApi'
import { DiscountBadge } from '@/app/components/promotions/ProductPrice'
import '@/app/shop/_components/shop.css'
import '@/app/deals/_components/deals.css'
import '@/app/components/product/product-card.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackItemRow {
  _key: string
  product: WizProduct
  allowed_variant_ids: number[] | null  // null = all variants
  quantity: number
}

interface PackModalProps {
  pack: any | null
  onClose: () => void
  /** `message` = success text for the page's toast */
  onSaved: (message?: string) => void
}

type StepKey = 'products' | 'details' | 'preview'
const STEP_KEYS: StepKey[] = ['products', 'details', 'preview']

const newKey = () => Math.random().toString(36).slice(2)
const MIN_ITEMS = 1                       // backend: items|array|min:1
const PRICE_FORMAT = /^\d+(\.\d{1,3})?$/  // backend: regex on pack_price
const toM = (n: number) => Math.round(n * 1000)

const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp']

interface ClientPrices {
  pack_price: number; original_price: number; savings: number; discount_percent: number
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function PackModal({ pack, onClose, onSaved }: PackModalProps) {
  const isEdit = !!pack
  const t   = useTranslations('seller.packForm')
  const tw  = useTranslations('seller.wizard')
  const { price: fmtPrice, currency } = useFormat()
  const fmt = (n: number) => fmtPrice(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  // A language switch must not wipe a half-filled wizard
  useEffect(() => holdLocaleRemount(), [])

  const [stepIdx, setStepIdx] = useState(0)
  const [maxStep, setMaxStep] = useState(isEdit ? 2 : 0)
  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Form state (all steps; nothing is reset when moving between them) ──────
  const [name,             setName]             = useState<string>(pack?.name              ?? '')
  const [description,      setDescription]      = useState<string>(pack?.description       ?? '')
  const [shortDescription, setShortDescription] = useState<string>(pack?.short_description ?? '')
  const [packPrice,        setPackPrice]        = useState<string>(pack?.pack_price != null ? String(pack.pack_price) : '')
  const [isActive,         setIsActive]         = useState<boolean>(pack?.is_active ?? true)
  const [touched,          setTouched]          = useState<Record<string, boolean>>({})

  const [imagePreview, setImagePreview] = useState<string | null>(pack?.image_url ?? null)
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imageError,   setImageError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<PackItemRow[]>(() =>
    (pack?.items ?? [])
      .filter((item: any) => item.product)
      .map((item: any): PackItemRow => ({
        _key: newKey(),
        product: {
          id: item.product.id, name: item.product.name, price: Number(item.product.price) || 0,
          stock: null, primary_image_url: item.product.primary_image_url ?? null,
          is_active: true, is_approved: true,
          has_variants: item.product.has_variants ?? (item.available_variants?.length > 0),
          variants: (item.available_variants ?? []).map((v: any) => ({
            id: v.id, label: v.label ?? '', stock: v.stock ?? 0,
            price_override: v.price_override != null ? Number(v.price_override) : null, is_active: true,
          })),
        },
        allowed_variant_ids: item.allowed_variant_ids ?? null,
        quantity: item.quantity ?? 1,
      }))
  )

  // Seller's products (inactive ones included, flagged → greyed out in step 1)
  const [allProducts, setAllProducts] = useState<WizProduct[]>([])
  const [prodLoading, setProdLoading] = useState(true)

  const [saving,      setSaving]      = useState(false)
  const [apiError,    setApiError]    = useState('')
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    packsApi.getAllSellerProducts()
      .then(res => {
        if (cancelled) return
        const list: WizProduct[] = (res.data ?? []).map(toWizProduct)
        setAllProducts(list)
        // Edit: swap the pack's stored item data for fresh product data (all variants, stock, status)
        const byId = new Map(list.map(p => [p.id, p]))
        setItems(prev => prev.map(r => byId.has(r.product.id) ? { ...r, product: byId.get(r.product.id)! } : r))
      })
      .catch(() => { if (!cancelled) setAllProducts([]) })
      .finally(() => { if (!cancelled) setProdLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Pricing (mirrors the backend: base product price × quantity) ───────────
  const itemsTotal   = items.reduce((s, r) => s + r.product.price * r.quantity, 0)
  const packPriceNum = parseFloat(packPrice)
  const priceValid   = Number.isFinite(packPriceNum) && packPriceNum > 0
  const savings      = Math.max(0, itemsTotal - (priceValid ? packPriceNum : 0))
  const savingsPct   = itemsTotal > 0 ? Math.round((savings / itemsTotal) * 100) : 0
  const priceTooHigh = priceValid && itemsTotal > 0 && toM(packPriceNum) >= toM(itemsTotal)

  // ── Per-step validation (live) ─────────────────────────────────────────────
  const itemsError = items.length < MIN_ITEMS ? t('errors.items') : null

  const nameError  = !name.trim() ? t('errors.required') : null
  const priceError = !packPrice.trim() || !priceValid ? t('errors.price')
    : !PRICE_FORMAT.test(packPrice.trim()) ? t('errors.priceFormat')
    : priceTooHigh ? t('priceTooHigh', { total: fmt(itemsTotal) })
    : null

  const detailsErrors: Record<string, string | null> = { name: nameError, pack_price: priceError }
  const detailsValid = !nameError && !priceError
  const detailsHint = nameError ?? priceError

  const valid = [!itemsError, detailsValid, !itemsError && detailsValid]
  const showErr = (k: string) => (touched[k] || (k === 'pack_price' && packPrice !== '') ? detailsErrors[k] : null) ?? serverErrors[k] ?? null

  // ── Step navigation ────────────────────────────────────────────────────────
  const goTo = useCallback((i: number) => {
    const target = Math.max(0, Math.min(i, STEP_KEYS.length - 1))
    setStepIdx(target)
    setMaxStep(m => Math.max(m, target))
  }, [])

  const canNext = valid[stepIdx]
  const nextHint = stepIdx === 0 ? itemsError : stepIdx === 1 ? detailsHint : null

  // ── Items ──────────────────────────────────────────────────────────────────
  const selectedIds = useMemo(() => items.map(r => r.product.id), [items])

  const toggleProduct = (p: WizProduct, select: boolean) => {
    setItems(prev => select
      ? (prev.some(r => r.product.id === p.id) ? prev : [...prev, { _key: newKey(), product: p, allowed_variant_ids: null, quantity: 1 }])
      : prev.filter(r => r.product.id !== p.id))
    setServerErrors(e => ({ ...e, items: '', product_ids: '' }))
  }
  const updateItem = (key: string, patch: Partial<PackItemRow>) =>
    setItems(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r))

  // ── Step 3: the pack as buyers will see it ─────────────────────────────────
  const [client, setClient] = useState<ClientPrices | null>(null)
  const [clientState, setClientState] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [previewTick, setPreviewTick] = useState(0)
  const itemsKey = items.map(r => `${r.product.id}x${r.quantity}`).join(',')

  useEffect(() => {
    if (stepIdx !== 2 || !detailsValid || itemsError) return
    let cancelled = false
    setClientState('loading')
    packsApi.preview(packPriceNum, items.map(r => ({ product_id: r.product.id, quantity: r.quantity })))
      .then(res => { if (!cancelled) { setClient(res.data ?? null); setClientState(res.data ? 'idle' : 'failed') } })
      .catch(() => { if (!cancelled) { setClient(null); setClientState('failed') } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, itemsKey, packPriceNum, previewTick])

  const previewItem: DealItem | null = useMemo(() => {
    if (!client) return null
    const dealsPack: DealsPack = {
      id: 0, name: name.trim(), slug: 'preview', short_description: shortDescription.trim() || null,
      image_url: imagePreview, pack_price: client.pack_price, original_price: client.original_price,
      savings: client.savings, discount_percent: client.discount_percent, items_count: items.length,
      available_stock: 0, category_id: null, created_at: null, seller: null,
      items: items.map((r, i) => ({ id: i, quantity: r.quantity, product: { name: r.product.name, primary_image_url: r.product.primary_image_url } })),
    }
    return {
      key: 'preview', offers: ['pack'], price: client.pack_price, original: client.original_price,
      percent: client.discount_percent, bestPercent: client.discount_percent, endsAt: null,
      categoryId: null, categoryName: null, created: 0, views: 0, pack: dealsPack,
    }
  }, [client, name, shortDescription, imagePreview, items])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const stepOfError = (key: string): number =>
    key === 'items' || key.startsWith('items.') || key === 'product_ids' ? 0 : 1

  const submit = async () => {
    if (saving || !detailsValid || itemsError) return
    setSaving(true); setApiError(''); setServerErrors({})

    const itemPayload: PackItemPayload[] = items.map(r => ({
      product_id: r.product.id, allowed_variant_ids: r.allowed_variant_ids ?? null, quantity: r.quantity,
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
      if (isEdit) await packsApi.update(pack.id, payload)
      else await packsApi.create(payload)
      onSaved(isEdit ? t('updatedToast') : t('createdToast'))
      onClose()
    } catch (err: any) {
      const data = err?.response?.data ?? {}
      const fields: Record<string, string> = {}
      for (const [k, msgs] of Object.entries((data.errors ?? {}) as Record<string, string[] | string>)) {
        fields[k] = Array.isArray(msgs) ? msgs[0] : String(msgs)
      }
      setServerErrors(fields)
      setApiError(data?.message ?? t('errors.saveFailed'))
      // Jump to the step that holds the faulty field, and highlight it
      const keys = Object.keys(fields)
      const target = keys.length ? Math.min(...keys.map(stepOfError)) : (err?.response?.status === 403 ? 0 : 1)
      goTo(target)
      setTimeout(() => focusFirstField(bodyRef.current, keys.length ? keys : ['products']), 80)
    } finally {
      setSaving(false)
    }
  }

  const onNext = () => {
    if (!canNext) return
    if (stepIdx === STEP_KEYS.length - 1) { void submit(); return }
    setApiError('')
    goTo(stepIdx + 1)
  }

  const steps: WizardStep[] = STEP_KEYS.map((k, i) => ({
    key: k, label: tw(`steps.${k}`),
    error: i !== stepIdx && i <= maxStep && (
      (k === 'products' && !!(serverErrors.items || serverErrors.product_ids)) ||
      (k === 'details' && !!(serverErrors.name || serverErrors.pack_price))
    ),
  }))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <WizardShell
      titleId="pack-modal-title"
      title={isEdit ? t('editTitle') : t('createTitle')}
      subtitle={isEdit ? t('editSubtitle') : t('createSubtitle')}
      steps={steps} stepIdx={stepIdx} maxStep={maxStep} onStep={goTo} onClose={onClose}
      apiError={apiError} canNext={canNext} nextHint={nextHint}
      onBack={() => { setApiError(''); goTo(stepIdx - 1) }} onNext={onNext}
      nextLabel={stepIdx === 2 ? (isEdit ? t('save') : t('create')) : tw('next')}
      saving={saving} bodyRef={bodyRef}
    >
      {/* ═══ Step 1 · Produits ═══ */}
      {stepIdx === 0 && (
        <ProductPickStep
          products={allProducts} loading={prodLoading}
          selectedIds={selectedIds} selectedCount={items.length}
          onToggle={toggleProduct}
          error={serverErrors.items || serverErrors.product_ids || (items.length === 0 && maxStep > 0 ? itemsError : null)}
          intro={<p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{t('pickIntro')}</p>}
          selectedSlot={items.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(row => (
                <SelectedRow key={row._key} row={row}
                  onChangeAllowedVariants={ids => updateItem(row._key, { allowed_variant_ids: ids })}
                  onChangeQty={qty => updateItem(row._key, { quantity: qty })}
                  onRemove={() => toggleProduct(row.product, false)} />
              ))}
            </ul>
          )}
        />
      )}

      {/* ═══ Step 2 · Détails ═══ */}
      {stepIdx === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionLabel>{t('info')}</SectionLabel>

          <Field label={t('name')} required error={showErr('name')} htmlFor="pack-name" field="name">
            <input id="pack-name" className="wz-input" style={inputStyle(!!showErr('name'))} value={name}
              onChange={e => { setName(e.target.value); setServerErrors(s => ({ ...s, name: '' })) }}
              onBlur={() => setTouched(x => ({ ...x, name: true }))}
              maxLength={255} placeholder={t('namePlaceholder')} />
          </Field>

          <Field label={t('shortDescription')} htmlFor="pack-short-description">
            <input id="pack-short-description" className="wz-input" value={shortDescription}
              onChange={e => setShortDescription(e.target.value)} maxLength={500}
              placeholder={t('shortDescriptionPlaceholder')} />
          </Field>

          <Field label={t('description')} htmlFor="pack-description">
            <textarea id="pack-description" className="wz-input" rows={3} value={description}
              onChange={e => setDescription(e.target.value)} placeholder={t('descriptionPlaceholder')}
              style={{ resize: 'none' }} />
          </Field>

          {/* Price + live total of the selected items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label={t('price', { currency })} required error={showErr('pack_price')} htmlFor="pack-price" field="pack_price">
              <div style={{ position: 'relative' }}>
                <input id="pack-price" className="wz-input" type="number" inputMode="decimal" min="0" step="0.001"
                  style={{ ...inputStyle(showErr('pack_price') ? true : undefined), paddingInlineEnd: 56 }}
                  value={packPrice}
                  onChange={e => { setPackPrice(e.target.value); setServerErrors(s => ({ ...s, pack_price: '' })) }}
                  onBlur={() => setTouched(x => ({ ...x, pack_price: true }))}
                  placeholder="0.000" />
                <span style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#5b6472', fontWeight: 700 }}>{currency}</span>
              </div>
            </Field>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 12,
              background: '#f8fafc', border: '1px solid #e5e7eb',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                {t('normalPrice', { total: fmt(itemsTotal) })}
              </span>
              {priceValid && (
                <span style={{ fontSize: 15, fontWeight: 900, color: priceTooHigh ? '#92400e' : '#0f172a' }}>
                  {t('packPriceLine', { price: fmt(packPriceNum) })}
                </span>
              )}
              {priceValid && !priceTooHigh && itemsTotal > 0 && (
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendingDown size={14} aria-hidden /> {t('savingsLine', { amount: fmt(savings), pct: savingsPct })}
                </span>
              )}
            </div>
          </div>

          <Field label={t('status')} htmlFor="pack-status">
            <select id="pack-status" className="wz-input" value={isActive ? 'active' : 'inactive'}
              onChange={e => setIsActive(e.target.value === 'active')}>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </Field>

          {/* Commission is calculated on the WHOLE pack_price as one unit (same as ProductModal) */}
          <CommissionPreviewBlock price={priceValid && !priceTooHigh ? packPrice : ''} />

          <SectionLabel>{t('image')}</SectionLabel>
          <div data-field="image">
            <div role="button" tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
              style={{
                border: '2px dashed #e5e7eb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: imagePreview ? '#f5f5f5' : '#f8fafc', position: 'relative',
              }}>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" style={{ width: '100%', height: 180, objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <Upload size={26} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: '#64748b', fontWeight: 700, margin: '0 0 3px' }}>{t('uploadImage')}</p>
                  <p style={{ fontSize: 11, color: '#5b6472', margin: 0 }}>JPG, PNG, WebP</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  if (!ACCEPTED_IMAGES.includes(file.type)) { setImageError(t('errors.imageType')); return }
                  setImageError('')
                  if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
                  setImageFile(file)
                  setImagePreview(URL.createObjectURL(file))
                }} />
            </div>
            {imageError && <p role="alert" style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: '6px 0 0' }}>{imageError}</p>}
            {serverErrors.image && <p role="alert" style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, margin: '6px 0 0' }}>{serverErrors.image}</p>}
          </div>
        </div>
      )}

      {/* ═══ Step 3 · Aperçu ═══ */}
      {stepIdx === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionLabel>{tw('previewLabel')}</SectionLabel>
            <p style={{ fontSize: 12.5, color: '#5b6472', margin: '8px 0 0' }}>{tw('previewHint')}</p>
          </div>

          {clientState === 'loading' && !previewItem && (
            <p role="status" style={{ fontSize: 13, color: '#5b6472', margin: 0 }}>{tw('loading')}</p>
          )}
          {clientState === 'failed' && (
            <Notice tone="warn" icon={<AlertCircle size={16} style={{ flexShrink: 0 }} />}>
              <span>{t('previewFailed')}</span>{' '}
              <button type="button" onClick={() => setPreviewTick(n => n + 1)} style={{
                background: 'none', border: 'none', color: BRAND, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 12.5,
              }}>{tw('retry')}</button>
            </Notice>
          )}

          {previewItem && (
            // The real /deals pack card. inert: it is a preview, nothing in it is clickable.
            <div className="sp dl" style={{ background: 'transparent', maxWidth: 300, width: '100%', alignSelf: 'center', pointerEvents: 'none' }}
              inert>
              <PackCard item={previewItem} index={0} />
            </div>
          )}

          {/* Contents + prices (the seller's own figures) */}
          <SectionLabel>{t('summary')}</SectionLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(r => (
              <li key={r._key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 12 }}>
                <Thumb src={r.product.primary_image_url} size={44} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere' }}>{r.product.name}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: BRAND, flexShrink: 0 }} dir="ltr">× {r.quantity}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <SummaryLine label={t('normalPriceLabel')} value={fmt(itemsTotal)} />
            <SummaryLine label={t('packPriceLabel')} value={fmt(packPriceNum || 0)} strong />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#047857' }}>{t('savingsLine', { amount: fmt(savings), pct: savingsPct })}</span>
              {client && client.discount_percent > 0 && <DiscountBadge percent={client.discount_percent} size="sm" />}
            </div>
            <SummaryLine label={t('status')} value={isActive ? t('active') : t('inactive')} />
            <SummaryLine label={tw('summaryProducts')} value={String(items.length)} />
          </div>
        </div>
      )}
    </WizardShell>
  )
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: strong ? 15 : 13 }}>
      <span style={{ color: '#5b6472', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: strong ? 900 : 700, textAlign: 'end' }}>{value}</span>
    </div>
  )
}

function CommissionPreviewBlock({ price }: { price: string }) {
  const tc = useTranslations('seller.commission')
  return <CommissionPreview price={price} label={tc('perPack')} priceLabel={tc('packPrice')} />
}

function SelectedRow({ row, onChangeAllowedVariants, onChangeQty, onRemove }: {
  row: PackItemRow
  onChangeAllowedVariants: (ids: number[] | null) => void
  onChangeQty: (q: number) => void
  onRemove: () => void
}) {
  const t   = useTranslations('seller.packForm')
  const { price: fmtPrice } = useFormat()
  const fmt = (n: number) => fmtPrice(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const [showVariants, setShowVariants] = useState(false)
  const { product } = row
  const hasVariants   = product.has_variants && product.variants.length > 0
  const totalVariants = product.variants.length
  const checkedIds    = row.allowed_variant_ids
  const checkedCount  = checkedIds === null ? totalVariants : checkedIds.length
  const isChecked = (vid: number) => checkedIds === null || checkedIds.includes(vid)

  // Same variant logic as before: null = every variant, never an empty selection
  const toggleVariant = (vid: number) => {
    const allIds = product.variants.map(v => v.id)
    if (checkedIds === null) {
      const next = allIds.filter(id => id !== vid)
      onChangeAllowedVariants(next.length === 0 ? [vid] : next)
    } else {
      const next = checkedIds.includes(vid) ? checkedIds.filter(id => id !== vid) : [...checkedIds, vid]
      if (next.length === 0) return
      onChangeAllowedVariants(next.length === allIds.length ? null : next)
    }
  }

  return (
    <li style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 12px', flexWrap: 'wrap' }}>
        <Thumb src={product.primary_image_url} size={48} />
        <div style={{ flex: '1 1 130px', minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.3, overflowWrap: 'anywhere',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{product.name}</p>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>{t('unitPrice', { price: fmt(product.price) })}</p>
          {hasVariants && (
            <button type="button" onClick={() => setShowVariants(s => !s)} aria-expanded={showVariants} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, minHeight: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, fontFamily: 'inherit', color: checkedCount === totalVariants ? '#198f41' : '#92400e',
            }}>
              {t('variantsRatio', { checked: checkedCount, total: totalVariants })}
              <ChevronDown size={14} style={{ transform: showVariants ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </div>

        <div role="group" aria-label={t('quantity')} style={{
          display: 'flex', alignItems: 'center', flexShrink: 0, border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
        }}>
          <button type="button" onClick={() => onChangeQty(Math.max(1, row.quantity - 1))} disabled={row.quantity <= 1}
            aria-label={t('decrease')} style={stepBtn(row.quantity <= 1)}>−</button>
          <span aria-live="polite" style={{ minWidth: 30, textAlign: 'center', fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{row.quantity}</span>
          <button type="button" onClick={() => onChangeQty(row.quantity + 1)} aria-label={t('increase')} style={stepBtn(false)}>+</button>
        </div>

        <button type="button" onClick={onRemove} aria-label={t('removeItem')} style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0, border: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.06)', cursor: 'pointer', color: '#b91c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={16} /></button>
      </div>

      {hasVariants && showVariants && (
        <div style={{ padding: '0 12px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
            {t('variantsChoice')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))', gap: 6 }}>
            {product.variants.map(v => {
              const checked = isChecked(v.id)
              const outOfStock = v.stock === 0
              return (
                <button key={v.id} type="button" onClick={() => toggleVariant(v.id)} aria-pressed={checked} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 44, padding: '7px 10px', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit',
                  border: `1.5px solid ${checked ? (outOfStock ? 'rgba(239,68,68,0.5)' : '#dc2626') : '#e5e7eb'}`,
                  background: checked ? (outOfStock ? 'rgba(239,68,68,0.05)' : 'rgba(220,38,38,0.05)') : '#f8fafc',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: checked ? (outOfStock ? '#b91c1c' : '#dc2626') : '#374151', display: 'flex', alignItems: 'center', gap: 4, overflowWrap: 'anywhere' }}>
                    {checked && <Check size={11} />}{v.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: outOfStock ? '#b91c1c' : '#5b6472' }}>
                    {outOfStock ? t('outOfStock') : t('inStock', { count: v.stock })}
                  </span>
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: '#5b6472', margin: '6px 0 0', fontStyle: 'italic' }}>
            {checkedIds === null ? t('allIncluded', { count: totalVariants }) : t('someAvailable', { checked: checkedCount, total: totalVariants })}
          </p>
        </div>
      )}
    </li>
  )
}

const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 44, height: 44, border: 'none', background: '#f8fafc',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 20, fontWeight: 700,
  color: disabled ? '#cbd5e1' : '#374151', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
