'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '../layout';
import { PlanGate } from '@/app/components/seller/SubscriptionBadge';
import AIToolsPanel from '@/app/components/seller/AIToolsPanel';
import { Brain } from 'lucide-react';

function AIToolsInner() {
  const { dark } = useTheme();
  const searchParams = useSearchParams();

  const tabParam       = searchParams.get('tab');
  const productIdParam = searchParams.get('product_id');
  const autorun        = searchParams.get('autorun');

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'rgba(139,92,246,0.12)',
          border: '1px solid rgba(139,92,246,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8b5cf6', flexShrink: 0,
        }}>
          <Brain size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            AI Business Tools
          </h1>
          <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
            Price optimizer, sales predictor, description generator & bundle recommender
          </p>
        </div>
      </div>

      <PlanGate feature="ai_price_optimizer" dark={dark}>
        <AIToolsPanel
          dark={dark}
          initialTab={tabParam ?? undefined}
          initialProductId={productIdParam ? Number(productIdParam) : undefined}
          autorun={autorun === '1'}
        />
      </PlanGate>
    </div>
  );
}

export default function AIToolsPage() {
  return (
    <Suspense fallback={null}>
      <AIToolsInner />
    </Suspense>
  );
}