'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { getUserSnapshot, subscribeAuth, type AuthUser } from '@/lib/auth'

/**
 * The signed-in user (null for visitors and during server render), re-rendered
 * whenever the cached user changes: login / logout, refreshUser() after the
 * admin approved or removed the seller role, or a change in another tab.
 */
export function useAuthUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribeAuth, getUserSnapshot, () => null)
  return useMemo(() => {
    if (!raw) return null
    try { return JSON.parse(raw) as AuthUser } catch { return null }
  }, [raw])
}
