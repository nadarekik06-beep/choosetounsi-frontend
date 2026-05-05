'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerification, getToken, getUser } from '@/lib/auth';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';

const LOGO_SRC = 'data:image/png;base64,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';
const RESEND_COOLDOWN = 60;

function VerifyEmailForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get('email') ?? '';

  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown,  setCooldown]  = useState(0);
  const [focused,   setFocused]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (getToken() && getUser()) { router.replace('/'); return; }
    if (!email) { router.replace('/auth/register'); return; }
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = useCallback(async (codeToVerify: string) => {
    if (loading || success || codeToVerify.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { redirectTo } = await verifyEmail(email, codeToVerify);
      setSuccess(true);
      setTimeout(() => router.push(redirectTo), 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
      if (!err?.needs_resend) {
        setCode('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      setLoading(false);
    }
  }, [email, loading, success]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setError('');
    if (val.length === 6) handleVerify(val);
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      await resendVerification(email);
      setResendMsg('A new code has been sent to your email.');
      setCode('');
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) =>
        a + '*'.repeat(Math.min(b.length, 4)) + c)
    : '';

  const digits = code.split('').concat(Array(6).fill('')).slice(0, 6);

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fa', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:440, background:'#fff', borderRadius:28, boxShadow:'0 8px 48px rgba(0,0,0,0.10)', overflow:'hidden', border:'1px solid #f1f5f9' }}>

        {/* ── TOP RED ACCENT BAR ── */}
        <div style={{ height:5, background:'linear-gradient(90deg,#db142e,#ff4d5e,#198f41)' }} />

        {/* ── HEADER ── */}
        <div style={{ padding:'36px 40px 28px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:20 }}>
            <img
              src={LOGO_SRC}
              alt="ChooseTounsi"
              style={{ width:56, height:56, objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(219,20,46,0.25))' }}
            />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:22, fontWeight:900, color:'#0f1117', letterSpacing:'-0.5px', lineHeight:1.1 }}>
                Choose<span style={{ color:'#db142e' }}>Tounsi</span>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:'#198f41', letterSpacing:'1px', textTransform:'uppercase' }}>
                Tunisia's Marketplace
              </div>
            </div>
          </div>

          {/* Badge */}
          <div style={{ marginBottom:16 }}>
            <span style={{ display:'inline-block', background:'rgba(219,20,46,0.08)', border:'1.5px solid rgba(219,20,46,0.2)', borderRadius:100, padding:'5px 18px', fontSize:11, fontWeight:700, color:'#db142e', letterSpacing:'2px', textTransform:'uppercase' }}>
              🎉 Email Verification
            </span>
          </div>

          {/* Title */}
          <h1 style={{ margin:'0 0 8px', fontSize:26, fontWeight:900, color:'#0f1117' }}>
            Check your email
          </h1>
          <p style={{ margin:0, fontSize:14, color:'#64748b', lineHeight:1.6 }}>
            We sent a 6-digit code to<br />
            <span style={{ fontWeight:700, color:'#0f1117' }}>{maskedEmail}</span>
          </p>
        </div>

        {/* ── CODE ENTRY ── */}
        <div
          style={{ padding:'28px 40px', background:'#fafbfc', borderBottom:'1px solid #f1f5f9', textAlign:'center', cursor:'text' }}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Label */}
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:18 }}>
            Your verification code
          </div>

          {/* Digit boxes */}
          <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:18 }}>
            {digits.map((digit, i) => {
              const isActive = i === code.length && focused && !success;
              const isFilled = !!digit;
              return (
                <div key={i} style={{
                  width: 54,
                  height: 66,
                  borderRadius: 14,
                  border: `2px solid ${success ? '#198f41' : isFilled ? '#db142e' : isActive ? '#db142e' : '#e2e8f0'}`,
                  background: success ? 'rgba(25,143,65,0.06)' : isFilled ? 'rgba(219,20,46,0.05)' : isActive ? 'rgba(219,20,46,0.03)' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 900,
                  color: success ? '#198f41' : isFilled ? '#db142e' : '#cbd5e1',
                  fontFamily: "'Courier New', monospace",
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 0 3px rgba(219,20,46,0.15), 0 2px 8px rgba(219,20,46,0.1)' : isFilled ? '0 2px 8px rgba(219,20,46,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {isFilled
                    ? digit
                    : isActive
                    ? <span style={{ display:'block', width:2, height:28, background:'#db142e', borderRadius:2, animation:'ct-blink 1s step-end infinite' }} />
                    : null}
                </div>
              );
            })}
          </div>

          {/* Expiry */}
          {!success && (
            <div style={{ fontSize:13, color:'#f97316', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <span>⏱</span>
              <span>Expires in <strong>10 minutes</strong></span>
            </div>
          )}

          {/* Hidden real input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={code}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={6}
            disabled={loading || success}
            style={{ position:'absolute', opacity:0, pointerEvents:'none', width:1, height:1, top:0, left:0 }}
            aria-label="6-digit verification code"
          />
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ padding:'24px 40px 32px', background:'#fff' }}>

          {error && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:14, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#dc2626' }}>
              <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:14, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#15803d' }}>
              <CheckCircle2 size={15} style={{ flexShrink:0 }} />
              <span>Verified! Redirecting…</span>
            </div>
          )}
          {resendMsg && !error && (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:14, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#1d4ed8' }}>
              <CheckCircle2 size={15} style={{ flexShrink:0 }} />
              <span>{resendMsg}</span>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={() => handleVerify(code)}
            disabled={code.length !== 6 || loading || success}
            style={{
              width:'100%', padding:'15px', borderRadius:16, border:'none',
              background:'#db142e',
              color:'#fff', fontSize:14, fontWeight:700, letterSpacing:'0.5px',
              cursor: code.length !== 6 || loading || success ? 'not-allowed' : 'pointer',
              opacity: code.length !== 6 || loading || success ? 0.5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              marginBottom:10,
              boxShadow:'0 4px 20px rgba(219,20,46,0.28)',
              transition:'all 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
              : success
              ? <><CheckCircle2 size={16} /> Verified!</>
              : 'Verify Email'}
          </button>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0 || success}
            style={{
              width:'100%', padding:'13px', borderRadius:16, border:'2px solid #e2e8f0',
              background:'transparent', color:'#475569', fontSize:14, fontWeight:600,
              cursor: resending || cooldown > 0 || success ? 'not-allowed' : 'pointer',
              opacity: resending || cooldown > 0 || success ? 0.5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              marginBottom:18, transition:'all 0.15s',
            }}
          >
            {resending
              ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : <><RefreshCw size={15} /> Resend Code</>}
          </button>

          {/* Security note */}
          <div style={{ background:'rgba(25,143,65,0.06)', border:'1px solid rgba(25,143,65,0.15)', borderRadius:12, padding:'10px 16px', marginBottom:18, textAlign:'center' }}>
            <span style={{ fontSize:12, color:'#198f41', fontWeight:600 }}>🔒 Never share this code with anyone</span>
          </div>

          {/* Back */}
          <div style={{ textAlign:'center' }}>
            <Link href="/auth/register" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8', textDecoration:'none', fontWeight:500 }}>
              <ArrowLeft size={13} />
              Back to registration
            </Link>
          </div>
        </div>

        {/* Bottom green accent bar */}
        <div style={{ height:4, background:'linear-gradient(90deg,#198f41,#22c55e,#db142e)' }} />

      </div>

      <style>{`
        @keyframes ct-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#f8f9fa', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Loader2 size={22} className="animate-spin" style={{ color:'#db142e' }} />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}