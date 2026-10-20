'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { isAxiosError } from 'axios'
import { api, getUser, AUTH_CHANGE_EVENT } from '@/lib/auth'

/** The signed-in user's name / e-mail ('' on the server and for visitors), kept in sync with sign-in changes. */
function useSignedIn(field: 'name' | 'email'): string {
  return useSyncExternalStore(
    cb => { window.addEventListener(AUTH_CHANGE_EVENT, cb); return () => window.removeEventListener(AUTH_CHANGE_EVENT, cb) },
    () => getUser()?.[field] ?? '',
    () => '',
  )
}

const TOPICS = ['order', 'return', 'seller', 'account', 'other'] as const
type Topic = (typeof TOPICS)[number]
const MAX = 5000

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'topic' | 'message', string>>

/**
 * POST /api/contact → e-mail to the team. Anti-spam on the backend: rate limit,
 * honeypot ("website", hidden from people) and the time spent on the form.
 */
export default function ContactForm() {
  const t = useTranslations('contactPage.form')
  const shownAt = useRef(0)
  useEffect(() => { shownAt.current = Date.now() }, [])
  // null = not edited yet: show what we know of the signed-in visitor
  const [nameInput, setName] = useState<string | null>(null)
  const [emailInput, setEmail] = useState<string | null>(null)
  const signedInName = useSignedIn('name')
  const signedInEmail = useSignedIn('email')
  const name = nameInput ?? signedInName
  const email = emailInput ?? signedInEmail
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState<Topic>('order')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')   // honeypot
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState<string | null>(null)

  function validate(): Errors {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = t('errors.name')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = t('errors.email')
    if (phone && !/^[0-9+ ().-]{6,30}$/.test(phone.trim())) e.phone = t('errors.phone')
    if (message.trim().length < 10) e.message = t('errors.message')
    return e
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return

    setStatus('sending')
    setServerMessage(null)
    try {
      const res = await api.post('/contact', {
        name: name.trim(), email: email.trim(), phone: phone.trim() || null, topic,
        message: message.trim(), website, elapsed_ms: Date.now() - shownAt.current,
      })
      setServerMessage(res.data?.message ?? null)
      setStatus('sent')
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const fields = (err.response.data?.errors ?? {}) as Record<string, string[]>
        const mapped: Errors = {}
        for (const k of ['name', 'email', 'phone', 'topic', 'message'] as const) {
          if (fields[k]?.[0]) mapped[k] = fields[k][0]
        }
        setErrors(mapped)
        setStatus('idle')
        return
      }
      setServerMessage(isAxiosError(err) ? (err.response?.data?.message ?? null) : null)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="lg-card" role="status" aria-live="polite">
        <div className="lg-alert lg-alert--ok">{serverMessage ?? t('sent')}</div>
        <button type="button" className="lg-btn lg-btn--ghost" style={{ marginTop: 14 }} onClick={() => {
          setMessage(''); setStatus('idle'); shownAt.current = Date.now()
        }}>{t('another')}</button>
      </div>
    )
  }

  const field = (key: keyof Errors) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `ct-${key}-err` : undefined,
  })

  return (
    <form className="lg-card lg-form" onSubmit={submit} noValidate>
      <div>
        <h2>{t('title')}</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ct-muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="lg-row">
        <div className="lg-field">
          <label htmlFor="ct-name">{t('name')}</label>
          <input id="ct-name" className="lg-input" autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} {...field('name')} />
          {errors.name && <span id="ct-name-err" className="lg-error">{errors.name}</span>}
        </div>
        <div className="lg-field">
          <label htmlFor="ct-email">{t('email')}</label>
          <input id="ct-email" type="email" className="lg-input" autoComplete="email" dir="ltr" maxLength={190} value={email} onChange={e => setEmail(e.target.value)} {...field('email')} />
          {errors.email && <span id="ct-email-err" className="lg-error">{errors.email}</span>}
        </div>
      </div>

      <div className="lg-row">
        <div className="lg-field">
          <label htmlFor="ct-phone">{t('phone')} <span className="lg-opt">({t('optional')})</span></label>
          <input id="ct-phone" type="tel" className="lg-input" autoComplete="tel" dir="ltr" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} {...field('phone')} />
          {errors.phone && <span id="ct-phone-err" className="lg-error">{errors.phone}</span>}
        </div>
        <div className="lg-field">
          <label htmlFor="ct-topic">{t('topic')}</label>
          <select id="ct-topic" className="lg-input" value={topic} onChange={e => setTopic(e.target.value as Topic)} {...field('topic')}>
            {TOPICS.map(k => <option key={k} value={k}>{t(`topics.${k}`)}</option>)}
          </select>
          {errors.topic && <span id="ct-topic-err" className="lg-error">{errors.topic}</span>}
        </div>
      </div>

      <div className="lg-field">
        <label htmlFor="ct-message">{t('message')}</label>
        <textarea id="ct-message" className="lg-input" maxLength={MAX} value={message} onChange={e => setMessage(e.target.value)} placeholder={t('messagePlaceholder')} {...field('message')} />
        {errors.message && <span id="ct-message-err" className="lg-error">{errors.message}</span>}
        <span className="lg-count">{message.length} / {MAX}</span>
      </div>

      {/* Honeypot: people never see or fill it */}
      <div className="lg-hp" aria-hidden="true">
        <label htmlFor="ct-website">Website</label>
        <input id="ct-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
      </div>

      {status === 'error' && <div className="lg-alert lg-alert--err" role="alert">{serverMessage ?? t('failed')}</div>}

      <div>
        <button type="submit" className="lg-btn" disabled={status === 'sending'}>
          {status === 'sending' ? t('sending') : t('send')}
        </button>
        <p className="lg-note">{t('privacyNote')}</p>
      </div>
    </form>
  )
}
