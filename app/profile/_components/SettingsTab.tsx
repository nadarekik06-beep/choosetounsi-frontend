'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Mail, KeyRound, Bell, UserRound, Eye, EyeOff, LogOut, Lock } from 'lucide-react'
import { profileApi, syncSessionUser, ApiError, type Profile, type NotificationCategorySetting, type NotificationChoiceKey } from '@/lib/profileApi'
import PersonalInfoForm from '@/components/profile/PersonalInfoForm'
import { Field, Switch } from '@/components/profile/ui'

import BrandLoader from '@/components/brand/BrandLoader'
type Toast = (msg: string, kind?: 'success' | 'error') => void

function PasswordInput({ id, value, onChange, error, label, autoComplete, required = true, hint }: {
  id: string; value: string; onChange: (v: string) => void; error?: string; label: string; autoComplete: string; required?: boolean; hint?: string
}) {
  const t = useTranslations('profile.settings.password')
  const [show, setShow] = useState(false)
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>
      <div style={{ position: 'relative' }}>
        <input id={id} className="pf-input" type={show ? 'text' : 'password'} autoComplete={autoComplete} dir="ltr"
          value={value} aria-invalid={!!error} onChange={e => onChange(e.target.value)} style={{ paddingInlineEnd: 44 }} maxLength={100} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t('hide') : t('show')}
          style={{ position: 'absolute', insetInlineEnd: 6, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', padding: 8, cursor: 'pointer', color: '#888' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  )
}

function EmailSection({ profile, onProfile, toast }: { profile: Profile; onProfile: (p: Profile) => void; toast: Toast }) {
  const t  = useTranslations('profile.settings.email')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const reset = () => { setOpen(false); setEmail(''); setPassword(''); setCode(''); setSentTo(null); setErrors({}) }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = t('invalid')
    if (profile.has_password && !password) errs.current_password = t('passwordRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const res = await profileApi.requestEmail({ email: email.trim(), ...(profile.has_password ? { current_password: password } : {}) })
      setSentTo(res.email)
      setPassword('')
    } catch (err) {
      const api = err as ApiError
      if (Object.keys(api.fields).length) setErrors(api.fields)
      else toast(api.message, 'error')
    } finally { setBusy(false) }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setErrors({ code: t('codeInvalid') }); return }
    setBusy(true)
    try {
      const saved = await profileApi.confirmEmail(code)
      syncSessionUser(saved)
      onProfile(saved)
      toast(t('updated'))
      reset()
    } catch (err) {
      const api = err as ApiError
      setErrors({ code: api.fields.code ?? api.message })
    } finally { setBusy(false) }
  }

  return (
    <section className="pf-card" aria-labelledby="pf-email-title">
      <div className="pf-card-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="pf-menu-icon"><Mail size={17} /></span>
          <div><h2 id="pf-email-title">{t('title')}</h2><p className="pf-card-sub" dir="ltr" style={{ textAlign: 'start' }}>{profile.email}</p></div>
        </div>
        {!open && <button type="button" className="pf-btn light sm" onClick={() => setOpen(true)}>{t('change')}</button>}
      </div>

      {open && !sentTo && (
        <form className="pf-form" onSubmit={send} noValidate>
          <Field label={t('new')} required error={errors.email} htmlFor="pf-new-email">
            <input id="pf-new-email" className="pf-input" type="email" dir="ltr" autoComplete="email" maxLength={191}
              value={email} aria-invalid={!!errors.email} onChange={e => setEmail(e.target.value)} />
          </Field>
          {profile.has_password && (
            <PasswordInput id="pf-email-pass" label={t('password')} value={password} onChange={setPassword}
              error={errors.current_password} autoComplete="current-password" />
          )}
          <p className="pf-hint" style={{ margin: 0 }}>{t('hint')}</p>
          <div className="pf-actions">
            <button type="button" className="pf-btn light" onClick={reset}>{tc('cancel')}</button>
            <button type="submit" className="pf-btn primary" disabled={busy}>{busy && <BrandLoader variant="inline" size={15} />}{t('send')}</button>
          </div>
        </form>
      )}

      {sentTo && (
        <form className="pf-form" onSubmit={verify} noValidate>
          <div className="pf-alert info">{t('codeSent', { email: sentTo })}</div>
          <Field label={t('code')} required error={errors.code} htmlFor="pf-email-code">
            <input id="pf-email-code" className="pf-input" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6}
              value={code} aria-invalid={!!errors.code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: '0.4em', fontWeight: 800, fontSize: '1.1rem', textAlign: 'center' }} />
          </Field>
          <div className="pf-actions">
            <button type="button" className="pf-btn light" onClick={() => { setSentTo(null); setCode('') }}>{t('back')}</button>
            <button type="submit" className="pf-btn primary" disabled={busy}>{busy && <BrandLoader variant="inline" size={15} />}{t('verify')}</button>
          </div>
        </form>
      )}
    </section>
  )
}

