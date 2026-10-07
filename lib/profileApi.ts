/**
 * Customer profile API (backend: ProfileApiController / ProfileOverviewController).
 * Every call works on the signed-in user only.
 */
import { api, getUser, updateSessionUser, type AuthUser } from '@/lib/auth'

export type CompletionField = 'first_name' | 'last_name' | 'phone' | 'address' | 'avatar' | 'date_of_birth' | 'gender'

export interface ProfileCompletion {
  enforced: boolean
  complete: boolean
  percent:  number
  missing:  { field: CompletionField; required: boolean }[]
}

export interface NotificationPreferences {
  email_updates:  boolean
  in_app_updates: boolean
}

/** One buyer notification category (backend NotificationPreferences::settings()). */
export interface NotificationChannelSetting {
  enabled: boolean
  /** Always on: can't be changed (transactional / security) */
  locked:  boolean
  /** Promotions e-mail: the marketing consent */
  opt_in:  boolean
}
export interface NotificationCategorySetting {
  category: 'orders' | 'payments' | 'complaints' | 'reviews' | 'promotions' | 'account'
  in_app:   NotificationChannelSetting
  email:    NotificationChannelSetting
}
/** PUT /profile/notifications keys: "{category}_{channel}" for unlocked channels */
export type NotificationChoiceKey = `${NotificationCategorySetting['category']}_${'in_app' | 'email'}`

export interface Profile {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  suggested_first_name: string | null
  suggested_last_name: string | null
  email: string
  email_verified: boolean
  phone: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  avatar: string | null
  role: AuthUser['role'] | 'delivery_admin' | 'delivery_guy'
  is_google: boolean
  has_password: boolean
  member_since: string | null
  notification_preferences: NotificationPreferences
  notification_settings?: NotificationCategorySetting[]
  marketing_emails_opt_in?: boolean
  completion: ProfileCompletion
}

export type OrderStatusGroup = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface RecentOrder {
  id: number
  order_number: string
  status: string
  status_group: OrderStatusGroup
  payment_status: string
  total_amount: number
  created_at: string
  items_count: number
  thumbnails: { name: string | null; image: string | null }[]
}

export interface ProfileOverview {
  profile: Profile
  stats: {
    orders: Record<OrderStatusGroup, number> & { total: number }
    total_spent: number
    reviews: number
    favorites: number
    followed_sellers: number
    addresses: number
    complaints: { open: number; resolved: number }
    unread_notifications: number
    wallet: { balance: number; active: boolean }
  }
  recent_orders: RecentOrder[]
}

export interface MyReview {
  id: number
  rating: number
  body: string | null
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  created_at: string
  product: { id: number; name: string; slug: string; image: string | null; available: boolean } | null
}

export interface FollowedSeller { id: number; name: string; avatar: string | null; followed_at: string }

export interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }

/** Field errors from a 422, first message per field. */
export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: FieldErrors = {}, public code?: string) {
    super(message)
  }
}

function toApiError(err: unknown): ApiError {
  const e = err as { message?: string; response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } } }
  const data   = e?.response?.data ?? {}
  const fields: FieldErrors = {}
  for (const [k, v] of Object.entries((data.errors ?? {}) as Record<string, string[]>)) fields[k] = v?.[0] ?? ''
  return new ApiError(data.message ?? e?.message ?? 'Error', e?.response?.status ?? 0, fields, data.code)
}

async function call<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  try { return (await p).data.data } catch (e) { throw toApiError(e) }
}

/** Keep the cached session user (navbar, guards) in step with the profile. */
export function syncSessionUser(profile: Profile) {
  const user = getUser()
  if (!user) return
  updateSessionUser({
    ...user,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    profile_completed: profile.completion.complete,
  })
}

export const profileApi = {
  overview:        () => call<ProfileOverview>(api.get('/profile/overview')),
  get:             () => call<Profile>(api.get('/profile')),
  update:          (body: Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone' | 'date_of_birth' | 'gender'>>) =>
                     call<Profile>(api.put('/profile', body)),
  uploadAvatar:    (file: Blob, onProgress?: (pct: number) => void) => {
                     const fd = new FormData()
                     fd.append('avatar', file, 'avatar.jpg')
                     return call<Profile>(api.post('/profile/avatar', fd, {
                       headers: { 'Content-Type': 'multipart/form-data' },
                       timeout: 60_000,
                       onUploadProgress: e => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
                     }))
                   },
  deleteAvatar:    () => call<Profile>(api.delete('/profile/avatar')),
  changePassword:  (body: { current_password?: string; password: string; password_confirmation: string }) =>
                     call<Profile>(api.put('/profile/password', body)),
  requestEmail:    (body: { email: string; current_password?: string }) =>
                     call<{ email: string; expires_in: number }>(api.post('/profile/email', body)),
  confirmEmail:    (code: string) => call<Profile>(api.post('/profile/email/verify', { code })),
  notifications:   (body: Partial<NotificationPreferences> | Partial<Record<NotificationChoiceKey, boolean>>) => call<Profile>(api.put('/profile/notifications', body)),
  reviews:         (page = 1) => call<Paginated<MyReview>>(api.get('/profile/reviews', { params: { page } })),
  followedSellers: () => call<FollowedSeller[]>(api.get('/profile/followed-sellers')),
}

/** Center-crop and downscale an image in the browser before upload (≤ 800px JPEG). */
export async function squareImage(file: File, size = 800): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const side   = Math.min(img.naturalWidth, img.naturalHeight)
    const target = Math.min(size, side)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = target
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, target, target)
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, target, target)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.9))
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ─── Address book (same endpoints as /account/addresses and checkout) ────────

export interface SavedAddress {
  id: number
  label: string
  recipient_name: string | null
  wilaya: string
  delegation: string | null
  address: string
  postal_code: string | null
  phone: string
  phone_secondary: string | null
  notes: string | null
  is_default: boolean
  created_at: string
}

export type AddressPayload = ReturnType<typeof import('@/lib/shippingAddress').shippingAddressPayload> & {
  label?: string
  is_default?: boolean
}

export const addressApi = {
  list:       () => call<SavedAddress[]>(api.get('/addresses')),
  create:     (body: AddressPayload) => call<SavedAddress>(api.post('/addresses', body)),
  update:     (id: number, body: AddressPayload) => call<SavedAddress>(api.put(`/addresses/${id}`, body)),
  remove:     async (id: number) => { try { await api.delete(`/addresses/${id}`) } catch (e) { throw toApiError(e) } },
  setDefault: (id: number) => call<SavedAddress>(api.patch(`/addresses/${id}/default`)),
}
