'use client'

/**
 * Product page gallery: every photo of the product (all colors) in one swipeable track.
 *
 *   touch    — native horizontal swipe on a CSS scroll-snap track; the browser locks the
 *              direction, so vertical page scrolling is never blocked; native pinch-zoom
 *   mouse    — drag, arrows on hover, click to zoom (follows the pointer), thumbnail strip
 *   trackpad — horizontal scroll; keyboard ← → / Home / End while the gallery has focus
 *   RTL      — the track follows the page direction, so swipe, arrows and keys are mirrored
 *
 * ── RULE: the gallery NEVER selects, changes or clears a variant ─────────────────────
 * What the gallery SHOWS and what the buyer is BUYING are two separate states:
 *   • the chosen variant lives in the product page and changes ONLY when the buyer taps a
 *     color swatch / size button;
 *   • the photo on screen (`index`) lives here and nowhere else.
 * Data flows one way, variant → gallery: `focusRequest` (sent when a swatch is tapped)
 * scrolls to that color's first photo. This component gets no variant setter and must
 * never get one: a buyer who picked "Noir" and swipes onto a white photo still buys Noir.
 * The only thing reported back is `onPreviewChange` (the color of the photo on screen),
 * used for display hints, never to choose anything.
 * scripts/test-product-gallery.mjs fails if this file starts touching the selection.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { colorCount, firstSlideOfColor, type GallerySlide } from './gallerySlides'
import './product-gallery.css'

/** Swipe hint: shown once per browser */
const HINT_KEY = 'ct_gallery_swipe_hint_seen'
/** Above this many photos the dots become noise: the counter alone stays */
const MAX_DOTS = 15

