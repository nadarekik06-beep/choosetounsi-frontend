// lib/subscriptionApi.ts
// FULL REPLACEMENT — adds downgrade, cancelDowngrade, history + richer SubscriptionStatus type.
// All existing exports are preserved so nothing else breaks.

import { fetchSellerPlans, type SellerPlanInfo } from './platformApi'

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '')
const API_URL  = `${BASE_URL}/api`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? null
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    const err: any = new Error(json.message ?? 'Request failed')
    err.response = { data: json, status: res.status }
    throw err
  }
  return json
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivePlan    = 'free' | 'red' | 'black'
export type PreferredPlan = 'green' | 'red' | 'black'
export type AppStatus     = 'pending' | 'approved' | 'rejected'

export type SubscriptionStatus_Status =
  | 'active'
  | 'trial'
  | 'grace_period'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'suspended'

export interface SubscriptionLifecycle {
  id:                    number
  current_plan:          string          // plan slug (admin plans can be custom)
  pending_plan:          string | null
  status:                SubscriptionStatus_Status
  status_label:          string
  billing_cycle_start:   string | null   // 'YYYY-MM-DD'
  billing_cycle_end:     string | null   // 'YYYY-MM-DD'
  days_remaining:        number
  grace_period_ends_at:  string | null
  has_pending_downgrade: boolean
  max_products:          number | null   // null = unlimited
}

/** Admin-managed plan definition returned by GET /seller/subscription. */
export interface PlanDetails {
  slug:                   string
  name:                   string
  badge_color:            string
  tier:                   0 | 1 | 2
  tier_key:               ActivePlan      // look & feel / legacy gating
  price_monthly:          number
  price_yearly:           number | null
  max_products:           number | null
  max_images_per_product: number | null
  max_sponsored_products: number | null
  features:               Record<string, boolean>
}

export interface SubscriptionStatus {
  plan_details?:   PlanDetails
  commission?:     { source: 'override' | 'plan' | 'default'; label: string; rate: number | null; expires_at?: string | null }
  has_application: boolean
  status:          AppStatus | null
  plan:            string | null     // plan slug — use planMeta() / plan_details for display
  preferred_plan:  PreferredPlan | null
  subscription:    SubscriptionLifecycle | null  // NEW — null for free/unapproved
  last_payment: {
    plan:       string
    amount:     number
    created_at: string
  } | null
}

export interface UpgradePayload {
  plan:            string
  billing_period?: 'monthly' | 'yearly'
  card_number:     string
  expiry_date:     string
  cvv:             string
  cardholder_name: string
}

export interface UpgradeResult {
  plan:       string
  amount:     number
  payment_id: number
}

export interface DowngradeResult {
  pending_plan:   string
  effective_date: string
  days_remaining: number
}

export interface PlanChange {
  from_plan:         string
  to_plan:           string
  change_type:       string
  change_type_label: string
  effective_at:      string
  reason:            string | null
  amount_charged:    number
}

// ── Plan metadata (mirrors PLANS constant in become-a-vendor page) ─────────────

export const PLAN_META = {
  free: {
    name:        'Green Pepper',
    priceLabel:  'Free',
    price:       0,
    color:       '#198f41',
    accentColor: '#15803d',
    emoji:       '🌱',
    maxProducts: 30,
    // Static fallback copy — live values come from /api/seller-plans (lib/platformApi.ts).
    commission:  '3–15%',
  },
  red: {
    name:        'Red Pepper',
    priceLabel:  '49 DT/month',
    price:       49,
    color:       '#db142e',
    accentColor: '#dc2626',
    emoji:       '🔴',
    maxProducts: 150,
    commission:  '3–12%',
  },
  black: {
    name:        'Black Pepper',
    priceLabel:  '129 DT/month',
    price:       129,
    color:       '#f59e0b',
    accentColor: '#f59e0b',
    emoji:       '⚫',
    maxProducts: null,
    commission:  '3–9%',
  },
} as const

