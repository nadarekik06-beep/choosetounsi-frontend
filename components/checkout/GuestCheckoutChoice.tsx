'use client'

// Checkout without a login: "Continue as guest" (default, main) or
// "Log in / Sign up" (with Google). Never a forced redirect.

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserRound, LogIn, Check } from 'lucide-react'
import { loginWithGoogle } from '@/lib/auth'

export default function GuestCheckoutChoice({ returnTo, notice }: {
  /** Where to come back after login (the checkout, with its buy-now params). */
  returnTo: string
  /** Shown above the choice (e.g. "your session expired"). */
  notice?: string | null
}) {
  const t = useTranslations('checkout.guest')
  const [mode, setMode] = useState<'guest' | 'login'>('guest')
  const [googleLoading, setGoogleLoading] = useState(false)
  const login = `/auth/login?redirect=${encodeURIComponent(returnTo)}`
  const signup = `/auth/register?redirect=${encodeURIComponent(returnTo)}`

  const option = (active: boolean): React.CSSProperties => ({
    // flex-basis 210px: side by side on desktop, stacked on phones
    flex: '1 1 210px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
    border: `2px solid ${active ? '#dc2626' : '#e5e7eb'}`, background: active ? 'rgba(220,38,38,0.04)' : '#fff',
    cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit',
  })

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notice && (
        <div role="status" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: '#92400e' }}>
          {notice}
        </div>
      )}
      <div role="radiogroup" aria-label={t('chooseTitle')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" role="radio" aria-checked={mode === 'guest'} onClick={() => setMode('guest')} style={option(mode === 'guest')}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: mode === 'guest' ? '#dc2626' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {mode === 'guest' ? <Check size={18} color="#fff" /> : <UserRound size={18} color="#64748b" />}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('asGuest')}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{t('asGuestHint')}</span>
          </span>
        </button>
        <button type="button" role="radio" aria-checked={mode === 'login'} onClick={() => setMode('login')} style={option(mode === 'login')}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: mode === 'login' ? '#dc2626' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogIn size={18} color={mode === 'login' ? '#fff' : '#64748b'} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('loginOrSignup')}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{t('loginHint')}</span>
          </span>
        </button>
      </div>

      {mode === 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={login} style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '11px 14px', borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
              {t('login')}
            </Link>
            <Link href={signup} style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', color: '#0f172a', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
              {t('signup')}
            </Link>
          </div>
          <button type="button" disabled={googleLoading} onClick={() => { setGoogleLoading(true); loginWithGoogle(returnTo).catch(() => setGoogleLoading(false)) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: googleLoading ? 0.6 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {t('google')}
          </button>
          <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>{t('cartKept')}</p>
        </div>
      )}
    </div>
  )
}
