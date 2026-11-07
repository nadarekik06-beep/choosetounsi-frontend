'use client'

/**
 * One return / exchange of the buyer: reference, order, status, returned items,
 * and (expanded) its tracking, description and proof photos. Shared by
 * /complaints (account) and the guest order page (/order/track/{token}).
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { complaintApi, type BuyerComplaintClient } from '@/lib/complaintApi'
import type { BuyerComplaint } from '@/types/complaint'
import { statusConfig } from '@/types/complaint'
import ReturnTracking, { ReturnStatusBadge } from '@/app/components/returns/ReturnTracking'
import PurchasedItemRow from '@/app/components/PurchasedItemRow'
import { useFormat } from '@/lib/i18n/useFormat'

export default function ComplaintCard({ complaint: initial, focused = false, api = complaintApi }: {
  complaint: BuyerComplaint
  focused?: boolean
  /** Whose returns: the signed-in account (default) or a guest's order (guestComplaintApi) */
  api?: BuyerComplaintClient
}) {
  const t   = useTranslations('complaints')
  const tr  = useTranslations('returns')
  const fmt = useFormat()
  const [complaint, setComplaint] = useState(initial)
  const [expanded, setExpanded] = useState(focused)
  const cfg = statusConfig(complaint.status)
  const exchange = complaint.resolution_type === 'exchange' && !(complaint.is_legacy_exchange ?? !complaint.fee_size)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focused])

  return (
    <div ref={cardRef} style={{ background: '#fff', borderRadius: 16, border: focused ? `1px solid ${cfg.color}` : '1px solid #f1f5f9',
      overflow: 'hidden', marginBottom: 14, transition: 'box-shadow 0.2s ease', scrollMarginTop: 90 }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: cfg.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <p style={label}>{complaint.reference ? tr(exchange ? 'exchange.reference' : 'reference', { ref: complaint.reference }) : t('complaintN', { id: complaint.id })}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                  {t(`types.${complaint.complaint_type}`)}
                  {complaint.complaint_type === 'other' && complaint.other_reason ? ` — ${complaint.other_reason}` : ''}
                </p>
              </div>
              <div>
                <p style={label}>{t('order')}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }} dir="ltr">
                  #{complaint.order?.order_number ?? complaint.order_id}
                </p>
              </div>
              <ReturnStatusBadge status={complaint.status} resolution={complaint.resolution_type} />
            </div>
            <button onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc',
                border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer', fontFamily: 'inherit' }}>
              {expanded ? `▲ ${t('hide')}` : `▼ ${tr('track')}`}
            </button>
          </div>

          {/* Returned items — as bought, with the quantity sent back */}
          {!!complaint.complained_items?.length && (
            <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ ...label, margin: 0 }}>{exchange ? tr('exchange.items') : t('items')}</p>
              {complaint.complained_items.map(item => (
                <PurchasedItemRow key={item.id} item={item}
                  qtyLabel={exchange && item.replacement_label
                    ? tr('exchange.qtyFor', { count: item.return_quantity ?? item.quantity, label: item.replacement_label })
                    : tr('returnQty', { count: item.return_quantity ?? item.quantity, total: item.quantity })} />
              ))}
            </div>
          )}

          {/* Status description bar */}
          <div style={{ padding: '8px 20px 10px', background: cfg.bg, borderTop: `1px solid ${cfg.color}20` }}>
            <p style={{ fontSize: 12, color: cfg.color, fontWeight: 600, margin: 0 }}>
              {exchange && tr.has(`hintExchange.${complaint.status}`)
                ? tr(`hintExchange.${complaint.status}`, { amount: fmt.price(Number(complaint.client_fee ?? 0)) })
                : complaint.cash_refund && tr.has(`hintCash.${complaint.status}`)
                ? tr(`hintCash.${complaint.status}`, { amount: fmt.price(Number(complaint.refund_amount ?? 0)) })
                : tr.has(`hint.${complaint.status}`) ? tr(`hint.${complaint.status}`) : ''}
            </p>
          </div>

          {/* Tracking + details */}
          {expanded && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ReturnTracking complaint={complaint} onChanged={setComplaint} api={api} />

              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                <strong>{t('description')}</strong> {complaint.description}
              </p>

              {(complaint.image_urls?.length ?? 0) > 0 && (
                <div>
                  <p style={{ ...label, margin: '0 0 8px' }}>{t('proofPhoto')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {complaint.image_urls.map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={t('proofPhoto')} style={{ width: 110, height: 90, objectFit: 'cover',
                          borderRadius: 10, border: '1.5px solid #e5e7eb', cursor: 'zoom-in' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                {t('filedOn', { date: fmt.date(complaint.created_at, 'long') })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const label: React.CSSProperties = {
  fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px',
}