function PasswordSection({ profile, onProfile, toast }: { profile: Profile; onProfile: (p: Profile) => void; toast: Toast }) {
  const t = useTranslations('profile.settings.password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const setting = !profile.has_password

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!setting && !current) errs.current_password = t('currentRequired')
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) errs.password = t('rule')
    else if (next !== confirm) errs.password_confirmation = t('mismatch')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const saved = await profileApi.changePassword({ ...(setting ? {} : { current_password: current }), password: next, password_confirmation: confirm })
      onProfile(saved)
      setCurrent(''); setNext(''); setConfirm('')
      toast(setting ? t('setDone') : t('saved'))
    } catch (err) {
      const api = err as ApiError
      if (Object.keys(api.fields).length) setErrors(api.fields)
      else toast(api.message, 'error')
    } finally { setBusy(false) }
  }

  const strength = [next.length >= 8, /[A-Za-z]/.test(next), /\d/.test(next), next.length >= 12 || /[^A-Za-z0-9]/.test(next)].filter(Boolean).length

  return (
    <section className="pf-card" aria-labelledby="pf-pass-title">
      <div className="pf-card-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="pf-menu-icon"><KeyRound size={17} /></span>
          <div><h2 id="pf-pass-title">{setting ? t('titleSet') : t('title')}</h2>
            <p className="pf-card-sub">{setting ? t('googleHint') : t('subtitle')}</p></div>
        </div>
      </div>
      <form className="pf-form" onSubmit={submit} noValidate>
        {!setting && (
          <PasswordInput id="pf-cur" label={t('current')} value={current} onChange={setCurrent} error={errors.current_password} autoComplete="current-password" />
        )}
        <div className="pf-row cols-2">
          <div>
            <PasswordInput id="pf-new" label={t('new')} value={next} onChange={setNext} error={errors.password} autoComplete="new-password" hint={t('rule')} />
            {next && (
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }} aria-hidden>
                {[0, 1, 2, 3].map(i => <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < strength ? (strength >= 3 ? '#198f41' : '#f59e0b') : '#e5e5e5' }} />)}
              </div>
            )}
          </div>
          <PasswordInput id="pf-confirm" label={t('confirm')} value={confirm} onChange={setConfirm} error={errors.password_confirmation} autoComplete="new-password" />
        </div>
        <div className="pf-actions" style={{ alignItems: 'center' }}>
          {!setting && <Link href="/auth/forgot-password" className="pf-link" style={{ marginInlineEnd: 'auto' }}>{t('forgot')}</Link>}
          <button type="submit" className="pf-btn primary" disabled={busy}>{busy && <BrandLoader variant="inline" size={15} />}{setting ? t('set') : t('save')}</button>
        </div>
        <p className="pf-hint" style={{ margin: 0 }}>{t('otherDevices')}</p>
      </form>
    </section>
  )
}

