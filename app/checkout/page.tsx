'use client'

/**
 * app/(client)/checkout/page.tsx
 * Payment: cash on delivery. Card (Stripe) · D17 · Wallet are switched by the
 * admin; while off they show "Coming soon" and the API refuses them.
 * Every amount (per-shop delivery, coupons, total) comes from the server's
 * quote (POST /checkout/quote): this page never computes a price.
 *
 * Fix: selectedIds is read from sessionStorage into a REF synchronously on
 * the very first render (not inside a useEffect), so the value is available
 * the moment useMemo computes `items` — even before CartContext has loaded.
 * This eliminates the race condition where filter() ran on an empty array.
 */

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Phone, ChevronRight, Package,
  CheckCircle, ShoppingBag, ArrowLeft, Zap,
  Plus, Star, Home, Briefcase, CreditCard, Wallet,
  Smartphone, Truck, AlertCircle, Ticket, X, Minus,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { checkoutApi, walletApi, paymentApi, type BuyNowPayload, type CheckoutQuote, type CheckoutResponse, type QuotePayload } from '@/lib/shopApi'
import { api, getUser, isAuthenticated, updateSessionUser, subscribeAuth, type AuthUser } from '@/lib/auth'
import { guestCheckoutEnabled, guestHeaders, clearCartToken, rememberGuestOrder, isSignedInSnapshot, notSignedInOnServer, sessionExpired } from '@/lib/guestCart'
import GuestOrderSuccess, { type GuestSuccess } from '@/components/checkout/GuestOrderSuccess'
import OrderConfirmModal, { newIdempotencyKey, type ConfirmStage, type ConfirmLineExtra } from '@/components/checkout/OrderConfirmModal'
import { DiscountBadge } from '@/app/components/promotions/ProductPrice'
import type { QuoteLine } from '@/lib/shopApi'
import { profileApi } from '@/lib/profileApi'
import { fetchPaymentInfo, COD_ONLY, type PaymentInfo } from '@/lib/platformApi'
import type { UserAddress } from '@/app/account/addresses/page'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { useWilayaLabel } from '@/lib/i18n/wilayas'
import ShippingAddressFields from '@/components/address/ShippingAddressFields'
import { useRegions } from '@/lib/regions'
import {
  emptyShippingAddress, shippingAddressFrom, validateShippingAddress, isCompleteShippingAddress,
  shippingAddressPayload, checkoutShippingAddress, shippingAddressErrorsFromServer, formatShippingAddress, type ShippingAddressForm,
} from '@/lib/shippingAddress'

import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import { trackCheckoutStart, clearCheckoutAttempt } from '@/lib/tracking'
import { API_BASE, STORAGE_URL } from '@/lib/constants'
function usePrice() {
  const { price } = useFormat()
  return (n: number) => price(n, { maximumFractionDigits: 3 })
}

// ─── Shared sessionStorage key ────────────────────────────────────────────────
const SELECTED_ITEMS_KEY = 'ct_selected_items'

/** Time the buyer has to cancel after "Confirmer la commande", before anything is sent */
const ORDER_COUNTDOWN_MS = 10_000

// ─── Helpers ──────────────────────────────────────────────────────────────────


function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_URL}/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

/** Signed in: the token, as before. Guest: the guest cart + session headers. */
function buyerHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : guestHeaders()
}

/** "+216 22 333 444" → "22333444" when it is a Tunisian mobile, else null. */
function tunisianPhone(raw: string): string | null {
  const d = (raw ?? '').replace(/[\s\-.()]/g, '').replace(/^(\+216|00216)/, '')
  return /^[2459]\d{7}$/.test(d) ? d : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type PaymentMethod = 'cod' | 'card' | 'd17' | 'wallet'

interface BuyNowProduct {
  id: number
  name: string
  price: string | number
  final_price?: string | number          // after promotion: what buy-now charges
  primary_image_url: string | null
  is_free_delivery?: boolean
  stock?: number
  images?: { image_path: string; url?: string; color_option_id?: number | null }[]
  variants?: {
    id: number; price: string | number; final_price?: string | number; effective_price?: string | number
    sku: string | null; image_urls: string[]; stock?: number; label?: string | null
    option_map?: Record<string, { id: number; value: string } | null>
  }[]
  seller?: { id: number; name: string; business_name?: string | null } | null
}

// ─── Coupon box (per seller for cart checkout, single for buy-now) ────────────

interface CouponState { input: string; applied: string | null; loading: boolean; error: string | null; discount: number }

function CouponBox({
  sellerId, sellerLabel, state, onChange, onApply, onClear,
}: {
  sellerId: number; sellerLabel: string; state: CouponState
  onChange: (v: string) => void; onApply: () => void; onClear: () => void
}) {
  const t   = useTranslations('checkout')
  const fmt = usePrice()
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {t('couponFor', { seller: sellerLabel })}
      </p>
      {state.applied ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '7px 10px' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ticket size={13} /> {t('couponApplied', { code: state.applied, amount: fmt(state.discount) })}
          </span>
          <button type="button" onClick={onClear} aria-label={t('removeCoupon')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={state.input}
            onChange={e => onChange(e.target.value.toUpperCase())}
            placeholder={t('couponPlaceholder')}
            aria-label={t('couponPlaceholder')}
            style={{ flex: 1, minWidth: 0, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            type="button"
            onClick={onApply}
            disabled={state.loading || !state.input.trim()}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 800,
              background: '#111', color: '#fff', cursor: state.loading ? 'default' : 'pointer',
              opacity: state.loading || !state.input.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            {state.loading ? '…' : t('apply')}
          </button>
        </div>
      )}
      {state.error && <p style={{ fontSize: 11, color: '#dc2626', margin: '5px 0 0' }}>{state.error}</p>}
    </div>
  )
}
// ─── Payment Method Card ──────────────────────────────────────────────────────

function PaymentMethodCard({
  method, selected, onSelect, disabled, disabledReason,
  icon: Icon, label, description, badge, badgeColor,
  comingSoon, comingSoonLabel, comingSoonMessage,
}: {
  method: PaymentMethod
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  disabledReason?: string
  icon: React.ElementType
  label: string
  description: string
  badge?: string
  badgeColor?: string
  /** Switched off by the admin: visible, greyed, not selectable */
  comingSoon?: boolean
  comingSoonLabel?: string
  comingSoonMessage?: string
}) {
  if (comingSoon) {
    // Not a button: nothing to click, focus or select until the admin turns the method on.
    return (
      <div
        aria-disabled="true"
        title={comingSoonMessage}
        data-method={method}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          padding: '14px 16px', borderRadius: 14, cursor: 'not-allowed', userSelect: 'none',
          border: '2px dashed #e5e7eb', background: '#f9fafb',
          textAlign: 'start', fontFamily: 'inherit', width: '100%', opacity: 0.7,
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2, border: '2px solid #e5e7eb', background: '#f1f5f9' }} />
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb',
        }}>
          <Icon size={17} color="#94a3b8" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8' }}>{label}</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
              background: 'rgba(219,20,46,0.08)', color: '#db142e', border: '1px solid rgba(219,20,46,0.2)',
            }}>{comingSoonLabel}</span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{description}</p>
        </div>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 16px', borderRadius: 14, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `2px solid ${selected ? '#db142e' : disabled ? '#f1f5f9' : '#e5e7eb'}`,
        background: selected ? 'rgba(219,20,46,0.04)' : disabled ? '#f9fafb' : '#fff',
        textAlign: 'start', fontFamily: 'inherit', width: '100%',
        transition: 'all 0.15s ease', opacity: disabled ? 0.55 : 1,
        boxShadow: selected ? '0 2px 12px rgba(219,20,46,0.1)' : 'none',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        border: `2px solid ${selected ? '#db142e' : '#d1d5db'}`,
        background: selected ? '#db142e' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: selected ? 'rgba(219,20,46,0.1)' : '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${selected ? 'rgba(219,20,46,0.2)' : '#f1f5f9'}`,
      }}>
        <Icon size={17} color={selected ? '#db142e' : '#64748b'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: disabled ? '#94a3b8' : '#0f172a' }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
              background: `${badgeColor ?? '#198f41'}18`, color: badgeColor ?? '#198f41',
              border: `1px solid ${badgeColor ?? '#198f41'}30`,
            }}>{badge}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
          {disabled && disabledReason ? disabledReason : description}
        </p>
      </div>
    </button>
  )
}

