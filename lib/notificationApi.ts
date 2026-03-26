// lib/notificationApi.ts
// Works for BOTH seller and admin dashboards.
// Uses the default export from sellerApi (axios-compatible, returns { data: ... }).

import api from './sellerApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  is_read: boolean
  read_at: string | null
  created_at: string
  data: {
    type: string
    action: string
    title: string
    body: string
    icon: string
    link: string
    [key: string]: unknown
  }
}

export interface NotificationListResponse {
  data: AppNotification[]
  meta: {
    current_page: number
    last_page: number
    total: number
  }
}

// ─── Helper: safely parse list response ───────────────────────────────────────
// The Laravel API can return the list in several shapes:
//   { data: [...], meta: {...} }         ← paginated
//   { data: { data: [...], ... } }       ← nested (when using Resource)
//   { success: true, data: [...] }       ← simple list
// We handle all of them.

function parseListResponse(raw: any): NotificationListResponse {
  // raw is the full parsed response body (not { data: raw } wrapper)

  let items: AppNotification[] = []
  let meta = { current_page: 1, last_page: 1, total: 0 }

  if (Array.isArray(raw)) {
    // bare array
    items = raw
  } else if (raw?.data) {
    if (Array.isArray(raw.data)) {
      // { data: [...], meta: {...} }
      items = raw.data
      if (raw.meta) meta = raw.meta
    } else if (Array.isArray(raw.data?.data)) {
      // { data: { data: [...], meta: {...} } }
      items = raw.data.data
      if (raw.data.meta) meta = raw.data.meta
    }
  }

  return { data: items, meta }
}

// ─── Seller notification API (/api/notifications) ─────────────────────────────

export const sellerNotificationApi = {
  async getAll(page = 1): Promise<NotificationListResponse> {
    // api.get returns { data: <raw json> }
    const res = await api.get('/notifications', { params: { page, per_page: 20 } })
    return parseListResponse(res.data)
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/notifications/unread-count')
    // Handle: { count: N } or { data: { count: N } } or { unread: N }
    const payload = res.data
    return (
      payload?.count ??
      payload?.data?.count ??
      payload?.unread_count ??
      payload?.unread ??
      0
    )
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },
}

// ─── Admin notification API (/api/admin/notifications) ────────────────────────

export const adminNotificationApi = {
  async getAll(page = 1): Promise<NotificationListResponse> {
    const res = await api.get('/admin/notifications', { params: { page, per_page: 20 } })
    return parseListResponse(res.data)
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get('/admin/notifications/unread-count')
    const payload = res.data
    return (
      payload?.count ??
      payload?.data?.count ??
      payload?.unread_count ??
      payload?.unread ??
      0
    )
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/admin/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.patch('/admin/notifications/read-all')
  },
}