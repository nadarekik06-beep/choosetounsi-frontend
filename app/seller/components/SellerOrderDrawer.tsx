// app/seller/components/SellerOrderDrawer.tsx
// Side drawer explaining one of the seller's orders: products + "Your earnings".
// Fetched only when opened: GET /seller/earnings/orders/{id}/details ({id} = seller order id).
'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Package, User, MapPin, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import api from '@/lib/sellerApi'
import { useTheme } from '../SellerShell'
import { useFormat } from '@/lib/i18n/useFormat'
import { useStatusLabel } from '@/lib/i18n/useStatusLabel'
import { useWilayaLabel } from '@/lib/i18n/wilayas'

const RED   = '#db142e'
const GREEN = '#198f41'

const STATUS_COLORS: Record<string, string> = {
  pending:          '#f59e0b',
  confirmed:        '#3b82f6',
  completed:        '#10b981',
  delivered:        '#14b8a6',
  cancelled:        '#ef4444',
  refunded:         '#a855f7',
  out_for_delivery: '#8b5cf6',
}

const PAYOUT_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  ready:     '#3b82f6',
  paid:      '#10b981',
  cancelled: '#ef4444',
}

// Codes that have a label in seller.orders.methods / seller.earnings.payout
const METHODS = ['cod', 'card', 'd17', 'wallet'] as const
const PAYOUTS = ['pending', 'ready', 'paid', 'cancelled', 'draft', 'processing'] as const
const isMethod = (v: string): v is typeof METHODS[number] => (METHODS as readonly string[]).includes(v)
const isPayout = (v: string): v is typeof PAYOUTS[number] => (PAYOUTS as readonly string[]).includes(v)

interface DrawerItem {
  id: number
  product_name: string | null
  variant_label: string | null
  variant_options: { name: string; value: string; color_hex?: string | null }[]
  image_url: string | null
  quantity: number
  unit_price: number
  line_total: number
  discount_amount: number
  paid_total: number
  product_deleted: boolean
  variant_deleted: boolean
}

interface DrawerData {
  id: number
  order_number: string | null
  created_at: string
  status: string
  payment_method: string | null
  payout_status: string | null
  paid_out_at: string | null
  coupon_code: string | null
  items_count: number
  customer: { name: string | null; wilaya: string | null }
  items: DrawerItem[]
  timeline: { key: 'placed' | 'delivered' | 'cash_collected' | 'paid_out'; at: string }[]
  earnings: {
    gross: number
    subtotal_before_coupon: number
    discount_amount: number
    commission_amount: number
    commission_rate: number | null
    shipping_paid_by: 'you' | 'customer' | 'platform' | null
    shipping_charge: number
    adjustment: number
    net: number
  }
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
      background: `${color}18`, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {children}
    </span>
  )
}

function Thumb({ src, alt, dark }: { src: string | null; alt: string; dark: boolean }) {
  const [broken, setBroken] = useState(false)
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src && !broken
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Package size={16} color="#94a3b8" />}
    </div>
  )
}

