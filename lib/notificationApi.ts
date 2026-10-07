// lib/notificationApi.ts
// Notifications for every bell: storefront (buyer), seller dashboard, admin.
//
// Rows follow the backend payload contract (App\Notifications\Support\Payload):
//   data = { type, category, audience, title, body, link, icon, action, data }
// normalizeNotification() still reads the old keys (message, action_url, url)
// so a row written before the contract renders the same.
//
// IMPORTANT: sellerApi's jsonRequest returns RAW JSON directly (not an axios
// { data: ... } wrapper), so `raw` below is the Laravel response body.

import api from './sellerApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationAudience = 'buyer' | 'seller' | 'admin'

/** Buyer categories (settings + /notifications tabs); seller / admin rows have others. */
export const BUYER_CATEGORIES = ['orders', 'payments', 'complaints', 'reviews', 'promotions', 'account'] as const
export type BuyerCategory = typeof BUYER_CATEGORIES[number]

export interface AppNotification {
  id: string
  is_read: boolean
  read_at: string | null
  created_at: string
  audience?: NotificationAudience
  category?: string
  data: {
    type: string
    category?: string
    audience?: NotificationAudience
    action: string
    title: string
    body: string
    icon: string
    link: string
    /** Extra context (order id, amounts…) */
    data?: Record<string, unknown>
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

export interface UnreadSummary {
  count: number
  by_category: Record<string, number>
}

// ─── Normalizer (legacy keys fallback) ────────────────────────────────────────

type RawRow = Record<string, unknown>

export function normalizeNotification(raw: unknown): AppNotification {
  const r = (raw && typeof raw === 'object' ? raw : {}) as RawRow
  const d = (r.data && typeof r.data === 'object' ? r.data : {}) as RawRow
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const audience = (str(r.audience) || str(d.audience) || undefined) as NotificationAudience | undefined
  const category = str(r.category) || str(d.category) || undefined

  return {
    id:         String(r.id ?? ''),
    is_read:    Boolean(r.is_read ?? r.read_at),
    read_at:    str(r.read_at) || null,
    created_at: str(r.created_at) || new Date().toISOString(),
    audience,
    category,
    data: {
      ...d,
      type:     str(d.type) || 'general',
      category,
      audience,
      action:   str(d.action) || 'info',
      title:    str(d.title) || str(d.message),
      body:     str(d.body) || (str(d.title) ? str(d.message) : ''),
      icon:     str(d.icon) || 'bell',
      link:     str(d.link) || str(d.action_url) || str(d.url),
    },
  }
}

// ─── Response parsers ─────────────────────────────────────────────────────────
// sellerApi returns raw Laravel JSON body directly:
//   { success: true, data: [...], meta: {...} }

type Meta = NotificationListResponse['meta']
interface RawList { data?: unknown[] | { data?: unknown[]; meta?: Meta }; meta?: Meta }

function parseListResponse(raw: unknown): NotificationListResponse {
  let items: unknown[] = []
  let meta: Meta = { current_page: 1, last_page: 1, total: 0 }

  if (Array.isArray(raw)) {
    items = raw
  } else if (raw && typeof raw === 'object') {
    const body = raw as RawList
    if (Array.isArray(body.data)) {
      items = body.data
      if (body.meta) meta = body.meta
    } else if (body.data && Array.isArray(body.data.data)) {
      // nested resource: { data: { data: [...], meta: {...} } }
      items = body.data.data
      if (body.data.meta) meta = body.data.meta
    }
  }

  return { data: items.map(normalizeNotification), meta }
}

interface RawCount { count?: number; data?: { count?: number }; unread_count?: number; unread?: number; by_category?: Record<string, number> }

function parseCount(raw: unknown): number {
  // Laravel returns { success: true, count: N, by_category: {...} }
  const r = (raw ?? {}) as RawCount
  return r.count ?? r.data?.count ?? r.unread_count ?? r.unread ?? 0
}

// ─── API factory ──────────────────────────────────────────────────────────────

function query(params: Record<string, string | number | boolean | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v === true ? 1 : v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

/**
 * /api/notifications scoped to one bell. A seller who also buys has both
 * audiences: each bell (and its unread badge) only sees its own.
 */
function scopedNotificationApi(audience: NotificationAudience) {
  return {
    async getAll(page = 1, unreadOnly = false, category?: string): Promise<NotificationListResponse> {
      const raw = await api.get(`/notifications${query({ audience, page, per_page: 20, unread: unreadOnly, category })}`)
      return parseListResponse(raw)
    },

    async getUnreadCount(): Promise<number> {
      return parseCount(await api.get(`/notifications/unread-count${query({ audience })}`))
    },

    async getUnreadSummary(): Promise<UnreadSummary> {
      const raw = await api.get<RawCount>(`/notifications/unread-count${query({ audience })}`)
      return { count: parseCount(raw), by_category: raw?.by_category ?? {} }
    },

    async markRead(id: string): Promise<void> {
      await api.patch(`/notifications/${id}/read`)
    },

    async markAllRead(category?: string): Promise<void> {
      await api.patch(`/notifications/read-all${query({ audience, category })}`)
    },

    async remove(id: string): Promise<void> {
      await api.delete(`/notifications/${id}`)
    },
  }
}

/** Storefront bell + /notifications page: the user's notifications as a buyer. */
export const buyerNotificationApi = scopedNotificationApi('buyer')

/** Seller dashboard bell + /seller/notifications. */
export const sellerNotificationApi = scopedNotificationApi('seller')

// Fired after read-state changes made outside the bell (e.g. the notifications
// page) so every mounted bell refreshes right away instead of on its next poll.
export const NOTIFICATIONS_CHANGED = 'ct:notifications-changed'
export function announceNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
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
