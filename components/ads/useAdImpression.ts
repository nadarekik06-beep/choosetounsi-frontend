'use client'

import { useEffect, type RefObject } from 'react'
import { recordAdImpression } from '@/lib/adsApi'

/**
 * Report an ad impression once at least half of it has been on screen for a
 * full second (once per token). No token → nothing (organic cards).
 */
export function useAdImpression(ref: RefObject<Element | null>, token?: string | null) {
  useEffect(() => {
    const el = ref.current
    if (!token || !el || typeof IntersectionObserver === 'undefined') return

    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(entries => {
      const visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5)
      if (visible && !timer) {
        timer = setTimeout(() => {
          recordAdImpression(token)
          io.disconnect()
        }, 1000)
      } else if (!visible && timer) {
        clearTimeout(timer)
        timer = null
      }
    }, { threshold: [0, 0.5, 1] })

    io.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      io.disconnect()
    }
  }, [ref, token])
}
