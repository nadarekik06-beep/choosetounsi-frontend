'use client'

/**
 * app/components/seller/ShareStore.tsx
 *
 * Sharing a seller's storefront link.
 *   <ShareStoreButtons> — the storefront banner: "Partager" for everyone, plus a
 *                          more prominent "Copier le lien de ma boutique" for the owner.
 *   <StoreLinkPanel>    — link field, copy, Web Share, network links, QR code. Used in
 *                          the banner's popover and as a card in the seller dashboard.
 *
 * The link always comes from storeUrl() (NEXT_PUBLIC_SITE_URL), never from localhost.
 * The QR library is imported on demand, so pages pay nothing until the QR is shown.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy, Download, Facebook, Link2, MessageCircle, MessageCircleMore, QrCode, Share2, X as Close } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { copyText, shareIntents, slugify, storeUrl } from '@/lib/storeLink'

const RED = '#db142e'

interface StoreRef { id: number; name: string }

/** True once mounted in a browser that has the Web Share API (mobile, Safari, Edge…). */
const noSubscribe = () => () => {}
function useCanNativeShare() {
  return useSyncExternalStore(noSubscribe, () => typeof navigator.share === 'function', () => false)
}

/** Copy with the global toast and a short inline ✓ on the button. */
function useCopyLink(url: string) {
  const t = useTranslations('storeShare')
  const { notify } = useCart()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const copy = async () => {
    const ok = await copyText(url)
    notify(ok ? t('copied') : t('copyFailed'))
    if (!ok) return
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

/** Opens the system share sheet; false when unavailable or failed (not when the user cancels). */
async function nativeShare(data: ShareData): Promise<boolean> {
  try {
    await navigator.share(data)
    return true
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError'
  }
}

function XLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8.1-9.3L1.2 2h7l4.9 6.4L18.9 2Zm-1.2 18h1.9L7.3 3.9H5.3L17.7 20Z" />
    </svg>
  )
}

// ─── QR code ────────────────────────────────────────────────────────────────

function drawQr(url: string, cell: number, qrcode: typeof import('qrcode-generator')): HTMLCanvasElement {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  const n = qr.getModuleCount()
  const margin = 4
  const size = (n + margin * 2) * cell
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#111'
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell)
  return canvas
}

