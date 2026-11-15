'use client'

/**
 * Modal chrome of the seller creation wizards (pack, promotion):
 *   header (title + close) · step indicator · the ONLY scroll area · footer.
 *
 * The footer is a separate flex row under the scroll area (never laid over it) and the
 * scroll area has generous bottom padding, so the footer can never cover an input.
 * On phones the global `.ct-sheet` rules turn the panel into a full-screen sheet.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { X, Check, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import BrandLoader from '@/components/brand/BrandLoader'
import { BRAND } from './fields'

export interface WizardStep { key: string; label: string; error?: boolean }

export default function WizardShell({
  titleId, title, subtitle, steps, stepIdx, maxStep, onStep, onClose,
  apiError, canNext, nextHint, onBack, onNext, nextLabel, saving, bodyRef, children,
}: {
  titleId: string
  title: string
  subtitle?: string
  steps: WizardStep[]
  stepIdx: number
  /** Furthest step the seller has reached (earlier + this one are clickable) */
  maxStep: number
  onStep: (i: number) => void
  onClose: () => void
  apiError?: string
  canNext: boolean
  /** Why "Next" is disabled (shown above the buttons) */
  nextHint?: string | null
  onBack: () => void
  onNext: () => void
  nextLabel: string
  saving?: boolean
  bodyRef?: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const t = useTranslations('seller.wizard')
  const localRef = useRef<HTMLDivElement>(null)
  const scrollRef = bodyRef ?? localRef
  const isLast = stepIdx === steps.length - 1

  // New step → back to the top of the scroll area
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [stepIdx, scrollRef])

  return (
    <div data-ct-modal="" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="ct-sheet wz" role="dialog" aria-modal="true" aria-labelledby={titleId} style={{
        background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: 820, height: '92vh', maxHeight: 900,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div className="ct-sheet-head" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '16px 20px 12px', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 11.5, color: '#5b6472', margin: '3px 0 0', lineHeight: 1.4 }}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} style={{
            width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#5b6472',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <nav aria-label={t('stepOf', { current: stepIdx + 1, total: steps.length })} style={{
          display: 'flex', gap: 6, padding: '0 20px 12px', flexShrink: 0, borderBottom: '1px solid #f0f0f0',
        }}>
          {steps.map((s, i) => {
            const current = i === stepIdx
            const done = i < stepIdx
            const reachable = i <= maxStep && !saving
            return (
              <button key={s.key} type="button" disabled={!reachable} onClick={() => onStep(i)}
                aria-current={current ? 'step' : undefined}
                style={{
                  flex: 1, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '6px 8px', borderRadius: 12, fontFamily: 'inherit', cursor: reachable ? 'pointer' : 'default',
                  border: `1.5px solid ${s.error ? '#fca5a5' : current ? BRAND : done ? 'rgba(25,143,65,0.35)' : '#e5e7eb'}`,
                  background: s.error ? '#fef2f2' : current ? 'rgba(219,20,46,0.06)' : '#fff',
                  color: s.error ? '#b91c1c' : current ? BRAND : done ? '#166534' : '#64748b',
                  fontSize: 12, fontWeight: current ? 800 : 700,
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.error ? '#dc2626' : current ? BRAND : done ? '#198f41' : '#e5e7eb',
                  color: current || done || s.error ? '#fff' : '#64748b',
                }}>
                  {s.error ? '!' : done ? <Check size={12} /> : i + 1}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Body: the only scroll container */}
        <div ref={scrollRef} className="wz-body" style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {apiError && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
              padding: '12px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, overflowWrap: 'anywhere',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {apiError}
            </div>
          )}
          {children}
        </div>

        {/* Footer */}
        <div className="ct-sheet-bar" style={{
          flexShrink: 0, background: '#fff', borderTop: '1px solid #f0f0f0', padding: '10px 20px 12px',
        }}>
          {nextHint && !canNext && (
            <p role="status" style={{ fontSize: 12, fontWeight: 600, color: '#92400e', margin: '0 0 8px', lineHeight: 1.4 }}>{nextHint}</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={stepIdx === 0 ? onClose : onBack} disabled={saving} style={{
              flex: 1, minHeight: 48, border: '1.5px solid #e5e7eb', background: '#fff', color: '#475569',
              fontWeight: 700, fontSize: 14, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {stepIdx > 0 && <ArrowLeft size={16} className="rtl-flip" aria-hidden />}
              {stepIdx === 0 ? t('cancel') : t('back')}
            </button>
            <button type="button" onClick={onNext} disabled={!canNext || saving} aria-disabled={!canNext || saving} style={{
              flex: 1.4, minHeight: 48, border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12,
              cursor: !canNext || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              background: canNext ? `linear-gradient(135deg,${BRAND},#b91c1c)` : '#cbd5e1',
              boxShadow: canNext ? '0 6px 20px rgba(220,38,38,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving ? 0.7 : 1,
            }}>
              {saving && <BrandLoader variant="inline" size={14} />}
              {nextLabel}
              {!isLast && !saving && <ArrowRight size={16} className="rtl-flip" aria-hidden />}
            </button>
          </div>
        </div>

        <style>{`
          .wz *, .wz *::before, .wz *::after { box-sizing: border-box; }
          .wz-input {
            width: 100%; max-width: 100%; min-width: 0; min-height: 44px; box-sizing: border-box;
            border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 10px 14px;
            font-size: 14px; color: #0f172a; background: #fff; outline: none; font-family: inherit;
            -webkit-appearance: none; appearance: none;
          }
          .wz-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
          .wz-input::placeholder { color: #94a3b8; }
          /* iOS renders datetime-local wider than its column unless told otherwise */
          .wz-input[type="datetime-local"] { display: block; text-align: start; line-height: 1.4; padding-block: 9px; }
          .wz-input[type="datetime-local"]::-webkit-date-and-time-value { text-align: start; min-width: 0; }
          select.wz-input { background-image: none; padding-inline-end: 14px; }
          .wz-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .wz-row:hover:not([aria-disabled="true"]) { background: #fef2f2; }
          @media (max-width: 640px) {
            .wz-input { font-size: 16px; }
            .wz-two { grid-template-columns: 1fr; }
            .wz-body { padding: 16px 16px 48px !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
