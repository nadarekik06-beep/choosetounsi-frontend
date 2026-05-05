// lib/subscriptionApi.ts
// Seller subscription status + upgrade API.
// Uses the same fetch-based pattern as sellerApi.ts in this project.

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

export interface SubscriptionStatus {
  has_application: boolean
  status:          AppStatus | null
  plan:            ActivePlan | null
  preferred_plan:  PreferredPlan | null
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

// ── Plan metadata (mirrors PLANS constant in become-a-vendor page) ─────────────

export const PLAN_META = {
  free: {
    name:        'Green Pepper',
    priceLabel:  'Free',
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
}