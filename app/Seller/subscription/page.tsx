'use client'

/**
 * app/seller/subscription/page.tsx
 *
 * Full subscription management page for approved sellers.
 * Handles: current plan display, upgrade, downgrade, cancel pending downgrade,
 * billing cycle info, plan history.
 *
 * Route: /seller/subscription
 * Layout: seller dashboard layout (inherits dark theme, sidebar)
 */

import { useState, useEffect } from 'react'
import {
  Leaf, Flame, Crown, Check, X, ArrowRight, ArrowDown,
  CreditCard, Lock, CheckCircle, Loader2, AlertCircle,
  Clock, Calendar, RefreshCw, Shield, ChevronRight,
  TrendingDown, AlertTriangle, History, BarChart2, Package,
} from 'lucide-react'
import { subscriptionApi, PLAN_META, type ActivePlan, type SubscriptionLifecycle, type PlanChange } from '@/lib/subscriptionApi'
import { refreshUser } from '@/lib/auth'
import { useTheme } from '../layout'

// ── Plan configuration ────────────────────────────────────────────────────────

const PLAN_ICONS: Record<ActivePlan, React.ElementType> = {
  free: Leaf, red: Flame, black: Crown,
}

const PLAN_FEATURES: Record<ActivePlan, string[]> = {
  free: [
    'Up to 30 active products',
    'Basic seller dashboard',
    'Flash sales & coupons',
    'Sponsoring system access',
  ],
  red: [
    'Up to 150 active products',
    'Advanced analytics dashboard',
    'AI Price Optimizer',
    'AI Sales Predictor',
    'AI Description Generator',
    'Bundle Recommender AI',
  ],
  black: [
    'Unlimited active products',
    'Everything in Red Pepper',
    'Homepage visibility boost',
    '3 free sponsored products/week',
    'Trend Detection AI',
    'Inventory AI alerts',
    'Reels & product photo shoots',
    'VIP Instagram/TikTok promotion',
  ],
}

// ── Helper: format card number ────────────────────────────────────────────────

function formatCardNumber(v: string): string {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlanBadge({ plan, size = 'md' }: { plan: ActivePlan; size?: 'sm' | 'md' | 'lg' }) {
  const meta  = PLAN_META[plan]
  const Icon  = PLAN_ICONS[plan]
  const sizes = { sm: { text: 11, icon: 12, pad: '3px 10px' }, md: { text: 13, icon: 15, pad: '5px 14px' }, lg: { text: 16, icon: 19, pad: '8px 20px' } }
  const s = sizes[size]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: s.pad, borderRadius: 999, background: `${meta.color}18`, border: `1.5px solid ${meta.color}40`, color: meta.accentColor, fontWeight: 800, fontSize: s.text }}>
      <Icon size={s.icon} />
      {meta.name}
    </span>
  )
}

// ── Payment form ──────────────────────────────────────────────────────────────

interface PaymentFormProps {
  targetPlan: 'red' | 'black'
  onSuccess: (plan: 'red' | 'black') => void
  onCancel: () => void
  dark: boolean
}