// ── Live plan registry ────────────────────────────────────────────────────────
// Plans are admin-managed (prices, limits, names can change, custom plans can
// exist). PLAN_META above is only the static fallback — read plan display data
// through planMeta() so admin changes show up in the dashboard.

const TIER_KEYS: ActivePlan[] = ['free', 'red', 'black']
let livePlans: Record<string, SellerPlanInfo> = {}

export function setLivePlans(plans: Record<string, SellerPlanInfo> | null | undefined) {
  if (plans) livePlans = plans
}

/** Live plan info (null when unknown / not offered). */
export function livePlan(slug: string | null | undefined): SellerPlanInfo | null {
  return (slug && livePlans[slug]) || null
}

/** Plan slugs offered to sellers, cheapest tier first (falls back to the 3 base plans). */
export function planKeys(): string[] {
  const keys = Object.values(livePlans)
    .sort((a, b) => ((a.tier ?? 0) - (b.tier ?? 0)) || (a.price - b.price))
    .map(p => p.key as string)
  return keys.length ? keys : TIER_KEYS
}

/** 0 | 1 | 2 — which base experience a plan belongs to. */
export function planTier(slug: string | null | undefined): 0 | 1 | 2 {
  if (!slug) return 0
  const live = livePlans[slug]
  if (live?.tier !== undefined) return live.tier
  const i = TIER_KEYS.indexOf(slug as ActivePlan)
  return (i < 0 ? 0 : i) as 0 | 1 | 2
}

/** Ordering for upgrade / downgrade: tier first, then price. */
export function planRank(slug: string | null | undefined): number {
  const live = slug ? livePlans[slug] : undefined
  return planTier(slug) * 1_000_000 + (live?.price ?? PLAN_META[TIER_KEYS[planTier(slug)]].price)
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Display metadata for any plan slug: static look + live name / price / limits. */
export function planMeta(slug: string | null | undefined) {
  const base = PLAN_META[TIER_KEYS[planTier(slug)]]
  const live = slug ? livePlans[slug] : undefined
  if (!live) {
    return PLAN_META[slug as ActivePlan] ?? { ...base, name: slug ? slug.replace(/[_-]+/g, ' ') : base.name }
  }
  return {
    ...base,
    name:        live.name,
    price:       live.price,
    priceLabel:  live.price === 0 ? 'Free' : `${fmtNum(live.price)} DT/month`,
    color:       live.badge_color ?? base.color,
    accentColor: live.badge_color ?? base.accentColor,
    maxProducts: live.max_products,
    commission:  live.commission_min === live.commission_max
      ? `${fmtNum(live.commission_min)}%`
      : `${fmtNum(live.commission_min)}–${fmtNum(live.commission_max)}%`,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus | null> {
    const [res, plans] = await Promise.all([
      jsonRequest<{ success: boolean; data: SubscriptionStatus }>('GET', '/seller/subscription'),
      fetchSellerPlans().catch(() => null),
    ])
    setLivePlans(plans as Record<string, SellerPlanInfo> | null)
    return res.data ?? null
  },

  async upgrade(payload: UpgradePayload): Promise<UpgradeResult> {
    const res = await jsonRequest<{ success: boolean; data: UpgradeResult }>(
      'POST', '/seller/subscription/upgrade', payload
    )
    return res.data
  },

  /** Schedule a deferred downgrade — takes effect at end of billing cycle */
  async downgrade(plan: string): Promise<DowngradeResult> {
    const res = await jsonRequest<{ success: boolean; data: DowngradeResult }>(
      'POST', '/seller/subscription/downgrade', { plan }
    )
    return res.data
  },

  /** Cancel a previously scheduled downgrade */
  async cancelDowngrade(): Promise<{ current_plan: string; has_pending_downgrade: false }> {
    const res = await jsonRequest<{ success: boolean; data: any }>(
      'DELETE', '/seller/subscription/downgrade'
    )
    return res.data
  },

  /** Full plan change audit log */
  async history(): Promise<PlanChange[]> {
    const res = await jsonRequest<{ success: boolean; data: PlanChange[] }>(
      'GET', '/seller/subscription/history'
    )
    return res.data ?? []
  },
}