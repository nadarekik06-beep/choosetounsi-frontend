'use client'

import { useEffect, useState } from 'react'
import { api, getUser, type AuthUser } from '@/lib/auth'
import { subscriptionApi, planTier, type SubscriptionStatus } from '@/lib/subscriptionApi'
import type { PlanKey } from '@/lib/platformApi'

/**
 * Which /become-a-vendor variant the signed-in user gets.
 *  - client:  no application yet, or a rejected one (form + "edit & resubmit" banner)
 *  - pending: application under review
 *  - seller:  approved seller (also covers approved sellers without an application row,
 *             so an existing seller is never shown the application form)
 */
export type VendorVariant = 'client' | 'pending' | 'seller'

export interface VendorState {
  variant: VendorVariant
  user: AuthUser | null
  status: SubscriptionStatus | null
  /** Plan slug as stored (can be an admin-defined custom slug). */
  plan: string
  /** Base experience the plan belongs to: free (0) / red (1) / black (2). */
  planKey: PlanKey
  tier: 0 | 1 | 2
}

const TIER_KEY: PlanKey[] = ['free', 'red', 'black']

export function resolveVendorState(user: AuthUser | null, status: SubscriptionStatus | null): VendorState {
  const approvedSeller = status?.status === 'approved'
    || status?.is_approved_seller === true
    || (status?.is_approved_seller === undefined && user?.role === 'seller' && !!user.is_approved)
  const variant: VendorVariant = approvedSeller ? 'seller' : status?.status === 'pending' ? 'pending' : 'client'
  const plan = status?.plan ?? user?.active_plan ?? 'free'
  const tier = (status?.plan_details?.tier ?? planTier(plan)) as 0 | 1 | 2
  return { variant, user, status, plan, planKey: status?.plan_details?.tier_key ?? TIER_KEY[tier], tier }
}

/**
 * Fresh role + subscription data. The stored user can be stale (e.g. approved
 * since login), so /auth/user is re-read; failures fall back to what we have.
 */
export async function loadVendorState(): Promise<VendorState> {
  // This call decides the variant: retry once on a network error before falling back.
  const status = await subscriptionApi.getStatus()
    .catch(() => new Promise(res => setTimeout(res, 1200)).then(() => subscriptionApi.getStatus()))
    .catch(() => null)
  // /seller/subscription carries the role-level answer (is_approved_seller), so one
  // request settles the variant. Only if it failed or predates that field is the
  // user re-read (the stored copy can be stale, e.g. approved since login).
  if (status && status.is_approved_seller !== undefined) return resolveVendorState(getUser(), status)
  const fresh = await api.get('/auth/user')
    .then(r => {
      const u = (r.data?.user ?? r.data?.data ?? r.data) as AuthUser
      return u && typeof u === 'object' && 'role' in u ? u : null
    })
    .catch(() => null)
  return resolveVendorState(fresh ?? getUser(), status)
}

// ── Seller overview (approved sellers only) ──────────────────────────────────

export interface SellerOverview {
  shopName: string | null
  avatar: string | null
  products: number | null
  orders: number | null
  views: number | null
}

/** Shop identity + headline numbers; each part falls back to null on its own. */
export function useSellerOverview(enabled: boolean) {
  const [data, setData] = useState<SellerOverview | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const body = (p: Promise<{ data: unknown }>) =>
      p.then(r => (r.data as { data?: Record<string, unknown> })?.data ?? null).catch(() => null)
    const fetchAll = () => Promise.all([
      body(api.get('/seller/store-profile')),
      body(api.get('/seller/products/stats')),
      body(api.get('/seller/dashboard')),
    ])
    // One retry if everything failed (slow network / busy server); then fall back to nulls.
    const load = async () => {
      const first = await fetchAll()
      if (first.some(x => x !== null)) return first
      await new Promise(res => setTimeout(res, 1500))
      return fetchAll()
    }
    load().then(([profile, products, dashboard]) => {
      if (!alive) return
      const summary = (dashboard?.summary ?? null) as Record<string, number> | null
      setData({
        shopName: (profile?.business_name as string) ?? null,
        avatar:   (profile?.avatar as string) ?? null,
        products: typeof products?.total === 'number' ? products.total : summary?.total_products ?? null,
        orders:   typeof summary?.total_orders === 'number' ? summary.total_orders : null,
        views:    typeof products?.total_views === 'number' ? products.total_views : null,
      })
    })
    return () => { alive = false }
  }, [enabled])
  return data
}
