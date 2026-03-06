'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveSession, AuthUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function GoogleCallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userRaw = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      const msg = error === 'account_deactivated'
        ? 'account_deactivated'
        : 'google_failed';
      router.replace(`/auth/login?error=${msg}`);
      return;
    }

    if (!token || !userRaw) {
      router.replace('/auth/login?error=google_failed');
      return;
    }

    try {
      const user = JSON.parse(atob(userRaw)) as AuthUser;
      saveSession(token, user);
      router.replace(user.role === 'seller' ? '/seller' : '/');
    } catch {
      router.replace('/auth/login?error=google_failed');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
      <Loader2 size={32} className="animate-spin text-[#E63946]" />
      <p className="text-sm text-slate-500 font-medium">Signing you in with Google…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#E63946]" />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}