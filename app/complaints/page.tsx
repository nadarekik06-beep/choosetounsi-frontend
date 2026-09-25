'use client'

/**
 * app/complaints/page.tsx
 *
 * Client "My Complaints" page — complaint history with status tracking.
 * Route: /complaints
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { complaintApi } from '@/lib/complaintApi'
import type { Complaint } from '@/types/complaint'
import { STATUS_CONFIG } from '@/types/complaint'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

const RED = '#db142e'

function StatusBadge({ status }: { status: Complaint['status'] }) {
  const t = useTranslations('complaints')
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {status === 'pending'   && '⏳'}
      {status === 'reviewing' && '🔍'}
      {status === 'approved'  && '✅'}
      {status === 'rejected'  && '❌'}
      {' '}{t(`status.${status}.label`)}
    </span>
  )
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const t   = useTranslations('complaints')
  const fmt = useFormat()
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[complaint.status]

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
      overflow: 'hidden', marginBottom: 14, transition: 'box-shadow 0.2s ease' }}>

      {/* Left accent bar */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: cfg.color, flexShrink: 0 }} />

        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                  {t('complaintN', { id: complaint.id })}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                  {t(`types.${complaint.complaint_type}`)}
                  {complaint.complaint_type === 'other' && complaint.other_reason
                    ? ` — ${complaint.other_reason}`
                    : ''}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                  {t('order')}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                  #{complaint.order?.order_number ?? complaint.order_id}
                </p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
            <button onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc',
                border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer', fontFamily: 'inherit' }}>
              {expanded ? `▲ ${t('hide')}` : `▼ ${t('details')}`}
            </button>
          </div>

          {/* Status description bar */}
          <div style={{ padding: '8px 20px 10px', background: `${cfg.bg}`,
            borderTop: `1px solid ${cfg.color}20` }}>
            <p style={{ fontSize: 12, color: cfg.color, fontWeight: 600, margin: 0 }}>
              {t(`status.${complaint.status}.description`)}
            </p>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.6 }}>
                <strong>{t('description')}</strong> {complaint.description}
              </p>

              {complaint.image_url && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                    {t('proofPhoto')}
                  </p>
                  <a href={complaint.image_url} target="_blank" rel="noreferrer">
                    <img src={complaint.image_url} alt={t('proofPhoto')}
                      style={{ maxWidth: 200, maxHeight: 150, objectFit: 'cover',
                        borderRadius: 10, border: '1.5px solid #e5e7eb', cursor: 'zoom-in' }} />
                  </a>
                </div>
              )}

              {complaint.seller_note && (
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '1.5px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#1e40af',
                    margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('sellerResponse')}
                  </p>
                  <p style={{ fontSize: 13, color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
                    {complaint.seller_note}
                  </p>
                </div>
              )}

              {complaint.status === 'rejected' && complaint.rejection_reason && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#dc2626',
                    margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('rejectionReason')}
                  </p>
                  <p style={{ fontSize: 13, color: '#ef4444', margin: 0, lineHeight: 1.6 }}>
                    {complaint.rejection_reason}
                  </p>
                </div>
              )}

              <p style={{ fontSize: 11, color: '#94a3b8', margin: '12px 0 0', fontWeight: 600 }}>
                {t('filedOn', { date: fmt.date(complaint.created_at, 'long') })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyComplaintsPage() {
  const t      = useTranslations('complaints')
  const tc     = useTranslations('common')
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading,    setLoading]    = useState(true)
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
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 28, height: 28, border: `3px solid #f1f5f9`,
                borderTopColor: RED, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                {t('loading')}
              </p>
            </div>
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

          {!loading && !error && complaints.map(c => (
            <ComplaintCard key={c.id} complaint={c} />
          ))}
        </div>
      </div>
    </>
  )
}