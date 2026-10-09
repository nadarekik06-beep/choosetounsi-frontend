'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ShoppingBag, Wallet, Star, Heart, Store, AlertTriangle, PackageSearch, ChevronRight, Sparkles,
  LifeBuoy, LogOut, LayoutDashboard, CircleCheck, Package,
} from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import type { ProfileOverview, RecentOrder, CompletionField } from '@/lib/profileApi'
import { EmptyState, Skeleton } from '@/components/profile/ui'
import type { TabKey } from './tabs'

export function StatusChip({ group, status }: { group: RecentOrder['status_group']; status: string }) {
  const t = useTranslations('orderStatus')
  return <span className={`pf-status ${group}`}>{t.has(status) ? t(status) : status}</span>
}

export function OrderRow({ order }: { order: RecentOrder }) {
  const t   = useTranslations('profile.recent')
  const fmt = useFormat()
  return (
    <Link href={`/orders?order=${order.id}`} className="pf-order">
      <div className="pf-thumbs" aria-hidden>
        {order.thumbnails.length ? order.thumbnails.slice(0, 3).map((th, i) => th.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img key={i} src={th.image} alt="" className="pf-thumb" loading="lazy" />
          : <span key={i} className="pf-thumb"><Package size={18} /></span>)
          : <span className="pf-thumb"><Package size={18} /></span>}
      </div>
      <div className="pf-order-main">
        <div className="pf-order-top">
          <span className="pf-order-num" dir="ltr">#{order.order_number}</span>
          <StatusChip group={order.status_group} status={order.status} />
        </div>
        <div className="pf-order-meta">
          {fmt.date(order.created_at, 'medium')} · {t('items', { count: order.items_count })}
        </div>
      </div>
      <span className="pf-order-total">
        {order.is_cancelled && !!order.original_total && (
          <s style={{ color: 'var(--pf-muted, #94a3b8)', fontWeight: 600, fontSize: '0.85em', marginInlineEnd: 6 }}>{fmt.price(order.original_total)}</s>
        )}
        {fmt.price(order.total_amount)}
      </span>
    </Link>
  )
}

export function RecentOrders({ orders, loading, limit = 5 }: { orders: RecentOrder[] | undefined; loading: boolean; limit?: number }) {
  const t = useTranslations('profile.recent')
  if (loading) {
    return <div style={{ display: 'grid', gap: 10 }}>{[0, 1, 2].map(i => <Skeleton key={i} h={70} r={14} />)}</div>
  }
  if (!orders?.length) {
    return (
      <EmptyState icon={<ShoppingBag size={34} />} title={t('emptyTitle')} body={t('emptyBody')}
        action={<Link href="/" className="pf-btn primary">{t('emptyCta')}</Link>} />
    )
  }
  return (
    <ol className="pf-timeline">
      {orders.slice(0, limit).map(o => (
        <li key={o.id} className="pf-tl-item">
          <span className={`pf-tl-dot ${o.status_group}`} aria-hidden />
          <OrderRow order={o} />
        </li>
      ))}
    </ol>
  )
}

export function CompletionCard({ data, onFix }: { data: ProfileOverview | null; onFix: (field: CompletionField) => void }) {
  const t  = useTranslations('profile.completion')
  const tf = useTranslations('profile.completion.fields')
  if (!data) return null
  const c = data.profile.completion
  if (c.percent >= 100) return null
  // Sellers, admins…: nothing is required of them, the fields are only suggestions.
  const enforced = c.enforced
  const required = enforced ? c.missing.filter(m => m.required) : []
  const done = enforced && c.complete

  return (
    <section className={`pf-complete${done ? ' done' : ''}`} aria-labelledby="pf-complete-title">
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {done ? <CircleCheck size={18} color="#198f41" /> : <Sparkles size={18} color="#db142e" />}
          <h2 id="pf-complete-title" style={{ margin: 0, fontSize: '0.98rem', color: '#111' }}>
            {done ? t('doneTitle') : t('title')}
          </h2>
          <strong style={{ marginInlineStart: 'auto', fontSize: '0.9rem', color: done ? '#198f41' : '#db142e' }}>{c.percent}%</strong>
        </div>
        <div className="pf-progress" role="progressbar" aria-valuenow={c.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('percent', { percent: c.percent })}>
          <span style={{ width: `${c.percent}%` }} />
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#6b6b76' }}>
          {done ? t('doneBody') : enforced ? t('requiredBody') : t('optionalBody')}
        </p>
        <div className="pf-missing">
          {c.missing.map(m => (
            <button key={m.field} type="button" className={`pf-missing-item${m.required && enforced ? '' : ' opt'}`} onClick={() => onFix(m.field)}>
              + {tf(m.field)}{m.required && enforced && <span aria-hidden> *</span>}
            </button>
          ))}
        </div>
      </div>
      {!done && required.length > 0 && (
        <Link href="/complete-profile?redirect=/profile" className="pf-btn primary">{t('cta')}</Link>
      )}
    </section>
  )
}

