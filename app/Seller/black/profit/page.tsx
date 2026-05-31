'use client';

/**
 * app/seller/black/profit/page.tsx
 *
 * Revenue Goals Tracker — replaces the old Profit Center page.
 * Non-Black sellers are redirected to /seller/subscription.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../layout';
import { EliteBanner, RevenueGoalsSection } from '@/app/components/seller/BlackPepperHub';

export default function RevenueGoalsPage() {
  const { dark } = useTheme();
  const { isBlack, loading } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isBlack) {
      router.replace('/seller/subscription');
    }
  }, [isBlack, loading, router]);

  if (loading || !isBlack) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EliteBanner dark={dark} />
      <RevenueGoalsSection dark={dark} />
    </div>
  );
}