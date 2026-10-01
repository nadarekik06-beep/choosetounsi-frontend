'use client'

import { useId, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCommission, type SellerPlans } from '@/lib/platformApi'
import { Reveal, SectionHeading } from './shared'

type VendorT = ReturnType<typeof useTranslations>

// Platform rules (vendor.rules.<key>.p1…). The commission lines come from /api/seller-plans.
const RULES = [
  { key: 'quality',    points: 4 },
  { key: 'prohibited', points: 4 },
  { key: 'fulfilment', points: 4 },
  { key: 'commission', points: 1 },
]

function commissionRulePoints(plans: SellerPlans | null, t: VendorT): string[] {
  if (!plans) return []
  return [
    t('rules.commissionGreen', { rate: formatCommission(plans.free) }),
    t('rules.commissionRed', { rate: formatCommission(plans.red) }),
    t('rules.commissionBlack', { rate: formatCommission(plans.black) }),
    t('rules.commissionNote'),
  ]
}

function FaqItem({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li className={`vl-faq__item${open ? ' is-open' : ''}`}>
      <h3 className="vl-faq__h">
        <button type="button" className="vl-faq__q" aria-expanded={open} aria-controls={`${id}-a`} id={`${id}-q`}
          onClick={() => setOpen(o => !o)}>
          <span>{q}</span>
          <span className="vl-faq__icon" aria-hidden="true"><Plus size={18} /></span>
        </button>
      </h3>
      <div className="vl-faq__panel" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} inert={!open}>
        <div className="vl-faq__clip">
          <div className="vl-faq__a">{children}</div>
        </div>
      </div>
    </li>
  )
}

export default function FaqSection({ plans }: { plans: SellerPlans | null }) {
  const t  = useTranslations('vendor')
  const tf = useTranslations('vendor.landing.faq')
  const free = plans?.free

  const general: { key: string; a: ReactNode }[] = [
    {
      key: 'cost',
      a: !free ? '…'
        : free.max_products === null
          ? tf('a.costUnlimited', { plan: free.name, rate: formatCommission(free) })
          : tf('a.cost', { plan: free.name, count: free.max_products, rate: formatCommission(free) }),
    },
    { key: 'review',   a: tf('a.review') },
    { key: 'payout',   a: tf('a.payout') },
    { key: 'delivery', a: tf('a.delivery') },
    { key: 'upgrade',  a: tf('a.upgrade') },
  ]

  return (
    <section className="vl-section" aria-labelledby="vl-faq-title">
      <div className="vl-container vl-faq">
        <SectionHeading id="vl-faq-title" eyebrow={tf('eyebrow')} line1={tf('title1')} line2={tf('title2')} />

        <Reveal as="ul" className="vl-faq__list">
          {general.map(({ key, a }) => (
            <FaqItem key={key} q={tf(`q.${key}`)}><p>{a}</p></FaqItem>
          ))}
        </Reveal>

        <Reveal className="vl-faq__group">
          <h3 className="vl-faq__group-title">{tf('rulesTitle')}</h3>
          <p className="vl-faq__group-lead">{t('rulesSubtitle')}</p>
        </Reveal>
        <Reveal as="ul" className="vl-faq__list">
          {RULES.map(({ key, points }) => {
            const own = Array.from({ length: points }, (_, i) => t(`rules.${key}.p${i + 1}`))
            const list = key === 'commission' ? [...commissionRulePoints(plans, t), ...own] : own
            return (
              <FaqItem key={key} q={t(`rules.${key}.title`)}>
                <ul className="vl-faq__points">
                  {list.map(p => <li key={p}>{p}</li>)}
                </ul>
              </FaqItem>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
