'use client'

/**
 * app/orders/page.tsx
 *
 * Client order history.
 *
 * ── KEY CHANGE ──
 * Orders from multi-vendor carts are now displayed as seller groups inside
 * each order card. Each group shows:
 *   - The seller's own status badge (independent from other sellers)
 *   - Only that seller's items with their variant-aware images
 *   - That seller's subtotal
 *
 * For single-seller orders the layout is identical to before — one group,
 * no visual difference to the user.
 *
 * PRESERVED:
 *   - ComplaintModal integration (Report Issue for delivered orders)
 *   - All existing types, helpers, and styles
 *   - resolved_image_url logic
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ChevronRight, ChevronDown, ChevronUp,
  Package, Loader2, Clock, CheckCircle, XCircle,
  Truck, RotateCcw, Store,
} from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import ComplaintModal from '@/app/components/ComplaintModal'

const API_URL      = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number
  product_id: number
  variant_id: number | null
  variant_label: string | null
  product_name: string
  quantity: number
  unit_price: number
  total: number
  resolved_image_url?: string | null
  seller_order_id?: number | null
  seller_order_status?: string | null
  seller_order_payment?: string | null
  product?: {
    slug: string
    primary_image_url?: string | null
  }
}

/**
 * A seller group: one SellerOrder with its own status + items.
 * Provided by the backend in order.seller_groups[].
 */
interface SellerGroup {
  seller_order_id: number
  status: string
  payment_status: string
  subtotal: number
  items: OrderItem[]
}

interface Order {
  id: number
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  wilaya: string | null
  address: string | null
  phone: string | null
  notes: string | null
  created_at: string
  items: OrderItem[]
  /** Per-seller sub-orders — populated when cart had multiple sellers */
  seller_groups?: SellerGroup[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Clock size={11} /> },
  processing: { label: 'Processing', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <RotateCcw size={11} /> },
  completed:  { label: 'Completed',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle size={11} /> },
  delivered:  { label: 'Delivered',  color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  icon: <Truck size={11} /> },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <XCircle size={11} /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: null }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'capitalize',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─── Seller Group Section ─────────────────────────────────────────────────────

/**
 * Renders one seller's slice of an order with its own status badge.
 * If the order has only one seller_group, no divider header is shown.
 */
