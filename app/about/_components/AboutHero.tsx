'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'

// Time each photo stays on screen. A JS timer drives autoplay; the progress bar only mirrors it.
const SLIDE_MS = 3500
// Intrinsic sizes of the JPG/WebP pairs in /public/images/about (width × height).
const SIZES: Record<string, [number, number]> = {
  'about-1-together': [1200, 1600],
  'about-2-proud': [1200, 1600],
  'about-3-walking': [1286, 1600],
  'about-4-next-chapter': [1320, 1531],
}

type Slide = { name: string; alt: string }
type Text = {
  eyebrow: string
  headline: string
  story: string
  signature: string
  carousel: string
  pause: string
  play: string
  slideLabels: string[]
  goTo: string[]
}

function Photo({ name, alt, first, className }: { name: string; alt: string; first: boolean; className?: string }) {
  const [w, h] = SIZES[name] ?? [1200, 1600]
  return (
    <picture>
      <source type="image/webp" srcSet={`/images/about/${name}.webp`} />
      <img
        src={`/images/about/${name}.jpg`}
        alt={alt}
        width={w}
        height={h}
        className={className}
        loading={first ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : 'low'}
        decoding="async"
        draggable={false}
      />
    </picture>
  )
}

/** "Our story" hero: crossfading photo slideshow with the founders' story overlaid. */
export default function AboutHero({ slides, text }: { slides: Slide[]; text: Text }) {
  const reduced = useReducedMotion()
  const count = slides.length
  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [userPaused, setUserPaused] = useState(false)
  const [focused, setFocused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const playing = !reduced && !userPaused && !focused && !tabHidden && onScreen

  const activeRef = useRef(0)
  const go = useCallback((target: number) => {
    const next = (target + count) % count
    const cur = activeRef.current
    if (next === cur) return
    activeRef.current = next
    setPrev(cur)
    setActive(next)
  }, [count])
  const step = useCallback((delta: number) => go(activeRef.current + delta), [go])

  // Autoplay: one timer per slide. Pausing keeps the time already spent, so resuming finishes the slide.
  const remainingRef = useRef(SLIDE_MS)
  useEffect(() => { remainingRef.current = SLIDE_MS }, [active])
  useEffect(() => {
    if (!playing) return
    const started = performance.now()
    const id = window.setTimeout(() => step(1), remainingRef.current)
    return () => {
      window.clearTimeout(id)
      remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - started))
    }
  }, [playing, active, step])

  // Reveal the text once when the section enters the viewport; pause autoplay while it is off-screen.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setRevealed(true); return }
    const io = new IntersectionObserver(([entry]) => {
      setOnScreen(entry.isIntersecting)
      if (entry.isIntersecting) setRevealed(true)
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const isRtl = () => rootRef.current?.closest('[dir]')?.getAttribute('dir') === 'rtl'

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const forward = (e.key === 'ArrowRight') !== isRtl()
    step(forward ? 1 : -1)
  }

  // Touch/pen swipes anywhere on the hero; mouse drags are left alone so text stays selectable.
  const onPointerDown = (e: React.PointerEvent) => { swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    // Swiping towards the reading direction's start shows the next photo.
    const forward = (dx < 0) !== isRtl()
    step(forward ? 1 : -1)
  }

  const sentences = text.story.split(/(?<=[.!?؟])\s+/)
  const layer = (i: number) => `${i === active ? ' is-active' : ''}${i === prev ? ' is-prev' : ''}`

  return (
    <section
      ref={rootRef}
      className="ab-hero"
      data-in={revealed}
      data-playing={playing}
      style={{ '--ab-slide': `${SLIDE_MS}ms` } as React.CSSProperties}
      aria-roledescription="carousel"
      aria-label={text.carousel}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null }}
      onFocus={e => { if ((e.target as HTMLElement).matches?.(':focus-visible')) setFocused(true) }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false) }}
    >
      {/* Desktop backdrop: the same photo, blurred and darkened, crossfading with the slides */}
      <div className="ab-bg" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.name} className={`ab-bg__layer${layer(i)}`}>
            <Photo name={s.name} alt="" first={i === 0} />
          </div>
        ))}
      </div>

      <div className="ab-stage">
        <div className="ab-media">
          <div className="ab-frame" aria-live={playing ? 'off' : 'polite'}>
            {slides.map((s, i) => (
              <div
                key={s.name}
                className={`ab-slide ab-slide--${i + 1}${layer(i)}`}
                role="group"
                aria-roledescription="slide"
                aria-label={text.slideLabels[i]}
                aria-hidden={i !== active}
              >
                <Photo name={s.name} alt={s.alt} first={i === 0} className="ab-slide__img" />
              </div>
            ))}
            <span className="ab-shade" aria-hidden="true" />
          </div>

          <div className="ab-controls">
            <div className="ab-bars">
              {slides.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  className={`ab-bar${i < active ? ' is-done' : ''}${i === active ? ' is-active' : ''}`}
                  aria-label={text.goTo[i]}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => go(i)}
                >
                  <span className="ab-bar__track">
                    {i === active
                      ? <span key={`f${active}`} className="ab-bar__fill" />
                      : <span className="ab-bar__fill" />}
                  </span>
                </button>
              ))}
            </div>
            {!reduced && (
              <button
                type="button"
                className="ab-toggle"
                aria-label={userPaused ? text.play : text.pause}
                onClick={() => setUserPaused(p => !p)}
              >
                {userPaused
                  ? <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor" /></svg>
                  : <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>}
              </button>
            )}
          </div>
        </div>

        <div className="ab-panel">
          <p className="ab-eyebrow ab-rv" style={{ '--i': 0 } as React.CSSProperties}>
            <span className="ab-dot ab-dot--red" aria-hidden="true" />
            <span className="ab-dot ab-dot--green" aria-hidden="true" />
            {text.eyebrow}
          </p>
          <h1 className="ab-headline keep-font ab-rv" style={{ '--i': 1 } as React.CSSProperties}>{text.headline}</h1>
          <span className="ab-accent" aria-hidden="true" />
          <p className="ab-story">
            {sentences.map((s, i) => (
              <span key={i} className="ab-line ab-rv" style={{ '--i': i + 2 } as React.CSSProperties}>{s} </span>
            ))}
          </p>
          <p className="ab-signature keep-font ab-rv" style={{ '--i': sentences.length + 2.5 } as React.CSSProperties}>{text.signature}</p>
        </div>
      </div>
      <noscript><style>{'.ab-rv{opacity:1!important;transform:none!important}.ab-accent{transform:none!important}'}</style></noscript>
    </section>
  )
}
