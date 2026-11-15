'use client'

/**
 * "Nouvelle promotion" / "Modifier la promotion" — 3-step wizard (same for create and edit):
 *   1 · Produits  → pick the products first (search + big tap targets, overlap warnings)
 *   2 · Détails   → name, type (Vente flash / Remise), value, dates, flash stock, live prices
 *   3 · Aperçu    → the REAL storefront product cards (badge, old / new price, flash countdown)
 *                   + summary, then "Créer la promotion"
 *
 * All values live in this component's state, so moving between steps loses nothing.
 * The payload (PromotionPayload) is unchanged. Validation mirrors SellerPromotionController /
 * PromotionService: flash ≤ 90 % · 60–4320 min, remise ≤ 70 % · 1–90 days (in whole minutes, like
 * the backend), value > 0, end after start, start not in the past, final price > 0,
 * one promotion per product at a time.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Zap, Tag, AlertCircle, Clock } from 'lucide-react'
import { sellerPromotionsApi, type Promotion, type PromotionPayload } from '@/lib/promotionsApi'
import { packsApi } from '@/lib/sellerApi'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { holdLocaleRemount } from '@/lib/i18n/localeRemount'
import { API_BASE } from '@/lib/constants'
import WizardShell, { type WizardStep } from '@/app/seller/components/wizard/WizardShell'
import ProductPickStep, { ProductChip, toWizProduct, unavailableReason, type WizProduct } from '@/app/seller/components/wizard/ProductPickStep'
import { Field, SectionLabel, Thumb, Notice, focusFirstField, inputStyle, BRAND } from '@/app/seller/components/wizard/fields'
import PromotionCommissionPreview, { computeEffectivePrice, type ServerPrice } from './PromotionCommissionPreview'
import ProductCard from '@/app/components/product/ProductCard'
import type { CardProduct } from '@/app/components/product/cardData'
import { DiscountBadge } from '@/app/components/promotions/ProductPrice'
import '@/app/shop/_components/shop.css'
import '@/app/components/product/product-card.css'

export type { ServerPrice }

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Opened pre-filled: from the product form after a seller tried to lower a price,
 * or from a Growth Radar card (type, products, dates, growthCardId).
 */
export interface PromotionPrefill {
  productId: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
  /** Price the seller wanted customers to pay (base-price drops only) */
  target?: number
  type?: 'flash_sale' | 'discount'
  productIds?: number[]
  /** datetime-local values (YYYY-MM-DDTHH:mm) */
  startsAt?: string
  endsAt?: string
  /** Growth Radar card this promotion answers — sent so the result can be measured */
  growthCardId?: number
  /** Analyse des visiteurs action (product + problem it fixes) — same purpose */
  insight?: { productId: number; problem: string | null; stage: string | null } | null
}

interface PromotionModalProps {
  promotion: Promotion | null
  prefill?: PromotionPrefill | null
  onClose: () => void
  /** `message` = success text for the page's toast */
  onSaved: (message?: string) => void
}

type StepKey = 'products' | 'details' | 'preview'
const STEP_KEYS: StepKey[] = ['products', 'details', 'preview']

interface Conflict {
  product_id: number
  promotion: { id: number; name: string; type: string; source: string; status: string; starts_at: string | null; ends_at: string | null }
}

// Backend rules (PromotionService::validate / SellerPromotionController)
const MAX_PERCENT = { flash_sale: 90, discount: 70 } as const
const START_GRACE_MS = 10 * 60 * 1000           // a start typed ≤ 10 min ago still counts as "now"
const MAX_CARDS_IN_PREVIEW = 6

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** ISO → datetime-local value, as Tunis wall-clock time whatever the device timezone (AUDIT L-3). */
function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find(x => x.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** datetime-local value (Tunis time) → ISO with Tunis's offset (UTC+1, no DST). */
function toISOFromInput(local: string): string {
  return `${local.length === 16 ? `${local}:00` : local}+01:00`
}

/** Tunis wall-clock "now + offset" as a datetime-local value */
const tunisInput = (offsetMs = 0) => toLocalDateTimeInput(new Date(Date.now() + offsetMs).toISOString())

const DAY = 86400000

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? null
}

