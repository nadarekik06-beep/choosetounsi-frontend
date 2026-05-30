'use client'

/**
 * components/ComplaintForm.tsx  — ChooseTounsi light mode redesign
 *
 * FIX: Field defined OUTSIDE ComplaintForm (no focus loss on textarea).
 * THEME: Full light mode — white cards, ChooseTounsi red accent, crisp shadows.
 */

import { useState, useEffect, useRef } from 'react'
import { complaintApi } from '@/lib/complaintApi'
import type { EligibleOrder, ComplaintType } from '@/types/complaint'
import { COMPLAINT_TYPE_LABELS } from '@/types/complaint'

// ── Brand tokens — light mode ─────────────────────────────────────────────────
const RED       = '#db142e'
const RED_DARK  = '#a50f22'
const RED_LIGHT = 'rgba(219,20,46,0.08)'
const RED_GLOW  = 'rgba(219,20,46,0.15)'
const BG        = '#f4f6f9'
const CARD      = '#ffffff'
const CARD2     = '#f8fafc'
const BORDER    = '#e2e8f0'
const BORDER_FOCUS = 'rgba(219,20,46,0.45)'
const TEXT      = '#0f172a'
const TEXT_SEC  = '#475569'
const MUTED     = '#94a3b8'
const GREEN     = '#10b981'

const TYPE_ICONS: Record<string, string> = {
  wrong_item:       '📦',
  damaged_item:     '💔',
  missing_item:     '🔍',
  not_as_described: '🖼️',
  quality_issue:    '⚠️',
  late_delivery:    '⏰',
  other:            '💬',
}

// ── StepDot ───────────────────────────────────────────────────────────────────
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 900,
      background: done ? RED : active ? RED_LIGHT : '#f1f5f9',
      border: `2px solid ${done || active ? RED : BORDER}`,
      color: done ? '#fff' : active ? RED : MUTED,
      transition: 'all 0.3s ease',
      boxShadow: active ? `0 0 0 4px ${RED_GLOW}` : done ? `0 2px 8px rgba(219,20,46,0.25)` : 'none',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

