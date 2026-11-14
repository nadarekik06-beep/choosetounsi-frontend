'use client'

/**
 * Returns & exchanges of a guest order, on its tracking page: the SAME form
 * (return or exchange, items, reason, fee before confirming, photo proof) and
 * the SAME return cards / tracking as signed-in buyers — only the API differs
 * (guestComplaintApi: the order's device token instead of a login).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, MessageCircle, CheckCircle, Clock } from 'lucide-react'
import BrandLoader from '@/components/brand/BrandLoader'
import { guestComplaintApi } from '@/lib/complaintApi'
import type { AfterSaleFees, BuyerComplaint, ComplaintType, EligibleOrder, ReturnPolicyInfo } from '@/types/complaint'
import ComplaintRequestForm from '@/app/components/returns/ComplaintRequestForm'
import ComplaintCard from '@/app/components/returns/ComplaintCard'

interface Props {
  token: string
  orderNumber: string
  /** something was delivered (server) */
  canRequest: boolean
  returnsCount: number
  whatsapp: string | null
}

export default function GuestReturns({ token, orderNumber, canRequest, returnsCount, whatsapp }: Props) {
  const t  = useTranslations('orderTrack')
  const api = useMemo(() => guestComplaintApi(token), [token])

  const [loading, setLoading]       = useState(true)
  const [complaints, setComplaints] = useState<BuyerComplaint[]>([])
  const [eligible, setEligible]     = useState<EligibleOrder | null>(null)
  const [fees, setFees]             = useState<AfterSaleFees | null>(null)
  const [sellerFault, setSellerFault] = useState<ComplaintType[] | undefined>(undefined)
  const [policy,      setPolicy]      = useState<ReturnPolicyInfo | null>(null)
  const [formOpen, setFormOpen]     = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  // State is only written after the requests (first render already shows the loader)
  const load = useCallback(async () => {
    try {
      const [list, elig] = await Promise.all([
        returnsCount > 0 || submitted ? api.getAll({ per_page: 20 }) : Promise.resolve(null),
        canRequest ? api.getEligibleOrders() : Promise.resolve(null),
      ])
      const rows = list?.data?.data ?? list?.data ?? []
      setComplaints(Array.isArray(rows) ? rows : [])
      if (elig) {
        setFees(elig.after_sale_fees ?? null)
        setSellerFault(elig.seller_fault_types)
        setPolicy(elig.policy ?? null)
        setEligible(elig.data?.[0] ?? null)
      }
    } catch { /* the section stays empty; WhatsApp help remains */ }
    setLoading(false)
  }, [api, canRequest, returnsCount, submitted])

  useEffect(() => { load() }, [load])

  if (!canRequest && returnsCount === 0) return null

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16 }
  const waText = encodeURIComponent(t('returnMessage', { number: orderNumber }))

  return (
    <section aria-labelledby="guest-returns" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 id="guest-returns" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '6px 0 0' }}>
        <RotateCcw size={17} color="#dc2626" /> {t('view.returnsTitle')}
      </h2>

      {submitted && (
        <p role="status" style={{ ...card, display: 'flex', gap: 8, alignItems: 'flex-start', margin: 0, fontSize: 13, color: '#047857', fontWeight: 700, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {t('view.submitted')}
        </p>
      )}

      {loading && complaints.length === 0 && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
          <BrandLoader variant="inline" size={16} /> {t('view.loadingReturns')}
        </div>
      )}

      {complaints.length > 0 && (
        <div>{complaints.map(c => <ComplaintCard key={c.id} complaint={c} api={api} />)}</div>
      )}

      {!loading && canRequest && !formOpen && (eligible ? (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.55 }}>{t('view.requestReturnBody')}</p>
          {eligible.days_left > 0 && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#b45309', fontWeight: 700, margin: 0 }}>
              <Clock size={13} /> {t('view.windowLeft', { days: eligible.days_left })}
            </p>
          )}
          <button type="button" onClick={() => { setFormOpen(true); setSubmitted(false) }}
            style={{ padding: '13px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('view.requestReturn')}
          </button>
        </div>
      ) : (
        <p style={{ ...card, margin: 0, fontSize: 13, color: '#64748b' }}>{t('view.notReturnable')}</p>
      ))}

      {formOpen && eligible && (
        <ComplaintRequestForm
          order={eligible}
          fees={fees}
          sellerFaultTypes={sellerFault}
          policy={policy}
          api={api}
          onSubmitted={() => { setFormOpen(false); setSubmitted(true) }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {whatsapp && (
        <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#128C7E', textDecoration: 'none', padding: 6 }}>
          <MessageCircle size={16} /> {t('view.help')}
        </a>
      )}
    </section>
  )
}
