'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getUser, refreshUser } from '@/lib/auth';
import { useAuthUser } from '@/hooks/useAuthUser';
import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'

/**
 * Seller area gate. The role is taken from the API, not only from the copy
 * cached at login: a buyer approved a moment ago (bell, e-mail link) gets in
 * without logging out, and a seller whose role was removed is sent away as
 * soon as the refreshed user says so (focus, navigation, AuthSync).
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAuthUser();
  // Cached seller: in at once (checked in the background). Anyone else: wait for the API.
  const [checked, setChecked] = useState(() => getUser()?.role === 'seller');

  useEffect(() => {
    let alive = true;
    refreshUser().finally(() => { if (alive) setChecked(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!checked) return;
    // Read the store itself: during hydration `user` is still the server value (null).
    const current = getUser();
    if (!getToken() || !current) {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname || '/seller')}`);
    } else if (current.role !== 'seller') {
      router.replace('/');
    }
  }, [checked, user, router, pathname]);

  const ready = checked && user?.role === 'seller';
  // the overlay stays up while the session is checked (and through a redirect)
  usePageLoading(!ready);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <BrandLoader variant="section" />
      </div>
    );
  }

  return <>{children}</>;
}
