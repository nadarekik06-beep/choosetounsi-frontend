'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'

interface CountUpProps {
  end: number
  /** Starts counting when this becomes true (e.g. when the section scrolls into view). */
  start: boolean
  duration?: number
  suffix?: string
}

/** Animated number (ease-out cubic). Screen readers get the final value straight away. */
export default function CountUp({ end, start, duration = 1600, suffix = '' }: CountUpProps) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start || reduced) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, reduced, end, duration])

  return (
    <span className="ltr-iso">
      <span aria-hidden="true">{reduced ? end : value}<em>{suffix}</em></span>
      <span className="sr-only">{end}{suffix}</span>
    </span>
  )
}