// ─── D17 Instructions Panel ───────────────────────────────────────────────────

function D17Instructions({ total, accountNumber }: { total: number; accountNumber: string }) {
  const t   = useTranslations('checkout.d17')
  const fmt = usePrice()
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9ec, #fffbf0)',
      border: '1.5px solid #f59e0b40', borderRadius: 12, padding: '14px 16px', marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Smartphone size={14} color="#d97706" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>{t('title')}</span>
      </div>
      <ol style={{ margin: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          t('step1', { amount: fmt(total) }),
          t('step2', { account: accountNumber }),
          t('step3'),
          t('step4'),
          t('step5'),
        ].map((step, i) => (
          <li key={i} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{step}</li>
        ))}
      </ol>
      <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertCircle size={12} color="#d97706" />
        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700 }}>
          {t('pendingNote')}
        </span>
      </div>
    </div>
  )
}

// ─── Stripe Notice ────────────────────────────────────────────────────────────

function StripeNotice() {
  const t = useTranslations('checkout.stripe')
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      border: '1.5px solid #0ea5e940', borderRadius: 12, padding: '14px 16px', marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <CreditCard size={14} color="#0284c7" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e' }}>{t('title')}</span>
      </div>
      <p style={{ fontSize: 12, color: '#075985', margin: '0 0 8px', lineHeight: 1.4 }}>
        {t('body')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <CheckCircle size={11} color="#0284c7" />
        <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>{t('secured')}</span>
      </div>
    </div>
  )
}

// ─── Address Selector ─────────────────────────────────────────────────────────

