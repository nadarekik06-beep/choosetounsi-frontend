'use client'

// Lost the tracking link? Find a guest order by its number + the phone used.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Package } from 'lucide-react'
import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { lastGuestOrder } from '@/lib/guestCart'

export default function FindOrderPage() {
  const t = useTranslations('orderTrack')
  const router = useRouter()
  const [number, setNumber] = useState('')
  const [phone, setPhone]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')
  const [last, setLast]     = useState<{ token: string; number: string } | null>(null)

  useEffect(() => { setLast(lastGuestOrder()) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!number.trim() || !phone.trim()) { setError(t('lookup.required')); return }
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': currentLocale() },
        body: JSON.stringify({ order_number: number.trim(), phone: phone.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.data?.tracking_token) {
        router.push(`/order/track/${json.data.tracking_token}`)
        return
      }
      setError(json.message ?? t('notFoundBody'))
    } catch {
      setError(t('lookup.failed'))
    }
    setBusy(false)
  }

  const input: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 12px', fontSize: 16, fontFamily: 'inherit', color: '#0f172a', outline: 'none', background: '#fff', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ minHeight: '80vh', background: '#f9fafb', padding: '28px 16px 48px', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Package size={26} color="#dc2626" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>{t('lookup.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{t('lookup.body')}</p>
        </div>

        {last && (
          <Link href={`/order/track/${last.token}`} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: '12px 14px', fontSize: 13.5, fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
            {t('lookup.lastOrder')} <bdi dir="ltr" style={{ color: '#dc2626' }}>{last.number}</bdi>
          </Link>
        )}

        <form onSubmit={submit} noValidate style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="track-number" style={label}>{t('lookup.number')}</label>
            <input id="track-number" dir="ltr" autoCapitalize="characters" autoComplete="off" value={number} onChange={e => setNumber(e.target.value)} placeholder="ORD-XXXXXXXX" style={input} />
          </div>
          <div>
            <label htmlFor="track-phone" style={label}>{t('lookup.phone')}</label>
            <input id="track-phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="22 123 456" style={input} />
          </div>
          {error && <p role="alert" style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', borderRadius: 12, border: 'none', background: busy ? '#e5e7eb' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: busy ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 15, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            <Search size={17} /> {t('lookup.submit')}
          </button>
        </form>
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>{t('lookup.accountHint')} <Link href="/orders" style={{ color: '#dc2626', fontWeight: 700 }}>{t('lookup.myOrders')}</Link></p>
      </div>
    </div>
  )
}
