'use client'

/**
 * After-sale request drawer opened from an order (/orders): the drawer shell
 * (header, "not delivered yet" and success screens) around the shared
 * ComplaintRequestForm — the same form as /complaints/new (return or
 * exchange, items, reason, fee shown before confirming, photos).
 */

import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle, ShieldAlert, Lock, Clock, PackageCheck } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import BrandLoader from '@/components/brand/BrandLoader'
import Link from 'next/link'
import type { AfterSaleFees, ComplaintType, EligibleOrder, ReturnPolicyInfo } from '@/types/complaint'
import { complaintApi } from '@/lib/complaintApi'
import ComplaintRequestForm from '@/app/components/returns/ComplaintRequestForm'

const RED     = '#db142e'
const GREEN   = '#198f41'

const ELIGIBLE_STATUSES = ['delivered', 'out_for_delivery', 'completed']

// Labels: complaintModal.status.<status>
const STATUS_KEYS = ['pending', 'processing', 'out_for_delivery', 'completed', 'delivered', 'cancelled']

interface Props {
  orderId:       number
  orderNumber:   string
  orderStatuses: string[]
  isOpen:        boolean
  onClose:       () => void
}

export default function ComplaintModal({
  orderId, orderNumber, orderStatuses, isOpen, onClose,
}: Props) {
  const t  = useTranslations('complaintModal')
  const tf = useTranslations('complaintForm')
  const rtl = useLocale() === 'ar'
  const statusLabel = (s: string) => (STATUS_KEYS.includes(s) ? t(`status.${s}`) : s)

  const [success,       setSuccess]       = useState(false)
  const [mounted,       setMounted]       = useState(false)
  const [createdId,     setCreatedId]     = useState<number | null>(null)
  const [loadingItems,  setLoadingItems]  = useState(false)
  const [eligibleOrder, setEligibleOrder] = useState<EligibleOrder | null>(null)
  const [fees,          setFees]          = useState<AfterSaleFees | null>(null)
  const [sellerFault,   setSellerFault]   = useState<ComplaintType[] | undefined>(undefined)
  const [policy,        setPolicy]        = useState<ReturnPolicyInfo | null>(null)
  const [closedReason,  setClosedReason]  = useState<string | null>(null)
  const hoursLeft = eligibleOrder?.hours_left ?? null

  const isEligible      = orderStatuses.some(s => ELIGIBLE_STATUSES.includes(s))
  const allStatuses     = [...new Set(orderStatuses)]
  const pendingStatuses = allStatuses.filter(s => !ELIGIBLE_STATUSES.includes(s) && s !== 'cancelled')
  const eligibleCount   = orderStatuses.filter(s => ELIGIBLE_STATUSES.includes(s)).length

  // ── fetchOrderItems — original logic + hoursLeft extraction ──────────────
  const fetchOrderItems = useCallback(async () => {
    if (!isEligible) return
    setLoadingItems(true)
    try {
      const json = await complaintApi.getEligibleOrders()
      setFees(json.after_sale_fees ?? null)
      setSellerFault(json.seller_fault_types)
      setPolicy(json.policy ?? null)
      setClosedReason((json.closed_orders ?? []).find(o => o.id === orderId)?.closed_reason ?? null)
      setEligibleOrder((json.data ?? []).find(o => o.id === orderId) ?? null)
    } catch {
      // Non-critical
    } finally {
      setLoadingItems(false)
    }
  }, [orderId, isEligible])

  // ── Original useEffects preserved ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setMounted(true), 10)
      document.body.style.overflow = 'hidden'
      fetchOrderItems()
    } else {
      setMounted(false)
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, fetchOrderItems])

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setSuccess(false); setCreatedId(null); setEligibleOrder(null)
      }, 350)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isOpen, onClose])

  if (!isOpen && !mounted) return null

  return (
    <>
      <style>{`
        @keyframes cd-spin { to { transform: rotate(360deg) } }
        @keyframes cd-success-pop {
          0%   { transform: scale(0.7); opacity: 0 }
          65%  { transform: scale(1.06) }
          100% { transform: scale(1);   opacity: 1 }
        }
        @keyframes cd-fadein { from { opacity:0 } to { opacity:1 } }
        .cd-body-scroll::-webkit-scrollbar { width: 4px }
        .cd-body-scroll::-webkit-scrollbar-track { background: transparent }
        .cd-body-scroll::-webkit-scrollbar-thumb { background: #dde1e7; border-radius: 99px }
        .cd-select-el {
          width: 100%; box-sizing: border-box; appearance: none;
          background: #f8fafc; border: 1.5px solid #e5e7eb; border-radius: 10px;
          padding-block: 11px; padding-inline: 13px 38px; font-size: 14px; font-weight: 600;
          font-family: var(--ct-barlow), sans-serif; color: #0f172a;
          cursor: pointer; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-select-el:focus { border-color: ${RED}; box-shadow: 0 0 0 3px rgba(219,20,46,0.08); background:#fff; }
        .cd-textarea-el {
          width: 100%; box-sizing: border-box; background: #f8fafc;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          padding: 12px 13px; font-size: 13.5px; font-weight: 500;
          font-family: var(--ct-barlow), sans-serif; color: #0f172a;
          resize: none; height: 108px; line-height: 1.65; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-textarea-el:focus { border-color: ${RED}; box-shadow: 0 0 0 3px rgba(219,20,46,0.08); background:#fff; }
        .cd-textarea-el::placeholder { color: #94a3b8; font-weight: 400; }
        .cd-submit-btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 13px 20px; border-radius: 11px; border: none;
          font-size: 14px; font-weight: 800; font-family: var(--ct-barlow), sans-serif;
          color: #fff; background: linear-gradient(135deg, ${RED} 0%, #b91c1c 100%);
          cursor: pointer; box-shadow: 0 4px 18px rgba(219,20,46,0.32);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          letter-spacing: 0.2px;
        }
        .cd-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(219,20,46,0.42); }
        .cd-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
        .cd-close-btn {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1.5px solid #e5e7eb; background: #f8fafc;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #94a3b8; transition: all 0.15s; flex-shrink: 0;
        }
        .cd-close-btn:hover { background: #fef2f2; color: ${RED}; border-color: rgba(219,20,46,0.25); }
        .cd-upload-zone {
          border: 2px dashed #e2e8f0; border-radius: 11px; padding: 18px 16px;
          text-align: center; cursor: pointer; background: #fafbfc; transition: all 0.15s;
        }
        .cd-upload-zone:hover, .cd-upload-zone.dragging {
          border-color: ${RED}; background: rgba(219,20,46,0.025);
        }
        .cd-item-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: 1.5px solid #e5e7eb; background: #f8fafc;
          transition: all 0.15s ease; font-family: var(--ct-barlow), sans-serif;
        }
        .cd-item-row:hover { border-color: ${RED}; background: rgba(219,20,46,0.03); }
        .cd-item-row.selected { border-color: ${RED}; background: rgba(219,20,46,0.06); box-shadow: 0 0 0 1px ${RED}; }
        .cd-res-btn {
          flex: 1; display: flex; flex-direction: column; gap: 8px;
          padding: 14px 12px; border-radius: 12px; cursor: pointer;
          border: 2px solid #e5e7eb; background: #f8fafc;
          text-align: start; font-family: var(--ct-barlow), sans-serif;
          transition: all 0.18s ease;
        }
        [dir=rtl] .cd-drawer { box-shadow: 12px 0 60px rgba(0,0,0,0.18) !important; }
      `}</style>

      {/* ── Root overlay ── */}
      <div
        role="dialog"
        aria-modal="true"
        data-ct-modal={isOpen ? '' : undefined}
        aria-label={t('title')}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          fontFamily: "var(--ct-barlow), sans-serif",
          pointerEvents: isOpen ? 'all' : 'none',
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(2,8,20,0.55)',
            backdropFilter: 'blur(3px)',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* ── Drawer ── */}
        <div
          className="cd-drawer"
          style={{
            position: 'fixed',
            top: 0, insetInlineEnd: 0, bottom: 0,
            width: '100%', maxWidth: 460,
            height: '100dvh',
            background: '#ffffff',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-12px 0 60px rgba(0,0,0,0.18)',
            transform: mounted ? 'translateX(0)' : (rtl ? 'translateX(-100%)' : 'translateX(100%)'),
            transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
            zIndex: 10000,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(219,20,46,0.1), rgba(219,20,46,0.05))',
                border: '1.5px solid rgba(219,20,46,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldAlert size={18} color={RED} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  {t('title')}
                </p>
                {/* ← UPDATED: show hours remaining next to order number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 600 }}>
                    {t('order')}{' '}
                    <span style={{ color: RED, fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>
                      #{orderNumber}
                    </span>
                  </p>
                  {hoursLeft !== null && (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: hoursLeft < 6 ? RED : '#f59e0b',
                      background: hoursLeft < 6 ? 'rgba(219,20,46,0.08)' : 'rgba(245,158,11,0.08)',
                      padding: '1px 6px', borderRadius: 999,
                      border: `1px solid ${hoursLeft < 6 ? RED : '#f59e0b'}25`,
                    }}>
                      ⏱ {t('hoursLeft', { hours: hoursLeft })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="cd-close-btn" onClick={onClose} aria-label={t('close')}>
              <X size={14} />
            </button>
          </div>

          {/* ══ SUCCESS ══ */}
          {success ? (
            <>
              <div style={{
                flex: '1 1 0', minHeight: 0, overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', textAlign: 'center', gap: 12,
                animation: 'cd-success-pop 0.45s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', marginBottom: 8,
                  background: 'linear-gradient(135deg, rgba(25,143,65,0.1), rgba(25,143,65,0.05))',
                  border: '2px solid rgba(25,143,65,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={32} color={GREEN} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {t('successTitle')}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', lineHeight: 1.65, maxWidth: 320 }}>
                  {t.rich('successBody', { number: orderNumber, b: c => <strong style={{ color: '#374151' }}>{c}</strong> })}
                </p>
                <div style={{
                  marginTop: 20, padding: '12px 16px',
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: 10, fontSize: 12, color: '#64748b', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>📩</span>
                  {t('successEmail')}
                </div>
              </div>
              <div style={{ flexShrink: 0, padding: '14px 20px 20px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {createdId && (
                  <Link href={`/complaints?id=${createdId}`} onClick={onClose} style={{
                    textAlign: 'center', padding: 11, borderRadius: 11, border: `1.5px solid ${GREEN}`,
                    color: GREEN, fontSize: 13, fontWeight: 800, textDecoration: 'none',
                  }}>{t('track')}</Link>
                )}
                <button onClick={onClose} style={{
                  width: '100%', padding: 13, borderRadius: 11, border: 'none',
                  background: `linear-gradient(135deg, ${GREEN}, #15803d)`,
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  fontFamily: "var(--ct-barlow), sans-serif", cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(25,143,65,0.28)',
                }}>{t('done')}</button>
              </div>
            </>

          /* ══ BLOCKED ══ */
          ) : !isEligible ? (
            <div style={{
              flex: '1 1 0', minHeight: 0, overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '32px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', marginBottom: 20,
                background: 'linear-gradient(135deg, #fef3c7, #fef9ee)',
                border: '2px solid #fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={30} color="#d97706" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
                {t('blockedTitle')}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px', lineHeight: 1.65, maxWidth: 320 }}>
                {t.rich('blockedBody', { b: c => <strong style={{ color: '#374151' }}>{c}</strong> })}
              </p>
              {allStatuses.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    {t('currentStatus')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
                    {allStatuses.map(s => {
                      const isPending = ['pending', 'processing'].includes(s)
                      const color     = isPending ? '#d97706' : '#6366f1'
                      const bg        = isPending ? 'rgba(217,119,6,0.08)' : 'rgba(99,102,241,0.08)'
                      const border    = isPending ? 'rgba(217,119,6,0.25)' : 'rgba(99,102,241,0.25)'
                      return (
                        <span key={s} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 700, padding: '4px 10px',
                          borderRadius: 999, border: `1px solid ${border}`,
                          color, background: bg,
                        }}>
                          <Clock size={10} />
                          {statusLabel(s)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', textAlign: 'start' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('nextTitle')}
                </p>
                {[
                  { icon: '📦', text: t('next1') },
                  { icon: '🚴', text: t('next2') },
                  { icon: '✅', text: t('next3') },
                  { icon: '🛡️', text: t('next4') },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
                    <span style={{ fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>{step.icon}</span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>{step.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose} style={{
                marginTop: 20, padding: '11px 28px',
                borderRadius: 10, border: '1.5px solid #e5e7eb',
                background: '#f8fafc', color: '#374151',
                fontSize: 13, fontWeight: 700,
                fontFamily: "var(--ct-barlow), sans-serif", cursor: 'pointer',
              }}>
                {t('gotIt')}
              </button>
            </div>

          /* ══ FORM (shared with /complaints/new) ══ */
          ) : (
            <>
              {/* Partial eligibility notice */}
              {eligibleCount < orderStatuses.length && (
                <div style={{
                  padding: '10px 20px', flexShrink: 0,
                  background: 'rgba(99,102,241,0.05)',
                  borderBottom: '1px solid rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                }}>
                  <PackageCheck size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, margin: 0, lineHeight: 1.55 }}>
                    {t('partial', { count: eligibleCount, total: orderStatuses.length })}
                    {pendingStatuses.length > 0 && ` ${t('partialOthers', { statuses: pendingStatuses.map(statusLabel).join(', ') })}`}
                  </p>
                </div>
              )}

              {/* Scrollable body: the shared form (its submit button sticks to the bottom) */}
              <div className="cd-body-scroll" style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '22px 20px' }}>
                {loadingItems ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                    <BrandLoader variant="inline" size={14} style={{ color: RED }} />
                    {t('loadingItems')}
                  </div>
                ) : !eligibleOrder ? (
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, margin: 0 }}>
                    {closedReason && <strong style={{ display: 'block', color: '#b45309', marginBottom: 6 }}>⏱ {closedReason}</strong>}
                    {tf.rich('noEligibleBody', { b: c => <strong style={{ color: '#374151' }}>{c}</strong> })}
                  </p>
                ) : (
                  <ComplaintRequestForm order={eligibleOrder} fees={fees} sellerFaultTypes={sellerFault} policy={policy} layout="drawer"
                    onSubmitted={c => { setCreatedId(c?.id ?? null); setSuccess(true) }} />
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}