function PaymentForm({ targetPlan, onSuccess, onCancel, dark }: PaymentFormProps) {
  const [card, setCard]     = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv]       = useState('')
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const meta  = PLAN_META[targetPlan]
  const Icon  = PLAN_ICONS[targetPlan]
  const cardBg = dark ? '#1a1f2e' : '#fff'
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (card.replace(/\s/g, '').length < 13) errs.card = 'Enter a valid card number.'
    if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) errs.expiry = 'Use MM/YY format.'
    if (!cvv.match(/^\d{3,4}$/)) errs.cvv = '3 or 4 digit CVV.'
    if (name.trim().length < 2) errs.name = 'Enter cardholder name.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handlePay = async () => {
    if (!validate()) return
    setLoading(true); setError(null)
    try {
      await subscriptionApi.upgrade({
        plan:            targetPlan,
        card_number:     card.replace(/\s/g, ''),
        expiry_date:     expiry,
        cvv,
        cardholder_name: name.trim(),
      })
      await refreshUser()
      onSuccess(targetPlan)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Payment failed. Please try again.')
      const be = err?.response?.data?.errors ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(be).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? (v as string[])[0] : String(v) })
      if (Object.keys(mapped).length) setFieldErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: '100%', padding: '12px 16px', borderRadius: 10, boxSizing: 'border-box' as const,
    border: `1.5px solid ${hasErr ? '#dc2626' : borderColor}`,
    background: hasErr ? (dark ? '#2a1515' : '#fef2f2') : cardBg,
    color: dark ? '#fff' : '#111', fontSize: 14, outline: 'none',
  })

  return (
    <div style={{ background: cardBg, borderRadius: 16, border: `1.5px solid ${meta.color}30`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', background: `${meta.color}12`, borderBottom: `1px solid ${meta.color}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={meta.accentColor} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: meta.accentColor }}>Upgrading to</p>
          <p style={{ margin: '2px 0 0', fontWeight: 900, fontSize: 15, color: dark ? '#fff' : '#111' }}>{meta.name} — {meta.priceLabel}</p>
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <input type="text" inputMode="numeric" placeholder="Card number" value={card}
            onChange={e => setCard(formatCardNumber(e.target.value))}
            style={{ ...inputStyle(!!fieldErrors.card), paddingLeft: 44 }} />
          <CreditCard size={16} color="#9ca3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          {fieldErrors.card && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.card}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <input type="text" inputMode="numeric" placeholder="MM/YY" value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              style={inputStyle(!!fieldErrors.expiry)} />
            {fieldErrors.expiry && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.expiry}</p>}
          </div>
          <div>
            <input type="text" inputMode="numeric" placeholder="CVV" value={cvv} maxLength={4}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={inputStyle(!!fieldErrors.cvv)} />
            {fieldErrors.cvv && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.cvv}</p>}
          </div>
        </div>
        <div>
          <input type="text" placeholder="Cardholder name" value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle(!!fieldErrors.name)} />
          {fieldErrors.name && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.name}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(25,143,65,0.08)', border: '1px solid rgba(25,143,65,0.2)' }}>
          <Shield size={13} color="#198f41" />
          <span style={{ fontSize: 11, color: '#198f41', fontWeight: 600 }}>Payment is secured and encrypted</span>
        </div>
        {error && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: dark ? '#2a1515' : '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{error}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1.5px solid ${borderColor}`, color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handlePay} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${meta.accentColor}, ${meta.accentColor}cc)`, color: targetPlan === 'black' ? '#0f172a' : '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Processing…</> : <><Lock size={13} />Pay {meta.priceLabel}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Downgrade confirmation modal ──────────────────────────────────────────────

function DowngradeModal({ currentPlan, targetPlan, billingCycleEnd, daysRemaining, onConfirm, onCancel, loading, dark }: {
  currentPlan: ActivePlan; targetPlan: 'free' | 'red'
  billingCycleEnd: string | null; daysRemaining: number
  onConfirm: () => void; onCancel: () => void; loading: boolean; dark: boolean
}) {
  const currentMeta = PLAN_META[currentPlan]
  const targetMeta  = PLAN_META[targetPlan]
  const CurrentIcon = PLAN_ICONS[currentPlan]
  const TargetIcon  = PLAN_ICONS[targetPlan]
  const cardBg      = dark ? '#161b27' : '#fff'
  const textMain    = dark ? '#fff' : '#111'
  const textMuted   = dark ? 'rgba(255,255,255,0.5)' : '#6b7280'

  // Features that will be LOST
  const currentFeatures = PLAN_FEATURES[currentPlan]
  const targetFeatures  = new Set(PLAN_FEATURES[targetPlan])
  const lostFeatures    = currentFeatures.filter(f => !targetFeatures.has(f))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: cardBg, borderRadius: 20, border: '1.5px solid rgba(239,68,68,0.3)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={22} color="#ef4444" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: textMain }}>Confirm Downgrade</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>This takes effect at end of your billing cycle</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {/* Plan transition visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 10, background: `${currentMeta.color}10`, border: `1px solid ${currentMeta.color}25`, textAlign: 'center' as const }}>
              <CurrentIcon size={20} color={currentMeta.accentColor} style={{ margin: '0 auto 4px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: currentMeta.accentColor }}>{currentMeta.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Current</p>
            </div>
            <ArrowRight size={16} color={textMuted} />
            <div style={{ flex: 1, padding: '12px', borderRadius: 10, background: `${targetMeta.color}10`, border: `1px solid ${targetMeta.color}25`, textAlign: 'center' as const }}>
              <TargetIcon size={20} color={targetMeta.accentColor} style={{ margin: '0 auto 4px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: targetMeta.accentColor }}>{targetMeta.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>After downgrade</p>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Clock size={13} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 700, color: textMain }}>You keep all current features for {daysRemaining} more days</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: textMuted }}>
              Downgrade takes effect on{' '}
              <strong style={{ color: textMain }}>{billingCycleEnd ?? 'end of billing period'}</strong>.
              You can cancel this anytime before then.
            </p>
          </div>

          {/* Lost features */}
          {lostFeatures.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Features you will lose:</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {lostFeatures.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: textMuted }}>
                    <X size={11} color="#ef4444" style={{ flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note about products */}
          {targetPlan === 'free' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16 }}>
              <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, color: dark ? '#fbbf24' : '#92400e' }}>
                Products over the 30-product free tier limit will be soft-hidden (not deleted) and can be reactivated by upgrading.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'transparent', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, color: textMuted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Keep current plan
            </button>
            <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowDown size={13} />}
              {loading ? 'Scheduling…' : 'Schedule downgrade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SellerSubscriptionPage() {
  const { dark } = useTheme()
  const [status,       setStatus]       = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [history,      setHistory]      = useState<PlanChange[]>([])
  const [historyOpen,  setHistoryOpen]  = useState(false)

  // Upgrade flow state
  const [upgradeTarget, setUpgradeTarget] = useState<'red' | 'black' | null>(null)
  const [upgradeDone,   setUpgradeDone]   = useState(false)

  // Downgrade flow state
  const [downgradeTarget,  setDowngradeTarget]  = useState<'free' | 'red' | null>(null)
  const [downgradeLoading, setDowngradeLoading] = useState(false)
  const [downgradeDone,    setDowngradeDone]    = useState(false)

  // Cancel downgrade state
  const [cancelLoading, setCancelLoading] = useState(false)

  const cardBg    = dark ? '#161b27' : '#fff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff' : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#6b7280'

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await subscriptionApi.getStatus()
      setStatus(data)
    } catch {}
    finally { setLoading(false) }
  }

  const loadHistory = async () => {
    try {
      const h = await subscriptionApi.history()
      setHistory(h)
    } catch {}
  }

  useEffect(() => { loadStatus() }, [])
  useEffect(() => { if (historyOpen && history.length === 0) loadHistory() }, [historyOpen])

  const handleUpgradeSuccess = async (plan: 'red' | 'black') => {
    setUpgradeTarget(null)
    setUpgradeDone(true)
    await loadStatus()
  }

  const handleDowngradeConfirm = async () => {
    if (!downgradeTarget) return
    setDowngradeLoading(true)
    try {
      await subscriptionApi.downgrade(downgradeTarget)
      setDowngradeTarget(null)
      setDowngradeDone(true)
      await loadStatus()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to schedule downgrade.')
    } finally {
      setDowngradeLoading(false)
    }
  }

  const handleCancelDowngrade = async () => {
    setCancelLoading(true)
    try {
      await subscriptionApi.cancelDowngrade()
      await loadStatus()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to cancel downgrade.')
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#db142e' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const currentPlan: ActivePlan = status?.plan ?? 'free'
  const sub: SubscriptionLifecycle | null = status?.subscription ?? null
  const currentMeta = PLAN_META[currentPlan]
  const CurrentIcon = PLAN_ICONS[currentPlan]
  const planHierarchy: Record<ActivePlan, number> = { free: 0, red: 1, black: 2 }
  const currentLevel = planHierarchy[currentPlan]

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} } .sub-enter { animation: fadeUp 0.4s ease both; }`}</style>

      {/* Downgrade modal */}
      {downgradeTarget && (
        <DowngradeModal
          currentPlan={currentPlan}
          targetPlan={downgradeTarget}
          billingCycleEnd={sub?.billing_cycle_end ?? null}
          daysRemaining={sub?.days_remaining ?? 0}
          onConfirm={handleDowngradeConfirm}
          onCancel={() => setDowngradeTarget(null)}
          loading={downgradeLoading}
          dark={dark}
        />
      )}

      <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Subscription & Plan</h1>
          <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Manage your seller plan, upgrade or downgrade your subscription.</p>
        </div>

        {/* ── Success banners ── */}
        {upgradeDone && (
          <div className="sub-enter" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={18} color="#10b981" />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#10b981' }}>Upgrade successful! Your new plan is now active.</p>
            <button onClick={() => setUpgradeDone(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', marginLeft: 'auto' }}><X size={14} /></button>
          </div>
        )}
        {downgradeDone && (
          <div className="sub-enter" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Clock size={18} color="#f59e0b" />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>Downgrade scheduled. You keep your current features until end of billing cycle.</p>
            <button onClick={() => setDowngradeDone(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', marginLeft: 'auto' }}><X size={14} /></button>
          </div>
        )}

        {/* ── Current Plan Card ── */}
        <div className="sub-enter" style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: textMuted, margin: '0 0 12px' }}>Current Plan</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${currentMeta.color}18`, border: `1.5px solid ${currentMeta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CurrentIcon size={26} color={currentMeta.accentColor} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: currentMeta.accentColor }}>{currentMeta.name}</span>
                  {sub?.status && sub.status !== 'active' && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: sub.status === 'grace_period' ? 'rgba(245,158,11,0.15)' : sub.status === 'suspended' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)', color: sub.status === 'grace_period' ? '#f59e0b' : sub.status === 'suspended' ? '#ef4444' : '#94a3b8' }}>
                      {sub.status_label}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
                  {currentPlan === 'free' ? 'Free forever' : `${currentMeta.priceLabel} · auto-renews monthly`}
                </p>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: textMain }}>{currentMeta.priceLabel === 'Free' ? 'Free' : currentMeta.priceLabel.split('/')[0]}</p>
                {currentPlan !== 'free' && <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>/month</p>}
              </div>
            </div>
          </div>

          {/* Billing cycle info */}
          {sub && sub.billing_cycle_end && currentPlan !== 'free' && (
            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap' as const, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} color={textMuted} />
                <span style={{ fontSize: 12, color: textMuted }}>Cycle: <strong style={{ color: textMain }}>{sub.billing_cycle_start} → {sub.billing_cycle_end}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color={textMuted} />
                <span style={{ fontSize: 12, color: textMuted }}><strong style={{ color: textMain }}>{sub.days_remaining} days</strong> remaining</span>
              </div>
              {sub.max_products !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={14} color={textMuted} />
                  <span style={{ fontSize: 12, color: textMuted }}>Max <strong style={{ color: textMain }}>{sub.max_products}</strong> active products</span>
                </div>
              )}
            </div>
          )}

          {/* Pending downgrade banner */}
          {sub?.has_pending_downgrade && sub.pending_plan && (
            <div style={{ padding: '14px 22px', background: 'rgba(245,158,11,0.08)', borderBottom: `1px solid rgba(245,158,11,0.2)`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                  Downgrade to {PLAN_META[sub.pending_plan].name} scheduled for {sub.billing_cycle_end}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>
                  You keep all current features until then. Cancel anytime.
                </p>
              </div>
              <button
                onClick={handleCancelDowngrade}
                disabled={cancelLoading}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(245,158,11,0.4)', background: 'transparent', color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: cancelLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                {cancelLoading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
                Cancel downgrade
              </button>
            </div>
          )}

          {/* Current features */}
          <div style={{ padding: '14px 22px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: textMuted, margin: '0 0 10px' }}>Included Features</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {PLAN_FEATURES[currentPlan].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: textMain }}>
                  <Check size={12} color={currentMeta.accentColor} style={{ flexShrink: 0 }} /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Upgrade form (shown when plan selected) ── */}
        {upgradeTarget && (
          <div className="sub-enter">
            <PaymentForm
              targetPlan={upgradeTarget}
              onSuccess={handleUpgradeSuccess}
              onCancel={() => setUpgradeTarget(null)}
              dark={dark}
            />
          </div>
        )}

        {/* ── Plan options grid ── */}
        {!upgradeTarget && (
          <div className="sub-enter">
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: textMuted, margin: '0 0 12px' }}>
              {currentLevel === 2 ? 'You are on the highest plan' : 'Upgrade or Downgrade'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {(['free', 'red', 'black'] as ActivePlan[]).map(plan => {
                const meta   = PLAN_META[plan]
                const Icon   = PLAN_ICONS[plan]
                const level  = planHierarchy[plan]
                const isCurrent = plan === currentPlan
                const isUpgrade = level > currentLevel
                const isDowngrade = level < currentLevel
                const isPending = sub?.pending_plan === plan

                return (
                  <div key={plan} style={{
                    background: isCurrent ? `${meta.color}0a` : cardBg,
                    borderRadius: 14,
                    border: `1.5px solid ${isCurrent ? meta.color + '40' : border}`,
                    padding: '18px',
                    position: 'relative',
                    opacity: isPending ? 0.7 : 1,
                  }}>
                    {isCurrent && (
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `${meta.color}20`, color: meta.accentColor, border: `1px solid ${meta.color}40` }}>CURRENT</span>
                      </div>
                    )}
                    {isPending && (
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>SCHEDULED</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={meta.accentColor} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: isCurrent ? meta.accentColor : textMain }}>{meta.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: textMuted }}>{meta.priceLabel}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '5px 8px', borderRadius: 7, background: `${meta.color}0d`, width: 'fit-content' as const }}>
                      <BarChart2 size={12} color={meta.accentColor} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta.accentColor }}>{meta.commission} commission</span>
                    </div>

                    {isCurrent ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, background: `${meta.color}10`, border: `1px solid ${meta.color}20`, fontSize: 12, fontWeight: 700, color: meta.accentColor }}>
                        <CheckCircle size={13} /> Active Plan
                      </div>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => setUpgradeTarget(plan as 'red' | 'black')}
                        style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${meta.accentColor}, ${meta.accentColor}cc)`, color: plan === 'black' ? '#0f172a' : '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        Upgrade <ArrowRight size={12} />
                      </button>
                    ) : isDowngrade && !isPending && !sub?.has_pending_downgrade ? (
                      <button
                        onClick={() => setDowngradeTarget(plan as 'free' | 'red')}
                        style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, background: 'transparent', color: textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <ArrowDown size={12} /> Downgrade
                      </button>
                    ) : isDowngrade && sub?.has_pending_downgrade && !isPending ? (
                      <div style={{ fontSize: 11, color: textMuted, textAlign: 'center' as const, padding: '9px' }}>Downgrade already scheduled</div>
                    ) : isDowngrade && isPending ? (
                      <div style={{ fontSize: 11, color: '#f59e0b', textAlign: 'center' as const, padding: '9px', fontWeight: 700 }}>Downgrade scheduled</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Plan Change History ── */}
        <div className="sub-enter" style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <button onClick={() => setHistoryOpen(p => !p)} style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={16} color={textMuted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>Plan Change History</span>
            </div>
            <ChevronRight size={15} color={textMuted} style={{ transform: historyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {historyOpen && (
            <div style={{ borderTop: `1px solid ${border}` }}>
              {history.length === 0 ? (
                <p style={{ padding: '20px 18px', margin: 0, fontSize: 12, color: textMuted, textAlign: 'center' as const }}>No plan changes yet.</p>
              ) : history.map((h, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: i < history.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: h.change_type === 'upgrade' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {h.change_type === 'upgrade' ? <ArrowRight size={12} color="#10b981" /> : <ArrowDown size={12} color="#ef4444" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: textMain }}>
                      <PlanBadge plan={h.from_plan} size="sm" /> → <PlanBadge plan={h.to_plan} size="sm" />
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>{h.reason}</p>
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: h.change_type === 'upgrade' ? '#10b981' : textMuted }}>
                      {h.amount_charged > 0 ? `+${h.amount_charged.toFixed(0)} TND` : h.change_type_label}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: textMuted }}>{new Date(h.effective_at).toLocaleDateString('fr-TN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}