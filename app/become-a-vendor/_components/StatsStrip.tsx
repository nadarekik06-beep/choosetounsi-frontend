'use client'

import { type LucideIcon } from 'lucide-react'
import { useInView } from '@/app/hooks/useInView'
import { useFormat } from '@/lib/i18n/useFormat'
import CountUp from '@/app/components/home/CountUp'

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
