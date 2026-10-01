'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'

interface CountUpProps {
  end: number
  /** Starts counting when this becomes true (e.g. when the section scrolls into view). */
  start: boolean
  duration?: number
  suffix?: string
  /** Decimal places kept while counting (default 0). */
  decimals?: number
  /** Formats the displayed number (e.g. locale decimal separator). */
  format?: (n: number) => string
}

/** Animated number (ease-out cubic). Screen readers get the final value straight away. */
export default function CountUp({ end, start, duration = 1600, suffix = '', decimals = 0, format = String }: CountUpProps) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start || reduced) return
    let raf = 0
    const t0 = performance.now()
    const f = 10 ** decimals
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3)) * f) / f)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, reduced, end, duration, decimals])

  return (
    <span className="ltr-iso">
      <span aria-hidden="true">{format(reduced ? end : value)}<em>{suffix}</em></span>
      <span className="sr-only">{format(end)}{suffix}</span>
    </span>
  )
}
