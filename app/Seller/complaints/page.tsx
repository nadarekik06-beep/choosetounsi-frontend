'use client'

/**
 * FILE: app/seller/complaints/page.tsx  ← REPLACE existing file
 *
 * Full complaint management for sellers with approve/reject workflow.
 * Seller can: view, add note, approve (direct), reject (needs admin validation).
 */

import { useState, useEffect, useCallback } from 'react'
import { sellerComplaintApi } from '@/lib/complaintApi'
import type { Complaint } from '@/types/complaint'
import { STATUS_CONFIG, COMPLAINT_TYPE_LABELS } from '@/types/complaint'
import { useTheme } from '../layout'

const RED    = '#db142e'
const GREEN  = '#198f41'
const ORANGE = '#f97316'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Complaint['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {status === 'pending'                      && '⏳'}
      {status === 'reviewing'                    && '🔍'}
      {status === 'approved'                     && '✅'}
      {status === 'seller_rejected_pending_admin' && '⚠️'}
      {status === 'rejected'                     && '❌'}
      {' '}{cfg.label}
    </span>
  )
}

// ─── Decision Modal (approve or reject) ──────────────────────────────────────

function DecisionModal({
  complaint, mode, isOpen, onClose, onDone,
}: {
  complaint: Complaint
  mode: 'approve' | 'reject'
  isOpen: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [sellerNote,      setSellerNote]      = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  useEffect(() => { if (isOpen) { setSellerNote(''); setRejectionReason(''); setError('') } }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (mode === 'approve') {
      if (sellerNote.trim().length > 0 && sellerNote.trim().length < 10) {
        setError('Note must be at least 10 characters (or leave empty).')
        return
      }
    } else {
      if (sellerNote.trim().length < 10) {
        setError('Please explain your response (at least 10 characters).')
        return
      }
      if (rejectionReason.trim().length < 10) {
        setError('Please provide a rejection reason (at least 10 characters).')
        return
      }
    }

    setSaving(true)
    try {
      if (mode === 'approve') {
        await sellerComplaintApi.approve(complaint.id, sellerNote || undefined)
      } else {
        await sellerComplaintApi.reject(complaint.id, sellerNote, rejectionReason)
      }
      onDone()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Action failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isApprove = mode === 'approve'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 10000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 500,
        background: '#fff', borderRadius: 20, padding: 28,
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)', zIndex: 10001,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isApprove ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {isApprove ? '✅' : '⚠️'}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {isApprove ? 'Approve Complaint' : 'Reject Complaint'}
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
              {isApprove
                ? 'Client will be notified immediately.'
                : 'Admin will validate your rejection before it becomes final.'}
            </p>
          </div>
        </div>

        {/* Complaint summary */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0 }}>
            {COMPLAINT_TYPE_LABELS[complaint.complaint_type]}
            {complaint.complaint_type === 'other' && complaint.other_reason ? ` — ${complaint.other_reason}` : ''}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Order #{complaint.order?.order_number ?? complaint.order_id}</p>
        </div>

        {/* Seller note */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
            Your Response / Note {isApprove ? '(optional)' : <span style={{ color: RED }}>*</span>}
          </label>
          <textarea
            value={sellerNote}
            onChange={e => { setSellerNote(e.target.value); setError('') }}
            rows={3}
            placeholder={isApprove
              ? 'Optional: add a message for the client about this approval…'
              : 'Explain your position and what you found when reviewing this complaint…'}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
              border: '1.5px solid #e5e7eb', fontFamily: 'inherit', lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Rejection reason (only for reject mode) */}
        {!isApprove && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              Rejection Reason <span style={{ color: RED }}>*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => { setRejectionReason(e.target.value); setError('') }}
              rows={3}
              placeholder="Clearly state why this complaint cannot be accepted (this will be sent to the client if admin confirms)…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid #e5e7eb', fontFamily: 'inherit', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: RED, fontWeight: 600, margin: '0 0 12px' }}>⚠ {error}</p>
        )}

        {/* Warning for reject */}
        {!isApprove && (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1.5px solid rgba(249,115,22,0.25)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: ORANGE, fontWeight: 700, margin: 0 }}>
              ⚠️ Your rejection will be sent to the admin for final validation. The client will only be notified once admin confirms.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '10px 22px', border: '1.5px solid #e5e7eb', borderRadius: 10,
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              background: saving ? '#94a3b8' : isApprove ? GREEN : ORANGE,
              color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? 'Submitting…' : isApprove ? '✅ Confirm Approval' : '⚠️ Submit Rejection'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Complaint detail drawer ──────────────────────────────────────────────────

