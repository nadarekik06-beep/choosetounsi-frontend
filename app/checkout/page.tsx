'use client'

/**
 * app/checkout/page.tsx
 * Checkout page — shows cart items with variant labels, collects
 * delivery info, and places the order via POST /api/checkout.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, FileText, ChevronRight, Package,
  Loader2, CheckCircle, ShoppingBag, ArrowLeft,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { checkoutApi } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api$/, '')

function resolveImg(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n) + ' DT'

// Tunisia wilayas
const WILAYAS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { items, count, subtotal, refreshCart } = useCart()

  const [form, setForm] = useState({
    wilaya:  '',
    address: '',
    phone:   '',
    notes:   '',
  })

  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState<{ order_number: string; total: number } | null>(null)
  const [apiError, setApiError] = useState('')

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/checkout')
    }
  }, [router])

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.wilaya.trim())  e.wilaya  = 'Please select your wilaya.'
    if (!form.address.trim()) e.address = 'Please enter your delivery address.'
    if (!form.phone.trim())   e.phone   = 'Please enter your phone number.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')

    try {
      const res = await checkoutApi.place({
        wilaya:  form.wilaya,
        address: form.address,
        phone:   form.phone,
        notes:   form.notes || undefined,
      })
      setSuccess({ order_number: res.order_number, total: res.total })
      await refreshCart()
    } catch (err: any) {
      setApiError(err.message ?? 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Order Placed!</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 6px' }}>Thank you! Your order has been received.</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
            Order <strong style={{ color: '#0f172a' }}>{success.order_number}</strong> · Total: <strong style={{ color: '#dc2626' }}>{fmt(success.total)}</strong>
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/account/orders"
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} /> View Orders
            </Link>
            <Link href="/shop"
              style={{ padding: '12px 24px', border: '1.5px solid #e5e7eb', color: '#374151', fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Empty cart ─────────────────────────────────────────────────────────────

  if (items.length === 0) {
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

  // ── Checkout form ──────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
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
            <span style={{ color: '#374151', fontWeight: 600 }}>Checkout</span>
          </div>
        </div>

        <div className="co-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>

          {/* ── LEFT: Delivery form ── */}
          <form onSubmit={handleSubmit} style={{ animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 20 }}>
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

                {/* Wilaya */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                    Wilaya <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={form.wilaya}
                    onChange={e => set('wilaya', e.target.value)}
                    className={`co-input${errors.wilaya ? ' err' : ''}`}
                    style={{ width: '100%', border: `1.5px solid ${errors.wilaya ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: form.wilaya ? '#0f172a' : '#94a3b8', background: errors.wilaya ? '#fef2f2' : '#fff', outline: 'none' }}
                  >
                    <option value="">— Select wilaya —</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {errors.wilaya && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.wilaya}</p>}
                </div>

                {/* Address */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                    Full Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Street, building, floor, apartment…"
                    className={`co-input${errors.address ? ' err' : ''}`}
                    style={{ resize: 'none', border: `1.5px solid ${errors.address ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: errors.address ? '#fef2f2' : '#fff', outline: 'none', width: '100%' }}
                  />
                  {errors.address && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.address}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="e.g. 20 123 456"
                      style={{ width: '100%', border: `1.5px solid ${errors.phone ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px 10px 34px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: errors.phone ? '#fef2f2' : '#fff', outline: 'none' }}
                    />
                  </div>
                  {errors.phone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.phone}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6 }}>
                    Order Notes <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={13} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Special instructions, delivery notes…"
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px 10px 34px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', resize: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Back link */}
            <Link href="/shop"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600, textDecoration: 'none', marginBottom: 4 }}>
              <ArrowLeft size={13} /> Continue Shopping
            </Link>
          </form>

          {/* ── RIGHT: Order Summary ── */}
          <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', overflow: 'hidden', position: 'sticky', top: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingBag size={16} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Order Summary
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginLeft: 6 }}>({count} items)</span>
                </h2>
              </div>

              {/* Item list */}
              <div style={{ padding: '12px 20px', maxHeight: 360, overflowY: 'auto' }}>
                {items.map(item => {
                  const img = resolveImg(item.image_url)
                  const variantEntries = item.variant_options ? Object.values(item.variant_options) : []
                  return (
                    <div key={`${item.id}-${item.variant_id ?? 'base'}`}
                      style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        {img
                          ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#e2e8f0" /></div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </p>
                        {/* Variant badges */}
                        {item.variant_label && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                            {variantEntries.map((opt, i) =>
                              opt.color_hex ? (
                                <span key={i} title={opt.value}
                                  style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: opt.color_hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                              ) : (
                                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                                  {opt.value}
                                </span>
                              )
                            )}
                          </div>
                        )}
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 }}>
                          {item.quantity} × {fmt(item.price)}
                        </p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>
                        {fmt(item.line_total)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Shipping</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: subtotal >= 50 ? '#10b981' : '#0f172a' }}>
                    {subtotal >= 50 ? 'FREE' : 'Calculated at delivery'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #f1f5f9', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{fmt(subtotal)}</span>
                </div>

                {/* Place order button */}
                <button
                  onClick={handleSubmit as any}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 0',
                    background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color: loading ? '#9ca3af' : '#fff',
                    fontWeight: 800, fontSize: 15,
                    border: 'none', borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(220,38,38,0.3)',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading
                    ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Placing order…</>
                    : <><CheckCircle size={18} /> Place Order</>
                  }
                </button>

                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                  Cash on delivery · Your order is protected
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}