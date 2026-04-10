// app/become-a-vendor/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Upload, CheckCircle, AlertCircle, ChevronDown,
  Loader2, User, ArrowRight, Zap, TrendingUp, Shield,
  Package, BarChart2, Brain, Check,
  Store, Globe, Clock, BadgeCheck,
  Flame, Crown, Leaf, Info, Lock,
} from 'lucide-react'
import { api, getUser, isAuthenticated } from '@/lib/auth'
import { subscriptionApi, ActivePlan } from '@/lib/subscriptionApi'
import SubscriptionUpgradePage from '@/app/components/seller/SubscriptionUpgradePage'
import Link from 'next/link'

// ── Constants ────────────────────────────────────────────────────────────────

const WILAYAS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Le Kef','Mahdia','La Manouba','Médenine','Monastir',
  'Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur',
  'Tunis','Zaghouan',
]

const CATEGORIES = [
  'Fashion & Clothing','Electronics & Tech','Home & Living','Food & Grocery',
  'Beauty & Personal Care','Health & Wellness','Sports & Outdoors',
  'Arts & Crafts','Books & Stationery','Kids & Baby','Automotive','Other',
]

// ── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'green',
    name: 'Green Pepper',
    price: 0,
    priceLabel: 'Free',
    priceSub: 'forever',
    commission: '12% – 20%',
    commissionNote: 'per sale',
    maxProducts: 30,
    target: 'Perfect for beginners',
    badge: null as string | null,
    color: '#198f41',
    bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderColor: '#86efac',
    accentColor: '#15803d',
    Icon: Leaf,
    dark: false,
    ctaLabel: 'Start for Free',
    features: [
      { text: 'Up to 30 products',             ok: true  },
      { text: 'Basic seller dashboard',         ok: true  },
      { text: 'Coupon creation',                ok: true  },
      { text: 'Flash sales',                    ok: true  },
      { text: 'Access to sponsoring system',    ok: true  },
      { text: 'AI tools',                       ok: false },
      { text: 'Advanced analytics',             ok: false },
      { text: 'Priority support',               ok: false },
    ],
  },
  {
    key: 'red',
    name: 'Red Pepper',
    price: 49,
    priceLabel: '49 DT',
    priceSub: 'per month',
    commission: '6% – 10%',
    commissionNote: 'per sale',
    maxProducts: 150,
    target: 'Growing businesses',
    badge: 'MOST POPULAR' as string | null,
    color: '#db142e',
    bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    borderColor: '#fca5a5',
    accentColor: '#dc2626',
    Icon: Flame,
    dark: false,
    ctaLabel: 'Get Red Pepper',
    features: [
      { text: 'Up to 150 products',             ok: true  },
      { text: 'Advanced dashboard',             ok: true  },
      { text: 'Coupons + Flash sales',          ok: true  },
      { text: 'Price Optimization AI',          ok: true  },
      { text: 'Sales Prediction AI',            ok: true  },
      { text: 'Product Description Generator',  ok: true  },
      { text: 'Basic Recommendations AI',       ok: true  },
      { text: 'VIP Support & promotions',       ok: false },
    ],
  },
  {
    key: 'black',
    name: 'Black Pepper',
    price: 129,
    priceLabel: '129 DT',
    priceSub: 'per month',
    commission: '3% – 5%',
    commissionNote: 'per sale',
    maxProducts: null as number | null,
    target: 'Serious sellers',
    badge: 'BEST VALUE' as string | null,
    color: '#0f172a',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderColor: '#334155',
    accentColor: '#f59e0b',
    Icon: Crown,
    dark: true,
    ctaLabel: 'Get Black Pepper',
    features: [
      { text: 'Unlimited products',             ok: true },
      { text: 'Everything in Red Pepper',       ok: true },
      { text: 'Homepage visibility boost',      ok: true },
      { text: '3 free sponsored products/week', ok: true },
      { text: 'Trend Detection AI',             ok: true },
      { text: 'Inventory AI',                   ok: true },
      { text: 'Reels & product shoots',         ok: true },
      { text: 'Instagram / TikTok promotion',   ok: true },
    ],
  },
]