export default function OverviewTab({ data, loading, go, onFix, onLogout }: {
  data: ProfileOverview | null
  loading: boolean
  go: (tab: TabKey) => void
  onFix: (field: CompletionField) => void
  onLogout: () => void
}) {
  const t   = useTranslations('profile')
  const fmt = useFormat()
  const s   = data?.stats
  const role = data?.profile.role

  const cards: { key: string; icon: React.ReactNode; color: string; bg: string; value: React.ReactNode; label: string; onClick: () => void }[] = s ? [
    { key: 'orders', icon: <ShoppingBag size={19} />, color: '#db142e', bg: '#ffeaed', value: fmt.number(s.orders.total), label: t('stats.orders'), onClick: () => go('orders') },
    { key: 'spent', icon: <Wallet size={19} />, color: '#198f41', bg: '#e6f6ec', value: <>{fmt.number(s.total_spent, { maximumFractionDigits: 0 })}<small>{fmt.currency}</small></>, label: t('stats.spent'), onClick: () => go('orders') },
    { key: 'favorites', icon: <Heart size={19} />, color: '#db2777', bg: '#fce7f3', value: fmt.number(s.favorites), label: t('stats.favorites'), onClick: () => go('favorites') },
    { key: 'reviews', icon: <Star size={19} />, color: '#d97706', bg: '#fef3c7', value: fmt.number(s.reviews), label: t('stats.reviews'), onClick: () => go('reviews') },
    { key: 'following', icon: <Store size={19} />, color: '#1d4ed8', bg: '#e0ecff', value: fmt.number(s.followed_sellers), label: t('stats.following'), onClick: () => go('favorites') },
    { key: 'complaints', icon: <AlertTriangle size={19} />, color: '#b45309', bg: '#fff3e0', value: fmt.number(s.complaints.open), label: t('stats.complaintsOpen'), onClick: () => go('complaints') },
  ] : []
  if (s?.wallet.active) {
    cards.splice(2, 0, { key: 'wallet', icon: <Wallet size={19} />, color: '#0f766e', bg: '#ccfbf1', value: <>{fmt.number(s.wallet.balance, { maximumFractionDigits: 3 })}<small>{fmt.currency}</small></>, label: t('stats.wallet'), onClick: () => go('orders') })
  }

  return (
    <div className="pf-panel">
      <CompletionCard data={data} onFix={onFix} />

      <div className="pf-stats">
        {loading || !s
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={118} r={18} />)
          : cards.map(c => (
            <button key={c.key} type="button" className="pf-stat" onClick={c.onClick}>
              <span className="pf-stat-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</span>
              <span className="pf-stat-value">{c.value}</span>
              <span className="pf-stat-label">{c.label}</span>
              <span className="pf-stat-bar" style={{ background: c.color }} />
            </button>
          ))}
      </div>

      <div className="pf-two">
        <section className="pf-card" aria-labelledby="pf-recent">
          <div className="pf-card-head">
            <div>
              <h2 id="pf-recent">{t('recent.title')}</h2>
              {s && s.orders.total > 0 && <p className="pf-card-sub">{t('recent.subtitle', { count: s.orders.total })}</p>}
            </div>
            {s && s.orders.total > 0 && <Link href="/orders" className="pf-link">{t('recent.viewAll')}<ChevronRight size={14} className="pf-flip" /></Link>}
          </div>
          <RecentOrders orders={data?.recent_orders} loading={loading} />
        </section>

        <section className="pf-card" aria-labelledby="pf-shortcuts">
          <h2 id="pf-shortcuts" className="pf-section-title">{t('quick.title')}</h2>
          <nav className="pf-menu">
            <Link href="/orders" className="pf-menu-item"><span className="pf-menu-icon"><PackageSearch size={17} /></span><span className="grow">{t('quick.track')}</span><ChevronRight size={14} className="pf-flip" /></Link>
            <Link href="/complaints/new" className="pf-menu-item"><span className="pf-menu-icon"><AlertTriangle size={17} /></span><span className="grow">{t('quick.complaint')}</span><ChevronRight size={14} className="pf-flip" /></Link>
            {role === 'seller'
              ? <Link href="/seller" className="pf-menu-item"><span className="pf-menu-icon"><LayoutDashboard size={17} /></span><span className="grow">{t('quick.myStore')}</span><ChevronRight size={14} className="pf-flip" /></Link>
              : role === 'client' && <Link href="/become-a-vendor" className="pf-menu-item"><span className="pf-menu-icon"><Store size={17} /></span><span className="grow">{t('quick.openStore')}</span><ChevronRight size={14} className="pf-flip" /></Link>}
            <button type="button" className="pf-menu-item" onClick={() => window.dispatchEvent(new Event('open-support-chat'))}>
              <span className="pf-menu-icon"><LifeBuoy size={17} /></span><span className="grow">{t('quick.help')}</span><ChevronRight size={14} className="pf-flip" />
            </button>
            <button type="button" className="pf-menu-item danger" onClick={onLogout}>
              <span className="pf-menu-icon"><LogOut size={17} /></span><span className="grow">{t('quick.signOut')}</span>
            </button>
          </nav>
        </section>
      </div>
    </div>
  )
}
