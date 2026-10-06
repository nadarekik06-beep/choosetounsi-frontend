'use client'

/**
 * Manual payment via WhatsApp (temporary, until Konnect / Flouci):
 *   PlanUpgradeRequest        — "request this plan" form (billing period + summary), replaces the old card form
 *   ManualPaymentConfirmation — "request CT-XXXXX saved, send the WhatsApp message" + reopen button
 *   PaymentRequestHistory     — the seller's requests and their status; pending ones can be cancelled
 *
 * Styling follows the host page through `palette` (seller dashboard light/dark, or the light storefront).
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle, MessageCircle, X } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import {
  createAndOpenWhatsApp, openWhatsApp, paymentRequestsApi,
  type PaymentRequest, type PaymentRequestStatus,
} from '@/lib/paymentRequestsApi'

import BrandLoader from '@/components/brand/BrandLoader'
export interface ManualPalette { text: string; muted: string; border: string; card: string; cardAlt: string }

export const LIGHT_PALETTE: ManualPalette = { text: '#111827', muted: '#6b7280', border: '#e5e7eb', card: '#ffffff', cardAlt: '#f8f9fb' }

const WA_GREEN = '#25D366'

const STATUS_COLORS: Record<PaymentRequestStatus, string> = {
  pending: '#d97706', approved: '#16a34a', rejected: '#dc2626', cancelled: '#6b7280',
}

function WhatsAppButton({ children, onClick, disabled, busy }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 18px', borderRadius: 12,
      border: 'none', background: WA_GREEN, color: '#073b1c', fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
      cursor: disabled || busy ? 'not-allowed' : 'pointer', opacity: disabled || busy ? 0.6 : 1, width: '100%',
    }}>
      {busy ? <BrandLoader variant="inline" size={16} /> : <MessageCircle size={16} />}
      {children}
    </button>
  )
}

/** Shown right after a request is created (WhatsApp is already opening). */
export function ManualPaymentConfirmation({ request, palette = LIGHT_PALETTE, onClose }: {
  request: PaymentRequest; palette?: ManualPalette; onClose?: () => void
}) {
  const t = useTranslations('manualPayment')
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 14, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: palette.text }}>{t('confirmTitle')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.55, color: palette.text }}>
            {t.rich('confirmBody', { reference: request.reference, b: chunks => <strong style={{ fontFamily: 'monospace' }}>{chunks}</strong> })}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t('close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: palette.muted, padding: 2 }}>
            <X size={16} />
          </button>
        )}
      </div>
      {request.whatsapp_url && (
        <WhatsAppButton onClick={() => openWhatsApp(request.whatsapp_url!)}>{t('reopen')}</WhatsAppButton>
      )}
      <p style={{ margin: 0, fontSize: 11.5, color: palette.muted }}>{t('confirmHint')}</p>
    </div>
  )
}

/** Plan upgrade request: pick the billing period, see the price, continue on WhatsApp. */
export function PlanUpgradeRequest({ plan, planName, priceMonthly, priceYearly, palette = LIGHT_PALETTE, onCreated, onCancel }: {
  plan: string; planName: string; priceMonthly: number; priceYearly?: number | null
  palette?: ManualPalette; onCreated: (r: PaymentRequest) => void; onCancel?: () => void
}) {
  const t = useTranslations('manualPayment')
  const fmt = useFormat()
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const price = period === 'yearly' && priceYearly != null ? priceYearly : priceMonthly

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      onCreated(await createAndOpenWhatsApp(() => paymentRequestsApi.planUpgrade(plan, period)))
    } catch (e: any) {
      setError(e?.message ?? t('error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 16, background: palette.card, border: `1px solid ${palette.border}` }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: palette.muted }}>{t('whatsappTitle')}</p>
        <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 900, color: palette.text }}>{planName} — {fmt.price(price)}</p>
      </div>

      {priceYearly != null && (
        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <legend style={{ fontSize: 12, fontWeight: 800, color: palette.text, marginBottom: 6 }}>{t('billing')}</legend>
          {(['monthly', 'yearly'] as const).map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: palette.text, background: palette.cardAlt, border: `1.5px solid ${period === p ? WA_GREEN : palette.border}` }}>
              <input type="radio" name="billing_period" checked={period === p} onChange={() => setPeriod(p)} />
              {t(`periodLabel.${p}`)} · {fmt.price(p === 'yearly' ? priceYearly : priceMonthly)}
            </label>
          ))}
        </fieldset>
      )}

      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: palette.muted }}>{t('howItWorks')}</p>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>{error}</p>}

      <WhatsAppButton onClick={submit} busy={busy}>{t('submitUpgrade')}</WhatsAppButton>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ background: 'none', border: `1px solid ${palette.border}`, borderRadius: 12, padding: '10px', color: palette.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('back')}
        </button>
      )}
    </div>
  )
}

/** The seller's requests: status, amount / plan, reopen WhatsApp or cancel while pending. */
export function PaymentRequestHistory({ requests, palette = LIGHT_PALETTE, onChanged }: {
  requests: PaymentRequest[]; palette?: ManualPalette; onChanged: () => void
}) {
  const t = useTranslations('manualPayment')
  const fmt = useFormat()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancel = async (r: PaymentRequest) => {
    if (!window.confirm(t('cancelConfirm', { reference: r.reference }))) return
    setBusyId(r.id); setError(null)
    try { await paymentRequestsApi.cancel(r.id); onChanged() } catch (e: any) { setError(e?.message ?? t('error')) } finally { setBusyId(null) }
  }

  if (!requests.length) return <p style={{ fontSize: 13, color: palette.muted, margin: 0 }}>{t('empty')}</p>

  return (
    <div>
      {error && <p role="alert" style={{ margin: '0 0 8px', fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>{error}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {requests.map(r => {
          const c = STATUS_COLORS[r.status]
          const what = r.type === 'wallet_topup'
            ? fmt.price(r.amount_received ?? r.amount)
            : `${r.requested_plan?.name ?? ''} · ${fmt.price(r.amount_received ?? r.amount)}${r.billing_period ? ` (${t(`period.${r.billing_period}`)})` : ''}`
          return (
            <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${palette.border}`, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: palette.text, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace' }} dir="ltr">{r.reference}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c, background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 999, padding: '2px 8px' }}>{t(`status.${r.status}`)}</span>
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: palette.muted }}>
                  {t(`type.${r.type}`)} · {what} · {fmt.date(r.created_at, 'medium')}
                </p>
                {r.status === 'rejected' && r.rejection_reason && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#dc2626' }}>{t('reason', { reason: r.rejection_reason })}</p>
                )}
              </div>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {r.whatsapp_url && (
                    <button type="button" onClick={() => openWhatsApp(r.whatsapp_url!)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, border: `1px solid ${WA_GREEN}80`, background: `${WA_GREEN}18`, color: palette.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <MessageCircle size={13} />{t('whatsapp')}
                    </button>
                  )}
                  <button type="button" onClick={() => cancel(r)} disabled={busyId === r.id} style={{ padding: '6px 10px', borderRadius: 9, border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busyId === r.id ? 0.5 : 1 }}>
                    {t('cancel')}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
