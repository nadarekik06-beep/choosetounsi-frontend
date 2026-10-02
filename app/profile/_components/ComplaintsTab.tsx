'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/auth'
import { useFormat } from '@/lib/i18n/useFormat'
import type { ProfileOverview } from '@/lib/profileApi'
import { EmptyState, Skeleton } from '@/components/profile/ui'

interface Complaint {
  id: number
  status: 'pending' | 'reviewing' | 'approved' | 'seller_rejected_pending_admin' | 'rejected'
  complaint_type: string
  created_at: string
  order: { id: number; order_number: string } | null
}

const STATUS_CLASS: Record<Complaint['status'], string> = {
  pending: 'pending', reviewing: 'confirmed', seller_rejected_pending_admin: 'shipped', approved: 'delivered', rejected: 'cancelled',
}

export default function ComplaintsTab({ data }: { data: ProfileOverview | null }) {
  const t   = useTranslations('profile.complaintsTab')
  const tc  = useTranslations('complaints')
  const fmt = useFormat()
  const [list, setList] = useState<Complaint[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get<{ data: { data: Complaint[] } }>('/client/complaints', { params: { per_page: 10 } })
      .then(r => setList(r.data.data.data))
      .catch(() => setError(true))
  }, [])

  const c = data?.stats.complaints

  return (
    <div className="pf-panel">
      <section className="pf-card" aria-labelledby="pf-cmp-title">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-cmp-title">{t('title')}</h2>
            {c && (c.open + c.resolved > 0) && <p className="pf-card-sub">{t('summary', { open: c.open, resolved: c.resolved })}</p>}
          </div>
          <Link href="/complaints/new" className="pf-btn primary sm"><AlertTriangle size={14} />{tc('new')}</Link>
        </div>

        {error ? (
          <div className="pf-alert error" role="alert">{tc('loadFailed')}</div>
        ) : !list ? (
          <div style={{ display: 'grid', gap: 10 }}>{[0, 1].map(i => <Skeleton key={i} h={64} r={14} />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={34} />} title={tc('emptyTitle')} body={tc('emptyBody')}
            action={<Link href="/orders" className="pf-btn light">{tc('myOrders')}</Link>} />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map(x => (
              <Link key={x.id} href="/complaints" className="pf-order">
                <span className="pf-thumb" style={{ color: '#b45309', background: '#fff7e6' }} aria-hidden><AlertTriangle size={18} /></span>
                <div className="pf-order-main">
                  <div className="pf-order-top">
                    <span className="pf-order-num">{tc('complaintN', { id: x.id })}</span>
                    <span className={`pf-status ${STATUS_CLASS[x.status] ?? 'neutral'}`}>{tc(`status.${x.status}.label`)}</span>
                  </div>
                  <div className="pf-order-meta">
                    {tc.has(`types.${x.complaint_type}`) ? tc(`types.${x.complaint_type}`) : x.complaint_type}
                    {x.order && <> · <span dir="ltr">#{x.order.order_number}</span></>} · {fmt.date(x.created_at, 'medium')}
                  </div>
                </div>
                <ChevronRight size={16} className="pf-flip" color="#bbb" />
              </Link>
            ))}
            <Link href="/complaints" className="pf-link" style={{ justifySelf: 'center', marginTop: 6 }}>{t('viewAll')}<ChevronRight size={14} className="pf-flip" /></Link>
          </div>
        )}
      </section>
    </div>
  )
}
