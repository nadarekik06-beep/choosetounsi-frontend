'use client'

/**
 * Sponsored entry popup — shown only when the ad server has an ad that is highly
 * relevant to this viewer (no relevant ad → no popup).
 *
 * Rules (numbers from GET /api/ads/config):
 *   - once per browser session, and the server allows one per viewer per 24 h
 *   - after a dismissal: nothing for `dismiss_hours`; after 3 dismissals for `dismiss_days_after_3` days
 *   - appears `delay_seconds` after the first page load, or on the second page view
 *   - never on checkout, cart, auth, seller or onboarding pages; never over another overlay
 *   - bottom sheet on phones, small centred card on larger screens; focus trap, Esc closes
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { fetchAdsConfig, fetchPopupAd, recordAdClick, type AdCard } from '@/lib/adsApi'
import { acquireOverlay, releaseOverlay, useOverlayOwner } from '@/lib/overlayStore'
import ProductPrice, { promoPricing } from '@/app/components/promotions/ProductPrice'
import { SponsoredLabel } from './SponsoredCard'
import { useAdImpression } from './useAdImpression'

const OVERLAY_ID   = 'ad_popup'
const SESSION_KEY  = 'ct_ad_popup_session'
const DISMISS_KEY  = 'ct_ad_popup_dismiss'   // { until: epoch ms, count: n }
const BLOCKED_PATHS = ['/checkout', '/cart', '/auth', '/login', '/register', '/seller', '/onboarding', '/complete-profile', '/forgot-password', '/reset-password']

function storage(kind: 'local' | 'session'): Storage | null {
  try { return typeof window === 'undefined' ? null : kind === 'local' ? localStorage : sessionStorage } catch { return null }
}

function isBlocked(path: string | null): boolean {
  return !path || BLOCKED_PATHS.some(p => path === p || path.startsWith(p + '/'))
}

function readDismiss(): { until: number; count: number } {
  try { return JSON.parse(storage('local')?.getItem(DISMISS_KEY) ?? '') ?? { until: 0, count: 0 } } catch { return { until: 0, count: 0 } }
}

export default function EntryPopup() {
  const t        = useTranslations('ads')
  const router   = useRouter()
  const pathname = usePathname()
  const owner    = useOverlayOwner()

  const [ad, setAd]     = useState<AdCard | null>(null)
  const [open, setOpen] = useState(false)
  const views           = useRef(0)
  const triggered       = useRef(false)
  const dialogRef       = useRef<HTMLDivElement>(null)
  const cardRef         = useRef<HTMLDivElement>(null)
  const lastFocus       = useRef<HTMLElement | null>(null)
  const dismissCfg      = useRef({ hours: 24, daysAfter3: 7 })

  useAdImpression(cardRef, open ? ad?.ad_token : null)

  const show = useCallback(async () => {
    if (triggered.current) return
    triggered.current = true

    const cfg = await fetchAdsConfig()
    if (!cfg?.popup.enabled) return
    dismissCfg.current = { hours: cfg.popup.dismiss_hours, daysAfter3: cfg.popup.dismiss_days_after_3 }
    if (storage('session')?.getItem(SESSION_KEY) || readDismiss().until > Date.now()) return
    if (isBlocked(window.location.pathname)) { triggered.current = false; return }

    const found = await fetchPopupAd()
    if (!found || isBlocked(window.location.pathname) || !acquireOverlay(OVERLAY_ID)) {
      if (!found) storage('session')?.setItem(SESSION_KEY, '1')   // nothing relevant: don't ask again this session
      return
    }
    storage('session')?.setItem(SESSION_KEY, '1')
    lastFocus.current = document.activeElement as HTMLElement | null
    setAd(found)
    setOpen(true)
  }, [])

  // Trigger: delay after the first page load, or the second page view.
  useEffect(() => {
    views.current += 1
    if (views.current === 1) {
      let timer: ReturnType<typeof setTimeout> | null = null
      fetchAdsConfig().then(cfg => {
        if (cfg?.popup.enabled) timer = setTimeout(show, Math.max(0, cfg.popup.delay_seconds) * 1000)
      })
      return () => { if (timer) clearTimeout(timer) }
    }
    if (views.current === 2) show()
  }, [pathname, show])

  const close = useCallback((dismissed: boolean) => {
    setOpen(false)
    releaseOverlay(OVERLAY_ID)
    if (dismissed) {
      const prev  = readDismiss()
      const count = prev.count + 1
      const ms    = count >= 3 ? dismissCfg.current.daysAfter3 * 86400_000 : dismissCfg.current.hours * 3600_000
      try { storage('local')?.setItem(DISMISS_KEY, JSON.stringify({ until: Date.now() + ms, count })) } catch { /* ignore */ }
    }
    lastFocus.current?.focus?.()
  }, [])

  // Another overlay (e.g. the review prompt) took over, or the viewer navigated to a blocked page.
  useEffect(() => {
    if (open && (owner !== OVERLAY_ID || isBlocked(pathname))) close(false)
  }, [owner, pathname, open, close])

  // Focus trap + Esc.
  useEffect(() => {
    if (!open) return
    const el = dialogRef.current
    el?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return }
      if (e.key !== 'Tab' || !el) return
      const nodes = Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open || !ad) return null

  const { hasDiscount, percent } = promoPricing(ad)
  const goToProduct = (e: React.MouseEvent) => {
    e.preventDefault()
    recordAdClick(ad.ad_token)
    close(false)
    router.push(`/products/${ad.slug}`)
  }

  return (
    <div className="ct-adpop-backdrop" onClick={() => close(true)}>
      <style>{`
        .ct-adpop-backdrop{position:fixed;inset:0;z-index:9990;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;animation:ctAdFade .2s ease both}
        .ct-adpop{position:relative;width:100%;background:#fff;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2);animation:ctAdUp .28s cubic-bezier(.2,.9,.3,1.1) both}
        @media(min-width:640px){.ct-adpop-backdrop{align-items:center}.ct-adpop{max-width:380px;border-radius:18px;padding:20px}}
        @keyframes ctAdFade{from{opacity:0}to{opacity:1}}
        @keyframes ctAdUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        @media(prefers-reduced-motion:reduce){.ct-adpop,.ct-adpop-backdrop{animation:none}}
      `}</style>
      <div
        ref={dialogRef}
        className="ct-adpop"
        role="dialog"
        aria-modal="true"
        aria-label={t('popup.label')}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => close(true)}
          aria-label={t('popup.close')}
          style={{ position: 'absolute', top: 10, insetInlineEnd: 10, width: 32, height: 32, borderRadius: 999, border: 'none', background: '#f1f5f9', color: '#334155', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <SponsoredLabel />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t('popup.title')}</span>
        </div>

        <div ref={cardRef} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0, position: 'relative' }}>
            {ad.primary_image_url && <img src={ad.primary_image_url} alt={ad.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            {hasDiscount && percent > 0 && (
              <span style={{ position: 'absolute', top: 5, insetInlineStart: 5, fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 999, color: '#fff', background: '#db142e' }}>-{percent}%</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {ad.name}
            </p>
            {ad.sponsor_data?.ai_ad_copy && (
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ad.sponsor_data.ai_ad_copy}
              </p>
            )}
            <ProductPrice product={ad} size="md" />
          </div>
        </div>

        <a
          href={`/products/${ad.slug}`}
          onClick={goToProduct}
          data-autofocus
          style={{ display: 'block', marginTop: 16, textAlign: 'center', padding: '12px 16px', borderRadius: 12, background: '#db142e', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}
        >
          {t('popup.view')}
        </a>
      </div>
    </div>
  )
}
