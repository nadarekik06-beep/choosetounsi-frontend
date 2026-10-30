'use client'

// Confirmation of a guest order: number + total, "the delivery agent will call
// you on …", the tracking link, and the optional one-step account.

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle, Phone, Package, Copy, Check, UserPlus, LogIn, Mail } from 'lucide-react'
import { register } from '@/lib/auth'

export interface GuestSuccess {
  order_number: string
  total: number
  tracking_token: string
  phone: string
  email: string | null
  recipient_name: string
  has_account: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function prettyPhone(p: string): string {
  const d = p.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '')
  return d.length === 8 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : p
}

export default function GuestOrderSuccess({ order, fmt }: { order: GuestSuccess; fmt: (n: number) => string }) {
  const t  = useTranslations('checkout.guest')
  const ts = useTranslations('checkout.success')
  const router = useRouter()
  const trackPath = `/order/track/${order.tracking_token}`
  const [copied, setCopied] = useState(false)

  const [email, setEmail]       = useState(order.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + trackPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked: the link stays visible */ }
  }

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) { setError(t('account.emailInvalid')); return }
    if (password.length < 8) { setError(t('account.passwordShort')); return }
    setBusy(true)
    try {
      const res = await register({
        name: order.recipient_name, email: email.trim(), password, password_confirmation: password,
        guest_tracking_token: order.tracking_token,
      })
      router.push(`/auth/verify-email?email=${encodeURIComponent(res.email)}`)
    } catch (err) {
      setError((err as { message?: string }).message ?? t('account.failed'))
      setBusy(false)
    }
  }

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16, textAlign: 'start' }
  const input: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 12px', fontSize: 15, fontFamily: 'inherit', color: '#0f172a', outline: 'none', background: '#fff', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', justifyContent: 'center', padding: '28px 16px 48px', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <CheckCircle size={34} color="#10b981" />
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>{ts('title')}</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
            {ts.rich('orderLine', {
              number: order.order_number,
              total: fmt(order.total),
              b: chunks => <strong style={{ color: '#0f172a' }}>{chunks}</strong>,
              r: chunks => <strong style={{ color: '#dc2626' }}>{chunks}</strong>,
            })}
          </p>
        </div>

        {/* The courier calls to confirm */}
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(25,143,65,0.06)', border: '1px solid rgba(25,143,65,0.25)' }}>
          <Phone size={20} color="#198f41" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#14532d', margin: 0 }}>
              {t.rich('willCall', { phone: prettyPhone(order.phone), b: c => <bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>{c}</bdi> })}
            </p>
            <p style={{ fontSize: 12.5, color: '#166534', margin: '4px 0 0' }}>{t('codReminder', { total: fmt(order.total) })}</p>
          </div>
        </div>

        {/* Tracking link */}
        <div style={card}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            <Package size={17} color="#dc2626" /> {t('trackTitle')}
          </p>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px' }}>{t('trackHint')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={trackPath} style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: '12px 14px', borderRadius: 12, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
              {t('trackButton')}
            </Link>
            <button type="button" onClick={copyLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />} {copied ? t('copied') : t('copyLink')}
            </button>
          </div>
          {order.email && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', margin: '10px 0 0' }}>
              <Mail size={13} /> {t('emailSent')} <bdi dir="ltr" style={{ fontWeight: 700 }}>{order.email}</bdi>
            </p>
          )}
        </div>

        {/* Account: never forced */}
        {order.has_account ? (
          <div style={card}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              <LogIn size={17} color="#0f172a" /> {t('existing.title')}
            </p>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px' }}>{t('existing.body')}</p>
            <Link href={`/auth/login?redirect=${encodeURIComponent(trackPath)}`} style={{ display: 'block', textAlign: 'center', padding: '11px 14px', borderRadius: 12, background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
              {t('existing.login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={createAccount} style={card} noValidate>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              <UserPlus size={17} color="#dc2626" /> {t('account.title')}
            </p>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px' }}>{t('account.body')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!order.email && (
                <input type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('account.emailPlaceholder')} aria-label={t('account.emailPlaceholder')} style={input} />
              )}
              <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t('account.passwordPlaceholder')} aria-label={t('account.passwordPlaceholder')} style={input} />
              {error && <p role="alert" style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={busy} style={{ padding: '12px 14px', borderRadius: 12, border: 'none', background: busy ? '#e5e7eb' : '#0f172a', color: busy ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {busy ? t('account.creating') : t('account.create')}
              </button>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>{t('account.optional')}</p>
            </div>
          </form>
        )}

        <Link href="/shop" style={{ textAlign: 'center', fontSize: 13.5, color: '#64748b', fontWeight: 700, textDecoration: 'none', padding: 8 }}>
          {t('continueShopping')}
        </Link>
      </div>
    </div>
  )
}
