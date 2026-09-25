'use client'

/**
 * app/complaints/new/page.tsx
 *
 * Dedicated complaint submission page accessible from the Navbar
 * "Help / Complaint" link.
 *
 * Route: /complaints/new
 *
 * If a query param ?order_id=X is present (from a deep link),
 * the order is pre-selected in the form.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import ComplaintForm from '@/app/components/ComplaintForm'
import { useTranslations } from 'next-intl'

const RED   = '#db142e'
const GREEN = '#198f41'

export default function NewComplaintPage() {
  const t            = useTranslations('complaints')
  const tc           = useTranslations('common')
  const router       = useRouter()
  const searchParams = useSearchParams()
  const preOrderId   = searchParams.get('order_id')
    ? Number(searchParams.get('order_id'))
    : undefined

  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login?redirect=/complaints/new')
    }
  }, [router])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes spin   { to { transform:rotate(360deg) } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Top breadcrumb ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/"       style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <span className="rtl-flip">›</span>
            <Link href="/orders" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('myOrders')}</Link>
            <span className="rtl-flip">›</span>
            <span style={{ color: '#374151', fontWeight: 700 }}>{t('file')}</span>
          </div>
        </div>

        {/* ── Page content ── */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px',
          animation: 'fadeUp 0.4s ease both' }}>

          {/* Page header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14,
                background: 'rgba(220,38,38,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                🚨
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {t('file')}
                </h1>
                <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
                  {t('newSubtitle')}
                </p>
              </div>
            </div>

            {/* Info banner */}
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1.5px solid rgba(59,130,246,0.2)',
              borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 4px' }}>
                  {t('policyTitle')}
                </p>
                <p style={{ fontSize: 12, color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
                  {t.rich('policyBody', { b: c => <strong>{c}</strong> })}
                </p>
              </div>
            </div>
          </div>

          {success ? (
            /* ── Success state ── */
            <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e5e7eb',
              padding: '48px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>
                {t('successTitle')}
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '0 auto 12px', lineHeight: 1.7 }}>
                {t.rich('successBody', { b: c => <strong>{c}</strong> })}
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 auto 28px' }}>
                {t('successNotice')}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/orders"
                  style={{ padding: '11px 24px', background: RED, color: '#fff',
                    fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none',
                    boxShadow: `0 4px 14px ${RED}40` }}>
                  {t('viewOrders')}
                </Link>
                <Link href="/"
                  style={{ padding: '11px 24px', border: '1.5px solid #e5e7eb',
                    color: '#374151', fontWeight: 700, fontSize: 13, borderRadius: 10,
                    textDecoration: 'none', background: '#fff' }}>
                  {tc('backHome')}
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form card ── */
            <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e5e7eb',
              padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <ComplaintForm
                prefilledOrderId={preOrderId}
                onSuccess={() => setSuccess(true)}
              />
            </div>
          )}

          {/* Step guide */}
          {!success && (
            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                {t('howItWorks')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12 }}>
                {[
                  { step: '1', icon: '📝', title: t('steps.s1.title'), text: t('steps.s1.text') },
                  { step: '2', icon: '🔍', title: t('steps.s2.title'), text: t('steps.s2.text') },
                  { step: '3', icon: '⚖️', title: t('steps.s3.title'), text: t('steps.s3.text') },
                  { step: '4', icon: '💰', title: t('steps.s4.title'), text: t('steps.s4.text') },
                ].map(s => (
                  <div key={s.step} style={{ background: '#fff', borderRadius: 14,
                    border: '1.5px solid #f1f5f9', padding: '16px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: RED,
                      textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                      {t('stepN', { n: s.step })}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                      {s.title}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}