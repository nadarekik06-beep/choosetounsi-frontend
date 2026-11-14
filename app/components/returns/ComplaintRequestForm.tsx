'use client'

/**
 * The after-sale request form, shared by /complaints/new (ComplaintForm) and
 * the drawer opened from an order (ComplaintModal) so the two never diverge.
 *
 *   1. Return (refund) or Exchange (another size / color of the same product)
 *   2. Which items (whole order or items × quantity) — exchange: the
 *      replacement of each line, from in-stock variants at the same price
 *   3. Reason → who pays: the shop when it is at fault, else the client
 *   4. The fee, shown before confirming: one per shop parcel at its largest
 *      size — return: deducted from the refund; exchange: cash to the courier
 *   5. Description + proof photos, submit
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { complaintApi, type BuyerComplaintClient } from '@/lib/complaintApi'
import type {
  AfterSaleFees, BuyerComplaint, ComplaintType, EligibleOrder, EligibleOrderItem, ParcelSize, PolicyReason, ReasonOptions,
  RefundPreview, ResolutionType, ReturnPolicyInfo,
} from '@/types/complaint'
import { SELLER_FAULT_TYPES } from '@/types/complaint'
import ReturnItemsPicker, { returnLines } from '@/app/components/returns/ReturnItemsPicker'
import ProofPhotosInput from '@/app/components/returns/ProofPhotosInput'
import BrandLoader from '@/components/brand/BrandLoader'

const RED       = '#db142e'
const RED_DARK  = '#a50f22'
const RED_LIGHT = 'rgba(219,20,46,0.07)'
const INDIGO    = '#4f46e5'
const BORDER    = '#e2e8f0'
const TEXT      = '#0f172a'
const TEXT_SEC  = '#475569'
const MUTED     = '#94a3b8'
const GREEN     = '#10b981'

const CLIENT_TYPES: ComplaintType[] = ['changed_mind', 'doesnt_fit', 'prefer_other_color', 'other']
const TYPE_ICONS: Record<ComplaintType, string> = {
  wrong_product: '📦', wrong_size: '📏', wrong_color: '🎨', damaged_product: '💔',
  changed_mind: '🔄', doesnt_fit: '👕', prefer_other_color: '🌈', other: '💬',
}
const SIZE_RANK: Record<ParcelSize, number> = { S: 1, L: 2, XL: 3 }
/** Exchange-first policy: the four reasons of the form (the server says which are allowed) */
const V2_REASONS: PolicyReason[] = ['doesnt_fit', 'damaged_product', 'wrong_product', 'changed_mind']
const MIN_CHARS = 20
const MAX_CHARS = 2000

const round3 = (v: number) => Math.round(v * 1000) / 1000
const tnd = (v: number) => v.toFixed(3)

export interface ComplaintRequestFormProps {
  order:             EligibleOrder
  fees:              AfterSaleFees | null
  sellerFaultTypes?: ComplaintType[]
  /** page: roomy cards; drawer: dense, inside a scrolling panel (sticky submit) */
  layout?:           'page' | 'drawer'
  onSubmitted:       (created: BuyerComplaint) => void
  onCancel?:         () => void
  /** Whose returns: the signed-in account (default) or a guest's order (guestComplaintApi) */
  api?:              BuyerComplaintClient
  /** Exchange-first policy (from eligible-orders): when v2 is on the form follows the server's options */
  policy?:           ReturnPolicyInfo | null
}

