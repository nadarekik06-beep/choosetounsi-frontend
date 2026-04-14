'use client';

/**
 * components/seller/SubscriptionBadge.tsx
 *
 * Drop-in badge that shows the seller's current plan in the sidebar/topbar.
 * Also exports <PlanGate> — a component that conditionally renders children
 * based on the seller's plan, or shows a locked upgrade card.
 */

import { useSubscription, type FeatureKey } from '@/app/hooks/useSubscription';
import { PLAN_META } from '@/lib/subscriptionApi';
import { Lock, Sparkles, Zap, Crown } from 'lucide-react';

// ─── SubscriptionBadge ────────────────────────────────────────────────────────

interface BadgeProps {
  size?: 'sm' | 'md';
  /** When true, shows only the emoji (for collapsed sidebar) */
  compact?: boolean;
  dark?: boolean;
}

export function SubscriptionBadge({ size = 'md', compact = false, dark = true }: BadgeProps) {
  const { plan, loading } = useSubscription();

  if (loading) {
    return (
      <div style={{
        width: compact ? 28 : 80, height: compact ? 28 : 24,
        borderRadius: 999,
        background: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb',
        animation: 'shimmer 1.4s infinite linear',
      }} />
    );
  }

  const meta = PLAN_META[plan];

  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    free: {
      bg:     'rgba(25,143,65,0.15)',
      border: 'rgba(25,143,65,0.35)',
      text:   '#22c55e',
      glow:   'rgba(25,143,65,0)',
    },
    red: {
      bg:     'rgba(219,20,46,0.15)',
      border: 'rgba(219,20,46,0.4)',
      text:   '#f87171',
      glow:   'rgba(219,20,46,0.25)',
    },
    black: {
      bg:     'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.4)',
      text:   '#fbbf24',
      glow:   'rgba(245,158,11,0.2)',
    },
  };

  const c = colorMap[plan];

  const PlanIcon = plan === 'black' ? Crown : plan === 'red' ? Zap : Sparkles;

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: '50%',
        background: c.bg, border: `1px solid ${c.border}`,
        fontSize: 12,
        boxShadow: plan !== 'free' ? `0 0 8px ${c.glow}` : 'none',
        cursor: 'default',
        flexShrink: 0,
      }} title={meta.name}>
        {meta.emoji}
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '3px 8px' : '4px 10px',
      borderRadius: 999,
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 800,
      letterSpacing: '0.04em',
      boxShadow: plan !== 'free' ? `0 0 10px ${c.glow}` : 'none',
      cursor: 'default',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      <PlanIcon size={size === 'sm' ? 10 : 11} />
      {meta.name}
    </span>
  );
}

// ─── PlanGate ─────────────────────────────────────────────────────────────────
// Renders children when the seller has the required plan.
// Otherwise renders an upgrade banner/card.

interface PlanGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Optional custom upgrade banner; defaults to a built-in card */
  fallback?: React.ReactNode;
  /** When true, renders nothing instead of the upgrade banner */
  silent?: boolean;
  dark?: boolean;
}

export function PlanGate({ feature, children, fallback, silent = false, dark = true }: PlanGateProps) {
  const { gate } = useSubscription();

  if (gate(feature)) return <>{children}</>;

  if (silent) return null;

  if (fallback) return <>{fallback}</>;

  return <UpgradeBanner feature={feature} dark={dark} />;
}

// ─── UpgradeBanner ────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string; plan: string }> = {
  advanced_analytics:  { label: 'Advanced Analytics',        description: 'Deep sales insights, customer segments, and heatmaps.',     plan: 'Red Pepper' },
  ai_price_optimizer:  { label: 'AI Price Optimizer',        description: 'AI-suggested optimal prices based on your real sales data.',  plan: 'Red Pepper' },
  ai_sales_predictor:  { label: 'AI Sales Predictor',        description: 'Predict future sales with Tunisian seasonal intelligence.',   plan: 'Red Pepper' },
  ai_description_gen:  { label: 'AI Description Generator',  description: 'Auto-generate SEO titles & descriptions from product data.', plan: 'Red Pepper' },
  ai_recommender:      { label: 'AI Bundle Recommender',     description: 'Smart product bundles and cross-sell recommendations.',       plan: 'Red Pepper' },
  max_products_150:    { label: '150 Product Limit',          description: 'List up to 150 products (Green plan allows 30).',            plan: 'Red Pepper' },
  bulk_operations:     { label: 'Bulk Operations',            description: 'Manage hundreds of products at once.',                       plan: 'Black Pepper' },
  api_access:          { label: 'API Access',                 description: 'Direct API access to integrate your systems.',               plan: 'Black Pepper' },
  custom_storefront:   { label: 'Custom Storefront',          description: 'Your branded store page on ChooseTounsi.',                   plan: 'Black Pepper' },
};

export function UpgradeBanner({ feature, dark = true }: { feature: FeatureKey; dark?: boolean }) {
  const info    = FEATURE_LABELS[feature];
  const cardBg  = dark ? '#161b27' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain = dark ? '#ffffff' : '#111827';
  const textMuted= dark ? 'rgba(255,255,255,0.4)' : '#6b7280';

  return (
    <div style={{
      background: cardBg,
      border: `1px solid rgba(219,20,46,0.25)`,
      borderRadius: 16,
      padding: '28px 24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(219,20,46,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Lock icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(219,20,46,0.12)',
        border: '1px solid rgba(219,20,46,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
        color: '#db142e',
      }}>
        <Lock size={20} />
      </div>

      {/* Text */}
      <p style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {info.label}
      </p>
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
        {info.description}
      </p>

      {/* Plan tag */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 999,
        background: 'rgba(219,20,46,0.12)',
        border: '1px solid rgba(219,20,46,0.3)',
        marginBottom: 16,
      }}>
        <Zap size={11} style={{ color: '#db142e' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#db142e' }}>
          Requires {info.plan}
        </span>
      </div>

      {/* CTA */}
      <div>
        <a href="/seller/subscription" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 20px',
          background: 'linear-gradient(135deg, #db142e, #a00f22)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 12,
          borderRadius: 10,
          border: 'none',
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(219,20,46,0.35)',
          cursor: 'pointer',
        }}>
          <Zap size={13} />
          Upgrade to {info.plan}
        </a>
      </div>
    </div>
  );
}