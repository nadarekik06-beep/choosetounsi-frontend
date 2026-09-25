'use client'

/**
 * FlashCountdownBadge — live countdown bar for flash-sale product cards.
 *
 * Drop it inside any `position: relative; overflow: hidden` image container; it
 * spans the bottom edge, styled like the deals page flash card countdown.
 * Renders nothing when the promotion isn't a flash sale, has no end date, or
 * has already ended. Styles are hoisted once via React 19 <style precedence>.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import CountdownTimer from './CountdownTimer'

// ── Shared ticker ────────────────────────────────────────────────────────────
const listeners = new Set<(now: number) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(fn: (now: number) => void) {
  listeners.add(fn)
  if (!timer) timer = setInterval(() => { const n = Date.now(); listeners.forEach(l => l(n)) }, 1000)
  return () => {
    listeners.delete(fn)
    if (listeners.size === 0 && timer) { clearInterval(timer); timer = null }
  }
}

function useNow() {
  // null on the server / first paint → avoids hydration mismatches
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => { setNow(Date.now()); return subscribe(setNow) }, [])
  return now
}

// Same bar as the deals page FlashCard (.dc-countdown), shrunk on narrow cards.
const FCD_CSS = `
.fcd{position:absolute;bottom:0;inset-inline:0;z-index:2;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:5px 8px;pointer-events:none;container-type:inline-size}
@container (max-width:150px){.fcd-in{zoom:.82}}
@container (max-width:120px){.fcd-in{zoom:.68}}
`

const pad = (n: number) => String(n).padStart(2, '0')

function split(ms: number) {
  const total = Math.floor(ms / 1000)
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

/** "2d 04:13:09" — pass a localized day suffix (e.g. "j", "ي") when needed. */
export function formatTimeLeft(ms: number, daySuffix = 'd'): string {
  const { d, h, m, s } = split(ms)
  return `${d > 0 ? `${d}${daySuffix} ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Live "time left" string for inline use, or null when not running / ended. */
export function useFlashTimeLeft(endsAt?: string | null): string | null {
  const t = useTranslations('countdown')
  const now = useNow()
  if (!endsAt || now === null) return null
  const left = new Date(endsAt).getTime() - now
  return left > 0 ? formatTimeLeft(left, t('daySuffix')) : null
}

interface Props {
  promotion?: { is_flash_sale?: boolean; ends_at?: string | null } | null
  style?: CSSProperties
}

export default function FlashCountdownBadge({ promotion, style }: Props) {
  const t = useTranslations('countdown')
  const now = useNow()
  if (!promotion?.is_flash_sale || !promotion.ends_at || now === null) return null

  const left = new Date(promotion.ends_at).getTime() - now
  if (!(left > 0)) return null

  return (
    <>
      <style href="flash-countdown" precedence="default">{FCD_CSS}</style>
      <div className="fcd" style={style} role="timer" aria-label={t('flashEndsIn', { time: formatTimeLeft(left, t('daySuffix')) })}>
        <div className="fcd-in">
          <CountdownTimer endsAt={promotion.ends_at} compact={false} />
        </div>
      </div>
    </>
  )
}
