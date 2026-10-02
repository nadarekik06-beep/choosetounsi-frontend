'use client'

import { forwardRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PaymentRequest } from '@/lib/paymentRequestsApi'
import { ManualPaymentConfirmation, PlanUpgradeRequest } from '@/app/components/seller/ManualPayment'
import type { PlanKey, SellerPlans } from '@/lib/platformApi'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { Eyebrow, PLAN_STYLES } from '../shared'

/**
 * The real upgrade flow (same as before the redesign): PlanUpgradeRequest creates a
 * payment request (paid via WhatsApp, activated by an admin), then the confirmation
 * shows its reference. Rendered only once a plan has been picked.
 */
const UpgradePanel = forwardRef<HTMLElement, {
  planKey: PlanKey | null; plans: SellerPlans | null; onClose: () => void
}>(function UpgradePanel({ planKey, plans, onClose }, ref) {
  const t = useTranslations('vendor.seller.upgrade')
  const [created, setCreated] = useState<PaymentRequest | null>(null)
  const plan = planKey ? plans?.[planKey] : null

  return (
    <section ref={ref} id="upgrade" className="vl-section vl-upgrade" aria-labelledby="vl-upgrade-title" hidden={!planKey}>
      {planKey && (
        <div className="vl-container vl-upgrade__inner">
          <div className="vl-upgrade__card" style={{ '--accent': PLAN_STYLES[planKey].accent } as React.CSSProperties}>
            <TunisianPattern color={PLAN_STYLES[planKey].accent} className="vl-pattern" />
            <div className="vl-upgrade__head">
              <Eyebrow>{t('eyebrow')}</Eyebrow>
              <h2 id="vl-upgrade-title" className="vl-title vl-title--red vl-upgrade__title">
                {t('title')} <em>{plan?.name ?? '…'}</em>
              </h2>
            </div>
            <div className="vl-upgrade__body">
              {created ? (
                <ManualPaymentConfirmation request={created} onClose={() => { setCreated(null); onClose() }} />
              ) : plan ? (
                <PlanUpgradeRequest
                  key={planKey}
                  plan={planKey}
                  planName={plan.name}
                  priceMonthly={plan.price}
                  priceYearly={plan.price_yearly ?? null}
                  onCreated={setCreated}
                  onCancel={onClose}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  )
})

export default UpgradePanel
