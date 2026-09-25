'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Home, Sun, Moon,
  AlertTriangle, BarChart2, Brain, Lock, Crown,
  Tag, Package2, TrendingUp, Eye, Star, DollarSign,
  Users, Megaphone, ChevronDown, ChevronUp, CreditCard, Wallet, X, Store, Globe,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useLanguage } from '@/components/i18n/LanguageSwitcher';
import { useTheme } from '../SellerShell';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useState, useEffect } from 'react';

// `label` is a key in the seller.nav messages
const STORE_NAV = [
  { href: '/seller',              label: 'overview',     icon: LayoutDashboard },
  { href: '/seller/settings',     label: 'settings',     icon: Store },
  { href: '/seller/products',     label: 'products',     icon: Package },
  { href: '/seller/packs',        label: 'packs',        icon: Package2 },
  { href: '/seller/orders',       label: 'orders',       icon: ShoppingBag },
  { href: '/seller/earnings',     label: 'earnings',     icon: Wallet },
  { href: '/seller/subscription', label: 'subscription', icon: CreditCard },
];
const CUSTOMER_NAV = [
  { href: '/seller/complaints', label: 'complaints', icon: AlertTriangle },
  { href: '/seller/reviews',    label: 'reviews',    icon: Star },
];
const GROWTH_NAV = [
  { href: '/seller/promotions', label: 'promotions', icon: Tag },
  { href: '/seller/promote',    label: 'promote',    icon: Megaphone },
];
const RED_NAV = [
  { href: '/seller/analytics', label: 'analytics', icon: BarChart2, accent: '#fca5a5' },
  { href: '/seller/ai-tools',  label: 'aiTools',   icon: Brain,     accent: '#c4b5fd' },
];
const BLACK_NAV = [
  { href: '/seller/black',                  label: 'eliteOverview',   icon: Crown,      accent: '#fbbf24' },
  { href: '/seller/black/ai-intelligence',  label: 'aiIntelligence',  icon: Brain,      accent: '#c4b5fd' },
  { href: '/seller/black/visitor-insights', label: 'visitorInsights', icon: Eye,        accent: '#93c5fd' },
  { href: '/seller/black/listing-quality',  label: 'listingQuality',  icon: Star,       accent: '#d8b4fe' },
  { href: '/seller/black/smart-promotions', label: 'smartPromotions', icon: TrendingUp, accent: '#fbbf24' },
  { href: '/seller/black/profit',           label: 'profitCenter',    icon: DollarSign, accent: '#6ee7b7' },
  { href: '/seller/black/vip-lounge',       label: 'vipLounge',       icon: Users,      accent: '#fbbf24' },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed: collapsedProp, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('seller.nav');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { openModal: openLanguage } = useLanguage();
  const { dark, toggle } = useTheme();
  const { isPaid, isBlack, loading } = useSubscription();

  const [storeOpen,    setStoreOpen]    = useState(true);
  const [customerOpen, setCustomerOpen] = useState(true);
  const [growthOpen,   setGrowthOpen]   = useState(true);

  // Collapsed mode only makes sense on desktop. On mobile the drawer is always full.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const collapsed = collapsedProp && isDesktop;

  const SB_BG       = '#111827';
  const SB_BORDER   = 'rgba(255,255,255,0.07)';
  const TXT_BASE    = 'rgba(255,255,255,0.62)';
  const TXT_ACTIVE  = '#ffffff';
  const TXT_SECTION = 'rgba(255,255,255,0.32)';
  const HOVER_BG    = 'rgba(255,255,255,0.08)';

  const handleLogout = () => {
    localStorage.clear(); sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      document.cookie = c.split('=')[0].trim() + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
    window.location.href = '/auth/login';
  };

  const SectionLabel = ({ label, open, onToggle }: { label: string; open?: boolean; onToggle?: () => void }) => {
    if (collapsed) return (
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 14px 6px' }}/>
    );
    return (
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', background: 'none', border: 'none', cursor: onToggle ? 'pointer' : 'default',
        padding: '0 16px', margin: '16px 0 4px',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: TXT_SECTION, textTransform: 'uppercase' }}>
          {label}
        </span>
        {onToggle && <span style={{ color: TXT_SECTION }}>{open ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</span>}
      </button>
    );
  };

  const NavItem = ({ href, label, Icon, accent, exact = false }: {
    href: string; label: string; Icon: React.ElementType; accent?: string; exact?: boolean;
  }) => {
    const isActive = exact
      ? pathname === href
      : href === '/seller' ? pathname === '/seller' : pathname === href || pathname.startsWith(href + '/');

    return (
      <Link
        href={href}
        onClick={onMobileClose}
        className="sb3-item"
        data-active={isActive ? 'true' : 'false'}
        data-accent={accent ?? ''}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 11,
          padding: collapsed ? '11px 0' : '9px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: collapsed ? 0 : 9,
          fontSize: 13.5, fontWeight: isActive ? 700 : 500,
          textDecoration: 'none', position: 'relative',
          margin: collapsed ? '0' : '1px 8px',
          transition: 'background 0.14s, color 0.14s',
          background: isActive
            ? accent ? `${accent}18` : 'rgba(219,20,46,0.15)'
            : 'transparent',
          color: isActive ? (accent ?? TXT_ACTIVE) : TXT_BASE,
        }}
      >
        {isActive && !collapsed && (
          <div style={{
            position: 'absolute', insetInlineStart: 0, top: '18%', bottom: '18%',
            width: 3.5, borderStartEndRadius: 3, borderEndEndRadius: 3,
            background: accent ?? '#db142e',
          }}/>
        )}

        <Icon
          size={17}
          style={{ flexShrink: 0, color: isActive ? (accent ?? TXT_ACTIVE) : TXT_BASE, transition: 'color 0.14s' }}
        />

        {!collapsed && (
          <span style={{ flex: 1, lineHeight: 1.2, color: isActive ? (accent ?? TXT_ACTIVE) : TXT_BASE }}>
            {label}
          </span>
        )}

        {collapsed && (
          <span className="sb3-tip" style={{
            position: 'absolute', insetInlineStart: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)',
            padding: '5px 12px', background: '#1f2937', color: '#fff',
            fontSize: 12, fontWeight: 600, borderRadius: 8, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            opacity: 0, pointerEvents: 'none', transition: 'opacity 0.12s', zIndex: 100,
          }}>{label}</span>
        )}
      </Link>
    );
  };

  const LockedItem = ({ label, Icon }: { label: string; Icon: React.ElementType }) => (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: collapsed ? 0 : 11,
      padding: collapsed ? '11px 0' : '9px 16px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      margin: collapsed ? 0 : '1px 8px',
      borderRadius: 9, opacity: 0.38, cursor: 'not-allowed',
    }}>
      <Icon size={17} style={{ flexShrink: 0, color: TXT_BASE }}/>
      {!collapsed && (
        <>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: TXT_BASE }}>{label}</span>
          <Lock size={11} style={{ color: TXT_BASE }}/>
        </>
      )}
    </div>
  );

  const TierDivider = ({ label, color }: { label: string; color: string }) => {
    if (collapsed) return <div style={{ height: 1, background: `${color}30`, margin: '10px 14px 6px' }}/>;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', margin: '16px 0 4px' }}>
        <div style={{ flex: 1, height: 1, background: `${color}28` }}/>
        <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.13em', color: `${color}99`, textTransform: 'uppercase' as const }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: `${color}28` }}/>
      </div>
    );
  };

  const FooterBtn = ({ icon: Icon, label, onClick, href, danger }: {
    icon: React.ElementType; label: string; onClick?: () => void; href?: string; danger?: boolean;
  }) => {
    const style: React.CSSProperties = {
      display: 'flex', alignItems: 'center',
      gap: collapsed ? 0 : 10,
      padding: collapsed ? '10px 0' : '9px 16px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 9, margin: collapsed ? '1px 0' : '1px 8px',
      fontSize: 13, fontWeight: 500,
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: danger ? '#f87171' : TXT_BASE,
      width: collapsed ? '100%' : 'calc(100% - 16px)',
      transition: 'background 0.14s, color 0.14s', textDecoration: 'none',
    };
    const content = (
      <>
        <Icon size={16} style={{ flexShrink: 0, color: danger ? '#f87171' : TXT_BASE }}/>
        {!collapsed && <span style={{ color: danger ? '#f87171' : TXT_BASE }}>{label}</span>}
      </>
    );
    if (href) return <Link href={href} onClick={onMobileClose} className={danger ? 'sb3-danger' : 'sb3-footer'} style={style}>{content}</Link>;
    return <button onClick={onClick} className={danger ? 'sb3-danger' : 'sb3-footer'} style={style}>{content}</button>;
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onMobileClose}/>
      )}

      <aside
        style={{
          position: 'fixed', top: 0, insetInlineStart: 0, height: '100dvh', zIndex: 40,
          background: SB_BG,
          borderInlineEnd: `1px solid ${SB_BORDER}`,
          width: collapsed ? 64 : 242,
          maxWidth: '85vw',
          transition: 'width 0.28s ease',
          display: 'flex', flexDirection: 'column',
          overflowX: 'hidden',
        }}
        className={!mobileOpen ? (isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0') : 'translate-x-0'}
      >

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '0 10px' : '0 16px',
          height: 66, borderBottom: `1px solid ${SB_BORDER}`,
          flexShrink: 0, justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fff', padding: 4, overflow: 'hidden',
            boxShadow: isBlack
              ? '0 0 0 2.5px #f59e0b, 0 0 14px rgba(245,158,11,0.55)'
              : '0 0 0 2.5px #198f41, 0 0 14px rgba(25,143,65,0.45)',
          }}>
            <img src="/images/logo-chili.png" alt="ChooseTounsi"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}/>
          </div>

          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 900, fontSize: 14.5, color: '#fff', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1 }}>
                Choose<span style={{ color: '#db142e' }}>Tounsi</span>
              </p>
              <p style={{ fontSize: 9, fontWeight: 800, margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1,
                color: isBlack ? '#f59e0b' : '#4ade80' }}>
                {isBlack ? t('elitePortal') : t('portal')}
              </p>
            </div>
          )}

          {/* Close button (mobile drawer only) */}
          {!collapsed && (
            <button
              onClick={onMobileClose}
              aria-label={t('closeMenu')}
              className="lg:hidden"
              style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
                color: TXT_BASE, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18}/>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: 4, overflowY: 'auto', overflowX: 'hidden' }}>

          <SectionLabel label={t('sections.store')} open={storeOpen} onToggle={() => setStoreOpen(p => !p)}/>
          {storeOpen && STORE_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={t(item.label)} Icon={item.icon} exact={item.href === '/seller'}/>
          ))}

          <SectionLabel label={t('sections.customer')} open={customerOpen} onToggle={() => setCustomerOpen(p => !p)}/>
          {customerOpen && CUSTOMER_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={t(item.label)} Icon={item.icon}/>
          ))}

          <SectionLabel label={t('sections.growth')} open={growthOpen} onToggle={() => setGrowthOpen(p => !p)}/>
          {growthOpen && GROWTH_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={t(item.label)} Icon={item.icon}/>
          ))}

          {!loading && <TierDivider label={isPaid ? t('tierRed') : t('tierPremium')} color="#f87171"/>}
          {RED_NAV.map(item =>
            isPaid
              ? <NavItem key={item.href} href={item.href} label={t(item.label)} Icon={item.icon} accent={item.accent}/>
              : <LockedItem key={item.href} label={t(item.label)} Icon={item.icon}/>
          )}

          {!loading && <TierDivider label={isBlack ? t('tierBlackElite') : t('tierBlack')} color="#f59e0b"/>}
          {isBlack
            ? BLACK_NAV.map(item => (
              <NavItem key={item.href} href={item.href} label={t(item.label)} Icon={item.icon}
                accent={item.accent} exact={item.href === '/seller/black'}/>
            ))
            : BLACK_NAV.slice(0, 2).map(item => (
              <LockedItem key={item.href} label={t(item.label)} Icon={item.icon}/>
            ))
          }
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${SB_BORDER}`, paddingTop: 8, paddingBottom: 12, flexShrink: 0 }}>
          <FooterBtn icon={Home} label={t('homepage')} href="/"/>
          <FooterBtn icon={dark ? Sun : Moon} label={dark ? t('lightMode') : t('darkMode')} onClick={toggle}/>
          <FooterBtn icon={Globe} label={t('language', { code: locale.toUpperCase() })} onClick={() => { onMobileClose(); openLanguage(); }}/>
          {isDesktop && (
            <FooterBtn
              icon={collapsed ? ChevronRight : ChevronLeft}
              label={collapsed ? t('expand') : t('collapse')}
              onClick={() => onCollapse(!collapsedProp)}
            />
          )}
          <FooterBtn icon={LogOut} label={t('signOut')} onClick={handleLogout} danger/>
        </div>
      </aside>

      <style>{`
        .sb3-item:hover { background: ${HOVER_BG} !important; }
        .sb3-item:hover span,
        .sb3-item:hover svg { color: ${TXT_ACTIVE} !important; }
        .sb3-item:hover .sb3-tip { opacity: 1 !important; }

        .sb3-item[data-accent="#fbbf24"]:hover,
        .sb3-item[data-accent="#6ee7b7"]:hover {
          background: rgba(245,158,11,0.1) !important;
        }

        .sb3-footer:hover { background: ${HOVER_BG} !important; }
        .sb3-footer:hover span { color: ${TXT_ACTIVE} !important; }
        .sb3-danger:hover { background: rgba(239,68,68,0.12) !important; }

        nav::-webkit-scrollbar { width: 4px; }
        nav::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @media (max-width: 1023px) {
          aside { transition: transform 0.28s ease, width 0.28s ease !important; }
        }
      `}</style>
    </>
  );
}