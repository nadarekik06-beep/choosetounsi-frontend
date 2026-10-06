'use client';
// components/NotificationBell.tsx
// CHANGES from original:
//   1. accent() — added 'low_stock' (amber) and 'out_of_stock' (red) cases
//   2. NotifIcon — added 'alert-triangle' for low-stock icon mapping
//   3. No structural changes — fully backward compatible

import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, CheckCheck, RefreshCw,
  PackagePlus, PackageCheck, PackageX,
  CheckCircle, XCircle, Store, Package, AlertTriangle,
  Megaphone, PauseCircle, Flag, Gauge, Wallet, CalendarDays, TrendingDown,
} from 'lucide-react';
import { useNotifications } from '@/hooks/Usenotifications';
import type { AppNotification } from '@/lib/notificationApi';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';
import BrandLoader from '@/components/brand/BrandLoader'

// ─── sound ────────────────────────────────────────────────────────
function playSound() {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// ─── icon map — ADDED alert-triangle for low-stock ───────────────
export function NotifIcon({ icon }: { icon: string }) {
  const cls = 'w-4 h-4 flex-shrink-0';
  const map: Record<string, React.ReactNode> = {
    'package-plus':    <PackagePlus    className={cls} />,
    'package-check':   <PackageCheck   className={cls} />,
    'package-x':       <PackageX       className={cls} />,
    'check-circle':    <CheckCircle    className={cls} />,
    'x-circle':        <XCircle        className={cls} />,
    'store':           <Store          className={cls} />,
    'alert-triangle':  <AlertTriangle  className={cls} />,  // ← NEW for low-stock
    // Ad campaigns (App\Notifications\Ads\*)
    'megaphone':       <Megaphone      className={cls} />,
    'pause-circle':    <PauseCircle    className={cls} />,
    'flag':            <Flag           className={cls} />,
    'gauge':           <Gauge          className={cls} />,
    'wallet':          <Wallet         className={cls} />,
    // Sales forecast (AppNotificationsForecastAlertNotification)
    'calendar':        <CalendarDays   className={cls} />,
    'trending-down':   <TrendingDown   className={cls} />,
  };
  return <>{map[icon] ?? <Package className={cls} />}</>;
}

// ─── accent colour per action — ADDED stock actions ───────────────
// low_stock   → amber  (same as 'submitted' — caution tone)
// out_of_stock → red   (same as 'rejected' — urgent tone)
export function accent(action: string): string {
  if (action === 'approved')      return '#10b981';
  if (action === 'rejected')      return '#ef4444';
  if (action === 'deleted')       return '#ef4444';
  if (action === 'out_of_stock')  return '#ef4444';  // ← NEW
  if (action === 'forecast_stockout')   return '#ef4444';
  if (action === 'forecast_sales_drop') return '#f59e0b';
  if (action === 'forecast_event')      return '#8b5cf6';
  if (action === 'forecast_digest')     return '#3b82f6';
  if (action === 'low_stock')     return '#f59e0b';  // ← NEW
  if (action === 'reminder')      return '#f59e0b';  // seller order: not ready for pickup yet
  if (action === 'submitted')     return '#f59e0b';
  if (action === 'created')       return '#3b82f6';
  if (action === 'updated')       return '#a855f7';
  return '#db142e';
}

// ─── mobile breakpoint — matches the Topbar's `sm` (640px) switch ─
// Below it the dropdown becomes a fixed sheet portalled to <body> so it
// escapes the sticky header's stacking context (zIndex 20) and sits above
// the floating chat button (10002) and cart drawer (9999).
const MOBILE_QUERY = '(max-width: 639px)';
const Z_BACKDROP   = 10010;
const Z_PANEL      = 10011;

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}


