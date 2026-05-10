'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, loginWithGoogle, getToken, getUser, clearLocalSession } from '@/lib/auth';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2,
  Loader2, ShoppingBag, Store, TrendingUp, Shield,
} from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = useRef(searchParams.get('callbackUrl')).current;

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [checked,       setChecked]       = useState(false);

  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      router.replace(callbackUrl ?? (user.role === 'seller' ? '/seller' : '/'));
      return;
    }
    clearLocalSession();
    setChecked(true);

    // ── URL-based feedback messages ────────────────────────────────────────
    const urlError = searchParams.get('error');
    if (urlError === 'google_failed')       setError('Google sign-in failed. Please try again.');
    if (urlError === 'account_deactivated') setError('Your account has been deactivated. Contact support.');

    if (searchParams.get('reset') === 'success') {
      setSuccess('Password reset successfully! You can now sign in with your new password.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { redirectTo } = await login({ email: email.trim(), password });
      router.push((callbackUrl?.startsWith('/seller') ? callbackUrl : redirectTo) ?? '/');
    } catch (err: any) {
      if (err?.needs_verification && err?.email) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(err.email)}`);
        return;
      }
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    setSuccess('');
    try {
      await loginWithGoogle();
    } catch {
      setError('Could not connect to Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#E63946]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex min-h-[560px]">

        {/* ══ LEFT — form ══ */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 lg:px-14">

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#E63946] flex items-center justify-center shadow-lg shadow-red-500/30">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Choose<span className="text-[#E63946]">Tounsi</span>
            </span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Sign in to your<br />
              <span className="text-[#E63946]">Account</span>
            </h1>
            <div className="w-10 h-1 bg-[#E63946] rounded-full mt-3" />
          </div>

          {/* ── Success banner (e.g. after password reset) ── */}
          {success && (
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-5 text-sm text-green-700">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-[#198f41]" />
              <span>{success}</span>
            </div>
          )}

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 text-sm font-semibold text-slate-700 mb-5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email address"
                autoComplete="email"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 accent-[#E63946] cursor-pointer"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition font-medium">
                  Remember me
                </span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-[#E63946] hover:text-red-700 transition"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 mt-2 rounded-2xl bg-[#E63946] hover:bg-[#c1121f] active:scale-[0.98] text-white text-sm font-bold tracking-wide transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : 'Sign In'}
            </button>

          </form>

          {/* Footer links */}
          <p className="mt-6 text-xs text-center text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-[#E63946] font-semibold hover:text-red-700 transition">
              Create one
            </Link>
            {' · '}
            <Link href="/" className="text-[#E63946] font-semibold hover:text-red-700 transition">
              Browse as guest
            </Link>
          </p>

        </div>

        {/* ══ RIGHT — brand panel ══ */}
        <div className="hidden lg:flex w-[42%] bg-[#E63946] flex-col items-center justify-center px-10 py-12 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/[0.06]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.04]" />
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Store size={36} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              Welcome to<br />ChooseTounsi
            </h2>
            <div className="w-10 h-1 bg-white/60 rounded-full mx-auto mb-6" />
            <p className="text-white/80 text-sm leading-relaxed mb-10 font-medium">
              Tunisia&apos;s marketplace for<br />authentic local products.
            </p>
            <div className="space-y-3 text-left">
              {[
                { icon: Store,      text: 'Manage your store' },
                { icon: TrendingUp, text: 'Track your sales'  },
                { icon: Shield,     text: 'Secure & verified' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="text-white/90 text-sm font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#E63946]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}