'use client'

/**
 * app/complaints/page.tsx — the client's returns, each with its
 * "Return / Refund tracking" (timeline, refund amount / method / reference).
 * Route: /complaints  (?id= opens one: bell, e-mails, order page)
 */

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { complaintApi } from '@/lib/complaintApi'
import type { Complaint } from '@/types/complaint'
import { statusConfig } from '@/types/complaint'
import ReturnTracking, { ReturnStatusBadge } from '@/app/components/returns/ReturnTracking'
import { useTranslations } from 'next-intl'
import PurchasedItemRow from '@/app/components/PurchasedItemRow'
import { useFormat } from '@/lib/i18n/useFormat'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import BrandLoader from '@/components/brand/BrandLoader'

const RED = '#db142e'

/** Reads `?id=<id>` (notification bell, e-mails): that complaint opens. */
function FocusFromQuery({ onFocus }: { onFocus: (id: number | null) => void }) {
  const id = Number(useSearchParams().get('id')) || null
  useEffect(() => { onFocus(id) }, [id, onFocus])
  return null
}

function ComplaintCard({ complaint: initial, focused = false }: { complaint: Complaint; focused?: boolean }) {
  const t   = useTranslations('complaints')
  const tr  = useTranslations('returns')
  const fmt = useFormat()
  const [complaint, setComplaint] = useState(initial)
  const [expanded, setExpanded] = useState(focused)
  const cfg = statusConfig(complaint.status)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focused])

  return (
    <div ref={cardRef} style={{ background: '#fff', borderRadius: 16, border: focused ? `1px solid ${cfg.color}` : '1px solid #f1f5f9',
      overflow: 'hidden', marginBottom: 14, transition: 'box-shadow 0.2s ease', scrollMarginTop: 90 }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: cfg.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <p style={label}>{complaint.reference ? tr('reference', { ref: complaint.reference }) : t('complaintN', { id: complaint.id })}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                  {t(`types.${complaint.complaint_type}`)}
                  {complaint.complaint_type === 'other' && complaint.other_reason ? ` — ${complaint.other_reason}` : ''}
                </p>
              </div>
              <div>
                <p style={label}>{t('order')}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }} dir="ltr">
                  #{complaint.order?.order_number ?? complaint.order_id}
                </p>
              </div>
              <ReturnStatusBadge status={complaint.status} />
            </div>
            <button onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc',
                border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer', fontFamily: 'inherit' }}>
              {expanded ? `▲ ${t('hide')}` : `▼ ${tr('track')}`}
            </button>
          </div>

          {/* Returned items — as bought, with the quantity sent back */}
          {!!complaint.complained_items?.length && (
            <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ ...label, margin: 0 }}>{t('items')}</p>
              {complaint.complained_items.map(item => (
                <PurchasedItemRow key={item.id} item={item}
                  qtyLabel={tr('returnQty', { count: item.return_quantity ?? item.quantity, total: item.quantity })} />
              ))}
            </div>
          )}

          {/* Status description bar */}
          <div style={{ padding: '8px 20px 10px', background: cfg.bg, borderTop: `1px solid ${cfg.color}20` }}>
            <p style={{ fontSize: 12, color: cfg.color, fontWeight: 600, margin: 0 }}>
              {complaint.cash_refund && tr.has(`hintCash.${complaint.status}`)
                ? tr(`hintCash.${complaint.status}`, { amount: fmt.price(Number(complaint.refund_amount ?? 0)) })
                : tr.has(`hint.${complaint.status}`) ? tr(`hint.${complaint.status}`) : ''}
            </p>
          </div>

          {/* Tracking + details */}
          {expanded && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ReturnTracking complaint={complaint} onChanged={setComplaint} />

              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                <strong>{t('description')}</strong> {complaint.description}
              </p>

              {(complaint.image_urls?.length ?? 0) > 0 && (
                <div>
                  <p style={{ ...label, margin: '0 0 8px' }}>{t('proofPhoto')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {complaint.image_urls.map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={t('proofPhoto')} style={{ width: 110, height: 90, objectFit: 'cover',
                          borderRadius: 10, border: '1.5px solid #e5e7eb', cursor: 'zoom-in' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                {t('filedOn', { date: fmt.date(complaint.created_at, 'long') })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const label: React.CSSProperties = {
  fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px',
}

export default function MyComplaintsPage() {
  const t      = useTranslations('complaints')
  const tc     = useTranslations('common')
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [focusId,    setFocusId]    = useState<number | null>(null)
  const [loading,    setLoading]    = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(loading)
  const [error,      setError]      = useState(false)

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const res = await complaintApi.getAll()
      const raw = res.data?.data ?? res.data ?? []
      setComplaints(Array.isArray(raw) ? raw : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/complaints'); return }
    fetchComplaints()
  }, [fetchComplaints, router])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/"       style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <span className="rtl-flip">›</span>
            <Link href="/orders" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('myOrders')}</Link>
            <span className="rtl-flip">›</span>
            <span style={{ color: '#374151', fontWeight: 700 }}>{t('title')}</span>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 60px',
          animation: 'fadeUp 0.4s ease both' }}>

          {/* Page title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12,
                background: 'rgba(220,38,38,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                🚨
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {t('title')}
                </h1>
                {!loading && !error && (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                    {t('count', { count: complaints.length })}
                  </p>
                )}
              </div>
            </div>
            <Link href="/complaints/new"
              style={{ padding: '10px 20px', background: RED, color: '#fff', fontWeight: 800,
                fontSize: 13, borderRadius: 10, textDecoration: 'none',
                boxShadow: `0 4px 14px ${RED}40` }}>
              + {t('new')}
            </Link>
          </div>

          {/* States */}
          {loading && (
            <BrandLoader variant="section" label={t('loading')} minHeight={240} />
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '16px 20px', color: RED,
              fontSize: 13, fontWeight: 600 }}>
              {t('loadFailed')}
            </div>
          )}

          {!loading && !error && complaints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚨</div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                {t('emptyTitle')}
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                {t('emptyBody')}
              </p>
              <Link href="/complaints/new"
                style={{ padding: '10px 24px', background: RED, color: '#fff',
                  fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none',
                  boxShadow: `0 4px 14px ${RED}40` }}>
                {t('file')}
              </Link>
            </div>
          )}

          <Suspense fallback={null}><FocusFromQuery onFocus={setFocusId} /></Suspense>
          {!loading && !error && complaints.map(c => (
            <ComplaintCard key={c.id === focusId ? `${c.id}-focused` : c.id} complaint={c} focused={c.id === focusId} />
          ))}
        </div>
      </div>
    </>
  )
}