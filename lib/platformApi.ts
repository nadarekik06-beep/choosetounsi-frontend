'use client'

import { useEffect, useState } from 'react'

/**
 * Live platform facts from the backend (single source of truth):
 *   GET /api/seller-plans          pricing cards: active plans with prices, formatted
 *                                  limits, capabilities and admin-managed display
 *                                  features (PricingCatalog, edited in the admin panel)
 *   GET /api/checkout/payment-info D17 account number from the backend .env
 *
 * Pages must display these values instead of hardcoding them.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '') + '/api'

/** Base experience (tier) a plan belongs to: Green / Red / Black Pepper. */
export type PlanKey = 'free' | 'red' | 'black'

/** One card line: a limit ("30 produits"), already formatted in French by the API. */
export interface PlanLimit {
  key: 'max_products' | 'max_images_per_product' | 'max_sponsored_products'
  value: number | null
  label: string
}

/** A code-enforced capability as shown on the card (admin may relabel or hide it). */
export interface PlanCapabilityItem {
  key: string
  label: string
  description: string | null
  icon: string
  included: boolean
}

/** An admin-managed marketing bullet. */
export interface PlanDisplayFeature {
  label: string
  description: string | null
  icon: string | null
  included: boolean
  highlight: boolean
}

export interface SellerPlanInfo {
  /** Plan slug: free / red / black or an admin-created plan. */
  key: string
  name: string
  price: number
  max_products: number | null
  commission_min: number
  commission_max: number
  tagline?: string | null
  badge_color?: string
  tier?: 0 | 1 | 2
  price_yearly?: number | null
  currency?: 'TND'
  billing_period?: 'monthly'
  trial_days?: number
  features?: Record<string, boolean>
  is_default?: boolean
  is_recommended?: boolean
  limits?: PlanLimit[]
  capabilities?: PlanCapabilityItem[]
  display_features?: PlanDisplayFeature[]
  /** Position in the API response (set client-side). */
  order?: number
}

/** Keyed by slug, in the API's order (display order, then price). */
export type SellerPlans = Record<string, SellerPlanInfo>

let plansPromise: Promise<SellerPlans> | null = null

export function fetchSellerPlans(): Promise<SellerPlans> {
  if (!plansPromise) {
    plansPromise = fetch(`${API_URL}/seller-plans`, { headers: { Accept: 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`seller-plans ${res.status}`)
        return res.json()
      })
      .then(json => Object.fromEntries(
        (json.data as SellerPlanInfo[]).map((p, order) => [p.key, { ...p, order }])
      ) as SellerPlans)
      .catch(err => {
        plansPromise = null // allow a retry on the next mount
        throw err
      })
  }
  return plansPromise
}

/** Live plans, or null while loading / if the request failed. */
export function useSellerPlans(): SellerPlans | null {
  return useSellerPlansState().plans
}

/** Live plans plus the request state, for pages that show loading / error / empty states. */
export function useSellerPlansState(): { plans: SellerPlans | null; failed: boolean; retry: () => void } {
  const [plans, setPlans] = useState<SellerPlans | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    fetchSellerPlans()
      .then(p => { if (alive) { setPlans(p); setFailed(false) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [attempt])
  return { plans, failed, retry: () => { setFailed(false); setAttempt(a => a + 1) } }
}

/** Plans in API order. */
export function planList(plans: SellerPlans | null | undefined): SellerPlanInfo[] {
  return plans ? Object.values(plans).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** "3% – 15%" */
export function formatCommission(plan: SellerPlanInfo | undefined | null): string {
  if (!plan) return '…'
  return plan.commission_min === plan.commission_max
    ? `${num(plan.commission_min)}%`
    : `${num(plan.commission_min)}% – ${num(plan.commission_max)}%`
}

/** "49 DT" / "Free" */
export function formatPlanPrice(plan: SellerPlanInfo | undefined | null): string {
  if (!plan) return '…'
  return plan.price === 0 ? 'Free' : `${num(plan.price)} DT`
}

export function formatMaxProducts(plan: SellerPlanInfo | undefined | null): string {
  if (!plan) return '…'
  return plan.max_products === null ? 'Unlimited products' : `Up to ${plan.max_products} products`
}

export interface PaymentInfo {
  d17_account_number: string | null
  /** Admin switches: a disabled method shows "Coming soon" and the API refuses it */
  payment_methods: Record<'cod' | 'card' | 'd17' | 'wallet', boolean>
}

/** Launch: cash on delivery only, until the admin turns a method on. */
export const COD_ONLY: PaymentInfo['payment_methods'] = { cod: true, card: false, d17: false, wallet: false }

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  const res = await fetch(`${API_URL}/checkout/payment-info`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`payment-info ${res.status}`)
  const json = await res.json()
  return {
    d17_account_number: json?.data?.d17_account_number ?? null,
    payment_methods: { ...COD_ONLY, ...(json?.data?.payment_methods ?? {}), cod: true },
  }
}

// ── Site features (GET /api/site-features) ─────────────────────────────────
// Storefront sections the admin switches on/off. Everything stays hidden until
// the backend says otherwise, so a disabled section never flashes on screen.

export interface SiteFeatures { wear_tounsi: boolean }

const FEATURES_OFF: SiteFeatures = { wear_tounsi: false }

let featuresPromise: Promise<SiteFeatures> | null = null

export function fetchSiteFeatures(): Promise<SiteFeatures> {
  if (!featuresPromise) {
    featuresPromise = fetch(`${API_URL}/site-features`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(j => ({ ...FEATURES_OFF, ...(j?.data ?? {}) }) as SiteFeatures)
      .catch(() => { featuresPromise = null; return FEATURES_OFF })
  }
  return featuresPromise
}

/** null while loading. */
export function useSiteFeatures(): SiteFeatures | null {
  const [features, setFeatures] = useState<SiteFeatures | null>(null)
  useEffect(() => {
    let alive = true
    fetchSiteFeatures().then(f => { if (alive) setFeatures(f) })
    return () => { alive = false }
  }, [])
  return features
}
