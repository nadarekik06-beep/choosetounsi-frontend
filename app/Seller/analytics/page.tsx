'use client';

/**
 * app/seller/analytics/page.tsx  ← NEW FILE
 *
 * Standalone page for Advanced Analytics.
 * Accessible via sidebar nav for Red+ sellers.
 * Free sellers are redirected to /seller/subscription via the sidebar lock.
 */

import { useTheme } from '../layout';
import { PlanGate } from '@/app/components/seller/SubscriptionBadge';
import AdvancedAnalytics from '@/app/components/seller/AdvancedAnalytics';
import { BarChart2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { dark } = useTheme();

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'rgba(219,20,46,0.12)',
          border: '1px solid rgba(219,20,46,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#db142e', flexShrink: 0,
        }}>
          <BarChart2 size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            Advanced Analytics
          </h1>
          <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
            Deep insights powered by your real sales data
          </p>
        </div>
      </div>

      {/* Gated content */}
      <PlanGate feature="advanced_analytics" dark={dark}>
        <AdvancedAnalytics dark={dark} />
      </PlanGate>
    </div>
  );
}