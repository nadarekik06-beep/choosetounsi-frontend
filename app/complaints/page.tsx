'use client'

/**
 * app/complaints/page.tsx — the client's returns, each with its
 * "Return / Refund tracking" (timeline, refund amount / method / reference).
 * Route: /complaints  (?id= opens one: bell, e-mails, order page)
 */

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { complaintApi } from '@/lib/complaintApi'
import type { BuyerComplaint } from '@/types/complaint'
import { useTranslations } from 'next-intl'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import BrandLoader from '@/components/brand/BrandLoader'

const RED = '#db142e'

/** Reads `?id=<id>` (notification bell, e-mails): that complaint opens. */
function FocusFromQuery({ onFocus }: { onFocus: (id: number | null) => void }) {
  const id = Number(useSearchParams().get('id')) || null
  useEffect(() => { onFocus(id) }, [id, onFocus])
  return null
}

import ComplaintCard from '@/app/components/returns/ComplaintCard'

export default function MyComplaintsPage() {
  const t      = useTranslations('complaints')
  const tc     = useTranslations('common')
  const router = useRouter()
  const [complaints, setComplaints] = useState<BuyerComplaint[]>([])
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
    // No account: a guest's returns live on each order's tracking page
    if (!isAuthenticated()) { router.replace('/track-order'); return }
    fetchComplaints()
  }, [fetchComplaints, router])

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "var(--ct-dm-sans-complaints), sans-serif" }}>

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