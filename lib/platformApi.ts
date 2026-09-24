'use client'

import { useEffect, useState } from 'react'

/**
 * Live platform facts from the backend (single source of truth):
 *   GET /api/seller-plans          plan prices, product limits, commission ranges
 *                                  (SellerSubscription constants + CommissionService)
 *   GET /api/checkout/payment-info D17 account number from the backend .env
 *
 * Pages must display these values instead of hardcoding them.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '') + '/api'

export type PlanKey = 'free' | 'red' | 'black'

export interface SellerPlanInfo {
  key: PlanKey
  name: string
  price: number
  max_products: number | null
  commission_min: number
  commission_max: number
  // Admin-managed plan fields (subscription_plans)
  description?: string | null
  badge_color?: string
  tier?: 0 | 1 | 2
  price_yearly?: number | null
  trial_days?: number
  features?: Record<string, boolean>
}

export type SellerPlans = Record<PlanKey, SellerPlanInfo>

let plansPromise: Promise<SellerPlans> | null = null

export function fetchSellerPlans(): Promise<SellerPlans> {
  if (!plansPromise) {
    plansPromise = fetch(`${API_URL}/seller-plans`, { headers: { Accept: 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`seller-plans ${res.status}`)
        return res.json()
      })
      .then(json => Object.fromEntries(
        (json.data as SellerPlanInfo[]).map(p => [p.key, p])
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
  const [plans, setPlans] = useState<SellerPlans | null>(null)
  useEffect(() => {
    let alive = true
    fetchSellerPlans().then(p => { if (alive) setPlans(p) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return plans
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
}

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  const res = await fetch(`${API_URL}/checkout/payment-info`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`payment-info ${res.status}`)
  const json = await res.json()
  return { d17_account_number: json?.data?.d17_account_number ?? null }
}