// ─── single notification row ──────────────────────────────────────
function NotifRow({
  n,
  dark,
  mobile,
  onRead,
}: {
  n: AppNotification;
  dark: boolean;
  mobile: boolean;
  onRead: (n: AppNotification) => void;
}) {
  const { relative } = useFormat();
  const a         = accent(n.data.action);
  const textMain  = dark ? '#ffffff' : '#111827';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const hoverBg   = dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6';
  const unreadBg  = `${a}0d`;

  return (
    <button
      onClick={() => onRead(n)}
      style={{
        width: '100%', textAlign: 'start',
        padding: mobile ? '12px 14px' : '11px 14px',
        ...(mobile ? { minHeight: 44 } : {}),
        background: n.is_read ? 'transparent' : unreadBg,
        borderBottom: `1px solid ${border}`,
        border: 'none', cursor: 'pointer',
        display: 'flex', gap: 11, alignItems: 'flex-start',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : unreadBg)}
    >
      {/* icon bubble */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `${a}18`, border: `1px solid ${a}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: a,
      }}>
        <NotifIcon icon={n.data.icon} />
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 3,
          ...(mobile ? { alignItems: 'flex-start' } : {}),
        }}>
          <span style={{
            fontSize: 12, fontWeight: n.is_read ? 500 : 800,
            color: n.is_read ? textMuted : textMain,
            overflow: 'hidden', textOverflow: 'ellipsis',
            ...(mobile
              ? {
                  flex: 1, minWidth: 0, lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflowWrap: 'anywhere' as const,
                }
              : { whiteSpace: 'nowrap' as const, maxWidth: 200 }),
          }}>
            {n.data.title}
          </span>
          <span style={{
            fontSize: 10, color: textMuted, flexShrink: 0, marginInlineStart: 6,
            ...(mobile ? { whiteSpace: 'nowrap' as const, lineHeight: '16px' } : {}),
          }}>
            {relative(n.created_at)}
          </span>
        </div>
        <p style={{
          fontSize: 11, color: textMuted, margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: mobile ? 3 : 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden', lineHeight: 1.45,
          ...(mobile ? { overflowWrap: 'anywhere' as const } : {}),
        }}>
          {n.data.body}
        </p>
      </div>

      {/* unread dot */}
      {!n.is_read && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: a, flexShrink: 0, marginTop: mobile ? 5 : 4,
        }} />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT — unchanged from original
// ═══════════════════════════════════════════════════════════════════

interface NotificationBellProps {
  api: {
    getAll(page?: number): Promise<{ data: AppNotification[]; meta: any }>;
    getUnreadCount(): Promise<number>;
    markRead(id: string): Promise<void>;
    markAllRead(): Promise<void>;
  };
  dark?: boolean;
  onNavigate?: (path: string) => void;
  pollInterval?: number;
  /** Page listing every notification, linked from the dropdown footer. */
  viewAllHref?: string;
}

export default function NotificationBell({
  api,
  dark = true,
  onNavigate,
  pollInterval = 30_000,
  viewAllHref,
}: NotificationBellProps) {

  const t = useTranslations('seller.bell');
  const onNew = useCallback(() => playSound(), []);

  const {
    items, unreadCount, loading,
    open, setOpen,
    fetchAll, markRead, markAllRead,
  } = useNotifications({ api, pollInterval, onNewNotifications: onNew });

  const mobile = useIsMobile();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On mobile the full-screen backdrop handles outside taps (closing on
    // mousedown there would let the tap fall through to the page beneath).
    if (mobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setOpen, mobile]);

  // Mobile sheet: ESC closes it, and the page behind must not scroll.
  // Lock <html>, not <body>: globals.css gives html `overflow-x: hidden`, so
  // body overflow isn't propagated to the viewport and locking body would
  // turn it into a clip box that scrolls the sticky header off-screen.
  useEffect(() => {
    if (!open || !mobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, mobile, setOpen]);

  const bg        = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textMain  = dark ? '#ffffff' : '#111827';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const btnBg     = dark ? 'rgba(255,255,255,0.07)' : '#f0f2f5';

  const handleRead = async (n: AppNotification) => {
    if (!n.is_read) await markRead(n.id);
    if (n.data.link && onNavigate) {
      setOpen(false);
      onNavigate(n.data.link);
    }
  };

  // Header + list, shared by the desktop dropdown and the mobile sheet.
  const panelBody = (
    <>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mobile ? '4px 6px' : '13px 14px 12px',
        ...(mobile ? { paddingInlineStart: 14, gap: 6, flexShrink: 0 } : {}),
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          ...(mobile ? { minWidth: 0, flexWrap: 'wrap' as const, rowGap: 4 } : {}),
        }}>
          <Bell size={14} style={{ color: '#db142e', ...(mobile ? { flexShrink: 0 } : {}) }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>
            {t('title')}
          </span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(219,20,46,0.14)',
              color: '#db142e',
              border: '1px solid rgba(219,20,46,0.25)',
              ...(mobile ? { whiteSpace: 'nowrap' as const } : {}),
            }}>
              {t('newCount', { count: unreadCount })}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center', ...(mobile ? { flexShrink: 0 } : {}) }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, color: textMuted,
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: mobile ? '0 10px' : '3px 7px', borderRadius: 7,
                ...(mobile ? { minHeight: 44, whiteSpace: 'nowrap' as const } : {}),
              }}
              title={t('markAllRead')}
            >
              <CheckCheck size={12} />
              {t('allRead')}
            </button>
          )}
          <button
            onClick={fetchAll}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: textMuted,
              display: 'flex', alignItems: 'center',
              padding: 4, borderRadius: 6,
              ...(mobile ? { width: 44, height: 44, justifyContent: 'center' } : {}),
            }}
            title={t('refresh')}
            aria-label={t('refresh')}
          >
            {loading ? <BrandLoader variant="inline" size={mobile ? 14 : 12} /> : <RefreshCw size={mobile ? 14 : 12} />}
          </button>
        </div>
      </div>

      {/* list */}
      <div style={
        mobile
          ? { overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }
          : { overflowY: 'auto', maxHeight: 420 }
      }>
        {loading && items.length === 0 ? (
          <BrandLoader variant="section" size="sm" label={t('loading')} theme={dark ? 'dark' : 'light'} />
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <Bell size={32} style={{ color: textMuted, opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: 0 }}>
              {t('empty')}
            </p>
            <p style={{ fontSize: 11, color: textMuted, opacity: 0.6, margin: '4px 0 0' }}>
              {t('emptyHint')}
            </p>
          </div>
        ) : (
          items.map(n => (
            <NotifRow key={n.id} n={n} dark={dark} mobile={mobile} onRead={handleRead} />
          ))
        )}
      </div>

      {/* footer: full list */}
      {onNavigate && viewAllHref && (
        <button
          onClick={() => { setOpen(false); onNavigate(viewAllHref); }}
          style={{
            width: '100%', padding: mobile ? '0 14px' : '11px 14px',
            ...(mobile ? { minHeight: 44, flexShrink: 0 } : {}),
            background: 'transparent', border: 'none', borderTop: `1px solid ${border}`,
            cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#db142e',
          }}
        >
          {t('viewAll')}
        </button>
      )}
    </>
  );

  return (
    <>
      <style>{`
        @keyframes notif-pop {
          0%   { transform: scale(0.85) translateY(-4px); opacity: 0; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes badge-bounce {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.3); }
        }
        @keyframes notif-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .nb-sheet {
          max-height: min(72vh, calc(100vh - 84px));
          max-height: min(72dvh, calc(100dvh - 84px));
        }
        /* 44px touch target — CSS (not JS) so it applies from first paint */
        @media ${MOBILE_QUERY} {
          .nb-bell { width: 44px !important; height: 44px !important; }
        }
      `}</style>

      <div ref={ref} style={{ position: 'relative' }}>

        {/* Bell button */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="nb-bell"
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: open ? 'rgba(219,20,46,0.12)' : btnBg,
            border: `1px solid ${open ? 'rgba(219,20,46,0.3)' : border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: open ? '#db142e' : textMuted,
            position: 'relative', transition: 'all 0.2s ease',
          }}
          title={t('title')}
          aria-label={t('title')}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, insetInlineEnd: -5,
              minWidth: 18, height: 18, borderRadius: 999,
              background: '#db142e',
              border: `2px solid ${dark ? '#0d1117' : '#f0f2f5'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: '#fff',
              padding: '0 3px',
              animation: 'badge-bounce 0.4s ease',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown (tablet / desktop) */}
        {open && !mobile && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', insetInlineEnd: 0,
            width: 360, maxHeight: 500,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 16,
            boxShadow: dark
              ? '0 24px 64px rgba(0,0,0,0.7)'
              : '0 24px 64px rgba(0,0,0,0.18)',
            zIndex: 9999, overflow: 'hidden',
            animation: 'notif-pop 0.2s ease',
          }}>
            {panelBody}
          </div>
        )}
      </div>

      {/* Mobile sheet — portalled out of the sticky header's stacking context */}
      {open && mobile && typeof document !== 'undefined' && createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed', inset: 0, zIndex: Z_BACKDROP,
              background: 'rgba(0,0,0,0.45)',
              touchAction: 'none',
              animation: 'notif-fade 0.2s ease',
            }}
          />
          <div
            role="dialog"
            aria-label={t('title')}
            className="nb-sheet"
            style={{
              position: 'fixed', top: 72, insetInline: 12,
              display: 'flex', flexDirection: 'column',
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 16,
              boxShadow: dark
                ? '0 24px 64px rgba(0,0,0,0.7)'
                : '0 24px 64px rgba(0,0,0,0.18)',
              zIndex: Z_PANEL, overflow: 'hidden',
              transformOrigin: 'top center',
              animation: 'notif-pop 0.2s ease',
            }}
          >
            {panelBody}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