export default function ComplaintRequestForm({
  order, fees, sellerFaultTypes = SELLER_FAULT_TYPES, layout = 'page', onSubmitted, onCancel, api = complaintApi, policy = null,
}: ComplaintRequestFormProps) {
  const t = useTranslations('complaintRequest')
  const drawer = layout === 'drawer'
  const v2 = !!policy?.v2
  const minPhotos = v2 ? (policy?.min_photos ?? 2) : 1
  const maxPhotos = v2 ? (policy?.max_photos ?? 3) : 5

  // Exchange first: it is the highlighted default when the policy is on
  const [resolution,   setResolution]   = useState<ResolutionType>(v2 ? 'exchange' : 'return_refund')
  const [unused,       setUnused]       = useState(false)
  const [returnAll,    setReturnAll]    = useState(true)
  const [quantities,   setQuantities]   = useState<Record<number, number>>({})
  const [replacements, setReplacements] = useState<Record<number, number>>({})
  const [type,         setType]         = useState<ComplaintType | ''>('')
  const [otherReason,  setOtherReason]  = useState('')
  const [description,  setDescription]  = useState('')
  const [photos,       setPhotos]       = useState<File[]>([])
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [serverError,  setServerError]  = useState('')

  const exchange = resolution === 'exchange'
  const lines    = returnLines(order.items, returnAll, quantities)
  const chosen   = order.items.filter(i => lines.some(l => l.order_item_id === i.id))

  /** Exchange: what each chosen line can become, and lines that can't be exchanged at all. */
  const canExchange = (i: EligibleOrderItem) => !!i.exchange_same_product || (i.exchange_options?.length ?? 0) > 0
  const blocked     = exchange ? chosen.filter(i => !canExchange(i)) : []
  const missing     = exchange ? chosen.filter(i => canExchange(i) && !i.exchange_same_product && !replacements[i.id]) : []

  // ── Fee: one per shop parcel (seller_order), at its largest size ─────────
  const fee = useMemo(() => {
    if (!fees || chosen.length === 0) return null
    const parcels = new Map<number, ParcelSize>()
    for (const i of chosen) {
      const key  = i.seller_order_id ?? 0
      const size = (i.parcel_size ?? 'S') as ParcelSize
      const prev = parcels.get(key)
      if (!prev || SIZE_RANK[size] > SIZE_RANK[prev]) parcels.set(key, size)
    }
    let total = 0
    parcels.forEach(size => { total += exchange ? fees[size].exchange : fees[size].return })
    const items = lines.reduce((s, l) => {
      const i = order.items.find(x => x.id === l.order_item_id)
      return s + l.quantity * (i?.paid_unit_price ?? i?.unit_price ?? 0)
    }, 0)
    return { total: round3(total), parcels: parcels.size, items: round3(items) }
  }, [fees, chosen, lines, exchange, order.items])

  // The refund is the server's figure (delivery is included in the prices, so it is not a
  // sum of unit prices). The local estimate above only shows if the preview cannot be reached.
  const previewType = type || (v2 ? 'changed_mind' : 'damaged_product')
  const previewKey = (v2 || !exchange) && lines.length > 0
    ? JSON.stringify([order.id, previewType, v2 ? resolution : '', returnAll, lines.map(l => [l.order_item_id, l.quantity])])
    : ''
  const [preview, setPreview] = useState<({ key: string } & RefundPreview) | null>(null)
  useEffect(() => {
    if (!previewKey) return
    let stale = false
    const timer = setTimeout(() => {
      api.preview({ order_id: order.id, complaint_type: previewType, resolution_type: v2 ? resolution : undefined, return_all: returnAll, items: lines })
        .then(res => { if (!stale) setPreview({ key: previewKey, ...res.data }) })
        .catch(() => { if (!stale) setPreview(null) })
    }, 250)
    return () => { stale = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey])
  const served = preview && preview.key === previewKey ? preview : null

  // What is allowed for this selection, per reason, with the why: all decided by the server
  const reasonOpts = (r: PolicyReason): ReasonOptions | null => (v2 ? served?.policy?.[r] ?? null : null)
  const opts = type ? reasonOpts(type as PolicyReason) : null
  const exchangeBlocked = !!opts && !opts.exchange_allowed
  const refundBlocked   = !!opts && !opts.refund_allowed
  // Never leave the form on an option the reason does not allow
  useEffect(() => {
    if (!v2 || !opts) return
    if (exchange && exchangeBlocked && !refundBlocked) setResolution('return_refund')
    else if (!exchange && refundBlocked && !exchangeBlocked) setResolution('exchange')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.exchange_allowed, opts?.refund_allowed, type])

  const shopPays  = v2 ? served?.shipping_payer === 'seller' : (!!type && sellerFaultTypes.includes(type))
  const clientFee = fee && type && !shopPays ? (served && type ? served.client_fee : fee.total) : 0
  const itemsPaid = served ? served.items_amount : (fee?.items ?? 0)
  const refund    = served && type ? served.refund_amount : fee ? Math.max(0, round3(fee.items - clientFee)) : 0

  const clear = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n })

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (lines.length === 0) e.items = t('errors.items')
    else if (blocked.length) e.items = t('errors.noOption', { item: blocked[0].product_name })
    else if (missing.length) e.items = t('errors.replacement', { item: missing[0].product_name })
    if (!type) e.type = t('errors.type')
    if (type === 'other' && !otherReason.trim()) e.other = t('errors.specify')
    if (description.trim().length < MIN_CHARS) e.description = t('charsNeeded', { count: MIN_CHARS - description.trim().length })
    if (v2 && opts?.disabled) e.type = opts.disabled_reason ?? t('errors.type')
    else if (v2 && opts && exchange && !opts.exchange_allowed) e.type = t('exchangeUnavailable')
    else if (v2 && opts && !exchange && !opts.refund_allowed) e.type = opts.refund_note ?? t('refundNotAllowed')
    if (v2 && opts?.unused_required && !unused) e.unused = t('errors.unused')
    if (v2 ? (photos.length < minPhotos || photos.length > maxPhotos) : photos.length === 0) e.photos = v2 ? t('errors.photoRange', { min: minPhotos, max: maxPhotos }) : t('errors.photo')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    setServerError('')
    if (!validate()) {
      setTimeout(() => document.querySelector('[data-cr-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.submit({
        order_id:        order.id,
        complaint_type:  type as ComplaintType,
        resolution_type: resolution,
        other_reason:    type === 'other' ? otherReason.trim() : undefined,
        description:     description.trim(),
        images:          photos,
        return_all:      !exchange && returnAll,
        item_unused_confirmed: v2 && type === 'changed_mind' ? unused : undefined,
        items:           lines.map(l => ({ ...l, replacement_variant_id: exchange ? replacements[l.order_item_id] ?? null : undefined })),
      })
      onSubmitted(res.data)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(message ?? t('errors.submit'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── UI helpers ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = drawer
    ? { display: 'flex', flexDirection: 'column', gap: 10 }
    : { background: '#fff', borderRadius: 16, padding: '16px 14px', border: `1.5px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }
  const title: React.CSSProperties = {
    fontSize: drawer ? 11 : 14, fontWeight: 800, color: drawer ? '#374151' : TEXT, margin: 0,
    textTransform: drawer ? 'uppercase' : 'none', letterSpacing: drawer ? '0.6px' : 0,
  }
  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, fontSize: 13.5,
    background: '#f8fafc', color: TEXT, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: 'inherit',
  }
  const errText = (k: string) => errors[k] ? <span style={{ fontSize: 11.5, color: RED, fontWeight: 700 }}>⚠ {errors[k]}</span> : null
  const choice = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 12px', borderRadius: 12,
    cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit',
    border: `2px solid ${active ? color : BORDER}`, background: active ? `${color}12` : '#f8fafc',
    boxShadow: active ? `0 0 0 1px ${color}` : 'none', transition: 'all 0.15s',
  })

  const reasonChip = (val: ComplaintType, disabled = false) => {
    const sel = type === val
    return (
      <button key={val} type="button" aria-pressed={sel} aria-disabled={disabled} title={disabled ? t('reasonUnavailable') : undefined}
        onClick={() => { setType(val); clear('type'); clear('unused') }}
        style={{
          opacity: disabled ? 0.55 : 1,
          padding: '10px 11px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700,
          background: sel ? RED_LIGHT : '#f8fafc', border: `1.5px solid ${sel ? RED : BORDER}`, color: sel ? RED : TEXT_SEC,
          boxShadow: sel ? `0 0 0 1px ${RED}` : 'none',
        }}>
        <span style={{ fontSize: 17 }} aria-hidden>{TYPE_ICONS[val]}</span>
        <span style={{ lineHeight: 1.3 }}>{t(`types.${val}`)}</span>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: drawer ? 20 : 12 }}>
      {serverError && (
        <div role="alert" style={{ padding: '11px 14px', background: 'rgba(219,20,46,0.06)', border: '1.5px solid rgba(219,20,46,0.2)', borderRadius: 10, color: RED, fontSize: 13, fontWeight: 600 }}>
          ⚠ {serverError}
        </div>
      )}

      {v2 && (
        <p style={{ margin: 0, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)', fontSize: 12.5, fontWeight: 700, color: INDIGO, lineHeight: 1.5 }}>
          🔁 {t('promise')} <Link href="/returns-policy" style={{ color: INDIGO, textDecoration: 'underline', fontWeight: 800 }}>{t('policyLink')}</Link>
        </p>
      )}

      {/* 1 — Exchange first (highlighted), refund second when the reason allows it */}
      <section style={card}>
        <p style={title}>{t('resolutionTitle')}</p>
        {(() => {
          const exchangeBtn = (
            <button key="x" type="button" aria-pressed={exchange} aria-disabled={v2 && exchangeBlocked}
              style={{ ...choice(exchange, INDIGO), opacity: v2 && exchangeBlocked ? 0.5 : 1 }}
              onClick={() => { if (v2 && exchangeBlocked) return; setResolution('exchange'); clear('items') }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: exchange ? INDIGO : TEXT }}>🔁 {t('exchange')}{v2 && <em style={{ fontStyle: 'normal', marginInlineStart: 6, fontSize: 10.5, padding: '2px 7px', borderRadius: 99, background: INDIGO, color: '#fff' }}>{t('recommended')}</em>}</span>
              <span style={{ fontSize: 11.5, color: TEXT_SEC, lineHeight: 1.4 }}>{t('exchangeHint')}</span>
            </button>
          )
          const returnBtn = (
            <button key="r" type="button" aria-pressed={!exchange} aria-disabled={v2 && refundBlocked}
              style={{ ...choice(!exchange, RED), opacity: v2 && refundBlocked ? 0.5 : 1 }}
              onClick={() => { if (v2 && refundBlocked) return; setResolution('return_refund'); clear('items') }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: !exchange ? RED : TEXT }}>↩️ {v2 ? t('refund') : t('return')}</span>
              <span style={{ fontSize: 11.5, color: TEXT_SEC, lineHeight: 1.4 }}>{v2 ? t('refundHint') : t('returnHint')}</span>
            </button>
          )
          return <div style={{ display: 'flex', gap: 8 }}>{v2 ? [exchangeBtn, returnBtn] : [returnBtn, exchangeBtn]}</div>
        })()}
        {v2 && opts && !opts.disabled && refundBlocked && (
          <span style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.5 }}>ℹ️ {opts.refund_note ?? t('refundNotAllowed')}</span>
        )}
        {v2 && opts && !opts.disabled && exchangeBlocked && (
          <span style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.5 }}>ℹ️ {t('exchangeUnavailable')}</span>
        )}
      </section>

      {/* 2 — Items (+ replacement for an exchange) */}
      <section style={card} data-cr-error={errors.items ? 'true' : undefined}>
        <p style={title}>{exchange ? t('itemsExchange') : t('itemsReturn')} <span style={{ color: RED }}>*</span></p>
        <ReturnItemsPicker
          items={order.items}
          returnAll={returnAll}
          onReturnAll={v => { setReturnAll(v); if (!v) setQuantities({}); clear('items') }}
          quantities={quantities}
          onChange={q => { setQuantities(q); clear('items') }}
          showEstimate={!exchange}
          serverEstimate={previewKey ? (served ? served.items_amount : null) : undefined}
        />
        {exchange && chosen.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chosen.map(i => {
              const options = i.exchange_options ?? []
              return (
                <div key={i.id} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 800, color: TEXT }}>
                    {i.product_name}{i.variant_label ? ` · ${i.variant_label}` : ''} → {t('replacementLabel')}
                  </p>
                  {i.exchange_same_product ? (
                    <p style={{ margin: 0, fontSize: 12, color: TEXT_SEC }}>{t('sameProduct')}</p>
                  ) : options.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: RED, fontWeight: 700 }}>{t('noOption')}</p>
                  ) : (
                    <select value={replacements[i.id] ?? ''} aria-label={t('replacementLabel')}
                      onChange={e => { setReplacements(r => ({ ...r, [i.id]: Number(e.target.value) })); clear('items') }}
                      style={{ ...input, cursor: 'pointer' }}>
                      <option value="">{t('chooseVariant')}</option>
                      {options.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.current ? t('currentVariant', { label: o.label }) : o.label} · {t('stockLeft', { count: o.stock })}
                        </option>
                      ))}
                    </select>
                  )}
                  {i.exchange_other_price && <p style={{ margin: '6px 0 0', fontSize: 11, color: MUTED }}>{t('otherPrice')}</p>}
                </div>
              )
            })}
          </div>
        )}
        {errText('items')}
      </section>

      {/* 3 — Reason */}
      <section style={card} data-cr-error={errors.type || errors.other ? 'true' : undefined}>
        <p style={title}>{t('reasonTitle')} <span style={{ color: RED }}>*</span></p>
        {v2 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {(policy?.reasons ?? V2_REASONS).map(r => reasonChip(r, !!reasonOpts(r)?.disabled))}
            </div>
            {opts?.disabled && (
              <div role="note" style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.35)', fontSize: 12.5, color: TEXT, lineHeight: 1.55 }}>
                🚫 {opts.disabled_reason}
              </div>
            )}
            {opts?.unused_required && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: TEXT, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={unused} onChange={e => { setUnused(e.target.checked); clear('unused') }} style={{ marginTop: 3 }} />
                <span>{t('unusedConfirm')}</span>
              </label>
            )}
            {errText('unused')}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('groupShop')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {sellerFaultTypes.map(r => reasonChip(r))}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('groupMine')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {CLIENT_TYPES.map(r => reasonChip(r))}
            </div>
          </>
        )}
        {errText('type')}
        {type === 'other' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="text" value={otherReason} maxLength={255} aria-label={t('specifyReason')} placeholder={t('otherPlaceholder')}
              onChange={e => { setOtherReason(e.target.value); clear('other') }} style={input} />
            {errText('other')}
          </div>
        )}
      </section>

      {/* 4 — The fee, before confirming */}
      {chosen.length > 0 && (
        <section aria-live="polite" style={{
          padding: '12px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
          background: !type ? '#f8fafc' : shopPays ? 'rgba(16,185,129,0.07)' : exchange ? 'rgba(79,70,229,0.07)' : 'rgba(245,158,11,0.08)',
          border: `1.5px solid ${!type ? BORDER : shopPays ? 'rgba(16,185,129,0.3)' : exchange ? 'rgba(79,70,229,0.3)' : 'rgba(245,158,11,0.35)'}`,
          color: TEXT,
        }}>
          {!type || !fee ? (
            <span style={{ color: TEXT_SEC }}>{t('feeChooseReason')}</span>
          ) : exchange ? (
            <b>{shopPays ? t('exchangeFeeShop') : t('exchangeFeeClient', { fee: tnd(clientFee) })}</b>
          ) : (
            <>
              <b>{shopPays ? t('returnFeeShop') : t('returnFeeClient', { fee: tnd(clientFee) })}</b>
              <div style={{ marginTop: 4, color: TEXT_SEC }}>
                {v2 && served
                  ? (clientFee > 0
                      ? t('refundBreakdown', { amount: tnd(refund), items: tnd(itemsPaid), fee: tnd(clientFee) })
                      : t('refundBreakdownFull', { amount: tnd(refund) }))
                  : t('refundEstimate', { amount: tnd(refund) })}
              </div>
              {!shopPays && clientFee > itemsPaid && <div style={{ marginTop: 4, color: RED, fontWeight: 700 }}>{t('returnFeeTooHigh')}</div>}
            </>
          )}
          {type && fee && fee.parcels > 1 && <div style={{ marginTop: 4, fontSize: 11.5, color: TEXT_SEC }}>{t('feeParcels', { count: fee.parcels })}</div>}
          {type === 'other' && <div style={{ marginTop: 4, fontSize: 11.5, color: TEXT_SEC }}>{t('feeOtherNote')}</div>}
        </section>
      )}

      {/* 5 — Description + photos */}
      <section style={card} data-cr-error={errors.description || errors.photos ? 'true' : undefined}>
        <p style={title}>{t('describe')} <span style={{ color: RED }}>*</span></p>
        <textarea value={description} rows={drawer ? 4 : 5} maxLength={MAX_CHARS} aria-label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          onChange={e => { setDescription(e.target.value); clear('description') }}
          style={{ ...input, resize: 'vertical', lineHeight: 1.65, minHeight: drawer ? 96 : 120 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600 }}>
          <span style={{ color: description.trim().length >= MIN_CHARS ? GREEN : '#d97706' }}>
            {description.trim().length >= MIN_CHARS ? t('charsOk') : t('charsNeeded', { count: MIN_CHARS - description.trim().length })}
          </span>
          <span style={{ color: MUTED }}>{description.length} / {MAX_CHARS}</span>
        </div>
        {errText('description')}
        <p style={{ ...title, marginTop: 6 }}>{t('proofPhoto')} <span style={{ color: RED }}>*</span> <span style={{ fontWeight: 500, color: MUTED, textTransform: 'none', letterSpacing: 0 }}>· {v2 ? t('proofHintRange', { min: minPhotos, max: maxPhotos }) : t('proofHint')}</span></p>
        <ProofPhotosInput files={photos} min={v2 ? minPhotos : undefined} max={maxPhotos}
          onChange={f => { setPhotos(f); if (f.length) clear('photos') }}
          onError={m => setErrors(p => (m ? { ...p, photos: m } : p))}
          error={errors.photos} />
      </section>

      {/* How it goes */}
      <p style={{ margin: 0, padding: '10px 14px', borderRadius: 10, background: 'rgba(219,20,46,0.04)', border: '1px solid rgba(219,20,46,0.12)', fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
        {exchange ? t('exchangeNote') : (v2 ? t('returnNoteV2') : t('returnNote'))}
      </p>

      {/* Submit */}
      <div style={{
        display: 'flex', gap: 10, flexDirection: drawer ? 'column' : 'row-reverse',
        ...(drawer ? { position: 'sticky', bottom: -22, background: '#fff', padding: '12px 0 4px', marginBottom: -4 } : {}),
      }}>
        <button type="button" onClick={submit} disabled={submitting}
          style={{
            flex: 1, padding: '13px 20px', borderRadius: 11, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            background: `linear-gradient(135deg, ${exchange ? INDIGO : RED} 0%, ${exchange ? '#3730a3' : RED_DARK} 100%)`,
            color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', opacity: submitting ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(15,23,42,0.18)',
          }}>
          {submitting ? <><BrandLoader variant="inline" size={15} /> {t('submitting')}</> : (exchange ? t('submitExchange') : t('submitReturn'))}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ padding: '12px 22px', borderRadius: 11, border: `1.5px solid ${BORDER}`, background: '#fff', color: TEXT_SEC, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('cancel')}
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>{t('disclaimer')}</p>
      {v2 && <p style={{ fontSize: 11, textAlign: 'center', margin: 0 }}><Link href="/returns-policy" style={{ color: INDIGO, fontWeight: 700 }}>{t('policyLink')}</Link></p>}
    </div>
  )
}
