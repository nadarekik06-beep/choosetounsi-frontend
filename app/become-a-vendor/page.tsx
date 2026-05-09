// app/become-a-vendor/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Upload, CheckCircle, AlertCircle, ChevronDown,
  Loader2, User, ArrowRight, Zap, TrendingUp, Shield,
  Package, BarChart2, Brain, Check,
  Store, Globe, Clock, BadgeCheck,
  Flame, Crown, Leaf, Info, Lock, RefreshCw, Eye,
} from 'lucide-react'
import { api, getUser, isAuthenticated } from '@/lib/auth'
import { subscriptionApi, ActivePlan } from '@/lib/subscriptionApi'
import SubscriptionUpgradePage from '@/app/components/seller/SubscriptionUpgradePage'
import Link from 'next/link'

const WILAYAS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Le Kef','Mahdia','La Manouba','Médenine','Monastir',
  'Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur',
  'Tunis','Zaghouan',
]

const FALLBACK_CATEGORIES = [
  'Fashion & Clothing','Electronics & Tech','Home & Living','Food & Grocery',
  'Beauty & Personal Care','Health & Wellness','Sports & Outdoors',
  'Arts & Crafts','Books & Stationery','Kids & Baby','Automotive','Other',
]

const COMPLETENESS_WEIGHTS = {
  full_name:            5,
  phone_number:         5,
  business_name:        10,
  categories:           10,
  subcategories:        5,
  wilaya:               8,
  city:                 7,
  profile_picture:      20,
  sample_images:        15,
  sample_images_bonus:  5,
  business_description: 5,
  social_link:          5,
} as const

