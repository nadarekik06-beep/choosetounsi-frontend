'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { complaintApi } from '@/lib/complaintApi'
import type { Complaint, TimelineStep } from '@/types/complaint'
import { statusConfig } from '@/types/complaint'
import { useFormat } from '@/lib/i18n/useFormat'

const RED   = '#db142e'
const GREEN = '#10b981'

/** Status pill — label from returns.status, colors from STATUS_CONFIG. */
export function ReturnStatusBadge({ status }: { status: string }) {
  const t = useTranslations('returns.status')
  const cfg = statusConfig(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 10px',
      borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {t.has(status) ? t(status) : status}
    </span>
  )
}

/**
 * "Return / Refund tracking": the canonical steps with their dates, the refund
 * (amount, method, reference once refunded) and the client's actions —
 * escalate a shop refusal, or withdraw a request not answered yet.
 */
export default function ReturnTracking({ complaint, onChanged }: { complaint: Complaint; onChanged?: (c: Complaint) => void }) {
  const t   = useTranslations('returns')
  const fmt = useFormat()
  const [busy, setBusy]       = useState<null | 'escalate' | 'cancel'>(null)
  const [note, setNote]       = useState('')
  const [askNote, setAskNote] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const steps: TimelineStep[] = complaint.timeline ?? []
  const refund  = Number(complaint.refund_amount ?? 0)
  const items   = Number(complaint.items_amount ?? 0)
  const fee     = Number(complaint.return_shipping_fee ?? 0)
  const clientPaysShipping = complaint.shipping_payer === 'client' && fee > 0
  const isLegacyExchange   = complaint.resolution_type === 'exchange'

  const run = async (kind: 'escalate' | 'cancel') => {
    setBusy(kind); setError(null)
    try {
      const res = kind === 'escalate'
        ? await complaintApi.escalate(complaint.id, note.trim() || undefined)
        : await complaintApi.cancel(complaint.id)
      const fresh = await complaintApi.getOne(complaint.id).then(r => r.data).catch(() => res.data)
      onChanged?.(fresh)
      setAskNote(false)
    } catch (e) {
      setError((e as Error).message || t('actions.failed'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isLegacyExchange && (
        <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
          {t('legacyExchange')}
        </div>
      )}

      {/* Timeline */}
      {steps.length > 0 && (
        <div>
          <p style={sectionTitle}>{t('tracking')}</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((s, i) => {
              const color = s.done ? GREEN : s.current ? statusConfig(s.status).color : '#cbd5e1'
              const label = s.status === 'seller_decision' ? t('steps.seller_decision') : t(`status.${s.status}`)
              return (
                <li key={`${s.key}-${i}`} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
                  {i < steps.length - 1 && (
                    <span aria-hidden style={{ position: 'absolute', insetInlineStart: 9, top: 20, bottom: 0, width: 2, background: s.done ? GREEN : '#e5e7eb' }} />
                  )}
                  <span aria-hidden style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                    background: s.done ? GREEN : s.current ? '#fff' : '#f1f5f9',
                    border: `2px solid ${color}`, color: '#fff', fontSize: 11, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: s.current ? `0 0 0 4px ${color}22` : 'none',
                  }}>{s.done ? '✓' : ''}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: s.current ? 900 : 700, color: s.done || s.current ? '#0f172a' : '#94a3b8' }}>
                      {label}{s.skipped ? ` · ${t('steps.skipped')}` : ''}
                    </p>
                    {s.at && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{fmt.date(s.at, 'long')}</p>}
                    {s.current && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{t(`hint.${complaint.status}`)}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Shop / platform answers */}
      {complaint.rejection_reason && ['seller_rejected', 'escalated', 'rejected'].includes(complaint.status) && (
        <div style={box('#ef4444')}>
          <p style={boxTitle('#dc2626')}>{complaint.status === 'rejected' ? t('rejectionReason') : t('shopReason')}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{complaint.rejection_reason}</p>
        </div>
      )}
      {complaint.seller_note && (
        <div style={box('#3b82f6')}>
          <p style={boxTitle('#1e40af')}>{t('shopMessage')}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>{complaint.seller_note}</p>
        </div>
      )}

      {/* Refund */}
      {!isLegacyExchange && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', background: complaint.status === 'refunded' ? 'rgba(16,185,129,0.05)' : '#fafafa' }}>
          <p style={sectionTitle}>{t('refund.title')}</p>
          <Row label={t('refund.items')} value={fmt.price(items)} />
          {clientPaysShipping && <Row label={t('refund.shipping')} value={`−${fmt.price(fee)}`} />}
          <Row label={complaint.status === 'refunded' ? t('refund.refunded') : t('refund.expected')} value={fmt.price(refund)} strong />
          {complaint.refund_method && <Row label={t('refund.method')} value={t(`methods.${complaint.refund_method}`)} />}
          {complaint.refund_reference && <Row label={t('refund.reference')} value={complaint.refund_reference} mono />}
          {complaint.refunded_at && <Row label={t('refund.date')} value={fmt.date(complaint.refunded_at, 'long')} />}
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748b', lineHeight: 1.55 }}>
            {complaint.shipping_payer === 'seller' ? t('refund.shippingSeller') : t('refund.shippingClient', { fee: fmt.price(fee) })}
            {' '}{complaint.status !== 'refunded' && t('refund.afterInspection')}
          </p>
        </div>
      )}

      {/* Client actions */}
      {error && <p style={{ margin: 0, fontSize: 12, color: RED, fontWeight: 700 }}>⚠ {error}</p>}
      {complaint.can_escalate && (
        <div style={{ ...box('#8b5cf6'), background: 'rgba(139,92,246,0.05)' }}>
          <p style={boxTitle('#6d28d9')}>{t('actions.escalateTitle')}</p>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#5b21b6', lineHeight: 1.55 }}>{t('actions.escalateHint')}</p>
          {askNote && (
            <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 1000))} rows={3}
              placeholder={t('actions.escalatePlaceholder')} aria-label={t('actions.escalatePlaceholder')}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 9, border: '1.5px solid #ddd6fe', padding: '9px 11px', fontFamily: 'inherit', fontSize: 13, marginBottom: 8, resize: 'vertical' }} />
          )}
          <button type="button" disabled={!!busy} onClick={() => (askNote ? run('escalate') : setAskNote(true))}
            style={actionBtn('#7c3aed', !!busy)}>
            {busy === 'escalate' ? t('actions.sending') : askNote ? t('actions.escalateConfirm') : `⚖️ ${t('actions.escalate')}`}
          </button>
        </div>
      )}
      {complaint.status === 'requested' && (
        <button type="button" disabled={!!busy}
          onClick={() => { if (window.confirm(t('actions.cancelConfirm'))) run('cancel') }}
          style={{ ...actionBtn('#64748b', !!busy), background: '#fff', color: '#475569', border: '1.5px solid #e5e7eb', alignSelf: 'flex-start' }}>
          {busy === 'cancel' ? t('actions.sending') : t('actions.cancel')}
        </button>
      )}
    </div>
  )
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: strong ? 14 : 12.5, padding: '3px 0' }}>
      <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: strong ? 900 : 700, fontFamily: mono ? 'monospace' : undefined }} dir={mono ? 'ltr' : undefined}>{value}</span>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
}
const box = (c: string): React.CSSProperties => ({ background: `${c}0f`, border: `1.5px solid ${c}33`, borderRadius: 10, padding: '12px 14px' })
const boxTitle = (c: string): React.CSSProperties => ({ fontSize: 12, fontWeight: 800, color: c, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' })
const actionBtn = (c: string, disabled: boolean): React.CSSProperties => ({
  padding: '9px 16px', borderRadius: 10, border: 'none', background: c, color: '#fff', fontWeight: 800, fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
})
