'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react'
import {
  login, register, verifyEmail, resendVerification, loginWithGoogle,
  type AuthError, type AuthUser,
} from '@/lib/auth'
import BrandLoader from '@/components/brand/BrandLoader'

export type AuthModalTab = 'register' | 'login'

interface AuthModalProps {
  /** Tab shown when the modal opens. */
  initialTab: AuthModalTab
  /** Heading + short line above the tabs (the page explains why an account is needed). */
  title: string
  subtitle?: string
  /** Same-site path to come back to after the Google round trip. */
  googleAfter: string
  /** Called once a session is saved (login, or e-mail code verified). No redirect happens. */
  onAuthenticated: (user: AuthUser) => void
  onClose: () => void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

const inputCls =
  'w-full ps-11 pe-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 ' +
  'text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150'
const iconCls = 'absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none'
const primaryBtn =
  'w-full py-3 rounded-2xl bg-[#E63946] hover:bg-[#c1121f] active:scale-[0.98] text-white text-sm font-bold tracking-wide ' +
  'transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25'

const RESEND_COOLDOWN = 60

/**
 * In-place sign-up / sign-in, same API calls and wording as the /auth pages:
 * register → 6-digit e-mail code → session; login (an unverified account goes to
 * the code step too). Never navigates, except the Google button (full redirect).
 */
export default function AuthModal({ initialTab, title, subtitle, googleAfter, onAuthenticated, onClose }: AuthModalProps) {
  const t  = useTranslations('auth')
  const tc = useTranslations('common')

  const [view, setView] = useState<AuthModalTab | 'verify'>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [marketing, setMarketing] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [code, setCode] = useState('')
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const busy = loading || googleLoading || done

  // Lock the page behind, close on Escape, focus the first field.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>('input:not([type=checkbox])')?.focus()
  }, [view])
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const switchTo = (v: AuthModalTab) => { setView(v); setError(''); setInfo('') }

  const goVerify = (addr: string) => {
    setVerifyEmailAddr(addr)
    setCode('')
    setError('')
    setInfo('')
    setCooldown(RESEND_COOLDOWN)
    setView('verify')
  }

  const finish = (user: AuthUser) => {
    setDone(true)
    onAuthenticated(user)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) { setError(t('errors.fillAll')); return }
    if (password !== confirm) { setError(t('errors.mismatch')); return }
    if (password.length < 8) { setError(t('errors.minLength')); return }
    setLoading(true)
    try {
      const res = await register({
        name: name.trim(), email: email.trim(), password,
        password_confirmation: confirm, marketing_opt_in: marketing,
      })
      goVerify(res.email)
    } catch (err) {
      const ae = err as AuthError
      // 409: a code was already sent for this e-mail (pending sign-up): enter it.
      if (ae?.status === 409) { goVerify(email.trim().toLowerCase()); setInfo(ae.message) }
      else setError(ae?.message ?? t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError(t('errors.fillAll')); return }
    setLoading(true)
    try {
      const { user } = await login({ email: email.trim(), password })
      finish(user)
    } catch (err) {
      const ae = err as AuthError
      if (ae?.needs_verification && ae.email) { goVerify(ae.email); setInfo(ae.message) }
      else setError(ae?.message ?? t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (code.length !== 6 || busy) return
    setLoading(true)
    setError('')
    try {
      const { user } = await verifyEmail(verifyEmailAddr, code)
      finish(user)
    } catch (err) {
      const ae = err as AuthError
      setError(ae?.message ?? t('errors.generic'))
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || busy) return
    setError('')
    setInfo('')
    try {
      await resendVerification(verifyEmailAddr)
      setInfo(t('verify.resent'))
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setError((err as AuthError)?.message ?? t('verify.resendFailed'))
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await loginWithGoogle(googleAfter)
    } catch {
      setError(t('errors.googleConnect'))
      setGoogleLoading(false)
    }
  }

  return (
    <div
      data-ct-modal=""
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-auth-modal-title"
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/20 px-6 pt-6 pb-7 sm:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={tc('close')}
          className="absolute top-4 end-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <img src="/images/logo-chili.png" alt={t('logoAlt')} className="h-7 w-7 object-contain" />
          <span className="text-base font-black text-slate-900 tracking-tight">
            Choose<span className="text-[#E63946]">Tounsi</span>
          </span>
        </div>

        <h2 id="ct-auth-modal-title" className="text-xl font-black text-slate-900 leading-tight pe-8">
          {view === 'verify' ? t('verify.title') : title}
        </h2>
        {view !== 'verify' && subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}

        {view !== 'verify' && (
          <div role="tablist" className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100">
            {(['register', 'login'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={view === tab}
                onClick={() => switchTo(tab)}
                disabled={busy}
                className={
                  'py-2 rounded-xl text-sm font-bold transition ' +
                  (view === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                {tab === 'register' ? t('register.submit') : t('login.submit')}
              </button>
            ))}
          </div>
        )}

        {info && !error && (
          <div className="mt-4 flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-[#198f41]" />
            <span>{info}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {view !== 'verify' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="mt-4 w-full flex items-center justify-center gap-3 py-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-sm font-semibold text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? <BrandLoader variant="inline" size={18} /> : <GoogleIcon />}
              {t('continueGoogle')}
            </button>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">
                {view === 'register' ? t('register.orEmail') : t('login.orEmail')}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3" noValidate>
            <div className="relative group">
              <User size={16} className={iconCls} />
              <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
                placeholder={t('fullName')} aria-label={t('fullName')} autoComplete="name" className={inputCls} />
            </div>
            <div className="relative group">
              <Mail size={16} className={iconCls} />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder={t('email')} aria-label={t('email')} autoComplete="email" className={inputCls} />
            </div>
            <div className="relative group">
              <Lock size={16} className={iconCls} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={t('register.passwordHint')} aria-label={t('password')} autoComplete="new-password" className={inputCls + ' pe-12'} />
              <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1}
                aria-label={showPass ? t('hidePassword') : t('showPassword')}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative group">
              <Lock size={16} className={iconCls} />
              <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder={t('confirmPassword')} aria-label={t('confirmPassword')} autoComplete="new-password" className={inputCls} />
            </div>
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#E63946] cursor-pointer flex-shrink-0" />
              <span className="text-xs text-slate-500 leading-relaxed">{t('register.marketingOptIn')}</span>
            </label>
            <button type="submit" disabled={busy} className={primaryBtn + ' mt-1'}>
              {loading ? <><BrandLoader variant="inline" size={16} /> {t('register.submitting')}</> : t('register.submit')}
            </button>
            <p className="text-xs text-center text-slate-400 pt-1">
              {t('register.haveAccount')}{' '}
              <button type="button" onClick={() => switchTo('login')} className="text-[#E63946] font-semibold hover:text-red-700">
                {t('register.signIn')}
              </button>
            </p>
          </form>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <div className="relative group">
              <Mail size={16} className={iconCls} />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder={t('email')} aria-label={t('email')} autoComplete="email" className={inputCls} />
            </div>
            <div className="relative group">
              <Lock size={16} className={iconCls} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={t('password')} aria-label={t('password')} autoComplete="current-password" className={inputCls + ' pe-12'} />
              <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={-1}
                aria-label={showPass ? t('hidePassword') : t('showPassword')}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#E63946] hover:text-red-700">
                {t('login.forgot')}
              </Link>
            </div>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {loading || done ? <><BrandLoader variant="inline" size={16} /> {t('login.submitting')}</> : t('login.submit')}
            </button>
            <p className="text-xs text-center text-slate-400 pt-1">
              {t('login.noAccount')}{' '}
              <button type="button" onClick={() => switchTo('register')} className="text-[#E63946] font-semibold hover:text-red-700">
                {t('login.createOne')}
              </button>
            </p>
          </form>
        )}

        {view === 'verify' && (
          <form onSubmit={handleVerify} className="mt-3 space-y-4" noValidate>
            <p className="text-sm text-slate-500">
              {t('verify.sentTo')} <strong className="text-slate-800 break-all" dir="ltr">{verifyEmailAddr}</strong>
            </p>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">{t('verify.codeLabel')}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                aria-label={t('verify.codeAria')}
                placeholder="••••••"
                className="w-full text-center tracking-[0.6em] text-2xl font-black py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white"
              />
            </label>
            <p className="text-xs text-slate-400">{t.rich('verify.expires', { b: c => <b>{c}</b> })}</p>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              {loading || done
                ? <><BrandLoader variant="inline" size={16} /> {done ? t('verify.verified') : t('verify.verifying')}</>
                : t('verify.submit')}
            </button>
            <div className="flex items-center justify-between gap-3 text-xs">
              <button type="button" onClick={() => switchTo('register')} disabled={busy} className="font-semibold text-slate-500 hover:text-slate-700">
                {t('verify.backToRegister')}
              </button>
              <button type="button" onClick={handleResend} disabled={busy || cooldown > 0}
                className="font-semibold text-[#E63946] hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
              </button>
            </div>
            <p className="text-xs text-center text-slate-400">{t('verify.neverShare')}</p>
          </form>
        )}
      </div>
    </div>
  )
}