const PLANS = [
  {
    key: 'green',
    name: 'Green Pepper',
    price: 0,
    priceLabel: 'Free',
    priceSub: 'forever',
    commission: '12% – 20%',
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
    icon: BadgeCheck, title: 'Product Quality', color: '#198f41',
    points: [
      'All products must be authentic and as described',
      'Clear photos with white or neutral background',
      'Accurate sizing charts and dimensions',
      'No counterfeit or replica products',
    ],
  },
  {
    icon: Shield, title: 'Prohibited Products', color: '#dc2626',
    points: [
      'Weapons, drugs, or illegal substances',
      'Counterfeit branded goods',
      'Adult content or explicit material',
      'Products that violate Tunisian law',
    ],
  },
  {
    icon: Clock, title: 'Order Fulfilment', color: '#f59e0b',
    points: [
      'Ship within 48h of order confirmation',
      'Maintain ≥ 90% on-time delivery rate',
      'Respond to buyer messages within 24h',
      'Handle returns within 7 days',
    ],
  },
  {
    icon: Globe, title: 'Commission & Payments', color: '#6366f1',
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  full_name: string
  phone_number: string
  business_name: string
  wilaya: string
  city: string
  facebook_url: string
  instagram_url: string
  website_url: string
  pricing_range: '' | 'budget' | 'mid' | 'premium'
  business_description: string
}

interface ApiCategory {
  id: number
  name: string
  slug: string
}

interface ApiSubcategory {
  id: number
  name: string
  slug: string
  category_id: number
}

interface SampleItem {
  file: File | null
  preview: string
  caption: string
  isExisting?: boolean
}

interface ExistingApplication {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  plan: string
  preferred_plan: string
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  full_name: string
  phone_number: string
  business_name: string
  business_category: string
  business_categories: string[]
  business_subcategories: string[]
  pricing_range: string | null
  wilaya: string
  city: string
  business_description: string | null
  profile_picture_url: string | null
  sample_images_urls: string[]
  sample_captions: string[]
  facebook_url: string | null
  instagram_url: string | null
  website_url: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputCls(err?: string) {
  return (
    'w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 ' +
    'outline-none transition-all duration-200 bg-white/90 backdrop-blur-sm ' +
    (err
      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100')
  )
}

function Field({ label, id, error, children, optional }: {
  label: string; id: string; error?: string; children: React.ReactNode; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
        {optional && (
          <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>
            (optional)
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

// ── Status Banner ─────────────────────────────────────────────────────────────

function ApplicationStatusBanner({ app, onEdit }: { app: ExistingApplication; onEdit: () => void }) {
  const isPending  = app.status === 'pending'
  const isApproved = app.status === 'approved'
  const isRejected = app.status === 'rejected'

  const config = isApproved
    ? { bg: '#f0fdf4', border: '#86efac', icon: CheckCircle, iconColor: '#16a34a', title: 'Application Approved!', titleColor: '#15803d' }
    : isRejected
    ? { bg: '#fef2f2', border: '#fecaca', icon: AlertCircle, iconColor: '#dc2626', title: 'Application Rejected', titleColor: '#dc2626' }
    : { bg: '#fefce8', border: '#fde68a', icon: Clock, iconColor: '#d97706', title: 'Application Under Review', titleColor: '#b45309' }

  const Icon = config.icon

  return (
    <div style={{ background: config.bg, border: `1.5px solid ${config.border}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${config.iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={config.iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: '0.95rem', color: config.titleColor, marginBottom: 4 }}>{config.title}</p>
          {isPending && (
            <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
              Submitted on {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Our team reviews within 2–3 business days.
            </p>
          )}
          {isApproved && (
            <p style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: 1.5, margin: 0 }}>
              You are now a <strong>Green Pepper</strong> seller. You can upgrade your plan from your seller dashboard.
            </p>
          )}
          {isRejected && (
            <>
              {app.rejection_reason && (
                <p style={{ fontSize: '0.8rem', color: '#dc2626', lineHeight: 1.5, margin: '0 0 10px' }}>
                  <strong>Reason:</strong> {app.rejection_reason}
                </p>
              )}
              <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: 0 }}>
                You can update your application and resubmit for review.
              </p>
            </>
          )}
        </div>
        {(isPending || isRejected) && (
          <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'white', border: `1px solid ${config.border}`, color: config.titleColor, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {isPending ? <Eye size={13} /> : <RefreshCw size={13} />}
            {isPending ? 'View' : 'Edit & Resubmit'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Locked Plan Modal ─────────────────────────────────────────────────────────

function LockedPlanModal({ planKey, onClose, onScrollToForm }: {
  planKey: 'red' | 'black'; onClose: () => void; onScrollToForm: () => void
}) {
  const isRed       = planKey === 'red'
  const PlanIcon    = isRed ? Flame : Crown
  const planName    = isRed ? 'Red Pepper' : 'Black Pepper'
  const planPrice   = isRed ? '49 DT/month' : '129 DT/month'
  const accentColor = isRed ? '#dc2626' : '#f59e0b'
  const darkBg      = !isRed

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'modalBackdropIn 0.22s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden', boxShadow: `0 40px 80px rgba(0,0,0,0.4), 0 8px 24px ${accentColor}30`, animation: 'modalCardIn 0.28s cubic-bezier(.34,1.56,.64,1) both', border: `2px solid ${accentColor}40`, background: darkBg ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'white' }}>
        <div style={{ height: 4, background: isRed ? 'linear-gradient(90deg, #db142e, #ff4060)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
        <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: darkBg ? `${accentColor}20` : `${accentColor}12`, border: `1.5px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlanIcon size={26} color={accentColor} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: accentColor, marginBottom: 3 }}>{planName}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', lineHeight: 1, color: darkBg ? 'white' : '#111' }}>{planPrice}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: darkBg ? 'rgba(255,255,255,0.08)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={15} color={darkBg ? 'rgba(255,255,255,0.6)' : '#6b7280'} />
          </button>
        </div>
        <div style={{ padding: '20px 28px 28px' }}>
          <div style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 14, marginBottom: 20, background: darkBg ? 'rgba(255,255,255,0.05)' : '#f8f8f6', border: `1px solid ${darkBg ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={17} color="#db142e" />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontWeight: 800, fontSize: '0.88rem', color: darkBg ? 'white' : '#111' }}>Approval required first</p>
              <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: darkBg ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
                You need to be approved as a <strong style={{ color: '#198f41' }}>Green Pepper</strong> seller before upgrading to <strong style={{ color: accentColor }}>{planName}</strong>.
              </p>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            {[
              { num: 1, label: 'Apply with the free Green Pepper plan' },
              { num: 2, label: 'Get approved by our team (2–3 business days)' },
              { num: 3, label: `Upgrade to ${planName} instantly` },
            ].map(({ num, label }) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: num < 3 ? `1px solid ${darkBg ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: num === 3 ? `${accentColor}15` : 'rgba(25,143,65,0.12)', border: `1.5px solid ${num === 3 ? `${accentColor}40` : 'rgba(25,143,65,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '0.8rem', color: num === 3 ? accentColor : '#198f41' }}>
                  {num}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: darkBg ? 'rgba(255,255,255,0.7)' : '#374151' }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { onClose(); onScrollToForm() }}
              style={{ width: '100%', padding: '13px 20px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg, #198f41, #15803d)', color: 'white', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(25,143,65,0.4)' }}>
              <Leaf size={15} />Apply with Green Pepper — Free<ArrowRight size={14} />
            </button>
            <button onClick={onClose}
              style={{ width: '100%', padding: '11px 20px', borderRadius: 13, background: 'transparent', border: `1.5px solid ${darkBg ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, color: darkBg ? 'rgba(255,255,255,0.45)' : '#9ca3af', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BecomeVendorPage() {
  const router  = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const [sellerState, setSellerState] = useState<{
    checked: boolean; isApprovedSeller: boolean; currentPlan: ActivePlan
  }>({ checked: false, isApprovedSeller: false, currentPlan: 'free' })

  const [existingApp,  setExistingApp]  = useState<ExistingApplication | null>(null)
  const [appLoading,   setAppLoading]   = useState(false)
  const [isEditing,    setIsEditing]    = useState(false)
  const [existingId,   setExistingId]   = useState<number | null>(null)

  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [mounted,     setMounted]     = useState(false)
  const [lockedModal, setLockedModal] = useState<'red' | 'black' | null>(null)

  const [form, setForm] = useState<FormState>(() => {
    const user = typeof window !== 'undefined' ? getUser() : null
    return {
      full_name: user?.name ?? '', phone_number: '', business_name: '',
      wilaya: '', city: '', facebook_url: '', instagram_url: '', website_url: '',
      pricing_range: '', business_description: '',
    }
  })

  const [namePrefilled] = useState<boolean>(() =>
    !!(typeof window !== 'undefined' ? getUser()?.name : null)
  )

  const [profilePic,         setProfilePic]         = useState<File | null>(null)
  const [profilePicPreview,  setProfilePicPreview]  = useState<string | null>(null)
  const [profilePicExisting, setProfilePicExisting] = useState<string | null>(null)
  const profileRef = useRef<HTMLInputElement>(null)
  const samplesRef = useRef<HTMLInputElement>(null)

  const [samples,              setSamples]              = useState<SampleItem[]>([])
  const [apiCategories,        setApiCategories]        = useState<ApiCategory[]>([])
  const [categoriesLoading,    setCategoriesLoading]    = useState(false)
  const [selectedCategories,   setSelectedCategories]   = useState<string[]>([])
  const [subcategoriesMap,     setSubcategoriesMap]     = useState<Record<string, ApiSubcategory[]>>({})
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [selectedSubcats,      setSelectedSubcats]      = useState<string[]>([])

  // ── Completeness score ────────────────────────────────────────────────
  const completenessScore = (() => {
    let score = 0
    if (form.full_name.trim())         score += COMPLETENESS_WEIGHTS.full_name
    if (form.phone_number.trim())      score += COMPLETENESS_WEIGHTS.phone_number
    if (form.business_name.trim())     score += COMPLETENESS_WEIGHTS.business_name
    if (selectedCategories.length > 0) score += COMPLETENESS_WEIGHTS.categories
    if (selectedSubcats.length > 0)    score += COMPLETENESS_WEIGHTS.subcategories
    if (form.wilaya)                   score += COMPLETENESS_WEIGHTS.wilaya
    if (form.city.trim())              score += COMPLETENESS_WEIGHTS.city
    if (profilePic || profilePicExisting) score += COMPLETENESS_WEIGHTS.profile_picture
    if (samples.length >= 1)           score += COMPLETENESS_WEIGHTS.sample_images
    if (samples.length >= 2)           score += COMPLETENESS_WEIGHTS.sample_images_bonus
    if (form.business_description.trim().length >= 50) score += COMPLETENESS_WEIGHTS.business_description
    if (form.facebook_url || form.instagram_url || form.website_url) score += COMPLETENESS_WEIGHTS.social_link
    return Math.min(score, 100)
  })()

  const completenessColor =
    completenessScore >= 80 ? '#198f41' :
    completenessScore >= 50 ? '#f59e0b' : '#db142e'

  const completenessHint = (() => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.business_name.trim())
      return 'Fill in your basic business info to get started'
    if (selectedCategories.length === 0) return 'Select at least one business category'
    if (selectedSubcats.length === 0 && Object.keys(subcategoriesMap).length > 0)
      return 'Select subcategories to better describe your business'
    if (!form.wilaya || !form.city.trim()) return 'Add your location so buyers can find you'
    if (!profilePic && !profilePicExisting)
      return 'Upload a profile picture — this boosts approval chances significantly'
    if (samples.length === 0) return 'Upload at least 1 product sample image (required)'
    if (samples.length === 1) return 'Add one more product image to further boost approval chances'
    if (!form.business_description.trim()) return 'Add a description to tell buyers about your business (optional)'
    if (!form.facebook_url && !form.instagram_url && !form.website_url) return 'Add a social link to reach 100%'
    return 'Excellent! Your profile is complete and ready to submit.'
  })()

  // ── Fetch categories ──────────────────────────────────────────────────
  useEffect(() => {
    setCategoriesLoading(true)
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
    fetch(`${base}/api/categories`)
      .then(r => r.json())
      .then(json => setApiCategories(json?.data ?? []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  // ── Fetch subcategories when categories change ────────────────────────
  useEffect(() => {
    if (selectedCategories.length === 0) return
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')
    const toFetch = selectedCategories.filter(catName => {
      const cat = apiCategories.find(c => c.name === catName)
      return cat && !subcategoriesMap[catName]
    })
    if (toFetch.length === 0) return
    setSubcategoriesLoading(true)
    Promise.all(
      toFetch.map(catName => {
        const cat = apiCategories.find(c => c.name === catName)
        if (!cat) return Promise.resolve({ catName, subs: [] as ApiSubcategory[] })
        return fetch(`${base}/api/categories/${cat.slug}/subcategories`)
          .then(r => r.json())
          .then(json => ({ catName, subs: (json?.data ?? []) as ApiSubcategory[] }))
          .catch(() => ({ catName, subs: [] as ApiSubcategory[] }))
      })
    ).then(results => {
      setSubcategoriesMap(prev => {
        const updated = { ...prev }
        results.forEach(({ catName, subs }) => { updated[catName] = subs })
        return updated
      })
    }).finally(() => setSubcategoriesLoading(false))
  }, [selectedCategories, apiCategories])

  // ── Clean up subcats when categories removed ──────────────────────────
  useEffect(() => {
    const allSubs = selectedCategories.flatMap(cat => subcategoriesMap[cat] ?? [])
    const validSubNames = new Set(allSubs.map(s => s.name))
    setSelectedSubcats(prev => prev.filter(s => validSubNames.has(s)))
  }, [selectedCategories, subcategoriesMap])

  // ── Load existing application ─────────────────────────────────────────
  const loadExistingApplication = useCallback(async () => {
    setAppLoading(true)
    try {
      // ─── FIX: axios returns response.data automatically.
      // Laravel sends: { success: true, data: null } or { success: true, data: {...} }
      // So `res` here is already { success, data } — we need res.data for the app object.
      const res = await api.get('/seller-applications/mine')

      // res is the axios response wrapper, res.data is { success, data }
      // So the actual application is at res.data.data
      const responseBody = (res as any).data  // { success: true, data: null | {...} }
      const app: ExistingApplication | null = responseBody?.data ?? null

      // ─── CRITICAL GUARD: only set existingApp if we have a real application
      // with a valid numeric id. Prevents ghost banners from malformed responses.
      if (!app || typeof app.id !== 'number') {
        setExistingApp(null)
        setExistingId(null)
        return
      }

      setExistingApp(app)
      setExistingId(app.id)

      setForm({
        full_name:            app.full_name            ?? '',
        phone_number:         app.phone_number         ?? '',
        business_name:        app.business_name        ?? '',
        wilaya:               app.wilaya               ?? '',
        city:                 app.city                 ?? '',
        facebook_url:         app.facebook_url         ?? '',
        instagram_url:        app.instagram_url        ?? '',
        website_url:          app.website_url          ?? '',
        pricing_range:        (app.pricing_range as FormState['pricing_range']) ?? '',
        business_description: app.business_description ?? '',
      })

      setSelectedCategories(app.business_categories    ?? [])
      setSelectedSubcats(app.business_subcategories    ?? [])

      if (app.profile_picture_url) {
        setProfilePicPreview(app.profile_picture_url)
        setProfilePicExisting(app.profile_picture_url)
      }

      if (app.sample_images_urls?.length) {
        setSamples(app.sample_images_urls.map((url, i) => ({
          file: null, preview: url,
          caption: app.sample_captions?.[i] ?? '',
          isExisting: true,
        })))
      }
    } catch {
      // 404 or any error = no application exists, show fresh form
      setExistingApp(null)
      setExistingId(null)
    } finally {
      setAppLoading(false)
    }
  }, [])

  // ── Mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/become-a-vendor')
      return
    }
    subscriptionApi.getStatus()
      .then(status => {
        if (status?.status === 'approved') {
          setSellerState({ checked: true, isApprovedSeller: true, currentPlan: (status.plan as ActivePlan) ?? 'free' })
        } else {
          setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
          loadExistingApplication()
        }
      })
      .catch(() => {
        setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
        loadExistingApplication()
      })
  }, [router, loadExistingApplication])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockedModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleGreenClick = () => {
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

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
    setProfilePicExisting(null)
    setErrors(prev => { const n = { ...prev }; delete n.profile_picture; return n })
  }

  const handleSamples = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    if (samples.length + incoming.length > 5) { setError('Maximum 5 sample images allowed.'); return }
    const newItems: SampleItem[] = incoming.map(file => ({
      file, preview: URL.createObjectURL(file), caption: '', isExisting: false,
    }))
    setSamples(prev => [...prev, ...newItems])
    setError(null)
    setErrors(prev => { const n = { ...prev }; delete n.sample_images; return n })
  }

  const removeSample   = (idx: number) => setSamples(prev => prev.filter((_, i) => i !== idx))
  const updateCaption  = (idx: number, caption: string) => {
    setSamples(prev => prev.map((s, i) => i === idx ? { ...s, caption } : s))
  }

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        const catSubs = subcategoriesMap[catName]?.map(s => s.name) ?? []
        setSelectedSubcats(ps => ps.filter(s => !catSubs.includes(s)))
        return prev.filter(c => c !== catName)
      }
      if (prev.length >= 5) return prev
      return [...prev, catName]
    })
    setErrors(prev => { const n = { ...prev }; delete n.business_category; return n })
  }

  const toggleSubcat = (subcatName: string) => {
    setSelectedSubcats(prev =>
      prev.includes(subcatName) ? prev.filter(s => s !== subcatName) : [...prev, subcatName]
    )
  }

  // ── Validation ────────────────────────────────────────────────────────

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {}
    if (s === 1) {
      if (!form.full_name.trim())     errs.full_name     = 'Full name is required.'
      if (!form.phone_number.trim())  errs.phone_number  = 'Phone number is required.'
      if (!form.business_name.trim()) errs.business_name = 'Business name is required.'
      if (selectedCategories.length === 0) errs.business_category = 'Please select at least one category.'
    }
    if (s === 2) {
      if (!form.wilaya)      errs.wilaya = 'Please select your wilaya.'
      if (!form.city.trim()) errs.city   = 'City is required.'
    }
    if (s === 3) {
      if (!profilePic && !profilePicExisting) errs.profile_picture = 'A profile picture is required.'
      if (samples.length === 0)               errs.sample_images   = 'Please upload at least 1 product sample image.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validateStep(step)) setStep(s => (s < 3 ? (s + 1) as 1|2|3 : s)) }
  const prev = () => setStep(s => (s > 1 ? (s - 1) as 1|2|3 : s))

  // ── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep(step)) return
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      const scalarFields: (keyof FormState)[] = [
        'full_name', 'phone_number', 'business_name', 'wilaya', 'city',
        'facebook_url', 'instagram_url', 'website_url', 'pricing_range', 'business_description',
      ]
      scalarFields.forEach(k => { if (form[k]) fd.append(k, form[k] as string) })
      fd.append('business_category', selectedCategories[0] ?? '')
      selectedCategories.forEach((cat, i) => fd.append(`business_categories[${i}]`, cat))
      selectedSubcats.forEach((sub, i)    => fd.append(`business_subcategories[${i}]`, sub))
      fd.append('preferred_plan', 'green')
      if (profilePic) fd.append('profile_picture', profilePic)
      samples.filter(s => !s.isExisting && s.file).forEach(s => fd.append('sample_images[]', s.file!))
      samples.forEach((s, i) => { if (s.caption.trim()) fd.append(`sample_captions[${i}]`, s.caption.trim()) })

      // ─── FIX: axios returns the full response object.
      // response.data is { success, data, message }.
      // So the application object is at response.data.data
      let response: any
      if (existingId) {
        response = await api.put(`/seller-applications/${existingId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        response = await api.post('/seller-applications', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      // Correctly read the nested application object
      const savedApp = response?.data?.data
      if (savedApp && typeof savedApp.id === 'number') {
        setExistingApp(savedApp)
        setExistingId(savedApp.id)
      }

      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, unknown> } } }
      setError(e?.response?.data?.message ?? 'Something went wrong. Please try again.')
      const be = e?.response?.data?.errors ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(be).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v) })
      if (Object.keys(mapped).length) setErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────

  const availableSubcats: ApiSubcategory[] = selectedCategories.flatMap(cat => subcategoriesMap[cat] ?? [])

  // ─── FIX: showForm only when existingApp is genuinely null (no real application)
  // OR when user explicitly clicked Edit.
  // existingApp being null means: loaded and confirmed no application exists.
  const showForm = !existingApp || isEditing

  // ── Render guards ─────────────────────────────────────────────────────

  if (!mounted || !sellerState.checked) return null

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

  if (success) {
    const wasUpdate = !!existingId
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>
            {wasUpdate ? 'APPLICATION UPDATED!' : 'APPLICATION SUBMITTED!'}
          </h1>
          <p className="text-gray-500 leading-relaxed mb-2">
            {wasUpdate ? 'Your application has been resubmitted for review.' : 'Your application has been received and is under review.'}
          </p>
          <p className="text-gray-500 leading-relaxed mb-2">
            You'll start on the <span className="font-bold text-green-600">Free (Green Pepper) plan</span> while our team reviews your store (2–3 business days).
          </p>
          <p className="text-gray-400 text-sm mt-3 mb-8">Once approved, you'll be able to upgrade to Red or Black Pepper anytime.</p>
          <Link href="/" className="inline-block px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-colors">
            Back to Homepage
          </Link>
        </div>
      </div>
    )
  }

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
        .plan-card { position:relative; border-radius:24px; overflow:hidden; will-change:transform; cursor:pointer; transition:transform 0.28s cubic-bezier(.34,1.56,.64,1),box-shadow 0.28s ease,border-color 0.2s ease; }
        .plan-card-green:hover { transform:translateY(-8px) scale(1.02); box-shadow:0 32px 64px rgba(25,143,65,0.25),0 8px 24px rgba(25,143,65,0.15); border-color:#16a34a !important; }
        .plan-card-red:hover   { transform:translateY(-8px) scale(1.02); box-shadow:0 32px 64px rgba(219,20,46,0.22),0 8px 24px rgba(219,20,46,0.13); border-color:#dc2626 !important; }
        .plan-card-black:hover { transform:translateY(-8px) scale(1.02); box-shadow:0 32px 64px rgba(245,158,11,0.2),0 8px 20px rgba(0,0,0,0.3); border-color:#f59e0b !important; }
        .badge-popular { background:linear-gradient(90deg,#dc2626,#ff4060); color:white; font-size:0.6rem; font-weight:800; letter-spacing:0.12em; padding:4px 10px; border-radius:99px; animation:pulse-ring 2s ease-in-out infinite; }
        .badge-value   { background:linear-gradient(90deg,#f59e0b,#fbbf24); color:#0f172a; font-size:0.6rem; font-weight:800; letter-spacing:0.12em; padding:4px 10px; border-radius:99px; }
        .rule-card { background:white; border-radius:16px; padding:24px; border:1.5px solid #e5e7eb; transition:transform 0.22s ease,box-shadow 0.22s ease; }
        .rule-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,0.08); }
        .benefit-item { display:flex; align-items:flex-start; gap:16px; padding:20px; background:rgba(255,255,255,0.08); border-radius:16px; border:1px solid rgba(255,255,255,0.12); transition:background 0.2s ease; }
        .benefit-item:hover { background:rgba(255,255,255,0.14); }
        .form-section { background:white; border-radius:28px; box-shadow:0 32px 80px rgba(0,0,0,0.12),0 4px 16px rgba(0,0,0,0.06); overflow:hidden; }
        .step-dot { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800; transition:all 0.25s ease; }
        .grain { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.025; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-repeat:repeat; background-size:200px 200px; }
        .subcat-chip { padding:6px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; cursor:pointer; border:1.5px solid #e5e7eb; background:white; color:#374151; transition:all 0.15s ease; }
        .subcat-chip.selected { border-color:#db142e; background:#fef2f2; color:#db142e; }
        .subcat-chip:hover:not(.selected) { border-color:#d1d5db; background:#f9fafb; }
      `}</style>

      {lockedModal && (
        <LockedPlanModal planKey={lockedModal} onClose={() => setLockedModal(null)} onScrollToForm={handleGreenClick} />
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
              {['12,000+ Active Buyers','24h Setup','AI-Powered Tools','Free Plan Available'].map(t => (
                <span key={t} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)' }}>✓ {t}</span>
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

        {/* ══ BENEFITS ══ */}
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
                      <span style={{ width:5, height:5, borderRadius:'50%', background:color, marginTop:5, flexShrink:0 }} />{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ══ PRICING ══ */}
        <div style={{ background:'linear-gradient(180deg, #f8f8f6 0%, #f0f0ee 100%)', padding:'60px 0 80px' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <span style={{ color:'#db142e', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase' }}>Choose Your Plan</span>
              <h2 className="bv-display font-black text-gray-900 mt-2" style={{ fontSize:'clamp(2rem,4vw,3.2rem)', letterSpacing:'-0.02em' }}>🌶️ THREE PLANS, ONE MARKET</h2>
              <p className="text-gray-500 mt-3">Start free and upgrade anytime after approval.</p>
              <div className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full" style={{ background:'rgba(25,143,65,0.08)', border:'1px solid rgba(25,143,65,0.22)' }}>
                <Info size={14} color="#198f41" />
                <span style={{ fontSize:'0.8rem', fontWeight:600, color:'#198f41' }}>All sellers start with the free plan — upgrade after approval</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {PLANS.map(plan => {
                const { Icon } = plan
                const isLocked = plan.key !== 'green'
                return (
                  <div key={plan.key} className={`plan-card plan-card-${plan.key}`} style={{ background:plan.bgGradient, border:`2px solid ${plan.borderColor}` }}
                    onClick={isLocked ? () => setLockedModal(plan.key as 'red'|'black') : handleGreenClick}>
                    {plan.badge && (
                      <div style={{ position:'absolute', top:16, right:16, zIndex:2 }}>
                        <span className={plan.badge === 'MOST POPULAR' ? 'badge-popular' : 'badge-value'}>{plan.badge}</span>
                      </div>
                    )}
                    <div style={{ padding:'28px 24px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:plan.dark ? 'rgba(245,158,11,0.15)' : `${plan.accentColor}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Icon size={22} color={plan.dark ? '#f59e0b' : plan.accentColor} />
                        </div>
                        <div>
                          <div style={{ fontWeight:900, fontSize:'1rem', color:plan.dark ? 'white' : '#111', lineHeight:1 }}>{plan.name}</div>
                          <div style={{ fontSize:'0.68rem', color:plan.dark ? 'rgba(255,255,255,0.45)' : '#888', marginTop:2 }}>{plan.target}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom:16 }}>
                        <span className="bv-display" style={{ fontSize:'2.8rem', fontWeight:900, color:plan.dark ? 'white' : '#111', lineHeight:1 }}>{plan.priceLabel}</span>
                        <span style={{ fontSize:'0.78rem', color:plan.dark ? 'rgba(255,255,255,0.45)' : '#888', marginLeft:6 }}>/{plan.priceSub}</span>
                      </div>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:plan.dark ? 'rgba(245,158,11,0.12)' : `${plan.accentColor}12`, borderRadius:8, padding:'6px 10px', marginBottom:18 }}>
                        <BarChart2 size={13} color={plan.dark ? '#f59e0b' : plan.accentColor} />
                        <span style={{ fontSize:'0.75rem', fontWeight:700, color:plan.dark ? '#f59e0b' : plan.accentColor }}>{plan.commission} commission</span>
                      </div>
                      <div style={{ fontSize:'0.75rem', color:plan.dark ? 'rgba(255,255,255,0.5)' : '#888', marginBottom:18, display:'flex', alignItems:'center', gap:5 }}>
                        <Package size={13} color={plan.dark ? 'rgba(255,255,255,0.35)' : '#aaa'} />
                        {plan.maxProducts ? `Up to ${plan.maxProducts} products` : 'Unlimited products'}
                      </div>
                      <ul style={{ listStyle:'none', padding:0, margin:'0 0 22px', display:'flex', flexDirection:'column', gap:8 }}>
                        {plan.features.map(f => (
                          <li key={f.text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color:f.ok ? (plan.dark ? 'rgba(255,255,255,0.85)' : '#333') : (plan.dark ? 'rgba(255,255,255,0.2)' : '#ccc') }}>
                            {f.ok ? <Check size={14} color={plan.dark ? '#f59e0b' : plan.accentColor} style={{ flexShrink:0 }} /> : <X size={14} style={{ flexShrink:0 }} />}
                            <span style={{ textDecoration:f.ok ? 'none' : 'line-through' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                      <button onClick={e => { e.stopPropagation(); if (isLocked) setLockedModal(plan.key as 'red'|'black'); else handleGreenClick() }}
                        style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'14px 24px', borderRadius:14, background:plan.dark ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : `linear-gradient(135deg, ${plan.accentColor}, ${plan.accentColor}dd)`, color:plan.dark ? '#0f172a' : 'white', fontSize:'0.85rem', fontWeight:800, border:'none', cursor:'pointer', fontFamily:'Barlow, sans-serif', letterSpacing:'0.04em', textTransform:'uppercase', transition:'transform 0.18s ease, filter 0.18s ease' }}>
                        {plan.ctaLabel} <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ══ FORM ══ */}
        <div ref={formRef} className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <span style={{ color:'#db142e', fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase' }}>Apply Now</span>
            <h2 className="bv-display font-black text-gray-900 mt-2" style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-0.02em' }}>COMPLETE YOUR APPLICATION</h2>
            <p className="text-gray-500 mt-3 text-sm">Fill in your business details below. Our team reviews applications within 2–3 business days.</p>
          </div>

          {appLoading && (
            <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />
              Loading your application…
            </div>
          )}

          {/* ─── FIX: only show banner when existingApp has a real numeric id ─── */}
          {!appLoading && existingApp && typeof existingApp.id === 'number' && !isEditing && (
            <ApplicationStatusBanner
              app={existingApp}
              onEdit={() => {
                setIsEditing(true)
                setTimeout(() => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100)
              }}
            />
          )}

          {!appLoading && showForm && (
            <div className="form-section">
              {/* Step indicator */}
              <div style={{ padding:'24px 28px', borderBottom:'1px solid #f0f0f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {([1,2,3] as const).map(s => (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div className="step-dot" style={{ background:step===s ? '#db142e' : step>s ? '#198f41' : '#f0f0f0', color:step>=s ? 'white' : '#999', boxShadow:step===s ? '0 4px 14px rgba(219,20,46,0.35)' : 'none' }}>
                        {step > s ? '✓' : s}
                      </div>
                      {s < 3 && <div style={{ height:2, width:36, background:step>s ? '#198f41' : '#e5e7eb', borderRadius:1, transition:'background 0.3s' }} />}
                    </div>
                  ))}
                  <span style={{ marginLeft:8, fontSize:'0.78rem', color:'#999', fontWeight:600 }}>
                    {step===1 ? 'Business Info' : step===2 ? 'Location' : 'Media & Description'}
                  </span>
                </div>
              </div>

              <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:18 }}>

                {/* Completeness bar */}
                <div style={{ background:'#f8f8f6', borderRadius:12, padding:'14px 16px', border:'1px solid #e5e7eb' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151' }}>Profile Completeness</span>
                    <span style={{ fontSize:'0.78rem', fontWeight:800, color:completenessColor }}>{completenessScore}%</span>
                  </div>
                  <div style={{ height:6, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, width:`${completenessScore}%`, background:completenessColor, transition:'width 0.4s ease, background 0.3s' }} />
                  </div>
                  <p style={{ fontSize:'0.72rem', color:'#9ca3af', marginTop:6, marginBottom:0 }}>💡 {completenessHint}</p>
                </div>

                {/* ══ STEP 1 ══ */}
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

                    {/* Categories + Subcategories */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">
                        Business Categories
                        <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginLeft:6 }}>(select up to 5)</span>
                      </label>
                      {categoriesLoading ? (
                        <div style={{ padding:'12px', textAlign:'center', color:'#9ca3af', fontSize:'0.78rem' }}>Loading categories…</div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, maxHeight:240, overflowY:'auto', padding:4 }}>
                          {(apiCategories.length > 0 ? apiCategories.map(c => c.name) : FALLBACK_CATEGORIES).map(catName => {
                            const isSelected = selectedCategories.includes(catName)
                            return (
                              <button key={catName} type="button" onClick={() => toggleCategory(catName)}
                                style={{ padding:'8px 12px', borderRadius:10, textAlign:'left', fontSize:'0.78rem', fontWeight:isSelected ? 700 : 500, cursor:'pointer', border:isSelected ? '2px solid #db142e' : '1.5px solid #e5e7eb', background:isSelected ? '#fef2f2' : 'white', color:isSelected ? '#db142e' : '#374151', transition:'all 0.15s ease', display:'flex', alignItems:'center', gap:6 }}>
                                {isSelected && (
                                  <span style={{ width:14, height:14, borderRadius:'50%', background:'#db142e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <Check size={9} color="white" />
                                  </span>
                                )}
                                {catName}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {selectedCategories.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                          {selectedCategories.map(c => (
                            <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#fef2f2', color:'#db142e', border:'1px solid #fecaca', borderRadius:999, padding:'2px 10px', fontSize:'0.72rem', fontWeight:700 }}>
                              {c}
                              <button type="button" onClick={() => toggleCategory(c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#db142e', padding:0, lineHeight:1, display:'flex' }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {errors.business_category && (
                        <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.business_category}</p>
                      )}

                      {selectedCategories.length > 0 && (
                        <div style={{ marginTop:12, background:'#f8f8f6', borderRadius:12, padding:'14px', border:'1px solid #e5e7eb' }}>
                          <p style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:10 }}>
                            Subcategories
                            <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginLeft:6 }}>(optional — select all that apply)</span>
                          </p>
                          {subcategoriesLoading && (
                            <div style={{ fontSize:'0.75rem', color:'#9ca3af', display:'flex', alignItems:'center', gap:6 }}>
                              <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} />Loading subcategories…
                            </div>
                          )}
                          {!subcategoriesLoading && availableSubcats.length === 0 && (
                            <p style={{ fontSize:'0.75rem', color:'#9ca3af', margin:0 }}>No subcategories available for the selected categories.</p>
                          )}
                          {!subcategoriesLoading && availableSubcats.length > 0 && (
                            <>
                              {selectedCategories.map(catName => {
                                const subs = subcategoriesMap[catName] ?? []
                                if (subs.length === 0) return null
                                return (
                                  <div key={catName} style={{ marginBottom:12 }}>
                                    <p style={{ fontSize:'0.68rem', fontWeight:800, color:'#db142e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{catName}</p>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                      {subs.map(sub => {
                                        const isSelected = selectedSubcats.includes(sub.name)
                                        return (
                                          <button key={sub.id} type="button" onClick={() => toggleSubcat(sub.name)}
                                            className={`subcat-chip${isSelected ? ' selected' : ''}`}>
                                            {isSelected && <Check size={10} style={{ display:'inline', marginRight:3 }} />}
                                            {sub.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                              {selectedSubcats.length > 0 && (
                                <p style={{ fontSize:'0.72rem', color:'#198f41', marginTop:6, fontWeight:600 }}>
                                  ✓ {selectedSubcats.length} subcategor{selectedSubcats.length > 1 ? 'ies' : 'y'} selected
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pricing range */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">
                        Pricing Range
                        <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginLeft:6 }}>(optional)</span>
                      </label>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                        {([
                          { value:'budget', label:'Budget', desc:'Affordable prices', emoji:'💚' },
                          { value:'mid',    label:'Mid-range', desc:'Quality & value', emoji:'💛' },
                          { value:'premium',label:'Premium', desc:'High-end products', emoji:'🖤' },
                        ] as const).map(opt => {
                          const isSelected = form.pricing_range === opt.value
                          return (
                            <button key={opt.value} type="button"
                              onClick={() => setForm(prev => ({ ...prev, pricing_range: prev.pricing_range === opt.value ? '' : opt.value }))}
                              style={{ padding:'12px 10px', borderRadius:12, textAlign:'center', border:isSelected ? '2px solid #db142e' : '1.5px solid #e5e7eb', background:isSelected ? '#fef2f2' : 'white', cursor:'pointer', transition:'all 0.15s ease' }}>
                              <div style={{ fontSize:'1.2rem', marginBottom:4 }}>{opt.emoji}</div>
                              <div style={{ fontSize:'0.78rem', fontWeight:700, color:isSelected ? '#db142e' : '#374151' }}>{opt.label}</div>
                              <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:2 }}>{opt.desc}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ══ STEP 2 ══ */}
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

                {/* ══ STEP 3 ══ */}
                {step === 3 && (
                  <>
                    {/* Profile picture */}
                    <div>
                      <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
                        Profile Picture <span style={{ color:'#db142e' }}>*</span>
                        <span style={{ color:'#9ca3af', fontWeight:400, fontSize:'0.78rem', marginLeft:4 }}>(required)</span>
                      </label>
                      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                        <div onClick={() => profileRef.current?.click()}
                          style={{ width:72, height:72, borderRadius:16, border:errors.profile_picture ? '2px dashed #f87171' : '2px dashed #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', background:errors.profile_picture ? '#fef2f2' : '#fafafa' }}>
                          {profilePicPreview
                            ? <img src={profilePicPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <Upload size={20} color={errors.profile_picture ? '#f87171' : '#d1d5db'} />}
                        </div>
                        <div>
                          <button type="button" onClick={() => profileRef.current?.click()} style={{ color:'#db142e', fontWeight:700, fontSize:'0.85rem', background:'none', border:'none', cursor:'pointer' }}>
                            {profilePicPreview ? 'Change photo' : 'Upload photo'}
                          </button>
                          <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'2px 0 0' }}>JPG, PNG or WebP · max 4MB</p>
                          {profilePicExisting && !profilePic && (
                            <p style={{ fontSize:'0.68rem', color:'#198f41', margin:'3px 0 0', fontWeight:600 }}>✓ Existing photo loaded</p>
                          )}
                        </div>
                      </div>
                      {errors.profile_picture && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-2"><AlertCircle size={11} />{errors.profile_picture}</p>
                      )}
                      <input ref={profileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleProfilePic} />
                    </div>

                    {/* Product samples */}
                    <div>
                      <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                        Product Samples <span style={{ color:'#db142e' }}>*</span>
                        <span style={{ color:'#9ca3af', fontWeight:400, fontSize:'0.78rem', marginLeft:4 }}>(at least 1, up to 5)</span>
                      </label>
                      <p style={{ fontSize:'0.72rem', color:'#9ca3af', marginBottom:12, marginTop:0 }}>
                        Show buyers what you sell. Add a caption to each image to boost your approval chances.
                      </p>
                      {samples.length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                          {samples.map((s, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'#fafafa', border:s.isExisting ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb', borderRadius:12, padding:10 }}>
                              <div style={{ width:60, height:60, flexShrink:0, borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb' }}>
                                <img src={s.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                {s.isExisting && <p style={{ fontSize:'0.65rem', color:'#198f41', fontWeight:700, margin:'0 0 3px' }}>✓ Existing</p>}
                                <input type="text" placeholder={`Caption for image ${i+1}`} value={s.caption} onChange={e => updateCaption(i, e.target.value)} maxLength={200}
                                  style={{ flex:1, fontSize:'0.78rem', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', outline:'none', background:'white', color:'#374151', width:'100%' }} />
                              </div>
                              <button type="button" onClick={() => removeSample(i)}
                                style={{ width:28, height:28, borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                                <X size={12} color="#dc2626" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {samples.length < 5 && (
                        <div onClick={() => samplesRef.current?.click()}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:errors.sample_images ? '2px dashed #f87171' : '2px dashed #e5e7eb', borderRadius:12, cursor:'pointer', background:errors.sample_images ? '#fef2f2' : '#fafafa' }}>
                          <Upload size={16} color={errors.sample_images ? '#f87171' : '#d1d5db'} />
                          <span style={{ fontSize:'0.78rem', color:errors.sample_images ? '#f87171' : '#9ca3af' }}>
                            {samples.length === 0 ? 'Upload product images (at least 1 required)' : `Add more (${5-samples.length} remaining)`}
                          </span>
                        </div>
                      )}
                      {errors.sample_images && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-2"><AlertCircle size={11} />{errors.sample_images}</p>
                      )}
                      {samples.length >= 2 && (
                        <p style={{ fontSize:'0.72rem', color:'#198f41', marginTop:6, fontWeight:600 }}>✓ 2+ images uploaded — this increases your approval chances!</p>
                      )}
                      <input ref={samplesRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleSamples} />
                    </div>

                    {/* Description — optional, moved to step 3 */}
                    <Field label="Business Description" id="business_description" optional>
                      <textarea id="business_description" rows={4}
                        placeholder="Tell us about your business, what you sell, and your story… (optional)"
                        value={form.business_description}
                        onChange={handleChange('business_description')}
                        className={inputCls() + ' resize-none'}
                      />
                      <span style={{ fontSize:'0.72rem', color:form.business_description.length >= 50 ? '#198f41' : '#bbb', textAlign:'right' }}>
                        {form.business_description.length} / 2000{form.business_description.length >= 50 && ' ✓'}
                      </span>
                    </Field>

                    {/* Social media */}
                    <div>
                      <p style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', marginBottom:12 }}>
                        Social Media <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span>
                      </p>
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
                      style={{ padding:'10px 24px', borderRadius:12, background:loading ? '#d1d5db' : existingId ? '#0f172a' : '#198f41', color:'white', fontSize:'0.82rem', fontWeight:800, border:'none', cursor:loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'Barlow,sans-serif', transition:'all 0.2s' }}>
                      {loading
                        ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />Submitting…</>
                        : existingId
                        ? <><RefreshCw size={14} />Update Application</>
                        : <>✓ Submit Application</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ FOOTER CTA ══ */}
        <div style={{ background:'#0f172a', padding:'60px 24px', textAlign:'center' }}>
          <h3 className="bv-display font-black text-white mb-3" style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', letterSpacing:'-0.02em' }}>READY TO START SELLING? 🇹🇳</h3>
          <p style={{ color:'rgba(255,255,255,0.5)', maxWidth:400, margin:'0 auto 28px', lineHeight:1.7 }}>
            Join hundreds of Tunisian entrepreneurs already building their online business with Choosetounsi.
          </p>
          <button onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth' })}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', background:'#db142e', color:'white', borderRadius:14, fontWeight:800, fontSize:'0.88rem', letterSpacing:'0.06em', textTransform:'uppercase', border:'none', cursor:'pointer', boxShadow:'0 8px 24px rgba(219,20,46,0.4)', fontFamily:'Barlow,sans-serif' }}>
            Apply Now <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  )
}