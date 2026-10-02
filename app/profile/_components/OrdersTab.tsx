'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import type { OrderStatusGroup, ProfileOverview } from '@/lib/profileApi'
import { Skeleton } from '@/components/profile/ui'
import { RecentOrders } from './OverviewTab'

const GROUPS: OrderStatusGroup[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

export default function OrdersTab({ data, loading }: { data: ProfileOverview | null; loading: boolean }) {
  const t   = useTranslations('profile')
  const fmt = useFormat()
  const s   = data?.stats

  return (
    <div className="pf-panel pf-grid">
      <section className="pf-card" aria-labelledby="pf-orders-sum">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-orders-sum">{t('ordersTab.title')}</h2>
            {s && <p className="pf-card-sub">{t('ordersTab.summary', { count: s.orders.total, spent: fmt.price(s.total_spent) })}</p>}
          </div>
          <Link href="/orders" className="pf-btn light sm">{t('ordersTab.all')}<ChevronRight size={14} className="pf-flip" /></Link>
        </div>
        <div className="pf-breakdown">
          {GROUPS.map(g => (
            <Link key={g} href="/orders" aria-label={`${t(`statusGroups.${g}`)}: ${s?.orders[g] ?? 0}`}>
              <span className={`pf-status ${g}`}>{t(`statusGroups.${g}`)}</span>
              {loading || !s ? <Skeleton w={40} h={24} style={{ marginTop: 10 }} /> : <strong>{fmt.number(s.orders[g])}</strong>}
            </Link>
          ))}
        </div>
      </section>

      <section className="pf-card" aria-labelledby="pf-orders-recent">
        <div className="pf-card-head"><h2 id="pf-orders-recent">{t('recent.title')}</h2></div>
        <RecentOrders orders={data?.recent_orders} loading={loading} />
      </section>
    </div>
  )
}
