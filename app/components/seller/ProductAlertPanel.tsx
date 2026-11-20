'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ink } from '@/app/seller/ink';

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

// ── Alert indicator badge (shown in product row) ──────────────────────────────

export function AlertIndicator({ alertData, dark }: { alertData: ProductAlertData; dark: boolean }) {
  const t = useTranslations('seller.alerts');
  if (!alertData.has_alert) return null;

  const isCritical = alertData.alert_level === 'critical';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 800,
      padding: '2px 6px', borderRadius: 999,
      background: isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
      color:      isCritical ? ink('#ef4444', dark)               : ink('#f59e0b', dark),
      border:     `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
      animation:  isCritical ? 'alertPulse 2s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }}>
      <AlertTriangle size={8} />
      {isCritical ? t('critical') : t('warning')}
    </span>
  );
}
