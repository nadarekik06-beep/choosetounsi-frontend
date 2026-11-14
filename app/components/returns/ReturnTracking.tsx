'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { complaintApi, type BuyerComplaintClient } from '@/lib/complaintApi'
import type { BuyerComplaint, TimelineStep } from '@/types/complaint'
import { statusConfig } from '@/types/complaint'
import { useFormat } from '@/lib/i18n/useFormat'

const RED   = '#db142e'
const GREEN = '#10b981'

/**
 * Status pill — label from returns.status (returns.statusExchange for the
 * shared steps of an exchange: "Exchange requested"…), colors from STATUS_CONFIG.
 */
export function ReturnStatusBadge({ status, resolution }: { status: string; resolution?: string | null }) {
  const t = useTranslations('returns')
  const cfg = statusConfig(status)
  const label = resolution === 'exchange' && t.has(`statusExchange.${status}`) ? t(`statusExchange.${status}`)
    : t.has(`status.${status}`) ? t(`status.${status}`) : status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '3px 10px',
      borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {label}
    </span>
  )
}

/**
 * "Return / Refund tracking" (or exchange tracking): the canonical steps with
 * their dates, the refund (amount, method, reference) or the exchange (the
 * replacement, the cash to hand the courier, the Intigo tracking), and the
 * client's actions — escalate a shop refusal, or withdraw a request not
 * answered yet.
 */
export default function ReturnTracking({ complaint, onChanged, api = complaintApi }: { complaint: BuyerComplaint; onChanged?: (c: BuyerComplaint) => void; api?: BuyerComplaintClient }) {
  const t   = useTranslations('returns')
  const fmt = useFormat()
  const [busy, setBusy]       = useState<null | 'escalate' | 'cancel' | 'switch'>(null)
  const [unused, setUnused]   = useState(false)
  const [note, setNote]       = useState('')
  const [askNote, setAskNote] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const steps: TimelineStep[] = complaint.timeline ?? []
  const refund  = Number(complaint.refund_amount ?? 0)
  const items   = Number(complaint.items_amount ?? 0)
  const fee     = Number(complaint.return_shipping_fee ?? 0)
  const clientPaysShipping = complaint.shipping_payer === 'client' && fee > 0
  const isLegacyExchange   = complaint.is_legacy_exchange ?? (complaint.resolution_type === 'exchange' && !complaint.fee_size)
  const isExchange         = complaint.resolution_type === 'exchange' && !isLegacyExchange
  const toPay              = Number(complaint.client_fee ?? 0)
  const cash               = !!complaint.cash_refund
  const hint = (s: string) => {
    if (isExchange && t.has(`hintExchange.${s}`)) return t(`hintExchange.${s}`, { amount: fmt.price(toPay) })
    return cash && t.has(`hintCash.${s}`) ? t(`hintCash.${s}`, { amount: fmt.price(refund) }) : t(`hint.${s}`)
  }
  const stepLabel = (s: string) => (isExchange && t.has(`statusExchange.${s}`) ? t(`statusExchange.${s}`) : t(`status.${s}`))
  const replacements = (complaint.complained_items ?? []).filter(i => i.replacement_label)

  const run = async (kind: 'escalate' | 'cancel' | 'switch') => {
    setBusy(kind); setError(null)
    try {
      const res = kind === 'escalate'
        ? await api.escalate(complaint.id, note.trim() || undefined)
        : kind === 'switch'
          ? await api.switchToRefund(complaint.id, complaint.complaint_type === 'changed_mind' ? unused : undefined)
          : await api.cancel(complaint.id)
      const fresh = await api.getOne(complaint.id).then(r => r.data).catch(() => res.data)
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
          <p style={sectionTitle}>{isExchange ? t('trackingExchange') : t('tracking')}</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((s, i) => {
              const color = s.done ? GREEN : s.current ? statusConfig(s.status).color : '#cbd5e1'
              const label = s.status === 'seller_decision' ? t('steps.seller_decision') : stepLabel(s.status)
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
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{hint(complaint.status)}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Exchange-first policy: the shop said the exchange is impossible, a refund is one click away */}
      {complaint.exchange_impossible?.can_switch_to_refund && (
        <div style={{ ...box('#4f46e5'), background: 'rgba(79,70,229,0.06)' }}>
          <p style={boxTitle('#3730a3')}>{t('exchangeImpossible.title')}</p>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#3730a3', lineHeight: 1.55 }}>
            {t('exchangeImpossible.body')}
            {complaint.exchange_impossible.reason ? ` « ${complaint.exchange_impossible.reason} »` : ''}
          </p>
          {complaint.complaint_type === 'changed_mind' && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, fontWeight: 600, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={unused} onChange={e => setUnused(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{t('exchangeImpossible.unused')}</span>
            </label>
          )}
          <button type="button" disabled={!!busy || (complaint.complaint_type === 'changed_mind' && !unused)}
            onClick={() => run('switch')} style={actionBtn('#4f46e5', !!busy || (complaint.complaint_type === 'changed_mind' && !unused))}>
            {busy === 'switch' ? t('actions.sending') : `↩️ ${t('exchangeImpossible.switch')}`}
          </button>
        </div>
      )}

      {/* Non-conforming item sent back (only when ChooseTounsi decided so): the photos and the reason */}
      {complaint.sent_back && (
        <div style={box('#f59e0b')}>
          <p style={boxTitle('#b45309')}>{t('sentBack.title')}</p>
          <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#92400e', lineHeight: 1.55 }}>{t('sentBack.body', { cod: fmt.price(complaint.sent_back.cod), refunded: fmt.price(complaint.sent_back.refunded), fee: fmt.price(complaint.sent_back.fee) })}</p>
          {complaint.sent_back.reason && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>{t('sentBack.reason')} : {complaint.sent_back.reason}</p>}
          {complaint.sent_back.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {complaint.sent_back.photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={t('sentBack.photo', { n: i + 1 })} style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #fde68a' }} /></a>
              ))}
            </div>
          )}
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

      {/* Exchange: the replacement, what to pay the courier, tracking */}
      {isExchange && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', background: complaint.status === 'exchange_completed' ? 'rgba(16,185,129,0.05)' : '#fafafa' }}>
          <p style={sectionTitle}>{t('exchange.title')}</p>
          {replacements.map(i => (
            <Row key={i.id} label={`${i.product_name}${i.variant_label ? ` · ${i.variant_label}` : ''}`} value={`→ ${i.replacement_label}`} />
          ))}
          <Row label={t('exchange.toPay')} value={fmt.price(toPay)} strong />
          {complaint.exchange_tracking && <Row label={t('exchange.tracking')} value={complaint.exchange_tracking} mono />}
          {complaint.exchange_carrier_status && <Row label={t('exchange.carrierStatus')} value={complaint.exchange_carrier_status} />}
          {complaint.exchanged_at && <Row label={t('exchange.exchangedAt')} value={fmt.date(complaint.exchanged_at, 'long')} />}
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748b', lineHeight: 1.55 }}>
            {complaint.shipping_payer === 'seller' ? t('exchange.paidByShop') : t('exchange.paidByYou', { fee: fmt.price(toPay) })}
            {' '}{t('exchange.oldItem')}
          </p>
        </div>
      )}

      {/* Refund */}
      {!isLegacyExchange && !isExchange && (
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
            {' '}{cash
              ? (complaint.refund_method === 'cash' ? t('refund.cashPaid') : t('refund.cashNote', { amount: fmt.price(refund) }))
              : complaint.status !== 'refunded' && t('refund.afterInspection')}
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
