// lib/subscriptionApi.ts
// FULL REPLACEMENT — adds downgrade, cancelDowngrade, history + richer SubscriptionStatus type.
// All existing exports are preserved so nothing else breaks.

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
  | 'grace_period'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'suspended'

export interface SubscriptionLifecycle {
  id:                    number
  current_plan:          ActivePlan
  pending_plan:          ActivePlan | null
  status:                SubscriptionStatus_Status
  status_label:          string
  billing_cycle_start:   string | null   // 'YYYY-MM-DD'
  billing_cycle_end:     string | null   // 'YYYY-MM-DD'
  days_remaining:        number
  grace_period_ends_at:  string | null
  has_pending_downgrade: boolean
  max_products:          number | null   // null = unlimited
}

export interface SubscriptionStatus {
  has_application: boolean
  status:          AppStatus | null
  plan:            ActivePlan | null
  preferred_plan:  PreferredPlan | null
  subscription:    SubscriptionLifecycle | null  // NEW — null for free/unapproved
  last_payment: {
    plan:       ActivePlan
    amount:     number
    created_at: string
  } | null
}

export interface UpgradePayload {
  plan:            'red' | 'black'
  card_number:     string
  expiry_date:     string
  cvv:             string
  cardholder_name: string
}

export interface UpgradeResult {
  plan:       'red' | 'black'
  amount:     number
  payment_id: number
}

export interface DowngradeResult {
  pending_plan:   ActivePlan
  effective_date: string
  days_remaining: number
}

export interface PlanChange {
  from_plan:         ActivePlan
  to_plan:           ActivePlan
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
    commission:  '12–20%',
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

// ── API calls ─────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus | null> {
    const res = await jsonRequest<{ success: boolean; data: SubscriptionStatus }>(
      'GET', '/seller/subscription'
    )
    return res.data ?? null
  },

  async upgrade(payload: UpgradePayload): Promise<UpgradeResult> {
    const res = await jsonRequest<{ success: boolean; data: UpgradeResult }>(
      'POST', '/seller/subscription/upgrade', payload
    )
    return res.data
  },

  /** Schedule a deferred downgrade — takes effect at end of billing cycle */
  async downgrade(plan: 'free' | 'red'): Promise<DowngradeResult> {
    const res = await jsonRequest<{ success: boolean; data: DowngradeResult }>(
      'POST', '/seller/subscription/downgrade', { plan }
    )
    return res.data
  },

  /** Cancel a previously scheduled downgrade */
  async cancelDowngrade(): Promise<{ current_plan: ActivePlan; has_pending_downgrade: false }> {
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