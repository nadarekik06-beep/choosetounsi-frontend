'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useWilayaLabel } from '@/lib/i18n/wilayas'
import { SectionHeading, type ShowcaseSeller } from './shared'

const PLAN_LABEL: Record<string, { name: string; tone: string }> = {
  free:  { name: 'Green Pepper', tone: 'green' },
  green: { name: 'Green Pepper', tone: 'green' },
  red:   { name: 'Red Pepper',   tone: 'red'   },
  black: { name: 'Black Pepper', tone: 'black' },
}
// Below this many shops a looping marquee would just repeat the same faces: show a static row.
const MARQUEE_MIN = 5

function SellerCard({ s, hidden }: { s: ShowcaseSeller; hidden?: boolean }) {
  const t = useTranslations('vendor.landing.showcase')
  const wilayaLabel = useWilayaLabel()
  const plan = PLAN_LABEL[s.plan] ?? PLAN_LABEL.free
  const initials = s.business_name.trim().slice(0, 2).toUpperCase()

  return (
    <li className="vl-seller" aria-hidden={hidden || undefined}>
      <Link href={`/sellers/${s.id}`} className="vl-seller__link" tabIndex={hidden ? -1 : undefined}>
        <span className="vl-seller__avatar">
          {s.avatar
            ? <img src={s.avatar} alt="" loading="lazy" decoding="async" width={56} height={56} />
            : <span aria-hidden="true">{initials}</span>}
        </span>
        <span className="vl-seller__body">
          <span className="vl-seller__name">{s.business_name}</span>
          <span className="vl-seller__meta">
            {s.wilaya && <><MapPin size={12} aria-hidden="true" />{wilayaLabel(s.wilaya)}</>}
            <span className={`vl-seller__plan vl-seller__plan--${plan.tone}`}>{plan.name}</span>
          </span>
          {s.quote && <span className="vl-seller__quote" dir="auto">“{s.quote}”</span>}
        </span>
        <span className="sr-only">{t('visit')}</span>
      </Link>
    </li>
  )
}

/** Approved shops from GET /api/seller-landing, linking to their storefronts. Hidden when there are none. */
export default function SellerShowcase({ sellers }: { sellers: ShowcaseSeller[] | undefined }) {
  const t = useTranslations('vendor.landing.showcase')
  if (!sellers || sellers.length === 0) return null

  const marquee = sellers.length >= MARQUEE_MIN

  return (
    <section className="vl-section vl-showcase" aria-labelledby="vl-showcase-title">
      <div className="vl-container">
        <SectionHeading id="vl-showcase-title" tone="green" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
      </div>
      {marquee ? (
        <div className="vl-marquee">
          {/* second copy makes the loop seamless; it is hidden from assistive tech */}
          <ul className="vl-marquee__track" style={{ '--n': sellers.length } as React.CSSProperties}>
            {sellers.map(s => <SellerCard key={s.id} s={s} />)}
            {sellers.map(s => <SellerCard key={`dup-${s.id}`} s={s} hidden />)}
          </ul>
        </div>
      ) : (
        <div className="vl-container">
          <ul className="vl-sellers-row">
            {sellers.map(s => <SellerCard key={s.id} s={s} />)}
          </ul>
        </div>
      )}
    </section>
  )
}
