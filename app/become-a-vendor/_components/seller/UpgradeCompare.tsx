'use client'

import { useState, type ReactNode } from 'react'
import { Check, Package, Percent, Sparkles, BarChart3, Crown, Megaphone, Tag, TicketPercent, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCommission, type PlanKey, type SellerPlans } from '@/lib/platformApi'
import { ArrowIcon, PLAN_STYLES, Reveal, SectionHeading } from '../shared'

const FEATURE_ICON: Record<string, LucideIcon> = {
  promotions: Tag, coupons: TicketPercent, sponsorships: Megaphone,
  analytics: BarChart3, ai_tools: Sparkles, black_hub: Crown,
}

/** Padlock whose shackle lifts open on row hover/focus or tap (transform only). */
function Lock() {
  return (
    <svg className="vl-lock" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path className="vl-lock__shackle" d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="currentColor" />
      <circle cx="12" cy="16" r="1.6" fill="#fff" />
    </svg>
  )
}

interface Row { key: string; Icon: LucideIcon; label: string; mine: ReactNode; theirs: ReactNode; locked: boolean }

export default function UpgradeCompare({ plans, current, target, onUpgrade }: {
  plans: SellerPlans | null; current: PlanKey; target: PlanKey; onUpgrade: (k: PlanKey) => void
}) {
  const t  = useTranslations('vendor.seller.compare')
  const tv = useTranslations('vendor')
  const [open, setOpen] = useState<string | null>(null)
  const mine = plans?.[current]
  const theirs = plans?.[target]
  const accent = PLAN_STYLES[target].accent

  const rows: Row[] = []
  if (mine && theirs) {
    const cap = (n: number | null) => (n === null ? tv('unlimitedProducts') : tv('maxProducts', { count: n }))
    const more = theirs.max_products === null ? mine.max_products !== null : mine.max_products !== null && theirs.max_products > mine.max_products
    if (more) rows.push({ key: 'products', Icon: Package, label: t('products'), mine: cap(mine.max_products), theirs: cap(theirs.max_products), locked: false })
    if (theirs.commission_max < mine.commission_max) {
      rows.push({ key: 'commission', Icon: Percent, label: t('commission'), mine: formatCommission(mine), theirs: formatCommission(theirs), locked: false })
    }
    // Capabilities as the pricing page words them (admin-editable labels)
    for (const c of theirs.capabilities ?? []) {
      if (c.included && !mine.features?.[c.key]) {
        rows.push({ key: c.key, Icon: FEATURE_ICON[c.key] ?? Check, label: c.label, mine: null, theirs: null, locked: true })
      }
    }
  }

  return (
    <section className="vl-section vl-compare-section" aria-labelledby="vl-compare-title">
      <div className="vl-container">
        <SectionHeading id="vl-compare-title" eyebrow={t('eyebrow')} line1={t('title1')}
          line2={theirs?.name ?? '…'} lead={t('lead', { plan: theirs?.name ?? '…' })} />

        <Reveal className="vl-compare" style={{ '--accent': accent } as React.CSSProperties}>
          <div className="vl-compare__head" aria-hidden="true">
            <span />
            <span className="vl-compare__col vl-compare__col--mine">{t('yours')}<b>{mine?.name ?? '…'}</b></span>
            <span className="vl-compare__col vl-compare__col--theirs">{t('next')}<b>{theirs?.name ?? '…'}</b></span>
          </div>

          <ul className="vl-compare__rows" aria-busy={!plans}>
            {!plans && Array.from({ length: 4 }, (_, i) => <li key={i} className="vl-compare__row vl-compare__row--skeleton" />)}
            {rows.map(({ key, Icon, label, mine: m, theirs: th, locked }, i) => (
              <li key={key}
                className={`vl-compare__row vl-reveal-row${locked ? ' is-locked' : ''}${open === key ? ' is-open' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                onClick={locked ? () => setOpen(o => (o === key ? null : key)) : undefined}>
                <span className="vl-compare__label"><span className="vl-compare__icon"><Icon size={16} aria-hidden="true" /></span>{label}</span>
                <span className="vl-compare__cell vl-compare__cell--mine">
                  {locked ? <><Lock /><span className="sr-only">{t('notInYours')}</span></> : <span className="ltr-iso">{m}</span>}
                </span>
                <span className="vl-compare__cell vl-compare__cell--theirs">
                  {locked
                    ? <><span className="vl-compare__check"><Check size={13} aria-hidden="true" /></span><span className="sr-only">{t('included', { plan: theirs?.name ?? '' })}</span></>
                    : <span className="ltr-iso">{th}</span>}
                </span>
              </li>
            ))}
          </ul>

          <div className="vl-compare__foot">
            <button type="button" className="vl-btn vl-btn--primary" onClick={() => onUpgrade(target)} disabled={!theirs}>
              {t('cta', { plan: theirs?.name ?? '…' })}<ArrowIcon />
            </button>
            <p className="vl-compare__note">{t('note')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