function StoreQr({ store, url, muted }: { store: StoreRef; url: string; muted: string }) {
  const t = useTranslations('storeShare')
  const [preview, setPreview] = useState<string | null>(null)
  const [printable, setPrintable] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    import('qrcode-generator').then(({ default: qrcode }) => {
      if (!alive) return
      setPreview(drawQr(url, 4, qrcode).toDataURL('image/png'))
      // ~1000px: sharp enough for flyers and packaging
      setPrintable(drawQr(url, 24, qrcode).toDataURL('image/png'))
    }).catch(() => {})
    return () => { alive = false }
  }, [url])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 96, height: 96, borderRadius: 10, background: '#fff', border: '1px solid #eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {preview
          ? <img src={preview} alt={t('qrAlt', { name: store.name })} width={96} height={96} style={{ display: 'block', imageRendering: 'pixelated' }} />
          : <QrCode size={26} color="#d1d5db" />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: muted, margin: '0 0 8px', lineHeight: 1.45 }}>{t('qrHint')}</p>
        <a
          href={printable ?? undefined}
          download={`qr-boutique-${slugify(store.name) || store.id}.png`}
          aria-disabled={!printable}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
            padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${RED}`, color: RED,
            textDecoration: 'none', opacity: printable ? 1 : 0.5, pointerEvents: printable ? 'auto' : 'none',
          }}
        >
          <Download size={13} /> {t('downloadQr')}
        </a>
      </div>
    </div>
  )
}

// ─── Panel: link + copy + share targets (+ QR for the owner) ────────────────

export function StoreLinkPanel({ store, showQr = false, dark = false }: { store: StoreRef; showQr?: boolean; dark?: boolean }) {
  const t = useTranslations('storeShare')
  const url = storeUrl(store.id, store.name)
  const text = t('shareText', { name: store.name })
  const { copied, copy } = useCopyLink(url)
  const canShare = useCanNativeShare()
  const intents = shareIntents(url, text)

  const fg    = dark ? '#fff' : '#111'
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const field = dark ? 'rgba(255,255,255,0.06)' : '#f8f8f8'
  const line  = dark ? 'rgba(255,255,255,0.1)' : '#eee'

  const targets = [
    { key: 'facebook',  label: 'Facebook',  href: intents.facebook,  color: '#1877F2', icon: <Facebook size={15} /> },
    { key: 'whatsapp',  label: 'WhatsApp',  href: intents.whatsapp,  color: '#25D366', icon: <MessageCircle size={15} /> },
    { key: 'messenger', label: 'Messenger', href: intents.messenger, color: '#0084FF', icon: <MessageCircleMore size={15} />, mobileOnly: intents.messengerNeedsApp },
    { key: 'x',         label: 'X',         href: intents.x,         color: '#111',    icon: <XLogo size={13} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: field, border: `1.5px solid ${line}`, borderRadius: 10, padding: '8px 11px' }}>
          <Link2 size={14} color={muted} style={{ flexShrink: 0 }} />
          <input
            readOnly value={url} dir="ltr" aria-label={t('linkLabel')}
            onFocus={e => e.currentTarget.select()}
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: fg, fontFamily: 'inherit' }}
          />
        </div>
        <button
          type="button" onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 12.5, fontWeight: 800,
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: copied ? '#198f41' : RED, color: '#fff', transition: 'background .15s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t('copiedShort') : t('copy')}
        </button>
      </div>

      {canShare && (
        <button
          type="button"
          onClick={() => nativeShare({ title: store.name, text, url })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800,
            padding: '10px 14px', borderRadius: 999, cursor: 'pointer',
            background: 'transparent', border: `1.5px solid ${line}`, color: fg,
          }}
        >
          <Share2 size={14} /> {t('shareVia')}
        </button>
      )}

      <div>
        <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: muted, margin: '0 0 8px' }}>{t('shareOn')}</p>
        <div className="ss-targets" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {targets.map(tg => (
            <a
              key={tg.key} href={tg.href} target="_blank" rel="noopener noreferrer"
              className={tg.mobileOnly ? 'ss-mobile-only' : undefined}
              aria-label={t('shareOnNetwork', { network: tg.label })}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '9px 4px',
                borderRadius: 10, border: `1px solid ${line}`, textDecoration: 'none',
                fontSize: 11, fontWeight: 700, color: fg,
              }}
            >
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: tg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {tg.icon}
              </span>
              {tg.label}
            </a>
          ))}
        </div>
      </div>

      {showQr && (
        <div style={{ borderTop: `1px solid ${line}`, paddingTop: 14 }}>
          <StoreQr store={store} url={url} muted={muted} />
        </div>
      )}

      {/* Messenger's app link only works where the app is installed: hide it on desktop */}
      <style>{`
        @media (hover:hover) and (pointer:fine) {
          .ss-mobile-only{display:none!important}
          .ss-targets:has(.ss-mobile-only){grid-template-columns:repeat(3,1fr)!important}
        }
      `}</style>
    </div>
  )
}

// ─── Storefront banner buttons ──────────────────────────────────────────────

export function ShareStoreButtons({ store, isOwner }: { store: StoreRef; isOwner: boolean }) {
  const t = useTranslations('storeShare')
  const [open, setOpen] = useState(false)
  const canShare = useCanNativeShare()
  const url = storeUrl(store.id, store.name)
  const { copied, copy } = useCopyLink(url)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  // Visitors on a phone get the system share sheet straight away; the owner (who also
  // wants the QR code) and browsers without Web Share get the panel.
  const onShare = async () => {
    if (canShare && !isOwner && await nativeShare({ title: store.name, text: t('shareText', { name: store.name }), url })) return
    setOpen(o => !o)
  }

  const pill: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
    fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 999, cursor: 'pointer',
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {isOwner && (
        <button type="button" onClick={copy} style={{ ...pill, border: 'none', background: copied ? '#198f41' : '#111', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? t('copied') : t('copyMyLink')}
        </button>
      )}
      <button
        type="button" onClick={onShare} aria-haspopup="dialog" aria-expanded={open}
        style={{ ...pill, border: '1.5px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
      >
        <Share2 size={14} /> {isOwner ? t('shareStore') : t('share')}
      </button>

      {open && (
        <div
          role="dialog" aria-label={t('panelTitle')}
          className="ss-pop"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', insetInlineEnd: 0, zIndex: 60,
            width: 340, maxWidth: 'calc(100vw - 32px)', background: '#fff', color: '#111',
            borderRadius: 16, boxShadow: '0 18px 48px rgba(0,0,0,.22)', padding: 16, textAlign: 'start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{t('panelTitle')}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('close')} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151' }}>
              <Close size={14} />
            </button>
          </div>
          <StoreLinkPanel store={store} showQr={isOwner} />
        </div>
      )}
      <style>{`
        @media (max-width:560px){
          .ss-pop{position:fixed!important;z-index:10003!important;top:auto!important;bottom:0!important;inset-inline:0!important;width:auto!important;max-width:none!important;border-radius:18px 18px 0 0!important;padding-bottom:calc(16px + env(safe-area-inset-bottom))!important;max-height:85vh;overflow-y:auto}
        }
      `}</style>
    </div>
  )
}
