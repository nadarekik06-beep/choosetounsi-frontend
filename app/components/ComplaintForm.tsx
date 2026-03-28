'use client'

/**
 * components/ComplaintForm.tsx
 *
 * Shared reusable complaint form used in:
 *   1. ComplaintModal (from My Orders — order pre-filled)
 *   2. /complaints/new page (from Navbar — user selects order)
 *
 * Props:
 *   prefilledOrderId?: number — if provided, order selector is locked
 *   onSuccess?: (complaint) => void — called after successful submission
 *   onCancel?: () => void — called when user clicks cancel
 */

import { useState, useEffect, useRef } from 'react'
import { complaintApi } from '@/lib/complaintApi'
import type { EligibleOrder, ComplaintType } from '@/types/complaint'
import { COMPLAINT_TYPE_LABELS } from '@/types/complaint'

const RED   = '#db142e'
const GREEN = '#198f41'

interface ComplaintFormProps {
  prefilledOrderId?: number
  onSuccess?: (complaint: any) => void
  onCancel?: () => void
  compact?: boolean  // true when inside a modal
}

export default function ComplaintForm({
  prefilledOrderId,
  onSuccess,
  onCancel,
  compact = false,
}: ComplaintFormProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [eligibleOrders,  setEligibleOrders]  = useState<EligibleOrder[]>([])
  const [loadingOrders,   setLoadingOrders]   = useState(true)
  const [noEligible,      setNoEligible]      = useState(false)

  const [selectedOrderId,   setSelectedOrderId]   = useState<number | ''>(prefilledOrderId ?? '')
  const [complaintType,     setComplaintType]     = useState<ComplaintType | ''>('')
  const [otherReason,       setOtherReason]       = useState('')
  const [description,       setDescription]       = useState('')
  const [imageFile,         setImageFile]         = useState<File | null>(null)
  const [imagePreview,      setImagePreview]      = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load eligible orders ─────────────────────────────────────────────────
  useEffect(() => {
    complaintApi.getEligibleOrders()
      .then(res => {
        setEligibleOrders(res.data)
        if (res.data.length === 0) setNoEligible(true)
      })
      .catch(() => setNoEligible(true))
      .finally(() => setLoadingOrders(false))
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedOrder = eligibleOrders.find(o => o.id === selectedOrderId) ?? null

  // ── File handler ──────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be under 5 MB.' }))
      return
    }
    setErrors(prev => { const n = { ...prev }; delete n.image; return n })
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!selectedOrderId)   errs.order_id       = 'Please select an order.'
    if (!complaintType)     errs.complaint_type  = 'Please select a complaint type.'
    if (complaintType === 'other' && !otherReason.trim()) {
      errs.other_reason = 'Please specify your reason.'
    }
    if (description.trim().length < 20) {
      errs.description = 'Description must be at least 20 characters.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await complaintApi.submit({
        order_id:       selectedOrderId as number,
        complaint_type: complaintType as ComplaintType,
        other_reason:   complaintType === 'other' ? otherReason : undefined,
        description,
        image:          imageFile,
      })
      onSuccess?.(res.data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to submit complaint. Please try again.'
      setServerError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const Field = ({ label, error, required, children }: {
    label: string; error?: string; required?: boolean; children: React.ReactNode
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {label} {required && <span style={{ color: RED }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>⚠ {error}</span>
      )}
    </div>
  )

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
    border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
    outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
    appearance: 'none',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
    border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  // ── No eligible orders state ──────────────────────────────────────────────
  if (!loadingOrders && noEligible) {
    return (
      <div style={{ textAlign: 'center', padding: compact ? '24px 0' : '48px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          No eligible orders
        </p>
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 340, margin: '0 auto 16px', lineHeight: 1.6 }}>
          You can only file a complaint on a delivered order within{' '}
          <strong>{14} days</strong> of delivery. You may have already filed
          a complaint, or no orders are within the window.
        </p>
        {onCancel && (
          <button onClick={onCancel}
            style={{ padding: '8px 20px', border: `1.5px solid #e5e7eb`, borderRadius: 8,
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            Close
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Server error ── */}
      {serverError && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)',
          border: `1.5px solid ${RED}30`, borderRadius: 10, color: RED,
          fontSize: 13, fontWeight: 600 }}>
          ⚠ {serverError}
        </div>
      )}

      {/* ── Order selector ── */}
      <Field label="Select Order" error={errors.order_id} required>
        {loadingOrders ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10,
            border: '1.5px solid #e5e7eb', color: '#94a3b8', fontSize: 13 }}>
            Loading your orders…
          </div>
        ) : prefilledOrderId ? (
          // Locked — pre-filled from My Orders
          <div style={{ ...inputStyle, background: '#f8fafc', color: '#64748b',
            cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            {selectedOrder
              ? `#${selectedOrder.order_number} — ${selectedOrder.delivered_at}`
              : `Order #${prefilledOrderId}`}
          </div>
        ) : (
          <select
            value={selectedOrderId}
            onChange={e => setSelectedOrderId(e.target.value ? Number(e.target.value) : '')}
            style={{ ...selectStyle, border: errors.order_id ? `1.5px solid ${RED}` : '1.5px solid #e5e7eb' }}>
            <option value="">— Select an order —</option>
            {eligibleOrders.map(o => (
              <option key={o.id} value={o.id}>
                #{o.order_number} — {o.delivered_at} ({o.days_left} day{o.days_left !== 1 ? 's' : ''} left)
              </option>
            ))}
          </select>
        )}

        {/* Show selected order items summary */}
        {selectedOrder && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
            border: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
            <strong style={{ color: '#374151' }}>Items:</strong>{' '}
            {selectedOrder.items.map((item, i) => (
              <span key={i}>
                {item.product_name} ×{item.quantity}
                {i < selectedOrder.items.length - 1 ? ', ' : ''}
              </span>
            ))}
            <span style={{ marginLeft: 10, color: '#f59e0b', fontWeight: 700 }}>
              ⏳ {selectedOrder.days_left} day{selectedOrder.days_left !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}
      </Field>

      {/* ── Complaint type ── */}
      <Field label="Complaint Type" error={errors.complaint_type} required>
        <select
          value={complaintType}
          onChange={e => setComplaintType(e.target.value as ComplaintType | '')}
          style={{ ...selectStyle, border: errors.complaint_type ? `1.5px solid ${RED}` : '1.5px solid #e5e7eb' }}>
          <option value="">— Select a reason —</option>
          {(Object.entries(COMPLAINT_TYPE_LABELS) as [ComplaintType, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </Field>

      {/* ── Other reason (conditional) ── */}
      {complaintType === 'other' && (
        <Field label="Please specify your reason" error={errors.other_reason} required>
          <input
            type="text"
            value={otherReason}
            onChange={e => setOtherReason(e.target.value)}
            placeholder="e.g. Item arrived late and in wrong packaging"
            style={{ ...inputStyle, border: errors.other_reason ? `1.5px solid ${RED}` : '1.5px solid #e5e7eb' }}
          />
        </Field>
      )}

      {/* ── Description ── */}
      <Field label="Description" error={errors.description} required>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={compact ? 3 : 4}
          placeholder="Please describe the issue in detail. What did you receive? What was expected? When did you notice the problem?"
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.6,
            border: errors.description ? `1.5px solid ${RED}` : '1.5px solid #e5e7eb',
          }}
        />
        <span style={{ fontSize: 11, color: description.length < 20 ? '#f59e0b' : '#10b981',
          fontWeight: 600, textAlign: 'right' }}>
          {description.length} / 2000 characters {description.length < 20 && `(${20 - description.length} more needed)`}
        </span>
      </Field>

      {/* ── Image upload ── */}
      <Field label="Proof Image (optional)" error={errors.image}>
        {imagePreview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={imagePreview} alt="Preview"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain',
                borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8fafc' }} />
            <button onClick={removeImage}
              style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                borderRadius: '50%', background: RED, color: '#fff', border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 900, display: 'flex',
                alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: '24px 16px',
              textAlign: 'center', cursor: 'pointer', background: '#fafafa',
              transition: 'border-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = RED)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#d1d5db')}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>
              Click to upload a proof photo
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              JPEG, PNG, WEBP — max 5 MB
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </Field>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: compact ? 'flex-end' : 'stretch',
        flexDirection: compact ? 'row' : 'column', marginTop: 4 }}>
        {onCancel && (
          <button onClick={onCancel} disabled={submitting}
            style={{ padding: '11px 24px', border: '1.5px solid #e5e7eb', borderRadius: 10,
              background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: submitting ? 0.6 : 1 }}>
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            flex: compact ? undefined : 1,
            padding: '12px 28px', borderRadius: 10,
            background: submitting ? '#94a3b8' : RED,
            color: '#fff', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {submitting ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14,
                border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Submitting…
            </>
          ) : '🚨 Submit Complaint'}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}