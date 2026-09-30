// components/seller/SubscriptionUpgradePage.tsx
'use client'

import { useState, useRef } from 'react'
import {
  Leaf, Flame, Crown, Check, X, ArrowRight,
  CheckCircle, MessageCircle,
  BarChart2, Package,
} from 'lucide-react'
import { PLAN_META, ActivePlan } from '@/lib/subscriptionApi'
import type { PaymentRequest } from '@/lib/paymentRequestsApi'
import { ManualPaymentConfirmation, PlanUpgradeRequest } from '@/app/components/seller/ManualPayment'
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function SubscriptionUpgradePage({ currentPlan, onUpgradeSuccess }: Props) {
  const t = useTranslations('planUpgrade')
  const { short, label } = usePlanPrice()
  const priceOf = (p: { price: number | null }) => (p.price === null ? '…' : short(p.price))
  const paymentRef = useRef<HTMLDivElement>(null)
  const livePlans = useSellerPlans()
  const [selectedPlan, setSelectedPlan] = useState<LivePlan | null>(null)
  const [created,      setCreated]      = useState<PaymentRequest | null>(null)

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
              {created ? (
                <ManualPaymentConfirmation request={created} onClose={() => { setCreated(null); setSelectedPlan(null) }} />
              ) : (
                <PlanUpgradeRequest
                  plan={selectedPlan.key}
                  planName={selectedPlan.name}
                  priceMonthly={selectedPlan.price ?? 0}
                  priceYearly={livePlans?.[selectedPlan.key]?.price_yearly ?? null}
                  onCreated={setCreated}
                  onCancel={() => setSelectedPlan(null)}
                />
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px 24px', borderRadius: 16,
              background: 'white', border: '2px dashed #e5e7eb', color: '#9ca3af',
            }}>
              <MessageCircle
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