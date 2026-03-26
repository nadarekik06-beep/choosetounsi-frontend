'use client'
// hooks/Usenotifications.ts
// Shared hook for NotificationBell — works for both seller and admin.

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppNotification, NotificationListResponse } from '@/lib/notificationApi'

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

  // ── Fetch full list ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getAll(1)
      if (!mounted.current) return

      // Defensive: ensure data is always an array
      const data = Array.isArray(res?.data) ? res.data : []
      setItems(data)

      // Unread count from list
      const unread = data.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('[useNotifications] fetchAll error:', err)
      // Keep existing items on error — don't reset to undefined
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [api])

  // ── Poll unread count (lightweight) ──────────────────────────────────────
  const pollCount = useCallback(async () => {
    try {
      const count = await api.getUnreadCount()
      if (!mounted.current) return

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
      // Silently ignore poll errors (network blip etc.)
    }
  }, [api, fetchAll, onNewNotifications])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true
    fetchAll()
    return () => { mounted.current = false }
  }, [fetchAll])

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pollInterval <= 0) return
    const id = setInterval(pollCount, pollInterval)
    return () => clearInterval(id)
  }, [pollCount, pollInterval])

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