'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [ready, setReady] = useState(false);
  // the overlay stays up while the session is checked (and through a redirect)
  usePageLoading(!ready);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login?callbackUrl=/seller');
      return;
    }
    const user = getUser();
    if (user?.role !== 'seller') {
      router.replace('/');
      return;
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <BrandLoader variant="section" />
      </div>
    );
  }

  return <>{children}</>;
}