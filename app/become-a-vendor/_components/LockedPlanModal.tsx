'use client'

import { X, ArrowRight, Leaf, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SellerPlanInfo } from '@/lib/platformApi'
import { planStyleOf, usePlanPrice } from './shared'

// Shown when a paid plan is picked before approval: every seller starts on the free plan.
export default function LockedPlanModal({ plan, onClose, onScrollToForm }: {
  plan: SellerPlanInfo; onClose: () => void; onScrollToForm: () => void
}) {
  const t           = useTranslations('vendor.locked')
  const planPriceOf = usePlanPrice()
  const style       = planStyleOf(plan)
  const PlanIcon    = style.Icon
  const planName    = plan.name
  const planPrice   = t('perMonth', { price: planPriceOf(plan) })
  const accentColor = style.accent
  const darkBg      = style.dark
  const isRed       = !darkBg

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'modalBackdropIn 0.22s ease both' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={planName} style={{ width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden', boxShadow: `0 40px 80px rgba(0,0,0,0.4), 0 8px 24px ${accentColor}30`, animation: 'modalCardIn 0.28s cubic-bezier(.34,1.56,.64,1) both', border: `2px solid ${accentColor}40`, background: darkBg ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'white' }}>
        <div style={{ height: 4, background: isRed ? `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
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
          <button onClick={onClose} aria-label={t('close')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: darkBg ? 'rgba(255,255,255,0.08)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={15} color={darkBg ? 'rgba(255,255,255,0.6)' : '#6b7280'} />
          </button>
        </div>
        <div style={{ padding: '20px 28px 28px' }}>
          <div style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 14, marginBottom: 20, background: darkBg ? 'rgba(255,255,255,0.05)' : '#f8f8f6', border: `1px solid ${darkBg ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={17} color="#db142e" />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontWeight: 800, fontSize: '0.88rem', color: darkBg ? 'white' : '#111' }}>{t('title')}</p>
              <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: darkBg ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
                {t.rich('body', { plan: planName, g: c => <strong style={{ color: '#198f41' }}>{c}</strong>, p: c => <strong style={{ color: accentColor }}>{c}</strong> })}
              </p>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            {[
              { num: 1, label: t('step1') },
              { num: 2, label: t('step2') },
              { num: 3, label: t('step3', { plan: planName }) },
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
              <Leaf size={15} />{t('applyGreen')}<ArrowRight size={14} />
            </button>
            <button onClick={onClose}
              style={{ width: '100%', padding: '11px 20px', borderRadius: 13, background: 'transparent', border: `1.5px solid ${darkBg ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, color: darkBg ? 'rgba(255,255,255,0.45)' : '#9ca3af', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}>
              {t('later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
