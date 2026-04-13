'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, refreshUser } from '@/lib/auth';

export function useRedPlanGuard() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    refreshUser().then((user) => {
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      if (user.active_plan !== 'red' && user.active_plan !== 'black') {
        router.replace('/seller');
        return;
      }
      setAllowed(true);
    });
  }, [router]);

  return allowed;
}