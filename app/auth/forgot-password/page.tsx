'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/auth';
import {
  Mail, AlertCircle, CheckCircle2,
  Loader2, ShoppingBag, ArrowLeft,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex min-h-[520px]">

        {/* ══ LEFT — form ══ */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 lg:px-14">

          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#E63946] flex items-center justify-center shadow-lg shadow-red-500/30">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Choose<span className="text-[#E63946]">Tounsi</span>
            </span>
          </div>

          {!submitted ? (
            <>
              <div className="mb-7">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  Forgot your<br /><span className="text-[#E63946]">Password?</span>
                </h1>
                <div className="w-10 h-1 bg-[#E63946] rounded-full mt-3" />
                <p className="mt-4 text-sm text-slate-500 leading-relaxed">
                  No worries. Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-sm text-red-600">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E63946] transition-colors pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="Your email address"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/25 focus:border-[#E63946] focus:bg-white transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-[#E63946] hover:bg-[#c1121f] active:scale-[0.98] text-white text-sm font-bold tracking-wide transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#198f41]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Check your inbox</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-2">
                If <span className="font-semibold text-slate-700">{email}</span> is registered,
                you'll receive a reset link shortly.
              </p>
              <p className="text-xs text-slate-400 mb-8">
                The link expires in 60 minutes. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="text-sm text-[#E63946] font-semibold hover:text-red-700 transition"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 font-medium transition"
            >
              <ArrowLeft size={13} />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* ══ RIGHT — brand panel ══ */}
        <div className="hidden lg:flex w-[42%] bg-[#E63946] flex-col items-center justify-center px-10 py-12 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/[0.06]" />
          <div className="relative z-10 text-center">
            <div className="text-6xl mb-6">🔑</div>
            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              Reset your<br />Password
            </h2>
            <div className="w-10 h-1 bg-white/60 rounded-full mx-auto mb-6" />
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              We'll send you a secure link<br />to create a new password.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}