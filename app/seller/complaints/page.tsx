'use client'

/**
 * FILE: app/seller/complaints/page.tsx
 *
 * FIXES applied (light mode support):
 *   1. All hardcoded dark colors now use dark-aware variables derived from `dark` prop
 *   2. StatCard, SkeletonRow, ComplaintDrawer, DecisionModal all respect light/dark
 *   3. No original logic changed — only color values made theme-aware
 */

import React, { useState, useEffect, useCallback } from 'react'
import { sellerComplaintApi } from '@/lib/complaintApi'
import type { Complaint } from '@/types/complaint'
import { STATUS_CONFIG, COMPLAINT_TYPE_LABELS } from '@/types/complaint'
import { useTheme } from '../layout'

// ─── Icon props ───────────────────────────────────────────────────────────────

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

// ─── Inline SVG icons (Lucide-style) ─────────────────────────────────────────

function IconAlertTriangle({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheckCircle({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconXCircle({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function IconClock({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconSearch({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconChevronRight({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconX({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconMessageSquare({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconPackage({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconUser({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconImageIcon({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconShieldAlert({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconListFilter({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  )
}

function IconRefreshCw({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function IconInbox({ size = 16, color = 'currentColor', strokeWidth = 2, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

// ─── Color tokens ─────────────────────────────────────────────────────────────

const C = {
  red:       '#db142e',
  redDim:    'rgba(219,20,46,0.12)',
  green:     '#198f41',
  greenDim:  'rgba(25,143,65,0.12)',
  orange:    '#f97316',
  orangeDim: 'rgba(249,115,22,0.12)',
  amber:     '#f59e0b',
  amberDim:  'rgba(245,158,11,0.12)',
  blue:      '#3b82f6',
  blueDim:   'rgba(59,130,246,0.12)',
}

const REFUND_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Awaiting Pickup', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  assigned:  { label: 'Agent Assigned',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  picked_up: { label: 'Item Collected',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  completed: { label: 'Refund Complete', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
}
// ─── Status meta ──────────────────────────────────────────────────────────────

interface StatusMeta {
  icon: React.ReactNode
  label: string
  bg: string
  color: string
  border: string
}

const STATUS_META: Record<string, StatusMeta> = {
  pending:                       { icon: <IconClock size={11} />,        label: 'Pending',        color: C.amber,  bg: C.amberDim,  border: 'rgba(245,158,11,0.3)'  },
  reviewing:                     { icon: <IconSearch size={11} />,       label: 'Reviewing',      color: C.blue,   bg: C.blueDim,   border: 'rgba(59,130,246,0.3)'  },
  approved:                      { icon: <IconCheckCircle size={11} />,  label: 'Approved',       color: C.green,  bg: C.greenDim,  border: 'rgba(25,143,65,0.3)'   },
  seller_rejected_pending_admin: { icon: <IconShieldAlert size={11} />,  label: 'Awaiting Admin', color: C.orange, bg: C.orangeDim, border: 'rgba(249,115,22,0.3)'  },
  rejected:                      { icon: <IconXCircle size={11} />,      label: 'Rejected',       color: C.red,    bg: C.redDim,    border: 'rgba(219,20,46,0.3)'   },
}

// ─── Theme-aware color helpers ────────────────────────────────────────────────
// FIX: all components now use these helpers instead of hardcoded dark values

function useColors(dark: boolean) {
  return {
    pageBg:      dark ? '#0D1117'                     : '#f0f2f5',
    cardBg:      dark ? '#111827'                     : '#ffffff',
    cardBgSub:   dark ? 'rgba(255,255,255,0.03)'      : '#f8fafc',
    border:      dark ? 'rgba(255,255,255,0.07)'      : 'rgba(0,0,0,0.08)',
    borderHover: dark ? 'rgba(255,255,255,0.12)'      : 'rgba(0,0,0,0.15)',
    textMain:    dark ? '#ffffff'                     : '#0f172a',
    textSub:     dark ? 'rgba(255,255,255,0.75)'      : '#374151',
    textMuted:   dark ? 'rgba(255,255,255,0.38)'      : '#6b7280',
    textFaint:   dark ? 'rgba(255,255,255,0.28)'      : '#9ca3af',
    iconMuted:   dark ? 'rgba(255,255,255,0.35)'      : '#9ca3af',
    drawerBg:    dark ? '#0d1117'                     : '#ffffff',
    drawerBgSub: dark ? 'rgba(255,255,255,0.03)'      : '#f8fafc',
    drawerBorder:dark ? 'rgba(255,255,255,0.07)'      : 'rgba(0,0,0,0.08)',
    inputBg:     dark ? 'rgba(255,255,255,0.04)'      : '#f9fafb',
    inputBorder: dark ? 'rgba(255,255,255,0.1)'       : 'rgba(0,0,0,0.15)',
    inputText:   dark ? '#ffffff'                     : '#111827',
    skeletonBg:  dark
      ? 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)'
      : 'linear-gradient(90deg,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0.04) 75%)',
    toastBg:     dark ? '#1a2235'                     : '#1e293b',
    monoColor:   dark ? 'rgba(255,255,255,0.3)'       : '#6b7280',
    labelColor:  dark ? 'rgba(255,255,255,0.55)'      : '#4b5563',
  }
}

// ─── Global CSS ───────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes slideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes shimmer { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }
  @keyframes pop     { 0%{transform:scale(0.92);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes toastIn { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }

  .complaint-row {
    transition: box-shadow 0.2s ease, transform 0.18s ease, border-color 0.18s ease;
  }
  .complaint-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
  }
  .filter-btn { transition: all 0.15s ease; }
  .filter-btn:hover { transform: translateY(-1px); }
  .action-btn { transition: all 0.17s ease; }
  .action-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
  .action-btn:active { transform: translateY(0); }
  .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important; }

  .skeleton-anim {
    background-size: 400px 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
  textarea:focus, input:focus {
    outline: none !important;
    border-color: #db142e !important;
    box-shadow: 0 0 0 3px rgba(219,20,46,0.15) !important;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 99px; }
`

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Complaint['status'] }) {
  const m = STATUS_META[status] ?? STATUS_META['pending']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>
      {m.icon}
      {m.label.toUpperCase()}
    </span>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow({ dark }: { dark: boolean }) {
  const T = useColors(dark)
  return (
    <div style={{
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <div className="skeleton-anim" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: T.skeletonBg }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-anim" style={{ height: 13, width: '40%', background: T.skeletonBg }} />
        <div className="skeleton-anim" style={{ height: 11, width: '25%', background: T.skeletonBg }} />
      </div>
      <div className="skeleton-anim" style={{ height: 24, width: 80, borderRadius: 6, background: T.skeletonBg }} />
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  delay: number
  dark: boolean
}

function StatCard({ icon, label, value, color, delay, dark }: StatCardProps) {
  const T = useColors(dark)
  return (
    <div className="stat-card" style={{
      background: T.cardBg,
      border: `1px solid ${T.border}`,
      borderRadius: 14, padding: '18px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
      animation: `fadeUp 0.4s ease ${delay}ms both`,
      cursor: 'default',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}25`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          fontSize: 26, fontWeight: 800, color: T.textMain, margin: '0 0 4px', lineHeight: 1,
        }}>
          {value}
        </p>
        <p style={{
          fontSize: 11, fontWeight: 600, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
        }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ─── Decision modal ───────────────────────────────────────────────────────────

interface DecisionModalProps {
  complaint: Complaint
  mode: 'approve' | 'reject'
  isOpen: boolean
  onClose: () => void
  onDone: () => void
  dark: boolean
}

function DecisionModal({ complaint, mode, isOpen, onClose, onDone, dark }: DecisionModalProps) {
  const [sellerNote,      setSellerNote]      = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')
  const T = useColors(dark)

  useEffect(() => {
    if (isOpen) { setSellerNote(''); setRejectionReason(''); setError('') }
  }, [isOpen])

  if (!isOpen) return null

  const isApprove = mode === 'approve'
  const accent    = isApprove ? C.green : C.orange
  const accentDim = isApprove ? C.greenDim : C.orangeDim

  const handleSubmit = async () => {
    if (isApprove) {
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
      if (isApprove) {
        await sellerComplaintApi.approve(complaint.id, sellerNote || undefined)
      } else {
        await sellerComplaintApi.reject(complaint.id, sellerNote, rejectionReason)
      }
      onDone()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Action failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
    border: `1.5px solid ${T.inputBorder}`,
    background: T.inputBg,
    color: T.inputText,
    lineHeight: 1.6,
    resize: 'vertical', transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 10000 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '92%', maxWidth: 480,
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 20, padding: '28px 28px 24px',
        boxShadow: dark ? '0 40px 100px rgba(0,0,0,0.5)' : '0 24px 60px rgba(0,0,0,0.15)',
        zIndex: 10001,
        animation: 'pop 0.22s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: accentDim,
            border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            {isApprove
              ? <IconCheckCircle size={22} color={accent} strokeWidth={2.2} />
              : <IconShieldAlert  size={22} color={accent} strokeWidth={2.2} />}
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: T.textMain, margin: '0 0 5px' }}>
              {isApprove ? 'Approve Complaint' : 'Reject Complaint'}
            </h3>
            <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5, margin: 0 }}>
              {isApprove
                ? 'The customer will be notified immediately after approval.'
                : 'Admin will review and validate your rejection before it is final.'}
            </p>
          </div>
        </div>

        {/* Complaint summary chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: T.cardBgSub,
          border: `1px solid ${T.border}`,
          borderRadius: 10, marginBottom: 20,
        }}>
          <IconPackage size={14} color={T.iconMuted} />
          <span style={{ fontSize: 12.5, color: T.textSub, fontWeight: 600 }}>
            {COMPLAINT_TYPE_LABELS[complaint.complaint_type]}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.textMuted, fontFamily: 'monospace' }}>
            #{complaint.order?.order_number ?? complaint.order_id}
          </span>
        </div>

        {/* Seller note */}
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 700, color: T.labelColor,
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
        }}>
          Your Response{' '}
          {isApprove
            ? <span style={{ fontWeight: 400, textTransform: 'none', color: T.textMuted }}>(optional)</span>
            : <span style={{ color: C.red }}>*</span>}
        </label>
        <textarea
          value={sellerNote}
          onChange={e => { setSellerNote(e.target.value); setError('') }}
          rows={3}
          placeholder={isApprove ? 'Optional message for the customer…' : 'Explain why you are rejecting this complaint…'}
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        {/* Rejection reason (reject only) */}
        {!isApprove && (
          <>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 700, color: T.labelColor,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
            }}>
              Rejection Reason <span style={{ color: C.red }}>*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => { setRejectionReason(e.target.value); setError('') }}
              rows={3}
              placeholder="Clearly state the reason (visible to customer if admin approves)…"
              style={{ ...inputStyle, marginBottom: 16 }}
            />
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 10, marginBottom: 16,
          }}>
            <IconAlertTriangle size={14} color={C.red} />
            <p style={{ fontSize: 12.5, color: C.red, fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Admin warning (reject only) */}
        {!isApprove && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px',
            background: C.orangeDim, border: `1px solid ${C.orange}35`, borderRadius: 10, marginBottom: 20,
          }}>
            <IconShieldAlert size={15} color={C.orange} strokeWidth={2.2} />
            <p style={{ fontSize: 12, color: C.orange, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
              Your rejection goes to admin for final approval. Customer is notified only after admin confirms.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            className="action-btn"
            style={{
              padding: '11px 22px',
              border: `1.5px solid ${T.border}`,
              borderRadius: 10,
              background: 'transparent',
              color: T.textSub,
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="action-btn"
            style={{
              padding: '11px 24px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : accent,
              color: '#fff', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                Submitting…
              </>
            ) : isApprove ? (
              <><IconCheckCircle size={15} /> Confirm Approval</>
            ) : (
              <><IconShieldAlert size={15} /> Submit for Review</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Drawer section helper ────────────────────────────────────────────────────

interface DrawerSectionProps {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  dark: boolean
}

function DrawerSection({ icon, label, children, dark }: DrawerSectionProps) {
  const T = useColors(dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: T.iconMuted, display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Complaint detail drawer ──────────────────────────────────────────────────

interface ComplaintDrawerProps {
  complaint: Complaint | null
  dark: boolean
  onClose: () => void
  onRefresh: () => void
}

function ComplaintDrawer({ complaint, dark, onClose, onRefresh }: ComplaintDrawerProps) {
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | null>(null)
  const [toast,        setToast]        = useState('')
  const T = useColors(dark)

  useEffect(() => { if (!complaint) setDecisionMode(null) }, [complaint])

  if (!complaint) return null

  const canAct = ['pending', 'reviewing'].includes(complaint.status)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 9000 }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520,
        background: T.drawerBg,
        borderLeft: `1px solid ${T.drawerBorder}`,
        boxShadow: dark ? '-24px 0 80px rgba(0,0,0,0.4)' : '-8px 0 40px rgba(0,0,0,0.12)',
        zIndex: 9001, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Sticky header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${T.drawerBorder}`,
          position: 'sticky', top: 0,
          background: T.drawerBg,
          zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: T.textMuted, fontWeight: 600 }}>
                COMPLAINT #{complaint.id}
              </span>
              <StatusBadge status={complaint.status} />
              {/* ↓ NEW — refund delivery progress badge */}
{complaint.refund_status && (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
    background: REFUND_STATUS_CONFIG[complaint.refund_status]?.bg ?? 'rgba(168,85,247,0.1)',
    color: REFUND_STATUS_CONFIG[complaint.refund_status]?.color ?? '#a855f7',
    border: `1px solid ${REFUND_STATUS_CONFIG[complaint.refund_status]?.color ?? '#a855f7'}30`,
  }}>
    ↩️ Refund: {REFUND_STATUS_CONFIG[complaint.refund_status]?.label ?? complaint.refund_status}
  </span>
)}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.textMain, margin: 0 }}>
              {COMPLAINT_TYPE_LABELS[complaint.complaint_type]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${T.drawerBorder}`,
              background: T.drawerBgSub,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: T.iconMuted,
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Client + Order */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              background: T.drawerBgSub,
              border: `1px solid ${T.drawerBorder}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <DrawerSection icon={<IconUser size={13} />} label="Customer" dark={dark}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.textMain, margin: '2px 0 1px' }}>
                  {complaint.user?.name ?? '—'}
                </p>
                <p style={{ fontSize: 11.5, color: T.textMuted, margin: 0 }}>
                  {complaint.user?.email ?? '—'}
                </p>
              </DrawerSection>
            </div>
            <div style={{
              background: T.drawerBgSub,
              border: `1px solid ${T.drawerBorder}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <DrawerSection icon={<IconPackage size={13} />} label="Order" dark={dark}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.textMain, margin: '2px 0 1px', fontFamily: 'monospace' }}>
                  #{complaint.order?.order_number ?? complaint.order_id}
                </p>
                {complaint.order?.items?.slice(0, 1).map((item, i) => (
                  <p key={i} style={{ fontSize: 11.5, color: T.textMuted, margin: 0 }}>
                    {item.product_name} × {item.quantity}
                  </p>
                ))}
              </DrawerSection>
            </div>
          </div>

          {/* Description */}
          <DrawerSection icon={<IconMessageSquare size={13} />} label="Description" dark={dark}>
            <div style={{
              background: T.drawerBgSub,
              border: `1px solid ${T.drawerBorder}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 13.5, color: T.textSub, margin: 0, lineHeight: 1.75 }}>
                {complaint.description}
              </p>
            </div>
          </DrawerSection>

          {/* Proof image */}
          {complaint.image_url && (
            <DrawerSection icon={<IconImageIcon size={13} />} label="Proof Photo" dark={dark}>
              <a
                href={complaint.image_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block', borderRadius: 12, overflow: 'hidden',
                  border: `1px solid ${T.drawerBorder}`,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                <img
                  src={complaint.image_url}
                  alt="Proof"
                  style={{
                    width: '100%', maxHeight: 220, objectFit: 'contain',
                    background: T.drawerBgSub,
                    display: 'block',
                  }}
                />
              </a>
            </DrawerSection>
          )}

          {/* Seller existing note */}
          {complaint.seller_note && (
            <DrawerSection icon={<IconMessageSquare size={13} />} label="Your Response" dark={dark}>
              <div style={{
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.7 }}>
                  {complaint.seller_note}
                </p>
              </div>
            </DrawerSection>
          )}

          {/* Awaiting admin */}
          {complaint.status === 'seller_rejected_pending_admin' && (
            <div style={{
              display: 'flex', gap: 12, padding: '14px 16px',
              background: C.orangeDim, border: `1px solid ${C.orange}35`, borderRadius: 12,
            }}>
              <IconShieldAlert size={18} color={C.orange} strokeWidth={2} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: C.orange, margin: '0 0 5px' }}>
                  Awaiting Admin Validation
                </p>
                <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
                  Your rejection is pending admin review. The customer will be notified once a final decision is made.
                </p>
                {complaint.rejection_reason && (
                  <p style={{ fontSize: 12, color: T.textFaint, margin: '8px 0 0', lineHeight: 1.6 }}>
                    <strong style={{ color: T.textMuted }}>Your reason:</strong> {complaint.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Final resolved */}
          {['approved', 'rejected'].includes(complaint.status) && (
            <div style={{
              display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12,
              background: complaint.status === 'approved' ? C.greenDim : C.redDim,
              border: `1px solid ${complaint.status === 'approved' ? C.green : C.red}35`,
            }}>
              {complaint.status === 'approved'
                ? <IconCheckCircle size={18} color={C.green} strokeWidth={2} />
                : <IconXCircle    size={18} color={C.red}   strokeWidth={2} />}
              <div>
                <p style={{
                  fontSize: 12.5, fontWeight: 700, margin: '0 0 4px',
                  color: complaint.status === 'approved' ? C.green : C.red,
                }}>
                  {complaint.status === 'approved' ? 'Complaint Approved' : 'Complaint Rejected'}
                </p>
                {complaint.rejection_reason && (
                  <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0 }}>
                    {complaint.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11.5, color: T.textFaint, fontWeight: 500, marginTop: 4 }}>
            Filed on{' '}
            {new Date(complaint.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Footer actions */}
        {canAct && (
          <div style={{
            padding: '14px 24px',
            borderTop: `1px solid ${T.drawerBorder}`,
            position: 'sticky', bottom: 0,
            background: T.drawerBg,
            display: 'flex', gap: 10,
          }}>
            <button
              onClick={() => setDecisionMode('reject')}
              className="action-btn"
              style={{
                flex: 1, padding: '12px 0', background: C.orangeDim,
                color: C.orange, border: `1px solid ${C.orange}40`,
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IconXCircle size={16} /> Reject
            </button>
            <button
              onClick={() => setDecisionMode('approve')}
              className="action-btn"
              style={{
                flex: 1, padding: '12px 0', background: C.green,
                color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IconCheckCircle size={16} /> Approve
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
          onDone={() => {
            showToast(decisionMode === 'approve' ? '✓ Complaint approved' : '⚠ Rejection submitted for review')
            onRefresh()
            onClose()
          }}
          dark={dark}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%',
          background: T.toastBg,
          color: '#fff', padding: '11px 22px',
          borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 99999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'toastIn 0.22s ease forwards',
        }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface StatsData {
  total: number
  needs_action: number
  approved: number
  seller_rejected: number
  rejected: number
}

export default function SellerComplaintsPage() {
  const { dark } = useTheme()
  const T = useColors(dark)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats,      setStats]      = useState<StatsData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<Complaint | null>(null)
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

  const handleSelect = async (c: Complaint) => {
    try {
      const res = await sellerComplaintApi.getOne(c.id)
      setSelected(res.data)
    } catch {
      setSelected(c)
    }
  }

  const statCards = stats ? [
    { icon: <IconInbox size={18} />,       label: 'Total',          value: stats.total,           color: dark ? 'rgba(255,255,255,0.7)' : '#475569', delay: 0   },
    { icon: <IconClock size={18} />,       label: 'Needs Action',   value: stats.needs_action,    color: C.amber,                                     delay: 60  },
    { icon: <IconCheckCircle size={18} />, label: 'Approved',       value: stats.approved,        color: C.green,                                     delay: 120 },
    { icon: <IconShieldAlert size={18} />, label: 'Awaiting Admin', value: stats.seller_rejected, color: C.orange,                                    delay: 180 },
    { icon: <IconXCircle size={18} />,     label: 'Rejected',       value: stats.rejected,        color: C.red,                                       delay: 240 },
  ] : []

  interface FilterTab { val: string; label: string; icon: React.ReactNode }
  const FILTERS: FilterTab[] = [
    { val: '',                              label: 'All',            icon: <IconListFilter size={13} /> },
    { val: 'pending',                       label: 'Pending',        icon: <IconClock size={13} />      },
    { val: 'reviewing',                     label: 'Reviewing',      icon: <IconSearch size={13} />     },
    { val: 'approved',                      label: 'Approved',       icon: <IconCheckCircle size={13} />},
    { val: 'seller_rejected_pending_admin', label: 'Awaiting Admin', icon: <IconShieldAlert size={13} />},
    { val: 'rejected',                      label: 'Rejected',       icon: <IconXCircle size={13} />    },
  ]

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{ padding: '6px 0', maxWidth: 1100 }}>

        {/* ── Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, background: C.redDim,
              border: `1px solid ${C.red}30`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconAlertTriangle size={22} color={C.red} strokeWidth={2.2} />
            </div>
            <div>
              <h1 style={{
                fontSize: 25, fontWeight: 900, color: T.textMain, margin: 0, letterSpacing: '-0.3px',
              }}>
                Complaints
              </h1>
              <p style={{ fontSize: 12.5, color: T.textMuted, margin: '3px 0 0', fontWeight: 500 }}>
                Customer complaints about your products
              </p>
            </div>
          </div>

          <button
            onClick={fetchAll}
            className="action-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
              background: T.cardBgSub,
              border: `1px solid ${T.border}`,
              borderRadius: 10, color: T.textMuted, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <IconRefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Stat cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 28 }}>
            {statCards.map(s => <StatCard key={s.label} {...s} dark={dark} />)}
          </div>
        )}

        {/* ── Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, marginRight: 4 }}>
            FILTER
          </span>
          {FILTERS.map(f => {
            const active = filter === f.val
            const meta   = f.val ? STATUS_META[f.val] : null
            const color  = active ? (meta?.color  ?? C.red)        : T.textMuted
            const bg     = active ? (meta?.bg     ?? C.redDim)     : 'transparent'
            const brd    = active ? (meta?.border ?? `${C.red}40`) : T.border
            return (
              <button
                key={f.val}
                onClick={() => setFilter(f.val)}
                className="filter-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${brd}`, background: bg, color,
                  cursor: 'pointer',
                }}
              >
                {f.icon} {f.label}
              </button>
            )
          })}
        </div>

        {/* ── List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <SkeletonRow key={i} dark={dark} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0', animation: 'fadeUp 0.4s ease' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, background: C.greenDim,
              border: `1px solid ${C.green}30`, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconCheckCircle size={28} color={C.green} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.textMain, margin: '0 0 6px' }}>
              No complaints{filter ? ' with this status' : ''}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
              Keep up the excellent work!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {complaints.map((c, idx) => {
              const meta   = STATUS_META[c.status] ?? STATUS_META['pending']
              const canAct = ['pending', 'reviewing'].includes(c.status)
              return (
                <div
                  key={c.id}
                  className="complaint-row"
                  onClick={() => handleSelect(c)}
                  style={{
                    background: T.cardBg,
                    border: `1px solid ${canAct
                      ? 'rgba(245,158,11,0.25)'
                      : T.border
                    }`,
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    display: 'flex', alignItems: 'stretch',
                    animation: `fadeUp 0.35s ease ${idx * 55}ms both`,
                  }}
                >
                  {/* Status stripe */}
                  <div style={{ width: 3, background: meta.color, flexShrink: 0 }} />

                  {/* Content */}
                  <div style={{
                    flex: 1, padding: '15px 20px',
                    display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
                  }}>
                    {/* ID + type */}
                    <div style={{ minWidth: 160 }}>
                      <p style={{ fontSize: 10, fontFamily: 'monospace', color: T.textFaint, margin: '0 0 4px', fontWeight: 600 }}>
                        #{c.id}
                      </p>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: T.textMain, margin: 0 }}>
                        {COMPLAINT_TYPE_LABELS[c.complaint_type]}
                      </p>
                    </div>

                    {/* Customer */}
                    <div style={{ minWidth: 130, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: T.cardBgSub,
                        border: `1px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: T.iconMuted, flexShrink: 0,
                      }}>
                        <IconUser size={14} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: T.textMuted, margin: '0 0 1px', fontWeight: 600 }}>Customer</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.textSub, margin: 0 }}>
                          {c.user?.name ?? '—'}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={c.status} />
                      {canAct && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 10, fontWeight: 700, color: C.amber,
                          background: C.amberDim, border: `1px solid ${C.amber}30`,
                          padding: '4px 10px', borderRadius: 6, letterSpacing: '0.05em',
                        }}>
                          <IconAlertTriangle size={10} /> ACTION REQUIRED
                        </span>
                      )}
                    </div>

                    {/* Date + arrow */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11.5, color: T.textFaint, fontWeight: 500 }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <IconChevronRight size={16} color={T.iconMuted} />
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