'use client';

import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

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

export default function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter(); // ✅ add router
  const handleLogout = () => {
    // Remove your token or session data here
    localStorage.removeItem('session'); // or whatever you use

    // Redirect to login page
    router.push('/auth/login');
  };


  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-[#0D1117] text-white
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[70px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          border-r border-white/[0.06]
        `}
      >
        {/* ── Logo ── */}
        <div
          className={`
            flex items-center gap-3 px-4 h-16
            border-b border-white/[0.06]
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Store size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-white leading-tight tracking-tight truncate">
                ChooseTounsi
              </p>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                Seller Portal
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/seller'
                ? pathname === '/seller'
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-sm font-semibold transition-all duration-150
                  group
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90'
                  }
                `}
              >
                <Icon size={17} className="flex-shrink-0" />

                {!collapsed && <span>{label}</span>}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="
                    absolute left-full ml-3 px-2.5 py-1.5
                    bg-slate-800 text-white text-xs font-semibold rounded-lg
                    whitespace-nowrap pointer-events-none
                    opacity-0 group-hover:opacity-100
                    translate-x-1 group-hover:translate-x-0
                    transition-all duration-150 shadow-xl
                    z-50
                  ">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="px-2.5 pb-4 pt-3 border-t border-white/[0.06] space-y-1">
          {/* Collapse toggle – desktop only */}
          <button
            onClick={() => onCollapse(!collapsed)}
            className={`
              hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-xl
              text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.06]
              transition-all duration-150
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            {collapsed
              ? <ChevronRight size={15} />
              : <><ChevronLeft size={15} /><span>Collapse</span></>
            }
          </button>

          <button
          onClick={handleLogout} // ← this is all you add

            className={`
              flex w-full items-center gap-3 px-3 py-2.5 rounded-xl
              text-xs font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/10
              transition-all duration-150
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}