export interface GalleryFocusRequest {
  colorKey: string
  /** Bumped on every swatch tap so tapping the same color again still jumps */
  nonce: number
}

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function ProductGallery({
  slides, productName, badge, selectedColorKey, focusRequest, onPreviewChange,
}: {
  slides: GallerySlide[]
  productName: string
  badge?: ReactNode
  /** Read-only: only used to tell "this photo is another color than the one you chose" */
  selectedColorKey?: string
  /** variant → gallery: jump to this color's first photo */
  focusRequest?: GalleryFocusRequest | null
  /** Display-only report of the color on screen (null = general photo) */
  onPreviewChange?: (colorKey: string | null) => void
}) {
  const t = useTranslations('product')
  const trackRef  = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const [index, setIndex]     = useState(0)
  const [zoom, setZoom]       = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [hint, setHint]       = useState<'on' | 'out' | null>(null)
  const indexRef      = useRef(0)
  const rafRef        = useRef(0)
  const drag          = useRef<{ id: number; x: number; scroll: number; start: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const pointerType   = useRef('mouse')

  const count  = slides.length
  const many   = count > 1
  const colors = colorCount(slides)
  const current = slides[index] ?? null

  // ── Scrolling (the track's scroll position is the source of truth for `index`) ──
  const show = useCallback((i: number, smooth = true) => {
    const el = trackRef.current
    if (!el || count === 0) return
    const n = Math.max(0, Math.min(count - 1, i))
    // scrollLeft is negative in RTL (Chrome / Firefox / Safari agree on this now)
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1
    el.scrollTo({ left: sign * n * el.clientWidth, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
  }, [count])

  // Only a hint that was actually shown is remembered as seen
  const hintShown = useRef(false)
  const dismissHint = useCallback(() => {
    if (!hintShown.current) return
    hintShown.current = false
    setHint('out')
    try { localStorage.setItem(HINT_KEY, '1') } catch { /* private mode: show again next time */ }
  }, [])

  const onScroll = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = trackRef.current
      if (!el || !el.clientWidth) return
      const i = Math.max(0, Math.min(count - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))
      if (i !== indexRef.current) {
        indexRef.current = i
        setIndex(i)
        setZoom(false)
        dismissHint()
      }
    })
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Touch: the browser scrolls the track natively and locks the direction itself. We only
  // step in for a swipe that is clearly horizontal (decided after the first 6 px) while the
  // track is already at that end: left alone, it would leave the gallery and become the
  // browser's swipe-back gesture. Vertical swipes and pinch-zoom are never touched.
  useEffect(() => {
    const el = trackRef.current
    if (!el || !many) return
    let x0 = 0, y0 = 0
    let axis: 'x' | 'y' | null = null
    const start = (e: TouchEvent) => {
      axis = e.touches.length === 1 ? null : 'y'
      x0 = e.touches[0]?.clientX ?? 0
      y0 = e.touches[0]?.clientY ?? 0
    }
    const move = (e: TouchEvent) => {
      if (axis === 'y' || e.touches.length !== 1) return
      const dx = e.touches[0].clientX - x0
      const dy = e.touches[0].clientY - y0
      if (!axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (axis === 'y') return
      }
      const max = el.scrollWidth - el.clientWidth
      const pos = Math.abs(el.scrollLeft)
      const rtl = getComputedStyle(el).direction === 'rtl'
      // finger to the right = towards the photos on the left (previous in LTR, next in RTL)
      const atEnd = dx > 0 ? (rtl ? pos >= max - 1 : pos <= 1) : (rtl ? pos <= 1 : pos >= max - 1)
      if (atEnd && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
    }
  }, [many])

  const go = (i: number) => { dismissHint(); show(((i % count) + count) % count) }
  const step = (delta: number) => go(indexRef.current + delta)

  // ── variant → gallery (the only link): a tapped swatch shows that color's first photo ──
  useEffect(() => {
    if (!focusRequest) return
    const i = firstSlideOfColor(slides, focusRequest.colorKey)
    if (i >= 0) show(i)
  }, [focusRequest, slides, show])

  // Display-only: tell the page which color is on screen (for the "Preview" hints)
  const previewKey = current?.colorKey ?? null
  useEffect(() => { onPreviewChange?.(previewKey) }, [previewKey, onPreviewChange])

  // Keep the active thumbnail visible in the strip (scrolls the strip only, never the page)
  useEffect(() => {
    const strip = thumbsRef.current
    const btn = strip?.children[index] as HTMLElement | undefined
    if (!strip || !btn) return
    if (btn.offsetTop < strip.scrollTop) strip.scrollTop = btn.offsetTop
    else if (btn.offsetTop + btn.offsetHeight > strip.scrollTop + strip.clientHeight)
      strip.scrollTop = btn.offsetTop + btn.offsetHeight - strip.clientHeight
  }, [index])

  // Swipe hint: first visit only, products with more than one color. Appears once the
  // page has settled (0.5 s), fades 3 s later or on the first swipe.
  const hintAllowed = many && colors > 1
  useEffect(() => {
    if (!hintAllowed) return
    let seen = false
    try { seen = localStorage.getItem(HINT_KEY) === '1' } catch { /* storage blocked */ }
    if (seen) return
    let hide: ReturnType<typeof setTimeout> | undefined
    const show = setTimeout(() => {
      if (indexRef.current !== 0) return          // already swiping: no need for a hint
      hintShown.current = true
      setHint('on')
      hide = setTimeout(dismissHint, 3000)
    }, 500)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [hintAllowed, dismissHint])

  // ── Mouse drag (touch uses the native scroll) ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerType.current = e.pointerType
    suppressClick.current = false
    if (e.pointerType !== 'mouse' || e.button !== 0 || !many || zoom) return
    const el = e.currentTarget
    drag.current = { id: e.pointerId, x: e.clientX, scroll: el.scrollLeft, start: indexRef.current, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const el = e.currentTarget
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < 5) return
      d.moved = true
      el.setPointerCapture(e.pointerId)
      el.classList.add('is-dragging')
      dismissHint()
    }
    el.scrollLeft = d.scroll - dx
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (!d.moved) return
    const el = e.currentTarget
    el.classList.remove('is-dragging')
    suppressClick.current = true          // the click that ends a drag is not a zoom tap
    const sign  = getComputedStyle(el).direction === 'rtl' ? -1 : 1
    const moved = (-(e.clientX - d.x) * sign) / el.clientWidth   // in slides, + = next
    const jump  = Math.abs(moved) > 0.15 ? Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved))) : 0
    show(d.start + jump)
  }

  // ── Zoom: mouse only (click toggles, follows the pointer). Touch keeps native pinch-zoom. ──
  const onSlideClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return }
    if (pointerType.current !== 'mouse') return
    setZoom(z => !z)
  }
  const onSlideMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current?.moved) return
    const r = e.currentTarget.getBoundingClientRect()
    setZoomPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  // ── Keyboard: ← → follow the screen, so they are mirrored in RTL ──
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!many) return
    const rtl = trackRef.current ? getComputedStyle(trackRef.current).direction === 'rtl' : false
    if (e.key === 'ArrowRight')      { e.preventDefault(); step(rtl ? -1 : 1) }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); step(rtl ? 1 : -1) }
    else if (e.key === 'Home')       { e.preventDefault(); go(0) }
    else if (e.key === 'End')        { e.preventDefault(); go(count - 1) }
    else if (e.key === 'Escape' && zoom) setZoom(false)
  }

  const slideName = (i: number) => {
    const s = slides[i]
    const n = t('slideLabel', { n: i + 1, total: count })
    return s?.colorLabel ? `${n} – ${s.colorLabel}` : n
  }
  const showPreview = many && !!current?.colorKey && current.colorKey !== selectedColorKey

  return (
    <div className="pg" onKeyDown={onKeyDown}>
      <div className="pg-row">
        {many && (
          <div className="pg-thumbs">
            <div className="pg-thumbs__inner" ref={thumbsRef}>
              {slides.map((s, i) => (
                <button key={s.src} type="button" onClick={() => go(i)}
                  className={`pg-thumb${i === index ? ' is-on' : ''}`}
                  aria-label={slideName(i)} aria-current={i === index}>
                  <img src={s.src} alt="" loading="lazy" decoding="async" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pg-main">
          <div className="pg-frame">
            <div
              ref={trackRef}
              className={`pg-track${many ? ' is-many' : ''}${zoom ? ' is-zoomed' : ''}`}
              tabIndex={many ? 0 : -1}
              role="region"
              aria-roledescription={many ? t('galleryRole') : undefined}
              aria-label={t('galleryLabel')}
              onScroll={onScroll}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onTouchStart={hint === 'on' ? dismissHint : undefined}
            >
              {count > 0 ? slides.map((s, i) => (
                <div key={s.src} className="pg-slide" role="group" aria-roledescription={t('slideRole')}
                  aria-label={slideName(i)}
                  onClick={onSlideClick} onMouseMove={onSlideMouseMove}
                  onMouseLeave={() => setZoom(false)}>
                  <img
                    src={s.src}
                    alt={s.colorLabel ? t('imageAltColor', { name: productName, color: s.colorLabel }) : productName}
                    // first photo and the neighbours of the one on screen load now, the rest when reached
                    loading={i === 0 || Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                    draggable={false}
                    style={zoom && i === index
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: 'scale(2.2)', transition: 'none' }
                      : undefined}
                  />
                </div>
              )) : (
                <div className="pg-slide pg-slide--empty">
                  <svg width="48" height="48" fill="none" stroke="#e2e8f0" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
              )}
            </div>

            {/* Overlays: above the track, never catch the pointer */}
            {badge && <div className="pg-over">{badge}</div>}
            {showPreview && current?.colorLabel && (
              <div className="pg-preview">{t('galleryPreview', { color: current.colorLabel })}</div>
            )}
            {many && <div className="pg-counter" aria-hidden="true">{t('galleryCounter', { n: index + 1, total: count })}</div>}
            {!zoom && current && <div className="pg-zoomhint" aria-hidden="true"><ZoomIn size={13} /> {t('hoverZoom')}</div>}
            {hint && (
              <div className={`pg-hint${hint === 'out' ? ' is-out' : ''}`} role="status"
                onAnimationEnd={() => { if (hint === 'out') setHint(null) }}>
                {t('gallerySwipeHint')}
              </div>
            )}
          </div>

          {many && (
            <>
              <button type="button" className="pg-arrow pg-arrow--prev" onClick={() => step(-1)} aria-label={t('prevImage')}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="pg-arrow pg-arrow--next" onClick={() => step(1)} aria-label={t('nextImage')}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {many && count <= MAX_DOTS && (
        <div className="pg-dots">
          {slides.map((s, i) => (
            <button key={s.src} type="button" onClick={() => go(i)}
              className={`pg-dot${i === index ? ' is-on' : ''}`}
              aria-label={slideName(i)} aria-current={i === index} />
          ))}
        </div>
      )}
    </div>
  )
}
