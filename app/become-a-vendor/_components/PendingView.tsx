'use client'

import { forwardRef } from 'react'
import Link from 'next/link'
import { Send, SearchCheck, PartyPopper, ShieldCheck, MailCheck, Rocket, Hourglass, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import StoreStage, { signText } from './StoreStage'
import { ArrowIcon, Eyebrow, Reveal, SectionHeading } from './shared'

const STEPS: { key: 'sent' | 'review' | 'approved'; Icon: LucideIcon; state: 'done' | 'active' | 'todo' }[] = [
  { key: 'sent',     Icon: Send,        state: 'done' },
  { key: 'review',   Icon: SearchCheck, state: 'active' },
  { key: 'approved', Icon: PartyPopper, state: 'todo' },
]

/** Application under review: friendly status hero with a live-looking timeline. */
export const PendingHero = forwardRef<HTMLElement, { submittedAt: string | null; shopName?: string | null; onView: () => void }>(
  function PendingHero({ submittedAt, shopName, onView }, ref) {
    const t = useTranslations('vendor.pending')
    const fmt = useFormat()

    return (
      <section ref={ref} className="vl-hero vl-hero--pending" aria-labelledby="vl-hero-title">
        <TunisianPattern color="#b45309" className="vl-pattern vl-pattern--hero" />
        <div className="vl-container vl-hero__grid">
          <div className="vl-hero__copy">
            <div className="vl-hero__in" style={{ '--i': 0 } as React.CSSProperties}>
              <Eyebrow tone="green">{t('eyebrow')}</Eyebrow>
            </div>
            <h1 id="vl-hero-title" className="vl-title vl-title--green vl-hero__title vl-hero__title--seller vl-hero__in" style={{ '--i': 1 } as React.CSSProperties}>
              {t('title1')}<br /><em>{t('title2')}</em>
            </h1>
            <p className="vl-lead vl-hero__in" style={{ '--i': 2 } as React.CSSProperties}>{t('subtitle')}</p>

            <div className="vl-timeline vl-hero__in" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="vl-timeline__line" aria-hidden="true"><span /></div>
            <ol className="vl-timeline__steps" aria-label={t('timelineLabel')}>
              {STEPS.map(({ key, Icon, state }) => (
                <li key={key} className={`vl-timeline__step is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                  <span className="vl-timeline__dot"><Icon size={18} aria-hidden="true" /></span>
                  <span className="vl-timeline__label">{t(`steps.${key}`)}</span>
                  <span className="vl-timeline__meta">
                    {key === 'sent' && submittedAt ? fmt.date(submittedAt, 'short') : t(`stepsMeta.${key}`)}
                  </span>
                  <span className="sr-only">{t(`stepState.${state}`)}</span>
                </li>
              ))}
            </ol>
            </div>

            <div className="vl-hero__actions vl-hero__in" style={{ '--i': 4 } as React.CSSProperties}>
              <button type="button" className="vl-btn vl-btn--primary" onClick={onView}>{t('view')}<ArrowIcon /></button>
              <Link href="/" className="vl-btn vl-btn--ghost">{t('browse')}</Link>
            </div>
          </div>

          <StoreStage tone="gold" signLabel={signText(shopName)}>
            <span className="vl-chip vl-chip--review"><Hourglass size={14} aria-hidden="true" />{t('chip')}</span>
            <span className="vl-chip vl-chip--eta">⏱ {t('eta')}</span>
          </StoreStage>
        </div>
      </section>
    )
  })

const NEXT: { key: 'check' | 'notify' | 'launch'; Icon: LucideIcon; tone: 'red' | 'green' | 'gold' }[] = [
  { key: 'check',  Icon: ShieldCheck, tone: 'gold' },
  { key: 'notify', Icon: MailCheck,   tone: 'green' },
  { key: 'launch', Icon: Rocket,      tone: 'red' },
]

export function PendingNext() {
  const t = useTranslations('vendor.pending.next')
  return (
    <section className="vl-section vl-section--tint" aria-labelledby="vl-next-title">
      <div className="vl-container">
        <SectionHeading id="vl-next-title" tone="green" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
        <ul className="vl-next">
          {NEXT.map(({ key, Icon, tone }, i) => (
            <Reveal as="li" key={key} index={i} className="vl-card vl-next__card">
              <span className="vl-next__num" aria-hidden="true">{i + 1}</span>
              <span className={`vl-card__icon vl-tone--${tone}`}><Icon size={20} aria-hidden="true" /></span>
              <h3 className="vl-card__title">{t(`${key}.title`)}</h3>
              <p className="vl-card__desc">{t(`${key}.desc`)}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
