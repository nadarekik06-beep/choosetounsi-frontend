// seller-dashboard/app/seller/earnings/EarningsPage.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, TrendingDown, TrendingUp, Clock, CheckCircle, Package } from 'lucide-react'
import api from '@/lib/sellerApi'
import { useTheme } from '../layout'

function fmt(v: number | string) {
  return `${Number(v).toFixed(3)} TND`
}

const PAYOUT_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  ready:     '#3b82f6',
  paid:      '#10b981',
  cancelled: '#ef4444',
}

function PayoutBadge({ status }: { status: string }) {
  const color = PAYOUT_COLORS[status] ?? '#94a3b8'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      textTransform: 'capitalize',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {status}
    </span>
  )
}

type EarningsTab = 'overview' | 'orders' | 'history'

export default function EarningsPage() {
  const { dark } = useTheme()
  const [tab,          setTab]          = useState<EarningsTab>('overview')
  const [period,       setPeriod]       = useState('month')
  const [overview,     setOverview]     = useState<any>(null)
  const [orders,       setOrders]       = useState<any>(null)
  const [history,      setHistory]      = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [payoutFilter, setPayoutFilter] = useState('')

  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
  const textMain  = dark ? '#f1f5f9' : '#0f172a'
  const textMuted = dark ? '#64748b' : '#94a3b8'
  const theadBg   = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'overview') {
        const res = await api.get(`/seller/earnings/overview?period=${period}`)
        setOverview(res?.data ?? null)
      }
      if (tab === 'orders') {
        const params = new URLSearchParams()
        if (payoutFilter) params.set('payout_status', payoutFilter)
        const qs  = params.toString()
        const res = await api.get(`/seller/earnings/orders${qs ? '?' + qs : ''}`)
        setOrders(res?.data ?? null)
      }
      if (tab === 'history') {
        const res = await api.get('/seller/earnings/history')
        setHistory(res?.data ?? null)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load earnings data.')
    } finally {
      setLoading(false)
    }
  }, [tab, period, payoutFilter])

  useEffect(() => { load() }, [load])

  const th = (right = false): React.CSSProperties => ({
    padding: '9px 14px', fontSize: 9, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: textMuted, background: theadBg,
    textAlign: right ? 'right' : 'left',
  })

  const td = (right = false): React.CSSProperties => ({
    padding: '12px 14px', fontSize: 12,
    textAlign: right ? 'right' : 'left',
    borderTop: `1px solid ${border}`,
  })

  const TABS: { key: EarningsTab; label: string }[] = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'orders',   label: '📦 Orders'   },
    { key: 'history',  label: '🧾 History'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Earnings
        </h1>
        <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>
          Your net revenue after platform commissions
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 14px', borderRadius: 9, border: 'none',
            background: tab === t.key ? '#db142e' : 'transparent',
            color: tab === t.key ? '#fff' : textMuted,
            fontSize: 12, fontWeight: tab === t.key ? 800 : 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚠ {error}</span>
          <button onClick={load} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: textMuted }}>
          Loading…
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Period selector */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['today', 'week', 'month', 'all'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: `1px solid ${border}`,
                    background: period === p ? 'rgba(219,20,46,0.12)' : 'transparent',
                    color: period === p ? '#db142e' : textMuted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}>
                    {p}
                  </button>
                ))}
              </div>

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Gross Revenue',  value: fmt(overview.kpis?.gross_revenue    ?? 0), color: '#94a3b8', icon: DollarSign  },
                  { label: 'Platform Fees',  value: fmt(overview.kpis?.total_commission  ?? 0), color: '#db142e', icon: TrendingDown },
                  { label: 'Your Net',       value: fmt(overview.kpis?.total_net         ?? 0), color: '#10b981', icon: TrendingUp   },
                  { label: 'Orders',         value: String(overview.kpis?.orders_count   ?? 0), color: '#3b82f6', icon: Package      },
                  { label: 'Pending Payout', value: fmt(overview.kpis?.pending_amount    ?? 0), color: '#f59e0b', icon: Clock        },
                  { label: 'Paid Out',       value: fmt(overview.kpis?.paid_amount       ?? 0), color: '#10b981', icon: CheckCircle  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{
                    background: cardBg, border: `1px solid ${color}28`,
                    borderRadius: 14, padding: '16px 18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} color={color} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Revenue split */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>Revenue Split ({period})</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {[
                    { label: 'Gross Total',  value: fmt(overview.kpis?.gross_revenue    ?? 0), color: '#94a3b8', note: 'Customer paid' },
                    { label: 'Platform Fee', value: fmt(overview.kpis?.total_commission  ?? 0), color: '#db142e', note: 'ChooseTounsi commission' },
                    { label: 'You Receive',  value: fmt(overview.kpis?.total_net         ?? 0), color: '#10b981', note: 'Your net earnings' },
                  ].map((col, i) => (
                    <div key={col.label} style={{
                      padding: '16px 20px',
                      borderRight: i < 2 ? `1px solid ${border}` : undefined,
                      background: i === 2 ? 'rgba(16,185,129,0.03)' : i === 1 ? 'rgba(219,20,46,0.03)' : undefined,
                    }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                        {col.label}
                      </p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: col.color, margin: '0 0 3px' }}>{col.value}</p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{col.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily breakdown table */}
              {(overview.daily_chart?.length ?? 0) > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>Daily Breakdown</p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th()}>Day</th>
                          <th style={th(true)}>Orders</th>
                          <th style={th(true)}>Gross</th>
                          <th style={th(true)}>Fee</th>
                          <th style={th(true)}>Net Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.daily_chart.slice(-14).map((row: any) => (
                          <tr key={row.day}>
                            <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 700, color: textMain, fontSize: 11 }}>{row.day}</td>
                            <td style={{ ...td(true), color: textMuted }}>{row.orders}</td>
                            <td style={{ ...td(true), color: textMuted }}>{fmt(row.gross ?? 0)}</td>
                            <td style={{ ...td(true), color: '#db142e' }}>{fmt(row.commission ?? 0)}</td>
                            <td style={{ ...td(true), color: '#10b981', fontWeight: 800 }}>{fmt(row.net_earnings ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Payout filter */}
              <div style={{ display: 'flex', gap: 6 }}>
                {([['', 'All'], ['pending', 'Pending'], ['ready', 'Ready'], ['paid', 'Paid']] as [string, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setPayoutFilter(val)} style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`,
                    background: payoutFilter === val ? 'rgba(219,20,46,0.12)' : 'transparent',
                    color: payoutFilter === val ? '#db142e' : textMuted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th()}>Order</th>
                        <th style={th(true)}>Gross</th>
                        <th style={th(true)}>Platform Fee</th>
                        <th style={th(true)}>Your Net</th>
                        <th style={th(true)}>Payout Status</th>
                        <th style={th(true)}>Settled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orders?.data ?? []).map((row: any) => (
                        <tr key={row.id}>
                          <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 700, color: textMain, fontSize: 11 }}>{row.order_number}</td>
                          <td style={{ ...td(true), color: textMuted }}>{fmt(row.gross ?? 0)}</td>
                          <td style={{ ...td(true), color: '#db142e', fontWeight: 700 }}>{fmt(row.commission_amount ?? 0)}</td>
                          <td style={{ ...td(true), color: '#10b981', fontWeight: 800 }}>{fmt(row.net_earnings ?? 0)}</td>
                          <td style={{ ...td(true) }}><PayoutBadge status={row.payout_status ?? 'pending'} /></td>
                          <td style={{ ...td(true), color: textMuted, fontSize: 11 }}>
                            {row.settled_at ? new Date(row.settled_at).toLocaleDateString('fr-TN') : '—'}
                          </td>
                        </tr>
                      ))}
                      {(orders?.data ?? []).length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: textMuted }}>
                            No orders found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Full report button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => window.open('/seller/earnings/receipt', '_blank')}
                  style={{
                    padding: '8px 16px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg,#198f41,#12b34a)',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  📄 Rapport de gains complet
                </button>
              </div>

              {/* Table card */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>Settlement History</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th()}>Batch Ref</th>
                        <th style={th()}>Date</th>
                        <th style={th(true)}>Orders</th>
                        <th style={th(true)}>Your Payout</th>
                        <th style={th(true)}>Status</th>
                        <th style={th(true)}>Paid On</th>
                        <th style={th(true)}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history?.data ?? []).map((row: any) => (
                        <tr key={row.id}>
                          <td style={{ ...td(), fontFamily: 'monospace', fontWeight: 700, color: textMain, fontSize: 11 }}>{row.batch_reference}</td>
                          <td style={{ ...td(), color: textMuted, fontFamily: 'monospace' }}>{row.batch_date}</td>
                          <td style={{ ...td(true), color: textMuted }}>{row.orders_count}</td>
                          <td style={{ ...td(true), color: '#10b981', fontWeight: 900 }}>{fmt(row.total_seller_payout ?? 0)}</td>
                          <td style={{ ...td(true) }}><PayoutBadge status={row.status ?? 'draft'} /></td>
                          <td style={{ ...td(true), color: textMuted, fontSize: 11 }}>
                            {row.paid_at ? new Date(row.paid_at).toLocaleDateString('fr-TN') : '—'}
                          </td>
                          <td style={{ ...td(true) }}>
                            {row.status === 'paid' && (
                              <button
                                onClick={() => window.open(`/settlement/${row.id}`, '_blank')}
                                style={{
                                  padding: '4px 10px', borderRadius: 7, border: 'none',
                                  background: 'linear-gradient(135deg,#db142e,#a50f22)',
                                  color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                🖨 Reçu
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(history?.data ?? []).length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: textMuted }}>
                            No settlements yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>  
          )}

        </>
      )}
    </div>
  )
}