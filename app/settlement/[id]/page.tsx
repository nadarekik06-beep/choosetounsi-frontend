'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

interface SettlementOrder {
  id: number
  order_number: string
  subtotal: number
  commission_amount: number
  seller_net_amount: number
  delivery_fee: number
  status: string
  money_received_at: string | null
  created_at: string
}

interface SettlementBatch {
  id: number
  batch_reference: string
  batch_date: string
  orders_count: number
  total_orders_gross: number
  total_commission: number
  total_delivery_fees: number
  total_seller_payout: number
  total_platform_profit: number
  status: string
  paid_at: string | null
  created_at: string
  seller_name: string
  seller_email: string
  notes: string | null
  orders: SettlementOrder[]
}


function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ct_auth_token') ?? ''
}

export default function SettlementReceiptPage() {
  const params = useParams()
  const id = Number(params?.id)
  const t = useTranslations('settlement')
  const { price, number, date } = useFormat()
  const fmt = (n: number) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  const [data,    setData]    = useState<SettlementBatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [origin,  setOrigin]  = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    if (!id) return
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
    // ✅ FIX: call seller-scoped endpoint, not admin endpoint
    fetch(`${base}/api/seller/earnings/settlement/${id}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setData(json.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [data])

  if (loading) return (
    <div style={styles.loadingWrap}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>{t('preparing')}</p>
    </div>
  )

  if (error || !data) return (
    <div style={styles.loadingWrap}>
      <p style={{ color: '#dc2626', fontWeight: 700 }}>
        {t('loadFailed')}
      </p>
    </div>
  )

  const paidDate = date(data.paid_at ?? data.batch_date, 'medium')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Barlow', sans-serif; background: #f0f2f5; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .receipt-outer { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 32px 16px 48px; gap: 16px; }
        .action-bar { width: 210mm; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .receipt-sheet { width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 4px 32px rgba(0,0,0,0.12); border-radius: 4px; overflow: hidden; animation: fadeIn 0.3s ease both; }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
          .action-bar { display: none !important; }
          .receipt-outer { padding: 0; background: white; }
          .receipt-sheet { box-shadow: none; border-radius: 0; width: 100%; min-height: 100vh; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="receipt-outer">
        <div className="action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={`${origin}/images/logo-chili.png`} alt="ChooseTounsi" style={{ height: 32 }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: '#db142e' }}>
              {t('title')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={btnStyle('#db142e')}>{t('print')}</button>
            <button onClick={() => window.close()} style={btnStyle('#64748b')}>{t('close')}</button>
          </div>
        </div>

        <div className="receipt-sheet">
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
              <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '0.04em', lineHeight: 1, textTransform: 'uppercase' }}>{t('title')}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 4 }}>{data.batch_reference}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{paidDate}</p>
            </div>
          </div>
          <div className="rtl-flip" style={{ height: 4, background: 'linear-gradient(90deg,#198f41,#12b34a)' }} />

          <div style={{ padding: '32px 40px' }}>
            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
              <div style={partyCard}>
                <p style={partyLabel}>{t('seller')}</p>
                <p style={partyName}>{data.seller_name}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{data.seller_email}</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 4, padding: '2px 8px' }}>
                  {t('confirmed')}
                </span>
              </div>
              <div style={partyCard}>
                <p style={partyLabel}>{t('issuer')}</p>
                <p style={partyName}>ChooseTounsi</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>{t('marketplace')}</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>choosetounsi.tn</p>
              </div>
            </div>

            {/* Meta strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
              {[
                { label: t('reference'),      value: data.batch_reference },
                { label: t('settlementDate'), value: paidDate },
                { label: t('orders'),         value: t('ordersCount', { count: data.orders_count }) },
                { label: t('status'),         value: t('paid') },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8fafc', padding: '12px 16px' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Orders table */}
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 10 }}>
              {t('ordersDetail')}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  {[
                    { label: t('cols.order'),      align: 'start' },
                    { label: t('cols.date'),       align: 'start' },
                    { label: t('cols.gross'),      align: 'end'   },
                    { label: t('cols.commission'), align: 'end'   },
                    { label: t('cols.delivery'),   align: 'end'   },
                    { label: t('cols.net'),        align: 'end'   },
                  ].map(col => (
                    <th key={col.label} style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)', textAlign: col.align as any }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.orders ?? []).map((order, idx) => (
                  <tr key={order.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: 11 }}>{order.order_number}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{date(order.created_at, 'short')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#475569', fontWeight: 600 }}>{fmt(order.subtotal)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#db142e', fontWeight: 700 }}>−{fmt(order.commission_amount)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#3b82f6', fontWeight: 600 }}>{fmt(order.delivery_fee)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'end', color: '#10b981', fontWeight: 800 }}>{fmt(order.seller_net_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 300, border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                {[
                  { label: t('totals.gross'),      value: fmt(data.total_orders_gross),  color: undefined, minus: false },
                  { label: t('totals.commission'), value: fmt(data.total_commission),     color: '#db142e', minus: true  },
                  { label: t('totals.delivery'),   value: fmt(data.total_delivery_fees),  color: '#3b82f6', minus: false },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: row.color ?? '#475569' }}>
                    <span>{row.label}</span>
                    <span>{row.minus ? '−' : ''}{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#1e293b', color: '#fff', fontSize: 14, fontWeight: 900, borderTop: '2px solid #db142e' }}>
                  <span>{t('totals.net')}</span>
                  <span>{fmt(data.total_seller_payout)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {data.notes && (
              <div style={{ marginTop: 24, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>{t('notes')}</p>
                <p style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{data.notes}</p>
              </div>
            )}

            {/* Confirmation stamp */}
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✓</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginBottom: 2 }}>{t('stampTitle')}</p>
                <p style={{ fontSize: 11, color: '#64748b' }}>
                  {t.rich('stampBody', {
                    amount: fmt(data.total_seller_payout), seller: data.seller_name, date: paidDate,
                    hl: (chunks) => <strong style={{ color: '#10b981' }}>{chunks}</strong>,
                    b: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{t('thanks')}</p>
                <p style={{ fontSize: 10, color: '#94a3b8' }}>{t('questions')}</p>
              </div>
              <div style={{ textAlign: 'end', flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{t('generatedOn', { date: date(new Date(), 'medium') })}</p>
                <p style={{ fontSize: 10, color: '#e2e8f0' }}>{data.batch_reference}</p>
              </div>
            </div>
          </div>

          <div className="rtl-flip" style={{ height: 6, background: 'linear-gradient(90deg,#db142e 0%,#198f41 100%)' }} />
        </div>
      </div>
    </>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const styles = {
  loadingWrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow',sans-serif", gap: 16, background: '#f0f2f5' },
  spinner:     { width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#db142e', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  loadingText: { fontSize: 14, fontWeight: 600, color: '#64748b' },
}
function btnStyle(bg: string): React.CSSProperties {
  return { padding: '9px 20px', background: bg, color: '#fff', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
}
const partyCard: React.CSSProperties  = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }
const partyLabel: React.CSSProperties = { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 }
const partyName: React.CSSProperties  = { fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }