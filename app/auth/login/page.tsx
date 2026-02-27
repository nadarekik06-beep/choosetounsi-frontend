'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, getToken, getUser, clearLocalSession } from '@/lib/auth';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle,
  Loader2, ShoppingBag, Store, TrendingUp, Shield,
} from 'lucide-react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read callbackUrl ONCE into a ref — never put searchParams in useEffect deps
  const callbackUrl = useRef(searchParams.get('callbackUrl')).current;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [checked,  setChecked]  = useState(false);

  useEffect(() => {
    // Run once. Check if already logged in → redirect away.
    // Otherwise clear any stale data and show the form.
    const token = getToken();
    const user  = getUser();

    if (token && user) {
      const dest = callbackUrl ?? (user.role === 'seller' ? '/seller' : '/');
      router.replace(dest);
      return;
    }

    // Clear stale data — synchronous, zero network calls
    clearLocalSession();
    setChecked(true);
  }, []); // empty array = runs exactly once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { redirectTo } = await login({ email: email.trim(), password });
      const dest = (callbackUrl?.startsWith('/seller') ? callbackUrl : redirectTo) ?? '/';
      router.push(dest);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Tiny spinner while the one-time localStorage check runs (< 1ms normally)
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

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#E63946] flex items-center justify-center shadow-lg shadow-red-500/30">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Choose<span className="text-[#E63946]">Tounsi</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Sign in to your<br />
              <span className="text-[#E63946]">Account</span>
            </h1>
            <div className="w-10 h-1 bg-[#E63946] rounded-full mt-3" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#E63946] cursor-pointer" />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition font-medium">Remember me</span>
              </label>
              <button type="button" className="text-xs font-semibold text-[#E63946] hover:text-red-700 transition">
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 mt-2 rounded-2xl bg-[#E63946] hover:bg-[#c1121f] active:scale-[0.98] text-white text-sm font-bold tracking-wide transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-slate-400">
            Don't have an account?{' '}
            <Link href="/" className="text-[#E63946] font-semibold hover:text-red-700 transition">Browse as guest</Link>
          </p>
        </div>

        {/* ══ RIGHT — brand ══ */}
        <div className="hidden lg:flex w-[42%] bg-[#E63946] flex-col items-center justify-center px-10 py-12 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/[0.06]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.04]" />
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Store size={36} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-4">Welcome to<br />ChooseTounsi</h2>
            <div className="w-10 h-1 bg-white/60 rounded-full mx-auto mb-6" />
            <p className="text-white/80 text-sm leading-relaxed mb-10 font-medium">
              Tunisia's marketplace for<br />authentic local products.
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