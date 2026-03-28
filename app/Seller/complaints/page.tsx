'use client'

/**
 * app/seller/complaints/page.tsx
 *
 * Seller complaint management page — port 3000.
 * Sellers see ONLY complaints related to their products.
 * They can add a seller note (transitions status to "reviewing").
 */

import { useState, useEffect, useCallback } from 'react'
import { sellerComplaintApi } from '@/lib/complaintApi'
import type { Complaint } from '@/types/complaint'
import { STATUS_CONFIG, COMPLAINT_TYPE_LABELS } from '@/types/complaint'

const RED = '#db142e'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Complaint['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  )
}

// ── Seller note modal ─────────────────────────────────────────────────────────

function SellerNoteModal({
  complaintId, isOpen, onClose, onSaved,
}: {
  complaintId: number; isOpen: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { if (isOpen) { setNote(''); setError('') } }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (note.trim().length < 10) { setError('Please write at least 10 characters.'); return }
    setSaving(true)
    try {
      await sellerComplaintApi.addNote(complaintId, note.trim())
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 10000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: 18, padding: '28px 28px 24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', zIndex: 10001 }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
          Add Your Response
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
          Your response will be visible to the admin. Once submitted, the complaint
          moves to <strong>Under Review</strong> status.
        </p>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setError('') }}
          rows={4}
          placeholder="Explain your side of the situation, provide context, or mention any relevant details…"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
            border: `1.5px solid ${error ? RED : '#e5e7eb'}`, fontFamily: 'inherit',
            lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        {error && <p style={{ fontSize: 12, color: RED, fontWeight: 600, margin: '6px 0 0' }}>⚠ {error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '9px 20px', border: '1.5px solid #e5e7eb', borderRadius: 8,
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', background: saving ? '#94a3b8' : '#1e40af',
              color: '#fff', fontSize: 13, fontWeight: 800, border: 'none',
              borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit' }}>
            {saving ? 'Submitting…' : 'Submit Response'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Complaint row ─────────────────────────────────────────────────────────────

function ComplaintRow({
  complaint, onRefresh,
}: {
  complaint: Complaint; onRefresh: () => void;
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [noteModal,  setNoteModal]  = useState(false)

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9',
        marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                Complaint #{complaint.id}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {COMPLAINT_TYPE_LABELS[complaint.complaint_type]}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                Customer
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                {complaint.user?.name ?? '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                Order
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                #{complaint.order?.order_number ?? complaint.order_id}
              </p>
            </div>
            <StatusBadge status={complaint.status} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Seller can only respond when status is pending */}
            {complaint.status === 'pending' && (
              <button onClick={() => setNoteModal(true)}
                style={{ padding: '7px 14px', background: 'rgba(30,64,175,0.08)',
                  color: '#1e40af', border: '1.5px solid rgba(30,64,175,0.25)',
                  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit' }}>
                Respond
              </button>
            )}
            <button onClick={() => setExpanded(e => !e)}
              style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b',
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {expanded ? '▲ Hide' : '▼ View'}
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 12px', lineHeight: 1.6 }}>
              <strong>Description:</strong> {complaint.description}
            </p>

            {complaint.image_url && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Proof Photo
                </p>
                <a href={complaint.image_url} target="_blank" rel="noreferrer">
                  <img src={complaint.image_url} alt="Proof"
                    style={{ maxWidth: 180, maxHeight: 140, objectFit: 'cover',
                      borderRadius: 8, border: '1.5px solid #e5e7eb', cursor: 'zoom-in' }} />
                </a>
              </div>
            )}

            {complaint.seller_note && (
              <div style={{ background: 'rgba(30,64,175,0.06)', border: '1.5px solid rgba(30,64,175,0.2)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#1e40af',
                  margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Response
                </p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{complaint.seller_note}</p>
              </div>
            )}

            {complaint.status === 'rejected' && complaint.rejection_reason && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626',
                  margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Admin Decision — Rejected
                </p>
                <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>
                  {complaint.rejection_reason}
                </p>
              </div>
            )}

            <p style={{ fontSize: 11, color: '#94a3b8', margin: '12px 0 0', fontWeight: 600 }}>
              Filed: {new Date(complaint.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      <SellerNoteModal
        complaintId={complaint.id}
        isOpen={noteModal}
        onClose={() => setNoteModal(false)}
        onSaved={onRefresh}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SellerComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats,      setStats]      = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('')

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

  const statCards = stats ? [
    { label: 'Total', value: stats.total, color: '#64748b' },
    { label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { label: 'Reviewing', value: stats.reviewing, color: '#3b82f6' },
    { label: 'Approved', value: stats.approved, color: '#10b981' },
    { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ] : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: '28px 32px',
        minHeight: '100vh', background: '#f9fafb' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12,
            background: 'rgba(220,38,38,0.08)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            🚨
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Complaints
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 500 }}>
              Complaints about your products
            </p>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))',
            gap: 12, marginBottom: 24 }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14,
                border: '1.5px solid #f1f5f9', padding: '16px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: '0 0 4px' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', 'pending', 'reviewing', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: '1.5px solid',
                borderColor: filter === s ? RED : '#e5e7eb',
                background: filter === s ? `rgba(220,38,38,0.08)` : '#fff',
                color: filter === s ? RED : '#64748b',
                cursor: 'pointer', fontFamily: 'inherit',
                textTransform: 'capitalize' }}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 28, height: 28, border: `3px solid #f1f5f9`,
              borderTopColor: RED, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading complaints…</p>
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              No complaints{filter ? ` with status "${filter}"` : ''}
            </p>
            <p style={{ fontSize: 13 }}>Keep up the great work!</p>
          </div>
        ) : (
          complaints.map(c => (
            <ComplaintRow key={c.id} complaint={c} onRefresh={fetchAll} />
          ))
        )}
      </div>
    </>
  )
}