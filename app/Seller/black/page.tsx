'use client';

/**
 * app/seller/black/page.tsx
 *
 * Black Hub page — accessible from the sidebar for Black Pepper sellers.
 * Contains: Elite Banner + AI Hub + Visibility Control + VIP Lounge
 * Non-Black sellers are redirected to /seller/subscription.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../layout';
import { EliteBanner, AiHubSection, VisibilitySection, VipLoungeSection } from '@/app/components/seller/BlackPepperHub';

export default function BlackHubPage() {
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
      <AiHubSection dark={dark} />
      <VisibilitySection dark={dark} />
      <VipLoungeSection dark={dark} />
    </div>
  );
}