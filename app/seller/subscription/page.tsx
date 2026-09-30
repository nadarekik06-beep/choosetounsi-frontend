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
  CheckCircle, Loader2, MessageCircle,
  Clock, Calendar, RefreshCw, ChevronRight,
  TrendingDown, AlertTriangle, History, BarChart2, Package,
} from 'lucide-react'
import { subscriptionApi, planMeta, planKeys, planRank, planTier, livePlan, type ActivePlan, type SubscriptionLifecycle, type PlanChange } from '@/lib/subscriptionApi'
import { openWhatsApp, paymentRequestsApi, type PaymentRequest } from '@/lib/paymentRequestsApi'
import { ManualPaymentConfirmation, PaymentRequestHistory, PlanUpgradeRequest } from '@/app/components/seller/ManualPayment'
import { useTheme } from '../SellerShell'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { usePlanPrice } from '@/lib/i18n/usePlanPrice'
import { ink } from '@/app/seller/ink';

type Translate = ReturnType<typeof useTranslations>

// ── Plan configuration ────────────────────────────────────────────────────────

const TIER_ICONS: React.ElementType[] = [Leaf, Flame, Crown]
/** Icon by tier, so admin-created plans get the look of their tier. */
const planIcon = (slug: string) => TIER_ICONS[planTier(slug)]

// Plan features the backend enforces (subscription_plans.features) → seller.subscription.backendFeatures.<key>
const BACKEND_FEATURES = ['analytics', 'ai_tools', 'black_hub', 'promotions', 'coupons', 'sponsorships'] as const

/** Feature list for any plan: marketing copy for the base plans, live flags for custom ones. */
function planFeatures(slug: string, t: Translate): string[] {
  const meta  = planMeta(slug)
  const limit = meta.maxProducts === null ? t('features.unlimited') : t('features.upTo', { count: meta.maxProducts })
  const base  = PLAN_FEATURES[slug as ActivePlan]
  if (base) return [limit, ...base.map(key => t(`features.${key}`))]
  const flags = livePlan(slug)?.features ?? {}
  return [limit, ...BACKEND_FEATURES.filter(k => flags[k]).map(k => t(`backendFeatures.${k}`))]
}

// Marketing features per base plan (after the product limit) → seller.subscription.features.<key>
const PLAN_FEATURES: Record<ActivePlan, string[]> = {
  free:  ['basicDashboard', 'flashCoupons', 'sponsoring'],
  red:   ['analytics', 'priceOptimizer', 'salesPredictor', 'descriptionGenerator', 'bundleRecommender'],
  black: ['everythingRed', 'homepageBoost', 'freeSponsored', 'trendDetection', 'inventoryAlerts', 'reels', 'vipPromotion'],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlanBadge({ plan, size = 'md' }: { plan: string; size?: 'sm' | 'md' | 'lg' }) {
  const { dark } = useTheme();
  const meta  = planMeta(plan)
  const Icon  = planIcon(plan)
  const sizes = { sm: { text: 11, icon: 12, pad: '3px 10px' }, md: { text: 13, icon: 15, pad: '5px 14px' }, lg: { text: 16, icon: 19, pad: '8px 20px' } }
  const s = sizes[size]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: s.pad, borderRadius: 999, background: `${meta.color}18`, border: `1.5px solid ${meta.color}40`, color: ink(meta.accentColor, dark), fontWeight: 800, fontSize: s.text }}>
      <Icon size={s.icon} />
      {meta.name}
    </span>
  )
}

// ── Downgrade confirmation modal ──────────────────────────────────────────────

