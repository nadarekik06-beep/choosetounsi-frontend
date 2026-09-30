// Seller ads API — /api/seller/ads/* (wallet, CPC campaigns, wizard tools).
// All numbers (floors, discounts, credits, gateways) come from the backend: nothing is priced here.

import { currentLocale } from '@/lib/i18n/clientLocale'

const RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const API_URL = `${RAW_URL.replace(/\/api\/?$/, '')}/api`

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'rejected' | 'expired'
export type PauseReason = 'manual' | 'budget_exhausted_today' | 'wallet_empty' | 'out_of_stock' | 'plan_downgrade' | 'product_inactive' | 'admin'
export type Placement = 'home_row' | 'home_inline' | 'search_top' | 'category_top' | 'product_similar' | 'cart_cross_sell' | 'entry_popup' | 'email_digest'

export interface Tip { code: string; params?: Record<string, string | number>; action?: string | null }

export interface Campaign {
  id: number
  status: CampaignStatus
  paused_reason: PauseReason | null
  rejection_reason: string | null
  pricing_model: 'cpc' | 'legacy_daily'
  goal: 'sales' | 'visibility'
  product: { id: number; name: string; slug: string; price: number; image_url: string | null } | null
  daily_budget: number | null
  total_budget: number | null
  max_cpc: number | null
  spent_today: number
  spent_total: number
  placements: Placement[] | null
  targeting: { gender: string | null; wilayas: string[] | null; categories: number[] | null; price_min: number | null; price_max: number | null }
  start_at: string | null
  end_at: string | null
  ended_at: string | null
  readiness_score: number | null
  tips: Tip[]
  tips_checked_at: string | null
  ad_copy: string | null
  tags: string[] | null
  stats: { impressions: number; clicks: number; ctr: number | null; spend: number; orders: number; revenue: number }   // all time, same definitions as Summary
  can: { edit: boolean; pause: boolean; resume: boolean; cancel: boolean }
  created_at: string
}

export interface DailyPoint { date: string; impressions: number; clicks: number; cost: number; orders: number; revenue: number }
export interface Summary { spend: number; paid_spend: number; credit_spend: number; clicks: number; impressions: number; orders: number; revenue: number; roas: number | null; cost_per_order: number | null }
export interface PlacementStat { placement: Placement; impressions: number; clicks: number; ctr: number | null; cost: number; orders: number; revenue: number }

/** GET /seller/ads/campaigns/{id}: the campaign + results (last 30 days daily, per placement). */
export interface CampaignFull extends Campaign {
  summary: Summary
  daily: DailyPoint[]
  placement_stats: PlacementStat[]
}

export interface Wallet {
  balance: number
  credit_balance: number
  credit_expires_at: string | null
  available: number
  min_top_up?: number
  gateways?: string[]
}

export interface WalletTx {
  id: number
  type: 'top_up' | 'monthly_credit' | 'click_charge' | 'refund' | 'admin_adjust' | 'credit_expiry'
  amount: number
  credit_amount: number
  paid_amount: number
  balance_after: number
  credit_after: number
  sponsorship_id: number | null
  date: string | null
  clicks: number | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface TopUp { id: number; amount: number; gateway: string; status: 'pending' | 'paid' | 'failed' | 'cancelled'; reference: string | null; paid_at: string | null; created_at: string }

export interface AdsSellerConfig {
  currency: string
  tier: 'free' | 'red' | 'black'
  tier_click_discount: number
  monthly_credit: number
  min_daily_budget: number
  min_top_up: number
  min_cpc: number
  suggested_cpc: number
  readiness_threshold: number
  placements: Placement[]
  gateways: string[]
  wallet_available: number
}

export interface Readiness {
  score: number
  threshold: number
  passes: boolean
  blockers: Tip[]
  tips: Tip[]
  checks: Record<string, { points: number; max: number; value: number | string | null }>
}

export interface Forecast {
  daily: { impressions: [number, number]; clicks: [number, number]; orders: [number, number]; spend: [number, number] }
  total: null | { impressions: [number, number]; clicks: [number, number]; orders: [number, number]; spend: [number, number] }
  days: number | null
  budget_limited: boolean
  assumptions: { expected_cpc: number; ctr: number; cvr: number; source: 'history' | 'traffic' }
}

export interface Overview {
  days: number
  totals: { spend: number; impressions: number; clicks: number; ctr: number | null; orders: number; revenue: number; roas: number | null; cost_per_order: number | null }
  daily: DailyPoint[]
  open_campaigns: number
}

export interface Suggestion { product_id: number; product_name: string; image_url?: string | null; estimated_boost_tnd: number; boost_explanation: string; already_sponsored: boolean; [k: string]: unknown }

export interface CampaignInput {
  product_id?: number
  daily_budget?: number
  max_cpc?: number | null
  total_budget?: number | null
  end_date?: string | null
  goal?: 'sales' | 'visibility'
  placements?: Placement[] | null
  target_gender?: string | null
  target_wilaya_ids?: string[] | null
  target_category_ids?: number[] | null
  target_price_min?: number | null
  target_price_max?: number | null
}

/** Error thrown for non-2xx answers; `code` is the backend's machine code (WALLET_TOO_LOW, NOT_READY, …). */
export class AdsApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public data?: any) {
    super(message)
  }
}