function SellerGroupSection({
  group,
  showSeparator,
}: {
  group: SellerGroup
  showSeparator: boolean
}) {
  return (
    <div style={{
      borderTop: showSeparator ? '1px dashed #e5e7eb' : '1px solid #f1f5f9',
      marginTop: showSeparator ? 0 : 0,
    }}>
      {/* Per-seller status header — only shown when there are multiple sellers */}
      {showSeparator && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px',
          background: 'linear-gradient(90deg, #fafafa 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Store size={12} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
              Seller #{group.seller_order_id}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={group.status} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              {fmt(group.subtotal)}
            </span>
          </div>
        </div>
      )}

      {/* Items for this seller */}
      <div style={{ padding: '6px 20px' }}>
        {group.items.map(item => {
          const img = item.resolved_image_url ?? resolveImg(item.product?.primary_image_url)
          return (
            <div key={item.id} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              borderBottom: '1px solid #f8fafc', alignItems: 'center',
            }}>
              {/* Thumbnail */}
              <div style={{
                width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
                background: '#f8fafc', border: '1px solid #f1f5f9', flexShrink: 0,
              }}>
                {img
                  ? <img src={img} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color="#e2e8f0" />
                    </div>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product?.slug
                    ? <Link href={`/products/${item.product.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{item.product_name}</Link>
                    : item.product_name
                  }
                </p>
                {item.variant_label && (
                  <span style={{
                    display: 'inline-block', marginTop: 3,
                    fontSize: 11, fontWeight: 700, color: '#6366f1',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    padding: '1px 8px', borderRadius: 4,
                  }}>
                    {item.variant_label}
                  </span>
                )}
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>
                  {item.quantity} × {fmt(item.unit_price)}
                </p>
              </div>

              <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>
                {fmt(item.total)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const [expanded,      setExpanded]      = useState(false)
  const [complaintOpen, setComplaintOpen] = useState(false)

  const date = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  // seller_groups from API; fall back to wrapping all items in one group
  // (handles old orders created before the migration that have no seller_groups)
  const sellerGroups: SellerGroup[] = (order.seller_groups && order.seller_groups.length > 0)
    ? order.seller_groups
    : [{
        seller_order_id: 0,
        status:          order.status,
        payment_status:  order.payment_status,
        subtotal:        order.total_amount,
        items:           order.items,
      }]

  const isMultiSeller = sellerGroups.length > 1

  // "Report Issue" — shown only when ALL seller sub-orders are delivered,
  // OR when the order itself is delivered (legacy single-seller case).
  const allDelivered   = sellerGroups.every(g => g.status === 'delivered')
  const canComplain    = allDelivered || order.status === 'delivered'

  // For the header: show a combined status when multi-seller
  // "Mixed" when sellers have different statuses
  const headerStatus = isMultiSeller
    ? (sellerGroups.every(g => g.status === sellerGroups[0].status)
        ? sellerGroups[0].status
        : 'mixed')
    : sellerGroups[0].status

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 14 }}>

        {/* ── Header row ── */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px' }}>Order</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>{order.order_number}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px' }}>Date</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>{date}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px' }}>Total</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#dc2626', margin: 0 }}>{fmt(order.total_amount)}</p>
            </div>

            {/* Status: show mixed indicator for multi-seller orders */}
            {headerStatus === 'mixed' ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.25)',
              }}>
                <Store size={10} /> Multiple Statuses
              </span>
            ) : (
              <StatusBadge status={headerStatus} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canComplain && (
              <button
                onClick={() => setComplaintOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700, color: '#dc2626',
                  background: 'rgba(220,38,38,0.06)',
                  border: '1.5px solid rgba(220,38,38,0.25)',
                  borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
              >
                🚨 Report Issue
              </button>
            )}

            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                color: '#64748b', background: '#f8fafc', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
            </button>
          </div>
        </div>

        {/* ── Expanded section ── */}
        {expanded && (
          <div style={{ borderTop: '1px solid #f1f5f9' }}>

            {/* Delivery info */}
            {(order.wilaya || order.address || order.phone) && (
              <div style={{
                padding: '12px 20px', background: '#fafafa',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', gap: 24, flexWrap: 'wrap',
              }}>
                {order.wilaya  && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Wilaya:</strong> {order.wilaya}</span>}
                {order.phone   && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Phone:</strong> {order.phone}</span>}
                {order.address && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Address:</strong> {order.address}</span>}
              </div>
            )}

            {/* ── Per-seller groups ── */}
            {sellerGroups.map((group, idx) => (
              <SellerGroupSection
                key={group.seller_order_id || idx}
                group={group}
                showSeparator={isMultiSeller}
              />
            ))}

            {/* Order total footer */}
            <div style={{
              padding: '10px 20px 14px',
              display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center',
              borderTop: '1px solid #f1f5f9',
            }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Order Total:</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{fmt(order.total_amount)}</span>
            </div>
          </div>
        )}
      </div>

      <ComplaintModal
        orderId={order.id}
        orderNumber={order.order_number}
        isOpen={complaintOpen}
        onClose={() => setComplaintOpen(false)}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router  = useRouter()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/client/orders`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const raw = json.data?.data ?? json.data ?? []
      setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/orders'); return }
    fetchOrders()
  }, [fetchOrders, router])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/account" style={{ color: '#94a3b8', textDecoration: 'none' }}>Account</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>Orders</span>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px 60px', animation: 'fadeUp 0.4s ease both' }}>

          {/* Page title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} color="#dc2626" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>My Orders</h1>
              {!loading && !error && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Loading your orders…</p>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              Failed to load orders. Please refresh the page.
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <ShoppingBag size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>No orders yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>Your order history will appear here.</p>
              <Link href="/shop"
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                Start Shopping
              </Link>
            </div>
          )}

          {!loading && !error && orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </>
  )
}