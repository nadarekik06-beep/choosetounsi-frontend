'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Star, Package } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { profileApi, type MyReview, type Paginated } from '@/lib/profileApi'
import { EmptyState, Skeleton, Stars } from '@/components/profile/ui'

const STATUS_CLASS: Record<MyReview['status'], string> = {
  approved: 'delivered', pending: 'pending', rejected: 'cancelled', flagged: 'neutral',
}

export default function ReviewsTab() {
  const t   = useTranslations('profile.reviewsTab')
  const fmt = useFormat()
  const [page, setPage] = useState<Paginated<MyReview> | null>(null)
  const [items, setItems] = useState<MyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchPage = (n: number) => profileApi.reviews(n)
    .then(p => { setPage(p); setItems(prev => (n === 1 ? p.data : [...prev, ...p.data])) })
    .catch(() => setError(true))
    .finally(() => setLoading(false))

  const load = (n: number) => {
    setLoading(true)
    setError(false)
    fetchPage(n)
  }
  useEffect(() => { fetchPage(1) }, [])

  return (
    <div className="pf-panel">
      <section className="pf-card" aria-labelledby="pf-rev-title">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-rev-title">{t('title')}</h2>
            {page && page.total > 0 && <p className="pf-card-sub">{t('count', { count: page.total })}</p>}
          </div>
          <Link href="/orders" className="pf-btn light sm"><Star size={14} />{t('write')}</Link>
        </div>

        {error ? (
          <div className="pf-alert error" role="alert">{t('loadError')} <button className="pf-link" onClick={() => load(1)}>{t('retry')}</button></div>
        ) : !page && loading ? (
          <div style={{ display: 'grid', gap: 12 }}>{[0, 1, 2].map(i => <Skeleton key={i} h={72} r={12} />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Star size={34} />} title={t('emptyTitle')} body={t('emptyBody')}
            action={<Link href="/orders" className="pf-btn primary">{t('cta')}</Link>} />
        ) : (
          <>
            {items.map(r => (
              <article key={r.id} className="pf-review">
                {r.product?.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.product.image} alt="" loading="lazy" />
                  : <span className="ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}><Package size={22} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {r.product?.available
                      ? <Link href={`/products/${r.product.slug}`} className="pf-order-num" style={{ textDecoration: 'none' }} dir="auto">{r.product.name}</Link>
                      : <span className="pf-order-num" dir="auto">{r.product?.name ?? t('productGone')}</span>}
                    <span className={`pf-status ${STATUS_CLASS[r.status]}`}>{t(`status.${r.status}`)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <Stars value={r.rating} />
                    <span className="pf-order-meta" style={{ margin: 0 }}>{fmt.date(r.created_at, 'medium')}</span>
                  </div>
                  {r.body && <p dir="auto">{r.body}</p>}
                </div>
              </article>
            ))}
            {page && page.current_page < page.last_page && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" className="pf-btn light" onClick={() => load(page.current_page + 1)} disabled={loading}>
                  {loading ? <span className="pf-spin dark" /> : t('more')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
