'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveSession, shouldPromptProfile, takeGoogleAfter, AuthUser } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import BrandLoader from '@/components/brand/BrandLoader'

function GoogleCallbackHandler() {
  const t            = useTranslations('auth');
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
      // Where they were heading before Google (set by loginWithGoogle)
      const after = takeGoogleAfter() ?? '/';

      // ── Profile completion (skippable), then preference onboarding, for clients ─────
      if (shouldPromptProfile(user)) {
        router.replace(`/complete-profile?redirect=${encodeURIComponent(after)}`);
        return;
      }
      if (user.role === 'client' && !user.onboarding_completed) {
        router.replace(`/onboarding?redirect=${encodeURIComponent(after)}`);
        return;
      }

      /* ── Redirect based on active plan ── */
      const redirectPath =
        user.active_plan === 'red' || user.active_plan === 'black'
          ? '/seller/dashboard/red'
          : user.role === 'client' ? after : '/';

      router.replace(redirectPath);
    } catch {
      router.replace('/auth/login?error=google_failed');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
      <BrandLoader variant="section" label={t('completingSignIn')} />
    </div>
  );


}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <BrandLoader variant="section" />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}