function DowngradeModal({ currentPlan, targetPlan, billingCycleEnd, daysRemaining, onConfirm, onCancel, loading, dark }: {
  currentPlan: string; targetPlan: string
  billingCycleEnd: string | null; daysRemaining: number
  onConfirm: () => void; onCancel: () => void; loading: boolean; dark: boolean
}) {
  const t = useTranslations('seller.subscription')
  const { date } = useFormat()
  const currentMeta = planMeta(currentPlan)
  const targetMeta  = planMeta(targetPlan)
  const CurrentIcon = planIcon(currentPlan)
  const TargetIcon  = planIcon(targetPlan)
  const cardBg      = dark ? '#161b27' : '#fff'
  const textMain    = dark ? '#fff' : '#111'
  const textMuted   = dark ? 'rgba(255,255,255,0.5)' : '#5b6472'

  // Features that will be LOST
  const currentFeatures = planFeatures(currentPlan, t)
  const targetFeatures  = new Set(planFeatures(targetPlan, t))
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
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: textMain }}>{t('downgrade.title')}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>{t('downgrade.subtitle')}</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label={t('close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {/* Plan transition visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 10, background: `${currentMeta.color}10`, border: `1px solid ${currentMeta.color}25`, textAlign: 'center' as const }}>
              <CurrentIcon size={20} color={currentMeta.accentColor} style={{ margin: '0 auto 4px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: ink(currentMeta.accentColor, dark) }}>{currentMeta.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{t('downgrade.current')}</p>
            </div>
            <ArrowRight size={16} color={textMuted} className="rtl-flip" />
            <div style={{ flex: 1, padding: '12px', borderRadius: 10, background: `${targetMeta.color}10`, border: `1px solid ${targetMeta.color}25`, textAlign: 'center' as const }}>
              <TargetIcon size={20} color={targetMeta.accentColor} style={{ margin: '0 auto 4px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: ink(targetMeta.accentColor, dark) }}>{targetMeta.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{t('downgrade.after')}</p>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Clock size={13} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 700, color: textMain }}>{t('downgrade.keepFor', { count: daysRemaining })}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: textMuted }}>
              {t.rich('downgrade.effectiveOn', {
                date: billingCycleEnd ? date(billingCycleEnd, 'medium') : t('downgrade.endOfPeriod'),
                b: (chunks) => <strong style={{ color: textMain }}>{chunks}</strong>,
              })}
            </p>
          </div>

          {/* Lost features */}
          {lostFeatures.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: ink('#ef4444', dark), marginBottom: 8 }}>{t('downgrade.lose')}</p>
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
                {t('downgrade.productsNote')}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'transparent', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, color: textMuted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t('downgrade.keep')}
            </button>
            <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowDown size={13} />}
              {loading ? t('downgrade.scheduling') : t('downgrade.schedule')}
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
  const t = useTranslations('seller.subscription')
  const tm = useTranslations('manualPayment')
  const { date, number } = useFormat()
  const { label: priceLabel, short: priceShort } = usePlanPrice()
  const [status,       setStatus]       = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [history,      setHistory]      = useState<PlanChange[]>([])
  const [historyOpen,  setHistoryOpen]  = useState(false)

  // Upgrade flow state: pick a plan → WhatsApp payment request → admin activates it
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null)
  const [requests,      setRequests]      = useState<PaymentRequest[]>([])
  const [created,       setCreated]       = useState<PaymentRequest | null>(null)

  // Downgrade flow state
  const [downgradeTarget,  setDowngradeTarget]  = useState<string | null>(null)
  const [downgradeLoading, setDowngradeLoading] = useState(false)
  const [downgradeDone,    setDowngradeDone]    = useState(false)

  // Cancel downgrade state
  const [cancelLoading, setCancelLoading] = useState(false)

  const cardBg    = dark ? '#161b27' : '#fff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff' : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.55)' : '#5b6472'
  const palette   = { text: textMain, muted: textMuted, border, card: cardBg, cardAlt: dark ? '#1a2030' : '#f8f9fb' }

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

  const loadRequests = async () => {
    try { setRequests((await paymentRequestsApi.list('plan_upgrade')).data) } catch {}
  }

  useEffect(() => { loadStatus(); loadRequests() }, [])
  useEffect(() => { if (historyOpen && history.length === 0) loadHistory() }, [historyOpen])

  const handleRequestCreated = (r: PaymentRequest) => {
    setUpgradeTarget(null)
    setCreated(r)
    loadRequests()
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
      alert(err?.response?.data?.message ?? t('downgrade.failed'))
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
      alert(err?.response?.data?.message ?? t('cancelFailed'))
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

  const currentPlan: string = status?.plan ?? 'free'
  const sub: SubscriptionLifecycle | null = status?.subscription ?? null
  const currentMeta = planMeta(currentPlan)
  const CurrentIcon = planIcon(currentPlan)
  const offered      = planKeys()
  const currentLevel = planRank(currentPlan)
  const topLevel     = Math.max(...offered.map(planRank), currentLevel)
  const pendingRequest = requests.find(r => r.status === 'pending') ?? null

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
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
          <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{t('subtitle')}</p>
        </div>

        {/* ── Success banners ── */}
        {created && <div className="sub-enter"><ManualPaymentConfirmation request={created} palette={palette} onClose={() => setCreated(null)} /></div>}
        {!created && pendingRequest && (
          <div className="sub-enter" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', flexWrap: 'wrap' }}>
            <Clock size={18} color="#f59e0b" />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ink('#d97706', dark), flex: '1 1 240px' }}>{tm('pendingUpgrade', { reference: pendingRequest.reference })}</p>
            {pendingRequest.whatsapp_url && (
              <button onClick={() => openWhatsApp(pendingRequest.whatsapp_url!)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#073b1c', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                <MessageCircle size={13} />{tm('reopen')}
              </button>
            )}
          </div>
        )}
        {downgradeDone && (
          <div className="sub-enter" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Clock size={18} color="#f59e0b" />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ink('#f59e0b', dark) }}>{t('downgradeDone')}</p>
            <button onClick={() => setDowngradeDone(false)} aria-label={t('close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ink('#f59e0b', dark), marginInlineStart: 'auto' }}><X size={14} /></button>
          </div>
        )}

        {/* ── Current Plan Card ── */}
        <div className="sub-enter" style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', borderBottom: `1px solid ${border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: textMuted, margin: '0 0 12px' }}>{t('currentPlan')}</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${currentMeta.color}18`, border: `1.5px solid ${currentMeta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CurrentIcon size={26} color={currentMeta.accentColor} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: ink(currentMeta.accentColor, dark) }}>{currentMeta.name}</span>
                  {sub?.status && sub.status !== 'active' && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: sub.status === 'grace_period' ? 'rgba(245,158,11,0.15)' : sub.status === 'suspended' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)', color: sub.status === 'grace_period' ? ink('#f59e0b', dark) : sub.status === 'suspended' ? ink('#ef4444', dark) : ink('#94a3b8', dark) }}>
                      {sub.status_label}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
                  {currentPlan === 'free' ? t('freeForever') : t('autoRenews', { price: priceLabel(currentMeta.price) })}
                </p>
              </div>
              <div style={{ textAlign: 'end' as const, flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: textMain }}>{priceShort(currentMeta.price)}</p>
                {currentMeta.price > 0 && <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>{t('perMonthShort')}</p>}
              </div>
            </div>
          </div>

          {/* Billing cycle info */}
          {sub && sub.billing_cycle_end && currentPlan !== 'free' && (
            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap' as const, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} color={textMuted} />
                <span style={{ fontSize: 12, color: textMuted }}>{t.rich('cycle', {
                  from: sub.billing_cycle_start ? date(sub.billing_cycle_start, 'medium') : '—',
                  to: date(sub.billing_cycle_end, 'medium'),
                  b: (chunks) => <strong style={{ color: textMain }}>{chunks}</strong>,
                })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color={textMuted} />
                <span style={{ fontSize: 12, color: textMuted }}>{t.rich('daysRemaining', { count: sub.days_remaining, b: (chunks) => <strong style={{ color: textMain }}>{chunks}</strong> })}</span>
              </div>
              {sub.max_products !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={14} color={textMuted} />
                  <span style={{ fontSize: 12, color: textMuted }}>{t.rich('maxProducts', { count: sub.max_products, b: (chunks) => <strong style={{ color: textMain }}>{chunks}</strong> })}</span>
                </div>
              )}
            </div>
          )}

          {/* Pending downgrade banner */}
          {sub?.has_pending_downgrade && sub.pending_plan && (
            <div style={{ padding: '14px 22px', background: 'rgba(245,158,11,0.08)', borderBottom: `1px solid rgba(245,158,11,0.2)`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: ink('#f59e0b', dark) }}>
                  {t('pendingDowngrade', { plan: planMeta(sub.pending_plan).name, date: sub.billing_cycle_end ? date(sub.billing_cycle_end, 'medium') : '—' })}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>
                  {t('pendingDowngradeHint')}
                </p>
              </div>
              <button
                onClick={handleCancelDowngrade}
                disabled={cancelLoading}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(245,158,11,0.4)', background: 'transparent', color: ink('#f59e0b', dark), fontSize: 11, fontWeight: 700, cursor: cancelLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                {cancelLoading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
                {t('cancelDowngrade')}
              </button>
            </div>
          )}

          {/* Current features */}
          <div style={{ padding: '14px 22px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: textMuted, margin: '0 0 10px' }}>{t('includedFeatures')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {planFeatures(currentPlan, t).map(f => (
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
            <PlanUpgradeRequest
              plan={upgradeTarget}
              planName={planMeta(upgradeTarget).name}
              priceMonthly={planMeta(upgradeTarget).price}
              priceYearly={livePlan(upgradeTarget)?.price_yearly ?? null}
              palette={palette}
              onCreated={handleRequestCreated}
              onCancel={() => setUpgradeTarget(null)}
            />
          </div>
        )}

        {/* ── Plan options grid ── */}
        {!upgradeTarget && (
          <div className="sub-enter">
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: textMuted, margin: '0 0 12px' }}>
              {currentLevel >= topLevel ? t('highestPlan') : t('changePlan')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {offered.map(plan => {
                const meta   = planMeta(plan)
                const Icon   = planIcon(plan)
                const level  = planRank(plan)
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
                      <div style={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: `${meta.color}20`, color: ink(meta.accentColor, dark), border: `1px solid ${meta.color}40` }}>{t('badgeCurrent')}</span>
                      </div>
                    )}
                    {isPending && (
                      <div style={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.2)', color: ink('#f59e0b', dark), border: '1px solid rgba(245,158,11,0.3)' }}>{t('badgeScheduled')}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={meta.accentColor} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: isCurrent ? meta.accentColor : textMain }}>{meta.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: textMuted }}>{priceLabel(meta.price)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '5px 8px', borderRadius: 7, background: `${meta.color}0d`, width: 'fit-content' as const }}>
                      <BarChart2 size={12} color={meta.accentColor} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: ink(meta.accentColor, dark) }}>{t('commission', { range: meta.commission })}</span>
                    </div>

                    {isCurrent ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, background: `${meta.color}10`, border: `1px solid ${meta.color}20`, fontSize: 12, fontWeight: 700, color: ink(meta.accentColor, dark) }}>
                        <CheckCircle size={13} /> {t('activePlan')}
                      </div>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => setUpgradeTarget(plan)}
                        style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${meta.accentColor}, ${meta.accentColor}cc)`, color: plan === 'black' ? '#0f172a' : '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {t('upgrade')} <ArrowRight size={12} className="rtl-flip" />
                      </button>
                    ) : isDowngrade && !isPending && !sub?.has_pending_downgrade ? (
                      <button
                        onClick={() => setDowngradeTarget(plan)}
                        style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, background: 'transparent', color: textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <ArrowDown size={12} /> {t('downgradeBtn')}
                      </button>
                    ) : isDowngrade && sub?.has_pending_downgrade && !isPending ? (
                      <div style={{ fontSize: 11, color: textMuted, textAlign: 'center' as const, padding: '9px' }}>{t('alreadyScheduled')}</div>
                    ) : isDowngrade && isPending ? (
                      <div style={{ fontSize: 11, color: ink('#f59e0b', dark), textAlign: 'center' as const, padding: '9px', fontWeight: 700 }}>{t('scheduled')}</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Payment requests (WhatsApp) ── */}
        {requests.length > 0 && (
          <div className="sub-enter" style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 18px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 6px' }}>{tm('historyTitle')}</p>
            <PaymentRequestHistory requests={requests} palette={palette} onChanged={loadRequests} />
          </div>
        )}

        {/* ── Plan Change History ── */}
        <div className="sub-enter" style={{ background: cardBg, borderRadius: 14, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <button onClick={() => setHistoryOpen(p => !p)} style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={16} color={textMuted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>{t('history')}</span>
            </div>
            <ChevronRight size={15} color={textMuted} style={{ rotate: historyOpen ? '90deg' : '0deg', transition: 'rotate 0.2s' }} />
          </button>
          {historyOpen && (
            <div style={{ borderTop: `1px solid ${border}` }}>
              {history.length === 0 ? (
                <p style={{ padding: '20px 18px', margin: 0, fontSize: 12, color: textMuted, textAlign: 'center' as const }}>{t('noHistory')}</p>
              ) : history.map((h, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: i < history.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: h.change_type === 'upgrade' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {h.change_type === 'upgrade' ? <ArrowRight size={12} color="#10b981" className="rtl-flip" /> : <ArrowDown size={12} color="#ef4444" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: textMain }}>
                      <PlanBadge plan={h.from_plan} size="sm" /> <span className="rtl-flip" style={{ display: 'inline-block' }}>→</span> <PlanBadge plan={h.to_plan} size="sm" />
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted }}>{h.reason}</p>
                  </div>
                  <div style={{ textAlign: 'end' as const, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: h.change_type === 'upgrade' ? ink('#10b981', dark) : textMuted }}>
                      {h.amount_charged > 0 ? `+${priceShort(h.amount_charged)}` : h.change_type_label}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: textMuted }}>{date(h.effective_at, 'short')}</p>
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