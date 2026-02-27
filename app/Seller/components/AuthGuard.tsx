'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, clearLocalSession } from '@/lib/auth';
import { Loader2, ShoppingBag } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorised, setAuthorised] = useState(false);

  useEffect(() => {
    // Synchronous check — reads localStorage, zero network calls.
    // This runs once on mount and is instant (< 1ms).
    const token = getToken();
    const user  = getUser();

    if (!token || !user) {
      clearLocalSession();
      router.replace('/auth/login');
      return;
    }

    if (user.role !== 'seller') {
      clearLocalSession();
      router.replace('/auth/login');
      return;
    }

    // Token and role look good — show the dashboard
    setAuthorised(true);
  }, []); // runs exactly once

  if (!authorised) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E63946] flex items-center justify-center shadow-lg shadow-red-500/25 animate-pulse">
          <ShoppingBag size={22} className="text-white" />
        </div>
        <div className="flex items-center gap-2.5 text-slate-500 text-sm font-semibold">
          <Loader2 size={16} className="animate-spin text-[#E63946]" />
          Verifying your session…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}