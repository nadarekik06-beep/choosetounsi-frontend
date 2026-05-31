'use client'

/**
 * components/ComplaintModal.tsx  ← REPLACE
 *
 * BASE: original file (doc 34)
 *
 * CHANGES ADDED on top of the original:
 *   1. resolutionType state + hoursLeft state
 *   2. Reset resolutionType on close
 *   3. Resolution type picker UI (two cards: Return & Refund / Exchange)
 *     inserted between item picker and complaint type selector
 *   4. resolutionType validation in handleSubmit
 *   5. body.append('resolution_type', resolutionType) in FormData
 *   6. formProgress accounts for resolutionType
 *   7. hoursLeft shown in header next to order number
 *   8. hoursLeft fetched from eligible-orders response
 *
 * ALL original code preserved exactly:
 *   - All state variables
 *   - fetchOrderItems, handleFile, handleDrop, toggleItem
 *   - All CSS classes (.cd-*)
 *   - Success state, Blocked state, eligibility logic
 *   - Item picker (single + multi)
 *   - Complaint type dropdown
 *   - Description + progress bar
 *   - Proof image upload
 *   - Info note
 *   - Footer submit button
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, AlertTriangle, ChevronDown, ImagePlus,
  Trash2, Send, CheckCircle, ShieldAlert,
  Lock, Clock, PackageCheck,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const RED     = '#db142e'
const GREEN   = '#198f41'
const ORANGE  = '#f97316'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token') ?? localStorage.getItem('auth_token') ?? null
}

const COMPLAINT_TYPES = [
  { value: '',                label: '— Select a reason —',          icon: null },
  { value: 'wrong_product',   label: 'Wrong Product Received',       icon: '📦' },
  { value: 'wrong_size',      label: 'Wrong Size',                   icon: '📏' },
  { value: 'wrong_color',     label: 'Wrong Color',                  icon: '🎨' },
  { value: 'damaged_product', label: 'Damaged / Defective Product',  icon: '💔' },
  { value: 'other',           label: 'Other',                        icon: '📝' },
]

const ELIGIBLE_STATUSES = ['delivered', 'out_for_delivery', 'completed']

const STATUS_LABELS: Record<string, string> = {
  pending:          'Pending seller confirmation',
  processing:       'Being prepared by seller',
  out_for_delivery: 'Out for delivery',
  completed:        'Completed',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
}

interface OrderItemInfo {
  id:           number
  product_name: string
  quantity:     number
  unit_price:   number
  image_url:    string | null
}

interface Props {
  orderId:       number
  orderNumber:   string
  orderStatuses: string[]
  isOpen:        boolean
  onClose:       () => void
}

export default function ComplaintModal({
  orderId, orderNumber, orderStatuses, isOpen, onClose,
}: Props) {
  // ── All original state ────────────────────────────────────────────────────
  const [type,           setType]           = useState('')
  const [description,    setDescription]    = useState('')
  const [imageFile,      setImageFile]      = useState<File | null>(null)
  const [imagePreview,   setImagePreview]   = useState<string | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [success,        setSuccess]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [isDragging,     setIsDragging]     = useState(false)
  const [mounted,        setMounted]        = useState(false)
  const [orderItems,     setOrderItems]     = useState<OrderItemInfo[]>([])
  const [selectedItemIds,setSelectedItemIds]= useState<number[]>([])
  const [loadingItems,   setLoadingItems]   = useState(false)

  // ── NEW state ─────────────────────────────────────────────────────────────
  const [resolutionType, setResolutionType] = useState<'exchange' | 'return_refund' | ''>('')
  const [hoursLeft,      setHoursLeft]      = useState<number | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  const MIN_CHARS = 20
  const MAX_CHARS = 2000
  const charCount = description.length
  const charOk    = charCount >= MIN_CHARS
  const progress  = Math.min(100, (charCount / MAX_CHARS) * 100)

  const isEligible      = orderStatuses.some(s => ELIGIBLE_STATUSES.includes(s))
  const allStatuses     = [...new Set(orderStatuses)]
  const pendingStatuses = allStatuses.filter(s => !ELIGIBLE_STATUSES.includes(s) && s !== 'cancelled')
  const eligibleCount   = orderStatuses.filter(s => ELIGIBLE_STATUSES.includes(s)).length

  // ── fetchOrderItems — original logic + hoursLeft extraction ──────────────
  const fetchOrderItems = useCallback(async () => {
    if (!isEligible) return
    setLoadingItems(true)
    try {
      const token = getToken()
      const res   = await fetch(`${API_URL}/client/complaints/eligible-orders`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const json = await res.json()
      if (!json.success) return

      const orders: any[] = json.data ?? []
      const thisOrder = orders.find((o: any) => o.id === orderId)
      if (!thisOrder) return

      const items: OrderItemInfo[] = thisOrder.items ?? []
      setOrderItems(items)
      setHoursLeft(thisOrder.hours_left ?? null)  // ← NEW

      if (items.length === 1) {
        setSelectedItemIds([items[0].id])
      }
    } catch {
      // Non-critical
    } finally {
      setLoadingItems(false)
    }
  }, [orderId, isEligible])

  // ── Original useEffects preserved ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setMounted(true), 10)
      document.body.style.overflow = 'hidden'
      fetchOrderItems()
    } else {
      setMounted(false)
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, fetchOrderItems])

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setType(''); setDescription(''); setImageFile(null)
        setImagePreview(null); setSuccess(false); setError(null)
        setOrderItems([]); setSelectedItemIds([])
        setResolutionType(''); setHoursLeft(null)  // ← NEW resets
      }, 350)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isOpen, onClose])

  if (!isOpen && !mounted) return null

  // ── Original handlers ─────────────────────────────────────────────────────
  function handleFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024)     { setError('Image must be under 5 MB.');    return }
    setError(null)
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  const toggleItem = (id: number) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // ── handleSubmit — original + resolution_type ─────────────────────────────
  async function handleSubmit() {
    if (!type)           { setError('Please select a complaint type.'); return }
    if (!resolutionType) { setError('Please select what you want: Exchange or Return & Refund.'); return } // ← NEW
    if (!charOk)         { setError(`Description needs at least ${MIN_CHARS} characters.`); return }
    if (orderItems.length > 0 && selectedItemIds.length === 0) {
      setError('Please select at least one item you are reporting an issue with.')
      return
    }
    setError(null); setLoading(true)
    try {
      const token = getToken()
      const body  = new FormData()
      body.append('order_id',       String(orderId))
      body.append('complaint_type', type)
      body.append('resolution_type', resolutionType)  // ← NEW
      body.append('description',    description)
      if (imageFile) body.append('image', imageFile)
      selectedItemIds.forEach(id => body.append('item_ids[]', String(id)))

      const res  = await fetch(`${API_URL}/client/complaints`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Submission failed')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = COMPLAINT_TYPES.find(t => t.value === type)
  const charColor    = charCount === 0 ? '#94a3b8' : charOk ? GREEN : '#f59e0b'

  // formProgress updated to include resolutionType
  const formProgress = Math.min(100,
    (type ? 20 : 0) +
    (resolutionType ? 20 : 0) +
    (selectedItemIds.length > 0 ? 20 : 0) +
    (charOk ? 20 : Math.min(20, (charCount / MIN_CHARS) * 20)) +
    (imageFile ? 20 : 0)
  )

  // ── Styles — all original ─────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 800, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8,
    fontFamily: "'Barlow', sans-serif",
  }

  const inputBaseStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontFamily: "'Barlow', sans-serif",
    fontSize: 14, fontWeight: 600, color: '#0f172a',
    outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes cd-spin { to { transform: rotate(360deg) } }
        @keyframes cd-success-pop {
          0%   { transform: scale(0.7); opacity: 0 }
          65%  { transform: scale(1.06) }
          100% { transform: scale(1);   opacity: 1 }
        }
        @keyframes cd-fadein { from { opacity:0 } to { opacity:1 } }
        .cd-body-scroll::-webkit-scrollbar { width: 4px }
        .cd-body-scroll::-webkit-scrollbar-track { background: transparent }
        .cd-body-scroll::-webkit-scrollbar-thumb { background: #dde1e7; border-radius: 99px }
        .cd-select-el {
          width: 100%; box-sizing: border-box; appearance: none;
          background: #f8fafc; border: 1.5px solid #e5e7eb; border-radius: 10px;
          padding: 11px 38px 11px 13px; font-size: 14px; font-weight: 600;
          font-family: 'Barlow', sans-serif; color: #0f172a;
          cursor: pointer; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-select-el:focus { border-color: ${RED}; box-shadow: 0 0 0 3px rgba(219,20,46,0.08); background:#fff; }
        .cd-textarea-el {
          width: 100%; box-sizing: border-box; background: #f8fafc;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          padding: 12px 13px; font-size: 13.5px; font-weight: 500;
          font-family: 'Barlow', sans-serif; color: #0f172a;
          resize: none; height: 108px; line-height: 1.65; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-textarea-el:focus { border-color: ${RED}; box-shadow: 0 0 0 3px rgba(219,20,46,0.08); background:#fff; }
        .cd-textarea-el::placeholder { color: #94a3b8; font-weight: 400; }
        .cd-submit-btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 13px 20px; border-radius: 11px; border: none;
          font-size: 14px; font-weight: 800; font-family: 'Barlow', sans-serif;
          color: #fff; background: linear-gradient(135deg, ${RED} 0%, #b91c1c 100%);
          cursor: pointer; box-shadow: 0 4px 18px rgba(219,20,46,0.32);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          letter-spacing: 0.2px;
        }
        .cd-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(219,20,46,0.42); }
        .cd-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
        .cd-close-btn {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1.5px solid #e5e7eb; background: #f8fafc;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #94a3b8; transition: all 0.15s; flex-shrink: 0;
        }
        .cd-close-btn:hover { background: #fef2f2; color: ${RED}; border-color: rgba(219,20,46,0.25); }
        .cd-upload-zone {
          border: 2px dashed #e2e8f0; border-radius: 11px; padding: 18px 16px;
          text-align: center; cursor: pointer; background: #fafbfc; transition: all 0.15s;
        }
        .cd-upload-zone:hover, .cd-upload-zone.dragging {
          border-color: ${RED}; background: rgba(219,20,46,0.025);
        }
        .cd-item-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: 1.5px solid #e5e7eb; background: #f8fafc;
          transition: all 0.15s ease; font-family: 'Barlow', sans-serif;
        }
        .cd-item-row:hover { border-color: ${RED}; background: rgba(219,20,46,0.03); }
        .cd-item-row.selected { border-color: ${RED}; background: rgba(219,20,46,0.06); box-shadow: 0 0 0 1px ${RED}; }
        .cd-res-btn {
          flex: 1; display: flex; flex-direction: column; gap: 8px;
          padding: 14px 12px; border-radius: 12px; cursor: pointer;
          border: 2px solid #e5e7eb; background: #f8fafc;
          text-align: left; font-family: 'Barlow', sans-serif;
          transition: all 0.18s ease;
        }
      `}</style>

      {/* ── Root overlay ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report an Issue"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          fontFamily: "'Barlow', sans-serif",
          pointerEvents: isOpen ? 'all' : 'none',
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(2,8,20,0.55)',
            backdropFilter: 'blur(3px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* ── Drawer ── */}
        <div
          style={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0,
            width: '100%', maxWidth: 460,
            height: '100vh',
            background: '#ffffff',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-12px 0 60px rgba(0,0,0,0.18)',
            transform: mounted ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
            zIndex: 10000,
          }}
        >
          {/* Progress strip */}
          {isEligible && !success && (
            <div style={{ height: 3, background: '#f1f5f9', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                width: `${formProgress}%`,
                background: `linear-gradient(90deg, ${RED}, #f59e0b)`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(219,20,46,0.1), rgba(219,20,46,0.05))',
                border: '1.5px solid rgba(219,20,46,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldAlert size={18} color={RED} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  Report an Issue
                </p>
                {/* ← UPDATED: show hours remaining next to order number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 600 }}>
                    Order{' '}
                    <span style={{ color: RED, fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>
                      #{orderNumber}
                    </span>
                  </p>
                  {hoursLeft !== null && (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: hoursLeft < 6 ? RED : '#f59e0b',
                      background: hoursLeft < 6 ? 'rgba(219,20,46,0.08)' : 'rgba(245,158,11,0.08)',
                      padding: '1px 6px', borderRadius: 999,
                      border: `1px solid ${hoursLeft < 6 ? RED : '#f59e0b'}25`,
                    }}>
                      ⏱ {hoursLeft}h left
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="cd-close-btn" onClick={onClose} aria-label="Close">
              <X size={14} />
            </button>
          </div>

          {/* ══ SUCCESS ══ */}
          {success ? (
            <>
              <div style={{
                flex: '1 1 0', minHeight: 0, overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', textAlign: 'center', gap: 12,
                animation: 'cd-success-pop 0.45s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', marginBottom: 8,
                  background: 'linear-gradient(135deg, rgba(25,143,65,0.1), rgba(25,143,65,0.05))',
                  border: '2px solid rgba(25,143,65,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={32} color={GREEN} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Complaint Submitted!
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', lineHeight: 1.65, maxWidth: 320 }}>
                  Our support team will review your complaint for order{' '}
                  <strong style={{ color: '#374151' }}>#{orderNumber}</strong> and respond within{' '}
                  <strong style={{ color: '#374151' }}>24–48 hours</strong>.
                </p>
                <div style={{
                  marginTop: 20, padding: '12px 16px',
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: 10, fontSize: 12, color: '#64748b', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>📩</span>
                  You'll be notified by email when it's reviewed.
                </div>
              </div>
              <div style={{ flexShrink: 0, padding: '14px 20px 20px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
                <button onClick={onClose} style={{
                  width: '100%', padding: 13, borderRadius: 11, border: 'none',
                  background: `linear-gradient(135deg, ${GREEN}, #15803d)`,
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  fontFamily: "'Barlow', sans-serif", cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(25,143,65,0.28)',
                }}>Done</button>
              </div>
            </>

          /* ══ BLOCKED ══ */
          ) : !isEligible ? (
            <div style={{
              flex: '1 1 0', minHeight: 0, overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '32px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', marginBottom: 20,
                background: 'linear-gradient(135deg, #fef3c7, #fef9ee)',
                border: '2px solid #fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={30} color="#d97706" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
                Not Delivered Yet
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px', lineHeight: 1.65, maxWidth: 320 }}>
                You can only file a complaint after your order has been{' '}
                <strong style={{ color: '#374151' }}>delivered</strong> or is{' '}
                <strong style={{ color: '#374151' }}>out for delivery</strong>.
              </p>
              {allStatuses.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    Current Status
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
                    {allStatuses.map(s => {
                      const isPending = ['pending', 'processing'].includes(s)
                      const color     = isPending ? '#d97706' : '#6366f1'
                      const bg        = isPending ? 'rgba(217,119,6,0.08)' : 'rgba(99,102,241,0.08)'
                      const border    = isPending ? 'rgba(217,119,6,0.25)' : 'rgba(99,102,241,0.25)'
                      return (
                        <span key={s} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 700, padding: '4px 10px',
                          borderRadius: 999, border: `1px solid ${border}`,
                          color, background: bg,
                        }}>
                          <Clock size={10} />
                          {STATUS_LABELS[s] ?? s}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', textAlign: 'left' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  What happens next?
                </p>
                {[
                  { icon: '📦', text: 'Your order ships and is picked up by delivery' },
                  { icon: '🚴', text: 'Delivery is on the way to you' },
                  { icon: '✅', text: 'Order is marked as Delivered' },
                  { icon: '🛡️', text: 'You can then file a complaint if needed (within 48h)' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
                    <span style={{ fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>{step.icon}</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>{step.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose} style={{
                marginTop: 20, padding: '11px 28px',
                borderRadius: 10, border: '1.5px solid #e5e7eb',
                background: '#f8fafc', color: '#374151',
                fontSize: 13, fontWeight: 700,
                fontFamily: "'Barlow', sans-serif", cursor: 'pointer',
              }}>
                Got it, close
              </button>
            </div>

          /* ══ FORM ══ */
          ) : (
            <>
              {/* Partial eligibility notice */}
              {eligibleCount < orderStatuses.length && (
                <div style={{
                  padding: '10px 20px', flexShrink: 0,
                  background: 'rgba(99,102,241,0.05)',
                  borderBottom: '1px solid rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                }}>
                  <PackageCheck size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, margin: 0, lineHeight: 1.55 }}>
                    {eligibleCount} of {orderStatuses.length} sub-orders are eligible for a complaint.
                    {pendingStatuses.length > 0 && ` The others are still ${pendingStatuses.map(s => STATUS_LABELS[s] ?? s).join(', ')}.`}
                  </p>
                </div>
              )}

              {/* Scrollable body */}
              <div
                className="cd-body-scroll"
                style={{
                  flex: '1 1 0',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                {/* Error */}
                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1.5px solid rgba(219,20,46,0.18)',
                    borderRadius: 9, padding: '10px 13px',
                    fontSize: 13, fontWeight: 600, color: RED,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* ── Item Picker (original) ── */}
                {loadingItems && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #e2e8f0', borderTopColor: RED, borderRadius: '50%', animation: 'cd-spin 0.8s linear infinite' }} />
                    Loading items…
                  </div>
                )}

                {!loadingItems && orderItems.length > 0 && (
                  <div>
                    <label style={labelStyle}>
                      {orderItems.length === 1 ? 'Item' : 'Which item(s)?'}{' '}
                      <span style={{ color: RED }}>*</span>
                    </label>

                    {orderItems.length === 1 ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(219,20,46,0.05)', border: `1.5px solid ${RED}`,
                      }}>
                        {orderItems[0].image_url && (
                          <img src={orderItems[0].image_url} alt={orderItems[0].product_name}
                            style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            {orderItems[0].product_name}
                          </p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                            Qty: {orderItems[0].quantity}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: RED,
                          background: 'rgba(219,20,46,0.08)', padding: '2px 7px',
                          borderRadius: 999, border: `1px solid ${RED}25`,
                        }}>Auto</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500, margin: '0 0 4px' }}>
                          Select the item(s) you have an issue with:
                        </p>
                        {orderItems.map(item => {
                          const sel = selectedItemIds.includes(item.id)
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              className={`cd-item-row${sel ? ' selected' : ''}`}
                              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                border: `2px solid ${sel ? RED : '#e5e7eb'}`,
                                background: sel ? RED : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}>
                                {sel && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.product_name}
                                  style={{ width: 38, height: 38, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{
                                  width: 38, height: 38, borderRadius: 7, flexShrink: 0,
                                  background: '#f1f5f9', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 16,
                                }}>📦</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13, fontWeight: 700,
                                  color: sel ? RED : '#0f172a',
                                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  transition: 'color 0.15s',
                                }}>
                                  {item.product_name}
                                </p>
                                <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Resolution Type — NEW ── */}
                <div>
                  <label style={labelStyle}>
                    What do you want? <span style={{ color: RED }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['return_refund', 'exchange'] as const).map(opt => {
                      const sel = resolutionType === opt
                      const accentColor = opt === 'return_refund' ? RED : ORANGE
                      const labels = {
                        return_refund: { icon: '💰', label: 'Return & Refund', desc: 'Return the item and get your money back' },
                        exchange:      { icon: '🔄', label: 'Exchange',        desc: 'Receive a replacement item instead' },
                      }
                      const cfg = labels[opt]
                      return (
                        <button
                          key={opt}
                          onClick={() => { setResolutionType(opt); setError(null) }}
                          className="cd-res-btn"
                          style={{
                            border: `2px solid ${sel ? accentColor : '#e5e7eb'}`,
                            background: sel ? `${accentColor}08` : '#f8fafc',
                            boxShadow: sel ? `0 0 0 1px ${accentColor}` : 'none',
                          }}
                        >
                          <span style={{ fontSize: 24 }}>{cfg.icon}</span>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 800, color: sel ? accentColor : '#374151', margin: '0 0 2px', fontFamily: "'Barlow', sans-serif" }}>
                              {cfg.label}
                            </p>
                            <p style={{ fontSize: 10, color: '#64748b', margin: 0, lineHeight: 1.4, fontFamily: "'Barlow', sans-serif" }}>
                              {cfg.desc}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {resolutionType === 'return_refund' && (
                    <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 0', padding: '8px 12px', background: 'rgba(219,20,46,0.04)', borderRadius: 8, border: '1px solid rgba(219,20,46,0.12)', lineHeight: 1.5, fontFamily: "'Barlow', sans-serif" }}>
                      📦 A delivery agent will collect the item(s) from you and return them to the seller.
                    </p>
                  )}
                  {resolutionType === 'exchange' && (
                    <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 0', padding: '8px 12px', background: 'rgba(249,115,22,0.04)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.12)', lineHeight: 1.5, fontFamily: "'Barlow', sans-serif" }}>
                      🔄 A delivery agent will bring you a replacement item.
                    </p>
                  )}
                </div>

                {/* ── Complaint Type (original) ── */}
                <div>
                  <label style={labelStyle}>
                    Complaint Type <span style={{ color: RED }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="cd-select-el"
                      value={type}
                      onChange={e => { setType(e.target.value); setError(null) }}
                    >
                      {COMPLAINT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.icon ? `${t.icon}  ${t.label}` : t.label}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
                      <ChevronDown size={14} />
                    </span>
                  </div>
                  {selectedType?.value && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                      background: 'rgba(219,20,46,0.07)', color: RED,
                      border: '1px solid rgba(219,20,46,0.18)', marginTop: 6,
                    }}>
                      {selectedType.icon} {selectedType.label}
                    </span>
                  )}
                </div>

                {/* ── Description (original) ── */}
                <div>
                  <label style={labelStyle}>
                    Description <span style={{ color: RED }}>*</span>
                  </label>
                  <textarea
                    className="cd-textarea-el"
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Describe the issue clearly. What did you receive? What was expected? When did you notice it?"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: charColor }}>
                      {charCount < MIN_CHARS ? `${MIN_CHARS - charCount} more chars needed` : '✓ Good to go'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                      {charCount} / {MAX_CHARS}
                    </span>
                  </div>
                  <div style={{ height: 2.5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginTop: 7 }}>
                    <div style={{
                      height: '100%', borderRadius: 99, width: `${progress}%`,
                      background: charOk
                        ? `linear-gradient(90deg, ${GREEN}, #22c55e)`
                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      transition: 'width 0.2s ease, background 0.3s ease',
                    }} />
                  </div>
                </div>

                {/* ── Proof Image (original) ── */}
                <div>
                  <label style={labelStyle}>
                    Proof Image{' '}
                    <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>
                      — optional
                    </span>
                  </label>
                  {imagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="Preview" style={{
                        width: '100%', maxHeight: 150, objectFit: 'cover',
                        borderRadius: 10, border: '1.5px solid #e5e7eb', display: 'block',
                      }} />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(null) }}
                        aria-label="Remove"
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 28, height: 28, borderRadius: 7,
                          border: 'none', background: 'rgba(0,0,0,0.55)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontWeight: 600 }}>
                        📎 {imageFile?.name}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`cd-upload-zone${isDragging ? ' dragging' : ''}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, margin: '0 auto 8px',
                        background: 'rgba(219,20,46,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ImagePlus size={18} color={RED} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 3px' }}>
                        Drop here or <span style={{ color: RED }}>browse</span>
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                        PNG, JPG, WEBP · Max 5 MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* ── Info note (original + hours) ── */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(219,20,46,0.03), rgba(219,20,46,0.01))',
                  border: '1px solid rgba(219,20,46,0.1)',
                  borderRadius: 10, padding: '11px 14px',
                  display: 'flex', gap: 9, alignItems: 'flex-start',
                }}>
                  <AlertTriangle size={13} color={RED} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
                    Complaints are reviewed within{' '}
                    <strong style={{ color: '#374151' }}>24–48 hours</strong>.
                    {hoursLeft !== null && (
                      <> You have <strong style={{ color: RED }}>{hoursLeft}h</strong> left to file this complaint.</>
                    )}
                    {' '}Clear details and photos help us resolve issues faster.
                  </p>
                </div>
              </div>

              {/* Footer — original */}
              <div style={{
                flexShrink: 0,
                padding: '14px 20px 20px',
                borderTop: '1px solid #f1f5f9',
                background: '#fff',
              }}>
                <button
                  className="cd-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading || !type || !resolutionType || !charOk}
                >
                  {loading
                    ? <><div style={{ width: 15, height: 15, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cd-spin 0.7s linear infinite' }} /> Submitting…</>
                    : <><Send size={14} /> Submit Complaint</>
                  }
                </button>
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '9px 0 0', fontWeight: 500 }}>
                  Submitting confirms this issue is genuine and accurate.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}