'use client';

/**
 * app/seller/analytics/forecast/page.tsx
 *
 * Route: /seller/analytics/forecast
 * Gated by: Red Pepper plan (PlanGate)
 *
 * Add to sidebar Sidebar.tsx in RED_NAV:
 *   { href: '/seller/analytics/forecast', label: 'Sales Forecast', icon: TrendingUp, accent: '#10b981' },
 */

import { Suspense } from 'react';
import { useTheme } from '../../layout';
import { PlanGate } from '@/app/components/seller/SubscriptionBadge';
import SalesForecastDashboard from '@/app/seller/components/SalesForecastDashboard';
import { TrendingUp } from 'lucide-react';

function ForecastInner() {
  const { dark } = useTheme();

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#10b981', flexShrink: 0,
        }}>
          <TrendingUp size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
            Sales Forecast
          </h1>
          <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
            6-month AI forecast · Tunisia seasonality · Regional heatmap · Event signals
          </p>
        </div>
      </div>

      {/* Gated content */}
      <PlanGate feature="advanced_analytics" dark={dark}>
        <SalesForecastDashboard dark={dark} />
      </PlanGate>
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={null}>
      <ForecastInner />
    </Suspense>
  );
}