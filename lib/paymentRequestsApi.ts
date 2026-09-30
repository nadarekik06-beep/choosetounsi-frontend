// Manual payments via WhatsApp — /api/seller/payment-requests/* (ad-wallet top-ups, plan upgrades).
// Temporary until Konnect / Flouci: the seller sends a pre-filled WhatsApp message, pays by
// D17 / bank transfer, and an admin approves the request. The message and the wa.me link are
// built by the backend (admin-editable template), never here.

import { currentLocale } from '@/lib/i18n/clientLocale'

const RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const API_URL = `${RAW_URL.replace(/\/api\/?$/, '')}/api`

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type PaymentRequestType = 'wallet_topup' | 'plan_upgrade'

export interface PaymentRequest {
  id: number
  reference: string
  type: PaymentRequestType
  source: 'seller' | 'admin'
  status: PaymentRequestStatus
  amount: number
  amount_received: number | null
  current_plan: { slug: string; name: string } | null
  requested_plan: { slug: string; name: string } | null
  billing_period: 'monthly' | 'yearly' | null
  payment_method: string | null
  rejection_reason: string | null
  message: string | null
  whatsapp_url: string | null      // only while pending
  decided_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface ManualPaymentConfig { enabled: boolean; whatsapp_number: string; min_top_up: number; max_top_up: number }

export class PaymentRequestError extends Error {
  constructor(message: string, public status: number, public code?: string, public data?: any) {
    super(message)
  }
}

function token(): string | null {
  if (typeof window === 'undefined') return null
  for (const k of ['ct_auth_token', 'auth_token', 'token', 'access_token']) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k)
    if (v) return v
  }
  return null
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const t = token()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': currentLocale(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const firstError = json.errors ? (Object.values(json.errors)[0] as string[] | undefined)?.[0] : undefined
    throw new PaymentRequestError(firstError ?? json.message ?? 'Request failed', res.status, json.code, json)
  }
  return json as T
}

export const paymentRequestsApi = {
  list: (type?: PaymentRequestType) =>
    request<{ data: PaymentRequest[]; config: ManualPaymentConfig }>('GET', `/seller/payment-requests${type ? `?type=${type}` : ''}`),
  topUp: (amount: number) =>
    request<{ data: PaymentRequest }>('POST', '/seller/payment-requests/wallet-top-up', { amount }).then(r => r.data),
  planUpgrade: (plan: string, billing_period: 'monthly' | 'yearly' = 'monthly') =>
    request<{ data: PaymentRequest }>('POST', '/seller/payment-requests/plan-upgrade', { plan, billing_period }).then(r => r.data),
  cancel: (id: number) => request<{ data: PaymentRequest }>('POST', `/seller/payment-requests/${id}/cancel`).then(r => r.data),
}

// ── Opening WhatsApp ──────────────────────────────────────────────────────────

export function isPhone(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Run `create` (the API call) and open the WhatsApp link it returns.
 * Phones: open it directly (the WhatsApp app takes over). Computers: a new tab
 * (WhatsApp Web / desktop app) — opened synchronously on the click and pointed at
 * the link once the request exists, so popup blockers don't eat it.
 */
export async function createAndOpenWhatsApp(create: () => Promise<PaymentRequest>): Promise<PaymentRequest> {
  const phone = isPhone()
  const tab = phone ? null : window.open('about:blank', '_blank')
  if (tab) tab.opener = null
  try {
    const req = await create()
    if (req.whatsapp_url) {
      if (phone) window.location.href = req.whatsapp_url
      else if (tab) tab.location.href = req.whatsapp_url
      else window.open(req.whatsapp_url, '_blank', 'noopener')
    } else {
      tab?.close()
    }
    return req
  } catch (e) {
    tab?.close()
    throw e
  }
}

/** Reopen the chat of a pending request (button on the confirmation screen / history). */
export function openWhatsApp(url: string) {
  if (isPhone()) window.location.href = url
  else window.open(url, '_blank', 'noopener')
}
