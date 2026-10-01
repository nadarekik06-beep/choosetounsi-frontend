'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tracks whether an element is on screen.
 * `inView` follows the viewport (use it to pause loops off-screen);
 * `seen` flips to true the first time it enters and stays true (use it for one-shot reveals).
 */
export function useInView<T extends Element>({ threshold = 0.15, rootMargin = '0px' } = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setSeen(true)
    }, { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView, seen }
}
