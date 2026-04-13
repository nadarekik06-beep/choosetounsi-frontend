'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';
import AuthGuard from './components/AuthGuard';
import { getUser, refreshUser } from '@/lib/auth';

/* ── Theme context ── */
export const ThemeContext = createContext<{
  dark: boolean;
  toggle: () => void;
}>({ dark: true, toggle: () => {} });

export function useTheme() { return useContext(ThemeContext); }

const STORAGE_KEY = 'ct_seller_theme';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Read saved theme from localStorage, default dark ── */
  const [dark, setDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Read persisted preference on first mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setDark(saved === 'dark');
    }
    setMounted(true);
  }, []);

  /* ── Redirect Red/Black Pepper sellers to their dashboard ── */
useEffect(() => {
  // Refresh user from API on layout mount so active_plan is always current
  // This handles the case where admin confirmed an upgrade while seller was logged in
  refreshUser().then((freshUser) => {
    const user = freshUser ?? getUser();
    if (!user) return;

    if (
      (user.active_plan === 'red' || user.active_plan === 'black') &&
      pathname === '/seller'
    ) {
      router.replace('/seller/dashboard/red');
    }
  });
}, []);
  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      // Persist to localStorage so refresh keeps the same mode
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  // Prevent flash of wrong theme before localStorage is read
  if (!mounted) return null;
  
// AFTER
  // Red/Black dashboard has its own full layout (RedLayout with RedSidebar + RedTopBar).
  // When inside those routes, render ONLY the AuthGuard + children — no green shell.
  const isRedRoute = pathname.startsWith('/seller/dashboard/red') ||
                     pathname.startsWith('/seller/dashboard/black');

  if (isRedRoute) {
    return (
      <ThemeContext.Provider value={{ dark, toggle }}>
        <AuthGuard>
          {children}
        </AuthGuard>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <AuthGuard>
        <div
          className="min-h-screen flex font-sans transition-colors duration-300"
          style={{ background: dark ? '#0D1117' : '#f0f2f5' }}
        >
          <Sidebar
            collapsed={collapsed}
            onCollapse={setCollapsed}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <div
            className="flex-1 flex flex-col min-h-screen transition-all duration-300"
            style={{ marginLeft: collapsed ? 70 : 240 }}
          >
            <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </ThemeContext.Provider>
  );
  
}