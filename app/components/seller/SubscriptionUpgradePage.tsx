// components/seller/SubscriptionUpgradePage.tsx
'use client'

import { useState, useRef } from 'react'
import {
  Leaf, Flame, Crown, Check, X, ArrowRight,
  CreditCard, Lock, CheckCircle, Loader2,
  BarChart2, Package, AlertCircle, ChevronRight, Shield,
} from 'lucide-react'
import { subscriptionApi, PLAN_META, ActivePlan } from '@/lib/subscriptionApi'
import { refreshUser } from '@/lib/auth'
import { useSellerPlans, formatCommission, type SellerPlans } from '@/lib/platformApi'
import { useTranslations } from 'next-intl'
import { usePlanPrice } from '@/lib/i18n/usePlanPrice'
// Shown on the storefront become-a-vendor page: messages live in the top-level planUpgrade namespace.
// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  currentPlan: ActivePlan
  onUpgradeSuccess: (newPlan: 'red' | 'black') => void
}

// ── Upgrade plan definitions ──────────────────────────────────────────────────

const UPGRADE_PLANS = [
  {
    key: 'red' as const,
    name: 'Red Pepper',
    target: 'targetRed',
    badge: 'badgePopular',
    Icon: Flame,
    dark: false,
    bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    borderColor: '#fca5a5',
    accentColor: '#dc2626',
    features: [
      { text: 'advancedDashboard',    ok: true  },
      { text: 'couponsFlash',         ok: true  },
      { text: 'priceAi',              ok: true  },
      { text: 'salesAi',              ok: true  },
      { text: 'descriptionGenerator', ok: true  },
      { text: 'recommendationsAi',    ok: true  },
      { text: 'vipSupport',           ok: false },
    ],
  },
  {
    key: 'black' as const,
    name: 'Black Pepper',
    target: 'targetBlack',
    badge: 'badgeValue',
    Icon: Crown,
    dark: true,
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderColor: '#334155',
    accentColor: '#f59e0b',
    features: [
      { text: 'everythingRed',  ok: true },
      { text: 'homepageBoost',  ok: true },
      { text: 'freeSponsored',  ok: true },
      { text: 'trendAi',        ok: true },
      { text: 'inventoryAi',    ok: true },
      { text: 'reels',          ok: true },
      { text: 'socialPromo',    ok: true },
    ],
  },
]

// ── Current plan card definition (always Green Pepper) ────────────────────────

const GREEN_PLAN = {
  key: 'green' as const,
  name: 'Green Pepper',
  target: 'targetGreen',
  Icon: Leaf,
  dark: false,
  bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  borderColor: '#86efac',
  accentColor: '#15803d',
  features: [
    { text: 'basicDashboard',    ok: true  },
    { text: 'couponCreation',    ok: true  },
    { text: 'flashSales',        ok: true  },
    { text: 'sponsoring',        ok: true  },
    { text: 'aiTools',           ok: false },
    { text: 'advancedAnalytics', ok: false },
    { text: 'prioritySupport',   ok: false },
  ],
}

// ── Live prices / limits / commission (from /api/seller-plans) ───────────────

function withLive<T extends { key: 'green' | 'red' | 'black' }>(plan: T, plans: SellerPlans | null) {
  const live = plans?.[plan.key === 'green' ? 'free' : plan.key]
  return {
    ...plan,
    price:       live ? live.price : null,
    priceSub:    live && live.price === 0 ? 'forever' : 'perMonth',
    commission:  formatCommission(live),
    maxProducts: live ? live.max_products : null,
    loaded:      Boolean(live),
  }
}

type LivePlan = ReturnType<typeof withLive<typeof UPGRADE_PLANS[number]>>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

// ── Current Plan Badge ────────────────────────────────────────────────────────

function CurrentPlanBadge({ plan }: { plan: ActivePlan }) {
  const t = useTranslations('planUpgrade')
  const meta = PLAN_META[plan]
  const Icon = plan === 'free' ? Leaf : plan === 'red' ? Flame : Crown
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 20px', borderRadius: 999,
      background: `${meta.color}18`,
      border: `1.5px solid ${meta.color}35`,
    }}>
      <Icon size={16} color={meta.accentColor} />
      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: meta.accentColor }}>
        {meta.name}
      </span>
      <span style={{
        fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
        background: `${meta.color}22`, color: meta.accentColor,
      }}>
        {t('active')}
      </span>
    </div>
  )
}