function NotificationsSection({ profile, onProfile, toast }: { profile: Profile; onProfile: (p: Profile) => void; toast: Toast }) {
  const t = useTranslations('profile.settings.notifications')
  const [rows, setRows] = useState<NotificationCategorySetting[]>(profile.notification_settings ?? [])
  const [saving, setSaving] = useState<NotificationChoiceKey | null>(null)

  const toggle = async (category: NotificationCategorySetting['category'], channel: 'in_app' | 'email', value: boolean) => {
    const key = `${category}_${channel}` as NotificationChoiceKey
    const before = rows
    setRows(rs => rs.map(r => r.category === category ? { ...r, [channel]: { ...r[channel], enabled: value } } : r))   // optimistic
    setSaving(key)
    try {
      const saved = await profileApi.notifications({ [key]: value })
      onProfile(saved)
      if (saved.notification_settings) setRows(saved.notification_settings)
      toast(t('saved'))
    } catch (err) {
      setRows(before)
      toast((err as ApiError).message, 'error')
    } finally { setSaving(null) }
  }

  const channel = (row: NotificationCategorySetting, ch: 'in_app' | 'email') => {
    const s = row[ch]
    const label = `${t(`categories.${row.category}.label`)} — ${ch === 'in_app' ? t('channelInApp') : t('channelEmail')}`
    return (
      <div className="pf-notif-ch">
        <span className="pf-notif-ch-label">{ch === 'in_app' ? t('channelInApp') : t('channelEmail')}</span>
        {s.locked ? (
          <span className="pf-notif-lock" title={t('locked')}><Lock size={12} />{t('locked')}</span>
        ) : (
          <Switch checked={s.enabled} onChange={v => toggle(row.category, ch, v)} label={label} disabled={saving !== null} />
        )}
      </div>
    )
  }

  return (
    <section className="pf-card" aria-labelledby="pf-notif-title">
      <style>{`
        .pf-notif-row { display:flex; align-items:center; gap:16px; padding:14px 0; border-top:1px solid #f1f5f9; flex-wrap:wrap; }
        .pf-notif-row:first-of-type { border-top:none; }
        .pf-notif-row .grow { flex:1; min-width:200px; }
        .pf-notif-row .grow strong { display:block; font-size:14px; }
        .pf-notif-row .grow span { display:block; font-size:12px; color:#64748b; margin-top:2px; }
        .pf-notif-chs { display:flex; gap:18px; }
        .pf-notif-ch { display:flex; flex-direction:column; align-items:center; gap:6px; min-width:72px; }
        .pf-notif-ch-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
        .pf-notif-lock { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:#0f766e;
          background:#f0fdfa; border:1px solid #ccfbf1; border-radius:999px; padding:4px 8px; white-space:nowrap; }
        @media (max-width: 520px) { .pf-notif-chs { width:100%; justify-content:flex-start; } }
      `}</style>
      <div className="pf-card-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="pf-menu-icon"><Bell size={17} /></span>
          <div><h2 id="pf-notif-title">{t('title')}</h2><p className="pf-card-sub">{t('subtitle')}</p></div>
        </div>
      </div>
      {rows.map(row => (
        <div key={row.category} className="pf-notif-row">
          <div className="grow">
            <strong>{t(`categories.${row.category}.label`)}</strong>
            <span>{t(`categories.${row.category}.hint`)}</span>
            {row.email.opt_in && <span>{t('optInHint')}</span>}
          </div>
          <div className="pf-notif-chs">
            {channel(row, 'in_app')}
            {channel(row, 'email')}
          </div>
        </div>
      ))}
      <p className="pf-hint" style={{ margin: '12px 0 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <Lock size={13} style={{ flexShrink: 0, marginTop: 2 }} />{t('lockedHint')}
      </p>
    </section>
  )
}

export default function SettingsTab({ profile, onProfile, toast, onLogout }: {
  profile: Profile | null
  onProfile: (p: Profile) => void
  toast: Toast
  onLogout: () => void
}) {
  const t = useTranslations('profile.settings')
  if (!profile) return null
  return (
    <div className="pf-panel pf-grid">
      <section className="pf-card" id="pf-personal" aria-labelledby="pf-personal-title">
        <div className="pf-card-head">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="pf-menu-icon"><UserRound size={17} /></span>
            <div><h2 id="pf-personal-title">{t('personal')}</h2><p className="pf-card-sub">{t('personalHint')}</p></div>
          </div>
        </div>
        <PersonalInfoForm key={profile.id} profile={profile} onSaved={p => { onProfile(p); toast(t('saved')) }} />
      </section>
      <EmailSection profile={profile} onProfile={onProfile} toast={toast} />
      <PasswordSection profile={profile} onProfile={onProfile} toast={toast} />
      <NotificationsSection profile={profile} onProfile={onProfile} toast={toast} />
      <div style={{ textAlign: 'center' }}>
        <button type="button" className="pf-btn danger" onClick={onLogout}><LogOut size={15} />{t('signOut')}</button>
      </div>
    </div>
  )
}