function token(): string | null {
  if (typeof window === 'undefined') return null
  for (const k of ['ct_auth_token', 'auth_token', 'token', 'access_token']) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k)
    if (v) return v
  }
  return null
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const t = token()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': currentLocale(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const firstError = json.errors ? (Object.values(json.errors)[0] as string[] | undefined)?.[0] : undefined
    throw new AdsApiError(firstError ?? json.message ?? 'Request failed', res.status, json.code, json)
  }
  return json as T
}

type Page<T> = { success: boolean; data: T[]; meta: { current_page: number; last_page: number; total: number } }

export interface SellerProductLite { id: number; name: string; price: number; stock: number; category_id: number | null; primary_image_url?: string | null; image_url?: string | null }

export const sellerAdsApi = {
  /** The seller's approved, active products (wizard step 1). */
  products: () =>
    request<{ data: { data: SellerProductLite[] } }>('GET', '/seller/products?is_approved=true&is_active=true&per_page=100').then(r => r.data?.data ?? []),
  categories: () => request<any>('GET', '/categories').then(r => (Array.isArray(r) ? r : r.data ?? []) as { id: number; name: string; slug: string }[]),
  config: (productId?: number) =>
    request<{ data: AdsSellerConfig }>('GET', `/seller/ads/config${productId ? `?product_id=${productId}` : ''}`).then(r => r.data),
  overview: (days = 30) => request<{ data: Overview }>('GET', `/seller/ads/overview?days=${days}`).then(r => r.data),
  suggestions: () => request<{ data: Suggestion[] }>('GET', '/seller/ads/suggestions').then(r => r.data),
  readiness: (productId: number) => request<{ data: Readiness }>('POST', '/seller/ads/readiness', { product_id: productId }).then(r => r.data),
  forecast: (body: { product_id: number; daily_budget: number; max_cpc?: number | null; days?: number | null }) =>
    request<{ data: Forecast }>('POST', '/seller/ads/forecast', body).then(r => r.data),

  wallet: () => request<{ data: Wallet }>('GET', '/seller/ads/wallet').then(r => r.data),
  transactions: (page = 1) => request<Page<WalletTx>>('GET', `/seller/ads/wallet/transactions?page=${page}`),
  topUps: () => request<{ data: TopUp[] }>('GET', '/seller/ads/wallet/top-ups').then(r => r.data),
  topUp: (body: { amount: number; gateway: string; reference?: string }) =>
    request<{ data: { top_up: TopUp; status: 'paid' | 'pending'; redirect_url: string | null; instructions: Record<string, string> | null; wallet: Wallet } }>('POST', '/seller/ads/wallet/top-up', body).then(r => r.data),

  campaigns: (status?: string, page = 1) =>
    request<Page<Campaign>>('GET', `/seller/ads/campaigns?page=${page}${status ? `&status=${status}` : ''}`),
  campaign: (id: number) => request<{ data: CampaignFull }>('GET', `/seller/ads/campaigns/${id}`).then(r => r.data),
  create: (body: CampaignInput) => request<{ data: Campaign }>('POST', '/seller/ads/campaigns', body).then(r => r.data),
  update: (id: number, body: CampaignInput) => request<{ data: Campaign }>('PATCH', `/seller/ads/campaigns/${id}`, body).then(r => r.data),
  pause: (id: number) => request<{ data: Campaign }>('POST', `/seller/ads/campaigns/${id}/pause`).then(r => r.data),
  resume: (id: number) => request<{ data: Campaign }>('POST', `/seller/ads/campaigns/${id}/resume`).then(r => r.data),
  cancel: (id: number) => request<{ data: Campaign & { refunded: number } }>('POST', `/seller/ads/campaigns/${id}/cancel`).then(r => r.data),
}
