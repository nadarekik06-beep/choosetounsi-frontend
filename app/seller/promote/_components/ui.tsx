'use client'

// Shared building blocks for the seller Ads pages (home, wizard, campaign, wallet).
// Colours follow the seller dashboard theme (light / dark) from SellerShell.

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTheme } from '../../SellerShell'
import type { Campaign, CampaignStatus, Tip } from '@/lib/sellerAdsApi'
import { BusyLabel } from '@/components/brand/BrandLoader'

export const GOLD = '#f59e0b'
export const RED  = '#db142e'

export function usePalette() {
  const { dark } = useTheme()
  return {
    dark,
    bg:        dark ? '#0D1117' : '#f0f2f5',
    card:      dark ? '#161b27' : '#ffffff',
    cardAlt:   dark ? '#1a2030' : '#f8f9fb',
    border:    dark ? 'rgba(255,255,255,0.07)' : '#e5e8ed',
    text:      dark ? '#f0f0f0' : '#111827',
    muted:     dark ? 'rgba(255,255,255,0.55)' : '#5b6472',
    // accent text: GOLD / green are too light for text on white
    gold:      dark ? GOLD : '#92400e',
    positive:  dark ? '#16a34a' : '#15803d',
    input:     dark ? '#0f141d' : '#ffffff',
    shadow:    dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
  }
}

export function Panel({ children, style, title, action }: {
  children: React.ReactNode; style?: React.CSSProperties; title?: React.ReactNode; action?: React.ReactNode
}) {
  const p = usePalette()
  return (
    <section style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: 16, padding: 16, boxShadow: p.shadow, minWidth: 0, ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {title && <h2 style={{ fontSize: 14, fontWeight: 800, color: p.text, margin: 0 }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  const p = usePalette()
  return (
    <div style={{ background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: p.muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 900, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      {hint && <p style={{ fontSize: 11, color: p.muted, margin: '3px 0 0' }}>{hint}</p>}
    </div>
  )
}

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: '#64748b', active: '#16a34a', paused: '#d97706', completed: '#2563eb',
  cancelled: '#64748b', rejected: '#dc2626', expired: '#64748b',
}

export function StatusChip({ campaign }: { campaign: Pick<Campaign, 'status' | 'paused_reason'> }) {
  const t = useTranslations('seller.ads')
  const color = STATUS_COLOR[campaign.status] ?? '#64748b'
  return (
    <span title={campaign.paused_reason ? t(`pauseReason.${campaign.paused_reason}`) : undefined} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color,
      background: `${color}1a`, border: `1px solid ${color}40`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {t(`status.${campaign.status}`)}
    </span>
  )
}

export function Button({ children, onClick, href, variant = 'primary', disabled, loading = false, type = 'button', small }: {
  children: React.ReactNode; onClick?: () => void; href?: string; variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean; type?: 'button' | 'submit'; small?: boolean
  /** Async action running: inline loader over the label, button disabled, width kept. */
  loading?: boolean
}) {
  disabled = disabled || loading
  const p = usePalette()
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none',
    padding: small ? '6px 12px' : '10px 16px', borderRadius: 10, fontSize: small ? 12 : 13, fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap',
    ...(variant === 'primary' ? { background: RED, color: '#fff', border: `1px solid ${RED}` }
      : variant === 'danger' ? { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)' }
      : { background: p.cardAlt, color: p.text, border: `1px solid ${p.border}` }),
  }
  if (href && !disabled) return <Link href={href} style={style}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} aria-busy={loading || undefined} style={style}><BusyLabel busy={loading} size={small ? 12 : 14}>{children}</BusyLabel></button>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: React.ReactNode }) {
  const c = { info: '#2563eb', warn: '#d97706', error: '#dc2626', success: '#16a34a' }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ background: `${c}14`, border: `1px solid ${c}40`, color: c, borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
      {children}
    </div>
  )
}

/** Where a readiness / optimizer action takes the seller. */
export function actionHref(action: string | null | undefined, productId?: number | null): string | null {
  switch (action) {
    case 'edit_product':
    case 'edit_images':
    case 'ai_description':
    case 'restock':
      return productId ? `/seller/products/${productId}` : '/seller/products'
    case 'discount':
      return '/seller/promotions'
    case 'reviews':
      return '/seller/reviews'
    default:
      return null
  }
}

/** Readiness blockers / tips and optimizer tips, translated, with a fix-it link when there is one. */
export function TipList({ tips, productId, tone = 'warn' }: { tips: Tip[]; productId?: number | null; tone?: 'warn' | 'error' }) {
  const t = useTranslations('seller.ads')
  const p = usePalette()
  const fmt = (params?: Tip['params']) => {
    const out: Record<string, string | number> = { ...(params ?? {}) }
    if (typeof out.placement === 'string') out.placement = t(`placementNames.${out.placement}`)
    return out
  }
  const color = tone === 'error' ? '#dc2626' : '#d97706'
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tips.map((tip, i) => {
        const code = tip.code.replace(/^listing_/, '')
        const href = actionHref(tip.action ?? null, productId)
        return (
          <li key={`${tip.code}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10, padding: '9px 11px' }}>
            <span style={{ fontSize: 13, color: p.text, lineHeight: 1.45, flex: '1 1 220px' }}>
              {t.has(`codes.${code}`) ? t(`codes.${code}`, fmt(tip.params)) : code}
            </span>
            {href && tip.action && (
              <Link href={href} style={{ fontSize: 12, fontWeight: 800, color: RED, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {t(`actions.${tip.action}`)}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Shared page frame: title row + content, mobile-first spacing. */
export function PageFrame({ title, subtitle, actions, children }: {
  title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode
}) {
  const p = usePalette()
  return (
    <div style={{ padding: '16px 12px 40px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: p.text, margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 13, color: p.muted, margin: '4px 0 0', maxWidth: 640 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}
