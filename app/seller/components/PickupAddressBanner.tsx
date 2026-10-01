'use client'

/**
 * Dashboard banner shown while the seller's pickup address is incomplete —
 * the courier can't collect their orders (and the admin can't print delivery
 * slips) until it is filled in on /seller/settings.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { storeProfileApi } from '@/lib/sellerApi'
import { ink } from '@/app/seller/ink'

export default function PickupAddressBanner({ dark }: { dark: boolean }) {
  const t = useTranslations('sellerPickup')
  const [incomplete, setIncomplete] = useState(false)

  useEffect(() => {
    storeProfileApi.getPickup()
      .then(json => setIncomplete(json.data ? !json.data.complete : false))
      .catch(() => {}) // non-blocking: the settings page shows the real state
  }, [])

  if (!incomplete) return null

  return (
    <Link href="/seller/settings#pickup" role="alert" style={{
      display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)',
      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
    }}>
      <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: ink('#b45309', dark) }}>{t('incomplete')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 800, color: '#db142e', whiteSpace: 'nowrap' }}>
        {t('title')} <ChevronRight size={14} />
      </span>
    </Link>
  )
}
