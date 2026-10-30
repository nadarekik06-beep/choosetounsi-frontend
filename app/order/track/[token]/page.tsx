'use client'

// Public tracking of a guest order (no account): /order/track/{token}
// Shows the order and each shop's parcel status — nothing more personal than
// a first name, the city and a masked phone.

import Link from 'next/link'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Package, Truck, CheckCircle, XCircle, Clock, MessageCircle, MapPin, Phone, UserPlus } from 'lucide-react'
import BrandLoader from '@/components/brand/BrandLoader'
import { useFormat } from '@/lib/i18n/useFormat'
import { API_BASE } from '@/lib/constants'
import { getToken, subscribeAuth } from '@/lib/auth'
import { isSignedInSnapshot, notSignedInOnServer } from '@/lib/guestCart'
import { currentLocale } from '@/lib/i18n/clientLocale'

interface TrackItem { name: string; variant: string | null; quantity: number; total: number; image: string | null }
interface TrackParcel { id: number; shop: string | null; status: string; step: string; delivery_status: string | null; items: TrackItem[] }
export interface TrackedOrder {
  order_number: string
  placed_at: string | null
  status: string
  payment_method: string
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  is_cancelled: boolean
  recipient: string | null
  phone_masked: string | null
  city: string | null
  parcels: TrackParcel[]
  claimed: boolean
  can_request_return: boolean
  whatsapp: string | null
}

const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'] as const
const STEP_INDEX: Record<string, number> = { placed: 0, confirmed: 1, packed: 2, shipped: 3, out_for_delivery: 3, delivered: 4 }
const STOPPED = ['cancelled', 'refused', 'refunded']