export default function SellerOrderDrawer({ sellerOrderId, orderNumber, onClose }: {
  sellerOrderId: number
  orderNumber?: string | null
  onClose: () => void
}) {
  const { dark } = useTheme()
  const t        = useTranslations('seller.orderDrawer')
  const tOrders  = useTranslations('seller.orders')
  const tPayout  = useTranslations('seller.earnings.payout')
  const { price, date, isRtl } = useFormat()
  const statusLabel = useStatusLabel()
  const wilaya      = useWilayaLabel()
  const fmt = (v: number | string) => price(v, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  const [data,    setData]    = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<'notFound' | 'loadFailed' | null>(null)

  // Theme tokens (same values as the Earnings page)
  const panelBg   = dark ? '#0f1623' : '#f8fafc'
  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMain  = dark ? '#f1f5f9' : '#0f172a'
  const textSoft  = dark ? '#94a3b8' : '#475569'
  const textMuted = dark ? '#64748b' : '#94a3b8'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ data: DrawerData }>(`/seller/earnings/orders/${sellerOrderId}/details`)
      setData(res?.data ?? null)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 404 ? 'notFound' : 'loadFailed')
    } finally {
      setLoading(false)
    }
  }, [sellerOrderId])

  useEffect(() => { load() }, [load])

  // ESC closes; lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const card: React.CSSProperties = { background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 14 }
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted, margin: '0 0 8px',
  }

  const e = data?.earnings
  const method = data?.payment_method ?? null
  const methodLabel = method
    ? (isMethod(method) ? tOrders(`methods.${method}`) : method.toUpperCase())
    : '—'
  const payout = data?.payout_status ?? 'pending'
  const payoutLabel = isPayout(payout) ? tPayout(payout) : payout

  // One step of the "Your earnings" breakdown
  const Step = ({ title, note, value, color, strong }: {
    title: string; note: string; value?: string; color?: string; strong?: boolean
  }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: `1px solid ${border}` }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: strong ? 13 : 12, fontWeight: 800, color: textMain, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11, color: textMuted, margin: '3px 0 0', lineHeight: 1.45 }}>{note}</p>
      </div>
      {value && (
        <p style={{ fontSize: strong ? 16 : 13, fontWeight: 900, color: color ?? textMain, margin: 0, whiteSpace: 'nowrap', direction: 'ltr' }}>
          {value}
        </p>
      )}
    </div>
  )

  const skel = (w: string | number, h = 12, mb = 8) => (
    <div className="so-skel" style={{ width: w, height: h, borderRadius: 6, marginBottom: mb }} />
  )

  return (
    <>
      {/* Backdrop — click outside closes */}
      <div onClick={onClose} className="so-backdrop" style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: dark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)',
      }} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className={isRtl ? 'so-drawer so-rtl' : 'so-drawer'}
        style={{
          position: 'fixed', top: 0, bottom: 0, insetInlineEnd: 0, zIndex: 201,
          width: '100%', maxWidth: 520, background: panelBg,
          borderInlineStart: `1px solid ${border}`,
          boxShadow: '0 0 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '16px 20px', borderBottom: `1px solid ${border}`, background: cardBg,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...label, margin: 0 }}>{t('title')}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: textMain, margin: '2px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {data?.order_number ?? orderNumber ?? '…'}
            </p>
          </div>
          <button onClick={onClose} aria-label={t('close')} title={t('close')} style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
            background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: textSoft,
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-busy="true">
              <div style={card}>{skel('45%', 14)}{skel('70%')}{skel('55%', 12, 0)}</div>
              <div style={card}>{skel('35%')}{skel('60%', 12, 0)}</div>
              <div style={card}>
                {[0, 1].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
                    <div className="so-skel" style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>{skel('75%')}{skel('40%')}{skel('30%', 12, 0)}</div>
                  </div>
                ))}
              </div>
              <div style={card}>{skel('100%')}{skel('100%')}{skel('100%')}{skel('100%', 12, 0)}</div>
            </div>
          ) : error ? (
            <div style={{ ...card, textAlign: 'center', padding: '36px 20px' }}>
              <AlertCircle size={28} color={RED} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: '0 0 14px' }}>{t(error)}</p>
              <button onClick={load} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                padding: '8px 14px', borderRadius: 9, border: `1px solid ${border}`,
                background: 'transparent', color: textMain, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              }}>
                <RefreshCw size={13} /> {t('retry')}
              </button>
            </div>
          ) : data && e && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Order header */}
              <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div>
                  <p style={label}>{t('date')}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: 0 }}>{date(data.created_at, 'datetime')}</p>
                </div>
                <div>
                  <p style={label}>{t('status')}</p>
                  <Chip color={STATUS_COLORS[data.status] ?? '#94a3b8'}>{statusLabel(data.status)}</Chip>
                </div>
                <div>
                  <p style={label}>{t('payment')}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: 0 }}>{methodLabel}</p>
                </div>
                <div>
                  <p style={label}>{t('payout')}</p>
                  <Chip color={PAYOUT_COLORS[payout] ?? '#94a3b8'}>{payoutLabel}</Chip>
                  {payout === 'paid' && data.paid_out_at && (
                    <p style={{ fontSize: 10, color: textMuted, margin: '5px 0 0' }}>{t('paidOn', { date: date(data.paid_out_at, 'medium') })}</p>
                  )}
                </div>
              </div>

              {/* Customer — only what the seller already sees for fulfilment */}
              <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <p style={label}>{t('customer')}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: textMain, margin: 0 }}>
                    <User size={13} color={textMuted} /> {data.customer.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p style={label}>{t('wilaya')}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: textMain, margin: 0 }}>
                    <MapPin size={13} color={textMuted} /> {data.customer.wilaya ? wilaya(data.customer.wilaya) : '—'}
                  </p>
                </div>
              </div>

              {/* Products — this seller's items only */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <p style={label}>{t('products')}</p>
                  <span style={{ fontSize: 10, fontWeight: 800, color: textSoft }}>{tOrders('itemCount', { count: data.items_count })}</span>
                </div>
                {data.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: textMuted }}>
                    <Package size={22} style={{ marginBottom: 6 }} />
                    <p style={{ fontSize: 12, margin: 0 }}>{t('empty')}</p>
                  </div>
                ) : data.items.map(item => {
                  const name = item.product_name || '—'
                  const discounted = item.discount_amount > 0
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: `1px solid ${border}` }}>
                      <Thumb src={item.image_url} alt={name} dark={dark} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: textMain, margin: 0, wordBreak: 'break-word' }}>{name}</p>
                          {item.product_deleted && <Chip color="#94a3b8">{t('productDeleted')}</Chip>}
                          {item.variant_deleted && <Chip color="#94a3b8">{t('variantDeleted')}</Chip>}
                        </div>
                        {item.variant_options.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                            {item.variant_options.map((o, i) => (
                              <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                                background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', color: textSoft,
                              }}>
                                {o.color_hex && <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color_hex, border: `1px solid ${border}` }} />}
                                {o.name}: {o.value}
                              </span>
                            ))}
                          </div>
                        ) : item.variant_label ? (
                          <p style={{ fontSize: 10, color: textSoft, margin: '0 0 6px' }}>{item.variant_label}</p>
                        ) : null}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: textMuted, direction: 'ltr' }}>{item.quantity} × {fmt(item.unit_price)}</span>
                          <div style={{ textAlign: 'end' }}>
                            {discounted && (
                              <p style={{ fontSize: 10, color: textMuted, margin: 0, textDecoration: 'line-through', direction: 'ltr' }}>{fmt(item.line_total)}</p>
                            )}
                            <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0, direction: 'ltr' }}>{fmt(item.paid_total)}</p>
                            {discounted && (
                              <p style={{ fontSize: 10, color: '#f59e0b', margin: 0, fontWeight: 700 }}>{t('couponSaving', { amount: fmt(item.discount_amount) })}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Your earnings — same frozen values as the Earnings row */}
              <div style={card}>
                <p style={label}>{t('earnings')}</p>
                <Step
                  title={t('sale')}
                  note={e.discount_amount > 0
                    ? t('saleNoteCoupon', { code: data.coupon_code || 'none', amount: fmt(e.discount_amount) })
                    : t('saleNote')}
                  value={fmt(e.gross)}
                />
                <Step
                  title={e.commission_rate != null
                    ? t('commissionRate', { rate: Number(e.commission_rate).toFixed(2).replace(/\.?0+$/, '') })
                    : t('commission')}
                  note={t('commissionNote')}
                  value={`−${fmt(e.commission_amount)}`}
                  color={RED}
                />
                {e.shipping_paid_by === 'you' || e.shipping_charge > 0 ? (
                  <Step title={t('shippingYou')} note={t('shippingYouNote')} value={`−${fmt(e.shipping_charge)}`} color="#b45309" />
                ) : (
                  <Step
                    title={t('shipping')}
                    note={e.shipping_paid_by === 'customer' ? t('shippingCustomer')
                      : e.shipping_paid_by === 'platform' ? t('shippingPlatform')
                      : t('shippingNone')}
                  />
                )}
                {e.adjustment !== 0 && (
                  <Step
                    title={t('adjustment')}
                    note={t('adjustmentNote')}
                    value={`${e.adjustment > 0 ? '+' : '−'}${fmt(Math.abs(e.adjustment))}`}
                    color={textSoft}
                  />
                )}
                <div style={{
                  marginTop: 6, padding: '12px 14px', borderRadius: 12,
                  background: `${GREEN}14`, border: `1px solid ${GREEN}40`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 900, color: textMain, margin: 0 }}>= {t('receive')}</p>
                    <p style={{ fontSize: 11, color: textMuted, margin: '3px 0 0' }}>{t('receiveNote')}</p>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: GREEN, margin: 0, whiteSpace: 'nowrap', direction: 'ltr' }}>{fmt(e.net)}</p>
                </div>
              </div>

              {/* Timeline — existing timestamps only */}
              {data.timeline.length > 0 && (
                <div style={card}>
                  <p style={label}>{t('timeline')}</p>
                  {data.timeline.map((step, i) => (
                    <div key={step.key} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: i < data.timeline.length - 1 ? 14 : 0 }}>
                      {i < data.timeline.length - 1 && (
                        <span style={{ position: 'absolute', insetInlineStart: 7, top: 18, bottom: 0, width: 2, background: `${GREEN}40` }} />
                      )}
                      <CheckCircle size={16} color={GREEN} style={{ flexShrink: 0, background: cardBg, borderRadius: '50%' }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: 0 }}>{t(`steps.${step.key}`)}</p>
                        <p style={{ fontSize: 10, color: textMuted, margin: '2px 0 0' }}>{date(step.at, 'datetime')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <style>{`
        .so-drawer { animation: soIn .22s ease-out; }
        .so-drawer.so-rtl { animation-name: soInRtl; }
        .so-backdrop { animation: soFade .18s ease-out; }
        @keyframes soIn    { from { transform: translateX(100%) }  to { transform: translateX(0) } }
        @keyframes soInRtl { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes soFade  { from { opacity: 0 } to { opacity: 1 } }
        .so-skel {
          background: linear-gradient(90deg, ${dark ? 'rgba(255,255,255,0.05)' : '#eef2f7'} 25%, ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} 50%, ${dark ? 'rgba(255,255,255,0.05)' : '#eef2f7'} 75%);
          background-size: 200% 100%;
          animation: soShimmer 1.2s linear infinite;
        }
        @keyframes soShimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
        @media (prefers-reduced-motion: reduce) { .so-drawer, .so-backdrop, .so-skel { animation: none; } }
      `}</style>
    </>
  )
}
