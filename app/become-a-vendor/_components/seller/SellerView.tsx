'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { Package, ShoppingBag, Eye, PlusCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import type { PlanKey, SellerPlans } from '@/lib/platformApi'
import PlansSection from '../PlansSection'
import { StatTiles, type StatTile } from '../StatsStrip'
import StickyMobileCta from '../StickyMobileCta'
import { ArrowIcon, PLAN_ORDER, scrollToEl } from '../shared'
import type { VendorState } from '../vendorState'
import { useSellerOverview } from '../vendorState'
import SellerHero from './SellerHero'
import UpgradeCompare from './UpgradeCompare'
import UpgradePanel from './UpgradePanel'
import { PerksGrid, PlanInfo, Shortcuts, activePerks } from './PremiumSections'

/**
 * Approved sellers. Basic plan (tier 0): welcome + own stats + what the next plan
 * unlocks + plan cards + the real upgrade flow. Upgraded plans: VIP welcome,
 * active perks, live subscription details, an optional "go further" card.
 */
export default function SellerView({ state, plans }: { state: VendorState; plans: SellerPlans | null }) {
  const t  = useTranslations('vendor.seller')
  const reduced = useReducedMotion()
  const overview = useSellerOverview(true)

  const heroRef    = useRef<HTMLElement>(null)
  const plansRef   = useRef<HTMLElement>(null)
  const upgradeRef = useRef<HTMLElement>(null)
  const [upgradeTo, setUpgradeTo] = useState<PlanKey | null>(null)

  const { user, status, planKey, tier, plan: planSlug } = state
  const premium  = tier > 0
  const sellerId = user?.id ?? null
  const myPlan   = plans?.[planKey]
  const planName = myPlan?.name ?? status?.plan_details?.name ?? '…'
  const features = myPlan?.features ?? status?.plan_details?.features
  const nextKey  = PLAN_ORDER.find(k => PLAN_ORDER.indexOf(k) > PLAN_ORDER.indexOf(planKey) && (!plans || plans[k])) ?? null

  // Only plans above the current one can be requested (same rule as before).
  const startUpgrade = useCallback((k: PlanKey) => {
    if (PLAN_ORDER.indexOf(k) <= PLAN_ORDER.indexOf(planKey)) return
    setUpgradeTo(k)
    setTimeout(() => scrollToEl(upgradeRef.current, reduced), 60)
  }, [planKey, reduced])

  const stats: StatTile[] | null = overview && [
    overview.products !== null && { key: 'products', label: t('stats.products'), Icon: Package,     tone: 'red',   end: overview.products },
    overview.orders   !== null && { key: 'orders',   label: t('stats.orders'),   Icon: ShoppingBag, tone: 'green', end: overview.orders },
    overview.views    !== null && { key: 'views',    label: t('stats.views'),    Icon: Eye,         tone: 'gold',  end: overview.views },
  ].filter(Boolean) as StatTile[]

  return (
    <>
      <SellerHero ref={heroRef} name={user?.name ?? null} shopName={overview?.shopName ?? null} avatar={overview?.avatar ?? null}
        sellerId={sellerId} planKey={planKey} planName={planName} premium={premium}
        onSeePlans={premium ? undefined : () => scrollToEl(plansRef.current, reduced)} />

      {overview && overview.products === 0 && !overview.orders ? (
        // Brand-new shop: an encouraging first step instead of a row of zeros.
        <div className="vl-stats-wrap vl-stats-wrap--compact">
          <div className="vl-container">
            <Link href="/seller/products" className="vl-firststep">
              <span className="vl-firststep__icon" aria-hidden="true"><PlusCircle size={22} /></span>
              <span className="vl-firststep__text">
                <b>{t('firstStep.title')}</b>
                <span>{t('firstStep.desc')}</span>
              </span>
              <ArrowIcon />
            </Link>
          </div>
        </div>
      ) : (!overview || (stats && stats.length > 0)) && (
        <StatTiles items={stats} label={t('stats.label')} skeletons={3} compact />
      )}

      {premium ? (
        <>
          <PerksGrid perks={activePerks(features, sellerId)} />
          <PlanInfo status={status} plans={plans} planKey={planKey} nextKey={nextKey} onUpgrade={startUpgrade} />
        </>
      ) : (
        <>
          {nextKey && <UpgradeCompare plans={plans} current={planKey} target={nextKey} onUpgrade={startUpgrade} />}
          <PlansSection ref={plansRef} plans={plans}
            onSelect={slug => { if ((PLAN_ORDER as string[]).includes(slug)) startUpgrade(slug as PlanKey) }}
            current={plans?.[planSlug] ? planSlug : planKey} highlight={nextKey ?? undefined} ribbon={t('plans.ribbon')}
            heading={{ eyebrow: t('plans.eyebrow'), line1: t('plans.title1'), line2: t('plans.title2'), lead: t('plans.lead') }}
            ctaLabel={p => t('plans.cta', { plan: p.name })}
            hint={() => t('plans.hint')}
            note={null} />
        </>
      )}

      <UpgradePanel ref={upgradeRef} planKey={upgradeTo} plans={plans} onClose={() => setUpgradeTo(null)} />
      <Shortcuts sellerId={sellerId} hasAi={!!features?.ai_tools} />

      {premium ? (
        <StickyMobileCta heroRef={heroRef} label={t('sticky.dashboard')} href="/seller" />
      ) : nextKey && (
        <StickyMobileCta heroRef={heroRef} hideRef={upgradeTo ? upgradeRef : plansRef}
          label={t('sticky.upgrade', { plan: plans?.[nextKey]?.name ?? '…' })} icon="🌶️"
          onClick={() => scrollToEl(plansRef.current, reduced)} />
      )}
    </>
  )
}
