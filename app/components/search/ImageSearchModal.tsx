'use client'

/**
 * Photo search, step 2: frame the item. Like Google Lens / SHEIN, the shopper drags a crop box
 * (auto-centered on the middle 80 %) around the item only; that area is cut out, resized to
 * ≤ 512 px and sent. Pointer events, so mouse, touch and pen behave the same; the box itself is
 * moved, its four corners resize it. On success the results go to /search?mode=image.
 *
 * "Prendre une photo" opens the camera: a live view inside the dialog (getUserMedia, rear
 * camera first), or, where the browser can't do that (http on a phone, permission refused),
 * the phone's own camera app through <input capture>. The shot replaces the photo being cropped.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Camera, Image as ImageIcon, RotateCcw, Search, X } from 'lucide-react'
import {
  DEFAULT_BOX, blobToDataUrl, cropToBlob, savePhotoSearch, searchByPhoto,
  type CropBox, type ImageSearchError,
} from '@/lib/imageSearch'
import BrandLoader from '@/components/brand/BrandLoader'
import './image-search.css'

const MIN = 0.08   // smallest box side, fraction of the photo

type Drag = { mode: 'move' | 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; box: CropBox; w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function moved(d: Drag, dx: number, dy: number): CropBox {
  const b = d.box
  if (d.mode === 'move') {
    return { ...b, x: clamp(b.x + dx, 0, 1 - b.w), y: clamp(b.y + dy, 0, 1 - b.h) }
  }
  let { x, y, w, h } = b
  if (d.mode.includes('w')) { const nx = clamp(x + dx, 0, x + w - MIN); w += x - nx; x = nx }
  if (d.mode.includes('e')) { w = clamp(w + dx, MIN, 1 - x) }
  if (d.mode.includes('n')) { const ny = clamp(y + dy, 0, y + h - MIN); h += y - ny; y = ny }
  if (d.mode.includes('s')) { h = clamp(h + dy, MIN, 1 - y) }
  return { x, y, w, h }
}

export default function ImageSearchModal({ file, onClose, onPickAnother }: {
  file: File
  onClose: () => void
  onPickAnother: () => void
}) {
  const t = useTranslations('imageSearch')
  const router = useRouter()
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<Drag | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [box, setBox] = useState<CropBox>(DEFAULT_BOX)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ImageSearchError | 'load' | 'camera' | null>(null)
  // The photo being cropped: the one picked in the Navbar, or a shot taken here
  const [shot, setShot] = useState<File | null>(null)
  const current = shot ?? file
  // Live camera view
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => { setShot(null) }, [file])

  useEffect(() => {
    const u = URL.createObjectURL(current)
    setUrl(u); setReady(false); setBox(DEFAULT_BOX); setError(null)
    return () => URL.revokeObjectURL(u)
  }, [current])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setLive(false)
  }, [])
  useEffect(() => stopCamera, [stopCamera])

  // The <video> only exists once `live` is on: attach the stream then.
  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [live])

  const openCamera = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      captureInputRef.current?.click()   // the phone's camera app
      return
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setLive(true)
    } catch (e) {
      // Refused: say so. No camera / busy: let the device try its own camera app.
      if (e instanceof DOMException && e.name === 'NotAllowedError') setError('camera')
      else captureInputRef.current?.click()
    }
  }, [])

  const takeShot = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (blob) setShot(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
      stopCamera()
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { if (live) stopCamera(); else onClose() } }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [busy, live, onClose, stopCamera])

  const start = (mode: Drag['mode']) => (e: ReactPointerEvent) => {
    if (busy || !imgRef.current) return
    e.preventDefault(); e.stopPropagation()
    const r = imgRef.current.getBoundingClientRect()
    drag.current = { mode, startX: e.clientX, startY: e.clientY, box, w: r.width, h: r.height }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    setBox(moved(d, (e.clientX - d.startX) / d.w, (e.clientY - d.startY) / d.h))
  }
  const end = () => { drag.current = null }

  const search = useCallback(async () => {
    const img = imgRef.current
    if (!img || busy) return
    setBusy(true); setError(null)
    try {
      const blob = await cropToBlob(img, box)
      const preview = await blobToDataUrl(blob)
      const outcome = await searchByPhoto(blob)
      if (!outcome.ok) { setError(outcome.error); return }
      const stamp = Date.now().toString(36)
      savePhotoSearch({ t: stamp, preview, result: outcome.data })
      onClose()
      router.push(`/search?mode=image&t=${stamp}`)
    } catch {
      setError('failed')
    } finally {
      setBusy(false)
    }
  }, [box, busy, onClose, router])

  const message = error === 'load' ? t('loadError')
    : error === 'camera' ? t('cameraDenied')
    : error === 'unavailable' ? t('unavailable')
    : error === 'rate_limited' ? t('rateLimited')
    : error === 'unreadable' ? t('unreadable')
    : error ? t('failed') : null

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`

  return (
    <div className="isr-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="isr-dialog" role="dialog" aria-modal="true" aria-labelledby="isr-title">
        <header className="isr-head">
          <h2 id="isr-title">{t('cropTitle')}</h2>
          <button type="button" className="isr-icon" onClick={onClose} disabled={busy} aria-label={t('cancel')}><X size={18} aria-hidden="true" /></button>
        </header>
        <p className="isr-hint">{live ? t('cameraHint') : t('cropHint')}</p>

        {/* Fallback for browsers without a live camera view: the phone's camera app */}
        <input ref={captureInputRef} type="file" accept="image/*" capture="environment" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) setShot(f); e.target.value = '' }} />

        {live && (
          <div className="isr-live">
            <video ref={videoRef} playsInline muted autoPlay />
          </div>
        )}

        {/* The crop maths are in photo coordinates: keep the stage left-to-right in RTL too. */}
        <div className="isr-stage" dir="ltr" hidden={live} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL of the shopper's photo
            <img ref={imgRef} src={url} alt="" draggable={false}
              onLoad={() => setReady(true)} onError={() => setError('load')} />
          )}
          {ready && (
            <div className="isr-box" role="group" aria-label={t('cropArea')}
              style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
              onPointerDown={start('move')}>
              {(['nw', 'ne', 'sw', 'se'] as const).map(c => (
                <span key={c} className={`isr-handle isr-handle--${c}`} onPointerDown={start(c)} />
              ))}
            </div>
          )}
          {busy && <div className="isr-scan" aria-hidden="true" />}
        </div>

        {message && <p className="isr-error" role="alert">{message}</p>}

        {live ? (
          <footer className="isr-actions">
            <button type="button" className="isr-btn isr-btn--ghost" onClick={stopCamera}>
              <X size={15} aria-hidden="true" />{t('cameraBack')}
            </button>
            <button type="button" className="isr-btn isr-btn--primary" onClick={takeShot}>
              <span className="isr-shutter" aria-hidden="true" />{t('capture')}
            </button>
          </footer>
        ) : (
        <footer className="isr-actions">
          <button type="button" className="isr-btn isr-btn--ghost" onClick={openCamera} disabled={busy}>
            <Camera size={15} aria-hidden="true" />{t('takePhoto')}
          </button>
          <button type="button" className="isr-btn isr-btn--ghost" onClick={onPickAnother} disabled={busy}>
            <ImageIcon size={15} aria-hidden="true" />{t('otherPhoto')}
          </button>
          <button type="button" className="isr-btn isr-btn--ghost" onClick={() => setBox(DEFAULT_BOX)} disabled={busy || !ready}>
            <RotateCcw size={15} aria-hidden="true" />{t('reset')}
          </button>
          <button type="button" className="isr-btn isr-btn--primary" onClick={search} disabled={busy || !ready}>
            {busy ? <BrandLoader variant="inline" size={15} /> : <Search size={15} aria-hidden="true" />}
            {busy ? t('searching') : t('search')}
          </button>
        </footer>
        )}
      </div>
    </div>
  )
}
