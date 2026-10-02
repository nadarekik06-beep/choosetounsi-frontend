'use client'

import Link from 'next/link'
import {
  BadgeCheck, Megaphone, Sparkles, BarChart3, Crown, Headset, Tag, CalendarClock, Receipt,
  Percent, Package, PlusCircle, ShoppingBag, Store, type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { formatCommission, type PlanKey, type SellerPlans } from '@/lib/platformApi'
import type { SubscriptionStatus } from '@/lib/subscriptionApi'
import { ArrowIcon, PLAN_STYLES, Reveal, SectionHeading, usePlanPrice } from '../shared'

// ── Perks ────────────────────────────────────────────────────────────────────

interface Perk { key: string; Icon: LucideIcon; href: string; tone: 'red' | 'green' | 'gold' }

/** Active perks, derived from the plan's real feature flags (the verified badge comes with every approved shop). */
export function activePerks(features: Record<string, boolean> | undefined, sellerId: number | null): Perk[] {
  const f = features ?? {}
  const perks: Perk[] = []
  if (sellerId !== null) perks.push({ key: 'verified', Icon: BadgeCheck, href: `/sellers/${sellerId}`, tone: 'green' })
  if (f.sponsorships) perks.push({ key: 'visibility', Icon: Megaphone, href: '/seller/promote', tone: 'red' })
  if (f.ai_tools)     perks.push({ key: 'ai', Icon: Sparkles, href: '/seller/ai-tools', tone: 'gold' })
  if (f.analytics)    perks.push({ key: 'analytics', Icon: BarChart3, href: '/seller/analytics', tone: 'green' })
  if (f.black_hub)    perks.push({ key: 'blackHub', Icon: Crown, href: '/seller/black', tone: 'gold' })
  if (f.black_hub)    perks.push({ key: 'vip', Icon: Headset, href: '/seller/black/vip-lounge', tone: 'red' })
  if (f.promotions)   perks.push({ key: 'promotions', Icon: Tag, href: '/seller/promotions', tone: 'red' })
  return perks
}

export function PerksGrid({ perks }: { perks: Perk[] }) {
  const t = useTranslations('vendor.seller.perks')
  if (perks.length === 0) return null
  return (
    <section className="vl-section" aria-labelledby="vl-perks-title">
      <div className="vl-container">
        <SectionHeading id="vl-perks-title" tone="green" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
        <ul className="vl-perks">
          {perks.map(({ key, Icon, href, tone }, i) => (
            <Reveal as="li" key={key} index={i}>
              <Link href={href} className="vl-perk">
                <span className="vl-perk__unlock" aria-hidden="true">✓</span>
                <span className={`vl-card__icon vl-tone--${tone}`}><Icon size={20} aria-hidden="true" /></span>
                <span className="vl-perk__title">{t(`${key}.title`)}</span>
                <span className="vl-perk__desc">{t(`${key}.desc`)}</span>
                <span className="vl-perk__link">{t(`${key}.cta`)}<ArrowIcon /></span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ── Plan info + "go further" ─────────────────────────────────────────────────

const STATUS_TONE: Record<string, 'green' | 'gold' | 'red'> = {
  active: 'green', trial: 'green', grace_period: 'gold', past_due: 'gold', canceled: 'red', expired: 'red', suspended: 'red',
}

export function PlanInfo({ status, plans, planKey, nextKey, onUpgrade }: {
  status: SubscriptionStatus | null; plans: SellerPlans | null; planKey: PlanKey
  /** Next tier up, if one exists. */
  nextKey: PlanKey | null
  onUpgrade: (k: PlanKey) => void
}) {
  const t  = useTranslations('vendor.seller.planInfo')
  const tv = useTranslations('vendor')
  const tf = useTranslations('vendor.landing.plans.features')
  const fmt = useFormat()
  const priceOf = usePlanPrice()
  const plan = plans?.[planKey]
  const sub = status?.subscription ?? null
  const next = nextKey ? plans?.[nextKey] : null
  const style = PLAN_STYLES[planKey]
  const Icon = style.Icon

  const end = sub?.billing_cycle_end ?? null
  const ended = end !== null && (sub?.days_remaining ?? 0) <= 0
  const statusKey = sub?.status && sub.status in STATUS_TONE ? sub.status : null
  const nextUnlocks = next && plan ? Object.keys(next.features ?? {}).filter(f => next.features?.[f] && !plan.features?.[f]) : []

  return (
    <section className="vl-section vl-section--tint" aria-labelledby="vl-planinfo-title">
      <div className="vl-container">
        <SectionHeading id="vl-planinfo-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={plan?.name ?? status?.plan_details?.name ?? '…'} />
        <div className={`vl-planinfo${next ? '' : ' vl-planinfo--solo'}`}>
          <Reveal className={`vl-planinfo__card${style.dark ? ' is-dark' : ''}`} style={{ '--accent': style.accent } as React.CSSProperties}>
            <span className="vl-planinfo__shine" aria-hidden="true" />
            <div className="vl-planinfo__top">
              <span className="vl-plan__icon"><Icon size={22} aria-hidden="true" /></span>
              <div className="vl-planinfo__name">
                <b>{plan?.name ?? '…'}</b>
                <span className="ltr-iso">{priceOf(plan)}{plan && plan.price > 0 ? ` / ${tv('perMonthShort')}` : ''}</span>
              </div>
              {statusKey && <span className={`vl-status vl-status--${STATUS_TONE[statusKey]}`}>{t(`status.${statusKey}`)}</span>}
            </div>

            <dl className="vl-planinfo__facts">
              {end && (
                <div>
                  <dt><CalendarClock size={15} aria-hidden="true" />{ended ? t('periodEnded') : t('renewal')}</dt>
                  <dd>
                    {fmt.date(end, 'long')}
                    {!ended && sub && <small>{t('daysLeft', { count: sub.days_remaining })}</small>}
                    {ended && <small className="is-warn">{t('renewHint')}</small>}
                  </dd>
                </div>
              )}
              {sub?.has_pending_downgrade && sub.pending_plan && (
                <div><dt><CalendarClock size={15} aria-hidden="true" />{t('pendingChange')}</dt><dd>{plans?.[sub.pending_plan as PlanKey]?.name ?? sub.pending_plan}</dd></div>
              )}
              <div><dt><Percent size={15} aria-hidden="true" />{t('commission')}</dt><dd className="ltr-iso">{formatCommission(plan)}</dd></div>
              <div>
                <dt><Package size={15} aria-hidden="true" />{t('products')}</dt>
                <dd>{!plan ? '…' : plan.max_products === null ? tv('unlimitedProducts') : tv('maxProducts', { count: plan.max_products })}</dd>
              </div>
              {status?.last_payment && (
                <div>
                  <dt><Receipt size={15} aria-hidden="true" />{t('lastPayment')}</dt>
                  <dd><span className="ltr-iso">{fmt.price(status.last_payment.amount)}</span><small>{fmt.date(status.last_payment.created_at, 'long')}</small></dd>
                </div>
              )}
            </dl>

            <Link href="/seller/subscription" className="vl-btn vl-btn--ghost vl-planinfo__manage">{t('manage')}<ArrowIcon /></Link>
          </Reveal>

          {next && (
            <Reveal index={1} className="vl-further" style={{ '--accent': PLAN_STYLES[nextKey!].accent } as React.CSSProperties}>
              <p className="vl-further__eyebrow">{t('furtherEyebrow')}</p>
              <h3 className="vl-further__title">{t('furtherTitle', { plan: next.name })}</h3>
              {nextUnlocks.length > 0 && (
                <ul className="vl-further__chips">
                  {nextUnlocks.map(f => <li key={f}>{tf(f)}</li>)}
                  {next.max_products === null && plan?.max_products !== null && <li>{tv('unlimitedProducts')}</li>}
                </ul>
              )}
              <p className="vl-further__price ltr-iso">{priceOf(next)} <span>/ {tv('perMonthShort')}</span></p>
              <button type="button" className="vl-further__cta" onClick={() => onUpgrade(nextKey!)}>
                {t('furtherCta', { plan: next.name })}<ArrowIcon />
              </button>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Shortcuts (every approved seller) ────────────────────────────────────────

export function Shortcuts({ sellerId, hasAi }: { sellerId: number | null; hasAi: boolean }) {
  const t = useTranslations('vendor.seller.shortcuts')
  const items: { key: string; Icon: LucideIcon; href: string }[] = [
    { key: 'addProduct', Icon: PlusCircle,  href: '/seller/products' },
    { key: 'orders',     Icon: ShoppingBag, href: '/seller/orders' },
    hasAi ? { key: 'ai', Icon: Sparkles, href: '/seller/ai-tools' } : { key: 'promotions', Icon: Tag, href: '/seller/promotions' },
    ...(sellerId !== null ? [{ key: 'shop', Icon: Store, href: `/sellers/${sellerId}` }] : []),
  ]
  return (
    <section className="vl-section vl-shortcuts-section" aria-labelledby="vl-shortcuts-title">
      <div className="vl-container">
        <SectionHeading id="vl-shortcuts-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
        <ul className="vl-shortcuts">
          {items.map(({ key, Icon, href }, i) => (
            <Reveal as="li" key={key} index={i}>
              <Link href={href} className="vl-shortcut">
                <span className="vl-shortcut__icon"><Icon size={22} aria-hidden="true" /></span>
                <span className="vl-shortcut__label">{t(key)}</span>
                <ArrowIcon />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
