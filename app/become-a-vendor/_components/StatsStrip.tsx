'use client'

import { Store, PackageCheck, MapPin, Star, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { useFormat } from '@/lib/i18n/useFormat'
import CountUp from '@/app/components/home/CountUp'
import type { LandingStats } from './shared'

export interface StatTile { key: string; label: string; Icon: LucideIcon; tone: 'red' | 'green' | 'gold'; end: number; suffix?: string; decimals?: number }

/** Row of count-up tiles (2×2 on phones). `items === null` renders matching skeletons. */
export function StatTiles({ items, label, skeletons = 4, compact = false }: {
  items: StatTile[] | null; label: string; skeletons?: number; compact?: boolean
}) {
  const { number } = useFormat()
  const { ref, seen } = useInView<HTMLDivElement>({ threshold: 0.3 })

  return (
    <section className={`vl-stats-wrap${compact ? ' vl-stats-wrap--compact' : ''}`} aria-label={label}>
      <div className="vl-container">
        <div ref={ref} className={`vl-stats vl-reveal${seen ? ' is-in' : ''}${compact ? ' vl-stats--compact' : ''}`} aria-busy={!items}>
          {!items
            ? Array.from({ length: skeletons }, (_, i) => <div key={i} className="vl-stat vl-stat--skeleton" />)
            : items.map(({ key, label: tileLabel, Icon, tone, end, suffix, decimals }) => (
              <div key={key} className="vl-stat">
                <span className={`vl-stat__icon vl-tone--${tone}`}><Icon size={18} aria-hidden="true" /></span>
                <div>
                  <div className="vl-stat__num">
                    <CountUp end={end} start={seen} suffix={suffix} decimals={decimals}
                      format={n => number(n, { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 0 })} />
                  </div>
                  <div className="vl-stat__label">{tileLabel}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}

/** Live platform numbers (GET /api/seller-landing). Hidden if the request failed; zero values are skipped. */
export default function StatsStrip({ stats, failed }: { stats: LandingStats | null; failed: boolean }) {
  const t = useTranslations('vendor.landing.stats')
  if (failed) return null

  const items: StatTile[] | null = stats ? ([
    { key: 'sellers', label: t('sellers'), Icon: Store,        tone: 'red',   end: stats.sellers },
    { key: 'orders',  label: t('orders'),  Icon: PackageCheck, tone: 'green', end: stats.orders_delivered },
    { key: 'wilayas', label: t('wilayas'), Icon: MapPin,       tone: 'red',   end: stats.wilayas_served },
    { key: 'rating',  label: t('rating'),  Icon: Star,         tone: 'gold',  end: stats.average_rating ?? 0, suffix: '/5', decimals: 1 },
  ] as StatTile[]).filter(s => s.end > 0) : null

  return <StatTiles items={items} label={t('label')} />
}