/** Exact checkout pricing for these products with this discount (POST /seller/promotions/preview). */
async function fetchServerPrices(ids: number[], discountType: 'percentage' | 'fixed', discountValue: number): Promise<Record<number, ServerPrice>> {
  if (!ids.length || !(discountValue > 0)) return {}
  const token = getToken()
  try {
    const res = await fetch(`${API_BASE}/seller/promotions/preview`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ product_ids: ids.slice(0, 100), discount_type: discountType, discount_value: discountValue }),
    })
    const json = await res.json()
    const out: Record<number, ServerPrice> = {}
    for (const row of (json?.data ?? []) as Array<{
      product_id: number; original_price: number; final_price: number; valid: boolean; discount_percent?: number
      client_original_price?: number; client_final_price?: number; client_percent?: number
    }>) {
      out[row.product_id] = {
        original: row.original_price, final: row.final_price, valid: row.valid, percent: row.discount_percent,
        clientOriginal: row.client_original_price, clientFinal: row.client_final_price, clientPercent: row.client_percent,
      }
    }
    return out
  } catch {
    return {}
  }
}

// ─── Wizard ────────────────────────────────────────────────────────────────────

export default function PromotionModal({ promotion, prefill, onClose, onSaved }: PromotionModalProps) {
  const isEdit = !!promotion
  const t  = useTranslations('seller.promotionForm')
  const tw = useTranslations('seller.wizard')
  const { price, currency, locale, number } = useFormat()
  const dt = (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Tunis', dateStyle: 'medium', timeStyle: 'short' }), [locale])
  const fmtLocal = (local: string) => dateFmt.format(new Date(toISOFromInput(local)))
  const fmtIso   = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '')

  // A language switch must not wipe a half-filled wizard
  useEffect(() => holdLocaleRemount(), [])

  const [stepIdx, setStepIdx] = useState(0)
  const [maxStep, setMaxStep] = useState(isEdit ? 2 : 0)
  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Form state (all steps; nothing is reset when moving between them) ──────
  const [name,          setName]          = useState(promotion?.name ?? '')
  const [type,          setType]          = useState<'flash_sale' | 'discount'>(promotion?.type ?? prefill?.type ?? (prefill ? 'discount' : 'flash_sale'))
  const [discountType,  setDiscountType]  = useState<'percentage' | 'fixed'>(promotion?.discount_type ?? prefill?.discountType ?? 'percentage')
  const [discountValue, setDiscountValue] = useState(promotion?.discount_value?.toString() ?? prefill?.discountValue?.toString() ?? '')
  const [startsAt,      setStartsAt]      = useState(promotion ? toLocalDateTimeInput(promotion.starts_at) : prefill ? (prefill.startsAt ?? tunisInput()) : '')
  const [endsAt,        setEndsAt]        = useState(promotion ? toLocalDateTimeInput(promotion.ends_at) : prefill ? (prefill.endsAt ?? tunisInput(14 * DAY)) : '')
  const [flashStock,    setFlashStock]    = useState(promotion?.flash_stock?.toString() ?? '')
  // Units one customer may buy at the flash price (AUDIT L-4), default 2
  const [perCustomer,   setPerCustomer]   = useState((promotion as { per_customer_limit?: number | null } | null)?.per_customer_limit?.toString() ?? '2')
  const [selectedIds,   setSelectedIds]   = useState<number[]>(
    promotion?.products?.map(p => p.id) ?? (prefill ? (prefill.productIds ?? [prefill.productId]) : [])
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Seller's products (inactive / pending ones included, flagged → greyed out)
  const [products,    setProducts]    = useState<WizProduct[]>([])
  const [prodLoading, setProdLoading] = useState(true)

  const [saving,       setSaving]       = useState(false)
  const [apiError,     setApiError]     = useState('')
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  // ── Load seller products (fresh each time; reloaded when the tab regains focus) ──
  const loadProducts = useCallback(async () => {
    try {
      const res = await packsApi.getAllSellerProducts()
      setProducts((res.data ?? []).map(toWizProduct))
    } catch {
      setProducts(prev => prev)
    } finally {
      setProdLoading(false)
    }
  }, [])
  useEffect(() => { void loadProducts() }, [loadProducts])

  const [refreshTick, setRefreshTick] = useState(0)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      void loadProducts()
      setRefreshTick(n => n + 1)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [loadProducts])

  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  // Edit keeps the promotion's own product data until the fresh list arrives
  const selected: WizProduct[] = useMemo(() => selectedIds.map(id => byId.get(id) ?? (() => {
    const fromPromo = promotion?.products?.find(p => p.id === id)
    return fromPromo
      ? { id, name: fromPromo.name, price: Number(fromPromo.price) || 0, stock: null, primary_image_url: fromPromo.primary_image_url,
          is_active: true, is_approved: true, has_variants: false, variants: [] } as WizProduct
      : null
  })()).filter((p): p is WizProduct => !!p), [selectedIds, byId, promotion])

  // Name the prefilled discount after its product
  const prefillProduct = prefill ? byId.get(prefill.productId) : undefined
  useEffect(() => {
    if (prefillProduct && !name) setName(prefillProduct.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillProduct?.id])

  // ── Derived ────────────────────────────────────────────────────────────────
  const maxPct = MAX_PERCENT[type]
  const valueNum = parseFloat(discountValue)
  const startIso = startsAt ? toISOFromInput(startsAt) : ''
  const endIso   = endsAt ? toISOFromInput(endsAt) : ''
  const startMs  = startsAt ? new Date(startIso).getTime() : NaN
  const endMs    = endsAt ? new Date(endIso).getTime() : NaN
  const datesOk  = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
  const minutes  = datesOk ? Math.floor((endMs - startMs) / 60000) : 0   // whole minutes, same as the backend

  const durationLabel = (ms: number) => {
    const totalMin = Math.round(ms / 60000)
    const d = Math.floor(totalMin / 1440), h = Math.floor((totalMin % 1440) / 60), m = totalMin % 60
    return [d && t('dur.days', { count: d }), h && t('dur.hours', { count: h }), m && t('dur.minutes', { count: m })].filter(Boolean).join(' ') || t('dur.minutes', { count: 0 })
  }

  // ── One promotion per product (read-only check) ────────────────────────────
  // Step 1: against the next 90 days (dates aren't known yet) — a heads-up only.
  // Steps 2–3: against the chosen dates — blocking, like the backend.
  const [infoConflicts, setInfoConflicts] = useState<Conflict[]>([])
  const [dateConflicts, setDateConflicts] = useState<Conflict[]>([])
  const availableKey = products.filter(p => !unavailableReason(p)).slice(0, 500).map(p => p.id).join(',')

  useEffect(() => {
    if (!availableKey) { setInfoConflicts([]); return }
    let cancelled = false
    sellerPromotionsApi.conflicts({
      product_ids: availableKey.split(',').map(Number),
      starts_at: toISOFromInput(tunisInput()), ends_at: toISOFromInput(tunisInput(90 * DAY)),
      ignore_id: promotion?.id ?? null,
    }).then(res => { if (!cancelled) setInfoConflicts(res.data ?? []) }).catch(() => { if (!cancelled) setInfoConflicts([]) })
    return () => { cancelled = true }
  }, [availableKey, promotion?.id, refreshTick])

  const selectedKey = selectedIds.join(',')
  useEffect(() => {
    if (!selectedKey || !datesOk) { setDateConflicts([]); return }
    let cancelled = false
    const timer = setTimeout(() => {
      sellerPromotionsApi.conflicts({ product_ids: selectedKey.split(',').map(Number), starts_at: startIso, ends_at: endIso, ignore_id: promotion?.id ?? null })
        .then(res => { if (!cancelled) setDateConflicts(res.data ?? []) }).catch(() => { if (!cancelled) setDateConflicts([]) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedKey, datesOk, startIso, endIso, promotion?.id, refreshTick])

  // ── Final prices from the server for the selected products (debounced) ─────
  const [serverPrices, setServerPrices] = useState<Record<number, ServerPrice>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const previewSeq = useRef(0)
  useEffect(() => {
    const seq = ++previewSeq.current
    if (!selectedKey || !(valueNum > 0)) { setServerPrices({}); setPricesLoading(false); return }
    setPricesLoading(true)
    const timer = setTimeout(() => {
      fetchServerPrices(selectedKey.split(',').map(Number), discountType, valueNum).then(prices => {
        if (seq === previewSeq.current) { setServerPrices(prices); setPricesLoading(false) }
      })
    }, 350)
    return () => clearTimeout(timer)
  }, [selectedKey, discountType, valueNum, refreshTick])

  // ── Validation (live, mirrors the backend) ─────────────────────────────────
  const unavailableSelected = selected.filter(p => { const r = unavailableReason(p); return r === 'inactive' || r === 'pending' })

  const productsError = selectedIds.length === 0 ? t('errors.products')
    : unavailableSelected.length ? t('errors.unavailableSelected', { names: unavailableSelected.map(p => p.name).join(', ') })
    : null

  const nameError = !name.trim() ? t('errors.required') : null

  const tooHigh = discountType === 'fixed' ? selected.find(p => valueNum >= p.price) : undefined
  const valueError = !discountValue.trim() || !(valueNum > 0) ? t('errors.positive')
    : discountType === 'percentage' && valueNum > maxPct ? (type === 'flash_sale' ? t('errors.maxFlash', { max: maxPct }) : t('errors.maxDiscount', { max: maxPct }))
    : tooHigh ? t('errors.fixedTooHigh', { name: tooHigh.name })
    : null

  const startError = !startsAt ? t('errors.required')
    : !isEdit && startMs < Date.now() - START_GRACE_MS ? t('errors.startPast')
    : null
  const endError = !endsAt ? t('errors.required')
    : !startsAt ? null
    : !datesOk ? t('errors.endAfterStart')
    : type === 'flash_sale'
      ? (minutes < 60 ? t('errors.flashMin') : minutes > 72 * 60 ? t('errors.flashMax') : null)
      : (minutes < 1440 ? t('errors.discountMin') : minutes > 90 * 1440 ? t('errors.discountMax') : null)

  const stockError = type === 'flash_sale' && flashStock.trim() !== '' && !(Number.isInteger(Number(flashStock)) && Number(flashStock) >= 1) ? t('errors.flashStock') : null
  const perCustomerError = type === 'flash_sale' && !(Number.isInteger(Number(perCustomer)) && Number(perCustomer) >= 1 && Number(perCustomer) <= 100) ? t('errors.perCustomer') : null

  const conflictOf = (id: number) => (dateConflicts.find(c => c.product_id === id) ?? null)
  const conflictError = dateConflicts.length > 0 && datesOk && !endError
    ? (() => {
        const c = dateConflicts[0]
        return t('errors.conflict', {
          name: byId.get(c.product_id)?.name ?? '', promo: c.promotion.name,
          from: fmtIso(c.promotion.starts_at), to: fmtIso(c.promotion.ends_at),
        })
      })()
    : null

  const detailsErrors = { name: nameError, discount_value: valueError, starts_at: startError, ends_at: endError ?? conflictError, flash_stock: stockError, per_customer_limit: perCustomerError }
  const detailsValid = Object.values(detailsErrors).every(e => !e)
  const detailsHint = Object.values(detailsErrors).find(Boolean) ?? null

  const valid = [!productsError, detailsValid, !productsError && detailsValid]
  const shown = (k: keyof typeof detailsErrors, always = false) =>
    serverErrors[k] || ((touched[k] || always) ? detailsErrors[k] : null) || null

  // ── Step navigation ────────────────────────────────────────────────────────
  const goTo = useCallback((i: number) => {
    const target = Math.max(0, Math.min(i, STEP_KEYS.length - 1))
    setStepIdx(target)
    setMaxStep(m => Math.max(m, target))
  }, [])
  const canNext = valid[stepIdx]
  const nextHint = stepIdx === 0 ? productsError : stepIdx === 1 ? detailsHint : null

  const toggleProduct = (p: WizProduct, select: boolean) => {
    setSelectedIds(prev => select ? (prev.includes(p.id) ? prev : [...prev, p.id]) : prev.filter(x => x !== p.id))
    setServerErrors(e => ({ ...e, products: '', product_ids: '' }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (saving || !valid[2]) return
    setSaving(true); setApiError(''); setServerErrors({})

    const payload: PromotionPayload = {
      name,
      type,
      discount_type:  discountType,
      discount_value: valueNum,
      starts_at:      toISOFromInput(startsAt),
      ends_at:        toISOFromInput(endsAt),
      product_ids:    selectedIds,
      ...(!isEdit && prefill?.growthCardId ? { growth_card_id: prefill.growthCardId } : {}),
      ...(!isEdit && prefill?.insight ? { insight_product: prefill.insight.productId, insight_problem: prefill.insight.problem, insight_stage: prefill.insight.stage } : {}),
      ...(type === 'flash_sale' && flashStock ? { flash_stock: parseInt(flashStock) } : {}),
      ...(type === 'flash_sale' ? { per_customer_limit: Math.max(1, parseInt(perCustomer) || 2) } : {}),
    } as PromotionPayload

    try {
      if (isEdit) await sellerPromotionsApi.update(promotion!.id, payload)
      else await sellerPromotionsApi.create(payload)
      onSaved(isEdit ? t('updatedToast') : t('createdToast'))
      onClose()
    } catch (err: any) {
      const data = err?.response?.data ?? err?.response ?? {}
      const fields: Record<string, string> = {}
      let general = ''
      for (const [key, msgs] of Object.entries((data.errors ?? {}) as Record<string, string[] | string>)) {
        const msg = Array.isArray(msgs) ? msgs[0] : String(msgs)
        if (key === 'general') general = msg
        else fields[key] = msg
      }
      if (data.code === 'promotion_conflict') {
        // Overlap found by the server: show it on the dates, and mark the products
        fields.ends_at = data.message ?? t('errors.saveFailed')
        const rows: Conflict[] = []
        for (const c of (data.conflicts ?? []) as Array<{ id: number; name: string; type: string; source: string; status: string; starts_at: string | null; ends_at: string | null; products: { id: number }[] }>) {
          for (const p of c.products) rows.push({ product_id: p.id, promotion: { id: c.id, name: c.name, type: c.type, source: c.source, status: c.status, starts_at: c.starts_at, ends_at: c.ends_at } })
        }
        setDateConflicts(rows)
      }
      setServerErrors(fields)
      const keys = Object.keys(fields)
      setApiError(general || (keys.length ? t('errors.fixBelow') : (data?.message ?? t('errors.saveFailed'))))
      // Jump to the step that holds the faulty field, and highlight it
      const onProducts = keys.some(k => k === 'products' || k.startsWith('product_ids')) || (!keys.length && err?.response?.status === 403)
      goTo(onProducts ? 0 : 1)
      setTimeout(() => focusFirstField(bodyRef.current, onProducts ? ['products'] : keys), 80)
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
      (k === 'products' && !!(serverErrors.products || serverErrors.product_ids)) ||
      (k === 'details' && Object.entries(serverErrors).some(([x, v]) => !!v && x !== 'products' && x !== 'product_ids'))
    ),
  }))

  // ── Row note in step 1: product already in a promotion (heads-up, not blocking) ──
  const rowNote = (p: WizProduct) => {
    const c = infoConflicts.find(x => x.product_id === p.id)
    if (!c) return null
    return (
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.35 }}>
        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
        <span>{t(c.promotion.type === 'flash_sale' ? 'conflictFlash' : 'conflictPromo', { name: c.promotion.name, date: fmtIso(c.promotion.ends_at) })}</span>
      </span>
    )
  }

  // ── Step 3: storefront cards ───────────────────────────────────────────────
  // The storefront only shows a flash countdown once the sale is live: for a future start, preview
  // the countdown as it will read at the first second (the full duration), not the time to the end date
  const endsAtIso = datesOk
    ? new Date(startMs > Date.now() ? Date.now() + (endMs - startMs) : endMs).toISOString()
    : null
  const cardOf = (p: WizProduct): CardProduct => {
    const sp = serverPrices[p.id]
    const base = sp?.clientOriginal ?? p.price
    return {
      id: p.id, name: p.name, slug: 'preview', stock: p.stock ?? 99,
      price: base,
      original_price: base,
      final_price: sp?.clientFinal ?? base,
      discount_percent: sp?.clientPercent ?? 0,
      promo_type: type === 'flash_sale' ? 'flash_sale' : 'promotion',
      ends_at: endsAtIso,
      primary_image_url: p.primary_image_url,
      variants: p.variants.filter(v => v.is_active).map(v => ({ id: v.id, stock: v.stock })),
    }
  }

  const sellerFinal = (p: WizProduct) => serverPrices[p.id]?.final ?? computeEffectivePrice(p.price, discountType, valueNum || 0)
  const sellerOrig  = (p: WizProduct) => serverPrices[p.id]?.original ?? p.price
  const sellerPct   = (p: WizProduct) => {
    const o = sellerOrig(p), f = sellerFinal(p)
    return serverPrices[p.id]?.percent ?? (o > 0 ? Math.floor(((o - f) / o) * 100) : 0)
  }

  // Seller-only hint: the buyer badge is computed on the final displayed price, so it can be lower than the % typed
  const firstPct = selected.length ? serverPrices[selected[0].id]?.clientPercent : undefined
  const badgeHint = valueNum > 0 && Object.keys(serverPrices).length > 0 ? (
    <Notice tone="info" icon={<AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}>
      {t('badgeHint')}
      {discountType === 'percentage' && firstPct != null && firstPct !== valueNum && (
        <> {t('badgeHintExample', { entered: number(valueNum), shown: firstPct })}</>
      )}
    </Notice>
  ) : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <WizardShell
      titleId="promo-modal-title"
      title={isEdit ? t('editTitle') : t('createTitle')}
      subtitle={t('subtitle')}
      steps={steps} stepIdx={stepIdx} maxStep={maxStep} onStep={goTo} onClose={onClose}
      apiError={apiError} canNext={canNext} nextHint={nextHint}
      onBack={() => { setApiError(''); goTo(stepIdx - 1) }} onNext={onNext}
      nextLabel={stepIdx === 2 ? (isEdit ? t('save') : t('create')) : tw('next')}
      saving={saving} bodyRef={bodyRef}
    >
      {/* ═══ Step 1 · Produits ═══ */}
      {stepIdx === 0 && (
        <ProductPickStep
          products={products} loading={prodLoading}
          selectedIds={selectedIds} selectedCount={selectedIds.length}
          onToggle={toggleProduct} rowNote={rowNote}
          error={serverErrors.products || serverErrors.product_ids || (selectedIds.length === 0 && maxStep > 0 ? productsError : unavailableSelected.length ? productsError : null)}
          intro={
            <>
              {prefill?.growthCardId && <Notice tone="info">{t('fromRadar')}</Notice>}
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{t('pickIntro')}</p>
            </>
          }
          selectedSlot={selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selected.map(p => <ProductChip key={p.id} product={p} onRemove={() => toggleProduct(p, false)} />)}
            </div>
          )}
        />
      )}

      {/* ═══ Step 2 · Détails ═══ */}
      {stepIdx === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prefill && prefillProduct && prefill.target != null && (
            <Notice tone="ok">{t('prefill', { price: dt(prefill.target), was: dt(serverPrices[prefillProduct.id]?.original ?? prefillProduct.price) })}</Notice>
          )}
          {isEdit && <Notice tone="info">{t('typeLocked')}</Notice>}

          <SectionLabel>{t('details')}</SectionLabel>

          <Field label={t('name')} required error={shown('name')} htmlFor="promo-name" field="name">
            <input id="promo-name" className="wz-input" style={inputStyle(!!shown('name'))} value={name} maxLength={255}
              onChange={e => { setName(e.target.value); setServerErrors(s => ({ ...s, name: '' })) }}
              onBlur={() => setTouched(x => ({ ...x, name: true }))}
              placeholder={t('namePlaceholder')} />
          </Field>

          {/* Type: two large cards with their rules */}
          <Field label={t('type')} required>
            <div role="radiogroup" aria-label={t('type')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
              {(['flash_sale', 'discount'] as const).map(kind => {
                const on = type === kind
                return (
                  <button key={kind} type="button" role="radio" aria-checked={on} disabled={isEdit && !on}
                    onClick={() => !isEdit && setType(kind)}
                    style={{
                      minHeight: 88, textAlign: 'start', padding: '12px 14px', borderRadius: 14, fontFamily: 'inherit',
                      cursor: isEdit ? 'default' : 'pointer', opacity: isEdit && !on ? 0.5 : 1,
                      border: `2px solid ${on ? BRAND : '#e5e7eb'}`, background: on ? 'rgba(219,20,46,0.05)' : '#fff',
                      display: 'flex', flexDirection: 'column', gap: 5,
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 900, color: on ? BRAND : '#0f172a' }}>
                      {kind === 'flash_sale' ? <Zap size={16} /> : <Tag size={16} />}
                      {kind === 'flash_sale' ? t('flashSale') : t('discount')}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#5b6472', lineHeight: 1.4 }}>
                      {kind === 'flash_sale' ? t('typeFlashRule', { max: MAX_PERCENT.flash_sale }) : t('typeDiscountRule', { max: MAX_PERCENT.discount })}
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Discount type */}
          <Field label={t('discountType')} required>
            <div role="radiogroup" aria-label={t('discountType')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['percentage', 'fixed'] as const).map(k => {
                const on = discountType === k
                return (
                  <button key={k} type="button" role="radio" aria-checked={on} disabled={isEdit && !on}
                    onClick={() => !isEdit && setDiscountType(k)}
                    style={{
                      minHeight: 48, borderRadius: 12, fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5,
                      cursor: isEdit ? 'default' : 'pointer', opacity: isEdit && !on ? 0.5 : 1,
                      border: `2px solid ${on ? BRAND : '#e5e7eb'}`, background: on ? 'rgba(219,20,46,0.05)' : '#fff',
                      color: on ? BRAND : '#475569',
                    }}>
                    {k === 'percentage' ? t('percentage') : t('fixed', { currency })}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Value, with its live maximum */}
          <Field
            label={discountType === 'percentage' ? t('valuePct', { max: maxPct }) : t('valueFixed', { currency })}
            required error={shown('discount_value', discountValue !== '')} htmlFor="promo-value" field="discount_value"
            hint={discountType === 'percentage' ? t('maxValueHint', { max: maxPct }) : t('fixedHint', { currency })}>
            <div style={{ position: 'relative' }}>
              <input id="promo-value" className="wz-input" type="number" inputMode="decimal" min="0.001" step="0.001"
                style={{ ...inputStyle(!!shown('discount_value', discountValue !== '')), paddingInlineEnd: 56 }}
                value={discountValue}
                onChange={e => { setDiscountValue(e.target.value); setServerErrors(s => ({ ...s, discount_value: '' })) }}
                onBlur={() => setTouched(x => ({ ...x, discount_value: true }))}
                placeholder="0" />
              <span style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#5b6472', fontWeight: 700 }}>
                {discountType === 'percentage' ? '%' : currency}
              </span>
            </div>
          </Field>

          {/* Dates */}
          <div className="wz-two">
            <Field label={t('startsAt')} required error={shown('starts_at', startsAt !== '')} htmlFor="promo-start" field="starts_at">
              <input id="promo-start" className="wz-input" type="datetime-local" disabled={isEdit}
                style={inputStyle(!!shown('starts_at', startsAt !== ''))}
                value={startsAt} min={isEdit ? undefined : tunisInput()}
                onChange={e => { setStartsAt(e.target.value); setServerErrors(s => ({ ...s, starts_at: '', ends_at: '' })) }}
                onBlur={() => setTouched(x => ({ ...x, starts_at: true }))} />
            </Field>
            <Field label={t('endsAt')} required error={shown('ends_at', endsAt !== '')} htmlFor="promo-end" field="ends_at">
              <input id="promo-end" className="wz-input" type="datetime-local"
                style={inputStyle(!!shown('ends_at', endsAt !== ''))}
                value={endsAt} min={startsAt || undefined}
                onChange={e => { setEndsAt(e.target.value); setServerErrors(s => ({ ...s, ends_at: '' })) }}
                onBlur={() => setTouched(x => ({ ...x, ends_at: true }))} />
            </Field>
          </div>

          {/* Live duration */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: datesOk && !endError ? 'rgba(4,120,87,0.06)' : '#f8fafc',
            border: `1px solid ${datesOk && !endError ? 'rgba(4,120,87,0.2)' : '#e2e8f0'}`,
            color: datesOk && !endError ? '#047857' : '#475569',
          }}>
            <Clock size={15} aria-hidden style={{ flexShrink: 0 }} />
            <span style={{ overflowWrap: 'anywhere' }}>
              {datesOk ? t('durationLive', { value: durationLabel(endMs - startMs) }) : t('durationHint', {
                min: type === 'flash_sale' ? t('duration.hour1') : t('duration.day1'),
                max: type === 'flash_sale' ? t('duration.hours72') : t('duration.days90'),
              })}
            </span>
          </div>

          {/* Flash options */}
          {type === 'flash_sale' && (
            <div className="wz-two">
              <Field label={t('flashStock')} error={shown('flash_stock', true)} htmlFor="promo-flash-stock" field="flash_stock" hint={t('flashStockHint')}>
                <input id="promo-flash-stock" className="wz-input" type="number" inputMode="numeric" min="1" step="1"
                  style={inputStyle(!!shown('flash_stock', true))}
                  value={flashStock} onChange={e => { setFlashStock(e.target.value); setServerErrors(s => ({ ...s, flash_stock: '' })) }}
                  placeholder={t('flashStockPlaceholder')} />
              </Field>
              <Field label={t('perCustomer')} error={shown('per_customer_limit', true)} htmlFor="promo-per-customer" field="per_customer_limit" hint={t('perCustomerHint')}>
                <input id="promo-per-customer" className="wz-input" type="number" inputMode="numeric" min="1" max="100" step="1"
                  style={inputStyle(!!shown('per_customer_limit', true))}
                  value={perCustomer} onChange={e => { setPerCustomer(e.target.value); setServerErrors(s => ({ ...s, per_customer_limit: '' })) }} />
              </Field>
            </div>
          )}

          {/* Live per-product price preview */}
          <SectionLabel>{t('pricePreview')}</SectionLabel>
          {valueNum > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.map(p => {
                const c = conflictOf(p.id)
                const unitFinal = sellerFinal(p)
                return (
                  <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${c ? '#fde68a' : '#e5e7eb'}`, borderRadius: 12, background: c ? '#fffbeb' : '#fff' }}>
                    <Thumb src={p.primary_image_url} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' }}>{p.name}</p>
                      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px 8px' }}>
                        <s style={{ fontSize: 12, color: '#94a3b8' }}>{dt(sellerOrig(p))}</s>
                        <strong style={{ fontSize: 15, color: unitFinal > 0 ? BRAND : '#b91c1c' }}>{dt(unitFinal)}</strong>
                      </p>
                      {serverPrices[p.id]?.valid && serverPrices[p.id]?.clientPercent != null && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 700, color: '#198f41' }}>
                          {t('clientWillSee', { percent: serverPrices[p.id]!.clientPercent!, price: dt(serverPrices[p.id]!.clientFinal ?? 0) })}
                        </p>
                      )}
                      {c && <p style={{ margin: '3px 0 0', fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>{t('conflictPromo', { name: c.promotion.name, date: fmtIso(c.promotion.ends_at) })}</p>}
                    </div>
                    <span style={{ flexShrink: 0 }}><DiscountBadge percent={sellerPct(p)} size="sm" /></span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: '#5b6472' }}>{t('pricePreviewEmpty')}</p>
          )}
          {badgeHint}
          <Notice tone="info">{t('subtitle')}</Notice>
        </div>
      )}

      {/* ═══ Step 3 · Aperçu ═══ */}
      {stepIdx === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionLabel>{tw('previewLabel')}</SectionLabel>
            <p style={{ fontSize: 12.5, color: '#5b6472', margin: '8px 0 0' }}>{tw('previewHint')}</p>
          </div>

          {pricesLoading && Object.keys(serverPrices).length === 0 ? (
            <p role="status" style={{ fontSize: 13, color: '#5b6472', margin: 0 }}>{tw('loading')}</p>
          ) : (
            // The real storefront product cards. inert: a preview, nothing is clickable and nothing is tracked.
            <div className="sp" inert style={{
              background: 'transparent', pointerEvents: 'none', display: 'grid', gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(168px, 100%), 1fr))',
            }}>
              {selected.slice(0, MAX_CARDS_IN_PREVIEW).map((p, i) => (
                <ProductCard key={p.id} product={cardOf(p)} index={i} section="seller_preview" showShop={false} preview />
              ))}
            </div>
          )}
          {badgeHint}
          {selected.length > MAX_CARDS_IN_PREVIEW && (
            <p style={{ margin: 0, fontSize: 12.5, color: '#5b6472', fontWeight: 700 }}>{tw('previewMore', { count: selected.length - MAX_CARDS_IN_PREVIEW })}</p>
          )}

          {/* Summary */}
          <SectionLabel>{t('summary')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <Line label={t('name')} value={name.trim()} />
            <Line label={t('type')} value={type === 'flash_sale' ? t('flashSale') : t('discount')} />
            <Line label={t('sumValue')} value={discountType === 'percentage' ? `${number(valueNum || 0)} %` : dt(valueNum || 0)} />
            <Line label={t('startsAt')} value={startsAt ? fmtLocal(startsAt) : '—'} />
            <Line label={t('endsAt')} value={endsAt ? fmtLocal(endsAt) : '—'} />
            <Line label={t('sumDuration')} value={datesOk ? durationLabel(endMs - startMs) : '—'} />
            <Line label={tw('summaryProducts')} value={selected.map(p => p.name).join(', ')} />
            {type === 'flash_sale' && <Line label={t('flashStock')} value={flashStock ? flashStock : t('unlimited')} />}
            {type === 'flash_sale' && <Line label={t('perCustomer')} value={perCustomer} />}
          </div>
          <Notice tone="info" icon={<Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />}>
            {startMs > Date.now() ? t('goesLive', { date: fmtLocal(startsAt) }) : t('liveNow')} {t('subtitle')}
          </Notice>

          {/* Seller-only: what you receive after commission */}
          <PromotionCommissionPreview
            serverPrices={serverPrices} products={selected} selectedIds={[...selectedIds]}
            discountType={discountType} discountValue={discountValue}
          />
        </div>
      )}
    </WizardShell>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 13 }}>
      <span style={{ color: '#5b6472', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 800, textAlign: 'end', minWidth: 0, overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}