// ── Field — MUST be outside ComplaintForm to prevent focus loss ───────────────
function Field({
  label, error, required, hint, children,
}: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{
          fontSize: 11, fontWeight: 800, color: TEXT_SEC,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {label} {required && <span style={{ color: RED }}>*</span>}
        </label>
        {hint && !error && (
          <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{hint}</span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: RED, fontWeight: 700 }}>⚠ {error}</span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  icon, label, done, delay, children,
}: {
  icon: string; label: string; done: boolean; delay: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 16, padding: '20px 22px',
      border: `1.5px solid ${done ? 'rgba(219,20,46,0.2)' : BORDER}`,
      marginBottom: 12, transition: 'border-color 0.3s, box-shadow 0.3s',
      boxShadow: done
        ? '0 2px 16px rgba(219,20,46,0.07)'
        : '0 1px 4px rgba(0,0,0,0.05)',
      animation: `fadeSlideIn 0.4s ease ${delay} both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: done ? RED : RED_LIGHT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, transition: 'all 0.3s',
          boxShadow: done ? '0 4px 12px rgba(219,20,46,0.25)' : 'none',
        }}>
          {done ? <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span> : icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ── Stable base input style ───────────────────────────────────────────────────
const baseInputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
  background: CARD2, color: TEXT, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
}

// ─────────────────────────────────────────────────────────────────────────────
interface ComplaintFormProps {
  prefilledOrderId?: number
  onSuccess?: (complaint: any) => void
  onCancel?: () => void
  compact?: boolean
}

export default function ComplaintForm({
  prefilledOrderId, onSuccess, onCancel, compact = false,
}: ComplaintFormProps) {

  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([])
  const [loadingOrders,  setLoadingOrders]  = useState(true)
  const [noEligible,     setNoEligible]     = useState(false)

  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>(prefilledOrderId ?? '')
  const [complaintType,   setComplaintType]   = useState<ComplaintType | ''>('')
  const [otherReason,     setOtherReason]     = useState('')
  const [description,     setDescription]     = useState('')
  const [imageFile,       setImageFile]       = useState<File | null>(null)
  const [imagePreview,    setImagePreview]    = useState<string | null>(null)

  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [serverError,  setServerError]  = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const step1Done = !!selectedOrderId
  const step2Done = !!complaintType && (complaintType !== 'other' || !!otherReason.trim())
  const step3Done = description.trim().length >= 20
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4
  const allDone = step1Done && step2Done && step3Done

  useEffect(() => {
    complaintApi.getEligibleOrders()
      .then(res => {
        setEligibleOrders(res.data)
        if (res.data.length === 0) setNoEligible(true)
      })
      .catch(() => setNoEligible(true))
      .finally(() => setLoadingOrders(false))
  }, [])

  const selectedOrder = eligibleOrders.find(o => o.id === selectedOrderId) ?? null

  const processFile = (file: File) => {
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) processFile(file)
  }

  const removeImage = () => {
    setImageFile(null); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!selectedOrderId) errs.order_id = 'Please select an order.'
    if (!complaintType)   errs.complaint_type = 'Please select a type.'
    if (complaintType === 'other' && !otherReason.trim()) errs.other_reason = 'Please specify.'
    if (description.trim().length < 20) errs.description = `${20 - description.trim().length} more chars needed.`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await complaintApi.submit({
        order_id: selectedOrderId as number,
        complaint_type: complaintType as ComplaintType,
        other_reason: complaintType === 'other' ? otherReason : undefined,
        description, image: imageFile,
      })
      onSuccess?.(res.data)
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const iStyle = (field: string, hasErr?: boolean): React.CSSProperties => ({
    ...baseInputStyle,
    border: hasErr
      ? `1.5px solid ${RED}`
      : focusedField === field
      ? `1.5px solid ${BORDER_FOCUS}`
      : `1.5px solid ${BORDER}`,
    boxShadow: focusedField === field && !hasErr
      ? `0 0 0 3px ${RED_GLOW}`
      : hasErr ? `0 0 0 3px rgba(219,20,46,0.1)` : 'none',
  })

  // ── No eligible orders ─────────────────────────────────────────────────────
  if (!loadingOrders && noEligible) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
          background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>📦</div>
        <p style={{ fontSize: 16, fontWeight: 900, color: TEXT, margin: '0 0 10px' }}>
          No eligible orders
        </p>
        <p style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 320, margin: '0 auto 24px', lineHeight: 1.7 }}>
          Complaints can only be filed on <strong>delivered orders</strong> within{' '}
          <strong>14 days</strong> of delivery, once per order.
        </p>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: '10px 24px', border: `1.5px solid ${BORDER}`, borderRadius: 10,
            background: '#fff', color: TEXT_SEC, fontSize: 13,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Close</button>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .ct-select option { background: #fff; color: #0f172a; }
        .ct-chip {
          cursor: pointer;
          transition: all 0.18s ease !important;
        }
        .ct-chip:hover {
          border-color: ${RED} !important;
          background: ${RED_LIGHT} !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(219,20,46,0.12) !important;
        }
        .ct-upload:hover {
          border-color: ${RED} !important;
          background: rgba(219,20,46,0.03) !important;
        }
        .ct-submit:hover:not(:disabled) {
          background: ${RED_DARK} !important;
          box-shadow: 0 8px 28px rgba(219,20,46,0.38) !important;
          transform: translateY(-1px);
        }
        .ct-submit:active:not(:disabled) { transform: translateY(0) !important; }
        .ct-cancel:hover {
          border-color: #cbd5e1 !important;
          background: #f8fafc !important;
          color: ${TEXT} !important;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Step progress ── */}
        {!compact && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', marginBottom: 28, padding: '0 4px',
          }}>
            {[
              { n: 1, label: 'Order' },
              { n: 2, label: 'Type' },
              { n: 3, label: 'Details' },
              { n: 4, label: 'Submit' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <StepDot n={s.n} active={currentStep === s.n} done={currentStep > s.n} />
                  <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: currentStep > s.n ? RED : currentStep === s.n ? TEXT : MUTED,
                    transition: 'color 0.3s',
                  }}>{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '-18px 8px 0', borderRadius: 2,
                    background: currentStep > s.n
                      ? `linear-gradient(90deg, ${RED}, ${RED})`
                      : '#e2e8f0',
                    transition: 'background 0.4s ease',
                  }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Server error ── */}
        {serverError && (
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'rgba(219,20,46,0.06)', border: `1.5px solid rgba(219,20,46,0.2)`,
            borderRadius: 10, color: RED, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeSlideIn 0.3s ease',
          }}>
            <span>⚠</span> {serverError}
          </div>
        )}

        {/* ═══ 1 — ORDER ══════════════════════════════════════════════════════ */}
        <Section icon="🛒" label="Select Order" done={step1Done} delay="0s">
          <Field label="Your Order" error={errors.order_id} required>
            {loadingOrders ? (
              <div style={{
                ...baseInputStyle, border: `1.5px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 10, color: MUTED,
              }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: `2px solid #e2e8f0`, borderTopColor: RED,
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                Loading your orders…
              </div>
            ) : prefilledOrderId ? (
              <div style={{
                ...baseInputStyle, border: `1.5px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 10,
                color: TEXT_SEC, cursor: 'not-allowed', background: '#f1f5f9',
              }}>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 5,
                  background: '#e2e8f0', color: MUTED, fontWeight: 800, letterSpacing: '0.06em',
                }}>LOCKED</span>
                {selectedOrder
                  ? `Order #${selectedOrder.order_number} — ${selectedOrder.delivered_at}`
                  : `Order #${prefilledOrderId}`}
              </div>
            ) : (
              <select
                value={selectedOrderId}
                onChange={e => setSelectedOrderId(e.target.value ? Number(e.target.value) : '')}
                onFocus={() => setFocusedField('order')}
                onBlur={() => setFocusedField(null)}
                className="ct-select"
                style={{ ...iStyle('order', !!errors.order_id), cursor: 'pointer', appearance: 'none' }}>
                <option value="">— Choose an order —</option>
                {eligibleOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number} · {o.delivered_at} · {o.days_left}d left
                  </option>
                ))}
              </select>
            )}
          </Field>

          {selectedOrder && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 9,
              background: '#f8fafc', border: `1px solid ${BORDER}`,
              display: 'flex', flexWrap: 'wrap', gap: 6,
              animation: 'fadeSlideIn 0.25s ease',
              alignItems: 'center',
            }}>
              {selectedOrder.items.map((item, i) => (
                <span key={i} style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: '#fff', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                }}>📦 {item.product_name} ×{item.quantity}</span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#f59e0b' }}>
                ⏳ {selectedOrder.days_left}d remaining
              </span>
            </div>
          )}
        </Section>

        {/* ═══ 2 — COMPLAINT TYPE ═════════════════════════════════════════════ */}
        <Section icon="🏷️" label="Complaint Type" done={step2Done} delay="0.05s">
          <div style={{
            display: 'grid',
            gridTemplateColumns: compact ? 'repeat(2,1fr)' : 'repeat(auto-fill, minmax(138px, 1fr))',
            gap: 8, marginBottom: errors.complaint_type ? 8 : 0,
          }}>
            {(Object.entries(COMPLAINT_TYPE_LABELS) as [ComplaintType, string][]).map(([val, label]) => {
              const sel = complaintType === val
              return (
                <button
                  key={val}
                  onClick={() => {
                    setComplaintType(val)
                    setErrors(p => { const n = { ...p }; delete n.complaint_type; return n })
                  }}
                  className="ct-chip"
                  style={{
                    padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
                    background: sel ? RED_LIGHT : '#f8fafc',
                    border: `1.5px solid ${sel ? RED : BORDER}`,
                    color: sel ? RED : TEXT_SEC,
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                    textAlign: 'left',
                    boxShadow: sel ? `0 0 0 1px ${RED}, 0 4px 16px rgba(219,20,46,0.12)` : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s ease',
                  }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[val] ?? '💬'}</span>
                  <span style={{ lineHeight: 1.3 }}>{label}</span>
                </button>
              )
            })}
          </div>
          {errors.complaint_type && (
            <span style={{ fontSize: 11, color: RED, fontWeight: 700 }}>⚠ {errors.complaint_type}</span>
          )}
          {complaintType === 'other' && (
            <div style={{ marginTop: 12, animation: 'fadeSlideIn 0.2s ease' }}>
              <Field label="Specify your reason" error={errors.other_reason} required>
                <input
                  type="text"
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  onFocus={() => setFocusedField('other_reason')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Item arrived in wrong packaging"
                  style={iStyle('other_reason', !!errors.other_reason)}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* ═══ 3 — DESCRIPTION + PHOTO ════════════════════════════════════════ */}
        <Section icon="✏️" label="Describe the Issue" done={step3Done} delay="0.1s">
          <Field label="Description" error={errors.description} hint={`${description.length} / 2000`} required>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
              rows={compact ? 3 : 5}
              placeholder="What happened? What did you receive vs. what was expected? The more detail, the faster we can resolve this…"
              style={{
                ...iStyle('description', !!errors.description),
                resize: 'vertical', lineHeight: 1.7, minHeight: compact ? 80 : 120,
              }}
            />
            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min(100, (description.length / 20) * 100)}%`,
                background: description.length >= 20
                  ? `linear-gradient(90deg, ${GREEN}, #34d399)`
                  : `linear-gradient(90deg, #f59e0b, #fbbf24)`,
                transition: 'width 0.2s, background 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: description.length >= 20 ? GREEN : '#d97706' }}>
              {description.length >= 20
                ? '✓ Great detail — this strengthens your case'
                : `${20 - description.length} more characters needed`}
            </span>
          </Field>

          {/* Photo upload */}
          <div style={{ marginTop: 18 }}>
            <Field label="Proof Photo" error={errors.image} hint="Optional · max 5 MB">
              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${BORDER}` }}>
                  <img
                    src={imagePreview} alt="Preview"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      📎 {imageFile?.name}
                    </span>
                    <button onClick={removeImage} style={{
                      padding: '3px 10px', borderRadius: 6, background: RED,
                      color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11,
                      fontWeight: 800, fontFamily: 'inherit',
                    }}>Remove</button>
                  </div>
                </div>
              ) : (
                <div
                  className="ct-upload"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed #cbd5e1`, borderRadius: 10, padding: '24px 16px',
                    textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                    transition: 'all 0.2s ease',
                  }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>📷</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_SEC, margin: '0 0 4px' }}>
                    Drop photo here or <span style={{ color: RED }}>click to browse</span>
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>JPEG · PNG · WEBP</p>
                </div>
              )}
              <input
                ref={fileInputRef} type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                style={{ display: 'none' }} onChange={handleFile}
              />
            </Field>
          </div>
        </Section>

        {/* ═══ ACTIONS ════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 4,
          flexDirection: compact ? 'row' : 'column',
          justifyContent: compact ? 'flex-end' : 'stretch',
          animation: 'fadeSlideIn 0.5s ease 0.15s both',
        }}>
          {onCancel && (
            <button onClick={onCancel} disabled={submitting} className="ct-cancel" style={{
              padding: '12px 24px', borderRadius: 11, border: `1.5px solid ${BORDER}`,
              background: '#fff', color: TEXT_SEC, fontSize: 13, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: submitting ? 0.5 : 1, transition: 'all 0.2s',
            }}>Cancel</button>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ct-submit"
            style={{
              flex: compact ? undefined : 1,
              padding: '14px 28px', borderRadius: 11,
              background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`,
              color: '#fff', fontSize: 14, fontWeight: 900, border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: submitting ? 'none' : `0 4px 16px rgba(219,20,46,0.3)`,
              opacity: submitting ? 0.7 : 1, transition: 'all 0.22s ease',
              letterSpacing: '0.02em',
            }}>
            {submitting ? (
              <>
                <span style={{
                  display: 'inline-block', width: 16, height: 16,
                  border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Submitting your complaint…
              </>
            ) : (
              <>
                <span>🚨</span>
                Submit Complaint
                {allDone && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.22)', fontWeight: 800,
                  }}>Ready ✓</span>
                )}
              </>
            )}
          </button>
        </div>

        {!compact && (
          <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.6 }}>
            By submitting, you confirm this report is accurate. False complaints may result in account restrictions.
          </p>
        )}
      </div>
    </>
  )
}