'use client'

/**
 * CommissionUpgradeNudge
 *
 * Shown on the seller dashboard for free/red plan sellers.
 * Calculates hypothetical savings based on their actual revenue
 * if they upgraded to the next plan.
 *
 * Usage in app/seller/page.tsx (dashboard):
 *
 *   import CommissionUpgradeNudge from './components/CommissionUpgradeNudge'
 *
 *   // Drop it after the KPI cards section, before the revenue chart:
 *   <CommissionUpgradeNudge
 *     currentPlan={data.seller_plan ?? 'free'}
 *     monthlyRevenue={summary.revenue_this_month}
 *     dark={dark}
 *   />
 *
 * NOTE: requires seller_plan to be added to SellerDashboardController response.
 * See DASHBOARD_CONTROLLER_PATCH.php for the 2-line backend addition.
 */

import { Flame, Crown, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

interface CommissionUpgradeNudgeProps {
  currentPlan:     string
  monthlyRevenue:  number
  dark:            boolean
}

const COMMISSION_RATES: Record<string, number> = {
  free:  0.15,   // worst case (15%)
  red:   0.12,   // average with -3% reduction at ~12% tier
  black: 0.09,   // average with -6% reduction at ~5–10% tier
}

const NEXT_PLAN: Record<string, { key: string; name: string; cost: number; icon: React.ElementType; color: string }> = {
  free: { key: 'red',   name: 'Red Pepper',   cost: 49,  icon: Flame, color: '#db142e' },
  red:  { key: 'black', name: 'Black Pepper',  cost: 129, icon: Crown, color: '#f59e0b' },
}

export default function CommissionUpgradeNudge({
  currentPlan, monthlyRevenue, dark,
}: CommissionUpgradeNudgeProps) {
  const [dismissed, setDismissed] = useState(false)

  const next = NEXT_PLAN[currentPlan]
  if (!next || dismissed || monthlyRevenue <= 0) return null

  // Estimate monthly savings: difference in effective commission rates
  const currentRate  = COMMISSION_RATES[currentPlan]  ?? 0.15
  const nextRate     = COMMISSION_RATES[next.key]      ?? 0.07
  const currentFees  = monthlyRevenue * currentRate
  const nextFees     = monthlyRevenue * nextRate
  const monthlySaved = Math.max(0, currentFees - nextFees)
  const netGain      = monthlySaved - next.cost

  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#ffffff' : '#0f172a'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#94a3b8'

  const { icon: Icon, color, name, cost } = next

  return (
    <div style={{
      background: cardBg,
      borderRadius: 16,
      border: `1px solid ${color}30`,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 120, height: 120, borderRadius: '50%',
        background: color, opacity: dark ? 0.08 : 0.06,
        filter: 'blur(30px)', pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: textMain }}>
          Upgrade to {name} and keep more of your revenue
        </p>
        <p style={{ margin: 0, fontSize: 11, color: textMuted, fontWeight: 500 }}>
          Based on this month's revenue of {monthlyRevenue.toFixed(0)} TND — you'd save{' '}
          <span style={{ color, fontWeight: 800 }}>~{monthlySaved.toFixed(0)} TND/month</span>
          {' '}in fees vs your current plan.
          {netGain > 0 && (
            <span style={{ fontWeight: 700, color: '#10b981' }}>
              {' '}Net gain after {cost} DT plan cost: +{netGain.toFixed(0)} TND.
            </span>
          )}
        </p>
      </div>

      {/* CTA */}
      <a
        href="/become-a-vendor"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 10, border: 'none',
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: currentPlan === 'red' ? '#0f172a' : '#fff',
          fontSize: 12, fontWeight: 800, textDecoration: 'none',
          whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: `0 4px 12px ${color}40`,
          transition: 'filter 0.15s',
        }}
      >
        Upgrade <ArrowRight size={13} />
      </a>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'transparent', border: 'none',
          cursor: 'pointer', color: textMuted, padding: 4,
        }}
        title="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}