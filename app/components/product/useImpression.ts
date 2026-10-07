'use client'

import { useEffect, type RefObject } from 'react'
import { trackImpression } from '@/lib/tracking'

/**
 * Seller funnel impression: the card was at least half on screen for a second.
 * Counted once per product and listing context per browser session (lib/tracking
 * dedupes and batches), so scrolling back and forth costs nothing.
 */
export function useImpression(ref: RefObject<Element | null>, productId?: number, section?: string) {
  useEffect(() => {
    const el = ref.current
    if (!productId || !section || !el || typeof IntersectionObserver === 'undefined') return

    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(entries => {
      const visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5)
      if (visible && !timer) {
        timer = setTimeout(() => {
          trackImpression(productId, section)
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
  }, [ref, productId, section])
}
