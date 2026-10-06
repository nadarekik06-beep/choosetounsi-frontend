'use client'

/**
 * Marketing e-mail consent (opt-in). Signed-in users only.
 *   variant="card"    account settings (profile page)
 *   variant="footer"  compact newsletter box in the site footer
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { API_BASE } from '@/lib/constants'
import { isAuthenticated } from '@/lib/auth'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { BusyLabel } from '@/components/brand/BrandLoader'

function headers(): Record<string, string> {
  let token: string | null = null
  try { token = localStorage.getItem('ct_auth_token') } catch { /* storage blocked */ }
  return {
    Accept: 'application/json', 'Content-Type': 'application/json', 'Accept-Language': currentLocale(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function MarketingConsentToggle({ variant = 'card' }: { variant?: 'card' | 'footer' }) {
  const t = useTranslations('marketingConsent')
  const [signedIn, setSignedIn] = useState(false)
  const [optIn, setOptIn]       = useState<boolean | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) return
    setSignedIn(true)
    fetch(`${API_BASE}/account/marketing-consent`, { headers: headers() })
      .then(r => (r.ok ? r.json() : null)).then(j => setOptIn(j ? !!j.data.opt_in : null)).catch(() => {})
  }, [])

  if (!signedIn || optIn === null) return null

  const save = async (value: boolean) => {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch(`${API_BASE}/account/marketing-consent`, { method: 'POST', headers: headers(), body: JSON.stringify({ opt_in: value }) })
      if (res.ok) { setOptIn(value); setSaved(true) }
    } catch { /* keep the old value */ } finally {
      setSaving(false)
    }
  }

  if (variant === 'footer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'inherit' }}>{t('footerTitle')}</p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.75, lineHeight: 1.5 }}>{optIn ? t('footerOn') : t('footerOff')}</p>
        <button type="button" onClick={() => save(!optIn)} disabled={saving} aria-busy={saving || undefined} style={{
          alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
          fontFamily: 'inherit', background: optIn ? 'rgba(255,255,255,0.12)' : '#db142e', color: '#fff', opacity: saving ? 0.6 : 1,
        }}>
          <BusyLabel busy={saving} size={14}>{optIn ? t('unsubscribe') : t('subscribe')}</BusyLabel>
        </button>
      </div>
    )
  }

  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 16,
      border: '1px solid #eee', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <input type="checkbox" checked={optIn} disabled={saving} onChange={e => save(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 2, accentColor: '#db142e', flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#111827' }}>{t('title')}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>{t('description')}</span>
        {saved && <span role="status" style={{ display: 'block', fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 700 }}>{t('saved')}</span>}
      </span>
    </label>
  )
}
