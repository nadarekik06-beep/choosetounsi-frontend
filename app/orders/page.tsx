'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ChevronRight, ChevronDown, ChevronUp,
  Package, Loader2, Clock, CheckCircle, XCircle,
  Truck, RotateCcw, Store, Star,
} from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import ComplaintModal from '@/app/components/ComplaintModal'
import ReviewSubmitModal from '@/app/components/reviews/ReviewSubmitModal'

const API_URL      = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem('ct_auth_token') ??
    localStorage.getItem('auth_token') ??
    null
  )
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
  product?: { slug: string; primary_image_url?: string | null }
}

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
  seller_groups?: SellerGroup[]
}

// Review state per order_item_id
interface ReviewedMap { [orderItemId: number]: boolean }

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

// ─── Item Row (with Rate button) ──────────────────────────────────────────────

function ItemRow({
  item,
  groupStatus,
  reviewed,
  onRate,
}: {
  item: OrderItem
  groupStatus: string
  reviewed: boolean
  onRate: (item: OrderItem) => void
}) {
  const img        = item.resolved_image_url ?? resolveImg(item.product?.primary_image_url)
  const isDelivered = groupStatus === 'delivered'

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 0',
      borderBottom: '1px solid #f8fafc', alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
        background: '#f8fafc', border: '1px solid #f1f5f9', flexShrink: 0,
      }}>
        {img
          ? <img src={img} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color="#e2e8f0" />
            </div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.product?.slug
            ? <Link href={`/products/${item.product.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                {item.product_name}
              </Link>
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

      {/* Price + Rate button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
          {fmt(item.total)}
        </span>

        {/* Rate button — only on delivered items */}
        {isDelivered && (
          reviewed ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, color: '#10b981',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              padding: '4px 10px', borderRadius: 999,
            }}>
              <CheckCircle size={11} /> Reviewed
            </span>
          ) : (
            <button
              onClick={() => onRate(item)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 800, color: '#fff',
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                border: 'none', borderRadius: 999,
                padding: '5px 12px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.35)' }}
            >
              <Star size={12} fill="#fff" stroke="none" />
              Rate Product
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Seller Group Section ─────────────────────────────────────────────────────

function SellerGroupSection({
  group,
  showSeparator,
  reviewedMap,
  onRate,
}: {
  group: SellerGroup
  showSeparator: boolean
  reviewedMap: ReviewedMap
  onRate: (item: OrderItem) => void
}) {
  const deliveredCount  = group.status === 'delivered' ? group.items.length : 0
  const pendingReviews  = group.items.filter(i => group.status === 'delivered' && !reviewedMap[i.id]).length

  return (
    <div style={{ borderTop: showSeparator ? '1px dashed #e5e7eb' : '1px solid #f1f5f9' }}>

      {showSeparator && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px',
          background: 'linear-gradient(90deg,#fafafa,#f1f5f9)',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Store size={12} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
              Seller #{group.seller_order_id}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingReviews > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                padding: '2px 8px', borderRadius: 999,
              }}>
                ⭐ {pendingReviews} to review
              </span>
            )}
            <StatusBadge status={group.status} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{fmt(group.subtotal)}</span>
          </div>
        </div>
      )}

      <div style={{ padding: '2px 20px' }}>
        {group.items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            groupStatus={group.status}
            reviewed={!!reviewedMap[item.id]}
            onRate={onRate}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  reviewedMap,
  onRate,
  onReviewed,
}: {
  order: Order
  reviewedMap: ReviewedMap
  onRate: (item: OrderItem, orderItemId: number) => void
  onReviewed: (orderItemId: number) => void
}) {
  const [expanded,      setExpanded]      = useState(false)
  const [complaintOpen, setComplaintOpen] = useState(false)

  const date = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const sellerGroups: SellerGroup[] = (order.seller_groups && order.seller_groups.length > 0)
    ? order.seller_groups
    : [{
        seller_order_id: 0,
        status:          order.status,
        payment_status:  order.payment_status,
        subtotal:        order.total_amount,
        items:           order.items,
      }]

  const isMultiSeller  = sellerGroups.length > 1
  const allDelivered   = sellerGroups.every(g => g.status === 'delivered')
  const canComplain    = allDelivered || order.status === 'delivered'

  // Count pending reviews across all groups
  const totalPendingReviews = sellerGroups
    .filter(g => g.status === 'delivered')
    .flatMap(g => g.items)
    .filter(i => !reviewedMap[i.id]).length

  const headerStatus = isMultiSeller
    ? (sellerGroups.every(g => g.status === sellerGroups[0].status)
        ? sellerGroups[0].status : 'mixed')
    : sellerGroups[0].status

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 16,
        border: totalPendingReviews > 0 ? '1.5px solid rgba(245,158,11,0.3)' : '1px solid #f1f5f9',
        overflow: 'hidden', marginBottom: 14,
        boxShadow: totalPendingReviews > 0 ? '0 2px 12px rgba(245,158,11,0.08)' : 'none',
      }}>

        {/* Pending review banner */}
        {totalPendingReviews > 0 && !expanded && (
          <div
            onClick={() => setExpanded(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 20px', cursor: 'pointer',
              background: 'linear-gradient(90deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))',
              borderBottom: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
                {totalPendingReviews === 1
                  ? 'You have 1 product to review!'
                  : `You have ${totalPendingReviews} products to review!`}
              </span>
              <span style={{ fontSize: 11, color: '#b45309', fontWeight: 500 }}>
                Your feedback helps other shoppers
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#fff',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              padding: '4px 12px', borderRadius: 999,
              boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
            }}>
              Rate Now →
            </span>
          </div>
        )}

        {/* Header row */}
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
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
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

        {/* Expanded section */}
        {expanded && (
          <div style={{ borderTop: '1px solid #f1f5f9' }}>
            {(order.wilaya || order.address || order.phone) && (
              <div style={{
                padding: '12px 20px', background: '#fafafa',
                borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 24, flexWrap: 'wrap',
              }}>
                {order.wilaya  && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Wilaya:</strong> {order.wilaya}</span>}
                {order.phone   && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Phone:</strong> {order.phone}</span>}
                {order.address && <span style={{ fontSize: 12, color: '#64748b' }}><strong>Address:</strong> {order.address}</span>}
              </div>
            )}

            {sellerGroups.map((group, idx) => (
              <SellerGroupSection
                key={group.seller_order_id || idx}
                group={group}
                showSeparator={isMultiSeller}
                reviewedMap={reviewedMap}
                onRate={(item) => onRate(item, item.id)}
              />
            ))}

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
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)
  const [reviewedMap, setReviewedMap] = useState<ReviewedMap>({})

  // Which item is being rated right now
  const [ratingItem, setRatingItem] = useState<{
    orderItemId: number
    productName: string
    productImage: string | null
    variantLabel: string | null
  } | null>(null)

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res   = await fetch(`${API_URL}/client/orders`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const raw  = json.data?.data ?? json.data ?? []
      setOrders(Array.isArray(raw) ? raw : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch already-reviewed order_item_ids ──────────────────────────────────
  const fetchReviewed = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return
      const res  = await fetch(`${API_URL}/client/reviews/eligible`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const json = await res.json()
      // eligible = NOT yet reviewed → anything NOT in this list IS reviewed
      // We build a "reviewed" map from all delivered items minus eligible ones
      // But the simpler approach: eligible endpoint returns unreviewed items.
      // We'll mark items as reviewed only after the user submits — start empty.
      // The eligible fetch gives us which items CAN be rated (not yet reviewed).
      if (json.success && Array.isArray(json.data)) {
        // These are items that HAVEN'T been reviewed yet — we do nothing with them here.
        // The reviewedMap starts empty; after submitting we mark them reviewed.
      }
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/orders'); return }
    fetchOrders()
    fetchReviewed()
  }, [fetchOrders, fetchReviewed, router])

  // ── Open review modal for an item ─────────────────────────────────────────
  const handleRate = useCallback((item: OrderItem, orderItemId: number) => {
    const img = item.resolved_image_url ?? resolveImg(item.product?.primary_image_url)
    setRatingItem({
      orderItemId,
      productName:  item.product_name,
      productImage: img,
      variantLabel: item.variant_label,
    })
  }, [])

  // ── After successful review submission ────────────────────────────────────
  const handleReviewSuccess = useCallback(() => {
    if (!ratingItem) return
    setReviewedMap(prev => ({ ...prev, [ratingItem.orderItemId]: true }))
    setRatingItem(null)
  }, [ratingItem])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/account" style={{ color: '#94a3b8', textDecoration: 'none' }}>Account</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>Orders</span>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px', animation: 'fadeUp 0.4s ease both' }}>

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
              <Link href="/shop" style={{
                padding: '10px 24px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 10,
                textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
              }}>
                Start Shopping
              </Link>
            </div>
          )}

          {!loading && !error && orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              reviewedMap={reviewedMap}
              onRate={handleRate}
              onReviewed={(id) => setReviewedMap(prev => ({ ...prev, [id]: true }))}
            />
          ))}
        </div>
      </div>

      {/* ── Review Modal ─────────────────────────────────────────────────────── */}
      {ratingItem && (
        <ReviewSubmitModal
          orderItemId={ratingItem.orderItemId}
          productName={ratingItem.productName}
          productImage={ratingItem.productImage}
          variantLabel={ratingItem.variantLabel}
          onClose={() => setRatingItem(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  )
}