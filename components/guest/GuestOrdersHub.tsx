'use client'

/**
 * "My orders" without an account (/track-order, and /orders when not signed in):
 *
 *   1. orders saved on this phone (device tokens from checkout or a lookup),
 *      shown without typing anything;
 *   2. find ONE order by its number + the phone used, or ALL orders of that
 *      phone — the latter still needs one order number (never the phone alone);
 *   3. a soft, optional "create an account" — never required.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Package, ChevronRight, UserPlus, Smartphone, X } from 'lucide-react'
import BrandLoader from '@/components/brand/BrandLoader'
import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { useFormat } from '@/lib/i18n/useFormat'
import { deviceGuestOrders, forgetGuestOrder, rememberGuestOrder, type DeviceGuestOrder } from '@/lib/guestCart'

interface DeviceRow extends DeviceGuestOrder {
  status: string
  total: number
  placed_at: string | null
  items: number
}

const RED = '#dc2626'
const headers = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': currentLocale() })

export default function GuestOrdersHub({ initialOrderNumber = '' }: { initialOrderNumber?: string }) {
  const t  = useTranslations('orderTrack')
  const ts = useTranslations('orderStatus')
  const router = useRouter()
  const { price, date } = useFormat()

  const [rows, setRows]       = useState<DeviceRow[] | null>(null)
  const [mode, setMode]       = useState<'one' | 'all'>('one')
  const [number, setNumber]   = useState(initialOrderNumber)
  const [phone, setPhone]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')

  /** Orders saved on this phone, refreshed from the server; dead links are forgotten. */
  const loadDevice = useCallback(async () => {
    const saved = deviceGuestOrders()
    const loaded = await Promise.all(saved.map(async (o): Promise<DeviceRow | null> => {
      try {
        const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(o.token)}`, { headers: headers() })
        if (res.status === 404) { forgetGuestOrder(o.token); return null }
        if (!res.ok) return { ...o, status: '', total: 0, placed_at: null, items: 0 }
        const d = (await res.json()).data
        const items = (d.parcels ?? []).reduce((n: number, p: { items: { quantity: number }[] }) =>
          n + p.items.reduce((m, i) => m + i.quantity, 0), 0)
        return { ...o, number: d.order_number, status: d.status, total: d.total, placed_at: d.placed_at, items }
      } catch {
        return { ...o, status: '', total: 0, placed_at: null, items: 0 }
      }
    }))
    setRows(loaded.filter((r): r is DeviceRow => r !== null))
  }, [])

  useEffect(() => { loadDevice() }, [loadDevice])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (!number.trim() || !phone.trim()) { setError(t('lookup.required')); return }
    setBusy(true)
    try {
      const body = JSON.stringify({ order_number: number.trim(), phone: phone.trim() })
      const res  = await fetch(`${API_BASE}/orders/track${mode === 'all' ? '/all' : ''}`, { method: 'POST', headers: headers(), body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.message ?? t('notFoundBody')); setBusy(false); return }

      if (mode === 'one' && json.data?.tracking_token) {
        rememberGuestOrder(json.data.tracking_token, json.data.order_number)
        router.push(`/order/track/${json.data.tracking_token}`)
        return
      }
      const list = (json.data ?? []) as { tracking_token: string; order_number: string }[]
      // Oldest first, so the newest ends up on top of the device list
      ;[...list].reverse().forEach(o => rememberGuestOrder(o.tracking_token, o.order_number))
      setNotice(t('hub.foundAll', { count: list.length }))
      setNumber(''); setPhone('')
      await loadDevice()
    } catch {
      setError(t('lookup.failed'))
    }
    setBusy(false)
  }

  const forget = (token: string) => {
    forgetGuestOrder(token)
    setRows(r => (r ?? []).filter(o => o.token !== token))
  }

  const card: React.CSSProperties  = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16 }
  const input: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px', fontSize: 16, fontFamily: 'inherit', color: '#0f172a', outline: 'none', background: '#fff', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6 }
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
    background: active ? '#fff' : 'transparent', color: active ? '#0f172a' : '#64748b', boxShadow: active ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
  })

  return (
    <div style={{ minHeight: '80vh', background: '#f9fafb', padding: '24px 16px 48px', fontFamily: 'var(--ct-barlow), sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Package size={26} color={RED} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>{t('hub.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{t('hub.subtitle')}</p>
        </div>

        {/* 1 — Orders saved on this phone */}
        {rows === null ? (
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
            <BrandLoader variant="inline" size={16} /> {t('hub.loadingOrders')}
          </div>
        ) : rows.length > 0 && (
          <section aria-labelledby="device-orders" style={{ ...card, padding: 8 }}>
            <p id="device-orders" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 8px 8px' }}>
              <Smartphone size={14} /> {t('hub.deviceTitle')}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map(o => (
                <li key={o.token} style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #f8fafc' }}>
                  <Link href={`/order/track/${o.token}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}><bdi dir="ltr">{o.number}</bdi></span>
                      <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {[o.placed_at && date(o.placed_at, { dateStyle: 'medium' }), o.items > 0 && t('hub.items', { count: o.items }), o.total > 0 && price(o.total, { maximumFractionDigits: 3 })].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {o.status && (
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, color: '#1d4ed8', background: '#eff6ff' }}>
                        {ts.has(o.status) ? ts(o.status) : o.status}
                      </span>
                    )}
                    <ChevronRight size={16} color="#cbd5e1" className="rtl-flip"style={{ flexShrink: 0 }} />
                  </Link>
                  <button type="button" onClick={() => forget(o.token)} aria-label={t('hub.forget')} title={t('hub.forget')}
                    style={{ flexShrink: 0, width: 36, height: 36, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', borderRadius: 8 }}>
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 2 — Find one order / all my orders */}
        <form onSubmit={submit} noValidate style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>{t('hub.lookupTitle')}</p>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>{mode === 'all' ? t('hub.allBody') : t('hub.lookupBody')}</p>
          </div>
          <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 12 }}>
            <button type="button" role="tab" aria-selected={mode === 'one'} onClick={() => { setMode('one'); setError('') }} style={tab(mode === 'one')}>{t('hub.modeOne')}</button>
            <button type="button" role="tab" aria-selected={mode === 'all'} onClick={() => { setMode('all'); setError('') }} style={tab(mode === 'all')}>{t('hub.modeAll')}</button>
          </div>
          <div>
            <label htmlFor="hub-number" style={label}>{t('lookup.number')}</label>
            <input id="hub-number" dir="ltr" autoCapitalize="characters" autoComplete="off" value={number}
              onChange={e => setNumber(e.target.value)} placeholder={t('hub.orderHint')} style={input} />
          </div>
          <div>
            <label htmlFor="hub-phone" style={label}>{t('lookup.phone')}</label>
            <input id="hub-phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phone}
              onChange={e => setPhone(e.target.value)} placeholder="22 123 456" style={input} />
          </div>
          {error && <p role="alert" style={{ fontSize: 12.5, color: RED, fontWeight: 600, margin: 0 }}>{error}</p>}
          {notice && <p role="status" style={{ fontSize: 12.5, color: '#047857', fontWeight: 700, margin: 0 }}>{notice}</p>}
          <button type="submit" disabled={busy}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', borderRadius: 12, border: 'none', background: busy ? '#e5e7eb' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: busy ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 15, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {busy ? <BrandLoader variant="inline" size={16} /> : <Search size={17} />} {mode === 'all' ? t('hub.submitAll') : t('lookup.submit')}
          </button>
        </form>

        {/* 3 — Optional account, never forced */}
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fafafa' }}>
          <UserPlus size={20} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', margin: '0 0 3px' }}>{t('hub.accountTitle')}</p>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 8px', lineHeight: 1.5 }}>{t('hub.accountBody')}</p>
            <p style={{ fontSize: 12.5, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
              <Link href="/auth/register?redirect=/orders" style={{ color: RED, fontWeight: 800 }}>{t('hub.accountCta')}</Link>
              <span style={{ color: '#94a3b8' }}>{t('hub.haveAccount')} <Link href="/auth/login?redirect=/orders" style={{ color: '#0f172a', fontWeight: 800 }}>{t('hub.login')}</Link></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
