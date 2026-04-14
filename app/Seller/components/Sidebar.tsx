'use client';

/**
 * app/seller/components/Sidebar.tsx  ← REPLACE
 *
 * FIX applied:
 *   - Light mode hover: nav-link and footer-link no longer force `color: #fff`
 *     which was invisible on white background.
 *   - In dark mode: keeps original white hover text.
 *   - In light mode: hover text becomes #111 (dark text on light bg).
 *   - All other logic is identical to the original.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Home, Sun, Moon,
  AlertTriangle, BarChart2, Brain, Lock,
} from 'lucide-react';
import { useTheme } from '../layout';
import { useSubscription } from '@/app/hooks/useSubscription';

const BASE_NAV = [
  { href: '/seller',            label: 'Dashboard',  icon: LayoutDashboard, premium: false },
  { href: '/seller/products',   label: 'Products',   icon: Package,         premium: false },
  { href: '/seller/orders',     label: 'Orders',     icon: ShoppingBag,     premium: false },
  { href: '/seller/complaints', label: 'Complaints', icon: AlertTriangle,   premium: false },
];

const PREMIUM_NAV = [
  { href: '/seller/analytics', label: 'Analytics',  icon: BarChart2, accent: '#db142e' },
  { href: '/seller/ai-tools',  label: 'AI Tools',   icon: Brain,     accent: '#8b5cf6' },
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
  const { isPaid, plan, loading } = useSubscription();

  const bg        = dark ? '#0D1117' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textMuted = dark ? 'rgba(255,255,255,0.35)' : '#888';

  // FIX: hover text color must be readable in both modes
  const hoverTextColor  = dark ? '#ffffff' : '#111111';
  const hoverBgColor    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
    window.location.href = '/auth/login';
  };

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
            boxShadow: '0 0 0 2px #198f41, 0 0 0 4px #db142e, 0 0 10px 3px rgba(25,143,65,0.4), 0 0 18px 5px rgba(219,20,46,0.22)',
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
              <p style={{ fontSize: 9, fontWeight: 700, color: '#198f41', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
                Seller Portal
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>

          {/* Base nav items (always visible) */}
          {BASE_NAV.map(({ href, label, icon: Icon }) => {
            const isActive     = href === '/seller' ? pathname === '/seller' : pathname.startsWith(href);
            const isComplaints = href === '/seller/complaints';
            return (
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
                  background: isActive ? 'linear-gradient(135deg,#db142e,#a00f22)' : 'transparent',
                  color: isActive ? '#fff' : isComplaints ? '#f97316' : textMuted,
                  boxShadow: isActive ? '0 4px 14px rgba(219,20,46,0.35)' : 'none',
                }}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
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
          })}

          {/* ── Premium divider ── */}
          {!collapsed && !loading && (
            <div style={{
              margin: '8px 4px 4px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                color: isPaid ? '#f87171' : textMuted,
                textTransform: 'uppercase',
              }}>
                {isPaid ? '🔴 Red Pepper' : 'Premium'}
              </span>
              <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
            </div>
          )}

          {/* Premium nav items */}
          {PREMIUM_NAV.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname.startsWith(href);

            if (isPaid) {
              return (
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
                    background: isActive ? `${accent}22` : 'transparent',
                    color: isActive ? accent : textMuted,
                    outline: isActive ? `1px solid ${accent}44` : '1px solid transparent',
                  }}
                >
                  <Icon size={17} style={{ flexShrink: 0, color: isActive ? accent : textMuted }} />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 8, fontWeight: 800,
                      padding: '2px 6px', borderRadius: 999,
                      background: `${accent}18`,
                      color: accent,
                      border: `1px solid ${accent}33`,
                    }}>
                      RED
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
              );
            }

            return (
              <Link
                key={href}
                href="/seller/subscription"
                onClick={onMobileClose}
                className="nav-link-locked"
                title={collapsed ? `${label} — Upgrade to Red Pepper` : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 12, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', position: 'relative',
                  transition: 'all 0.15s ease',
                  opacity: 0.5,
                  color: textMuted,
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

      {/*
        FIX: hover styles now use CSS variables injected by the dark prop
        instead of hardcoded `color: #fff` which was invisible in light mode.

        Dark mode  → hover bg: rgba(255,255,255,0.06), text: #ffffff  (original behavior)
        Light mode → hover bg: rgba(0,0,0,0.06),       text: #111111  (NEW — visible on white)

        The logout button is excluded from the generic hover so it keeps its red color.
      */}
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