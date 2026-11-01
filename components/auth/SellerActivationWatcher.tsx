'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PartyPopper, X } from 'lucide-react'
import { refreshUser } from '@/lib/auth'
import { useAuthUser } from '@/hooks/useAuthUser'

/** While the seller application is pending: re-read the user this often (visible tab only). */
const PENDING_POLL_MS = 45_000

/**
 * The moment a buyer becomes a seller (admin approved the application, from
 * Applications or from Admin > Users), without a logout:
 *  - while the application is pending, /auth/user is re-read every 45 s
 *    (AuthSync and the bell cover tab focus, navigation and the notification);
 *  - the cached role switching client → seller shows a toast with a link to /seller.
 * Renders nothing else; mounted once in the root layout.
 */
export default function SellerActivationWatcher() {
  const t        = useTranslations('sellerActivated')
  const user     = useAuthUser()
  const pathname = usePathname()
  const seen     = useRef<{ id: number; role: string } | null>(null)
  const [show, setShow] = useState(false)

  // client → seller for the same account: the approval just reached this tab
  useEffect(() => {
    if (!user) { seen.current = null; return }
    const before = seen.current
    seen.current = { id: user.id, role: user.role }
    if (before && before.id === user.id && before.role === 'client' && user.role === 'seller') setShow(true)
  }, [user])

  const pending = user?.role === 'client' && user.seller_application_status === 'pending'

  useEffect(() => {
    if (!pending) return
    const id = setInterval(() => { if (!document.hidden) refreshUser() }, PENDING_POLL_MS)
    return () => clearInterval(id)
  }, [pending])

  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => setShow(false), 15_000)
    return () => clearTimeout(id)
  }, [show])

  if (!show) return null
  const onSeller = pathname?.startsWith('/seller')

  return (
    <div role="status" aria-live="polite" className="ct-seller-active"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
        width: 'min(440px, calc(100vw - 32px))', background: '#111', color: '#fff', borderRadius: 18,
        padding: '14px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.32)', display: 'flex', gap: 12, alignItems: 'flex-start',
        animation: 'ctSellerIn 0.3s ease',
      }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <PartyPopper size={18} color="#10b981" aria-hidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{t('title')}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>{t('body')}</p>
        {!onSeller && (
          <Link href="/seller" onClick={() => setShow(false)}
            style={{ display: 'inline-block', marginTop: 10, padding: '8px 14px', borderRadius: 999, background: '#198f41', color: '#fff', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
            {t('cta')}
          </Link>
        )}
      </div>
      <button type="button" onClick={() => setShow(false)} aria-label={t('close')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2, flexShrink: 0 }}>
        <X size={15} />
      </button>
      <style>{`@keyframes ctSellerIn { from { opacity:0; transform: translateX(-50%) translateY(10px) } to { opacity:1; transform: translateX(-50%) translateY(0) } }`}</style>
    </div>
  )
}
