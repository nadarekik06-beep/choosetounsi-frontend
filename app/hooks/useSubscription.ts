'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { subscriptionApi, type SubscriptionStatus, type ActivePlan, PLAN_META } from '@/lib/subscriptionApi';

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
  | 'visibility_control'
  | 'vip_requests'
  | 'sponsored_products'
  | 'trend_detection'
  | 'inventory_prediction';

type PlanTier = 0 | 1 | 2;

const PLAN_TIER: Record<ActivePlan, PlanTier> = {
  free:  0,
  red:   1,
  black: 2,
};

const FEATURE_MIN_TIER: Record<FeatureKey, PlanTier> = {
  // Red (1)
  advanced_analytics:  1,
  ai_price_optimizer:  1,
  ai_sales_predictor:  1,
  ai_description_gen:  1,
  ai_recommender:      1,
  max_products_150:    1,
  // Black (2)
  bulk_operations:     2,
  api_access:          2,
  custom_storefront:   2,
  ai_hub:              2,
  profit_center:       2,
  visibility_control:  2,
  vip_requests:        2,
  sponsored_products:  2,
  trend_detection:     2,
  inventory_prediction: 2,
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

  const plan: ActivePlan = (status?.plan as ActivePlan) ?? 'free';
  const tier = PLAN_TIER[plan];

  const can  = useCallback((feature: FeatureKey) => tier >= FEATURE_MIN_TIER[feature], [tier]);
  const gate = can;

  const maxProducts = plan === 'free' ? 30 : plan === 'red' ? 150 : Infinity;

  return {
    status,
    plan,
    loading,
    isGreen:  plan === 'free',
    isRed:    plan === 'red',
    isBlack:  plan === 'black',
    isPaid:   plan === 'red' || plan === 'black',
    maxProducts,
    planMeta: PLAN_META[plan],
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