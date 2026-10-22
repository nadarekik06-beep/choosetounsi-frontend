'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { refreshUserIfStale } from '@/lib/auth'

/** Navigation: re-read the user when the cached copy is older than this. */
const NAVIGATION_MAX_AGE = 60_000
/** Focus + visibilitychange fire together: one request for both. */
const FOCUS_MAX_AGE = 5_000

/**
 * Keeps the cached user (role, seller approval) in step with the server without
 * a logout: on page navigation when older than a minute, and as soon as the tab
 * comes back. Renders nothing; mounted once in the root layout.
 */
export default function AuthSync() {
  const pathname = usePathname()

  useEffect(() => { refreshUserIfStale(NAVIGATION_MAX_AGE) }, [pathname])

  useEffect(() => {
    const onBack = () => { if (!document.hidden) refreshUserIfStale(FOCUS_MAX_AGE) }
    window.addEventListener('focus', onBack)
    document.addEventListener('visibilitychange', onBack)
    return () => {
      window.removeEventListener('focus', onBack)
      document.removeEventListener('visibilitychange', onBack)
    }
  }, [])

  return null
}
