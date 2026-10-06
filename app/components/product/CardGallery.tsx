'use client'

/**
 * The image area of a product card: a SHEIN-style slider.
 *
 *   mouse  — the image follows the pointer across the card (left → right = first → last,
 *            mirrored in RTL); back to the cover when the pointer leaves
 *   touch  — horizontal swipe on a CSS scroll-snap track (no library)
 *   both   — small dots at the bottom; `selected` (a color swatch) jumps to that image
 *
 * Only the cover is mounted up front. The other images are mounted the first time the
 * card is hovered, touched or focused, so list pages download one image per card.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { isLocalImage } from '@/lib/imageHost'

export default function CardGallery({ images, alt, href, sizes, eager = false, priority = false, selected = null, onOpen, onBroken, noImageLabel, children }: {
  images: string[]
  alt: string
  href: string
  sizes: string
  eager?: boolean
  priority?: boolean
  /** Index to show (color swatch hover / tap); null = follow the pointer / swipe. */
  selected?: number | null
  onOpen?: () => void
  onBroken?: (url: string) => void
  noImageLabel: string
  /** Badges, favourite, actions… drawn above the slides. */
  children?: ReactNode
}) {
  const track = useRef<HTMLAnchorElement>(null)
  const [armed, setArmed] = useState(false)     // extra images mounted
  const [index, setIndex] = useState(0)    // follows the track's scroll position (onScroll)
  const count = images.length
  const many = count > 1
  const mounted = armed || selected != null

  // Scrolls the track; the scroll event then moves the dot
  const show = useCallback((i: number, smooth = false) => {
    const el = track.current
    if (!el) return
    const n = Math.max(0, Math.min(count - 1, i))
    // scrollLeft is negative in RTL (Chrome / Firefox / Safari agree on this now)
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1
    el.scrollTo({ left: sign * n * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }, [count])

  // A color swatch picks the image; leaving the swatch goes back to the cover.
  // Also re-runs when the list changes (a broken image was dropped).
  useEffect(() => {
    if (many) show(selected != null && selected >= 0 ? selected : 0, selected != null)
  }, [selected, many, show])

  const arm = () => { if (many && !armed) setArmed(true) }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !many || selected != null) return
    arm()
    const rect = e.currentTarget.getBoundingClientRect()
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const x = (rtl ? rect.right - e.clientX : e.clientX - rect.left) / rect.width
    const i = Math.min(count - 1, Math.max(0, Math.floor(x * count)))
    if (i !== index) { setIndex(i); show(i) }
  }

  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && many && selected == null) { setIndex(0); show(0) }
  }

  // Swipe: the scroll position decides the dot
  const onScroll = () => {
    const el = track.current
    if (!el || !el.clientWidth) return
    arm()
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    if (i !== index) setIndex(Math.max(0, Math.min(count - 1, i)))
  }

  return (
    <div className={`sp-card__media${many ? ' has-many' : ''}`}
      onPointerEnter={e => { if (e.pointerType === 'mouse') arm() }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onTouchStart={arm}
      onFocus={arm}>
      {count > 0 ? (
        // Same destination as the card link; aria-hidden so it's announced once
        <Link ref={track} href={href} prefetch={false} className="pc-track" tabIndex={-1} aria-hidden="true"
          onClick={onOpen} onScroll={onScroll} draggable={false}>
          {images.map((src, i) => (
            <span key={src} className="pc-slide">
              {(i === 0 || mounted) && (
                <Image className="sp-card__img" src={src} unoptimized={isLocalImage(src)} alt={i === 0 ? alt : ''} fill sizes={sizes}
                  loading={i === 0 && !eager ? 'lazy' : 'eager'} priority={i === 0 && priority} draggable={false}
                  onError={() => onBroken?.(src)} />
              )}
            </span>
          ))}
        </Link>
      ) : (
        <div className="sp-card__ph" role="img" aria-label={noImageLabel}><Package size={22} strokeWidth={1.5} aria-hidden="true" /></div>
      )}

      {many && (
        <div className="sp-card__dots" aria-hidden="true">
          {images.map((src, i) => <i key={src} className={i === Math.min(index, count - 1) ? 'is-on' : undefined} />)}
        </div>
      )}

      {children}
    </div>
  )
}
