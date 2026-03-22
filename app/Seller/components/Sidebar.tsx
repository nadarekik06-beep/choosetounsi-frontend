'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Home, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../layout';

/* ── Logo baked in — same style as admin panel ── */
const LOGO_SRC = 'data:image/png;base64,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';

const NAV = [
  { href: '/seller',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Products',  icon: Package          },
  { href: '/seller/orders',   label: 'Orders',    icon: ShoppingBag      },
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

  const bg        = dark ? '#0D1117' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textMuted = dark ? 'rgba(255,255,255,0.35)' : '#888';

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    window.location.href = '/auth/login';
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        style={{
          position: 'fixed', top: 0, left: 0,
          height: '100%', zIndex: 40,
          background: bg,
          borderRight: `1px solid ${border}`,
          width: collapsed ? 70 : 240,
          transition: 'width 0.3s ease, background 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}
        className={!mobileOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      >
        {/* ── Logo area ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: collapsed ? '0 0 0 15px' : '0 14px',
          height: 64,
          borderBottom: `1px solid ${border}`,
          overflow: 'hidden',
          flexShrink: 0,
        }}>

          {/* White rounded square badge — matching admin panel style */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            animation: 'logoPulse 3s ease-in-out infinite',
            overflow: 'hidden',
            padding: 3,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="ChooseTounsi"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {!collapsed && (
            <div style={{ minWidth: 0, lineHeight: 1.3 }}>
              <p style={{
                fontWeight: 900,
                fontSize: 13,
                color: dark ? '#fff' : '#111',
                letterSpacing: '-0.01em',
                margin: 0,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}>
                Choose<span style={{ color: '#db142e' }}>Tounsi</span>
              </p>
              <p style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#198f41',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                margin: 0,
              }}>
                Seller Portal
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{
          flex: 1,
          padding: '12px 10px',
          display: 'flex', flexDirection: 'column', gap: 2,
          overflowY: 'auto',
        }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/seller' ? pathname === '/seller' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className="nav-link group"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? 'linear-gradient(135deg,#db142e,#a00f22)'
                    : 'transparent',
                  color: isActive ? '#fff' : textMuted,
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
                    fontSize: 11, fontWeight: 700,
                    borderRadius: 8, whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    opacity: 0, pointerEvents: 'none',
                    transition: 'opacity 0.15s ease',
                    zIndex: 50,
                  }}>
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          padding: '10px 10px 14px',
          borderTop: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>

          <Link href="/" className="footer-link" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            textDecoration: 'none', color: textMuted,
            transition: 'all 0.15s ease',
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
            color: textMuted, width: '100%',
            transition: 'all 0.15s ease',
          }}
            title={dark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {dark
              ? <Sun  size={15} style={{ flexShrink: 0 }} />
              : <Moon size={15} style={{ flexShrink: 0 }} />
            }
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button onClick={() => onCollapse(!collapsed)} className="footer-link collapse-btn" style={{
            display: 'none',
            alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: textMuted, width: '100%',
            transition: 'all 0.15s ease',
          }}>
            {collapsed
              ? <ChevronRight size={15} />
              : <><ChevronLeft size={15} /><span>Collapse</span></>
            }
          </button>

          <button onClick={handleLogout} className="footer-link" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#db142e', width: '100%',
            transition: 'all 0.15s ease',
          }}>
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes logoPulse {
          0%, 100% {
            box-shadow:
              0 0 0 1.5px rgba(219,20,46,0.55),
              0 0 8px 3px rgba(219,20,46,0.30),
              0 0 18px 5px rgba(219,20,46,0.14);
          }
          50% {
            box-shadow:
              0 0 0 2px rgba(219,20,46,0.85),
              0 0 14px 6px rgba(219,20,46,0.50),
              0 0 28px 9px rgba(219,20,46,0.24);
          }
        }
        .nav-link:hover {
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} !important;
          color: ${dark ? '#fff' : '#111'} !important;
        }
        .nav-link:hover .tooltip { opacity: 1 !important; }
        .footer-link:hover {
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} !important;
          color: ${dark ? '#fff' : '#111'} !important;
        }
        .collapse-btn { display: flex !important; }
        @media (max-width: 1024px) { .collapse-btn { display: none !important; } }
        aside { -webkit-font-smoothing: antialiased; }
      `}</style>
    </>
  );
}