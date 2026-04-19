'use client';

/**
 * app/seller/components/Sidebar.tsx
 *
 * Changes from previous version:
 *   1. Added "Promote" entry to BASE_NAV (visible to all plan levels)
 *   All other logic unchanged.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Home, Sun, Moon,
  AlertTriangle, BarChart2, Brain, Lock, Crown, Zap,
} from 'lucide-react';
import { useTheme } from '../layout';
import { useSubscription } from '@/app/hooks/useSubscription';

const BASE_NAV = [
  { href: '/seller',            label: 'Dashboard',  icon: LayoutDashboard, premium: false },
  { href: '/seller/products',   label: 'Products',   icon: Package,         premium: false },
  { href: '/seller/orders',     label: 'Orders',     icon: ShoppingBag,     premium: false },
  { href: '/seller/complaints', label: 'Complaints', icon: AlertTriangle,   premium: false },
  { href: '/seller/promote',    label: 'Promote',    icon: Zap,             premium: false },
];

const PREMIUM_NAV = [
  { href: '/seller/analytics', label: 'Analytics',  icon: BarChart2, accent: '#db142e' },
  { href: '/seller/ai-tools',  label: 'AI Tools',   icon: Brain,     accent: '#8b5cf6' },
];

const BLACK_NAV = [
  { href: '/seller/black',         label: 'Black Hub',     icon: Crown, accent: '#f59e0b' },
  { href: '/seller/black/profit',  label: 'Profit Center', icon: Zap,   accent: '#f59e0b' },
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
  const { isPaid, isBlack, plan, loading } = useSubscription();

  const bg        = dark ? '#0D1117' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textMuted = dark ? 'rgba(255,255,255,0.35)' : '#888';

  const hoverTextColor = dark ? '#ffffff' : '#111111';
  const hoverBgColor   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
    window.location.href = '/auth/login';
  };

  const renderNavLink = (
    href: string, label: string, Icon: React.ElementType,
    isActive: boolean, accent?: string
  ) => (
    <Link
      href={href}
      onClick={onMobileClose}
      className="nav-link"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 12, fontSize: 13, fontWeight: 700,
        textDecoration: 'none', position: 'relative',
        transition: 'all 0.15s ease',
        background: isActive
          ? accent
            ? `${accent}22`
            : 'linear-gradient(135deg,#db142e,#a00f22)'
          : 'transparent',
        color: isActive ? (accent ?? '#fff') : textMuted,
        boxShadow: isActive && !accent ? '0 4px 14px rgba(219,20,46,0.35)' : 'none',
        outline: isActive && accent ? `1px solid ${accent}44` : '1px solid transparent',
      }}
    >
      <Icon size={17} style={{ flexShrink: 0, color: isActive && accent ? accent : undefined }} />
      {!collapsed && <span>{label}</span>}
      {collapsed && (
        <span className="tooltip" style={{
          position: 'absolute', left: '100%', marginLeft: 12,
          padding: '6px 10px',
          background: dark ? '#1e2330' : '#fff',
          color: dark ? '#fff' : '#111',
          fontSize: 11, fontWeight: 700, borderRadius: 8,
          whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s ease', zIndex: 50,
        }}>
          {label}
        </span>
      )}
    </Link>
  );

  const renderLockedLink = (href: string, label: string, Icon: React.ElementType) => (
    <Link
      key={href}
      href="/seller/subscription"
      onClick={onMobileClose}
      className="nav-link-locked"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 12, fontSize: 13, fontWeight: 700,
        textDecoration: 'none', position: 'relative',
        transition: 'all 0.15s ease', opacity: 0.5, color: textMuted,
      }}
    >
      <Icon size={17} style={{ flexShrink: 0 }} />
      {!collapsed && (
        <>
          <span style={{ flex: 1 }}>{label}</span>
          <Lock size={11} style={{ color: textMuted, flexShrink: 0 }} />
        </>
      )}
      {collapsed && (
        <span className="tooltip" style={{
          position: 'absolute', left: '100%', marginLeft: 12,
          padding: '6px 10px',
          background: dark ? '#1e2330' : '#fff',
          color: dark ? '#fff' : '#111',
          fontSize: 11, fontWeight: 700, borderRadius: 8,
          whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s ease', zIndex: 50,
        }}>
          {label} 🔒
        </span>
      )}
    </Link>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        style={{
          position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 40,
          background: bg, borderRight: '1px solid ' + border,
          width: collapsed ? 70 : 240,
          transition: 'width 0.3s ease, background 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}
        className={!mobileOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      >
        {/* ── Logo ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: collapsed ? '0 0 0 13px' : '0 14px',
          height: 64, borderBottom: '1px solid ' + border,
          overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#ffffff', overflow: 'hidden', padding: 3,
            boxShadow: isBlack
              ? '0 0 0 2px #f59e0b, 0 0 0 4px #a16207, 0 0 10px 3px rgba(245,158,11,0.4), 0 0 18px 5px rgba(161,98,7,0.22)'
              : '0 0 0 2px #198f41, 0 0 0 4px #db142e, 0 0 10px 3px rgba(25,143,65,0.4), 0 0 18px 5px rgba(219,20,46,0.22)',
          }}>
            <img
              src="/images/logo-chili.png"
              alt="ChooseTounsi"
              style={{ width: '99%', height: '99%', objectFit: 'contain', display: 'block', imageRendering: 'crisp-edges' }}
            />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, lineHeight: 1.3 }}>
              <p style={{ fontWeight: 900, fontSize: 13, color: dark ? '#fff' : '#111', margin: 0, textTransform: 'uppercase' }}>
                Choose<span style={{ color: '#db142e' }}>Tounsi</span>
              </p>
              <p style={{ fontSize: 9, fontWeight: 700, color: isBlack ? '#f59e0b' : '#198f41', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
                {isBlack ? '⬛ Elite Portal' : 'Seller Portal'}
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>

          {/* Base nav — Dashboard, Products, Orders, Complaints, Promote */}
          {BASE_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/seller' ? pathname === '/seller' : pathname.startsWith(href);
            return (
              <div key={href}>
                {renderNavLink(href, label, Icon, isActive)}
              </div>
            );
          })}

          {/* Red Premium divider */}
          {!collapsed && !loading && (
            <div style={{ margin: '8px 4px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: isPaid ? '#f87171' : textMuted, textTransform: 'uppercase' }}>
                {isPaid ? '🔴 Red Pepper' : 'Premium'}
              </span>
              <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
            </div>
          )}

          {/* Red nav items */}
          {PREMIUM_NAV.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname.startsWith(href);
            return isPaid
              ? <div key={href}>{renderNavLink(href, label, Icon, isActive, accent)}</div>
              : <div key={href}>{renderLockedLink(href, label, Icon)}</div>;
          })}

          {/* ── Black Pepper divider ── */}
          {!collapsed && !loading && (
            <div style={{ margin: '8px 4px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: isBlack ? 'rgba(245,158,11,0.25)' : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)') }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: isBlack ? '#f59e0b' : textMuted, textTransform: 'uppercase' }}>
                {isBlack ? '⬛ Black Elite' : 'Black Pepper'}
              </span>
              <div style={{ flex: 1, height: 1, background: isBlack ? 'rgba(245,158,11,0.25)' : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)') }} />
            </div>
          )}

          {/* Black nav items */}
          {BLACK_NAV.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname.startsWith(href);
            return isBlack
              ? (
                <Link
                  key={href}
                  href={href}
                  onClick={onMobileClose}
                  className="nav-link"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 0' : '10px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 12, fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', position: 'relative',
                    transition: 'all 0.15s ease',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.12))'
                      : 'transparent',
                    color: isActive ? '#f59e0b' : textMuted,
                    outline: isActive ? '1px solid rgba(245,158,11,0.35)' : '1px solid transparent',
                    boxShadow: isActive ? '0 2px 12px rgba(245,158,11,0.15)' : 'none',
                  }}
                >
                  <Icon size={17} style={{ flexShrink: 0, color: isActive ? '#f59e0b' : textMuted }} />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 8, fontWeight: 800,
                      padding: '2px 6px', borderRadius: 999,
                      background: 'rgba(245,158,11,0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.3)',
                    }}>
                      ⬛
                    </span>
                  )}
                  {collapsed && (
                    <span className="tooltip" style={{
                      position: 'absolute', left: '100%', marginLeft: 12,
                      padding: '6px 10px',
                      background: dark ? '#1e2330' : '#fff',
                      color: dark ? '#fff' : '#111',
                      fontSize: 11, fontWeight: 700, borderRadius: 8,
                      whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s ease', zIndex: 50,
                    }}>
                      {label}
                    </span>
                  )}
                </Link>
              )
              : <div key={href}>{renderLockedLink(href, label, Icon)}</div>;
          })}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid ' + border, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href="/" className="footer-link" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            textDecoration: 'none', color: textMuted, transition: 'all 0.15s ease',
          }}>
            <Home size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Go to Homepage</span>}
          </Link>

          <button onClick={toggle} className="footer-link" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: textMuted, width: '100%', transition: 'all 0.15s ease',
          }}>
            {dark ? <Sun size={15} style={{ flexShrink: 0 }} /> : <Moon size={15} style={{ flexShrink: 0 }} />}
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button onClick={() => onCollapse(!collapsed)} className="footer-link collapse-btn" style={{
            display: 'none', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: textMuted, width: '100%', transition: 'all 0.15s ease',
          }}>
            {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Collapse</span></>}
          </button>

          <button onClick={handleLogout} className="footer-link logout-btn" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#db142e', width: '100%', transition: 'all 0.15s ease',
          }}>
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <style>{`
        .nav-link:hover {
          background: ${hoverBgColor} !important;
          color: ${hoverTextColor} !important;
        }
        .nav-link:hover .tooltip { opacity: 1 !important; }
        .nav-link-locked:hover { opacity: 0.75 !important; }
        .nav-link-locked:hover .tooltip { opacity: 1 !important; }
        .footer-link:hover {
          background: ${hoverBgColor} !important;
          color: ${hoverTextColor} !important;
        }
        .logout-btn:hover {
          background: rgba(219,20,46,0.08) !important;
          color: #db142e !important;
        }
        .collapse-btn { display: flex !important; }
        @media (max-width:1024px) { .collapse-btn { display: none !important; } }
      `}</style>
    </>
  );
}