function ComplaintDrawer({
  complaint, dark, onClose, onRefresh,
}: {
  complaint: Complaint | null
  dark: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | null>(null)
  const [toast,        setToast]        = useState('')

  if (!complaint) return null

  const cfg        = STATUS_CONFIG[complaint.status]
  const canAct     = ['pending', 'reviewing'].includes(complaint.status)
  const textMain   = dark ? '#fff' : '#0f172a'
  const textMuted  = dark ? 'rgba(255,255,255,0.45)' : '#64748b'
  const border     = dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9'
  const cardBg     = dark ? '#1e2330' : '#f8fafc'

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 540,
        background: dark ? '#161b27' : '#fff',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.2)',
        zIndex: 9001, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: dark ? '#161b27' : '#fff', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: textMain, margin: 0 }}>
              Complaint #{complaint.id}
            </h2>
            <div style={{ marginTop: 6 }}><StatusBadge status={complaint.status} /></div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${border}`,
              background: cardBg, cursor: 'pointer', fontSize: 16, color: textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Client info */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
              letterSpacing: '0.07em', margin: '0 0 8px' }}>Client</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: '0 0 2px' }}>
              {complaint.user?.name ?? '—'}
            </p>
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{complaint.user?.email ?? '—'}</p>
          </div>

          {/* Order info */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
              letterSpacing: '0.07em', margin: '0 0 8px' }}>Order</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: '0 0 4px', fontFamily: 'monospace' }}>
              #{complaint.order?.order_number ?? complaint.order_id}
            </p>
            {complaint.order?.items && complaint.order.items.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {complaint.order.items.map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: textMuted, margin: '2px 0' }}>
                    {item.product_name} × {item.quantity}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Complaint details */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
              letterSpacing: '0.07em', margin: '0 0 8px' }}>Complaint Details</p>
            <div style={{ background: `${cfg.bg}`, border: `1.5px solid ${cfg.color}30`,
              borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: cfg.color, margin: '0 0 8px' }}>
                {COMPLAINT_TYPE_LABELS[complaint.complaint_type]}
                {complaint.complaint_type === 'other' && complaint.other_reason ? ` — ${complaint.other_reason}` : ''}
              </p>
              <p style={{ fontSize: 13, color: textMain, margin: 0, lineHeight: 1.7 }}>
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Proof image */}
          {complaint.image_url && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
                letterSpacing: '0.07em', margin: '0 0 8px' }}>Proof Photo</p>
              <a href={complaint.image_url} target="_blank" rel="noreferrer">
                <img src={complaint.image_url} alt="Proof"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'contain',
                    borderRadius: 12, border: `1.5px solid ${border}`, background: cardBg, cursor: 'zoom-in' }} />
              </a>
            </div>
          )}

          {/* Seller note (if already left one) */}
          {complaint.seller_note && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
                letterSpacing: '0.07em', margin: '0 0 8px' }}>Your Response</p>
              <div style={{ background: 'rgba(30,64,175,0.06)', border: '1.5px solid rgba(30,64,175,0.2)',
                borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: 13, color: textMain, margin: 0, lineHeight: 1.7 }}>
                  {complaint.seller_note}
                </p>
              </div>
            </div>
          )}

          {/* Seller rejected — waiting for admin */}
          {complaint.status === 'seller_rejected_pending_admin' && (
            <div style={{ background: 'rgba(249,115,22,0.08)', border: '1.5px solid rgba(249,115,22,0.3)',
              borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: ORANGE, margin: '0 0 6px',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ⚠️ Awaiting Admin Validation
              </p>
              <p style={{ fontSize: 13, color: textMain, margin: 0, lineHeight: 1.6 }}>
                Your rejection has been sent to the admin. They will make the final decision.
              </p>
              {complaint.rejection_reason && (
                <p style={{ fontSize: 12, color: textMuted, margin: '8px 0 0', lineHeight: 1.6 }}>
                  <strong>Your reason:</strong> {complaint.rejection_reason}
                </p>
              )}
            </div>
          )}

          {/* Already resolved */}
          {['approved','rejected'].includes(complaint.status) ? (
            <div style={{
              background: complaint.status === 'approved' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1.5px solid ${complaint.status === 'approved' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 12, fontWeight: 800, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em',
                color: complaint.status === 'approved' ? '#10b981' : '#ef4444' }}>
                {complaint.status === 'approved' ? '✅ Approved' : '❌ Rejected (Final)'}
              </p>
              {complaint.rejection_reason && (
                <p style={{ fontSize: 13, color: textMain, margin: 0 }}>{complaint.rejection_reason}</p>
              )}
            </div>
          ) : null}

          <p style={{ fontSize: 11, color: textMuted, fontWeight: 600, margin: 0 }}>
            Filed: {new Date(complaint.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Action footer */}
        {canAct && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${border}`,
            position: 'sticky', bottom: 0, background: dark ? '#161b27' : '#fff',
            display: 'flex', gap: 10 }}>
            <button
              onClick={() => setDecisionMode('reject')}
              style={{ flex: 1, padding: 12, background: 'rgba(249,115,22,0.1)',
                color: ORANGE, border: `1.5px solid rgba(249,115,22,0.3)`,
                borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit' }}>
              ⚠️ Reject
            </button>
            <button
              onClick={() => setDecisionMode('approve')}
              style={{ flex: 1, padding: 12, background: GREEN, color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit' }}>
              ✅ Approve
            </button>
          </div>
        )}
      </div>

      {/* Decision modal */}
      {decisionMode && (
        <DecisionModal
          complaint={complaint}
          mode={decisionMode}
          isOpen={!!decisionMode}
          onClose={() => setDecisionMode(null)}
          onDone={() => { showToast(decisionMode === 'approve' ? '✅ Complaint approved!' : '⚠️ Rejection submitted to admin.'); onRefresh(); onClose() }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#fff', padding: '10px 22px', borderRadius: 999,
          fontSize: 13, fontWeight: 700, zIndex: 99999, boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SellerComplaintsPage() {
  const { dark } = useTheme()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats,      setStats]      = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<Complaint | null>(null)
  const [filter,     setFilter]     = useState('')

  const textMain  = dark ? '#fff' : '#0f172a'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#64748b'
  const cardBg    = dark ? '#161b27' : '#fff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        sellerComplaintApi.getAll(filter ? { status: filter } : {}),
        sellerComplaintApi.stats(),
      ])
      const raw = listRes.data?.data ?? listRes.data ?? []
      setComplaints(Array.isArray(raw) ? raw : [])
      setStats(statsRes.data)
    } catch {
      setComplaints([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSelect = async (c: Complaint) => {
    try {
      const res = await sellerComplaintApi.getOne(c.id)
      setSelected(res.data)
    } catch { setSelected(c) }
  }

  const statCards = stats ? [
    { label: 'Total',          value: stats.total,           color: textMuted, icon: '📋' },
    { label: 'Needs Action',   value: stats.needs_action,    color: '#f59e0b',  icon: '⏳' },
    { label: 'Approved',       value: stats.approved,        color: '#10b981',  icon: '✅' },
    { label: 'Awaiting Admin', value: stats.seller_rejected, color: ORANGE,     icon: '⚠️' },
    { label: 'Rejected',       value: stats.rejected,        color: '#ef4444',  icon: '❌' },
  ] : []

  const FILTERS = [
    { val: '',                             label: 'All' },
    { val: 'pending',                      label: 'Pending' },
    { val: 'reviewing',                    label: 'Reviewing' },
    { val: 'approved',                     label: 'Approved' },
    { val: 'seller_rejected_pending_admin',label: 'Awaiting Admin' },
    { val: 'rejected',                     label: 'Rejected' },
  ]

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: '4px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(220,38,38,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            🚨
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: 0 }}>Complaints</h1>
            <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
              Customer complaints about your products
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
            gap: 12, marginBottom: 24 }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: cardBg, borderRadius: 14,
                border: `1.5px solid ${border}`, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: '0 0 4px', lineHeight: 1 }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, fontWeight: 700, color: textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const active = filter === f.val
            const cfg = f.val ? STATUS_CONFIG[f.val as Complaint['status']] : null
            return (
              <button key={f.val} onClick={() => setFilter(f.val)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${active ? (cfg?.color ?? RED) : border}`,
                  background: active ? `${cfg?.bg ?? 'rgba(220,38,38,0.08)'}` : cardBg,
                  color: active ? (cfg?.color ?? RED) : textMuted,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${border}`,
              borderTopColor: RED, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: textMuted, fontSize: 13 }}>Loading complaints…</p>
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: '0 0 6px' }}>
              No complaints{filter ? ` with this status` : ''}
            </p>
            <p style={{ fontSize: 13 }}>Keep up the great work!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {complaints.map(c => {
              const cfg    = STATUS_CONFIG[c.status]
              const canAct = ['pending', 'reviewing'].includes(c.status)
              return (
                <div key={c.id}
                  onClick={() => handleSelect(c)}
                  style={{ background: cardBg, borderRadius: 14, border: `1.5px solid ${border}`,
                    overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

                  {/* Left accent */}
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 4, background: canAct ? '#f59e0b' : cfg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontSize: 11, color: textMuted, fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                              #{c.id}
                            </p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: textMain, margin: 0 }}>
                              {COMPLAINT_TYPE_LABELS[c.complaint_type]}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: textMuted, margin: '0 0 2px' }}>Customer</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: textMain, margin: 0 }}>
                              {c.user?.name ?? '—'}
                            </p>
                          </div>
                          <StatusBadge status={c.status} />
                          {canAct && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b',
                              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                              padding: '3px 10px', borderRadius: 999 }}>
                              Action Required
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>
                          {new Date(c.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <ComplaintDrawer
        complaint={selected}
        dark={dark}
        onClose={() => setSelected(null)}
        onRefresh={fetchAll}
      />
    </>
  )
}