'use client'

/**
 * app/(client)/checkout/page.tsx
 * Full payment system: COD · Card (Stripe) · D17 · Wallet
 *
 * Fix: selectedIds is read from sessionStorage into a REF synchronously on
 * the very first render (not inside a useEffect), so the value is available
 * the moment useMemo computes `items` — even before CartContext has loaded.
 * This eliminates the race condition where filter() ran on an empty array.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, FileText, ChevronRight, Package,
  Loader2, CheckCircle, ShoppingBag, ArrowLeft, Zap,
  Plus, Star, Home, Briefcase, CreditCard, Wallet,
  Smartphone, Truck, AlertCircle, Ticket, X,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { checkoutApi, walletApi, paymentApi, type BuyNowPayload } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'
import { fetchPaymentInfo } from '@/lib/platformApi'
import type { UserAddress } from '@/app/account/addresses/page'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { WILAYAS, useWilayaLabel } from '@/lib/i18n/wilayas'

function usePrice() {
  const { price } = useFormat()
  return (n: number) => price(n, { maximumFractionDigits: 3 })
}

// ─── Shared sessionStorage key ────────────────────────────────────────────────
const SELECTED_ITEMS_KEY = 'ct_selected_items'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL      = `${STORAGE_BASE}/api`

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

type PaymentMethod = 'cod' | 'card' | 'd17' | 'wallet'

interface BuyNowProduct {
  id: number
  name: string
  price: string | number
  primary_image_url: string | null
  is_free_delivery?: boolean
  images?: { image_path: string; url?: string; color_option_id?: number | null }[]
  variants?: { id: number; price: string | number; sku: string | null; image_urls: string[] }[]
  seller?: { id: number; name: string } | null
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
// ─── Tunisian phone validation ────────────────────────────────────────────────
// `hint` is a message key in the `checkout.phone` namespace (with optional values).
function validateTunisianPhone(raw: string): { clean: string; valid: boolean; hint: string; hintValues?: Record<string, number> } {
  // Strip spaces, dashes, dots
  const stripped = raw.replace(/[\s\-\.]/g, '')
  // Remove country code prefix if present
  const withoutPrefix = stripped.replace(/^(\+216|00216)/, '')
  
  const isValid = /^[2459][0-9]{7}$/.test(withoutPrefix)
  
  let hint = ''
  let hintValues: Record<string, number> | undefined
  if (raw.trim() === '') {
    hint = ''
  } else if (withoutPrefix.length < 8) {
    hint = 'hintDigits'
    hintValues = { count: withoutPrefix.replace(/\D/g, '').length }
  } else if (withoutPrefix.length > 8) {
    hint = 'hintTooMany'
  } else if (!/^[2459]/.test(withoutPrefix)) {
    hint = 'hintPrefix'
  }
  
  return { clean: withoutPrefix, valid: isValid, hint, hintValues }
}

// ─── Payment Method Card ──────────────────────────────────────────────────────

function PaymentMethodCard({
  method, selected, onSelect, disabled, disabledReason,
  icon: Icon, label, description, badge, badgeColor,
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
}) {
  return (
    <button
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
            <button key={addr.id} onClick={() => onSelect(addr)} style={{
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
        <button onClick={onUseNew} style={{
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const t            = useTranslations('checkout')
  const tc           = useTranslations('common')
  const tp           = useTranslations('checkout.phone')
  const fmt          = usePrice()
  const wilayaLabel  = useWilayaLabel()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const isBuyNow    = searchParams.get('buy_now') === '1'
  const bnSlug      = isBuyNow ? (searchParams.get('product_slug') ?? null) : null
  const bnVariantId = isBuyNow ? (searchParams.get('variant_id') ? Number(searchParams.get('variant_id')) : null) : null
  const bnQuantity  = isBuyNow ? Math.max(1, Number(searchParams.get('quantity') ?? '1')) : 1

  const { items: allCartItems, refreshCart, cartLoading } = useCart()

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
  const [phoneTouched, setPhoneTouched] = useState(false)
  // For the partial-selection info banner
  const hasPartialSelection =
    !isBuyNow &&
    selectedIdsRef.current !== null &&
    selectedIdsRef.current.size > 0 &&
    selectedIdsRef.current.size < allCartItems.length

  // Recalculate count and subtotal from the filtered items only
  const count    = isBuyNow ? bnQuantity : items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = isBuyNow ? 0          : items.reduce((s, i) => s + i.line_total, 0)

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
  useEffect(() => {
    fetchPaymentInfo()
      .then(info => setD17Account(info.d17_account_number))
      .catch(() => setD17Account(null))
      .finally(() => setD17Loading(false))
  }, [])
  useEffect(() => {
    if (!d17Loading && !d17Account && paymentMethod === 'd17') setPaymentMethod('cod')
  }, [d17Loading, d17Account, paymentMethod])

  const [stripeLoading,      setStripeLoading]      = useState(false)

  const [form,     setForm]     = useState({ wilaya: '', address: '', phone: '', notes: '' })
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState<{ order_number: string; total: number; payment_method: PaymentMethod } | null>(null)
  const [apiError, setApiError] = useState('')

  // ── Coupons — keyed by seller_id, one code per seller ──────────────────────
  const [couponStates, setCouponStates] = useState<Record<number, CouponState>>({})

  const sellerGroups = useMemo(() => {
    if (isBuyNow) {
      return bnProduct?.seller ? [{ sellerId: bnProduct.seller.id, sellerName: bnProduct.seller.name }] : []
    }
    const map = new Map<number, { sellerId: number; sellerName: string }>()
    for (const item of items) {
      const sid = (item as any).seller_id
      if (!sid) continue
      if (!map.has(sid)) map.set(sid, { sellerId: sid, sellerName: (item as any).seller_name ?? t('sellerN', { id: sid }) })
    }
    return Array.from(map.values())
  }, [isBuyNow, items, bnProduct, t])

  const couponState = (sellerId: number): CouponState =>
    couponStates[sellerId] ?? { input: '', applied: null, loading: false, error: null, discount: 0 }

  const setCouponInput = (sellerId: number, input: string) =>
    setCouponStates(prev => ({ ...prev, [sellerId]: { ...couponState(sellerId), input, error: null } }))

  const clearCoupon = (sellerId: number) =>
    setCouponStates(prev => ({ ...prev, [sellerId]: { input: '', applied: null, loading: false, error: null, discount: 0 } }))

  const applyCoupon = async (sellerId: number) => {
    const cur = couponState(sellerId)
    if (!cur.input.trim()) return
    setCouponStates(prev => ({ ...prev, [sellerId]: { ...cur, loading: true, error: null } }))
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code: cur.input.trim() }),
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

  const totalDiscount = Object.values(couponStates).reduce((s, c) => s + (c.applied ? c.discount : 0), 0)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/auth/login?redirect=/checkout')
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) return
    setWalletLoading(true)
    walletApi.getBalance()
      .then(res => setWalletBalance(res.data.balance))
      .catch(() => setWalletBalance(0))
      .finally(() => setWalletLoading(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) return
    setAddressesLoading(true)
    fetch(`${API_URL}/addresses`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        const addrs: UserAddress[] = json.data ?? []
        setSavedAddresses(addrs)
        const def = addrs.find(a => a.is_default) ?? addrs[0] ?? null
        if (def) {
          setSelectedAddressId(def.id)
          setForm({ wilaya: def.wilaya, address: def.address, phone: def.phone, notes: def.notes ?? '' })
        } else {
          setSelectedAddressId(null)
        }
      })
      .catch(() => { setSavedAddresses([]); setSelectedAddressId(null) })
      .finally(() => setAddressesLoading(false))
  }, [])

  useEffect(() => {
    if (!isBuyNow || !bnSlug || bnFetchedRef.current) return
    bnFetchedRef.current = true
    setBnLoading(true)
    fetch(`${API_URL}/products/${bnSlug}`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setBnProduct(json.data))
      .catch(() => setBnError(true))
      .finally(() => setBnLoading(false))
  }, [isBuyNow, bnSlug])

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id)
    setForm({ wilaya: addr.wilaya, address: addr.address, phone: addr.phone, notes: addr.notes ?? '' })
    setErrors({})
  }

  const handleUseNew = () => {
    setSelectedAddressId(null)
    setForm({ wilaya: '', address: '', phone: '', notes: '' })
    setErrors({})
  }

  const validate = (): boolean => {
  const e: Record<string, string> = {}
  if (!form.wilaya.trim())  e.wilaya  = t('errors.wilaya')
  if (!form.address.trim()) e.address = t('errors.address')
  
  const phoneCheck = validateTunisianPhone(form.phone)
  if (!form.phone.trim()) {
    e.phone = t('errors.phoneRequired')
  } else if (!phoneCheck.valid) {
    e.phone = t('errors.phoneInvalid')
  }
  
  setErrors(e)
  return Object.keys(e).length === 0
}

  const bnVariant        = bnProduct?.variants?.find(v => v.id === bnVariantId) ?? null
  const bnEffectivePrice = bnVariant ? Number(bnVariant.price) : bnProduct ? Number(bnProduct.price) : 0
  const bnLineTotal      = bnEffectivePrice * bnQuantity
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

const summarySubtotal = isBuyNow ? bnLineTotal : subtotal
 
// Delivery fee logic — mirrors backend resolveCartDeliveryFee() exactly
const PLATFORM_DELIVERY_FEE = 8
 
const isFreeDelivery = (() => {
  if (isBuyNow) {
    // For buy-now, check the product's is_free_delivery flag
    return (bnProduct as any)?.is_free_delivery === true
  }
  // For cart: free only when ALL items (non-pack) have free delivery
  if (items.length === 0) return false
  const hasPack = items.some(i => (i as any).is_pack)
  if (hasPack) return false
  return items.every(i => (i as any).is_free_delivery === true)
})()
 
const deliveryFee     = isFreeDelivery ? 0 : PLATFORM_DELIVERY_FEE
const summaryTotal    = Math.max(0, summarySubtotal - totalDiscount) + deliveryFee
const walletInsufficient = walletBalance !== null && walletBalance < summaryTotal

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const { clean: cleanPhone } = validateTunisianPhone(form.phone)
  const cleanForm = { ...form, phone: cleanPhone }
    setLoading(true)
    setApiError('')

    try {
      let res: any

      if (isBuyNow) {
        if (!bnProduct) throw new Error(t('errors.productMissing'))
        const bnCoupon = bnProduct.seller ? couponState(bnProduct.seller.id) : null
        const payload: BuyNowPayload = {
          product_id:     bnProduct.id,
          quantity:       bnQuantity,
          wilaya:         form.wilaya,
          address:        form.address,
          phone:          cleanForm.phone,
          notes:          form.notes || undefined,
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
          wilaya:         form.wilaya,
          address:        form.address,
          phone:          cleanForm.phone,
          notes:          form.notes || undefined,
          payment_method: paymentMethod,
          ...(selectedItemIds ? { item_ids: selectedItemIds } : {}),
          ...(appliedCodes.length > 0 ? { coupon_codes: appliedCodes } : {}),
        })
        await refreshCart()
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
    } catch (err: any) {
      setApiError(err.message ?? t('errors.placeFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    const isPending = success.payment_method === 'd17'
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Barlow', sans-serif" }}>
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>{tc('loading')}</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (isBuyNow && (bnError || !bnProduct)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('productLoadFailed')}</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{t('backToShop')}</Link>
        </div>
      </div>
    )
  }

  // Show spinner while CartContext is still fetching — prevents the false
  // "empty cart" screen from flashing before items arrive
  if (!isBuyNow && !cartReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!isBuyNow && items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <ShoppingBag size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('cartEmpty')}</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{t('backToShop')}</Link>
        </div>
      </div>
    )
  }

  const hasSavedAddresses = !addressesLoading && savedAddresses.length > 0
  const showManualForm    = !hasSavedAddresses || selectedAddressId === null
  const summaryCount      = isBuyNow ? bnQuantity : count

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .co-input{width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;color:#0f172a;outline:none;background:#fff;transition:border-color 0.15s}
        .co-input:focus{border-color:#dc2626}
        .co-input.err{border-color:#ef4444;background:#fef2f2}
        @media(max-width:800px){.co-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>

        {/* Breadcrumb */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('shop')}</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{isBuyNow ? t('quickCheckout') : t('title')}</span>
          </nav>
        </div>

        {isBuyNow && (
          <div style={{ maxWidth: 1100, margin: '12px auto 0', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '8px 14px' }}>
              <Zap size={14} color="#dc2626" />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{t('quickCheckoutBanner')}</p>
            </div>
          </div>
        )}

        {/* Partial-selection notice */}
        {hasPartialSelection && (
          <div style={{ maxWidth: 1100, margin: '12px auto 0', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(220,38,38,0.05)', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '9px 14px' }}>
              <CheckCircle size={14} color="#dc2626" />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                {t('partialSelection', { count: items.length, total: allCartItems.length })}
              </p>
            </div>
          </div>
        )}

        <div className="co-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <form onSubmit={handleSubmit} style={{ animation: 'fadeUp 0.4s ease both', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Delivery Information */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{t('deliveryInfo')}</h2>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {apiError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                    {apiError}
                  </div>
                )}
                {addressesLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> {t('loadingAddresses')}
                  </div>
                )}
                {hasSavedAddresses && (
                  <AddressSelector addresses={savedAddresses} selectedId={selectedAddressId} onSelect={handleSelectAddress} onUseNew={handleUseNew} />
                )}
                {showManualForm && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        {t('wilaya')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select value={form.wilaya} onChange={e => set('wilaya', e.target.value)} aria-label={t('wilaya')} aria-invalid={!!errors.wilaya}
                        style={{ width: '100%', border: `1.5px solid ${errors.wilaya ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: form.wilaya ? '#0f172a' : '#94a3b8', background: errors.wilaya ? '#fef2f2' : '#fff', outline: 'none' }}>
                        <option value="">{t('selectWilaya')}</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{wilayaLabel(w)}</option>)}
                      </select>
                      {errors.wilaya && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.wilaya}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        {t('fullAddress')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)}
                        aria-label={t('fullAddress')} aria-invalid={!!errors.address}
                        placeholder={t('addressPlaceholder')}
                        style={{ resize: 'none', border: `1.5px solid ${errors.address ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: errors.address ? '#fef2f2' : '#fff', outline: 'none', width: '100%' }} />
                      {errors.address && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.address}</p>}
                    </div>
                    <div>
  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
    {t('phoneNumber')} <span style={{ color: '#ef4444' }}>*</span>
  </label>
  
  {/* Country code prefix badge + input */}
  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
    <div dir="ltr" style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 12px', borderRadius: 10, flexShrink: 0,
      border: '1.5px solid #e5e7eb', background: '#f8fafc',
      fontSize: 13, fontWeight: 700, color: '#64748b',
      whiteSpace: 'nowrap',
    }}>
      🇹🇳 +216
    </div>
    <div style={{ position: 'relative', flex: 1 }}>
      {(() => {
        const phoneCheck = phoneTouched ? validateTunisianPhone(form.phone) : { valid: false, hint: '', clean: '' }
        const showSuccess = phoneTouched && form.phone.trim() !== '' && phoneCheck.valid
        const showWarning = phoneTouched && form.phone.trim() !== '' && !phoneCheck.valid
        const borderColor = errors.phone ? '#ef4444' : showSuccess ? '#10b981' : showWarning ? '#f59e0b' : '#e5e7eb'
        const bgColor     = errors.phone ? '#fef2f2' : showSuccess ? '#f0fdf4' : '#fff'
        
        return (
          <>
            <input
              type="tel"
              dir="ltr"
              aria-label={t('phoneNumber')}
              aria-invalid={!!errors.phone}
              value={form.phone}
              onChange={e => {
                // Only allow digits, spaces, dashes, plus
                const val = e.target.value.replace(/[^0-9\s\-\+\.]/g, '')
                set('phone', val)
                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
              }}
              onBlur={() => setPhoneTouched(true)}
              onFocus={() => setPhoneTouched(true)}
              placeholder="20 123 456"
              maxLength={15}
              style={{
                width: '100%', border: `1.5px solid ${borderColor}`,
                borderRadius: 10, padding: '10px 36px 10px 14px',
                fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
                background: bgColor, outline: 'none',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            />
            {/* Live status icon */}
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              {showSuccess && (
                <svg width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              )}
              {showWarning && (
                <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
            </div>
          </>
        )
      })()}
    </div>
  </div>
  
  {/* Hint text — shown live while typing, before submit */}
  {(() => {
    const phoneCheck = phoneTouched ? validateTunisianPhone(form.phone) : { valid: false, hint: '', clean: '' }
    if (errors.phone) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
          <svg width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 11, color: '#ef4444', margin: 0, fontWeight: 600 }}>{errors.phone}</p>
        </div>
      )
    }
    if (phoneTouched && phoneCheck.hint) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
          <svg width="12" height="12" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 11, color: '#d97706', margin: 0, fontWeight: 600 }}>{tp(phoneCheck.hint, phoneCheck.hintValues)}</p>
        </div>
      )
    }
    if (phoneTouched && form.phone.trim() && phoneCheck.valid) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
          <svg width="12" height="12" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <p style={{ fontSize: 11, color: '#059669', margin: 0, fontWeight: 600 }}>{tp('valid')}</p>
        </div>
      )
    }
    return (
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
        {t.rich('phone.help', { b: c => <strong dir="ltr">{c}</strong> })}
      </p>
    )
  })()}
