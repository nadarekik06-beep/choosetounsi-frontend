'use client'

/**
 * app/(client)/checkout/page.tsx
 * Full payment system: COD · Card (Stripe) · D17 · Wallet
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, FileText, ChevronRight, Package,
  Loader2, CheckCircle, ShoppingBag, ArrowLeft, Zap,
  Plus, Star, Home, Briefcase, CreditCard, Wallet,
  Smartphone, Truck, AlertCircle, ExternalLink,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { checkoutApi, walletApi, paymentApi, type BuyNowPayload } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'
import type { UserAddress } from '@/app/account/addresses/page'

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

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

const WILAYAS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
]

type PaymentMethod = 'cod' | 'card' | 'd17' | 'wallet'

interface BuyNowProduct {
  id: number
  name: string
  price: string | number
  primary_image_url: string | null
  images?: { image_path: string; url?: string; color_option_id?: number | null }[]
  variants?: { id: number; price: string | number; sku: string | null; image_urls: string[] }[]
}

// ─── Payment Method Card ──────────────────────────────────────────────────────

function PaymentMethodCard({
  method,
  selected,
  onSelect,
  disabled,
  disabledReason,
  icon: Icon,
  label,
  description,
  badge,
  badgeColor,
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
        textAlign: 'left', fontFamily: 'inherit', width: '100%',
        transition: 'all 0.15s ease', opacity: disabled ? 0.55 : 1,
        boxShadow: selected ? '0 2px 12px rgba(219,20,46,0.1)' : 'none',
      }}
    >
      {/* Radio dot */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        border: `2px solid ${selected ? '#db142e' : '#d1d5db'}`,
        background: selected ? '#db142e' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
      </div>

      {/* Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: selected ? 'rgba(219,20,46,0.1)' : '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${selected ? 'rgba(219,20,46,0.2)' : '#f1f5f9'}`,
      }}>
        <Icon size={17} color={selected ? '#db142e' : '#64748b'} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: disabled ? '#94a3b8' : '#0f172a' }}>
            {label}
          </span>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
              background: `${badgeColor ?? '#198f41'}18`,
              color: badgeColor ?? '#198f41',
              border: `1px solid ${badgeColor ?? '#198f41'}30`,
            }}>
              {badge}
            </span>
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

function D17Instructions({ total }: { total: number }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9ec, #fffbf0)',
      border: '1.5px solid #f59e0b40',
      borderRadius: 12, padding: '14px 16px', marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Smartphone size={14} color="#d97706" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
          How to pay with D17
        </span>
      </div>
      <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          `Open your D17 app and send ${fmt(total)} to our account`,
          'Account number: 71 234 567 (CHOOSE\'Tounsi)',
          'Add your order number as the transfer note',
          'Screenshot your transfer confirmation',
          'Admin will confirm your order within 2 hours',
        ].map((step, i) => (
          <li key={i} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
            {step}
          </li>
        ))}
      </ol>
      <div style={{
        marginTop: 10, padding: '8px 12px', background: '#fef3c7',
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <AlertCircle size={12} color="#d97706" />
        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700 }}>
          Your order will be pending until admin confirms the transfer.
        </span>
      </div>
    </div>
  )
}

// ─── Stripe Card Form ─────────────────────────────────────────────────────────

function StripeNotice() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      border: '1.5px solid #0ea5e940',
      borderRadius: 12, padding: '14px 16px', marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <CreditCard size={14} color="#0284c7" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e' }}>
          Secure card payment via Stripe
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#075985', margin: '0 0 8px', lineHeight: 1.4 }}>
        You'll be redirected to enter your card details after placing your order.
        Your card information is never stored on our servers.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <CheckCircle size={11} color="#0284c7" />
        <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
          Secured by Stripe · 256-bit SSL encryption
        </span>
      </div>
    </div>
  )
}

// ─── Saved Address Selector (unchanged from original) ────────────────────────

function AddressSelector({
  addresses, selectedId, onSelect, onUseNew,
}: {
  addresses: UserAddress[]
  selectedId: number | null
  onSelect: (addr: UserAddress) => void
  onUseNew: () => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
          Saved Addresses
        </span>
        <Link href="/account/addresses" style={{ fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {addresses.map(addr => {
          const isSelected = selectedId === addr.id
          return (
            <button key={addr.id} onClick={() => onSelect(addr)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${isSelected ? '#db142e' : '#e5e7eb'}`,
              background: isSelected ? 'rgba(219,20,46,0.04)' : '#fff',
              textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 2px 12px rgba(219,20,46,0.1)' : 'none',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                border: `2px solid ${isSelected ? '#db142e' : '#d1d5db'}`,
                background: isSelected ? '#db142e' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {addr.label.toLowerCase().includes('work') ? <Briefcase size={12} /> : <Home size={12} />}
                    {' '}{addr.label}
                  </span>
                  {addr.is_default && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#db142e', background: 'rgba(219,20,46,0.08)', padding: '1px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Star size={8} fill="currentColor" /> Default
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{addr.wilaya}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addr.address}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} /> {addr.phone}</p>
              </div>
            </button>
          )
        })}
        <button onClick={onUseNew} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
          border: `2px dashed ${selectedId === null ? '#db142e' : '#e5e7eb'}`,
          background: selectedId === null ? 'rgba(219,20,46,0.03)' : '#fff',
          textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s ease',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(219,20,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={14} color="#db142e" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Use a different address</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Enter delivery details manually</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const isBuyNow    = searchParams.get('buy_now') === '1'
  const bnSlug      = isBuyNow ? (searchParams.get('product_slug') ?? null) : null
  const bnVariantId = isBuyNow ? (searchParams.get('variant_id') ? Number(searchParams.get('variant_id')) : null) : null
  const bnQuantity  = isBuyNow ? Math.max(1, Number(searchParams.get('quantity') ?? '1')) : 1

  const { items, count, subtotal, refreshCart } = useCart()

  // Buy Now product state
  const [bnProduct, setBnProduct] = useState<BuyNowProduct | null>(null)
  const [bnLoading, setBnLoading] = useState(isBuyNow && !!bnSlug)
  const [bnError,   setBnError]   = useState(false)
  const bnFetchedRef = useRef(false)

  // Address book state
  const [savedAddresses,   setSavedAddresses]   = useState<UserAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  // ── Payment method state ──────────────────────────────────────────────────
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod>('cod')
  const [walletBalance,   setWalletBalance]   = useState<number | null>(null)
  const [walletLoading,   setWalletLoading]   = useState(true)

  // ── Stripe post-order state ───────────────────────────────────────────────
  // After order created with method='card', we get order_id and redirect to Stripe
  const [pendingCardOrderId, setPendingCardOrderId] = useState<number | null>(null)
  const [stripeLoading,      setStripeLoading]      = useState(false)

  const [form, setForm]       = useState({ wilaya: '', address: '', phone: '', notes: '' })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ order_number: string; total: number; payment_method: PaymentMethod } | null>(null)
  const [apiError, setApiError] = useState('')

  // Auth redirect
  useEffect(() => {
    if (!isAuthenticated()) router.push('/auth/login?redirect=/checkout')
  }, [router])

  // Load wallet balance
  useEffect(() => {
    if (!isAuthenticated()) return
    setWalletLoading(true)
    walletApi.getBalance()
      .then(res => setWalletBalance(res.data.balance))
      .catch(() => setWalletBalance(0))
      .finally(() => setWalletLoading(false))
  }, [])

  // Load saved addresses
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

  // Fetch buy now product
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
    if (!form.wilaya.trim())  e.wilaya  = 'Please select your wilaya.'
    if (!form.address.trim()) e.address = 'Please enter your delivery address.'
    if (!form.phone.trim())   e.phone   = 'Please enter your phone number.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Derived values
  const bnVariant        = bnProduct?.variants?.find(v => v.id === bnVariantId) ?? null
  const bnEffectivePrice = bnVariant ? Number(bnVariant.price) : bnProduct ? Number(bnProduct.price) : 0
  const bnLineTotal      = bnEffectivePrice * bnQuantity
  const bnImage = (() => {
    if (!bnProduct) return null
    if (bnVariant && bnVariant.image_urls?.length > 0) return bnVariant.image_urls[0]
    const productImgs = (bnProduct.images ?? []).filter(i => !i.color_option_id).map(i => resolveImg(i.url ?? i.image_path)).filter(Boolean) as string[]
    if (productImgs.length > 0) return productImgs[0]
    return resolveImg(bnProduct.primary_image_url)
  })()

  const summarySubtotal = isBuyNow ? bnLineTotal : subtotal
  const summaryTotal    = summarySubtotal + 8

  const walletInsufficient = walletBalance !== null && walletBalance < summaryTotal

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')

    try {
      let res: any

      if (isBuyNow) {
        if (!bnProduct) throw new Error('Product data missing.')
        const payload: BuyNowPayload = {
          product_id:     bnProduct.id,
          quantity:       bnQuantity,
          wilaya:         form.wilaya,
          address:        form.address,
          phone:          form.phone,
          notes:          form.notes || undefined,
          payment_method: paymentMethod,
        }
        if (bnVariantId) payload.variant_id = bnVariantId
        res = await checkoutApi.buyNow(payload)
      } else {
        res = await checkoutApi.place({
          wilaya:         form.wilaya,
          address:        form.address,
          phone:          form.phone,
          notes:          form.notes || undefined,
          payment_method: paymentMethod,
        })
        await refreshCart()
      }

      // ── Card: create Stripe intent and redirect ───────────────────────
      if (paymentMethod === 'card' && res.needs_payment) {
        setPendingCardOrderId(res.order_id)
        setLoading(false)
        setStripeLoading(true)

        const intentRes = await paymentApi.createStripeIntent(res.order_id)

        // In production: use @stripe/stripe-js to confirm card payment
        // For now: redirect to Stripe Payment Link with the client_secret
        // Replace this URL with your actual Stripe Payment Link
        const stripeUrl = `https://checkout.stripe.com/c/pay/${intentRes.client_secret}`
        window.location.href = stripeUrl
        return
      }

      // ── COD / D17 / Wallet: show success screen ───────────────────────
      setSuccess({
        order_number:   res.order_number,
        total:          res.total,
        payment_method: paymentMethod,
      })

    } catch (err: any) {
      setApiError(err.message ?? 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    const isPendingPayment = success.payment_method === 'd17'
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isPendingPayment ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            {isPendingPayment
              ? <Smartphone size={36} color="#f59e0b" />
              : <CheckCircle size={36} color="#10b981" />}
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
            {isPendingPayment ? 'Order Placed — Awaiting Payment' : 'Order Confirmed!'}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 6px' }}>
            {isPendingPayment
              ? 'Please complete your D17 transfer to confirm your order.'
              : success.payment_method === 'wallet'
                ? 'Payment deducted from your wallet successfully.'
                : 'Thank you! Your order has been received.'}
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
            Order <strong style={{ color: '#0f172a' }}>{success.order_number}</strong>
            {' '}· Total: <strong style={{ color: '#dc2626' }}>{fmt(success.total)}</strong>
          </p>

          {isPendingPayment && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
              padding: '14px 16px', marginBottom: 20, textAlign: 'left',
            }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', margin: '0 0 8px' }}>
                Complete your D17 transfer:
              </p>
              <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 4px' }}>
                Amount: <strong>{fmt(success.total)}</strong>
              </p>
              <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 4px' }}>
                Account: <strong>71 234 567 (CHOOSE'Tounsi)</strong>
              </p>
              <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>
                Reference: <strong>{success.order_number}</strong>
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/orders" style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} /> View Orders
            </Link>
            <Link href="/shop" style={{ padding: '12px 24px', border: '1.5px solid #e5e7eb', color: '#374151', fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading / error guards (unchanged) ────────────────────────────────────

  if (isBuyNow && bnLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (isBuyNow && (bnError || !bnProduct)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Couldn't load product</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>← Back to Shop</Link>
        </div>
      </div>
    )
  }
  if (!isBuyNow && items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <ShoppingBag size={40} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Your cart is empty</p>
          <Link href="/shop" style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>← Back to Shop</Link>
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
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>Shop</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{isBuyNow ? 'Quick Checkout' : 'Checkout'}</span>
          </div>
        </div>

        {isBuyNow && (
          <div style={{ maxWidth: 1100, margin: '12px auto 0', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '8px 14px' }}>
              <Zap size={14} color="#dc2626" />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Quick Checkout — Buy this item instantly</p>
            </div>
          </div>
        )}

        <div className="co-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <form onSubmit={handleSubmit} style={{ animation: 'fadeUp 0.4s ease both', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Delivery Information ── */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Delivery Information</h2>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {apiError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                    {apiError}
                  </div>
                )}

                {addressesLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Loading saved addresses…
                  </div>
                )}

                {hasSavedAddresses && (
                  <AddressSelector
                    addresses={savedAddresses}
                    selectedId={selectedAddressId}
                    onSelect={handleSelectAddress}
                    onUseNew={handleUseNew}
                  />
                )}

                {showManualForm && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        Wilaya <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select value={form.wilaya} onChange={e => set('wilaya', e.target.value)}
                        style={{ width: '100%', border: `1.5px solid ${errors.wilaya ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: form.wilaya ? '#0f172a' : '#94a3b8', background: errors.wilaya ? '#fef2f2' : '#fff', outline: 'none' }}>
                        <option value="">— Select wilaya —</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      {errors.wilaya && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.wilaya}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        Full Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)}
                        placeholder="Street, building, floor, apartment…"
                        style={{ resize: 'none', border: `1.5px solid ${errors.address ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: errors.address ? '#fef2f2' : '#fff', outline: 'none', width: '100%' }} />
                      {errors.address && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.address}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        Phone Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                          placeholder="e.g. 20 123 456"
                          style={{ width: '100%', border: `1.5px solid ${errors.phone ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px 10px 34px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: errors.phone ? '#fef2f2' : '#fff', outline: 'none' }} />
                      </div>
                      {errors.phone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.phone}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                        Order Notes <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <FileText size={13} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                          placeholder="Special instructions, delivery notes…"
                          style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px 10px 34px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', resize: 'none' }} />
                      </div>
                    </div>
                  </>
                )}

                {hasSavedAddresses && selectedAddressId !== null && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={11} color="#10b981" /> Delivering to:
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{form.wilaya}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 2px' }}>{form.address}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}><Phone size={10} /> {form.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment Method ── */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={16} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Payment Method</h2>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* COD — always first, most trusted in Tunisia */}
                <PaymentMethodCard
                  method="cod"
                  selected={paymentMethod === 'cod'}
                  onSelect={() => setPaymentMethod('cod')}
                  icon={Truck}
                  label="Cash on Delivery"
                  description="Pay cash when your order arrives at your door."
                  badge="Most Popular"
                  badgeColor="#198f41"
                />

                {/* Wallet */}
                <PaymentMethodCard
                  method="wallet"
                  selected={paymentMethod === 'wallet'}
                  onSelect={() => !walletInsufficient && setPaymentMethod('wallet')}
                  disabled={walletLoading || walletInsufficient}
                  disabledReason={walletLoading ? 'Loading balance…' : `Insufficient balance (${fmt(walletBalance ?? 0)} available)`}
                  icon={Wallet}
                  label="Wallet"
                  description={walletLoading ? 'Checking balance…' : `Available balance: ${fmt(walletBalance ?? 0)}`}
                  badge={!walletLoading && !walletInsufficient ? 'Instant' : undefined}
                  badgeColor="#6366f1"
                />

                {/* D17 */}
                <PaymentMethodCard
                  method="d17"
                  selected={paymentMethod === 'd17'}
                  onSelect={() => setPaymentMethod('d17')}
                  icon={Smartphone}
                  label="D17"
                  description="Pay via D17 mobile app — confirmed by admin within 2 hours."
                  badge="Tunisian"
                  badgeColor="#0284c7"
                />

                {/* Card — Stripe */}
                <PaymentMethodCard
                  method="card"
                  selected={paymentMethod === 'card'}
                  onSelect={() => setPaymentMethod('card')}
                  icon={CreditCard}
                  label="Bank Card"
                  description="Pay securely with Visa or Mastercard via Stripe."
                  badge="Secure"
                  badgeColor="#7c3aed"
                />

                {/* Contextual panels — shown below the selector */}
                {paymentMethod === 'd17' && <D17Instructions total={summaryTotal} />}
                {paymentMethod === 'card' && <StripeNotice />}

              </div>
            </div>

            <Link href={isBuyNow ? `/products/${bnSlug ?? ''}` : '/shop'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={13} /> {isBuyNow ? 'Back to Product' : 'Continue Shopping'}
            </Link>
          </form>

          {/* ── RIGHT: Order Summary ── */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', position: 'sticky', top: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                {isBuyNow ? <Zap size={16} color="#dc2626" /> : <ShoppingBag size={16} color="#dc2626" />}
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {isBuyNow ? 'Quick Order Summary' : 'Order Summary'}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginLeft: 6 }}>
                    ({summaryCount} {summaryCount === 1 ? 'item' : 'items'})
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
                      {bnVariant && <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, margin: '2px 0 0' }}>{bnVariant.sku ? `SKU: ${bnVariant.sku}` : `Variant #${bnVariant.id}`}</p>}
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{bnQuantity} × {fmt(bnEffectivePrice)}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>{fmt(bnLineTotal)}</span>
                  </div>
                )}

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

              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(summarySubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Shipping</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(8)}</span>
                </div>

                {/* Payment method summary row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Payment</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'capitalize' }}>
                    {{
                      cod:    '🚚 Cash on Delivery',
                      card:   '💳 Bank Card',
                      d17:    '📱 D17',
                      wallet: '💰 Wallet',
                    }[paymentMethod]}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #f1f5f9', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total</span>
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
                    ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                        {stripeLoading ? 'Redirecting to Stripe…' : 'Placing order…'}</>
                    : paymentMethod === 'card'
                      ? <><CreditCard size={18} /> Pay with Card</>
                      : isBuyNow
                        ? <><Zap size={18} /> Place Order Now</>
                        : <><CheckCircle size={18} /> Place Order</>}
                </button>

                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                  {{
                    cod:    '🔒 Pay cash on delivery · Safe & easy',
                    card:   '🔒 Secured by Stripe · No card data stored',
                    d17:    '🔒 Confirmed by admin within 2 hours',
                    wallet: `🔒 Instant deduction from your wallet`,
                  }[paymentMethod]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}