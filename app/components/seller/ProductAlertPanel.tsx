'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, XCircle, Zap, Package, TrendingUp,
  DollarSign, FileText, ChevronDown, ChevronUp,
  Lock, ExternalLink,
} from 'lucide-react';
import { useSubscription } from '@/app/hooks/useSubscription';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlertReason {
  key:      string;
  label:    string;
  detail:   string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AlertAction {
  key:            string;
  label:          string;
  icon:           string;
  href:           string;
  color:          string;
  requires_plan?: 'red' | 'black';
}

export interface ProductAlertData {
  has_alert:          boolean;
  alert_level?:       'critical' | 'warning' | 'info';
  alert_score?:       number;
  listing_age_days?:  number;
  units_sold_window?: number;
  window_days?:       number;
  stock?:             number;
  views?:             number;
  reasons?:           AlertReason[];
  suggested_actions?: AlertAction[];
}

interface Props {
  productId:   number;
  productName: string;
  alertData:   ProductAlertData;
  dark:        boolean;
}

// ── Icon resolver ─────────────────────────────────────────────────────────────

function ActionIcon({ icon, size = 13 }: { icon: string; size?: number }) {
  const icons: Record<string, React.ElementType> = {
    'zap':          Zap,
    'dollar-sign':  DollarSign,
    'package':      Package,
    'trending-up':  TrendingUp,
    'file-text':    FileText,
  };
  const Icon = icons[icon] ?? Zap;
  return <Icon size={size} />;
}

// ── Alert indicator badge (shown in product row) ──────────────────────────────

export function AlertIndicator({ alertData, dark }: { alertData: ProductAlertData; dark: boolean }) {
  if (!alertData.has_alert) return null;

  const isCritical = alertData.alert_level === 'critical';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 800,
      padding: '2px 6px', borderRadius: 999,
      background: isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
      color:      isCritical ? '#ef4444'               : '#f59e0b',
      border:     `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
      animation:  isCritical ? 'alertPulse 2s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }}>
      <AlertTriangle size={8} />
      {isCritical ? 'Critical' : 'Warning'}
    </span>
  );
}

// ── Main alert panel (shown below the product row) ────────────────────────────

export default function ProductAlertPanel({ productId, productName, alertData, dark }: Props) {
  const [expanded,   setExpanded]   = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const router = useRouter();
  const { plan } = useSubscription();

  if (!alertData.has_alert || dismissed) return null;

  const isCritical = alertData.alert_level === 'critical';
  const accentColor = isCritical ? '#ef4444' : '#f59e0b';

  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text    = dark ? '#fff' : '#111';
  const muted   = dark ? 'rgba(255,255,255,0.4)' : '#888';

  const canUseRedFeature = plan === 'red' || plan === 'black';

  const handleActionClick = (action: AlertAction) => {
    if (action.requires_plan && !canUseRedFeature) return; // blocked — UI shows lock
    router.push(action.href);
  };

  return (
    <tr>
      <td colSpan={7} style={{ padding: 0 }}>
        <div style={{
          margin: '0 12px 8px',
          background: dark
            ? `${accentColor}08`
            : `${accentColor}05`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 12,
          overflow: 'hidden',
          animation: 'alertSlideIn 0.3s ease',
        }}>

          {/* ── Header row ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            borderBottom: expanded ? `1px solid ${accentColor}20` : 'none',
            cursor: 'pointer',
          }} onClick={() => setExpanded(e => !e)}>

            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={12} style={{ color: accentColor }} />
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: accentColor, margin: '0 0 1px' }}>
                {isCritical ? '⚠️ Action Required' : '💡 Optimization Opportunity'}
                {' · '}{productName}
              </p>
              <p style={{ fontSize: 10, color: muted, margin: 0 }}>
                {alertData.reasons?.[0]?.label ?? 'Performance alert'}
                {alertData.units_sold_window !== undefined && (
                  <> · {alertData.units_sold_window} units sold in {alertData.window_days} days</>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Quick action buttons (always visible) */}
              {alertData.suggested_actions?.slice(0, 2).map(action => {
                const isLocked = action.requires_plan && !canUseRedFeature;
                return (
                  <button
                    key={action.key}
                    onClick={e => { e.stopPropagation(); handleActionClick(action); }}
                    title={isLocked ? `Upgrade to Red Pepper to use ${action.label}` : action.label}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 8,
                      background: isLocked ? (dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9') : `${action.color}15`,
                      border: `1px solid ${isLocked ? border : action.color + '35'}`,
                      color: isLocked ? muted : action.color,
                      fontSize: 10, fontWeight: 700,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                      fontFamily: 'inherit',
                      flexShrink: 0,
                    }}
                  >
                    {isLocked ? <Lock size={9} /> : <ActionIcon icon={action.icon} size={10} />}
                    {action.label}
                  </button>
                );
              })}

              {/* Expand/collapse */}
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {/* Dismiss */}
              <button
                onClick={e => { e.stopPropagation(); setDismissed(true); }}
                title="Dismiss alert"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, padding: 4, opacity: 0.6 }}
              >
                <XCircle size={12} />
              </button>
            </div>
          </div>

          {/* ── Expanded detail ── */}
          {expanded && (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Reasons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertData.reasons?.map(reason => (
                  <div key={reason.key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 10px', borderRadius: 8,
                    background: dark ? 'rgba(255,255,255,0.03)' : '#fafafa',
                    border: `1px solid ${border}`,
                  }}>
                    <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>
                      {reason.severity === 'critical' ? '🔴' : reason.severity === 'warning' ? '🟡' : 'ℹ️'}
                    </span>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: text, margin: '0 0 2px' }}>
                        {reason.label}
                      </p>
                      <p style={{ fontSize: 10, color: muted, margin: 0, lineHeight: 1.5 }}>
                        {reason.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* All action buttons */}
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: muted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recommended actions
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {alertData.suggested_actions?.map(action => {
                    const isLocked = action.requires_plan && !canUseRedFeature;
                    return (
                      <button
                        key={action.key}
                        onClick={() => handleActionClick(action)}
                        title={isLocked ? 'Upgrade to Red Pepper to unlock' : action.label}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 9,
                          background: isLocked ? (dark ? 'rgba(255,255,255,0.04)' : '#f8fafc') : `${action.color}12`,
                          border: `1px solid ${isLocked ? border : action.color + '30'}`,
                          color: isLocked ? muted : action.color,
                          fontSize: 11, fontWeight: 700,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          opacity: isLocked ? 0.65 : 1,
                        }}
                      >
                        {isLocked ? <Lock size={10} /> : <ActionIcon icon={action.icon} />}
                        {action.label}
                        {isLocked && (
                          <span style={{
                            fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 999,
                            background: 'rgba(219,20,46,0.1)', color: '#db142e',
                            border: '1px solid rgba(219,20,46,0.2)',
                          }}>
                            Red+
                          </span>
                        )}
                        {!isLocked && <ExternalLink size={9} style={{ opacity: 0.5 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upgrade CTA for free sellers */}
              {!canUseRedFeature && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(219,20,46,0.06)', border: '1px solid rgba(219,20,46,0.15)',
                }}>
                  <Lock size={12} style={{ color: '#db142e', flexShrink: 0 }} />
                  <p style={{ fontSize: 10, color: muted, margin: 0, flex: 1 }}>
                    Unlock AI-powered actions with <strong style={{ color: '#db142e' }}>Red Pepper (49 DT/mo)</strong>
                  </p>
                  <a href="/seller/subscription" style={{
                    fontSize: 10, fontWeight: 800, color: '#db142e',
                    textDecoration: 'none', padding: '3px 8px', borderRadius: 6,
                    background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.25)',
                    flexShrink: 0,
                  }}>
                    Upgrade →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}