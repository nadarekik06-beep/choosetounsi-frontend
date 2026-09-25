'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

interface SellerInfo {
  name: string
  email: string
  business_name: string
  phone: string | null
  wilaya: string | null
  city: string | null
  plan: string
}

interface BatchRow {
  id: number
  batch_reference: string
  batch_date: string
  orders_count: number
  total_orders_gross: number
  total_commission: number
  total_delivery_fees: number
  total_seller_payout: number
  status: string
  paid_at: string | null
  notes: string | null
}

interface Totals {
  gross_revenue: number
  total_commission: number
  total_delivery: number
  total_net: number
  total_paid: number
  total_ready: number
  total_pending: number
  orders_count: number
}

interface FullReceipt {
  seller: SellerInfo
  subscription: { plan: string; expires_at: string | null }
  totals: Totals
  batches: BatchRow[]
  generated_at: string
}


function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ct_auth_token') ?? ''
}

// Plan labels: seller.receipt.plans.<plan>

export default function FullReceiptPage() {
  const t = useTranslations('seller.receipt')
  const { price, number, date } = useFormat()
  const fmt = (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const d = (v: string) => date(v, 'short')
  const [data,    setData]    = useState<FullReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [origin,  setOrigin]  = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
    fetch(`${base}/api/seller/earnings/receipt`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setData(json.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [data])

  if (loading) return (
    <div style={wrap}>
      <div style={spinner} />
      <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>{t('generating')}</p>
    </div>
  )

  if (error || !data) return (
    <div style={wrap}>
      <p style={{ color: '#dc2626', fontWeight: 700 }}>{t('loadFailed')}</p>
    </div>
  )

  const generatedDate = date(data.generated_at, 'medium')
  const { seller, totals, batches, subscription } = data

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Barlow', sans-serif; background: #f0f2f5; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .outer { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 32px 16px 48px; gap: 16px; }
        .bar   { width: 210mm; display: flex; align-items: center; justify-content: space-between; }
        .sheet { width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 4px 32px rgba(0,0,0,0.12); border-radius: 4px; overflow: hidden; animation: fadeIn 0.3s ease both; }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
          .bar  { display: none !important; }
          .outer { padding: 0; background: white; }
          .sheet { box-shadow: none; border-radius: 0; width: 100%; min-height: 100vh; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      <div className="outer">
        {/* Action bar */}
        <div className="bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={`${origin}/images/logo-chili.png`} alt="ChooseTounsi" style={{ height: 32 }} />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: '#db142e' }}>
              {t('barTitle')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={btn('#db142e')}>{t('print')}</button>
            <button onClick={() => window.close()} style={btn('#64748b')}>{t('close')}</button>
          </div>
        </div>

        <div className="sheet">
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#db142e 0%,#a50f22 100%)', padding: '28px 40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={`${origin}/images/logo-chili.png`} alt="ChooseTounsi" style={{ height: 56 }} />
              <div>
                <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>ChooseTounsi</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 3 }}>{t('tagline')}</p>
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '0.04em', lineHeight: 1, textTransform: 'uppercase' }}>
                {t('title')}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 4 }}>
                {t('subtitle')}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {t('generatedOn', { date: generatedDate })}
              </p>
            </div>
          </div>
          <div className="rtl-flip" style={{ height: 4, background: 'linear-gradient(90deg,#198f41,#12b34a)' }} />

          <div style={{ padding: '32px 40px' }}>

            {/* Seller + Subscription info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
              <div style={card}>
                <p style={lbl}>{t('seller')}</p>
                <p style={name}>{seller.business_name}</p>
                <p style={line}>{seller.name}</p>
                <p style={line}>{seller.email}</p>
                {seller.phone  && <p style={line}>{seller.phone}</p>}
                {(seller.city || seller.wilaya) && (
                  <p style={line}>{[seller.city, seller.wilaya].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div style={card}>
                <p style={lbl}>{t('subscription')}</p>
                <p style={name}>{t.has(`plans.${subscription.plan}`) ? t(`plans.${subscription.plan}`) : subscription.plan}</p>
                {subscription.expires_at && (
                  <p style={line}>{t('expiresOn', { date: d(subscription.expires_at) })}</p>
                )}
                <div style={{ marginTop: 10 }}>
                  <p style={lbl}>{t('period')}</p>
                  {batches.length > 0 ? (
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      {t('range', { from: d(batches[batches.length - 1].batch_date), to: d(batches[0].batch_date) })}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{t('noSettlement')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Global KPI summary */}
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
              {t('summary')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
              {[
                { label: t('kpi.orders'),     value: number(totals.orders_count),   color: '#3b82f6' },
                { label: t('kpi.gross'),      value: fmt(totals.gross_revenue),     color: '#94a3b8' },
                { label: t('kpi.commission'), value: fmt(totals.total_commission),  color: '#db142e' },
                { label: t('kpi.net'),        value: fmt(totals.total_net),         color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#f8fafc', padding: '14px 16px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 900, color }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
              {[
                { label: t('kpi.paid'),    value: fmt(totals.total_paid),    color: '#10b981' },
                { label: t('kpi.ready'),   value: fmt(totals.total_ready),   color: '#3b82f6' },
                { label: t('kpi.pending'), value: fmt(totals.total_pending), color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#f8fafc', padding: '14px 16px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 900, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Settlements history table */}
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
              {t('historyTitle', { count: batches.length })}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  {[
                    { label: t('cols.reference'),  align: 'start' },
                    { label: t('cols.date'),       align: 'start' },
                    { label: t('cols.orders'),     align: 'end'   },
                    { label: t('cols.gross'),      align: 'end'   },
                    { label: t('cols.commission'), align: 'end'   },
                    { label: t('cols.delivery'),   align: 'end'   },
                    { label: t('cols.payout'),     align: 'end'   },
                    { label: t('cols.paidOn'),     align: 'end'   },
                  ].map(col => (
                    <th key={col.label} style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', textAlign: col.align as any }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      {t('noneConfirmed')}
                    </td>
                  </tr>
                )}
                {batches.map((b, idx) => (
                  <tr key={b.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: 11 }}>{b.batch_reference}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{d(b.batch_date)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#64748b' }}>{b.orders_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#475569', fontWeight: 600 }}>{fmt(b.total_orders_gross)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#db142e', fontWeight: 700 }}>−{fmt(b.total_commission)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#3b82f6', fontWeight: 600 }}>{fmt(b.total_delivery_fees)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#10b981', fontWeight: 800 }}>{fmt(b.total_seller_payout)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#64748b', fontSize: 11 }}>
                      {b.paid_at ? d(b.paid_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {batches.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 900 }}>
                  <td colSpan={2} style={{ padding: '11px 12px', fontSize: 11 }}>{t('grandTotal')}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'end', fontSize: 11 }}>
                    {batches.reduce((s, b) => s + Number(b.orders_count), 0)}
                  </td>
                  <td style={{ padding: '11px 12px', textAlign: 'end', fontSize: 11 }}>
                    {fmt(batches.reduce((s, b) => s + Number(b.total_orders_gross), 0))}
                  </td>
                  <td style={{ padding: '11px 12px', textAlign: 'end', color: '#fca5a5', fontSize: 11 }}>
                    −{fmt(batches.reduce((s, b) => s + Number(b.total_commission), 0))}
                  </td>
                  <td style={{ padding: '11px 12px', textAlign: 'end', color: '#93c5fd', fontSize: 11 }}>
                    {fmt(batches.reduce((s, b) => s + Number(b.total_delivery_fees), 0))}
                  </td>
                  <td style={{ padding: '11px 12px', textAlign: 'end', color: '#6ee7b7', fontSize: 13 }}>
                    {fmt(batches.reduce((s, b) => s + Number(b.total_seller_payout), 0))}
                  </td>
                  <td />
                </tr>
                </tfoot>
              )}
            </table>

            {/* Remaining balance note */}
            {(totals.total_ready > 0 || totals.total_pending > 0) && (
              <div style={{ marginTop: 20, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '14px 20px' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', marginBottom: 6 }}>
                  {t('balanceTitle')}
                </p>
                <p style={{ fontSize: 11, color: '#475569' }}>
                  {totals.total_ready > 0 && (
                    <>{t.rich('balanceReady', { amount: fmt(totals.total_ready), b: (chunks) => <strong style={{ color: '#3b82f6' }}>{chunks}</strong> })} </>
                  )}
                  {totals.total_pending > 0 && (
                    <>{t.rich('balancePending', { amount: fmt(totals.total_pending), b: (chunks) => <strong style={{ color: '#f59e0b' }}>{chunks}</strong> })}</>
                  )}
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{t('thanks')}</p>
                <p style={{ fontSize: 10, color: '#94a3b8' }}>{t('disclaimer')}</p>
              </div>
              <div style={{ textAlign: 'end', flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{t('generatedOn', { date: generatedDate })}</p>
                <p style={{ fontSize: 10, color: '#e2e8f0' }}>{seller.email}</p>
              </div>
            </div>
          </div>

          <div className="rtl-flip" style={{ height: 6, background: 'linear-gradient(90deg,#db142e 0%,#198f41 100%)' }} />
        </div>
      </div>
    </>
  )
}

const wrap: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow',sans-serif", gap: 16, background: '#f0f2f5' }
const spinner: React.CSSProperties = { width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#db142e', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }
const btn = (bg: string): React.CSSProperties => ({ padding: '9px 20px', background: bg, color: '#fff', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 })
const card: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }
const lbl:  React.CSSProperties = { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 }
const name: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }
const line: React.CSSProperties = { fontSize: 12, color: '#475569', marginBottom: 2, fontWeight: 500 }