function AddressSelector({
  addresses, selectedId, onSelect, onUseNew,
}: {
  addresses: UserAddress[]
  selectedId: number | null
  onSelect: (addr: UserAddress) => void
  onUseNew: () => void
}) {
  const t = useTranslations('checkout')
  const wilayaLabel = useWilayaLabel()
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
          {t('savedAddresses')}
        </span>
        <Link href="/account/addresses" style={{ fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none' }}>{t('manage')}</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {addresses.map(addr => {
          const isSel = selectedId === addr.id
          return (
            <button key={addr.id} type="button" onClick={() => onSelect(addr)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${isSel ? '#db142e' : '#e5e7eb'}`, background: isSel ? 'rgba(219,20,46,0.04)' : '#fff',
              textAlign: 'start', fontFamily: 'inherit', transition: 'all 0.15s ease',
              boxShadow: isSel ? '0 2px 12px rgba(219,20,46,0.1)' : 'none',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                border: `2px solid ${isSel ? '#db142e' : '#d1d5db'}`, background: isSel ? '#db142e' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {addr.label.toLowerCase().includes('work') ? <Briefcase size={12} /> : <Home size={12} />}{' '}{addr.label}
                  </span>
                  {addr.is_default && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#db142e', background: 'rgba(219,20,46,0.08)', padding: '1px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Star size={8} fill="currentColor" /> {t('default')}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{wilayaLabel(addr.wilaya)}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addr.address}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} /> <span dir="ltr">{addr.phone}</span></p>
              </div>
            </button>
          )
        })}
        <button type="button" onClick={onUseNew} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
          border: `2px dashed ${selectedId === null ? '#db142e' : '#e5e7eb'}`,
          background: selectedId === null ? 'rgba(219,20,46,0.03)' : '#fff',
          textAlign: 'start', fontFamily: 'inherit', transition: 'all 0.15s ease',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(219,20,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={14} color="#db142e" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('differentAddress')}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{t('differentAddressHint')}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Delivery amount of one parcel ────────────────────────────────────────────

function DeliveryAmount({ free, amount, freeLabel, fmt, small }: {
  free: boolean; amount: number; freeLabel: string; fmt: (n: number) => string; small?: boolean
}) {
  return free ? (
    <span style={{
      fontSize: small ? 11 : 12, fontWeight: 800, color: '#059669', background: 'rgba(16,185,129,0.1)',
      padding: '1px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {freeLabel}
    </span>
  ) : (
    <span style={{ fontSize: small ? 12 : 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt(amount)}</span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const t            = useTranslations('checkout')
  const tc           = useTranslations('common')
  const tsa          = useTranslations('shippingAddress')
  const tp           = useTranslations('product')
  const fmt          = usePrice()
  const wilayaLabel  = useWilayaLabel()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const isBuyNow    = searchParams.get('buy_now') === '1'
  const bnSlug      = isBuyNow ? (searchParams.get('product_slug') ?? null) : null
  const bnVariantId = isBuyNow ? (searchParams.get('variant_id') ? Number(searchParams.get('variant_id')) : null) : null
  const bnQuantity  = isBuyNow ? Math.max(1, Number(searchParams.get('quantity') ?? '1') || 1) : 1

  const { items: allCartItems, refreshCart, cartLoading } = useCart()

  // ── Guest checkout ────────────────────────────────────────────────────────
  // Signed in or not, live (login / logout / expired token switch it without a reload)
  const authed = useSyncExternalStore(subscribeAuth, isSignedInSnapshot, notSignedInOnServer)
  // null until the server said whether orders without an account are open
  const [guestEnabled, setGuestEnabled] = useState<boolean | null>(null)
  useEffect(() => { guestCheckoutEnabled().then(setGuestEnabled) }, [])
  const isGuest = !authed
  const [guestEmail, setGuestEmail]       = useState('')
  const [guestEmailError, setGuestEmailError] = useState('')
  const [guestSuccess, setGuestSuccess]   = useState<GuestSuccess | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const checkoutPath = '/checkout' + (searchParams.toString() ? `?${searchParams.toString()}` : '')

  // ─────────────────────────────────────────────────────────────────────────────
  // THE FIX:
  // Read sessionStorage synchronously into a ref during the very first render,
  // before any useEffect or state update runs. This means selectedIdsRef.current
  // is populated immediately and stays stable — useMemo below can always rely
  // on it being correct regardless of when CartContext finishes loading.
  //
  // Why a ref and not state?
  //   - We only need to read this value once (on mount); it never changes.
  //   - Using state would cause an extra render cycle AFTER CartContext loads,
  //     creating the same race condition we're trying to fix.
  //   - A ref is read synchronously — no re-render needed, no timing issue.
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedIdsRef = useRef<Set<number> | null>(null)
 
  // Guard: only run once (ref starts null, we set it on first render)
  if (selectedIdsRef.current === null && !isBuyNow) {
    try {
      const raw = typeof window !== 'undefined'
        ? sessionStorage.getItem(SELECTED_ITEMS_KEY)
        : null

      if (raw) {
        const ids: number[] = JSON.parse(raw)
        selectedIdsRef.current = new Set(ids)
      } else {
        // No selection stored → fall back to all items
        selectedIdsRef.current = new Set()
      }
    } catch {
      // Corrupted JSON → fall back to all items
      selectedIdsRef.current = new Set()
    }

    // Clear immediately so it never persists to the next checkout visit
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SELECTED_ITEMS_KEY)
    }
  }

  // Track when CartContext has finished its initial fetch
  const [cartReady, setCartReady] = useState(false)
  // holds the navigation loader until the first load is done
  usePageLoading(!cartReady)
  useEffect(() => {
    if (!cartLoading) setCartReady(true)
  }, [cartLoading])

  // ── Derive the exact items this checkout operates on ──────────────────────
  // useMemo recomputes whenever allCartItems changes (i.e. when CartContext
  // finishes loading), so the filter always runs on the fully-populated array.
  const items = useMemo(() => {
    if (isBuyNow) return allCartItems // buy-now doesn't use cart selection

    const sel = selectedIdsRef.current
    // No IDs stored (empty Set) means "all items" — direct navigation fallback
    if (!sel || sel.size === 0) return allCartItems
    // Filter to only the IDs the user selected in the drawer
    return allCartItems.filter(i => sel.has(i.id))
  }, [allCartItems, isBuyNow])
  // For the partial-selection info banner
  const hasPartialSelection =
    !isBuyNow &&
    selectedIdsRef.current !== null &&
    selectedIdsRef.current.size > 0 &&
    selectedIdsRef.current.size < allCartItems.length

  // Recalculate count and subtotal from the filtered items only
  const count    = isBuyNow ? bnQuantity : items.reduce((s, i) => s + i.quantity, 0)

  // Buy Now product state
  const [bnProduct,  setBnProduct]  = useState<BuyNowProduct | null>(null)
  const [bnLoading,  setBnLoading]  = useState(isBuyNow && !!bnSlug)
  const [bnError,    setBnError]    = useState(false)
  const bnFetchedRef = useRef(false)

  // Address book state
  const [savedAddresses,    setSavedAddresses]    = useState<UserAddress[]>([])
  const [addressesLoading,  setAddressesLoading]  = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  // D17 account number comes from the backend .env (D17_ACCOUNT_NUMBER); null until it is set.
  const [d17Account, setD17Account] = useState<string | null>(null)
  const [d17Loading, setD17Loading] = useState(true)
  // Admin switches: launch = cash on delivery only, the others show "Coming soon"
  const [methods, setMethods] = useState<PaymentInfo['payment_methods']>(COD_ONLY)
  const [comingSoonNotice, setComingSoonNotice] = useState(false)
  useEffect(() => {
    fetchPaymentInfo()
      .then(info => { setD17Account(info.d17_account_number); setMethods(info.payment_methods) })
      .catch(() => { setD17Account(null); setMethods(COD_ONLY) })
      .finally(() => setD17Loading(false))
  }, [])
  useEffect(() => {
    if (!d17Loading && !d17Account && paymentMethod === 'd17') setPaymentMethod('cod')
    // A guest pays cash on delivery only (wallet and online payment need an account)
    if (!methods[paymentMethod] || (isGuest && paymentMethod !== 'cod')) setPaymentMethod('cod')
  }, [d17Loading, d17Account, paymentMethod, methods, isGuest])
  const showComingSoon = () => setComingSoonNotice(true)

  const [stripeLoading,      setStripeLoading]      = useState(false)

  // Seller funnel: checkout started for these products (once per checkout attempt)
  useEffect(() => {
    if (!cartReady) return
    const ids = isBuyNow
      ? (bnProduct ? [bnProduct.id] : [])
      : items.map(i => i.product_id).filter((id): id is number => !!id)
    if (ids.length) trackCheckoutStart(ids)
  }, [cartReady, isBuyNow, bnProduct, items])

  const [form,     setForm]     = useState<ShippingAddressForm>(emptyShippingAddress())
  // The selected saved address predates structured addresses: show the form to complete it
  const [savedNeedsCompletion, setSavedNeedsCompletion] = useState(false)
  // The courier's governorate / delegation lists: a saved address without them is reselected
  const regions = useRegions()
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState<{ order_number: string; total: number; payment_method: PaymentMethod } | null>(null)
  const [apiError, setApiError] = useState('')
  const deliveryRef = useRef<HTMLDivElement>(null)
  const formRef     = useRef<HTMLFormElement>(null)

  // ── Coupons — keyed by seller_id, one code per seller ──────────────────────
  const [couponStates, setCouponStates] = useState<Record<number, CouponState>>({})

  const sellerGroups = useMemo(() => {
    if (isBuyNow) {
      return bnProduct?.seller ? [{ sellerId: bnProduct.seller.id, sellerName: bnProduct.seller.business_name?.trim() || bnProduct.seller.name }] : []
    }
    const map = new Map<number, { sellerId: number; sellerName: string }>()
    for (const item of items) {
      const sid = item.seller_id
      if (!sid) continue
      if (!map.has(sid)) map.set(sid, { sellerId: sid, sellerName: item.seller_name ?? t('sellerN', { id: sid }) })
    }
    return Array.from(map.values())
  }, [isBuyNow, items, bnProduct, t])

  const couponState = (sellerId: number): CouponState =>
    couponStates[sellerId] ?? { input: '', applied: null, loading: false, error: null, discount: 0 }

  const setCouponInput = (sellerId: number, input: string) =>
    setCouponStates(prev => ({ ...prev, [sellerId]: { ...couponState(sellerId), input, error: null } }))

  const clearCoupon = (sellerId: number) =>
    setCouponStates(prev => ({ ...prev, [sellerId]: { input: '', applied: null, loading: false, error: null, discount: 0 } }))

  // The lines this checkout places, so the coupon preview prices exactly them
  const checkoutLines = () => isBuyNow
    ? { product_id: bnProduct?.id, variant_id: bnVariantId, quantity: bnQuantity }
    : (selectedIdsRef.current && selectedIdsRef.current.size > 0 ? { item_ids: [...selectedIdsRef.current] } : {})

  const applyCoupon = async (sellerId: number) => {
    const cur = couponState(sellerId)
    if (!cur.input.trim()) return
    setCouponStates(prev => ({ ...prev, [sellerId]: { ...cur, loading: true, error: null } }))
    try {
      const guestPhone = isGuest ? tunisianPhone(form.phone) : null
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...buyerHeaders() },
        body: JSON.stringify({ code: cur.input.trim(), ...checkoutLines(), ...(guestPhone ? { phone: guestPhone } : {}) }),
      })
      const json = await res.json()
      if (json.success && json.seller_id === sellerId) {
        setCouponStates(prev => ({ ...prev, [sellerId]: { input: cur.input.trim(), applied: cur.input.trim().toUpperCase(), loading: false, error: null, discount: json.discount_amount } }))
      } else if (json.success && json.seller_id !== sellerId) {
        setCouponStates(prev => ({ ...prev, [sellerId]: { ...cur, loading: false, error: t('couponOtherSeller') } }))
      } else {
        setCouponStates(prev => ({ ...prev, [sellerId]: { ...cur, loading: false, error: json.message ?? t('couponInvalid') } }))
      }
    } catch {
      setCouponStates(prev => ({ ...prev, [sellerId]: { ...cur, loading: false, error: t('couponError') } }))
    }
  }

  // ── Server quote: per-shop delivery, coupons and total (never computed here) ──
  const [quote,        setQuote]        = useState<CheckoutQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError,   setQuoteError]   = useState('')
  const quoteSeq = useRef(0)

  const appliedCodes = useMemo(
    () => Object.values(couponStates).filter(c => c.applied).map(c => c.applied as string).sort(),
    [couponStates],
  )
  // Guest with a coupon: the delivery phone counts its "once per customer" limit
  const guestCouponPhone = isGuest && appliedCodes.length > 0 ? tunisianPhone(form.phone) : null
  const quotePayload = useCallback((): QuotePayload | null => {
    const phone = guestCouponPhone ? { phone: guestCouponPhone } : {}
    if (isBuyNow) {
      if (!bnProduct) return null
      const bnCoupon = bnProduct.seller ? couponStates[bnProduct.seller.id] : undefined
      return {
        product_id: bnProduct.id, variant_id: bnVariantId, quantity: bnQuantity,
        ...(bnCoupon?.applied ? { coupon_code: bnCoupon.applied, ...phone } : {}),
      }
    }
    if (items.length === 0) return null
    const sel = selectedIdsRef.current
    return {
      ...(sel && sel.size > 0 ? { item_ids: [...sel] } : {}),
      ...(appliedCodes.length > 0 ? { coupon_codes: appliedCodes, ...phone } : {}),
    }
  }, [isBuyNow, bnProduct, bnVariantId, bnQuantity, couponStates, items.length, appliedCodes, guestCouponPhone])

  const loadQuote = useCallback(async () => {
    const payload = quotePayload()
    if (!payload) { setQuote(null); return null }
    const seq = ++quoteSeq.current
    setQuoteLoading(true)
    setQuoteError('')
    try {
      const res = await checkoutApi.quote(payload)
      if (seq === quoteSeq.current) setQuote(res.data)
      return res.data
    } catch (caught) {
      const err = caught as Error
      if (seq === quoteSeq.current) { setQuote(null); setQuoteError(err.message ?? t('quoteFailed')) }
      return null
    } finally {
      if (seq === quoteSeq.current) setQuoteLoading(false)
    }
  }, [quotePayload, t])

  // Re-quote whenever the lines or the applied coupons change
  const quoteKey = JSON.stringify([quotePayload(), items.map(i => [i.id, i.quantity, i.line_total])])
  useEffect(() => {
    if (!cartReady || (!authed && !guestEnabled)) return
    loadQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady, quoteKey, authed, guestEnabled])

  const totalDiscount = quote?.discount_amount ?? 0

  // Not signed in: guest checkout when it is on, else the login page as before
  useEffect(() => {
    if (!authed && guestEnabled === false && !guestSuccess) {
      router.push('/auth/login?redirect=' + encodeURIComponent(checkoutPath))
    }
  }, [router, authed, guestEnabled, guestSuccess, checkoutPath])


  useEffect(() => {
    if (!isAuthenticated()) return
    setWalletLoading(true)
    walletApi.getBalance()
      .then(res => setWalletBalance(res.data.balance))
      .catch(() => setWalletBalance(0))
      .finally(() => setWalletLoading(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { setAddressesLoading(false); return } // guest: no address book
    setAddressesLoading(true)
    fetch(`${API_BASE}/addresses`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const addrs: UserAddress[] = json.data ?? []
        setSavedAddresses(addrs)
        const def = addrs.find(a => a.is_default) ?? addrs[0] ?? null
        if (def) {
          const f = shippingAddressFrom(def)
          setSelectedAddressId(def.id)
          setForm(f)
          setSavedNeedsCompletion(!isCompleteShippingAddress(checkoutShippingAddress(f)))
        } else {
          setSelectedAddressId(null)
          // No saved address yet (profile skipped): start from the profile's name and phone
          profileApi.get().then(p => setForm(f => ({
            ...f,
            recipient_name: f.recipient_name || [p.first_name ?? p.suggested_first_name, p.last_name ?? p.suggested_last_name].filter(Boolean).join(' '),
            phone:          f.phone || p.phone || '',
          }))).catch(() => {})
        }
      })
      .catch(() => { setSavedAddresses([]); setSelectedAddressId(null) })
      .finally(() => setAddressesLoading(false))
  }, [])

  const loadBuyNowProduct = useCallback(() => {
    if (!bnSlug) return Promise.resolve()
    setBnLoading(true)
    return fetch(`${API_BASE}/products/${bnSlug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setBnProduct(json.data))
      .catch(() => setBnError(true))
      .finally(() => setBnLoading(false))
  }, [bnSlug])

  useEffect(() => {
    if (!isBuyNow || !bnSlug || bnFetchedRef.current) return
    bnFetchedRef.current = true
    loadBuyNowProduct()
  }, [isBuyNow, bnSlug, loadBuyNowProduct])

  // Once the lists are known, re-check the selected saved address against them
  useEffect(() => {
    if (!regions.ready || selectedAddressId === null) return
    setSavedNeedsCompletion(!isCompleteShippingAddress(checkoutShippingAddress(form), regions.available))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions.ready, regions.available, selectedAddressId])

  const set = (field: keyof ShippingAddressForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    // The "fix the address" note goes once the buyer edits the address
    setApiError(e => (e === t('errors.fixAddress') ? '' : e))
  }

  const handleSelectAddress = (addr: UserAddress) => {
    const f = shippingAddressFrom(addr)
    setSelectedAddressId(addr.id)
    setForm(f)
    setSavedNeedsCompletion(!isCompleteShippingAddress(checkoutShippingAddress(f)))
    setErrors({})
  }

  const handleUseNew = () => {
    setSelectedAddressId(null)
    setForm(emptyShippingAddress())
    setSavedNeedsCompletion(false)
    setErrors({})
  }

  // Same rules as the server (App\Support\ShippingAddress); errors are message keys
  const validate = (): boolean => {
    // The second phone / postal code are not shown here: never an error on them
    const e = validateShippingAddress(checkoutShippingAddress(form)) as Record<string, string>
    setErrors(e)
    const ok = Object.keys(e).length === 0
    if (!ok) showAddressErrors()
    // Guest e-mail is optional, but must be valid when given
    const emailBad = isGuest && guestEmail.trim() !== '' && !EMAIL_RE.test(guestEmail.trim())
    setGuestEmailError(emailBad ? t('guest.emailInvalid') : '')
    if (ok && emailBad) scrollToFirstError()
    return ok && !emailBad
  }

  // After the errors render: bring the first faulty field into view and focus it
  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus({ preventScroll: true })
      } else {
        deliveryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 80)
  }

  // Address errors (ours or the server's): show the form on the faulty fields
  // (a saved address is hidden behind its summary) and say so by the button
  const showAddressErrors = () => {
    if (selectedAddressId !== null) setSavedNeedsCompletion(true)
    setApiError(t('errors.fixAddress'))
    scrollToFirstError()
  }

  const bnVariant        = bnProduct?.variants?.find(v => v.id === bnVariantId) ?? null
  // "Noir · L" from the variant's options; the old reference label only when they are missing
  const bnVariantText = (() => {
    if (!bnVariant) return null
    // Color first, then size etc.
    const values = Object.entries(bnVariant.option_map ?? {})
      .sort(([a], [b]) => Number(b === 'color') - Number(a === 'color'))
      .map(([, o]) => o?.value?.trim()).filter(Boolean)
    if (values.length > 0) return values.join(' · ')
    if (bnVariant.label?.trim()) return bnVariant.label.trim()
    return bnVariant.sku ? t('sku', { sku: bnVariant.sku }) : t('variantN', { id: bnVariant.id })
  })()
  // Buy-now quantity lives in the URL (login keeps it); the server re-checks stock
  const bnMaxQty = (() => {
    const s = bnVariant ? bnVariant.stock : bnProduct?.stock
    return typeof s === 'number' && s > 0 ? s : null
  })()
  const setBnQuantity = (q: number) => {
    const next = Math.max(1, bnMaxQty ? Math.min(bnMaxQty, q) : q)
    if (next === bnQuantity) return
    const qp = new URLSearchParams(searchParams.toString())
    qp.set('quantity', String(next))
    router.replace(`/checkout?${qp.toString()}`, { scroll: false })
  }
  // Unit price after promotion, from the server (same number buy-now charges)
  const bnEffectivePrice = bnVariant
    ? Number(bnVariant.final_price ?? bnVariant.effective_price ?? bnVariant.price)
    : bnProduct ? Number(bnProduct.final_price ?? bnProduct.price) : 0
  // Display only (the quote below is what is charged)
  const bnLineTotal      = Math.round(bnEffectivePrice * bnQuantity * 1000) / 1000
  const bnImage = (() => {
    if (!bnProduct) return null
    if (bnVariant && bnVariant.image_urls?.length > 0) return bnVariant.image_urls[0]
    const productImgs = (bnProduct.images ?? [])
      .filter(i => !i.color_option_id)
      .map(i => resolveImg(i.url ?? i.image_path))
      .filter(Boolean) as string[]
    if (productImgs.length > 0) return productImgs[0]
    return resolveImg(bnProduct.primary_image_url)
  })()

  // What is charged, from the server: one delivery fee per shop (parcel)
  const summarySubtotal = quote?.subtotal ?? null
  const summaryTotal    = quote?.total ?? null
  const parcels         = quote?.parcels ?? []
  // Server-priced line per cart row (buy-now: cart_id null) for the original / discount / final breakdown
  const quoteLineFor = (cartId: number | null): QuoteLine | undefined =>
    parcels.flatMap(p => p.lines ?? []).find(l => l.kind === 'product' && l.cart_id === cartId)
  const promoSavings  = quote?.promo_savings ?? 0
  const totalSavings  = quote?.total_savings ?? 0
  const promoEnded    = quote?.promo_ended ?? []
  const walletInsufficient = walletBalance !== null && summaryTotal !== null && walletBalance < summaryTotal

  // ── Place order: check → confirm → 10 s to undo → the one order request ───
  //
  // Selecting an address, a payment method, a coupon… only changes state.
  // "Passer la commande" checks the checkout and opens the confirmation;
  // "Confirmer la commande" starts the countdown; the order API is called
  // from submitOrder() only, when the countdown reaches 0.

  const [confirm, setConfirm] = useState<{ stage: ConfirmStage; key: string; quote: CheckoutQuote } | null>(null)
  const [checking, setChecking] = useState(false)           // re-checking the cart before the modal
  const [cancelNotice, setCancelNotice] = useState(false)   // "nothing was sent" after Annuler
  const [remainingMs, setRemainingMs] = useState(ORDER_COUNTDOWN_MS)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkoutLocked = confirm !== null && confirm.stage !== 'review'

  const stopCountdown = useCallback(() => {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    countdownTimer.current = null
  }, [])
  // Leaving the page (link, back button) clears the timer: nothing is sent
  useEffect(() => stopCountdown, [stopCountdown])

  const openConfirm = async () => {
    if (confirm || checking || loading) return
    setCancelNotice(false)
    if (!validate()) return
    if (!methods[paymentMethod]) { showComingSoon(); return }
    setApiError('')
    setSessionNotice(null)
    setChecking(true)
    // Stock, coupons, promotions and delivery fees checked again by the server
    const fresh = await loadQuote()
    setChecking(false)
    if (!fresh) { setApiError(t('confirm.recheckFailed')); return }
    if (paymentMethod === 'wallet' && walletBalance !== null && walletBalance < fresh.total) {
      setApiError(t('pay.walletInsufficient', { amount: fmt(walletBalance) }))
      return
    }
    setRemainingMs(ORDER_COUNTDOWN_MS)
    setConfirm({ stage: 'review', key: newIdempotencyKey(), quote: fresh })
  }

  const closeConfirm = () => { stopCountdown(); setConfirm(null) }

  const cancelCountdown = () => {
    stopCountdown()
    setConfirm(null)
    setCancelNotice(true)
  }

  // Latest submitOrder for the timer (the form is locked while it runs)
  const submitOrderRef = useRef<(key: string, expectedTotal: number) => void>(() => {})

  const startCountdown = () => {
    if (!confirm || confirm.stage !== 'review' || countdownTimer.current) return   // never two timers
    const { key, quote: shown } = confirm
    const deadline = Date.now() + ORDER_COUNTDOWN_MS
    setRemainingMs(ORDER_COUNTDOWN_MS)
    setConfirm({ ...confirm, stage: 'countdown' })
    countdownTimer.current = setInterval(() => {
      const left = deadline - Date.now()
      if (left > 0) { setRemainingMs(left); return }
      stopCountdown()
      setRemainingMs(0)
      submitOrderRef.current(key, shown.total)
    }, 100)
  }

  // Countdown / sending: warn before leaving, the order is not placed yet
  useEffect(() => {
    if (!checkoutLocked) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    const onLinkClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]')
      if (link && !window.confirm(t('confirm.leaveWarning'))) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onLinkClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onLinkClick, true)
    }
  }, [checkoutLocked, t])

  // Cart line → picture, variant and crossed-out price for the confirmation
  const confirmLineExtra = (cartId: number | null): ConfirmLineExtra => {
    if (cartId === null) {
      return {
        image: bnImage,
        variant: bnVariantText,
        originalUnitPrice: null,
        promoType: null,
      }
    }
    const item = allCartItems.find(i => i.id === cartId)
    if (!item) return { image: null, variant: null, originalUnitPrice: null, promoType: null }
    return {
      image: resolveImg(item.image_url),
      variant: item.variant_label ?? null,
      originalUnitPrice: item.original_price ?? null,
      promoType: item.promo_type ?? (item.promotion?.is_flash_sale ? 'flash_sale' : item.original_price ? 'promotion' : null),
    }
  }

  // Enter in a field never submits anything
  const blockEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
  }

  /** The only place that creates an order: called when the countdown reaches 0. */
  const submitOrder = async (idempotencyKey: string, expectedTotal: number) => {
    // Same payload fields as before; the hidden second phone / postal code are sent only when valid
    const address = { ...shippingAddressPayload(checkoutShippingAddress(form)), ...(isGuest && guestEmail.trim() ? { email: guestEmail.trim() } : {}) }
    setConfirm(c => (c ? { ...c, stage: 'placing' } : c))
    setLoading(true)
    setApiError('')
    setSessionNotice(null)

    try {
      let res: CheckoutResponse

      if (isBuyNow) {
        if (!bnProduct) throw new Error(t('errors.productMissing'))
        const bnCoupon = bnProduct.seller ? couponState(bnProduct.seller.id) : null
        const payload: BuyNowPayload = {
          expected_total:  expectedTotal,
          idempotency_key: idempotencyKey,
          product_id:      bnProduct.id,
          quantity:        bnQuantity,
          ...address,
          payment_method: paymentMethod,
          ...(bnCoupon?.applied ? { coupon_code: bnCoupon.applied } : {}),
        }
        if (bnVariantId) payload.variant_id = bnVariantId
        res = await checkoutApi.buyNow(payload)
      } else {
        const sel = selectedIdsRef.current
        const selectedItemIds = sel && sel.size > 0 ? [...sel] : undefined
        const appliedCodes = Object.values(couponStates).filter(c => c.applied).map(c => c.applied as string)

        res = await checkoutApi.place({
          expected_total:  expectedTotal,
          idempotency_key: idempotencyKey,
          ...address,
          payment_method: paymentMethod,
          ...(selectedItemIds ? { item_ids: selectedItemIds } : {}),
          ...(appliedCodes.length > 0 ? { coupon_codes: appliedCodes } : {}),
        })
        await refreshCart()
      }
      setConfirm(null)

      if (savedNeedsCompletion && selectedAddressId !== null) {
        const saved = savedAddresses.find(a => a.id === selectedAddressId)
        fetch(`${API_BASE}/addresses/${selectedAddressId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ ...address, label: saved?.label }),
        }).catch(() => {})
      }

      // The order exists: the next checkout is a new attempt
      clearCheckoutAttempt()

      // Guest order: confirmation with the tracking link + optional account
      if (res.is_guest && res.tracking_token) {
        rememberGuestOrder(res.tracking_token, res.order_number)
        // Nothing left in the guest cart (buy-now keeps it): forget the token
        try {
          const left = await checkoutApi.cartCount()
          if (left === 0) clearCartToken()
        } catch { /* keep it */ }
        setGuestSuccess({
          order_number:   res.order_number,
          total:          res.total,
          tracking_token: res.tracking_token,
          phone:          res.phone ?? form.phone,
          email:          res.email ?? null,
          recipient_name: form.recipient_name,
          has_account:    !!res.has_account,
        })
        window.scrollTo({ top: 0 })
        return
      }

      // The server saved the delivery details to an incomplete profile: refresh the cached flag
      if (getUser()?.profile_completed === false) {
        api.get<{ user: AuthUser }>('/auth/user')
          .then(({ data }) => { const u = getUser(); if (u) updateSessionUser({ ...u, ...data.user }) })
          .catch(() => {})
      }

      if (paymentMethod === 'card' && res.needs_payment) {
        setLoading(false)
        setStripeLoading(true)
        const intentRes = await paymentApi.createStripeIntent(res.order_id)
        window.location.href = `https://checkout.stripe.com/c/pay/${intentRes.client_secret}`
        return
      }

      setSuccess({
        order_number:   res.order_number,
        total:          res.total,
        payment_method: paymentMethod,
      })
    } catch (caught) {
      // Shown on the checkout; the buyer decides to try again (no automatic retry)
      setConfirm(null)
      const err = caught as Error & { status?: number; data?: { code?: string; errors?: Record<string, string[]> } }
      // Validation (422 with field errors): mark the fields, in the reader's language
      const fieldErrors = err.status === 422 ? shippingAddressErrorsFromServer(err.data?.errors) : {}
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as Record<string, string>)
        showAddressErrors()
        // The server wants a governorate / delegation from the courier's lists we could not load: ask again
        if (err.data?.errors && ('intigo_city_id' in err.data.errors || 'intigo_district_id' in err.data.errors) && !regions.available) {
          regions.reload()
        }
        return
      }
      // The login expired while ordering: it was dropped; the buyer continues as a guest or logs in again
      if (err.data?.code === 'session_expired') {
        setSessionNotice(t('guest.sessionExpired'))
        await refreshCart()
        return
      }
      setApiError(err.message || t('errors.placeFailed'))
      if (err.data?.code === 'payment_method_unavailable') {
        setPaymentMethod('cod')
        showComingSoon()
      }
      if (err.data?.code === 'price_changed' || err.data?.code === 'flash_sold_out') {
        await (isBuyNow ? loadBuyNowProduct() : refreshCart())
        for (const [sid, c] of Object.entries(couponStates)) {
          if (c.applied) await applyCoupon(Number(sid))
        }
        await loadQuote()   // the new total the customer confirms
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { submitOrderRef.current = submitOrder })

  // ── Success screen ────────────────────────────────────────────────────────

  if (guestSuccess) {
    return <GuestOrderSuccess order={guestSuccess} fmt={fmt} />
  }

  // The login expired (API 401): the account's cart is back after logging in again
  const expired = isGuest && cartReady && sessionExpired()

  // Waiting to know whether a guest may order here (else: off to the login page)
  if (!authed && guestEnabled !== true) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <BrandLoader variant="section" />
      </div>
    )
  }

  if (success) {
    const isPending = success.payment_method === 'd17'
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "var(--ct-barlow), sans-serif" }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            {isPending ? <Smartphone size={36} color="#f59e0b" /> : <CheckCircle size={36} color="#10b981" />}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
            {isPending ? t('success.pendingTitle') : t('success.title')}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 6px' }}>
            {isPending ? t('success.pendingBody')
              : success.payment_method === 'wallet' ? t('success.walletBody')
              : t('success.body')}
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
            {t.rich('success.orderLine', {
              number: success.order_number,
              total: fmt(success.total),
              b: chunks => <strong style={{ color: '#0f172a' }}>{chunks}</strong>,
              r: chunks => <strong style={{ color: '#dc2626' }}>{chunks}</strong>,
            })}
          </p>
          {isPending && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', marginBottom: 20, textAlign: 'start' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', margin: '0 0 8px' }}>{t('success.d17Title')}</p>
              <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 4px' }}>{t.rich('success.d17Amount', { amount: fmt(success.total), b: c => <strong>{c}</strong> })}</p>
              <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 4px' }}>{t.rich('success.d17Account', { account: d17Account ?? t('success.contactSupport'), b: c => <strong>{c}</strong> })}</p>
              <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>{t.rich('success.d17Reference', { number: success.order_number, b: c => <strong>{c}</strong> })}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/orders" style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} /> {t('success.viewOrders')}
            </Link>
            <Link href="/shop" style={{ padding: '12px 24px', border: '1.5px solid #e5e7eb', color: '#374151', fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none' }}>
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (isBuyNow && bnLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <BrandLoader variant="section" label={tc('loading')} />
      </div>
    )
  }
  if (isBuyNow && (bnError || !bnProduct)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "var(--ct-barlow), sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('productLoadFailed')}</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{t('backToShop')}</Link>
        </div>
      </div>
    )
  }

  // Keep the loader up while CartContext is still fetching — prevents the false
  // "empty cart" screen from flashing before items arrive
  if (!isBuyNow && !cartReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <BrandLoader variant="section" />
      </div>
    )
  }

  if (!isBuyNow && items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--ct-barlow), sans-serif", padding: 16 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <ShoppingBag size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
          {expired && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px', margin: '0 0 12px', fontWeight: 600 }}>
                {t('guest.sessionExpiredCart')}
              </p>
              <Link href={`/auth/login?redirect=${encodeURIComponent(checkoutPath)}`} style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 12, background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                {t('guest.login')}
              </Link>
            </div>
          )}
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('cartEmpty')}</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{t('backToShop')}</Link>
        </div>
      </div>
    )
  }

  const hasSavedAddresses = !addressesLoading && savedAddresses.length > 0
  const showManualForm    = !hasSavedAddresses || selectedAddressId === null || savedNeedsCompletion
  const summaryCount      = isBuyNow ? bnQuantity : count
  const shownPhones       = (() => { const f = checkoutShippingAddress(form); return f.phone + (f.phone_secondary ? ` / ${f.phone_secondary}` : '') })()
  const busy              = loading || stripeLoading || checking
  const orderDisabled     = busy || confirm !== null || quoteLoading || summaryTotal === null || (paymentMethod === 'wallet' && walletInsufficient)
  const accountNotice     = isGuest ? (sessionNotice ?? (expired ? t('guest.sessionExpired') : null)) : null

  // Section card with a numbered title: 1 summary · 2 delivery · 3 payment
  const sectionTitle = (n: number, label: string, extra?: React.ReactNode) => (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', background: '#db142e', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <h2 style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1, minWidth: 0 }}>{label}{extra}</h2>
    </div>
  )
  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, border: '1px solid #eef2f6', overflow: 'hidden', scrollMarginTop: 90 }

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .co-input{width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;color:#0f172a;outline:none;background:#fff;transition:border-color 0.15s}
        .co-input:focus{border-color:#dc2626}
        .co-input.err{border-color:#ef4444;background:#fef2f2}
        .co-form input:focus,.co-form select:focus,.co-form textarea:focus{border-color:#db142e!important;box-shadow:0 0 0 3px rgba(219,20,46,0.1)}
        .co-qty{width:36px;height:36px;border:none;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .co-qty:disabled{color:#cbd5e1;cursor:not-allowed}
        .co-qty:focus-visible,.co-pay:focus-visible,.co-submit:focus-visible{outline:2px solid #0f172a;outline-offset:2px}
        .co-sticky{position:fixed;inset-inline:0;bottom:0;z-index:900;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -8px 24px rgba(15,23,42,0.08);padding:10px 16px calc(8px + env(safe-area-inset-bottom))}
        .co-submit:not(:disabled):hover{filter:brightness(0.94)}
        @media(max-width:400px){.co-submit-icon{display:none}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f6f7f9', fontFamily: "var(--ct-barlow), sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 680, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} className="rtl-flip" />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('shop')}</Link>
            <ChevronRight size={11} className="rtl-flip" />
            <span style={{ color: '#374151', fontWeight: 600 }}>{isBuyNow ? t('quickCheckout') : t('title')}</span>
          </nav>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 24px', animation: 'fadeUp 0.35s ease both' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isBuyNow && <Zap size={20} color="#db142e" />}
            {isBuyNow ? t('quickCheckout') : t('title')}
          </h1>

          {/* Guest by default; one discreet line to log in (back here with the same product / variant / quantity) */}
          {isGuest && (
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              {t('guest.haveAccount')}{' '}
              <Link href={`/auth/login?redirect=${encodeURIComponent(checkoutPath)}`} style={{ color: '#db142e', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                {t('guest.login')}
              </Link>
            </p>
          )}

          {accountNotice && (
            <div role="status" style={{ marginTop: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, color: '#92400e' }}>
              {accountNotice}
            </div>
          )}

          {/* Partial-selection notice */}
          {hasPartialSelection && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(220,38,38,0.05)', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '9px 14px' }}>
              <CheckCircle size={14} color="#dc2626" />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                {t('partialSelection', { count: items.length, total: allCartItems.length })}
              </p>
            </div>
          )}

          {/* Never submits: the order goes through "Commander" → confirmation → countdown */}
          <form ref={formRef} className="co-form" onSubmit={e => e.preventDefault()} onKeyDown={blockEnterSubmit} noValidate style={{ marginTop: 16, minWidth: 0 }}>
          <fieldset disabled={checkoutLocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── 1. Order summary ── */}
            <section style={card} aria-labelledby="co-summary">
              <div id="co-summary">
                {sectionTitle(1, isBuyNow ? t('orderSummary') : t('summary'),
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginInlineStart: 6 }}>({tc('items', { count: summaryCount })})</span>)}
              </div>

              <div style={{ padding: '4px 16px' }}>
                {isBuyNow && bnProduct && (
                  <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', position: 'relative' }}>
                      {bnImage ? <img src={bnImage} alt={bnProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} color="#e2e8f0" /></div>}
                      <LineBadge line={quoteLineFor(null)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p dir="auto" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bnProduct.name}</p>
                      {bnVariantText && <p dir="auto" style={{ fontSize: 13, color: '#334155', fontWeight: 700, margin: '3px 0 0' }}>{bnVariantText}</p>}
                      <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{t('unitPrice', { price: fmt(quoteLineFor(null)?.unit_price ?? bnEffectivePrice) })}</p>
                      <PromoBreakdown line={quoteLineFor(null)} fmt={fmt} t={t} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                        <div role="group" aria-label={tc('quantity')} style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                          <button type="button" className="co-qty" onClick={() => setBnQuantity(bnQuantity - 1)} disabled={bnQuantity <= 1} aria-label={tp('decrease')}>
                            <Minus size={14} />
                          </button>
                          <span aria-live="polite" style={{ minWidth: 36, textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: '36px', borderInline: '1px solid #e5e7eb' }}>{bnQuantity}</span>
                          <button type="button" className="co-qty" onClick={() => setBnQuantity(bnQuantity + 1)} disabled={bnMaxQty !== null && bnQuantity >= bnMaxQty} aria-label={tp('increase')}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{fmt(bnLineTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Only the selected/filtered items */}
                {!isBuyNow && items.map(item => {
                  const img = resolveImg(item.image_url)
                  const variantEntries = item.variant_options ? Object.values(item.variant_options) : []
                  return (
                    <div key={`${item.id}-${item.variant_id ?? 'base'}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', position: 'relative' }}>
                        {img ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#e2e8f0" /></div>}
                        <LineBadge line={quoteLineFor(item.id)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p dir="auto" style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        {item.variant_label && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                            {variantEntries.map((opt, i) =>
                              opt.color_hex
                                ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#334155' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: opt.color_hex, border: '1px solid rgba(0,0,0,0.1)' }} />{opt.value}</span>
                                : <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#334155', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{opt.value}</span>
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{item.quantity} × {fmt(quoteLineFor(item.id)?.unit_price ?? item.price)}</p>
                        <PromoBreakdown line={quoteLineFor(item.id)} fmt={fmt} t={t} />
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(quoteLineFor(item.id)?.total ?? item.line_total)}</span>
                    </div>
                  )
                })}

                {sellerGroups.map(g => {
                  const st = couponState(g.sellerId)
                  // Buy-now: the amount follows the quantity (the server's quote)
                  const shown = isBuyNow && st.applied && quote ? { ...st, discount: quote.discount_amount } : st
                  return (
                    <CouponBox
                      key={g.sellerId}
                      sellerId={g.sellerId}
                      sellerLabel={g.sellerName}
                      state={shown}
                      onChange={v => setCouponInput(g.sellerId, v)}
                      onApply={() => applyCoupon(g.sellerId)}
                      onClear={() => clearCoupon(g.sellerId)}
                    />
                  )
                })}
              </div>

              <div style={{ padding: '12px 16px 14px', borderTop: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                {quoteError && (
                  <p role="alert" style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={13} /> {quoteError}
                  </p>
                )}
                {promoEnded.length > 0 && (
                  <p role="alert" style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', margin: '0 0 10px', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {t('promo.endedNotice', { items: promoEnded.join(', ') })}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tc('subtotal')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{summarySubtotal !== null ? fmt(summarySubtotal) : '…'}</span>
                </div>
                {promoSavings > 0.0005 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#db142e', fontWeight: 600 }}>{t('promo.includedSavings')}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#db142e' }}>−{fmt(promoSavings)}</span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{tc('discount')}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>-{fmt(totalDiscount)}</span>
                  </div>
                )}
                {/* Delivery: one line per shop (each shop = one parcel) */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={13} /> {t('delivery')}
                    </span>
                    {(quoteLoading || !quote) && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('quoteLoading')}</span>}
                    {quote && !quoteLoading && parcels.length === 1 && (
                      <DeliveryAmount free={parcels[0].is_free_delivery} amount={parcels[0].delivery_fee} freeLabel={tc('free')} fmt={fmt} />
                    )}
                  </div>
                  {quote && parcels.length > 1 && (
                    <div style={{ marginTop: 6, paddingInlineStart: 19, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {parcels.map(p => (
                        <div key={p.seller_id ?? 'platform'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span dir="auto" style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{p.seller_name}</span>
                          <DeliveryAmount free={p.is_free_delivery} amount={p.delivery_fee} freeLabel={tc('free')} fmt={fmt} small />
                        </div>
                      ))}
                      <p style={{ fontSize: 10.5, color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.4 }}>{t('deliveryPerShop')}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed #e5e7eb' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{tc('total')}</span>
                  <span style={{ fontSize: 19, fontWeight: 900, color: '#db142e' }}>{summaryTotal !== null ? fmt(summaryTotal) : '…'}</span>
                </div>
                {totalSavings > 0.0005 && (
                  <p style={{ margin: '8px 0 0', padding: '7px 10px', borderRadius: 8, background: 'rgba(219,20,46,0.07)', color: '#db142e', fontSize: 13, fontWeight: 800, textAlign: 'center' }}>
                    {t('promo.totalSavings', { amount: fmt(totalSavings) })}
                  </p>
                )}
              </div>
            </section>

            {/* ── 2. Delivery information ── */}
            <section ref={deliveryRef} style={card} aria-labelledby="co-delivery">
              <div id="co-delivery">{sectionTitle(2, t('deliveryInfo'))}</div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {addressesLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: '#94a3b8', fontSize: 13 }}>
                    <BrandLoader variant="inline" size={14} /> {t('loadingAddresses')}
                  </div>
                )}
                {hasSavedAddresses && (
                  <AddressSelector addresses={savedAddresses} selectedId={selectedAddressId} onSelect={handleSelectAddress} onUseNew={handleUseNew} />
                )}
                {showManualForm && (
                  <>
                    {savedNeedsCompletion && selectedAddressId !== null && (
                      <div role="status" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', fontWeight: 600, display: 'flex', gap: 8 }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {regions.available && !form.intigo_district_id ? tsa('reselectRegion') : tsa('completeSaved')}
                      </div>
                    )}
                    <ShippingAddressFields value={form} errors={errors} onChange={set} compact />
                    {isGuest && (
                      <div>
                        <label htmlFor="guest-email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          {t('guest.email')} <span style={{ fontWeight: 500, fontSize: 12, color: '#94a3b8' }}>({t('guest.optional')})</span>
                        </label>
                        <input id="guest-email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr"
                          className={`co-input${guestEmailError ? ' err' : ''}`} value={guestEmail}
                          onChange={e => { setGuestEmail(e.target.value); if (guestEmailError) setGuestEmailError('') }}
                          maxLength={191} aria-invalid={!!guestEmailError} aria-describedby="guest-email-hint"
                          style={{ fontSize: 16 }} />
                        <p id="guest-email-hint" role={guestEmailError ? 'alert' : undefined} style={{ fontSize: 11.5, color: guestEmailError ? '#dc2626' : '#94a3b8', margin: '4px 0 0', fontWeight: guestEmailError ? 600 : 400 }}>
                          {guestEmailError || t('guest.emailHint')}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {hasSavedAddresses && selectedAddressId !== null && !savedNeedsCompletion && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={11} color="#10b981" /> {t('deliveringTo')}
                    </p>
                    <p dir="auto" style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{form.recipient_name}</p>
                    <p dir="auto" style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>{formatShippingAddress(form, wilayaLabel)}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}><Phone size={10} /> <span dir="ltr">{shownPhones}</span></p>
                    {form.notes && <p dir="auto" style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0' }}>{tsa('comment')} : {form.notes}</p>}
                  </div>
                )}
              </div>
            </section>

            {/* ── 3. Payment (cash on delivery is the default and, for guests, the only method) ── */}
            <section style={card} aria-labelledby="co-payment">
              <div id="co-payment">{sectionTitle(3, t('paymentMethod'))}</div>
              <div role="radiogroup" aria-labelledby="co-payment" style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" role="radio" aria-checked={paymentMethod === 'cod'} className="co-pay" onClick={() => setPaymentMethod('cod')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', borderRadius: 12,
                    border: `1.5px solid ${paymentMethod === 'cod' ? '#db142e' : '#e5e7eb'}`,
                    background: paymentMethod === 'cod' ? 'rgba(219,20,46,0.03)' : '#fff',
                    cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit',
                  }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${paymentMethod === 'cod' ? '#db142e' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {paymentMethod === 'cod' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#db142e' }} />}
                  </span>
                  <Truck size={18} color="#198f41" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('pay.cod')}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 1 }}>
                      {summaryTotal === null ? t('pay.codDesc')
                        : parcels.length > 1 ? t('codToPayParcels', { amount: fmt(summaryTotal), count: parcels.length })
                        : t('codToPay', { amount: fmt(summaryTotal) })}
                    </span>
                  </span>
                </button>
                {!isGuest && <>
                <PaymentMethodCard method="wallet" selected={paymentMethod === 'wallet'} onSelect={() => !walletInsufficient && setPaymentMethod('wallet')} disabled={walletLoading || walletInsufficient} disabledReason={walletLoading ? t('pay.walletLoading') : t('pay.walletInsufficient', { amount: fmt(walletBalance ?? 0) })} icon={Wallet} label={t('pay.wallet')} description={walletLoading ? t('pay.walletChecking') : t('pay.walletBalance', { amount: fmt(walletBalance ?? 0) })} badge={!walletLoading && !walletInsufficient ? t('pay.walletBadge') : undefined} badgeColor="#6366f1"
                  comingSoon={!methods.wallet} comingSoonLabel={t('pay.comingSoon')} comingSoonMessage={t('pay.comingSoonAlert')} />
                <PaymentMethodCard method="d17" selected={paymentMethod === 'd17'} onSelect={() => d17Account && setPaymentMethod('d17')} disabled={d17Loading || !d17Account} disabledReason={d17Loading ? tc('loading') : t('pay.d17Unavailable')} icon={Smartphone} label="D17" description={t('pay.d17Desc')} badge={t('pay.d17Badge')} badgeColor="#0284c7"
                  comingSoon={!methods.d17} comingSoonLabel={t('pay.comingSoon')} comingSoonMessage={t('pay.comingSoonAlert')} />
                <PaymentMethodCard method="card" selected={paymentMethod === 'card'} onSelect={() => setPaymentMethod('card')} icon={CreditCard} label={t('pay.card')} description={t('pay.cardDesc')} badge={t('pay.cardBadge')} badgeColor="#7c3aed"
                  comingSoon={!methods.card} comingSoonLabel={t('pay.comingSoon')} comingSoonMessage={t('pay.comingSoonAlert')} />
                </>}
                {comingSoonNotice && (
                  <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ flex: 1 }}>{t('pay.comingSoonAlert')}</span>
                    <button type="button" onClick={() => setComingSoonNotice(false)} aria-label={tc('close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', display: 'flex', padding: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                {paymentMethod === 'd17' && d17Account && summaryTotal !== null && <D17Instructions total={summaryTotal} accountNumber={d17Account} />}
                {paymentMethod === 'card' && <StripeNotice />}
              </div>
            </section>

            <Link href={isBuyNow ? `/products/${bnSlug ?? ''}` : '/shop'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>
              <ArrowLeft size={13} className="rtl-flip" /> {isBuyNow ? t('backToProduct') : t('continueShopping')}
            </Link>
          </fieldset>
          </form>
        </div>
      </div>

      {/* Always-visible order bar: live total + the one main button (the page has room for it at the bottom) */}
      <div className="co-sticky">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {apiError && (
            <p role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{apiError}</span>
            </p>
          )}
          {cancelNotice && !apiError && (
            <p role="status" style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: '#198f41' }}>{t('confirm.cancelled')}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0, flexShrink: 0, lineHeight: 1.15 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b' }}>{tc('total')}</span>
              <span aria-live="polite" style={{ display: 'block', fontSize: 19, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {summaryTotal !== null && !quoteLoading ? fmt(summaryTotal) : '…'}
              </span>
            </div>
            <button
              type="button"
              className="co-submit"
              onClick={openConfirm}
              disabled={orderDisabled}
              aria-busy={busy}
              style={{
                flex: 1, minWidth: 0, minHeight: 52, padding: '0 14px',
                background: busy ? '#e5e7eb' : orderDisabled ? '#f1a5af' : '#db142e',
                color: busy ? '#6b7280' : '#fff',
                fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 12,
                cursor: orderDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: orderDisabled ? 'none' : '0 6px 18px rgba(219,20,46,0.3)',
                fontFamily: 'inherit', transition: 'background 0.2s',
              }}
            >
              {busy
                ? <><BrandLoader variant="inline" size={18} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripeLoading ? t('redirectingStripe') : checking ? t('confirm.checking') : t('placing')}</span></>
                : paymentMethod === 'card' ? <><CreditCard size={18} /> {t('payWithCard')}</>
                : <><CheckCircle size={18} className="co-submit-icon" /><span style={{ whiteSpace: 'nowrap' }}>{t('placeOrderNow')}</span></>}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '6px 0 0' }}>
            {{ cod: t('reassure.cod'), card: t('reassure.card'), d17: t('reassure.d17'), wallet: t('reassure.wallet') }[paymentMethod]}
          </p>
        </div>
      </div>

      {confirm && (
        <OrderConfirmModal
          stage={confirm.stage}
          quote={confirm.quote}
          lineExtra={confirmLineExtra}
          address={{
            name:   form.recipient_name,
            phones: shownPhones,
            full:   formatShippingAddress(checkoutShippingAddress(form), wilayaLabel),
            notes:  form.notes ?? '',
          }}
          paymentLabel={{ cod: t('pay.cod'), card: t('pay.card'), d17: 'D17', wallet: t('pay.wallet') }[paymentMethod]}
          remainingMs={remainingMs}
          totalMs={ORDER_COUNTDOWN_MS}
          fmt={fmt}
          onEdit={closeConfirm}
          onConfirm={startCountdown}
          onCancelCountdown={cancelCountdown}
        />
      )}
    </>
  )
}

// ── Promotion breakdown per line (server numbers from the quote) ──────────────

/** "-50%" on the item thumbnail. */
function LineBadge({ line }: { line?: QuoteLine }) {
  if (!line || !(line.promo_discount && line.promo_discount > 0.0005)) return null
  return <DiscountBadge percent={line.discount_percent ?? 0} size="sm" style={{ position: 'absolute', top: 2, insetInlineStart: 2 }} />
}

/** Original price crossed out, discount, final price; or the "promotion ended" notice. */
function PromoBreakdown({ line, fmt, t }: {
  line?: QuoteLine
  fmt: (n: number) => string
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  if (!line) return null
  if (line.promo_ended) {
    return (
      <p role="status" style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 7px', margin: '4px 0 0', fontWeight: 600 }}>
        {t('promo.endedLine', { price: fmt(line.promo_ended_price ?? 0) })}
      </p>
    )
  }
  if (!(line.promo_discount && line.promo_discount > 0.0005) || line.original_unit_price === undefined) return null
  return (
    <p style={{ fontSize: 11.5, margin: '3px 0 0', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'baseline' }}>
      <span style={{ color: '#9ca3af' }}>{t('promo.original')} <s>{fmt(line.original_unit_price)}</s></span>
      {/* Per unit, like the original and final prices next to it */}
      <span style={{ color: '#db142e', fontWeight: 700 }}>{t('promo.discount')} −{fmt(Math.round((line.promo_discount / Math.max(1, line.quantity)) * 1000) / 1000)}</span>
      <span style={{ color: '#db142e', fontWeight: 800 }}>{t('promo.final')} {fmt(line.unit_price)}</span>
    </p>
  )
}
