'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveSession, AuthUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

function GoogleCallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token   = searchParams.get('token');
    const userRaw = searchParams.get('user');

    if (!token || !userRaw) {
      router.replace('/auth/login?error=google_failed');
      return;
    }

    try {
      const user: AuthUser = JSON.parse(atob(userRaw));
      saveSession(token, user);

      /* ── Redirect based on active plan ── */
      const redirectPath =
        user.active_plan === 'red' || user.active_plan === 'black'
          ? '/seller/dashboard/red'
          : '/';

      router.replace(redirectPath);
    } catch {
      router.replace('/auth/login?error=google_failed');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
      <Loader2 size={28} className="animate-spin text-[#E63946]" />
      <p className="text-sm text-slate-500 font-medium">Completing sign-in…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#E63946]" />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}