'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, Package, Cpu,
  Lightbulb, ShoppingBag, MessageSquare, ChevronLeft,
  ChevronRight, LogOut, Home,
} from 'lucide-react';
import { getUser } from '@/lib/auth';

const NAV = [
  { href: '/seller/dashboard/red',                  label: 'Overview',        icon: LayoutDashboard },
  { href: '/seller/dashboard/red/analytics',        label: 'Analytics',       icon: BarChart2       },
  { href: '/seller/dashboard/red/products',         label: 'Products',        icon: Package         },
  { href: '/seller/dashboard/red/ai-tools',         label: 'AI Tools',        icon: Cpu             },
  { href: '/seller/dashboard/red/recommendations',  label: 'Recommendations', icon: Lightbulb       },
];

const BOTTOM_NAV = [
  { href: '/seller/orders',     label: 'Orders',     icon: ShoppingBag  },
  { href: '/seller/complaints', label: 'Complaints', icon: MessageSquare },
];

export default function RedSidebar({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const user = getUser();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/auth/login';
  };

  const w = collapsed ? 72 : 228;

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: w,
        background: 'var(--surface2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          padding: collapsed ? '0 16px' : '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Choose<span style={{ color: 'var(--red-light)' }}>Tounsi</span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, var(--red-dark), var(--red))',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 20,
                marginTop: 3,
                letterSpacing: 0.5,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: '#fff',
                  borderRadius: '50%',
                  opacity: 0.85,
                }}
              />
              RED PEPPER PRO
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {!collapsed && (
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              padding: '4px 8px 6px',
            }}
          >
            Main
          </p>
        )}
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/seller/dashboard/red'
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '9px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                color: isActive ? 'var(--red-light)' : 'var(--text2)',
                background: isActive ? 'var(--red-subtle)' : 'transparent',
                borderLeft: isActive && !collapsed ? '2px solid var(--red)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface3)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text2)';
                }
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        {!collapsed && (
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              padding: '12px 8px 6px',
            }}
          >
            Operations
          </p>
        )}
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px 0' : '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 400,
              textDecoration: 'none',
              color: 'var(--text2)',
              background: 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface3)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text2)';
            }}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--surface3)',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--red-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {user?.name?.slice(0, 2).toUpperCase() ?? 'SE'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name ?? 'Seller'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--red-light)' }}>Red Pepper · 49 DT/mo</div>
            </div>
          </div>
        )}

        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'none',
            color: 'var(--text2)',
            marginBottom: 2,
            transition: 'all 0.15s',
          }}
          title={collapsed ? 'Homepage' : undefined}
          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--text2)')}
        >
          <Home size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Homepage</span>}
        </Link>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--red-light)',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}