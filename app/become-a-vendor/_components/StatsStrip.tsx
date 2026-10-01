'use client'

import { Store, PackageCheck, MapPin, Star, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { useFormat } from '@/lib/i18n/useFormat'
import CountUp from '@/app/components/home/CountUp'
import type { LandingStats } from './shared'

interface StatItem { key: string; Icon: LucideIcon; tone: string; end: number; suffix?: string; decimals?: number }

/** Live platform numbers (GET /api/seller-landing). Hidden if the request failed; zero values are skipped. */
export default function StatsStrip({ stats, failed }: { stats: LandingStats | null; failed: boolean }) {
  const t = useTranslations('vendor.landing.stats')
  const { number } = useFormat()
  const { ref, seen } = useInView<HTMLDivElement>({ threshold: 0.3 })

  if (failed) return null

  const items: StatItem[] = stats ? ([
    { key: 'sellers', Icon: Store,        tone: 'red',   end: stats.sellers },
    { key: 'orders',  Icon: PackageCheck, tone: 'green', end: stats.orders_delivered },
    { key: 'wilayas', Icon: MapPin,       tone: 'red',   end: stats.wilayas_served },
    { key: 'rating',  Icon: Star,         tone: 'gold',  end: stats.average_rating ?? 0, suffix: '/5', decimals: 1 },
  ] as StatItem[]).filter(s => s.end > 0) : []

  return (
    <section className="vl-stats-wrap" aria-label={t('label')}>
      <div className="vl-container">
        <div ref={ref} className={`vl-stats vl-reveal${seen ? ' is-in' : ''}`} aria-busy={!stats}>
          {!stats
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="vl-stat vl-stat--skeleton" />)
            : items.map(({ key, Icon, tone, end, suffix, decimals }, i) => (
              <div key={key} className="vl-stat" style={{ '--i': i } as React.CSSProperties}>
                <span className={`vl-stat__icon vl-tone--${tone}`}><Icon size={18} aria-hidden="true" /></span>
                <div>
                  <div className="vl-stat__num">
                    <CountUp end={end} start={seen} suffix={suffix} decimals={decimals}
                      format={n => number(n, { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 0 })} />
                  </div>
                  <div className="vl-stat__label">{t(key)}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
