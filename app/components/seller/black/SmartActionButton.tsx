'use client';

/**
 * components/seller/black/SmartActionButton.tsx
 *
 * Reusable inline action button for Black Hub insight cards.
 * Renders as <Link> when href is given, otherwise as <button>.
 *
 * Usage:
 *   <SmartActionButton label="Restock Now"    icon={Package}    href="/seller/products/42" color="red"  />
 *   <SmartActionButton label="Promote This"   icon={TrendingUp} onClick={handleSponsor}    color="gold" />
 *   <SmartActionButton label="Flash Sale"     icon={Zap}        href="/seller/promotions"  color="blue" loading={saving} />
 */

import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';

export type SmartActionColor = 'gold' | 'red' | 'green' | 'blue' | 'purple';

interface SmartActionButtonProps {
  label:     string;
  icon:      LucideIcon;
  href?:     string;
  onClick?:  () => void;
  color?:    SmartActionColor;
  loading?:  boolean;
  size?:     'sm' | 'md';
  dark?:     boolean;
  disabled?: boolean;
  external?: boolean;
}

const COLOR_MAP: Record<SmartActionColor, { bg: string; border: string; text: string }> = {
  gold:   { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#f59e0b' },
  red:    { bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
  green:  { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.35)', text: '#10b981' },
  blue:   { bg: 'rgba(59,130,246,0.13)', border: 'rgba(59,130,246,0.35)', text: '#3b82f6' },
  purple: { bg: 'rgba(139,92,246,0.13)', border: 'rgba(139,92,246,0.35)', text: '#8b5cf6' },
};

function Spinner({ color }: { color: string }) {
  return (
    <>
      <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
        border: `2px solid ${color}30`, borderTop: `2px solid ${color}`,
        animation: 'sab-spin 0.7s linear infinite', flexShrink: 0,
      }} />
      <style>{`@keyframes sab-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export default function SmartActionButton({
  label, icon: Icon, href, onClick,
  color = 'gold', loading = false, size = 'md',
  disabled = false, external = false,
}: SmartActionButtonProps) {
  const c      = COLOR_MAP[color];
  const small  = size === 'sm';
  const off    = loading || disabled;

  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 6,
    padding: small ? '5px 10px' : '7px 14px',
    borderRadius: small ? 7 : 9,
    background: c.bg, border: `1px solid ${c.border}`,
    color: off ? `${c.text}55` : c.text,
    fontSize: small ? 10 : 12, fontWeight: 800,
    cursor: off ? 'not-allowed' : 'pointer',
    opacity: off ? 0.7 : 1,
    whiteSpace: 'nowrap', textDecoration: 'none',
    transition: 'all 0.15s ease', userSelect: 'none', flexShrink: 0,
  };

  const iconSize = small ? 10 : 12;

  const inner = (
    <>
      {loading ? <Spinner color={c.text} /> : <Icon size={iconSize} />}
      {label}
    </>
  );

  if (href && !off) {
    return (
      <Link href={href} style={style}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={!off ? onClick : undefined} disabled={off} style={style}>
      {inner}
    </button>
  );
}