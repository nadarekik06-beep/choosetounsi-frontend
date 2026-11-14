'use client'

/**
 * After-sale request page form (/complaints/new): pick the order, then the
 * shared ComplaintRequestForm (return or exchange, items, reason, fee shown
 * before confirming, description, proof photos). The drawer opened from an
 * order (ComplaintModal) uses the same form.
 */

import { useState, useEffect } from 'react'
import { complaintApi } from '@/lib/complaintApi'
import type { AfterSaleFees, BuyerComplaint, ComplaintType, EligibleOrder, ReturnPolicyInfo } from '@/types/complaint'
import ComplaintRequestForm from '@/app/components/returns/ComplaintRequestForm'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import BrandLoader from '@/components/brand/BrandLoader'

const RED      = '#db142e'
const BORDER   = '#e2e8f0'
const TEXT     = '#0f172a'
const TEXT_SEC = '#475569'
const MUTED    = '#94a3b8'

interface ComplaintFormProps {
  prefilledOrderId?: number
  onSuccess?: (complaint: BuyerComplaint) => void
  onCancel?: () => void
  compact?: boolean
}

export default function ComplaintForm({ prefilledOrderId, onSuccess, onCancel, compact = false }: ComplaintFormProps) {
  const t = useTranslations('complaintForm')
  const { date } = useFormat()

  const [orders,      setOrders]      = useState<EligibleOrder[]>([])
  const [fees,        setFees]        = useState<AfterSaleFees | null>(null)
  const [sellerFault, setSellerFault] = useState<ComplaintType[] | undefined>(undefined)
  const [policy,      setPolicy]      = useState<ReturnPolicyInfo | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [noEligible,  setNoEligible]  = useState(false)
  const [orderId,     setOrderId]     = useState<number | ''>(prefilledOrderId ?? '')

  useEffect(() => {
    complaintApi.getEligibleOrders()
      .then(res => {
        setOrders(res.data)
        setFees(res.after_sale_fees ?? null)
        setSellerFault(res.seller_fault_types)
        setPolicy(res.policy ?? null)
        if (res.data.length === 0) setNoEligible(true)
      })
      .catch(() => setNoEligible(true))
      .finally(() => setLoading(false))
  }, [])

  const order = orders.find(o => o.id === orderId) ?? null

  if (!loading && noEligible) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px', fontSize: 32,
          background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>📦</div>
        <p style={{ fontSize: 16, fontWeight: 900, color: TEXT, margin: '0 0 10px' }}>{t('noEligibleTitle')}</p>
        <p style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 320, margin: '0 auto 24px', lineHeight: 1.7 }}>
          {t.rich('noEligibleBody', { b: c => <strong>{c}</strong> })}
        </p>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: '10px 24px', border: `1.5px solid ${BORDER}`, borderRadius: 10, background: '#fff',
            color: TEXT_SEC, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t('close')}</button>
        )}
      </div>
    )
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
    background: '#f8fafc', color: TEXT, border: `1.5px solid ${BORDER}`, fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Order */}
      <section style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', border: `1.5px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 12px' }}>{t('selectOrder')}</p>
        {loading ? (
          <div style={{ ...field, display: 'flex', alignItems: 'center', gap: 10, color: MUTED }}>
            <BrandLoader variant="inline" size={14} style={{ color: RED }} /> {t('loadingOrders')}
          </div>
        ) : prefilledOrderId ? (
          <div style={{ ...field, display: 'flex', alignItems: 'center', gap: 10, color: TEXT_SEC, background: '#f1f5f9' }}>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: '#e2e8f0', color: MUTED, fontWeight: 800 }}>{t('locked')}</span>
            {order
              ? t('orderWithDate', { number: order.order_number, date: date(order.delivered_at, 'medium') || order.delivered_at })
              : t('orderN', { number: prefilledOrderId })}
          </div>
        ) : (
          <select value={orderId} aria-label={t('yourOrder')} onChange={e => setOrderId(e.target.value ? Number(e.target.value) : '')}
            style={{ ...field, cursor: 'pointer' }}>
            <option value="">{t('chooseOrder')}</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                #{o.order_number} · {date(o.delivered_at, 'medium') || o.delivered_at} · {t('hoursLeft', { hours: o.hours_left })}
              </option>
            ))}
          </select>
        )}
        {order && (
          <p style={{ margin: '10px 0 0', fontSize: 11.5, fontWeight: 800, color: order.hours_left < 6 ? RED : '#d97706' }}>
            ⏱ {t('hoursRemaining', { hours: order.hours_left })}
          </p>
        )}
      </section>

      {order && (
        // key: a new order starts a fresh form
        <ComplaintRequestForm key={order.id} order={order} fees={fees} sellerFaultTypes={sellerFault} policy={policy}
          layout={compact ? 'drawer' : 'page'} onSubmitted={c => onSuccess?.(c)} onCancel={onCancel} />
      )}
    </div>
  )
}
