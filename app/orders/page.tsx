'use client'

/**
 * app/orders/page.tsx — Client's order history
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isAuthenticated, getToken } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingBag, ChevronRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n) + ' DT'

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  processing: '#3b82f6',
  completed:  '#10b981',
  delivered:  '#14b8a6',
  cancelled:  '#ef4444',
  refunded:   '#a855f7',
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  wilaya: string | null
  created_at: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/auth/login?redirect=/orders'); return }

    fetch(`${API_URL}/client/orders`, {
      headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(json => setOrders(json.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800;900&display=swap');
        .order-row:hover { background: #fafafa !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Home
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>My Orders</h1>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: '64px 24px', textAlign: 'center', border: '1px solid #eee' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 16px', display: 'block', color: '#e5e7eb' }} />
              <p style={{ fontWeight: 800, fontSize: 18, color: '#374151', margin: '0 0 8px' }}>No orders yet</p>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px' }}>When you place an order, it will appear here.</p>
              <Link href="/shop" style={{
                display: 'inline-flex', padding: '12px 28px', background: '#dc2626', color: '#fff',
                fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none',
              }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => {
                const color = STATUS_COLORS[order.status] ?? '#94a3b8'
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="order-row"
                    style={{
                      background: '#fff', borderRadius: 16, border: '1px solid #eee',
                      padding: '18px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      textDecoration: 'none', transition: 'background 0.15s ease',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShoppingBag size={18} color={color} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: 14, color: '#111', margin: '0 0 2px', fontFamily: 'monospace' }}>
                          {order.order_number}
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                          {new Date(order.created_at).toLocaleDateString('fr-TN')}
                          {order.wilaya && ` · ${order.wilaya}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                        background: `${color}15`, color, border: `1px solid ${color}30`,
                        textTransform: 'capitalize',
                      }}>
                        {order.status}
                      </span>
                      <span style={{ fontWeight: 900, fontSize: 15, color: '#dc2626' }}>{fmt(order.total_amount)}</span>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}