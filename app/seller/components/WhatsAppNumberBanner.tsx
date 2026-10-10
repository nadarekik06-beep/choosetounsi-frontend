'use client'

/**
 * Banner shown while the seller has no WhatsApp number: CHOOSE'Tounsi asks
 * sellers on WhatsApp to prepare confirmed orders (/seller/settings#whatsapp).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { storeProfileApi } from '@/lib/sellerApi'
import { ink } from '@/app/seller/ink'

export default function WhatsAppNumberBanner({ dark }: { dark: boolean }) {
  const t = useTranslations('seller.settings.whatsapp')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const check = () => storeProfileApi.getWhatsApp()
      .then(json => setMissing(!json.data.whatsapp_number))
      .catch(() => {}) // non-blocking: the settings page shows the real state
    check()
    window.addEventListener('seller-whatsapp:changed', check)
    return () => window.removeEventListener('seller-whatsapp:changed', check)
  }, [])

  if (!missing) return null

  return (
    <Link href="/seller/settings#whatsapp" role="alert" style={{
      display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
      background: 'rgba(25,143,65,0.08)', border: '1px solid rgba(25,143,65,0.4)',
      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
    }}>
      <MessageCircle size={16} color="#198f41" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: ink('#4ade80', dark) }}>{t('bannerMissing')}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 800, color: '#db142e', whiteSpace: 'nowrap' }}>
        {t('bannerAction')} <ChevronRight size={14} />
      </span>
    </Link>
  )
}