export default function TrackOrderPage() {
  const { token } = useParams<{ token: string }>()
  const t  = useTranslations('orderTrack')
  const ts = useTranslations('orderStatus')
  const { price, date } = useFormat()
  const fmt = (n: number) => price(n, { maximumFractionDigits: 3 })

  const [order, setOrder]     = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [claim, setClaim]     = useState<'idle' | 'busy' | 'done' | string>('idle')
  const signedIn = useSyncExternalStore(subscribeAuth, isSignedInSnapshot, notSignedInOnServer)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/orders/track/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json', 'Accept-Language': currentLocale() } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => { setOrder(json.data); setMissing(false) })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const addToAccount = async () => {
    setClaim('busy')
    try {
      const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(token)}/claim`, {
        method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}`, 'Accept-Language': currentLocale() },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) { setClaim('done'); load() } else setClaim(json.message ?? t('claimFailed'))
    } catch { setClaim(t('claimFailed')) }
  }

  if (loading && !order) {
    return <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrandLoader variant="section" /></div>
  }

  if (missing || !order) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <Package size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{t('notFoundTitle')}</p>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>{t('notFoundBody')}</p>
          <Link href="/order/track" style={{ color: '#dc2626', fontWeight: 800, fontSize: 14 }}>{t('findByNumber')}</Link>
        </div>
      </div>
    )
  }

  const waText = encodeURIComponent(t('returnMessage', { number: order.order_number }))
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16 }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '20px 16px 48px', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('title')}</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '2px 0 4px' }}><bdi dir="ltr">{order.order_number}</bdi></h1>
          {order.placed_at && <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>{t('placedOn', { date: date(order.placed_at, { dateStyle: 'medium' }) })}</p>}
        </div>

        <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12.5, color: '#475569' }}>
          {order.recipient && <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.recipient}</span>}
          {order.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {order.city}</span>}
          {order.phone_masked && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> <bdi dir="ltr">{order.phone_masked}</bdi></span>}
        </div>

        {order.parcels.map(p => {
          const stopped = STOPPED.includes(p.step)
          const idx = STEP_INDEX[p.step] ?? 0
          return (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <p dir="auto" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.shop ?? t('shop')}
                </p>
                <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                  color: stopped ? '#b91c1c' : p.step === 'delivered' ? '#047857' : '#1d4ed8',
                  background: stopped ? '#fef2f2' : p.step === 'delivered' ? '#ecfdf5' : '#eff6ff' }}>
                  {ts.has(p.status) ? ts(p.status) : p.status}
                </span>
              </div>

              {!stopped && (
                <ol aria-label={t('progress')} style={{ display: 'flex', listStyle: 'none', padding: 0, margin: '0 0 12px', gap: 4 }}>
                  {STEPS.map((s, i) => (
                    <li key={s} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                      <div style={{ height: 5, borderRadius: 3, background: i <= idx ? '#dc2626' : '#e5e7eb' }} />
                      <span style={{ display: 'block', fontSize: 10, marginTop: 4, color: i <= idx ? '#0f172a' : '#94a3b8', fontWeight: i === idx ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t(`steps.${s}`)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {stopped && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#b91c1c', margin: '0 0 12px' }}>
                  <XCircle size={15} /> {t(`stopped.${p.step}`)}
                </p>
              )}
              {p.delivery_status && !stopped && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', margin: '0 0 10px' }}>
                  <Truck size={14} /> {t('courier')}: <span dir="auto" style={{ fontWeight: 700 }}>{p.delivery_status}</span>
                </p>
              )}

              {p.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid #f8fafc' }}>
                  <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    {it.image ? <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} color="#cbd5e1" style={{ margin: 13 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p dir="auto" style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</p>
                    <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '2px 0 0' }}>{it.variant ? <><span dir="auto">{it.variant}</span> · </> : null}× {it.quantity}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(it.total)}</span>
                </div>
              ))}
            </div>
          )
        })}

        <div style={card}>
          {[['subtotal', order.subtotal], ['discount', -order.discount], ['delivery', order.shipping_fee]].filter(([k, v]) => k !== 'discount' || (v as number) < 0).map(([k, v]) => (
            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
              <span>{t(`money.${k}`)}</span><span style={{ fontWeight: 700, color: (v as number) < 0 ? '#059669' : '#0f172a' }}>{(v as number) < 0 ? '−' + fmt(-(v as number)) : fmt(v as number)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #f1f5f9', fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
            <span>{order.payment_method === 'cod' ? t('money.toPay') : t('money.total')}</span><span style={{ color: '#dc2626' }}>{fmt(order.total)}</span>
          </div>
          {order.payment_method === 'cod' && !order.is_cancelled && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#166534', margin: '10px 0 0' }}><Clock size={13} /> {t('codNote')}</p>
          )}
        </div>

        {/* Returns (guest, v1): WhatsApp with the order number, once something was delivered */}
        {order.can_request_return && order.whatsapp && (
          <a href={`https://wa.me/${order.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer"
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', border: '1px solid rgba(37,211,102,0.35)', background: 'rgba(37,211,102,0.06)' }}>
            <MessageCircle size={22} color="#128C7E" style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('returnTitle')}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#475569', marginTop: 2 }}>{t('returnBody')}</span>
            </span>
          </a>
        )}

        {/* Signed in with the account this order was placed for: add it on request */}
        {signedIn && !order.claimed && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}><UserPlus size={16} /> {t('claimTitle')}</p>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>{t('claimBody')}</p>
            {claim === 'done' ? (
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#047857', margin: 0 }}><CheckCircle size={15} /> {t('claimDone')}</p>
            ) : (
              <button type="button" onClick={addToAccount} disabled={claim === 'busy'}
                style={{ padding: '11px 14px', borderRadius: 12, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: claim === 'busy' ? 0.6 : 1 }}>
                {t('claimButton')}
              </button>
            )}
            {claim !== 'idle' && claim !== 'busy' && claim !== 'done' && <p role="alert" style={{ fontSize: 12.5, color: '#dc2626', margin: 0 }}>{claim}</p>}
          </div>
        )}
        {signedIn && order.claimed && claim === 'done' && (
          <Link href="/orders" style={{ textAlign: 'center', fontSize: 13.5, color: '#dc2626', fontWeight: 800 }}>{t('seeInOrders')}</Link>
        )}

        <Link href="/shop" style={{ textAlign: 'center', fontSize: 13.5, color: '#64748b', fontWeight: 700, textDecoration: 'none', padding: 8 }}>{t('continueShopping')}</Link>
      </div>
    </div>
  )
}