// ── Payment Form ──────────────────────────────────────────────────────────────

interface PaymentFormProps {
  selectedPlan: LivePlan
  onSuccess: (plan: 'red' | 'black') => void
  onCancel: () => void
}

function PaymentForm({ selectedPlan, onSuccess, onCancel }: PaymentFormProps) {
  const t = useTranslations('planUpgrade')
  const { short } = usePlanPrice()
  const priceText = selectedPlan.price === null ? '…' : short(selectedPlan.price)
  const [cardNumber,     setCardNumber]     = useState('')
  const [expiryDate,     setExpiryDate]     = useState('')
  const [cvv,            setCvv]            = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [fieldErrors,    setFieldErrors]    = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const rawCard = cardNumber.replace(/\s/g, '')
    if (rawCard.length < 13 || rawCard.length > 19) errs.card_number = t('errors.card')
    if (!expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/))  errs.expiry_date = t('errors.expiry')
    if (!cvv.match(/^\d{3,4}$/))                          errs.cvv = t('errors.cvv')
    if (cardholderName.trim().length < 2)                 errs.cardholder_name = t('errors.name')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handlePay = async () => {
  if (!validate()) return
  setLoading(true)
  setError(null)
  try {
    await subscriptionApi.upgrade({
      plan:            selectedPlan.key,
      card_number:     cardNumber.replace(/\s/g, ''),
      expiry_date:     expiryDate,
      cvv,
      cardholder_name: cardholderName.trim(),
    })
    // ── CRITICAL FIX ──────────────────────────────────────────────────────
    // Refresh user session so localStorage gets the new active_plan value.
    // Without this, the seller layout still reads the stale 'free' plan
    // from localStorage and never redirects to the red dashboard.
    await refreshUser()
    // ─────────────────────────────────────────────────────────────────────
    onSuccess(selectedPlan.key)
  } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, unknown> } } }
      const msg = e?.response?.data?.message ?? t('errors.failed')
      setError(msg)
      const be = e?.response?.data?.errors ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(be).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v)
      })
      if (Object.keys(mapped).length) setFieldErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', padding: '13px 16px', borderRadius: 12, boxSizing: 'border-box',
    border: `1.5px solid ${hasError ? '#dc2626' : '#e5e7eb'}`,
    fontSize: '0.9rem', outline: 'none', fontFamily: 'Barlow, sans-serif',
    background: hasError ? '#fef2f2' : 'white', color: '#111',
    transition: 'border-color 0.15s ease',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: '#374151', marginBottom: 6, letterSpacing: '0.02em',
  }

  const errStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: '0.72rem', color: '#dc2626', marginTop: 5,
  }

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      border: `2px solid ${selectedPlan.accentColor}30`,
      boxShadow: `0 24px 56px ${selectedPlan.accentColor}15, 0 4px 16px rgba(0,0,0,0.06)`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        background: selectedPlan.dark
          ? 'linear-gradient(135deg, #0f172a, #1e293b)'
          : `${selectedPlan.accentColor}0a`,
        borderBottom: `1px solid ${selectedPlan.accentColor}20`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: selectedPlan.dark ? 'rgba(245,158,11,0.15)' : `${selectedPlan.accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <selectedPlan.Icon size={22} color={selectedPlan.accentColor} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: selectedPlan.accentColor }}>
            {t('upgradingTo')}
          </p>
          <p style={{ margin: '2px 0 0', fontWeight: 900, fontSize: '1.05rem', color: selectedPlan.dark ? 'white' : '#111' }}>
            {selectedPlan.name} — {priceText} {t(selectedPlan.priceSub)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px' }}>

        {/* Card number */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t('cardNumber')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text" inputMode="numeric" dir="ltr"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              style={{ ...inputStyle(!!fieldErrors.card_number), paddingInlineStart: 44 }}
              onFocus={e => { e.currentTarget.style.borderColor = selectedPlan.accentColor }}
              onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.card_number ? '#dc2626' : '#e5e7eb' }}
            />
            <CreditCard size={16} color="#9ca3af" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          {fieldErrors.card_number && <p style={errStyle}><AlertCircle size={11} />{fieldErrors.card_number}</p>}
        </div>

        {/* Expiry + CVV */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>{t('expiry')}</label>
            <input
              type="text" inputMode="numeric" dir="ltr" placeholder={t('expiryPlaceholder')}
              value={expiryDate}
              onChange={e => setExpiryDate(formatExpiry(e.target.value))}
              style={inputStyle(!!fieldErrors.expiry_date)}
              onFocus={e => { e.currentTarget.style.borderColor = selectedPlan.accentColor }}
              onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.expiry_date ? '#dc2626' : '#e5e7eb' }}
            />
            {fieldErrors.expiry_date && <p style={errStyle}><AlertCircle size={11} />{fieldErrors.expiry_date}</p>}
          </div>
          <div>
            <label style={labelStyle}>{t('cvv')}</label>
            <input
              type="text" inputMode="numeric" dir="ltr" placeholder="123"
              value={cvv} maxLength={4}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={inputStyle(!!fieldErrors.cvv)}
              onFocus={e => { e.currentTarget.style.borderColor = selectedPlan.accentColor }}
              onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.cvv ? '#dc2626' : '#e5e7eb' }}
            />
            {fieldErrors.cvv && <p style={errStyle}><AlertCircle size={11} />{fieldErrors.cvv}</p>}
          </div>
        </div>

        {/* Cardholder name */}
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>{t('cardholder')}</label>
          <input
            type="text" placeholder={t('cardholderPlaceholder')}
            value={cardholderName}
            onChange={e => setCardholderName(e.target.value)}
            style={inputStyle(!!fieldErrors.cardholder_name)}
            onFocus={e => { e.currentTarget.style.borderColor = selectedPlan.accentColor }}
            onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.cardholder_name ? '#dc2626' : '#e5e7eb' }}
          />
          {fieldErrors.cardholder_name && <p style={errStyle}><AlertCircle size={11} />{fieldErrors.cardholder_name}</p>}
        </div>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(25,143,65,0.06)', border: '1px solid rgba(25,143,65,0.2)',
        }}>
          <Shield size={13} color="#198f41" />
          <span style={{ fontSize: '0.72rem', color: '#198f41', fontWeight: 600 }}>
            {t('secure')}
          </span>
        </div>

        {/* Global error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 12, marginBottom: 18,
            background: '#fef2f2', border: '1px solid #fecaca',
          }}>
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              background: 'transparent', border: '1.5px solid #e5e7eb',
              fontSize: '0.85rem', fontWeight: 700, color: '#6b7280',
              cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="rtl-flip" style={{ display: 'inline-block' }}>←</span> {t('back')}
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            style={{
              flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
              background: selectedPlan.dark
                ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                : `linear-gradient(135deg, ${selectedPlan.accentColor}, ${selectedPlan.accentColor}cc)`,
              color: selectedPlan.dark ? '#0f172a' : 'white',
              fontSize: '0.88rem', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Barlow, sans-serif', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 20px ${selectedPlan.accentColor}44`,
              opacity: loading ? 0.75 : 1,
              transition: 'filter 0.15s ease',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.06)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />{t('processing')}</>
              : <><Lock size={14} />{t('pay', { price: priceText })}</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SubscriptionUpgradePage({ currentPlan, onUpgradeSuccess }: Props) {
  const t = useTranslations('planUpgrade')
  const { short, label } = usePlanPrice()
  const priceOf = (p: { price: number | null }) => (p.price === null ? '…' : short(p.price))
  const paymentRef = useRef<HTMLDivElement>(null)
  const livePlans = useSellerPlans()
  const [selectedPlan, setSelectedPlan] = useState<LivePlan | null>(null)
  const [upgraded,     setUpgraded]     = useState(false)
  const [newPlan,      setNewPlan]      = useState<'red' | 'black' | null>(null)

  const planHierarchy: Record<ActivePlan, number> = { free: 0, red: 1, black: 2 }
  const currentLevel   = planHierarchy[currentPlan]
  const availablePlans = UPGRADE_PLANS.map(p => withLive(p, livePlans)).filter(p => planHierarchy[p.key] > currentLevel)
  const green          = withLive(GREEN_PLAN, livePlans)

  // For the 3-column grid: show green (current) + available upgrades
  const showGreenCard = currentPlan === 'free'

  const handleSelectPlan = (plan: LivePlan) => {
    setSelectedPlan(plan)
    setTimeout(() => {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  const handleSuccess = (plan: 'red' | 'black') => {
    setNewPlan(plan)
    setUpgraded(true)
    onUpgradeSuccess(plan)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Already on highest plan ───────────────────────────────────────────────
  if (currentPlan === 'black') {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24, background: '#f8f8f6',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
            background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={34} color="#f59e0b" />
          </div>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
            fontSize: '2rem', color: '#111', margin: '0 0 10px',
          }}>
            {t('topTitle')}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            {t.rich('topBody', { b: (chunks) => <strong style={{ color: '#f59e0b' }}>{chunks}</strong> })}
          </p>
        </div>
      </div>
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (upgraded && newPlan) {
    const meta = PLAN_META[newPlan]
    const Icon = newPlan === 'red' ? Flame : Crown
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
            background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={44} color="#198f41" />
          </div>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
            fontSize: '2.2rem', color: '#111', margin: '0 0 12px', letterSpacing: '-0.02em',
          }}>
            {t('successTitle')}
          </h2>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, margin: '0 0 16px',
            padding: '10px 20px', borderRadius: 999,
            background: `${meta.color}15`, border: `1.5px solid ${meta.color}35`,
          }}>
            <Icon size={18} color={meta.accentColor} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: meta.accentColor }}>
              {meta.name} — {label(meta.price)}
            </span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.7, margin: '0 0 28px' }}>
            {t('successBody')}
          </p>
          <a
            href="/seller/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 28px',
              borderRadius: 14,
              background: '#0f172a',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              fontFamily: 'Barlow, sans-serif',
              letterSpacing: '0.04em',
            }}
          >
            {t('goToDashboard')} <ChevronRight size={15} />
          </a>
        </div>
      </div>
    )
  }

  // ── Main upgrade UI ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(25,143,65,0); }
          50%     { box-shadow: 0 0 0 8px rgba(25,143,65,0.12); }
        }

        .upg-hero-anim { animation: fadeIn 0.55s ease both; }
        .upg-badge-anim { animation: slideDown 0.5s ease 0.15s both; }
        .upg-title-anim { animation: fadeUp 0.6s ease 0.2s both; }
        .upg-sub-anim   { animation: fadeUp 0.6s ease 0.32s both; }

        .upg-card {
          border-radius: 22px; border: 2px solid transparent;
          cursor: pointer; overflow: hidden; position: relative;
          transition: transform 0.28s cubic-bezier(.34,1.56,.64,1),
            box-shadow 0.28s ease, border-color 0.2s ease;
          will-change: transform;
        }
        .upg-card:hover { transform: translateY(-8px) scale(1.02); }
        .upg-card.selected { transform: translateY(-10px) scale(1.03); }
        .upg-card-red:hover,  .upg-card-red.selected  {
          box-shadow: 0 28px 56px rgba(219,20,46,0.28), 0 8px 20px rgba(219,20,46,0.14);
          border-color: #dc2626 !important;
        }
        .upg-card-black:hover, .upg-card-black.selected {
          box-shadow: 0 28px 56px rgba(245,158,11,0.22), 0 8px 20px rgba(0,0,0,0.28);
          border-color: #f59e0b !important;
        }

        /* Green card — current plan, not interactive */
        .upg-card-green-current {
          border-radius: 22px; overflow: hidden; position: relative;
          cursor: default;
          animation: glowPulse 3s ease-in-out infinite;
          border: 2px solid #86efac !important;
        }

        /* Staggered card entrance animations */
        .upg-card-enter-1 { animation: fadeUp 0.55s ease 0.1s both; }
        .upg-card-enter-2 { animation: fadeUp 0.55s ease 0.22s both; }
        .upg-card-enter-3 { animation: fadeUp 0.55s ease 0.34s both; }

        /* Payment form slide in */
        .payment-enter { animation: fadeUp 0.45s ease both; }
      `}</style>

      <div style={{ fontFamily: 'Barlow, sans-serif', background: '#f8f8f6', minHeight: '100vh' }}>

        {/* ── Hero header ── */}
        <div
          className="upg-hero-anim"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '56px 24px 52px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 3,
            background: 'linear-gradient(90deg, #db142e 0%, #198f41 50%, #db142e 100%)',
          }} />
          <div style={{
            position: 'absolute', top: '-60px', insetInlineEnd: '-60px',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(219,20,46,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', insetInlineStart: '-40px',
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(25,143,65,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="upg-badge-anim" style={{
              color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 14px',
            }}>
              {t('currentPlan')}
            </p>
            <div className="upg-badge-anim" style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <CurrentPlanBadge plan={currentPlan} />
            </div>
            <h1 className="upg-title-anim" style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: 'white',
              letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 14px',
            }}>
              {t('heroTitle')}
            </h1>
            <p className="upg-sub-anim" style={{
              color: 'rgba(255,255,255,0.5)', maxWidth: 420,
              margin: '0 auto', lineHeight: 1.7, fontSize: '0.92rem',
            }}>
              {t('heroBody')}
            </p>
          </div>
        </div>

        {/* ── Plan cards — 3 columns: Green (current) + available upgrades ── */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '52px 24px 8px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{
              color: '#db142e', fontSize: '0.72rem', fontWeight: 800,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>
              {t('chooseUpgrade')}
            </span>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#111',
              letterSpacing: '-0.02em', margin: '6px 0 0',
            }}>
              {t('threePlans')}
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {/* ── Green Pepper — current plan card ── */}
            {showGreenCard && (
              <div
                className="upg-card-green-current upg-card-enter-1"
                style={{ background: GREEN_PLAN.bgGradient }}
              >
                {/* "YOUR PLAN" badge */}
                <div style={{
                  position: 'absolute', top: 14, insetInlineStart: 14, zIndex: 2,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(25,143,65,0.9)', backdropFilter: 'blur(4px)',
                  borderRadius: 99, padding: '4px 10px',
                }}>
                  <CheckCircle size={10} color="white" />
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('yourPlan')}
                  </span>
                </div>

                <div style={{ padding: '28px 24px' }}>
                  {/* Icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${GREEN_PLAN.accentColor}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <GREEN_PLAN.Icon size={22} color={GREEN_PLAN.accentColor} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#111', lineHeight: 1 }}>{GREEN_PLAN.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 2 }}>{t(GREEN_PLAN.target)}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, color: '#111',
                    }}>
                      {priceOf(green)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#888', marginInlineStart: 6 }}>
                      {t(green.priceSub)}
                    </span>
                  </div>

                  {/* Commission */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: `${GREEN_PLAN.accentColor}12`, borderRadius: 8, padding: '6px 10px', marginBottom: 18,
                  }}>
                    <BarChart2 size={13} color={GREEN_PLAN.accentColor} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: GREEN_PLAN.accentColor }}>
                      {t('commission', { range: green.commission })}
                    </span>
                  </div>

                  {/* Max products */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem',
                    color: '#888', marginBottom: 18,
                  }}>
                    <Package size={13} color="#aaa" />
                    {green.loaded ? (green.maxProducts === null ? t('unlimitedProducts') : t('upToProducts', { count: green.maxProducts })) : '…'}
                  </div>

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {GREEN_PLAN.features.map(f => (
                      <li key={f.text} style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem',
                        color: f.ok ? '#333' : '#ccc',
                      }}>
                        {f.ok
                          ? <Check size={14} color={GREEN_PLAN.accentColor} style={{ flexShrink: 0 }} />
                          : <X size={14} style={{ flexShrink: 0 }} />
                        }
                        <span style={{ textDecoration: f.ok ? 'none' : 'line-through' }}>{t(`features.${f.text}`)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Active plan label — not a button */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '14px 24px', borderRadius: 14,
                    background: `${GREEN_PLAN.accentColor}15`,
                    border: `1.5px solid ${GREEN_PLAN.accentColor}35`,
                    color: GREEN_PLAN.accentColor, fontSize: '0.85rem', fontWeight: 800,
                    fontFamily: 'Barlow, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    <CheckCircle size={14} />
                    {t('activePlan')}
                  </div>
                </div>
              </div>
            )}

            {/* ── Upgrade plan cards ── */}
            {availablePlans.map((plan, idx) => {
              const isSelected = selectedPlan?.key === plan.key
              const enterClass = showGreenCard
                ? (idx === 0 ? 'upg-card-enter-2' : 'upg-card-enter-3')
                : (idx === 0 ? 'upg-card-enter-1' : 'upg-card-enter-2')
              return (
                <div
                  key={plan.key}
                  className={`upg-card upg-card-${plan.key}${isSelected ? ' selected' : ''} ${enterClass}`}
                  style={{
                    background: plan.bgGradient,
                    border: `2px solid ${isSelected ? plan.accentColor : plan.borderColor}`,
                  }}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: 14, insetInlineEnd: 14, zIndex: 1 }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
                        padding: '4px 10px', borderRadius: 999,
                        background: plan.dark
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #dc2626, #ff4060)',
                        color: plan.dark ? '#0f172a' : 'white',
                      }}>
                        {t(plan.badge)}
                      </span>
                    </div>
                  )}

                  <div style={{ padding: '26px 22px' }}>
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: plan.dark ? 'rgba(245,158,11,0.15)' : `${plan.accentColor}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <plan.Icon size={22} color={plan.accentColor} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1rem', color: plan.dark ? 'white' : '#111' }}>
                          {plan.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: plan.dark ? 'rgba(255,255,255,0.45)' : '#888', marginTop: 2 }}>
                          {t(plan.target)}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: 16 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '2.6rem', fontWeight: 900, lineHeight: 1,
                        color: plan.dark ? 'white' : '#111',
                      }}>
                        {priceOf(plan)}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: plan.dark ? 'rgba(255,255,255,0.4)' : '#888', marginInlineStart: 6 }}>
                        {t(plan.priceSub)}
                      </span>
                    </div>

                    {/* Commission */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
                      background: plan.dark ? 'rgba(245,158,11,0.12)' : `${plan.accentColor}12`,
                      borderRadius: 8, padding: '5px 10px',
                    }}>
                      <BarChart2 size={13} color={plan.dark ? '#f59e0b' : plan.accentColor} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: plan.dark ? '#f59e0b' : plan.accentColor }}>
                        {t('commission', { range: plan.commission })}
                      </span>
                    </div>

                    {/* Max products */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem',
                      color: plan.dark ? 'rgba(255,255,255,0.5)' : '#888', marginBottom: 18,
                    }}>
                      <Package size={13} color={plan.dark ? 'rgba(255,255,255,0.35)' : '#aaa'} />
                      {!plan.loaded ? '…' : plan.maxProducts ? t('upToProducts', { count: plan.maxProducts }) : t('unlimitedProducts')}
                    </div>

                    {/* Features */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {plan.features.map(f => (
                        <li key={f.text} style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem',
                          color: f.ok
                            ? (plan.dark ? 'rgba(255,255,255,0.85)' : '#333')
                            : (plan.dark ? 'rgba(255,255,255,0.2)' : '#ccc'),
                        }}>
                          {f.ok
                            ? <Check size={14} color={plan.dark ? '#f59e0b' : plan.accentColor} style={{ flexShrink: 0 }} />
                            : <X size={14} style={{ flexShrink: 0 }} />
                          }
                          <span style={{ textDecoration: f.ok ? 'none' : 'line-through' }}>{t(`features.${f.text}`)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA button */}
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '13px 20px', borderRadius: 13, border: 'none',
                        background: plan.dark
                          ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                          : `linear-gradient(135deg, ${plan.accentColor}, ${plan.accentColor}cc)`,
                        color: plan.dark ? '#0f172a' : 'white',
                        fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                        fontFamily: 'Barlow, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase',
                        boxShadow: isSelected
                          ? `0 8px 24px ${plan.dark ? 'rgba(245,158,11,0.4)' : `${plan.accentColor}55`}`
                          : 'none',
                        transition: 'filter 0.15s ease',
                      }}
                      onClick={e => { e.stopPropagation(); handleSelectPlan(plan) }}
                      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.07)')}
                      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                    >
                      {isSelected
                        ? <><CheckCircle size={15} /> {t('selectedPayNow')}</>
                        : <>{t('upgradeTo', { plan: plan.name })} <ArrowRight size={15} className="rtl-flip" /></>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af', marginTop: 20 }}>
            {t('allInclude')}
          </p>
        </div>

        {/* ── Payment section (scroll target) ── */}
        <div ref={paymentRef} style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px 60px' }}>
          {selectedPlan ? (
            <div className="payment-enter">
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <span style={{
                  color: '#db142e', fontSize: '0.72rem', fontWeight: 800,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>
                  {t('payment')}
                </span>
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#111',
                  letterSpacing: '-0.02em', margin: '6px 0 0',
                }}>
                  {t('completeUpgrade')}
                </h2>
              </div>
              <PaymentForm
                selectedPlan={selectedPlan}
                onSuccess={handleSuccess}
                onCancel={() => setSelectedPlan(null)}
              />
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px 24px', borderRadius: 16,
              background: 'white', border: '2px dashed #e5e7eb', color: '#9ca3af',
            }}>
              <CreditCard
                size={28}
                style={{ marginBottom: 10, opacity: 0.35, display: 'block', margin: '0 auto 10px' }}
              />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                {t('selectPlanHint')}
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  )
}