'use client'
// hooks/Usenotifications.ts
// Shared hook for NotificationBell — storefront (buyer), seller and admin bells.
// No realtime channel: the unread count is polled, and refreshed as soon as the
// window regains focus / the tab becomes visible again.

import { useState, useEffect, useCallback, useRef } from 'react'
import { NOTIFICATIONS_CHANGED, type AppNotification, type NotificationListResponse } from '@/lib/notificationApi'
import { refreshUser } from '@/lib/auth'

/** Notifications that change the user's role: the cached user is re-read when one arrives. */
const ROLE_CHANGING_TYPES = new Set(['seller_application_reviewed'])

// Same token keys lib/sellerApi.ts sends: no token = signed out, nothing to fetch.
function hasToken(): boolean {
  if (typeof window === 'undefined') return false
  return ['ct_auth_token', 'auth_token', 'token', 'access_token']
    .some(k => !!(localStorage.getItem(k) ?? sessionStorage.getItem(k)))
}

interface NotificationApi {
  getAll(page?: number): Promise<NotificationListResponse>
  getUnreadCount(): Promise<number>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
}

interface UseNotificationsOptions {
  api: NotificationApi
  pollInterval?: number
  onNewNotifications?: () => void
}

interface UseNotificationsReturn {
  items: AppNotification[]          // always an array, never undefined
  unreadCount: number
  loading: boolean
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  fetchAll: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export function useNotifications({
  api,
  pollInterval = 30_000,
  onNewNotifications,
}: UseNotificationsOptions): UseNotificationsReturn {

  // ── State — always safe defaults ──────────────────────────────────────────
  const [items,       setItems]       = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [open,        setOpen]        = useState(false)

  const prevUnread = useRef(0)
  const mounted    = useRef(true)
  const failures   = useRef(0)   // consecutive failed calls: polling backs off while > 0
  const roleSeen   = useRef(new Set<string>())   // role-changing notifications already acted on

  // ── Fetch full list ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!hasToken()) return
    setLoading(true)
    try {
      const res = await api.getAll(1)
      if (!mounted.current) return

      // Defensive: ensure data is always an array
      const data = Array.isArray(res?.data) ? res.data : []
      setItems(data)

      // "Application approved" just arrived: seller badge, menu and /seller without a re-login
      const roleChange = data.filter(n => !n.is_read && ROLE_CHANGING_TYPES.has(n.data?.type) && !roleSeen.current.has(n.id))
      if (roleChange.length) {
        roleChange.forEach(n => roleSeen.current.add(n.id))
        refreshUser()
      }
      failures.current = 0

      // Exact badge count: the list only holds the latest 20 rows
      try {
        const count = await api.getUnreadCount()
        if (mounted.current) {
          setUnreadCount(count)
          prevUnread.current = count
        }
      } catch {
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch {
      // Keep existing items on error (API down, network blip); polling backs off
      failures.current++
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [api])

  // ── Poll unread count (lightweight) ──────────────────────────────────────
  const pollCount = useCallback(async () => {
    // Background tab: skip this tick (the next visible one catches up).
    if (typeof document !== 'undefined' && document.hidden) return
    if (!hasToken()) return
    try {
      const count = await api.getUnreadCount()
      if (!mounted.current) return
      failures.current = 0

      const n = typeof count === 'number' ? count : 0
      setUnreadCount(n)

      // New notifications arrived since last poll
      if (n > prevUnread.current && prevUnread.current >= 0) {
        onNewNotifications?.()
        // Refresh the list so new items appear
        fetchAll()
      }
      prevUnread.current = n
    } catch {
      // Silently ignore poll errors (network blip etc.); the next tick waits longer
      failures.current++
    }
  }, [api, fetchAll, onNewNotifications])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true
    fetchAll()
    return () => { mounted.current = false }
  }, [fetchAll])

  // ── Polling ───────────────────────────────────────────────────────────────
  // After repeated failures the delay doubles (up to 10× the interval); one success resets it.
  useEffect(() => {
    if (pollInterval <= 0) return
    let id: ReturnType<typeof setTimeout>
    let cancelled = false
    const schedule = () => {
      const delay = pollInterval * Math.min(2 ** Math.max(0, failures.current - 1), 10)
      id = setTimeout(async () => {
        await pollCount()
        if (!cancelled) schedule()
      }, delay)
    }
    schedule()
    return () => { cancelled = true; clearTimeout(id) }
  }, [pollCount, pollInterval])

  // ── Back to the tab / window: catch up right away ────────────────────────
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) pollCount() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pollCount])

  // ── Read state changed elsewhere (notifications page) ──────────────────────
  useEffect(() => {
    // List for the dropdown, exact count for the badge (the list holds 20 rows max).
    const refresh = () => { fetchAll().then(pollCount) }
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh)
  }, [fetchAll, pollCount])

  // ── Fetch list when dropdown opens ────────────────────────────────────────
  useEffect(() => {
    if (open) fetchAll()
  }, [open, fetchAll])

  // ── Mark one as read ─────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setItems(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    prevUnread.current = Math.max(0, prevUnread.current - 1)

    try {
      await api.markRead(id)
    } catch {
      // Revert on error
      fetchAll()
    }
  }, [api, fetchAll])

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    // Optimistic update
    const now = new Date().toISOString()
    setItems(prev => prev.map(n => ({ ...n, is_read: true, read_at: now })))
    setUnreadCount(0)
    prevUnread.current = 0

    try {
      await api.markAllRead()
    } catch {
      fetchAll()
    }
  }, [api, fetchAll])

  return {
    items,           // always AppNotification[], never undefined
    unreadCount,
    loading,
    open,
    setOpen,
    fetchAll,
    markRead,
    markAllRead,
  }
}