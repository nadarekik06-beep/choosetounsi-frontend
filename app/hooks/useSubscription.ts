'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { subscriptionApi, type SubscriptionStatus, type ActivePlan, PLAN_META, planMeta } from '@/lib/subscriptionApi';

// ─── Feature registry ─────────────────────────────────────────────────────────
// Red Pepper  (tier 1): advanced_analytics, ai_price_optimizer, ai_sales_predictor,
//                        ai_description_gen, ai_recommender, max_products_150
// Black Pepper (tier 2): bulk_operations, api_access, custom_storefront,
//                        ai_hub, profit_center, visibility_control,
//                        vip_requests, sponsored_products, trend_detection,
//                        inventory_prediction

export type FeatureKey =
  // ── Red features ──
  | 'advanced_analytics'
  | 'ai_price_optimizer'
  | 'ai_sales_predictor'
  | 'ai_description_gen'
  | 'ai_recommender'
  | 'max_products_150'
  // ── Black features ──
  | 'bulk_operations'
  | 'api_access'
  | 'custom_storefront'
  | 'ai_hub'
  | 'profit_center'
  | 'vip_requests'
  | 'sponsored_products'   // ✅ already present — gates the Promote page
  | 'trend_detection'
  | 'inventory_prediction'
  // ── Sponsoring system features ──
  | 'sponsor_product'      // ← NEW: ability to activate a sponsorship (all plans)
  | 'sponsor_discount';    // ← NEW: discounted sponsorship rate (red+)

type PlanTier = 0 | 1 | 2;

const PLAN_TIER: Record<ActivePlan, PlanTier> = {
  free:  0,
  red:   1,
  black: 2,
};

const FEATURE_MIN_TIER: Record<FeatureKey, PlanTier> = {
  // Red (1)
  advanced_analytics:   1,
  ai_price_optimizer:   1,
  ai_sales_predictor:   1,
  ai_description_gen:   1,
  ai_recommender:       1,
  max_products_150:     1,
  // Black (2)
  bulk_operations:      2,
  api_access:           2,
  custom_storefront:    2,
  ai_hub:               2,
  profit_center:        2,
  vip_requests:         2,
  sponsored_products:   2,
  trend_detection:      2,
  inventory_prediction: 2,
  // Sponsoring system (0 = all plans can sponsor, pay-per-use for free/red)
  sponsor_product:      0,  // all plans can activate sponsorships
  sponsor_discount:     1,  // red+ gets discounted rate
};

// Features the backend actually enforces per plan (subscription_plans.features).
// When the plan reports them, they win over the tier table above — so an admin
// enabling / disabling a feature on a plan is reflected here immediately.
const BACKEND_FEATURE: Partial<Record<FeatureKey, string>> = {
  advanced_analytics:   'analytics',
  trend_detection:      'analytics',
  ai_price_optimizer:   'ai_tools',
  ai_sales_predictor:   'ai_tools',
  ai_description_gen:   'ai_tools',
  ai_recommender:       'ai_tools',
  ai_hub:               'black_hub',
  profit_center:        'black_hub',
  vip_requests:         'black_hub',
  sponsored_products:   'black_hub',
  inventory_prediction: 'black_hub',
  sponsor_product:      'sponsorships',
};

// ─── Context ──────────────────────────────────────────────────────────────────

export interface SubscriptionContextValue {
  status:      SubscriptionStatus | null;
  plan:        ActivePlan;
  loading:     boolean;
  isGreen:     boolean;
  isRed:       boolean;
  isBlack:     boolean;
  isPaid:      boolean;
  maxProducts: number;
  planMeta:    typeof PLAN_META[ActivePlan];
  can:         (feature: FeatureKey) => boolean;
  gate:        (feature: FeatureKey) => boolean;
  refresh:     () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider(props: { children: React.ReactNode }): React.ReactElement {
  const value = useSubscriptionCore();
  return React.createElement(
    SubscriptionContext.Provider,
    { value },
    props.children,
  );
}

// ─── Core hook ────────────────────────────────────────────────────────────────

function useSubscriptionCore(): SubscriptionContextValue {
  const [status,  setStatus]  = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionApi.getStatus();
      setStatus(data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Admin-created plans map onto the base experience of their tier
  const details = status?.plan_details;
  const plan: ActivePlan = details?.tier_key ?? ((status?.plan as ActivePlan) in PLAN_TIER ? (status?.plan as ActivePlan) : 'free');
  const tier = details?.tier ?? PLAN_TIER[plan];
  const features = details?.features;

  const can = useCallback((feature: FeatureKey) => {
    const key = BACKEND_FEATURE[feature];
    if (features && key && key in features) return !!features[key];
    return tier >= FEATURE_MIN_TIER[feature];
  }, [tier, features]);
  const gate = can;

  const maxProducts = details
    ? (details.max_products ?? Infinity)
    : plan === 'free' ? 30 : plan === 'red' ? 150 : Infinity;

  return {
    status,
    plan,
    loading,
    isGreen:  plan === 'free',
    isRed:    plan === 'red',
    isBlack:  plan === 'black',
    isPaid:   plan === 'red' || plan === 'black',
    maxProducts,
    planMeta: planMeta(status?.plan ?? plan) as typeof PLAN_META[ActivePlan],
    can,
    gate,
    refresh:  fetchStatus,
  };
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside <SubscriptionProvider>');
  return ctx;
}

// ─── Standalone hook ──────────────────────────────────────────────────────────

export function useSubscriptionStandalone(): SubscriptionContextValue {
  return useSubscriptionCore();
}