</div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        {t('orderNotes')} <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'none' }}>({tc('optional')})</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <FileText size={13} style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                          aria-label={t('orderNotes')}
                          placeholder={t('notesPlaceholder')}
                          style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, paddingBlock: 10, paddingInline: '34px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', resize: 'none' }} />
                      </div>
                    </div>
                  </>
                )}
                {hasSavedAddresses && selectedAddressId !== null && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={11} color="#10b981" /> {t('deliveringTo')}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{wilayaLabel(form.wilaya)}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>{form.address}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}><Phone size={10} /> <span dir="ltr">{form.phone}</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={16} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{t('paymentMethod')}</h2>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PaymentMethodCard method="cod" selected={paymentMethod === 'cod'} onSelect={() => setPaymentMethod('cod')} icon={Truck} label={t('pay.cod')} description={t('pay.codDesc')} badge={t('pay.codBadge')} badgeColor="#198f41" />
                <PaymentMethodCard method="wallet" selected={paymentMethod === 'wallet'} onSelect={() => !walletInsufficient && setPaymentMethod('wallet')} disabled={walletLoading || walletInsufficient} disabledReason={walletLoading ? t('pay.walletLoading') : t('pay.walletInsufficient', { amount: fmt(walletBalance ?? 0) })} icon={Wallet} label={t('pay.wallet')} description={walletLoading ? t('pay.walletChecking') : t('pay.walletBalance', { amount: fmt(walletBalance ?? 0) })} badge={!walletLoading && !walletInsufficient ? t('pay.walletBadge') : undefined} badgeColor="#6366f1" />
                <PaymentMethodCard method="d17" selected={paymentMethod === 'd17'} onSelect={() => d17Account && setPaymentMethod('d17')} disabled={d17Loading || !d17Account} disabledReason={d17Loading ? tc('loading') : t('pay.d17Unavailable')} icon={Smartphone} label="D17" description={t('pay.d17Desc')} badge={t('pay.d17Badge')} badgeColor="#0284c7" />
                <PaymentMethodCard method="card" selected={paymentMethod === 'card'} onSelect={() => setPaymentMethod('card')} icon={CreditCard} label={t('pay.card')} description={t('pay.cardDesc')} badge={t('pay.cardBadge')} badgeColor="#7c3aed" />
                {paymentMethod === 'd17' && d17Account && <D17Instructions total={summaryTotal} accountNumber={d17Account} />}
                {paymentMethod === 'card' && <StripeNotice />}
              </div>
            </div>

            <Link href={isBuyNow ? `/products/${bnSlug ?? ''}` : '/shop'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={13} /> {isBuyNow ? t('backToProduct') : t('continueShopping')}
            </Link>
          </form>

          {/* ── RIGHT: Order Summary ── */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', position: 'sticky', top: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                {isBuyNow ? <Zap size={16} color="#dc2626" /> : <ShoppingBag size={16} color="#dc2626" />}
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {isBuyNow ? t('quickSummary') : t('summary')}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginInlineStart: 6 }}>
                    ({tc('items', { count: summaryCount })})
                  </span>
                </h2>
              </div>

              <div style={{ padding: '12px 20px', maxHeight: 320, overflowY: 'auto' }}>
                {isBuyNow && bnProduct && (
                  <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      {bnImage ? <img src={bnImage} alt={bnProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#e2e8f0" /></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bnProduct.name}</p>
                      {bnVariant && <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, margin: '2px 0 0' }}>{bnVariant.sku ? t('sku', { sku: bnVariant.sku }) : t('variantN', { id: bnVariant.id })}</p>}
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{bnQuantity} × {fmt(bnEffectivePrice)}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(bnLineTotal)}</span>
                  </div>
                )}

                {/* Only the selected/filtered items */}
                {!isBuyNow && items.map(item => {
                  const img = resolveImg(item.image_url)
                  const variantEntries = item.variant_options ? Object.values(item.variant_options) : []
                  return (
                    <div key={`${item.id}-${item.variant_id ?? 'base'}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        {img ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#e2e8f0" /></div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        {item.variant_label && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                            {variantEntries.map((opt: any, i: number) =>
                              opt.color_hex
                                ? <span key={i} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: opt.color_hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                                : <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '1px 6px', borderRadius: 4 }}>{opt.value}</span>
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{item.quantity} × {fmt(item.price)}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(item.line_total)}</span>
                    </div>
                  )
                })}
              </div>

              {sellerGroups.length > 0 && (
                <div style={{ padding: '0 20px' }}>
                  {sellerGroups.map(g => (
                    <CouponBox
                      key={g.sellerId}
                      sellerId={g.sellerId}
                      sellerLabel={g.sellerName}
                      state={couponState(g.sellerId)}
                      onChange={v => setCouponInput(g.sellerId, v)}
                      onApply={() => applyCoupon(g.sellerId)}
                      onClear={() => clearCoupon(g.sellerId)}
                    />
                  ))}
                </div>
              )}

              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tc('subtotal')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(summarySubtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{tc('discount')}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>-{fmt(totalDiscount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tc('shipping')}</span>
                    {isFreeDelivery ? (
                      <span style={{
                        fontSize: 12, fontWeight: 800,
                        color: '#059669',
                        background: 'rgba(16,185,129,0.1)',
                        padding: '2px 8px', borderRadius: 999,
                        border: '1px solid rgba(16,185,129,0.25)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        🚚 {tc('free')}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {fmt(PLATFORM_DELIVERY_FEE)}
                      </span>
                    )}
                  </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{t('payment')}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>
                    {{ cod: `🚚 ${t('pay.cod')}`, card: `💳 ${t('pay.card')}`, d17: '📱 D17', wallet: `💰 ${t('pay.wallet')}` }[paymentMethod]}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #f1f5f9', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{tc('total')}</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{fmt(summaryTotal)}</span>
                </div>
                <button
                  onClick={handleSubmit as any}
                  disabled={loading || stripeLoading || (paymentMethod === 'wallet' && walletInsufficient)}
                  style={{
                    width: '100%', padding: '14px 0',
                    background: (loading || stripeLoading) ? '#e5e7eb' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color: (loading || stripeLoading) ? '#9ca3af' : '#fff',
                    fontWeight: 800, fontSize: 15, border: 'none', borderRadius: 12,
                    cursor: (loading || stripeLoading) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: (loading || stripeLoading) ? 'none' : '0 8px 24px rgba(220,38,38,0.3)',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                >
                  {loading || stripeLoading
                    ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />{stripeLoading ? t('redirectingStripe') : t('placing')}</>
                    : paymentMethod === 'card' ? <><CreditCard size={18} /> {t('payWithCard')}</>
                    : isBuyNow ? <><Zap size={18} /> {t('placeOrderNow')}</>
                    : <><CheckCircle size={18} /> {t('placeOrder')}</>}
                </button>
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                  {{ cod: t('reassure.cod'), card: t('reassure.card'), d17: t('reassure.d17'), wallet: t('reassure.wallet') }[paymentMethod]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}