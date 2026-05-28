'use client'

/**
 * FILE: app/orders/page.tsx  ← REPLACE
 *
 * FIX: Review popup now auto-triggers on page load.
 *
 * ROOT CAUSE OF BUG:
 *   The ReviewSubmitModal was only opened when the user clicked "Rate Product".
 *   The ReviewPrompt records (created by createReviewPrompts() when delivery
 *   guy marks delivered) were never fetched or used to auto-open the popup.
 *
 *   The fetchReviewed() function fetched /client/reviews/eligible but did
 *   nothing with the response — it was dead code.
 *
 * THE FIX:
 *   1. On page load, fetch /api/client/reviews/prompts (pending prompts)
 *   2. If any undismissed prompts exist → auto-open ReviewSubmitModal
 *      for the first one immediately
 *   3. After user submits or dismisses → move to next pending prompt
 *   4. dismissPrompt() calls POST /reviews/prompts/{id}/dismiss so the
 *      popup doesn't reappear on next page visit
 *
 * All existing UI (tracker, order cards, complaint button) is preserved.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ChevronRight, ChevronDown, ChevronUp,
  Package, Loader2, Clock, CheckCircle, XCircle,
  Truck, RotateCcw, Store, Star, MapPin,
} from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import ComplaintModal from '@/app/components/ComplaintModal'
import ReviewSubmitModal from '@/app/components/reviews/ReviewSubmitModal'

const API_URL      = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')
const RED          = '#db142e'
const GREEN        = '#198f41'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? localStorage.getItem('auth_token') ?? null
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

interface DeliveryTracking {
  assigned_at:  string | null
  picked_up_at: string | null
  delivered_at: string | null
  delivery_guy: string | null
}

interface SellerGroup {
  seller_order_id: number
  status: string
  payment_status: string
  subtotal: number
  items: OrderItem[]
  tracking?: DeliveryTracking
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

interface ReviewedMap { [orderItemId: number]: boolean }

// ── Review prompt shape from /api/client/reviews/prompts ─────────────────────
interface ReviewPrompt {
  id: number              // review_prompts.id (used to dismiss)
  order_item_id: number
  product_id: number
  product_name: string
  product_image: string | null
  variant_label: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending',          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Clock size={11} /> },
  processing:       { label: 'Processing',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <RotateCcw size={11} /> },
  out_for_delivery: { label: 'Out for Delivery', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: <Truck size={11} /> },
  completed:        { label: 'Completed',        color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle size={11} /> },
  delivered:        { label: 'Delivered',        color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  icon: <Truck size={11} /> },
  cancelled:        { label: 'Cancelled',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <XCircle size={11} /> },
  refunded:         { label: 'Refunded',         color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: <RotateCcw size={11} /> },
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

// ─── Order Tracker ────────────────────────────────────────────────────────────

function OrderTracker({ order, group }: { order: Order; group: SellerGroup }) {
  const status   = group.status
  const tracking = group.tracking

  const isCancelled = status === 'cancelled'
  const isRefunded  = status === 'refunded'

  const statusRank: Record<string, number> = {
    pending: 0, processing: 1, out_for_delivery: 2, completed: 2, delivered: 3, refunded: 4, cancelled: -1,
  }
  const currentRank = statusRank[status] ?? 0

  const steps = [
    {
      key: 'placed', label: 'Order Placed',
      sublabel: fmtDate(order.created_at),
      icon: <ShoppingBag size={16} />,
      isCompleted: true, isActive: currentRank === 0,
    },
    {
      key: 'processing', label: 'Accepted',
      sublabel: currentRank >= 1 ? 'Seller confirmed' : 'Waiting for seller',
      icon: <Package size={16} />,
      isCompleted: currentRank >= 1, isActive: currentRank === 1,
    },
    {
      key: 'out_for_delivery', label: 'On the Way',
      sublabel: tracking?.picked_up_at
        ? fmtDate(tracking.picked_up_at) + (tracking.delivery_guy ? ` · ${tracking.delivery_guy}` : '')
        : currentRank >= 2 ? 'In transit' : 'Expected',
      icon: <Truck size={16} />,
      isCompleted: currentRank >= 2, isActive: currentRank === 2,
    },
    {
      key: 'delivered', label: 'Delivered',
      sublabel: tracking?.delivered_at ? fmtDate(tracking.delivered_at) : currentRank >= 3 ? 'Confirmed' : 'Expected',
      icon: <CheckCircle size={16} />,
      isCompleted: currentRank >= 3, isActive: status === 'delivered',
    },
  ]

  if (isCancelled || isRefunded) {
    return (
      <div style={{
        margin: '12px 20px 16px',
        background: isCancelled ? 'rgba(239,68,68,0.06)' : 'rgba(168,85,247,0.06)',
        border: `1px solid ${isCancelled ? 'rgba(239,68,68,0.2)' : 'rgba(168,85,247,0.2)'}`,
        borderRadius: 12, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: isCancelled ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isCancelled ? '#ef4444' : '#a855f7',
        }}>
          {isCancelled ? <XCircle size={16} /> : <RotateCcw size={16} />}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: isCancelled ? '#ef4444' : '#a855f7', margin: 0 }}>
            {isCancelled ? 'Order Cancelled' : 'Order Refunded'}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            {isCancelled ? 'This order has been cancelled.' : 'Your refund has been processed.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '12px 20px 16px' }}>
      <div style={{ background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: 14, padding: '20px 16px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: '12.5%', right: '12.5%', height: 2, background: '#e5e7eb', zIndex: 0 }} />
          <div style={{
            position: 'absolute', top: 20, left: '12.5%',
            width: `${Math.min(100, (currentRank / (steps.length - 1)) * 100)}%`,
            height: 2, background: `linear-gradient(90deg, ${GREEN}, ${RED})`, zIndex: 1, transition: 'width 0.5s ease',
          }} />
          {steps.map((step) => (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: step.isCompleted ? (step.isActive ? RED : GREEN) : '#fff',
                border: step.isCompleted ? `2px solid ${step.isActive ? RED : GREEN}` : '2px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step.isCompleted ? '#fff' : '#d1d5db',
                transition: 'all 0.3s ease',
                boxShadow: step.isActive ? `0 0 0 4px ${RED}20` : step.isCompleted ? `0 0 0 3px ${GREEN}15` : 'none',
              }}>
                {step.isCompleted && !step.isActive ? <CheckCircle size={18} strokeWidth={2.5} /> : step.icon}
              </div>
              <p style={{ fontSize: 11, fontWeight: step.isActive || step.isCompleted ? 800 : 600, color: step.isActive ? RED : step.isCompleted ? '#374151' : '#94a3b8', margin: '8px 0 3px', textAlign: 'center', lineHeight: 1.3 }}>
                {step.label}
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, margin: 0, textAlign: 'center', lineHeight: 1.4, maxWidth: 90, wordBreak: 'break-word' }}>
                {step.sublabel}
              </p>
            </div>
          ))}
        </div>

        {tracking?.delivery_guy && status === 'out_for_delivery' && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
              <Truck size={13} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', margin: 0 }}>🚴 {tracking.delivery_guy} is on the way</p>
              {tracking.picked_up_at && <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>Picked up · {fmtDate(tracking.picked_up_at)}</p>}
            </div>
          </div>
        )}

        {(order.wilaya || order.address) && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
            <MapPin size={12} color="#94a3b8" />
            <span>{[order.wilaya, order.address].filter(Boolean).join(' — ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, groupStatus, reviewed, onRate }: {
  item: OrderItem; groupStatus: string; reviewed: boolean; onRate: (item: OrderItem) => void
}) {
  const img         = item.resolved_image_url ?? resolveImg(item.product?.primary_image_url)
  const isDelivered = groupStatus === 'delivered'

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f8fafc', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', flexShrink: 0 }}>
        {img ? <img src={img} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} color="#e2e8f0" /></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.product?.slug ? <Link href={`/products/${item.product.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{item.product_name}</Link> : item.product_name}
        </p>
        {item.variant_label && (
          <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '1px 8px', borderRadius: 4 }}>
            {item.variant_label}
          </span>
        )}
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{item.quantity} × {fmt(item.unit_price)}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{fmt(item.total)}</span>
        {isDelivered && (
          reviewed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 10px', borderRadius: 999 }}>
              <CheckCircle size={11} /> Reviewed
            </span>
          ) : (
            <button onClick={() => onRate(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,158,11,0.35)', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.35)' }}>
              <Star size={12} fill="#fff" stroke="none" /> Rate Product
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Seller Group Section ─────────────────────────────────────────────────────

function SellerGroupSection({ group, showSeparator, reviewedMap, onRate, order }: {
  group: SellerGroup; showSeparator: boolean; reviewedMap: ReviewedMap; onRate: (item: OrderItem) => void; order: Order
}) {
  const pendingReviews = group.items.filter(i => group.status === 'delivered' && !reviewedMap[i.id]).length
  return (
    <div style={{ borderTop: showSeparator ? '1px dashed #e5e7eb' : '1px solid #f1f5f9' }}>
      {showSeparator && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', background: 'linear-gradient(90deg,#fafafa,#f1f5f9)', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Store size={12} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Seller #{group.seller_order_id}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingReviews > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: 999 }}>
                ⭐ {pendingReviews} to review
              </span>
            )}
            <StatusBadge status={group.status} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{fmt(group.subtotal)}</span>
          </div>
        </div>
      )}
      <OrderTracker order={order} group={group} />
      <div style={{ padding: '2px 20px' }}>
        {group.items.map(item => (
          <ItemRow key={item.id} item={item} groupStatus={group.status} reviewed={!!reviewedMap[item.id]} onRate={onRate} />
        ))}
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, reviewedMap, onRate, onReviewed }: {
  order: Order; reviewedMap: ReviewedMap
  onRate: (item: OrderItem, orderItemId: number) => void
  onReviewed: (orderItemId: number) => void
}) {
  const [expanded,      setExpanded]      = useState(false)
  const [complaintOpen, setComplaintOpen] = useState(false)

  const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const sellerGroups: SellerGroup[] = (order.seller_groups && order.seller_groups.length > 0)
    ? order.seller_groups
    : [{ seller_order_id: 0, status: order.status, payment_status: order.payment_status, subtotal: order.total_amount, items: order.items, tracking: undefined }]

  const isMultiSeller = sellerGroups.length > 1

  const canComplain = sellerGroups.some(g =>
    ['delivered', 'out_for_delivery', 'completed'].includes(g.status)
  ) || ['delivered', 'out_for_delivery', 'completed'].includes(order.status)

  const totalPendingReviews = sellerGroups
    .filter(g => g.status === 'delivered')
    .flatMap(g => g.items)
    .filter(i => !reviewedMap[i.id]).length

  const headerStatus = isMultiSeller
    ? (sellerGroups.every(g => g.status === sellerGroups[0].status) ? sellerGroups[0].status : 'mixed')
    : sellerGroups[0].status

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 16,
        border: totalPendingReviews > 0 ? '1.5px solid rgba(245,158,11,0.3)' : '1px solid #f1f5f9',
        overflow: 'hidden', marginBottom: 14,
        boxShadow: totalPendingReviews > 0 ? '0 2px 12px rgba(245,158,11,0.08)' : 'none',
      }}>
        {totalPendingReviews > 0 && !expanded && (
          <div onClick={() => setExpanded(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', cursor: 'pointer', background: 'linear-gradient(90deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
                {totalPendingReviews === 1 ? 'You have 1 product to review!' : `You have ${totalPendingReviews} products to review!`}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '4px 12px', borderRadius: 999, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }}>
              Rate Now →
            </span>
          </div>
        )}

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
              <p style={{ fontSize: 15, fontWeight: 900, color: RED, margin: 0 }}>{fmt(order.total_amount)}</p>
            </div>
            {headerStatus === 'mixed' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Store size={10} /> Multiple Statuses
              </span>
            ) : <StatusBadge status={headerStatus} />}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canComplain && (
              <button onClick={() => setComplaintOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: RED, background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}>
                🚨 Report Issue
              </button>
            )}
            <button onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ borderTop: '1px solid #f1f5f9' }}>
            {sellerGroups.map((group, idx) => (
              <SellerGroupSection key={group.seller_order_id || idx} group={group} showSeparator={isMultiSeller} reviewedMap={reviewedMap} onRate={(item) => onRate(item, item.id)} order={order} />
            ))}
            <div style={{ padding: '10px 20px 14px', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Order Total:</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: RED }}>{fmt(order.total_amount)}</span>
            </div>
          </div>
        )}
      </div>

<ComplaintModal
  orderId={order.id}
  orderNumber={order.order_number}
  orderStatuses={sellerGroups.map(g => g.status)}
  isOpen={complaintOpen}
  onClose={() => setComplaintOpen(false)}
/>    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router  = useRouter()
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)
  const [reviewedMap, setReviewedMap] = useState<ReviewedMap>({})

  // ── Review popup state ────────────────────────────────────────────────────
  // pendingPrompts: queue of prompts fetched from /api/client/reviews/prompts
  // currentPrompt:  the prompt currently being shown in the modal (or null)
  const [pendingPrompts, setPendingPrompts] = useState<ReviewPrompt[]>([])
  const [currentPrompt,  setCurrentPrompt]  = useState<{
    orderItemId:  number
    productName:  string
    productImage: string | null
    variantLabel: string | null
    promptId:     number   // needed to dismiss
  } | null>(null)

  // ── Fetch orders ──────────────────────────────────────────────────────────
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

  // ── Fetch pending review prompts and auto-open popup ──────────────────────
  //
  // This is the core fix. On page load:
  //   1. GET /api/client/reviews/prompts → returns array of ReviewPrompt
  //   2. Store the queue in pendingPrompts
  //   3. Immediately open the modal for the first one
  //
  // The backend creates ReviewPrompt rows when:
  //   - Seller marks order as delivered (SellerOrderController::createReviewPrompts)
  //   - Delivery guy marks delivered (DeliveryController::createReviewPrompts — added in our fix)
  //
  const fetchPendingPrompts = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return

      const res  = await fetch(`${API_URL}/client/reviews/prompts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const json = await res.json()

      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) return

      const prompts: ReviewPrompt[] = json.data

      // Store the full queue
      setPendingPrompts(prompts)

      // Auto-open the first prompt immediately
      const first = prompts[0]
      setCurrentPrompt({
        orderItemId:  first.order_item_id,
        productName:  first.product_name,
        productImage: first.product_image ?? resolveImg(null),
        variantLabel: first.variant_label ?? null,
        promptId:     first.id,
      })
    } catch {
      // Non-critical — popup simply won't show if this fails
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/orders'); return }
    fetchOrders()
    fetchPendingPrompts()  // ← fetch prompts on page load
  }, [fetchOrders, fetchPendingPrompts, router])

  // ── Manual rate button (from "Rate Product" in item row) ─────────────────
  const handleRate = useCallback((item: OrderItem, orderItemId: number) => {
    const img = item.resolved_image_url ?? resolveImg(item.product?.primary_image_url)
    setCurrentPrompt({
      orderItemId,
      productName:  item.product_name,
      productImage: img,
      variantLabel: item.variant_label,
      promptId:     0,  // 0 = manually triggered, no prompt to dismiss
    })
  }, [])

  // ── After review submitted — mark reviewed, advance to next prompt ─────────
  const handleReviewSuccess = useCallback(() => {
    if (!currentPrompt) return

    // Mark this item as reviewed in the UI
    setReviewedMap(prev => ({ ...prev, [currentPrompt.orderItemId]: true }))

    // Dismiss the prompt so it doesn't reappear
    if (currentPrompt.promptId > 0) {
      const token = getToken()
      fetch(`${API_URL}/client/reviews/prompts/${currentPrompt.promptId}/dismiss`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }).catch(() => {})  // non-critical
    }

    // Advance to next prompt in the queue
    const remaining = pendingPrompts.filter(p => p.order_item_id !== currentPrompt.orderItemId)
    setPendingPrompts(remaining)

    if (remaining.length > 0) {
      const next = remaining[0]
      setCurrentPrompt({
        orderItemId:  next.order_item_id,
        productName:  next.product_name,
        productImage: next.product_image ?? null,
        variantLabel: next.variant_label ?? null,
        promptId:     next.id,
      })
    } else {
      setCurrentPrompt(null)
    }
  }, [currentPrompt, pendingPrompts])

  // ── User closes the modal without reviewing ───────────────────────────────
  const handleModalClose = useCallback(() => {
    if (!currentPrompt) return

    // Dismiss the current prompt so it doesn't reappear on next visit
    if (currentPrompt.promptId > 0) {
      const token = getToken()
      fetch(`${API_URL}/client/reviews/prompts/${currentPrompt.promptId}/dismiss`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }).catch(() => {})
    }

    // Advance to next in queue (or close if none left)
    const remaining = pendingPrompts.filter(p => p.order_item_id !== currentPrompt.orderItemId)
    setPendingPrompts(remaining)

    if (remaining.length > 0) {
      const next = remaining[0]
      setCurrentPrompt({
        orderItemId:  next.order_item_id,
        productName:  next.product_name,
        productImage: next.product_image ?? null,
        variantLabel: next.variant_label ?? null,
        promptId:     next.id,
      })
    } else {
      setCurrentPrompt(null)
    }
  }, [currentPrompt, pendingPrompts])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} color={RED} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>My Orders</h1>
              {!loading && !error && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: RED, margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Loading your orders…</p>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', color: RED, fontSize: 13, fontWeight: 600 }}>
              Failed to load orders. Please refresh the page.
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <ShoppingBag size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>No orders yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>Your order history will appear here.</p>
              <Link href="/shop" style={{ padding: '10px 24px', background: `linear-gradient(135deg,${RED},#b91c1c)`, color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
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
      {/* Auto-opens when currentPrompt is set (from pendingPrompts on page load  */}
      {/* OR when user manually clicks "Rate Product" button)                     */}
      {currentPrompt && (
        <ReviewSubmitModal
          orderItemId={currentPrompt.orderItemId}
          productName={currentPrompt.productName}
          productImage={currentPrompt.productImage}
          variantLabel={currentPrompt.variantLabel}
          onClose={handleModalClose}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  )
}