const RULES = [
  {
    icon: BadgeCheck,
    title: 'Product Quality',
    color: '#198f41',
    points: [
      'All products must be authentic and as described',
      'Clear photos with white or neutral background',
      'Accurate sizing charts and dimensions',
      'No counterfeit or replica products',
    ],
  },
  {
    icon: Shield,
    title: 'Prohibited Products',
    color: '#dc2626',
    points: [
      'Weapons, drugs, or illegal substances',
      'Counterfeit branded goods',
      'Adult content or explicit material',
      'Products that violate Tunisian law',
    ],
  },
  {
    icon: Clock,
    title: 'Order Fulfilment',
    color: '#f59e0b',
    points: [
      'Ship within 48h of order confirmation',
      'Maintain ≥ 90% on-time delivery rate',
      'Respond to buyer messages within 24h',
      'Handle returns within 7 days',
    ],
  },
  {
    icon: Globe,
    title: 'Commission & Payments',
    color: '#6366f1',
    points: [
      'Green plan: 12–20% commission per sale',
      'Red plan: 6–10% commission per sale',
      'Black plan: 3–5% commission per sale',
      'Payouts processed every 14 days',
    ],
  },
]

const BENEFITS = [
  { icon: Store,      title: '12,000+ Active Buyers',    desc: "Access Tunisia's fastest-growing marketplace" },
  { icon: TrendingUp, title: 'Avg. 340% Revenue Growth', desc: 'Sellers report growth within 3 months' },
  { icon: Zap,        title: 'Launch in 24 Hours',       desc: 'Simple onboarding, start selling fast' },
  { icon: Brain,      title: 'AI-Powered Tools',         desc: 'Price optimization, trend detection & more' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(err?: string) {
  return (
    'w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 ' +
    'outline-none transition-all duration-200 bg-white/90 backdrop-blur-sm ' +
    (err
      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100')
  )
}

function Field({ label, id, error, children }: {
  label: string; id: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  full_name: string
  phone_number: string
  business_name: string
  business_category: string
  business_description: string
  wilaya: string
  city: string
  facebook_url: string
  instagram_url: string
  website_url: string
}

// ── Locked Plan Modal ────────────────────────────────────────────────────────

function LockedPlanModal({
  planKey,
  onClose,
  onScrollToForm,
}: {
  planKey: 'red' | 'black'
  onClose: () => void
  onScrollToForm: () => void
}) {
  const isRed = planKey === 'red'
  const PlanIcon = isRed ? Flame : Crown
  const planName = isRed ? 'Red Pepper' : 'Black Pepper'
  const planPrice = isRed ? '49 DT/month' : '129 DT/month'
  const accentColor = isRed ? '#dc2626' : '#f59e0b'
  const darkBg = !isRed

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'modalBackdropIn 0.22s ease both',
      }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden',
          boxShadow: `0 40px 80px rgba(0,0,0,0.4), 0 8px 24px ${accentColor}30`,
          animation: 'modalCardIn 0.28s cubic-bezier(.34,1.56,.64,1) both',
          border: `2px solid ${accentColor}40`,
          background: darkBg
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'white',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: isRed
            ? 'linear-gradient(90deg, #db142e, #ff4060)'
            : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
        }} />

        {/* Header */}
        <div style={{
          padding: '28px 28px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          {/* Plan icon + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: darkBg ? `${accentColor}20` : `${accentColor}12`,
              border: `1.5px solid ${accentColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PlanIcon size={26} color={accentColor} />
            </div>
            <div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: accentColor, marginBottom: 3,
              }}>
                {planName}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: '1.5rem', lineHeight: 1,
                color: darkBg ? 'white' : '#111',
              }}>
                {planPrice}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: darkBg ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = darkBg ? 'rgba(255,255,255,0.15)' : '#e5e7eb')}
            onMouseLeave={e => (e.currentTarget.style.background = darkBg ? 'rgba(255,255,255,0.08)' : '#f3f4f6')}
          >
            <X size={15} color={darkBg ? 'rgba(255,255,255,0.6)' : '#6b7280'} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 28px' }}>
          {/* Lock icon + message */}
          <div style={{
            display: 'flex', gap: 14, padding: '16px',
            borderRadius: 14, marginBottom: 20,
            background: darkBg ? 'rgba(255,255,255,0.05)' : '#f8f8f6',
            border: `1px solid ${darkBg ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={17} color="#db142e" />
            </div>
            <div>
              <p style={{
                margin: '0 0 5px', fontWeight: 800, fontSize: '0.88rem',
                color: darkBg ? 'white' : '#111',
              }}>
                Approval required first
              </p>
              <p style={{
                margin: 0, fontSize: '0.78rem', lineHeight: 1.55,
                color: darkBg ? 'rgba(255,255,255,0.5)' : '#6b7280',
              }}>
                You need to be approved as a <strong style={{ color: '#198f41' }}>Green Pepper</strong> seller before you can upgrade to{' '}
                <strong style={{ color: accentColor }}>{planName}</strong>.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 24 }}>
            {[
              { num: 1, label: 'Apply with the free Green Pepper plan', done: false },
              { num: 2, label: 'Get approved by our team (2–3 business days)', done: false },
              { num: 3, label: `Upgrade to ${planName} instantly`, done: false },
            ].map(({ num, label }) => (
              <div key={num} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0',
                borderBottom: num < 3 ? `1px solid ${darkBg ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` : 'none',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: num === 3 ? `${accentColor}15` : 'rgba(25,143,65,0.12)',
                  border: `1.5px solid ${num === 3 ? `${accentColor}40` : 'rgba(25,143,65,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900, fontSize: '0.8rem',
                  color: num === 3 ? accentColor : '#198f41',
                }}>
                  {num}
                </div>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  color: darkBg ? 'rgba(255,255,255,0.7)' : '#374151',
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => { onClose(); onScrollToForm() }}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg, #198f41, #15803d)',
                color: 'white', fontSize: '0.88rem', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 6px 20px rgba(25,143,65,0.4)',
                transition: 'filter 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.07)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
            >
              <Leaf size={15} />
              Apply with Green Pepper — Free
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '11px 20px', borderRadius: 13,
                background: 'transparent',
                border: `1.5px solid ${darkBg ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                color: darkBg ? 'rgba(255,255,255,0.45)' : '#9ca3af',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = darkBg ? 'rgba(255,255,255,0.25)' : '#d1d5db'
                e.currentTarget.style.color = darkBg ? 'rgba(255,255,255,0.7)' : '#6b7280'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = darkBg ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
                e.currentTarget.style.color = darkBg ? 'rgba(255,255,255,0.45)' : '#9ca3af'
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
        </div>
      </div>
    )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BecomeVendorPage() {
  const router  = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  // ── Seller state detection ─────────────────────────────────────────────────
  const [sellerState, setSellerState] = useState<{
    checked: boolean
    isApprovedSeller: boolean
    currentPlan: ActivePlan
  }>({ checked: false, isApprovedSeller: false, currentPlan: 'free' })

  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)

  // ── Modal state ────────────────────────────────────────────────────────────
  const [lockedModal, setLockedModal] = useState<'red' | 'black' | null>(null)

  const [form, setForm] = useState<FormState>(() => {
    const user = typeof window !== 'undefined' ? getUser() : null
    return {
      full_name:            user?.name ?? '',
      phone_number:         '',
      business_name:        '',
      business_category:    '',
      business_description: '',
      wilaya:               '',
      city:                 '',
      facebook_url:         '',
      instagram_url:        '',
      website_url:          '',
    }
  })

  const [namePrefilled]                            = useState<boolean>(() => !!(typeof window !== 'undefined' ? getUser()?.name : null))
  const [profilePic,        setProfilePic]         = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview]  = useState<string | null>(null)
  const [sampleImages,      setSampleImages]       = useState<File[]>([])
  const [samplePreviews,    setSamplePreviews]     = useState<string[]>([])
  const profileRef = useRef<HTMLInputElement>(null)
  const samplesRef = useRef<HTMLInputElement>(null)

  // ── Mount + auth + seller state check ─────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/become-a-vendor')
      return
    }
    subscriptionApi.getStatus()
      .then(status => {
        if (status?.status === 'approved') {
          setSellerState({
            checked:          true,
            isApprovedSeller: true,
            currentPlan:      (status.plan as ActivePlan) ?? 'free',
          })
        } else {
          setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
        }
      })
      .catch(() => {
        setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
      })
  }, [router])

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockedModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Green Pepper CTA — scroll to form ─────────────────────────────────────
  const handleGreenClick = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    }

  const handleProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfilePic(file)
    setProfilePicPreview(URL.createObjectURL(file))
  }

  const handleSamples = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    if (sampleImages.length + incoming.length > 5) { setError('Maximum 5 sample images allowed.'); return }
    const combined = [...sampleImages, ...incoming]
    setSampleImages(combined)
    setSamplePreviews(combined.map(f => URL.createObjectURL(f)))
    setError(null)
  }

  const removeSample = (idx: number) => {
    setSampleImages(prev => prev.filter((_, i) => i !== idx))
    setSamplePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {}
    if (s === 1) {
      if (!form.full_name.trim())     errs.full_name = 'Full name is required.'
      if (!form.phone_number.trim())  errs.phone_number = 'Phone number is required.'
      if (!form.business_name.trim()) errs.business_name = 'Business name is required.'
      if (!form.business_category)    errs.business_category = 'Please select a category.'
      if (form.business_description.trim().length < 30)
        errs.business_description = 'Please describe your business (at least 30 characters).'
    }
    if (s === 2) {
      if (!form.wilaya)      errs.wilaya = 'Please select your wilaya.'
      if (!form.city.trim()) errs.city   = 'City is required.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validateStep(step)) setStep(s => (s < 3 ? (s + 1) as 1|2|3 : s)) }
  const prev = () => setStep(s => (s > 1 ? (s - 1) as 1|2|3 : s))

  const handleSubmit = async () => {
    if (!validateStep(step)) return
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      fd.append('preferred_plan', 'green') // non-sellers always submit as green
      if (profilePic) fd.append('profile_picture', profilePic)
      sampleImages.forEach(f => fd.append('sample_images[]', f))
      await api.post('/seller-applications', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, unknown> } } }
      const msg = e?.response?.data?.message ?? 'Something went wrong. Please try again.'
      setError(msg)
      const be = e?.response?.data?.errors ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(be).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v) })
      if (Object.keys(mapped).length) setErrors(mapped)
    } finally { setLoading(false) }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!mounted || !sellerState.checked) return null

  // CASE 2: Approved seller → show upgrade page with Red / Black options
  if (sellerState.isApprovedSeller) {
    return (
      <SubscriptionUpgradePage
        currentPlan={sellerState.currentPlan}
        onUpgradeSuccess={(newPlan: 'red' | 'black') => {
          setSellerState(prev => ({ ...prev, currentPlan: newPlan }))
        }}
      />
    )
  }

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily:"'Barlow Condensed',sans-serif" }}>
            APPLICATION SUBMITTED!
          </h1>
          <p className="text-gray-500 leading-relaxed mb-2">
            Your application has been received and is under review.
          </p>
          <p className="text-gray-500 leading-relaxed mb-2">
            You&#39;ll start on the <span className="font-bold text-green-600">Free (Green Pepper) plan</span> while our team reviews your store (2–3 business days).
          </p>
          <p className="text-gray-400 text-sm mt-3 mb-8">
            Once approved, you&#39;ll be able to upgrade to Red or Black Pepper anytime from this page.
          </p>
          <Link href="/" className="inline-block px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-colors">
            Back to Homepage
          </Link>
        </div>
      </div>
    )
  }

  // ── CASE 1: Non-seller → Full page with all 3 plans visible ───────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(219,20,46,0.35)} 70%{box-shadow:0 0 0 14px rgba(219,20,46,0)} 100%{box-shadow:0 0 0 0 rgba(219,20,46,0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalBackdropIn { from{opacity:0} to{opacity:1} }
        @keyframes modalCardIn { from{opacity:0;transform:scale(0.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .bv-hero    { font-family:'Barlow',sans-serif; }
        .bv-display { font-family:'Barlow Condensed',sans-serif; }
        .fade-up-1  { animation:fadeUp 0.6s ease 0.05s both; }
        .fade-up-2  { animation:fadeUp 0.6s ease 0.15s both; }
        .fade-up-3  { animation:fadeUp 0.6s ease 0.25s both; }
        .fade-up-4  { animation:fadeUp 0.6s ease 0.35s both; }

        /* All plan cards — same interactive style */
        .plan-card {
          position: relative; border-radius: 24px; overflow: hidden; will-change: transform;
          cursor: pointer;
          transition: transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.28s ease, border-color 0.2s ease;
        }
        .plan-card-green:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 32px 64px rgba(25,143,65,0.25), 0 8px 24px rgba(25,143,65,0.15);
          border-color: #16a34a !important;
        }
        .plan-card-red:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 32px 64px rgba(219,20,46,0.22), 0 8px 24px rgba(219,20,46,0.13);
          border-color: #dc2626 !important;
        }
        .plan-card-black:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 32px 64px rgba(245,158,11,0.2), 0 8px 20px rgba(0,0,0,0.3);
          border-color: #f59e0b !important;
        }

        .badge-popular {
          background: linear-gradient(90deg, #dc2626, #ff4060); color: white;
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.12em;
          padding: 4px 10px; border-radius: 99px;
          animation: pulse-ring 2s ease-in-out infinite;
        }
        .badge-value {
          background: linear-gradient(90deg, #f59e0b, #fbbf24); color: #0f172a;
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.12em;
          padding: 4px 10px; border-radius: 99px;
        }
        .rule-card {
          background: white; border-radius: 16px; padding: 24px; border: 1.5px solid #e5e7eb;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .rule-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .benefit-item {
          display: flex; align-items: flex-start; gap: 16px; padding: 20px;
          background: rgba(255,255,255,0.08); border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12); transition: background 0.2s ease;
        }
        .benefit-item:hover { background: rgba(255,255,255,0.14); }
        .form-section {
          background: white; border-radius: 28px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; transition: all 0.25s ease;
        }
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 200px 200px;
        }
      `}</style>

      {/* ── Modal (portal-like, fixed overlay) ── */}
      {lockedModal && (
        <LockedPlanModal
          planKey={lockedModal}
          onClose={() => setLockedModal(null)}
          onScrollToForm={handleGreenClick}
        />
      )}

      <div className="bv-hero min-h-screen" style={{ background: '#f8f8f6' }}>
        <div className="grain" />

        {/* ══ HERO ══ */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)', minHeight: '520px' }}>
          <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(219,20,46,0.18) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(25,143,65,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg, #db142e 0%, #198f41 50%, #db142e 100%)' }} />
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
            <div className="fade-up-1 inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full" style={{ background:'rgba(219,20,46,0.15)', border:'1px solid rgba(219,20,46,0.3)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#db142e', display:'inline-block' }} />
              <span style={{ color:'#fca5a5', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase' }}>Choosetounsi Seller Program</span>
            </div>
            <h1 className="bv-display fade-up-2 text-white font-black leading-none mb-6" style={{ fontSize:'clamp(2.8rem,7vw,5.5rem)', letterSpacing:'-0.02em' }}>
              SELL TO ALL <span style={{ color:'#db142e' }}>TUNISIA</span>
              <br />
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.62em' }}>FROM YOUR PHONE</span>
            </h1>
            <p className="fade-up-3 mx-auto text-lg leading-relaxed mb-10" style={{ color:'rgba(255,255,255,0.6)', maxWidth:520 }}>
              Join <span style={{ color:'#fff', fontWeight:700 }}>450+ local sellers</span> already growing their business on the fastest-growing Tunisian marketplace.
            </p>
            <div className="fade-up-4 flex flex-wrap justify-center gap-3 mb-12">
              {['12,000+ Active Buyers', '24h Setup', 'AI-Powered Tools', 'Free Plan Available'].map(t => (
                <span key={t} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)' }}>
                  ✓ {t}
                </span>
              ))}
            </div>
            <div className="fade-up-4 flex flex-wrap justify-center gap-12">
              {[['450+','Active Sellers'],['12K+','Monthly Buyers'],['340%','Avg. Growth'],['24h','Avg. Setup']].map(([num, label]) => (
                <div key={label} className="text-center">
                  <div className="bv-display font-black text-white" style={{ fontSize:'2.2rem', lineHeight:1 }}>{num}</div>
                  <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ BENEFITS ROW ══ */}
        <div style={{ background:'#db142e' }}>
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="benefit-item">
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={20} color="white" />
                </div>
                <div>
                  <div style={{ color:'white', fontWeight:800, fontSize:'0.85rem', lineHeight:1.2, marginBottom:3 }}>{title}</div>
                  <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.72rem', lineHeight:1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RULES ══ */}
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span style={{ color:'#db142e', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase' }}>Before You Start</span>
            <h2 className="bv-display font-black text-gray-900 mt-2" style={{ fontSize:'clamp(2rem,4vw,3rem)', letterSpacing:'-0.02em' }}>PLATFORM RULES & STANDARDS</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">We maintain high standards to protect buyers and sellers. By applying you agree to these terms.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {RULES.map(({ icon: Icon, title, color, points }) => (
              <div key={title} className="rule-card">
                <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ fontWeight:800, fontSize:'0.9rem', color:'#111', marginBottom:10 }}>{title}</h3>
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:7 }}>
                  {points.map(p => (
                    <li key={p} style={{ display:'flex', alignItems:'flex-start', gap:7, fontSize:'0.75rem', color:'#555', lineHeight:1.5 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:color, marginTop:5, flexShrink:0 }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ══ PRICING — all 3 plans fully styled ══ */}
        <div style={{ background:'linear-gradient(180deg, #f8f8f6 0%, #f0f0ee 100%)', padding:'60px 0 80px' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <span style={{ color:'#db142e', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase' }}>Choose Your Plan</span>
              <h2 className="bv-display font-black text-gray-900 mt-2" style={{ fontSize:'clamp(2rem,4vw,3.2rem)', letterSpacing:'-0.02em' }}>🌶️ THREE PLANS, ONE MARKET</h2>
              <p className="text-gray-500 mt-3">Start free and upgrade anytime after approval.</p>
              <div className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full"
                style={{ background: 'rgba(25,143,65,0.08)', border: '1px solid rgba(25,143,65,0.22)' }}>
                <Info size={14} color="#198f41" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#198f41' }}>
                  All sellers start with the free plan — upgrade after approval
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {PLANS.map((plan) => {
                const { Icon } = plan
                const isLocked = plan.key !== 'green'

                return (
                  <div
                    key={plan.key}
                    className={`plan-card plan-card-${plan.key}`}
                    style={{
                      background: plan.bgGradient,
                      border: `2px solid ${plan.borderColor}`,
                    }}
                    onClick={
                      isLocked
                        ? () => setLockedModal(plan.key as 'red' | 'black')
                        : handleGreenClick
                    }
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div style={{ position:'absolute', top:16, right:16, zIndex:2 }}>
                        <span className={plan.badge === 'MOST POPULAR' ? 'badge-popular' : 'badge-value'}>
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div style={{ padding:'28px 24px' }}>
                      {/* Icon + name */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background: plan.dark ? 'rgba(245,158,11,0.15)' : `${plan.accentColor}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Icon size={22} color={plan.dark ? '#f59e0b' : plan.accentColor} />
                        </div>
                        <div>
                          <div style={{ fontWeight:900, fontSize:'1rem', color: plan.dark ? 'white' : '#111', lineHeight:1 }}>{plan.name}</div>
                          <div style={{ fontSize:'0.68rem', color: plan.dark ? 'rgba(255,255,255,0.45)' : '#888', marginTop:2 }}>{plan.target}</div>
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ marginBottom:16 }}>
                        <span className="bv-display" style={{ fontSize:'2.8rem', fontWeight:900, color: plan.dark ? 'white' : '#111', lineHeight:1 }}>{plan.priceLabel}</span>
                        <span style={{ fontSize:'0.78rem', color: plan.dark ? 'rgba(255,255,255,0.45)' : '#888', marginLeft:6 }}>/{plan.priceSub}</span>
                      </div>

                      {/* Commission */}
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background: plan.dark ? 'rgba(245,158,11,0.12)' : `${plan.accentColor}12`, borderRadius:8, padding:'6px 10px', marginBottom:18 }}>
                        <BarChart2 size={13} color={plan.dark ? '#f59e0b' : plan.accentColor} />
                        <span style={{ fontSize:'0.75rem', fontWeight:700, color: plan.dark ? '#f59e0b' : plan.accentColor }}>{plan.commission} commission</span>
                      </div>

                      {/* Max products */}
                      <div style={{ fontSize:'0.75rem', color: plan.dark ? 'rgba(255,255,255,0.5)' : '#888', marginBottom:18, display:'flex', alignItems:'center', gap:5 }}>
                        <Package size={13} color={plan.dark ? 'rgba(255,255,255,0.35)' : '#aaa'} />
                        {plan.maxProducts ? `Up to ${plan.maxProducts} products` : 'Unlimited products'}
                      </div>

                      {/* Features */}
                      <ul style={{ listStyle:'none', padding:0, margin:'0 0 22px', display:'flex', flexDirection:'column', gap:8 }}>
                        {plan.features.map(f => (
                          <li key={f.text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color: f.ok ? (plan.dark ? 'rgba(255,255,255,0.85)' : '#333') : (plan.dark ? 'rgba(255,255,255,0.2)' : '#ccc') }}>
                            {f.ok
                              ? <Check size={14} color={plan.dark ? '#f59e0b' : plan.accentColor} style={{ flexShrink:0 }} />
                              : <X size={14} style={{ flexShrink:0 }} />}
                            <span style={{ textDecoration: f.ok ? 'none' : 'line-through' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA button — all plans have a real styled button */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (isLocked) {
                            setLockedModal(plan.key as 'red' | 'black')
                          } else {
                            handleGreenClick()
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          width: '100%', padding: '14px 24px', borderRadius: 14,
                          background: plan.dark
                            ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                            : `linear-gradient(135deg, ${plan.accentColor}, ${plan.accentColor}dd)`,
                          color: plan.dark ? '#0f172a' : 'white',
                          fontSize: '0.85rem', fontWeight: 800,
                          border: 'none', cursor: 'pointer',
                          fontFamily: 'Barlow, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase',
                          boxShadow: plan.key === 'green'
                            ? '0 8px 24px rgba(25,143,65,0.35)'
                            : plan.key === 'red'
                            ? '0 8px 24px rgba(219,20,46,0.3)'
                            : '0 8px 24px rgba(245,158,11,0.3)',
                          transition: 'transform 0.18s ease, filter 0.18s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.07)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
                      >
                        {plan.ctaLabel} <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">
              💡 All plans include: Seller dashboard · Order management · Buyer messaging · Analytics
            </p>
          </div>
        </div>

        {/* ══ FORM ══ */}
        <div ref={formRef} className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <span style={{ color:'#db142e', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase' }}>Apply Now</span>
            <h2 className="bv-display font-black text-gray-900 mt-2" style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-0.02em' }}>COMPLETE YOUR APPLICATION</h2>
            <p className="text-gray-500 mt-3 text-sm">Fill in your business details below. Our team reviews applications within 2–3 business days.</p>
          </div>

          <div className="form-section">
            {/* Progress */}
            <div style={{ padding:'24px 28px', borderBottom:'1px solid #f0f0f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {([1,2,3] as const).map(s => (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="step-dot" style={{ background: step===s ? '#db142e' : step>s ? '#198f41' : '#f0f0f0', color: step>=s ? 'white' : '#999', boxShadow: step===s ? '0 4px 14px rgba(219,20,46,0.35)' : 'none' }}>
                      {step > s ? '✓' : s}
                    </div>
                    {s < 3 && <div style={{ height:2, width:36, background: step>s ? '#198f41' : '#e5e7eb', borderRadius:1, transition:'background 0.3s' }} />}
                  </div>
                ))}
                <span style={{ marginLeft:8, fontSize:'0.78rem', color:'#999', fontWeight:600 }}>
                  {step===1 ? 'Business Info' : step===2 ? 'Location' : 'Media & Socials'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:18 }}>
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" id="full_name" error={errors.full_name}>
                      <div style={{ position:'relative' }}>
                        <input id="full_name" type="text" placeholder="Your full name" value={form.full_name} onChange={handleChange('full_name')} className={inputCls(errors.full_name) + (namePrefilled ? ' pr-12' : '')} />
                        {namePrefilled && (
                          <div style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:3, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:99, padding:'2px 7px' }}>
                              <User size={9} color="#16a34a" />
                              <span style={{ fontSize:9, fontWeight:800, color:'#16a34a' }}>Auto</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Field>
                    <Field label="Phone Number" id="phone_number" error={errors.phone_number}>
                      <input id="phone_number" type="tel" placeholder="+216 XX XXX XXX" value={form.phone_number} onChange={handleChange('phone_number')} className={inputCls(errors.phone_number)} />
                    </Field>
                  </div>
                  <Field label="Business Name" id="business_name" error={errors.business_name}>
                    <input id="business_name" type="text" placeholder="Your shop or brand name" value={form.business_name} onChange={handleChange('business_name')} className={inputCls(errors.business_name)} />
                  </Field>
                  <Field label="Business Category" id="business_category" error={errors.business_category}>
                    <div style={{ position:'relative' }}>
                      <select id="business_category" value={form.business_category} onChange={handleChange('business_category')} className={inputCls(errors.business_category) + ' appearance-none pr-10'}>
                        <option value="">Select a category…</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={15} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#aaa', pointerEvents:'none' }} />
                    </div>
                  </Field>
                  <Field label="Business Description" id="business_description" error={errors.business_description}>
                    <textarea id="business_description" rows={4} placeholder="Tell us about your business, what you sell, and your story…" value={form.business_description} onChange={handleChange('business_description')} className={inputCls(errors.business_description) + ' resize-none'} />
                    <span style={{ fontSize:'0.72rem', color:'#bbb', textAlign:'right' }}>{form.business_description.length} / 2000</span>
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px' }}>
                    <p style={{ fontSize:'0.78rem', color:'#dc2626', fontWeight:600, margin:0 }}>📍 Your location helps buyers find local vendors near them.</p>
                  </div>
                  <Field label="Wilaya" id="wilaya" error={errors.wilaya}>
                    <div style={{ position:'relative' }}>
                      <select id="wilaya" value={form.wilaya} onChange={handleChange('wilaya')} className={inputCls(errors.wilaya) + ' appearance-none pr-10'}>
                        <option value="">Select your wilaya…</option>
                        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <ChevronDown size={15} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#aaa', pointerEvents:'none' }} />
                    </div>
                  </Field>
                  <Field label="City / Delegation" id="city" error={errors.city}>
                    <input id="city" type="text" placeholder="e.g. La Marsa, Sfax Ville…" value={form.city} onChange={handleChange('city')} className={inputCls(errors.city)} />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>Profile Picture <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label>
                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <div onClick={() => profileRef.current?.click()} style={{ width:72, height:72, borderRadius:16, border:'2px dashed #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', background:'#fafafa' }}>
                        {profilePicPreview ? <img src={profilePicPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Upload size={20} color="#d1d5db" />}
                      </div>
                      <div>
                        <button type="button" onClick={() => profileRef.current?.click()} style={{ color:'#db142e', fontWeight:700, fontSize:'0.85rem', background:'none', border:'none', cursor:'pointer' }}>
                          {profilePic ? 'Change photo' : 'Upload photo'}
                        </button>
                        <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'2px 0 0' }}>JPG, PNG or WebP · max 4MB</p>
                      </div>
                    </div>
                    <input ref={profileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleProfilePic} />
                  </div>

                  <div>
                    <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Product Samples <span style={{ color:'#9ca3af', fontWeight:400 }}>(up to 5, optional)</span></label>
                    <p style={{ fontSize:'0.72rem', color:'#9ca3af', marginBottom:12, marginTop:0 }}>Show buyers what kind of products you&#39;ll sell</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                      {samplePreviews.map((src, i) => (
                        <div key={i} style={{ position:'relative', width:68, height:68, borderRadius:12, overflow:'hidden', border:'1.5px solid #e5e7eb' }}>
                          <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          <button type="button" onClick={() => removeSample(i)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, border:'none', cursor:'pointer', transition:'opacity 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity='1')} onMouseLeave={e => (e.currentTarget.style.opacity='0')}>
                            <X size={14} color="white" />
                          </button>
                        </div>
                      ))}
                      {sampleImages.length < 5 && (
                        <div onClick={() => samplesRef.current?.click()} style={{ width:68, height:68, borderRadius:12, border:'2px dashed #e5e7eb', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#fafafa' }}>
                          <Upload size={14} color="#d1d5db" />
                          <span style={{ fontSize:'0.65rem', color:'#d1d5db', marginTop:3 }}>Add</span>
                        </div>
                      )}
                    </div>
                    <input ref={samplesRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleSamples} />
                  </div>

                  <div>
                    <p style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', marginBottom:12 }}>Social Media <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></p>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <Field label="Facebook URL" id="facebook_url">
                        <input id="facebook_url" type="url" placeholder="https://facebook.com/yourbusiness" value={form.facebook_url} onChange={handleChange('facebook_url')} className={inputCls()} />
                      </Field>
                      <Field label="Instagram URL" id="instagram_url">
                        <input id="instagram_url" type="url" placeholder="https://instagram.com/yourbusiness" value={form.instagram_url} onChange={handleChange('instagram_url')} className={inputCls()} />
                      </Field>
                      <Field label="Website URL" id="website_url">
                        <input id="website_url" type="url" placeholder="https://yourbusiness.tn" value={form.website_url} onChange={handleChange('website_url')} className={inputCls()} />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px' }}>
                  <AlertCircle size={15} color="#dc2626" style={{ flexShrink:0 }} />
                  <p style={{ fontSize:'0.78rem', color:'#dc2626', margin:0 }}>{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'18px 28px', borderTop:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.75rem', color:'#9ca3af' }}>Step {step} of 3</span>
              <div style={{ display:'flex', gap:10 }}>
                {step > 1 && (
                  <button type="button" onClick={prev} style={{ padding:'10px 20px', borderRadius:12, border:'1.5px solid #e5e7eb', fontSize:'0.82rem', fontWeight:700, color:'#555', background:'white', cursor:'pointer', fontFamily:'Barlow,sans-serif' }}>
                    ← Back
                  </button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={next} style={{ padding:'10px 24px', borderRadius:12, background:'#db142e', color:'white', fontSize:'0.82rem', fontWeight:800, border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(219,20,46,0.3)', fontFamily:'Barlow,sans-serif' }}>
                    Continue →
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={loading}
                    style={{ padding:'10px 24px', borderRadius:12, background: loading ? '#d1d5db' : '#198f41', color:'white', fontSize:'0.82rem', fontWeight:800, border:'none', cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, boxShadow: loading ? 'none' : '0 4px 14px rgba(25,143,65,0.35)', fontFamily:'Barlow,sans-serif', transition:'all 0.2s' }}>
                    {loading
                      ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />Submitting…</>
                      : '✓ Submit Application'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ FOOTER CTA ══ */}
        <div style={{ background:'#0f172a', padding:'60px 24px', textAlign:'center' }}>
          <h3 className="bv-display font-black text-white mb-3" style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-0.02em' }}>READY TO START SELLING? 🇹🇳</h3>
          <p style={{ color:'rgba(255,255,255,0.5)', maxWidth:400, margin:'0 auto 28px', lineHeight:1.7 }}>
            Join hundreds of Tunisian entrepreneurs already building their online business with Choosetounsi.
          </p>
          <button
            onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth' })}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#db142e', color:'white', borderRadius:14, fontWeight:800, fontSize:'0.88rem', letterSpacing:'0.06em', textTransform:'uppercase', border:'none', cursor:'pointer', boxShadow:'0 8px 24px rgba(219,20,46,0.4)', fontFamily:'Barlow,sans-serif' }}>
            Apply Now <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  )
}