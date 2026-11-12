'use client'

/**
 * Checkout confirmation: "Confirmer votre commande ?" then a 10-second undo window.
 *
 * Shows the server's quote as is (POST /checkout/quote, fetched again right
 * before opening): this component never computes a price. Images, variants and
 * crossed-out prices come from the cart lines the quote points to (cart_id).
 *
 * It sends nothing itself: the checkout page owns the timer and the one call
 * that creates the order (when the countdown reaches 0).
 *
 * Stages: review → countdown → placing. Closing (X, overlay, Escape) during
 * review or countdown = cancel; during placing nothing can be closed.
 */

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X, Package, Truck, MapPin, Phone, CreditCard, CheckCircle, Zap, Ticket } from 'lucide-react'
import type { CheckoutQuote } from '@/lib/shopApi'
import BrandLoader from '@/components/brand/BrandLoader'
import { ShopSavings, FreeDeliveryValue } from '@/app/components/cart/ShopSavings'

export type ConfirmStage = 'review' | 'countdown' | 'placing'

/** What the cart (or the buy-now product) adds to a quote line: picture, variant, reference price. */
export interface ConfirmLineExtra {
  image: string | null
  variant: string | null
  /** Crossed-out price before promotion, when the server sent one */
  originalUnitPrice: number | null
  promoType: 'flash_sale' | 'promotion' | null
}

export interface ConfirmAddress {
  name: string
  phones: string
  full: string
  notes: string
}

