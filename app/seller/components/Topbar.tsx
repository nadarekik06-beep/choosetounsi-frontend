'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Sun, Moon, Flame, Crown, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useLanguage } from '@/components/i18n/LanguageSwitcher';
import { formatDate } from '@/lib/i18n/format';
import { useRouter } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';
import { useTheme } from '../SellerShell';
import NotificationBell from '@/app/components/NotificationBell';
import { sellerNotificationApi } from '@/lib/notificationApi';
import { useSubscription } from '@/app/hooks/useSubscription';

const AVATAR_COLORS = [
  ['#fde68a', '#92400e'], ['#bfdbfe', '#1e40af'], ['#bbf7d0', '#14532d'],
  ['#fecaca', '#991b1b'], ['#e9d5ff', '#4c1d95'], ['#fed7aa', '#7c2d12'],
];

function avatarMeta(name: string) {
  const p        = name.trim().split(/\s+/);
  const initials = p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [bg, fg] = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return { initials, bg, fg };
}

function fixGoogle(url: string) {
  return url.replace(/=s\d+-?c?$/, '=s200-c');
}

/* Red Pepper badge */
function RedPepperBadge({ dark }: { dark: boolean }) {
  const t = useTranslations('seller.topbar');
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => { clearTimeout(timerRef.current); setShowTip(true);  }}
      onMouseLeave={() => { timerRef.current = setTimeout(() => setShowTip(false), 120); }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px 2px 5px', borderRadius: 999,
        background: dark
          ? 'linear-gradient(135deg, rgba(219,20,46,0.25), rgba(160,15,34,0.18))'
          : 'linear-gradient(135deg, rgba(219,20,46,0.12), rgba(180,12,28,0.08))',
        border: `1px solid ${dark ? 'rgba(219,20,46,0.45)' : 'rgba(219,20,46,0.3)'}`,
        animation: 'pepper-badge-glow 2.4s ease-in-out infinite',
        cursor: 'default', flexShrink: 0,
      }}>
        <Flame size={11} style={{ color: '#db142e', fill: 'rgba(219,20,46,0.35)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: '#db142e', letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1 }}>
          {t('red')}
        </span>
      </span>

      {showTip && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          background: dark ? '#1e2330' : '#ffffff',
          color: dark ? '#ffffff' : '#111111',
          fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          pointerEvents: 'none', zIndex: 100, animation: 'fadeUp 0.15s ease forwards',
        }}>
          {t('redTip')}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${dark ? '#1e2330' : '#ffffff'}`,
          }} />
        </span>
      )}
    </span>
  );
}

/* Black Pepper badge */
function BlackPepperBadge({ dark }: { dark: boolean }) {
  const t = useTranslations('seller.topbar');
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => { clearTimeout(timerRef.current); setShowTip(true); }}
      onMouseLeave={() => { timerRef.current = setTimeout(() => setShowTip(false), 120); }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px 2px 5px', borderRadius: 999,
        background: dark
          ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(161,98,7,0.2))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
        border: `1px solid ${dark ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.4)'}`,
        animation: 'gold-badge-glow 2.4s ease-in-out infinite',
        cursor: 'default', flexShrink: 0,
      }}>
        <Crown size={11} style={{ color: '#f59e0b', fill: 'rgba(245,158,11,0.4)', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1 }}>
          {t('elite')}
        </span>
      </span>

      {showTip && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          background: dark ? '#1e2330' : '#ffffff',
          color: dark ? '#ffffff' : '#111111',
          fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          border: `1px solid ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}`,
          pointerEvents: 'none', zIndex: 100, animation: 'fadeUp 0.15s ease forwards',
        }}>
          {t('blackTip')}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${dark ? '#1e2330' : '#ffffff'}`,
          }} />
        </span>
      )}
    </span>
  );
}

/* TOPBAR */
export default function Topbar({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const { dark, toggle }    = useTheme();
  const t                    = useTranslations('seller.topbar');
  const tn                   = useTranslations('seller.nav');
  const locale               = useLocale();
  const { openModal: openLanguage } = useLanguage();
  const { isRed, isBlack }  = useSubscription();
  const router               = useRouter();
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  const baseBg     = dark ? '#161b27' : '#ffffff';
  const baseBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textMain   = dark ? '#fff'   : '#111';
  const textMuted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  const redBg = dark
    ? 'linear-gradient(135deg, #1f0d10 0%, #2a0f14 40%, #1a0c10 100%)'
    : 'linear-gradient(135deg, #fff5f5 0%, #fef0f1 50%, #fff8f8 100%)';
  const redBorder = dark ? 'rgba(219, 20, 46, 0.22)' : 'rgba(219, 20, 46, 0.15)';
  const redAccentLine = isRed || isBlack
    ? `linear-gradient(90deg, transparent, #db142e 20%, #db142e 80%, transparent)`
    : undefined;

  const bg     = isRed || isBlack ? redBg     : baseBg;
  const border = isRed || isBlack ? redBorder : baseBorder;

  const today = formatDate(new Date(), locale, 'full');

  const { initials, bg: aBg, fg: aFg } = user
    ? avatarMeta(user.name)
    : { initials: '?', bg: '#eee', fg: '#999' };

  const avatarSrc = user?.avatar && !imgErr ? fixGoogle(user.avatar) : null;

  const ring = isBlack ? { boxShadow: '0 0 0 2px rgba(245,158,11,0.6)' }
             : isRed   ? { boxShadow: '0 0 0 2px rgba(219,20,46,0.5)' }
             : {};

  return (
    <>
      <header
        className="tb-header"
        style={{
          height: 64,
          background: bg,
          borderBottom: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          transition: 'background 0.35s ease, border-color 0.35s ease',
          ...(isRed && dark ? { boxShadow: '0 1px 0 rgba(219,20,46,0.18), 0 4px 24px rgba(219,20,46,0.06)' } : {}),
          ...(isBlack && dark ? { boxShadow: '0 1px 0 rgba(245,158,11,0.18), 0 4px 24px rgba(245,158,11,0.06)' } : {}),
        }}
      >
        {(isRed || isBlack) && (
          <div style={{
            position: 'absolute', bottom: 0, insetInline: 0, height: 2,
            background: isBlack
              ? 'linear-gradient(90deg, transparent, #f59e0b 20%, #f59e0b 80%, transparent)'
              : redAccentLine,
            opacity: dark ? 0.7 : 0.5, pointerEvents: 'none',
          }} />
        )}

        {/* hamburger */}
        <button
          onClick={onMobileMenuOpen}
          aria-label={tn('openMenu')}
          className="lg:hidden theme-toggle"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: textMuted, padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Menu size={22} />
        </button>

        {/* title + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 16, fontWeight: 800, color: textMain, margin: 0, lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {t('title')}
          </h2>
          <p className="hidden sm:block" style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{today}</p>
        </div>

        {/* right side */}
        <div className="tb-right" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>

          {/* dark/light toggle (hidden on mobile — the sidebar has one) */}
          <button
            onClick={openLanguage}
            className="theme-toggle hidden sm:flex"
            aria-label={t('changeLanguage')}
            title={t('changeLanguage')}
            style={{
              height: 38, borderRadius: 10, padding: '0 10px', gap: 5,
              background: dark ? 'rgba(255,255,255,0.07)' : '#f0f2f5',
              border: `1px solid ${border}`,
              cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
              color: textMain, fontSize: 11, fontWeight: 800,
              transition: 'all 0.2s ease',
            }}
          >
            <Globe size={15} />
            {locale.toUpperCase()}
          </button>

          <button
            onClick={toggle}
            aria-label={t('toggleTheme')}
            className="theme-toggle hidden sm:flex"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: dark ? 'rgba(255,255,255,0.07)' : '#f0f2f5',
              border: `1px solid ${border}`,
              cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
              color: dark ? '#f59e0b' : '#6366f1',
              transition: 'all 0.2s ease',
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <NotificationBell
            api={sellerNotificationApi}
            dark={dark}
            onNavigate={router.push}
            pollInterval={30_000}
          />

          <div className="hidden sm:block" style={{ width: 1, height: 28, background: border }} />

          {/* user pill: avatar only on mobile, full pill from sm up */}
          <div
            className="tb-pill"
            style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 12,
              background: dark
                ? isBlack ? 'rgba(245,158,11,0.1)' : isRed ? 'rgba(219,20,46,0.12)' : 'rgba(255,255,255,0.05)'
                : isBlack ? 'rgba(245,158,11,0.06)' : isRed ? 'rgba(219,20,46,0.06)' : '#f0f2f5',
              border: `1px solid ${
                isBlack
                  ? dark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.22)'
                  : isRed
                    ? dark ? 'rgba(219,20,46,0.3)' : 'rgba(219,20,46,0.18)'
                    : border
              }`,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user?.name}
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...ring }}
              />
            ) : (
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: aBg, color: aFg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0, ...ring,
              }}>
                {initials}
              </span>
            )}

            <div className="hidden sm:block" style={{ lineHeight: 1.3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: textMain, margin: 0, lineHeight: 1.2 }}>
                  {user?.name?.split(' ')[0] ?? t('sellerFallback')}
                </p>
                {isBlack ? <BlackPepperBadge dark={dark} /> : isRed ? <RedPepperBadge dark={dark} /> : null}
              </div>
              <p style={{
                fontSize: 10, fontWeight: 600,
                color: isBlack ? '#f59e0b' : isRed ? '#db142e' : '#198f41',
                margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {isBlack ? t('blackElite') : isRed ? t('premiumSeller') : t('roleSeller')}
              </p>
            </div>

            <span className="hidden sm:inline-block" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isBlack ? '#f59e0b' : isRed ? '#db142e' : '#198f41',
              boxShadow: isBlack
                ? '0 0 0 2px rgba(245,158,11,0.4)'
                : isRed ? '0 0 0 2px rgba(219,20,46,0.3)' : '0 0 0 2px rgba(25,143,65,0.3)',
              animation: isBlack
                ? 'gold-badge-glow 2s infinite'
                : isRed ? 'pepper-badge-glow 2s infinite' : 'pulse-green 2s infinite',
            }} />
          </div>
        </div>
      </header>

      <style>{`
        .tb-header { padding: 0 12px; gap: 8px; }
        .tb-right  { gap: 6px; }
        .tb-pill   { padding: 3px; gap: 0; }
        @media (min-width: 640px) {
          .tb-header { padding: 0 20px; gap: 12px; }
          .tb-right  { gap: 8px; }
          .tb-pill   { padding-block: 6px; padding-inline: 6px 12px; gap: 10px; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes gold-badge-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50%      { box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
        }
      `}</style>
    </>
  );
}