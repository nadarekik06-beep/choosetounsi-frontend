'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/auth';
import {
  Lock, Eye, EyeOff, AlertCircle, CheckCircle2,
  Loader2, ShoppingBag, ArrowLeft,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

function ResetPasswordForm() {
  const t            = useTranslations('auth');
  const router       = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password,        setPassword]        = useState('');
  const [confirmation,    setConfirmation]     = useState('');
  const [showPass,        setShowPass]         = useState(false);
  const [showConfirm,     setShowConfirm]      = useState(false);
  const [loading,         setLoading]          = useState(false);
  const [error,           setError]            = useState('');
  const [success,         setSuccess]          = useState(false);

  // Guard — if no token/email in URL, redirect to forgot-password
  useEffect(() => {
    if (!token || !email) {
      router.replace('/auth/forgot-password');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('errors.minLength')); return;
    }
    if (password !== confirmation) {
      setError(t('errors.mismatch')); return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setSuccess(true);
      // Redirect to login after 2.5 seconds
      setTimeout(() => router.push('/auth/login?reset=success'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.generic'));
      setLoading(false);
    }
  };

  const passwordsMatch = confirmation.length > 0 && password === confirmation;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex min-h-[520px]">

        {/* ══ LEFT — form ══ */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 lg:px-14">

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/images/logo-chili.png" alt={t('logoAlt')} className="h-9 w-9 object-contain" />
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Choose<span className="text-[#E63946]">Tounsi</span>
            </span>
          </div>

          {!success ? (
            <>
              <div className="mb-7">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  {t('reset.title1')}<br /><span className="text-[#E63946]">{t('reset.title2')}</span>
                </h1>
                <div className="w-10 h-1 bg-[#E63946] rounded-full mt-3" />
                {email && (
                  <p className="mt-4 text-sm text-slate-500">
                    {t.rich('reset.for', { email, b: c => <span className="font-semibold text-slate-700">{c}</span> })}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-sm text-red-600">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div className="relative group">
                  <Lock size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder={t('reset.newPassword')}
                    aria-label={t('reset.newPassword')}
                    autoComplete="new-password"
                    required
                    className="w-full ps-11 pe-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? t('hidePassword') : t('showPassword')}
                    className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm password */}
                <div className="relative group">
                  <Lock size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(e) => { setConfirmation(e.target.value); setError(''); }}
                    placeholder={t('reset.confirmNew')}
                    aria-label={t('reset.confirmNew')}
                    autoComplete="new-password"
                    required
                    className="w-full ps-11 pe-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                    className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {passwordsMatch && (
                    <CheckCircle2 size={16} className="absolute end-10 top-1/2 -translate-y-1/2 text-[#198f41]" />
                  )}
                </div>

                {/* Password strength hint */}
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-orange-500 font-medium">
                    {t('errors.minLength')}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || password.length < 8 || password !== confirmation}
                  className="w-full py-3.5 mt-2 rounded-2xl bg-[#E63946] hover:bg-[#c1121f] active:scale-[0.98] text-white text-sm font-bold tracking-wide transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> {t('reset.submitting')}</>
                    : t('reset.submit')}
                </button>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#198f41]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">{t('reset.doneTitle')}</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-2">
                {t('reset.doneBody')}
              </p>
              <p className="text-xs text-slate-400">{t('reset.redirecting')}</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 font-medium transition"
            >
              <ArrowLeft size={13} />
              {t('backToSignIn')}
            </Link>
          </div>
        </div>

        {/* ══ RIGHT — brand panel ══ */}
        <div className="hidden lg:flex w-[42%] bg-[#E63946] flex-col items-center justify-center px-10 py-12 relative overflow-hidden">
          <div className="absolute -top-16 -end-16 w-64 h-64 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-20 -start-20 w-72 h-72 rounded-full bg-white/[0.06]" />
          <div className="relative z-10 text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              {t('reset.panelTitle1')}<br />{t('reset.panelTitle2')}
            </h2>
            <div className="w-10 h-1 bg-white/60 rounded-full mx-auto mb-6" />
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              {t('reset.panelBody')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#E63946]" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}