/** One key per confirmation: the server returns the same order for a repeated key. */
export function newIdempotencyKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c?.randomUUID) return c.randomUUID()
  const b = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export default function OrderConfirmModal({
  stage, quote, lineExtra, address, paymentLabel, remainingMs, totalMs, fmt,
  onEdit, onConfirm, onCancelCountdown,
}: {
  stage: ConfirmStage
  quote: CheckoutQuote
  lineExtra: (cartId: number | null) => ConfirmLineExtra
  address: ConfirmAddress
  paymentLabel: string
  remainingMs: number
  totalMs: number
  fmt: (n: number) => string
  onEdit: () => void
  onConfirm: () => void
  onCancelCountdown: () => void
}) {
  const t  = useTranslations('checkout.confirm')
  const tc = useTranslations('common')
  const tm = useTranslations('multiItem')
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef  = useRef<HTMLButtonElement>(null)

  // X / overlay / Escape: back to the checkout, nothing sent
  const dismiss = stage === 'review' ? onEdit : stage === 'countdown' ? onCancelCountdown : undefined

  // Page behind does not scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismiss) { e.preventDefault(); dismiss() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismiss])

  // Keyboard focus on the button that matters for each stage
  useEffect(() => {
    if (stage === 'review') confirmRef.current?.focus()
    if (stage === 'countdown') cancelRef.current?.focus()
  }, [stage])

  const seconds  = Math.max(0, Math.ceil(remainingMs / 1000))
  const progress = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100))

  let promoSavings = 0
  for (const p of quote.parcels) {
    for (const l of p.lines ?? []) {
      const o = lineExtra(l.cart_id).originalUnitPrice
      if (l.kind === 'product' && o && o > l.unit_price) promoSavings += (o - l.unit_price) * l.quantity
    }
  }
  promoSavings = Math.round(promoSavings * 1000) / 1000

  const row = (label: React.ReactNode, value: React.ReactNode, color = '#64748b') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13, color }}>
      <span style={{ minWidth: 0 }}>{label}</span>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{value}</span>
    </div>
  )

  return (
    <div className="ocm-overlay" onClick={dismiss} data-ct-modal="">
      <style>{`
        .ocm-overlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:var(--ct-barlow),sans-serif;animation:ocmFade .18s ease both}
        .ocm-sheet{width:100%;max-width:580px;max-height:min(92vh,860px);background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.35);animation:ocmIn .22s ease both}
        .ocm-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;overscroll-behavior:contain}
        .ocm-body>*{flex-shrink:0}
        .ocm-head,.ocm-foot{flex-shrink:0}
        .ocm-actions{display:flex;gap:10px}
        .ocm-btn{flex:1;min-height:48px;border-radius:12px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 14px}
        @keyframes ocmFade{from{opacity:0}to{opacity:1}}
        @keyframes ocmIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @media(max-width:640px){
          .ocm-overlay{padding:0;align-items:flex-end}
          .ocm-sheet{max-width:none;max-height:94dvh;border-radius:20px 20px 0 0}
          .ocm-body{padding:14px 16px}
          .ocm-actions{flex-direction:column-reverse}
        }
      `}</style>

      <div
        className="ocm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocm-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ocm-head" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} color="#db142e" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ocm-title" style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('title')}</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{t('subtitle')}</p>
          </div>
          {dismiss && (
            <button type="button" onClick={dismiss} aria-label={tc('close')}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Details (scrolls) */}
        <div className="ocm-body">
          {quote.parcels.map(p => {
            const lines = p.lines ?? []
            return (
              <section key={p.seller_id ?? 'platform'} style={{ border: '1px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={13} color="#db142e" />
                  <span dir="auto" style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t('soldBy', { seller: p.seller_name })}
                  </span>
                </div>
                <div style={{ padding: '4px 12px' }}>
                  {lines.map((l, i) => {
                    const x = lineExtra(l.cart_id)
                    const crossed = l.kind === 'product' && x.originalUnitPrice && x.originalUnitPrice > l.unit_price ? x.originalUnitPrice : null
                    return (
                      <div key={`${l.cart_id ?? 'bn'}-${i}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < lines.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <div style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                          {x.image
                            ? <img src={x.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f5' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#cbd5e1" /></div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p dir="auto" style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                            {x.variant && <span dir="auto" style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{x.variant}</span>}
                            {crossed && x.promoType && (
                              <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: x.promoType === 'flash_sale' ? 'rgba(219,20,46,0.08)' : 'rgba(25,143,65,0.1)', color: x.promoType === 'flash_sale' ? '#db142e' : '#198f41', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                {x.promoType === 'flash_sale' && <Zap size={9} />}{x.promoType === 'flash_sale' ? t('flash') : t('promo')}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11.5, color: '#64748b', margin: '3px 0 0' }}>
                            {t('qtyUnit', { qty: l.quantity, price: fmt(l.unit_price) })}
                            {crossed && <s style={{ color: '#94a3b8', marginInlineStart: 6 }}>{fmt(crossed)}</s>}
                          </p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(l.total)}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '8px 12px 10px', borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {row(t('itemsSubtotal'), fmt(p.items_subtotal))}
                  {p.coupon_code && p.coupon_discount > 0 && row(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ticket size={12} /> {t('coupon', { code: p.coupon_code })}</span>,
                    `-${fmt(p.coupon_discount)}`, '#059669',
                  )}
                  {Number(p.multi_item_discount ?? 0) > 0.0005 && row(tm('discountLine'), `-${fmt(Number(p.multi_item_discount))}`, '#198f41')}
                  {row(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Truck size={12} /> {t('delivery')}</span>,
                    <FreeDeliveryValue small />,
                  )}
                  {row(<strong style={{ color: '#0f172a' }}>{t('parcelTotal')}</strong>, <span style={{ color: '#0f172a' }}>{fmt(p.total)}</span>)}
                  <ShopSavings shop={p} style={{ marginTop: 4 }} />
                </div>
              </section>
            )
          })}

          {/* Delivery + payment */}
          <section style={{ border: '1px solid #f1f5f9', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} /> {t('deliveryTo')}
            </p>
            <p dir="auto" style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>{address.name}</p>
            <p style={{ fontSize: 12.5, color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={11} /> <span dir="ltr">{address.phones}</span></p>
            <p dir="auto" style={{ fontSize: 12.5, color: '#475569', margin: 0, lineHeight: 1.45 }}>{address.full}</p>
            {address.notes && <p dir="auto" style={{ fontSize: 12, color: '#64748b', margin: 0, fontStyle: 'italic' }}>{t('notes', { notes: address.notes })}</p>}
          </section>
          <section style={{ border: '1px solid #f1f5f9', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={13} /> {t('paymentMethod')}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#198f41' }}>{paymentLabel}</span>
          </section>
        </div>

        {/* Totals + actions: always visible */}
        <div className="ocm-foot" style={{ borderTop: '1px solid #f1f5f9', padding: '12px 20px calc(14px + env(safe-area-inset-bottom))', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {row(t('subtotal'), fmt(quote.subtotal))}
          {quote.discount_amount > 0 && row(t('couponDiscounts'), `-${fmt(quote.discount_amount)}`, '#059669')}
          {Number(quote.multi_item_discount ?? 0) > 0.0005 && row(tm('discountLine'), `-${fmt(Number(quote.multi_item_discount))}`, '#198f41')}
          {row(tm('deliveryLabel'), <FreeDeliveryValue small />)}
          {promoSavings > 0 && (
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#198f41', margin: 0 }}>{t('promoSavings', { amount: fmt(promoSavings) })}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, marginTop: 2, borderTop: '2px solid #f1f5f9' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{t('totalToPay')}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#db142e' }}>{fmt(quote.total)}</span>
          </div>

          {stage === 'review' && (
            <div className="ocm-actions" style={{ marginTop: 8 }}>
              <button type="button" className="ocm-btn" onClick={onEdit}
                style={{ border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151' }}>
                {t('edit')}
              </button>
              <button type="button" className="ocm-btn" ref={confirmRef} onClick={onConfirm}
                style={{ border: 'none', background: 'linear-gradient(135deg,#db142e,#b91c1c)', color: '#fff', boxShadow: '0 8px 22px rgba(219,20,46,0.28)' }}>
                <CheckCircle size={18} /> {t('confirm')}
              </button>
            </div>
          )}

          {stage === 'countdown' && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div aria-live="polite" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('countdown', { seconds })}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{t('countdownHint')}</p>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={t('countdown', { seconds })}
                style={{ height: 8, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#198f41,#22c55e)', borderRadius: 999, transition: 'width 0.1s linear' }} />
              </div>
              <button type="button" className="ocm-btn" ref={cancelRef} onClick={onCancelCountdown}
                style={{ flex: 'none', minHeight: 54, fontSize: 17, border: '2px solid #db142e', background: '#fff', color: '#db142e' }}>
                <X size={20} /> {t('cancel')}
              </button>
            </div>
          )}

          {stage === 'placing' && (
            <div aria-live="polite" style={{ marginTop: 8, minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15, fontWeight: 800, color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>
              <BrandLoader variant="inline" size={18} /> {t('placing')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
