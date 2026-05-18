'use client';

/**
 * app/seller/components/Sidebar.tsx — v3
 *
 * Fixes vs v2:
 *   • Logo is 44px (was 36), text is bigger
 *   • Sidebar bg is #111827 — a proper dark slate, not near-black
 *   • Active item: solid colored left bar + bright white text + accent bg pill
 *   • Inactive text is rgba(255,255,255,0.62) — clearly readable
 *   • Section labels: 10px, 0.15em tracking, rgba(255,255,255,0.35)
 *   • Hover: rgba(255,255,255,0.09) bg + full white text
 *   • Icons are 17px — more visible
 *   • Black Elite items get a subtle amber tint on hover
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Home, Sun, Moon,
  AlertTriangle, BarChart2, Brain, Lock, Crown, Zap,
  Tag, Package2, TrendingUp, Eye, Star, DollarSign,
  Users, Megaphone, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTheme } from '../layout';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useState } from 'react';
import { Wallet } from 'lucide-react'

const STORE_NAV = [
  { href: '/seller',          label: 'Overview',   icon: LayoutDashboard },
  { href: '/seller/products', label: 'Products',   icon: Package },
  { href: '/seller/packs',    label: 'Packs',      icon: Package2 },
  { href: '/seller/orders',   label: 'Orders',     icon: ShoppingBag },
  { href: '/seller/earnings', label: 'Earnings', icon: Wallet },

];
const CUSTOMER_NAV = [
  { href: '/seller/complaints', label: 'Complaints', icon: AlertTriangle },
    { href: '/seller/reviews', icon: Star, label: 'Reviews & Reputation' },

];
const GROWTH_NAV = [
  { href: '/seller/promotions', label: 'Promotions',  icon: Tag },
  { href: '/seller/promote',    label: 'Ads & Boost', icon: Megaphone },
];
const RED_NAV = [
  { href: '/seller/analytics', label: 'Analytics', icon: BarChart2, accent: '#fca5a5' },
  { href: '/seller/ai-tools',  label: 'AI Tools',  icon: Brain,     accent: '#c4b5fd' },

];
const BLACK_NAV = [
  { href: '/seller/black',                  label: 'Elite Overview',   icon: Crown,      accent: '#fbbf24' },
  { href: '/seller/black/ai-intelligence',  label: 'AI Intelligence',  icon: Brain,      accent: '#c4b5fd' },
  { href: '/seller/black/visitor-insights', label: 'Visitor Insights', icon: Eye,        accent: '#93c5fd' },
  { href: '/seller/black/listing-quality',  label: 'Listing Quality',  icon: Star,       accent: '#d8b4fe' },
  { href: '/seller/black/smart-promotions', label: 'Smart Promotions', icon: TrendingUp, accent: '#fbbf24' },
  { href: '/seller/black/profit',           label: 'Profit Center',    icon: DollarSign, accent: '#6ee7b7' },
  { href: '/seller/black/vip-lounge',       label: 'VIP Lounge',       icon: Users,      accent: '#fbbf24' },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const { isPaid, isBlack, loading } = useSubscription();

  const [storeOpen,    setStoreOpen]    = useState(true);
  const [customerOpen, setCustomerOpen] = useState(true);
  const [growthOpen,   setGrowthOpen]   = useState(true);

  // Sidebar is ALWAYS dark regardless of page theme — like a real admin panel
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

  /* ── Section label ── */
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

  /* ── Nav item ── */
  const NavItem = ({ href, label, Icon, accent, exact = false }: {
    href: string; label: string; Icon: React.ElementType; accent?: string; exact?: boolean;
  }) => {
    const isActive = exact
      ? pathname === href
      : href === '/seller' ? pathname === '/seller' : pathname === href || pathname.startsWith(href + '/');

    const color = accent ?? '#ffffff';

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
        {/* Left active bar */}
        {isActive && !collapsed && (
          <div style={{
            position: 'absolute', left: 0, top: '18%', bottom: '18%',
            width: 3.5, borderRadius: '0 3px 3px 0',
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

        {/* Tooltip */}
        {collapsed && (
          <span className="sb3-tip" style={{
            position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)',
            padding: '5px 12px', background: '#1f2937', color: '#fff',
            fontSize: 12, fontWeight: 600, borderRadius: 8, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            opacity: 0, pointerEvents: 'none', transition: 'opacity 0.12s', zIndex: 100,
          }}>{label}</span>
        )}
      </Link>
    );
  };

  /* ── Locked item ── */
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

  /* ── Tier divider ── */
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

  /* ── Footer button ── */
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
      color: danger ? '#f87171' : TXT_BASE, width: '100%',
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
          position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 40,
          background: SB_BG,
          borderRight: `1px solid ${SB_BORDER}`,
          width: collapsed ? 64 : 242,
          transition: 'width 0.28s ease',
          display: 'flex', flexDirection: 'column',
          overflowX: 'hidden',
        }}
        className={!mobileOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      >

        {/* ── Logo ── */}
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
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 900, fontSize: 14.5, color: '#fff', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1 }}>
                Choose<span style={{ color: '#db142e' }}>Tounsi</span>
              </p>
              <p style={{ fontSize: 9, fontWeight: 800, margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1,
                color: isBlack ? '#f59e0b' : '#4ade80' }}>
                {isBlack ? '⬛ Elite Portal' : 'Seller Portal'}
              </p>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, paddingTop: 4, overflowY: 'auto', overflowX: 'hidden' }}>

          <SectionLabel label="My Store" open={storeOpen} onToggle={() => setStoreOpen(p => !p)}/>
          {storeOpen && STORE_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} exact={item.href === '/seller'}/>
          ))}

          <SectionLabel label="Customer" open={customerOpen} onToggle={() => setCustomerOpen(p => !p)}/>
          {customerOpen && CUSTOMER_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon}/>
          ))}

          <SectionLabel label="Growth" open={growthOpen} onToggle={() => setGrowthOpen(p => !p)}/>
          {growthOpen && GROWTH_NAV.map(item => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon}/>
          ))}

          {!loading && <TierDivider label={isPaid ? '● Red Pepper' : '● Premium'} color="#f87171"/>}
          {RED_NAV.map(item =>
            isPaid
              ? <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon} accent={item.accent}/>
              : <LockedItem key={item.href} label={item.label} Icon={item.icon}/>
          )}

          {!loading && <TierDivider label={isBlack ? '■ Black Elite' : '■ Black Pepper'} color="#f59e0b"/>}
          {isBlack
            ? BLACK_NAV.map(item => (
              <NavItem key={item.href} href={item.href} label={item.label} Icon={item.icon}
                accent={item.accent} exact={item.href === '/seller/black'}/>
            ))
            : BLACK_NAV.slice(0, 2).map(item => (
              <LockedItem key={item.href} label={item.label} Icon={item.icon}/>
            ))
          }
        </nav>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${SB_BORDER}`, paddingTop: 8, paddingBottom: 12, flexShrink: 0 }}>
          <FooterBtn icon={Home} label="Homepage" href="/"/>
          <FooterBtn icon={dark ? Sun : Moon} label={dark ? 'Light Mode' : 'Dark Mode'} onClick={toggle}/>
          <FooterBtn icon={collapsed ? ChevronRight : ChevronLeft} label="Collapse" onClick={() => onCollapse(!collapsed)}/>
          <FooterBtn icon={LogOut} label="Sign Out" onClick={handleLogout} danger/>
        </div>
      </aside>

      <style>{`
        /* Nav items */
        .sb3-item:hover {
          background: ${HOVER_BG} !important;
        }
        .sb3-item:hover span,
        .sb3-item:hover svg { color: ${TXT_ACTIVE} !important; }
        .sb3-item:hover .sb3-tip { opacity: 1 !important; }

        /* Black Elite item hover gets amber tint */
        .sb3-item[data-accent="#fbbf24"]:hover,
        .sb3-item[data-accent="#6ee7b7"]:hover {
          background: rgba(245,158,11,0.1) !important;
        }

        /* Footer */
        .sb3-footer:hover { background: ${HOVER_BG} !important; }
        .sb3-footer:hover span { color: ${TXT_ACTIVE} !important; }
        .sb3-danger:hover { background: rgba(239,68,68,0.12) !important; }

        /* Scrollbar */
        nav::-webkit-scrollbar { width: 4px; }
        nav::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        @media (max-width: 1024px) {
          aside { transition: transform 0.28s ease, width 0.28s ease !important; }
        }
      `}</style>
    </>
  );
}