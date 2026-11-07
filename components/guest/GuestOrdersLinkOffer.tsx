'use client'

/**
 * Signed in, with guest orders saved on this phone that were placed with the
 * account's phone (or verified e-mail): offer to add them — on a tap only,
 * never automatically, and "Not now" hides it for this visit. The device
 * tokens are the proof; the phone alone is never enough.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, CheckCircle } from 'lucide-react'
import { API_BASE } from '@/lib/constants'
import { getToken } from '@/lib/auth'
import { currentLocale } from '@/lib/i18n/clientLocale'
import { deviceGuestOrders } from '@/lib/guestCart'

export default function GuestOrdersLinkOffer({ onLinked }: { onLinked?: () => void }) {
  const t = useTranslations('orderTrack.hub')
  const [count, setCount]   = useState(0)
  const [state, setState]   = useState<'idle' | 'busy' | 'done' | 'hidden'>('idle')
  const [linked, setLinked] = useState(0)

  const call = (path: string) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${getToken()}`, 'Accept-Language': currentLocale() },
    body: JSON.stringify({ tokens: deviceGuestOrders().map(o => o.token) }),
  })

  useEffect(() => {
    if (!getToken() || deviceGuestOrders().length === 0) return
    call('/orders/guest/claimable')
      .then(r => (r.ok ? r.json() : null))
      .then(json => setCount(Array.isArray(json?.data) ? json.data.length : 0))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state === 'hidden' || (count === 0 && state !== 'done')) return null

  const link = async () => {
    setState('busy')
    try {
      const json = await call('/orders/guest/claim').then(r => r.json())
      setLinked(Number(json?.claimed ?? 0))
      setState('done')
      onLinked?.()
    } catch { setState('idle') }
  }

  return (
    <div style={{ maxWidth: 900, margin: '16px auto 0', padding: '0 16px', fontFamily: 'var(--ct-barlow), sans-serif' }}>
      <div role="region" aria-label={t('linkButton')} style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {state === 'done' ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 13.5, fontWeight: 700, color: '#047857' }}>
            <CheckCircle size={17} /> {t('linkDone', { count: linked })}
          </p>
        ) : (
          <>
            <UserPlus size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 3px' }}>{t('linkTitle', { count })}</p>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>{t('linkBody')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={link} disabled={state === 'busy'}
                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: state === 'busy' ? 0.6 : 1 }}>
                  {t('linkButton')}
                </button>
                <button type="button" onClick={() => setState('hidden')}
                  style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('linkLater')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
