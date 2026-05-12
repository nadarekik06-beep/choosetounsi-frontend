'use client';
/**
 * app/seller/black/smart-promotions/page.tsx
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../layout';
import SmartPromoteCard from '@/app/components/seller/black/SmartPromoteCard';

export default function SmartPromotionsPage() {
  const { dark } = useTheme();
  const { isBlack, loading } = useSubscription();
  const router = useRouter();
  useEffect(() => { if (!loading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, loading, router]);
  if (loading || !isBlack) return null;

  const txtMain = dark ? '#fff' : '#111';
  const txtMut  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: txtMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Smart Promotions
        </h1>
        <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>
          AI detects trending products and recommends the right moment to sponsor them.
        </p>
      </div>
      <SmartPromoteCard dark={dark} />
    </div>
  );
}