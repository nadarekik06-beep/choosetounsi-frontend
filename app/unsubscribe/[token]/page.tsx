'use client'

/**
 * /unsubscribe/[token] — target of the "Se désabonner" link in marketing e-mails.
 * Opening the page changes nothing (mail scanners and link previews open links):
 * it only checks the link (GET /api/unsubscribe/{token}); the button POSTs
 * /api/unsubscribe/{token}. Mail clients' one-click unsubscribe (List-Unsubscribe
 * header, RFC 8058) goes straight to the backend and does not use this page.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MailX, MailCheck, Link2Off } from 'lucide-react'
import Navbar from '@/app/components/layout/Navbar'
import { apiUrl } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import '@/components/legal/legal.css'

type State = 'checking' | 'ready' | 'sending' | 'done' | 'invalid' | 'error'

const TOKEN = /^[A-Za-z0-9]{40}$/

export default function UnsubscribePage() {
  const t = useTranslations('unsubscribe')
  const params = useParams<{ token: string }>()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [state, setState] = useState<State>(TOKEN.test(token) ? 'checking' : 'invalid')

  useEffect(() => {
    if (!TOKEN.test(token)) return
    let cancelled = false
    fetch(apiUrl(`/unsubscribe/${token}`), { headers: { Accept: 'application/json', 'Accept-Language': currentLocale() } })
      .then(res => { if (!cancelled) setState(res.ok ? 'ready' : res.status === 404 ? 'invalid' : 'error') })
      .catch(() => { if (!cancelled) setState('ready') })   // the button will tell
    return () => { cancelled = true }
  }, [token])

  async function confirm() {
    setState('sending')
    try {
      const res = await fetch(apiUrl(`/unsubscribe/${token}`), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
      })
      setState(res.ok ? 'done' : res.status === 404 ? 'invalid' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <Navbar />
      <main className="lg">
        <div className="lg-wrap" style={{ paddingBlock: 'clamp(40px, 8vw, 80px)' }}>
          <div className="lg-center">
            <div className="lg-card" aria-live="polite" aria-busy={state === 'checking' || state === 'sending'}>
              {(state === 'checking' || state === 'ready' || state === 'sending' || state === 'error') && (
                <>
                  <span className="lg-badge lg-badge--red"><MailX size={26} aria-hidden="true" /></span>
                  <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>{t('title')}</h1>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ct-muted)' }}>{t('body')}</p>
                  {state === 'error' && <div className="lg-alert lg-alert--err" role="alert" style={{ marginTop: 16 }}>{t('error')}</div>}
                  <div className="lg-actions">
                    <button type="button" className="lg-btn" onClick={confirm} disabled={state !== 'ready' && state !== 'error'}>
                      {state === 'sending' ? t('sending') : state === 'checking' ? t('checking') : t('confirm')}
                    </button>
                    <Link href="/" className="lg-btn lg-btn--ghost">{t('keep')}</Link>
                  </div>
                </>
              )}

              {state === 'done' && (
                <>
                  <span className="lg-badge lg-badge--green"><MailCheck size={26} aria-hidden="true" /></span>
                  <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>{t('doneTitle')}</h1>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ct-muted)' }}>{t('doneBody')}</p>
                  <div className="lg-actions">
                    <Link href="/" className="lg-btn">{t('backToShop')}</Link>
                    <Link href="/profile?tab=settings" className="lg-btn lg-btn--ghost">{t('manage')}</Link>
                  </div>
                </>
              )}

              {state === 'invalid' && (
                <>
                  <span className="lg-badge lg-badge--grey"><Link2Off size={26} aria-hidden="true" /></span>
                  <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>{t('invalidTitle')}</h1>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ct-muted)' }}>{t('invalidBody')}</p>
                  <div className="lg-actions">
                    <Link href="/profile?tab=settings" className="lg-btn">{t('manage')}</Link>
                    <Link href="/contact" className="lg-btn lg-btn--ghost">{t('contact')}</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
