'use client'

/**
 * app/checkout/page.tsx
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { checkoutApi, type CheckoutPayload } from '@/lib/shopApi'
import { isAuthenticated } from '@/lib/auth'
import { ArrowLeft, CheckCircle, Loader2, MapPin, Phone, FileText, ShoppingBag } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' DT'

const WILAYAS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
]

export default function CheckoutPage() {
  const router  = useRouter()
  const { items, subtotal, count, refreshCart } = useCart()

  const [form, setForm] = useState<CheckoutPayload>({
    wilaya: '', address: '', phone: '', notes: '',
  })
  const [errors,  setErrors]  = useState<Partial<CheckoutPayload>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string; total: number } | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/auth/login?redirect=/checkout')
  }, [router])

  const set = (field: keyof CheckoutPayload, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<CheckoutPayload> = {}
    if (!form.wilaya.trim())  e.wilaya  = 'Please select your wilaya.'
    if (!form.address.trim()) e.address = 'Address is required.'
    if (!form.phone.trim())   e.phone   = 'Phone number is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate() || items.length === 0) return

    setLoading(true)
    try {
      const res = await checkoutApi.place(form)
      await refreshCart()
      setSuccess({ orderNumber: res.order_number, total: res.total })
    } catch (err: any) {
      const data = err?.data
      if (data?.errors) {
        // server validation errors
        const mapped: any = {}
        Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = (v as string[])[0] })
        setErrors(mapped)
      } else {
        alert(data?.message ?? 'Checkout failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '56px 40px', textAlign: 'center', maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111', margin: '0 0 8px' }}>Order Placed!</h1>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 16px' }}>Thank you for your purchase.</p>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 20px', marginBottom: 28, border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Order Number</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: '0 0 10px', fontFamily: 'monospace' }}>{success.orderNumber}</p>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Total: <strong style={{ color: '#dc2626' }}>{fmt(success.total)}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/orders" style={{
              flex: 1, padding: '12px 0', background: '#dc2626', color: '#fff',
              fontWeight: 800, fontSize: 14, borderRadius: 12, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              View Orders
            </Link>
            <Link href="/" style={{
              flex: 1, padding: '12px 0', border: '1px solid #e5e7eb', color: '#374151',
              fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500,
    border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 10, outline: 'none', background: err ? '#fff5f5' : '#fff',
    color: '#111', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        input:focus, select:focus, textarea:focus { border-color: #dc2626 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Barlow', sans-serif" }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
          <div style={{ maxWidth: 1060, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/cart" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Cart
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0 }}>Checkout</h1>
          </div>
        </div>

        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

          {/* ── Delivery form ── */}
          <form onSubmit={handleSubmit}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #eee', padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} color="#dc2626" />
                </div>
                <h2 style={{ fontWeight: 800, fontSize: 15, color: '#111', margin: 0 }}>Delivery Information</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Wilaya */}
                <div>
                  <label style={labelStyle}>Wilaya *</label>
                  <select
                    value={form.wilaya}
                    onChange={e => set('wilaya', e.target.value)}
                    style={{ ...inputStyle(errors.wilaya), cursor: 'pointer' }}
                  >
                    <option value="">— Select your wilaya —</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {errors.wilaya && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.wilaya}</p>}
                </div>

                {/* Address */}
                <div>
                  <label style={labelStyle}>Full Address *</label>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Street, building, apartment…"
                    style={{ ...inputStyle(errors.address), resize: 'none' }}
                  />
                  {errors.address && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.address}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={10} /> Phone *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    style={inputStyle(errors.phone)}
                  />
                  {errors.phone && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.phone}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={10} /> Order Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Any special instructions for delivery…"
                    style={{ ...inputStyle(), resize: 'none' }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              style={{
                width: '100%', padding: '15px 20px',
                background: loading || items.length === 0
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: loading || items.length === 0 ? '#9ca3af' : '#fff',
                fontWeight: 900, fontSize: 16, borderRadius: 14, border: 'none',
                cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: items.length > 0 ? '0 8px 28px rgba(220,38,38,0.32)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s ease',
              }}
            >
              {loading
                ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing…</>
                : <>Place Order · {fmt(subtotal)}</>
              }
            </button>
          </form>

          {/* ── Order summary ── */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #eee', padding: 24, position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <ShoppingBag size={16} color="#dc2626" />
              <h2 style={{ fontWeight: 800, fontSize: 15, color: '#111', margin: 0 }}>
                Order Summary ({count} items)
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto', marginBottom: 18 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                    background: '#f8fafc', flexShrink: 0, border: '1px solid #f1f5f9',
                  }}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={14} color="#cbd5e1" />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Qty: {item.quantity}</p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#dc2626', flexShrink: 0 }}>{fmt(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 700 }}>{fmt(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                <span>Shipping</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>Free</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #f1f5f9', marginTop: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: '#dc2626' }}>{fmt(subtotal)}</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 14, textAlign: 'center' }}>
              🔒 Your information is secure
            </p>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 360px"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}