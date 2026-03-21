'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [ready, setReady] = useState(false);

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
        <Loader2 size={24} className="animate-spin text-[#E63946]" />
      </div>
    );
  }

  return <>{children}</>;
}