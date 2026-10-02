'use client'

/**
 * Shoppers must complete their profile (name, phone, one delivery address)
 * before using the store. Sends a signed-in client with an incomplete
 * profile to /complete-profile from any page, and back afterwards.
 * Sellers, admins and delivery accounts are never redirected.
 * The backend enforces the same rule on checkout (profile.complete).
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AUTH_CHANGE_EVENT, api, getToken, getUser, needsProfileCompletion, updateSessionUser, type AuthUser } from '@/lib/auth'

const ALLOWED = ['/complete-profile', '/auth']

export default function ProfileGate() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))) return
      let user = getUser()
      const token = getToken()
      if (!user || !token || user.role !== 'client') return

      // Sessions saved before this rule have no flag: ask the server once.
      if (user.profile_completed === undefined) {
        try {
          const { data } = await api.get<{ user: AuthUser }>('/auth/user')
          user = { ...user, ...data.user }
          updateSessionUser(user)
        } catch { return }
      }
      if (!cancelled && needsProfileCompletion(user)) {
        const here = pathname + window.location.search
        router.replace(`/complete-profile?redirect=${encodeURIComponent(here)}`)
      }
    }

    check()
    window.addEventListener(AUTH_CHANGE_EVENT, check)
    return () => { cancelled = true; window.removeEventListener(AUTH_CHANGE_EVENT, check) }
  }, [pathname, router])

  return null
}
