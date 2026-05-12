'use client';
/**
 * app/seller/black/ai-intelligence/page.tsx
 * Dedicated page for AI Intelligence (was accordion in Black Hub)
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../layout';
import AIHubCard from '@/app/components/seller/black/AIHubCard';

export default function AIIntelligencePage() {
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
          AI Intelligence
        </h1>
        <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>
          Trending products, stock alerts and market insights — updated every 6 hours.
        </p>
      </div>
      {/* AIHubCard renders fully expanded — no accordion wrapper */}
      <AIHubCard dark={dark} defaultOpen />
    </div>
  );
}