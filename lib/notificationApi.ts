// lib/notificationApi.ts
// Works for BOTH seller and admin dashboards.
//
// IMPORTANT: This file uses the default export from sellerApi.ts.
// sellerApi's jsonRequest returns RAW JSON directly (not axios { data: ... } wrapper).
// So res = the Laravel response body directly — NOT res.data.

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

// ─── Response parser ──────────────────────────────────────────────────────────
// sellerApi returns raw Laravel JSON body directly:
//   { success: true, data: [...], meta: {...} }
// So `raw` here IS the Laravel body — access raw.data for the array.

function parseListResponse(raw: any): NotificationListResponse {
  let items: AppNotification[] = []
  let meta = { current_page: 1, last_page: 1, total: 0 }

  if (Array.isArray(raw)) {
    // bare array
    items = raw
  } else if (raw?.data) {
    if (Array.isArray(raw.data)) {
      // { success, data: [...], meta: {...} }  ← this is the normal shape
      items = raw.data
      if (raw.meta) meta = raw.meta
    } else if (Array.isArray(raw.data?.data)) {
      // nested resource: { data: { data: [...], meta: {...} } }
      items = raw.data.data
      if (raw.data.meta) meta = raw.data.meta
    }
  }

  return { data: items, meta }
}

function parseCount(raw: any): number {
  // Laravel returns { success: true, count: N }
  return (
    raw?.count          ??
    raw?.data?.count    ??
    raw?.unread_count   ??
    raw?.unread         ??
    0
  )
}

// ─── Seller notification API (/api/notifications) ─────────────────────────────

export const sellerNotificationApi = {
  async getAll(page = 1): Promise<NotificationListResponse> {
    // api.get returns raw JSON — e.g. { success, data: [...], meta: {...} }
    const raw = await api.get(`/notifications?page=${page}&per_page=20`)
    return parseListResponse(raw)
  },

  async getUnreadCount(): Promise<number> {
    const raw = await api.get('/notifications/unread-count')
    return parseCount(raw)
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
    const raw = await api.get(`/admin/notifications?page=${page}&per_page=20`)
    return parseListResponse(raw)
  },

  async getUnreadCount(): Promise<number> {
    const raw = await api.get('/admin/notifications/unread-count')
    return parseCount(raw)
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/admin/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.patch('/admin/notifications/read-all')
  },
}