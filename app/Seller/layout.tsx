'use client';

/**
 * app/seller/layout.tsx  ← MODIFIED
 *
 * Changes from previous version:
 *   1. Imports and mounts <GlobalSellerStyles dark={dark} /> for global
 *      light-mode button hover (#198f41 green) and shared animations.
 *   Everything else is identical.
 */

import { useState, useEffect, createContext, useContext } from 'react';
import Sidebar             from './components/Sidebar';
import Topbar              from './components/Topbar';
import AuthGuard           from './components/AuthGuard';
import { SubscriptionProvider } from '@/app/hooks/useSubscription';
import GlobalSellerStyles  from '@/app/components/seller/GlobalSellerStyles'; // ← NEW

/* ── Theme context (unchanged) ── */
export const ThemeContext = createContext<{
  dark: boolean;
  toggle: () => void;
}>({ dark: true, toggle: () => {} });

export function useTheme() { return useContext(ThemeContext); }

const STORAGE_KEY = 'ct_seller_theme';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark,       setDark]       = useState<boolean>(true);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setDark(saved === 'dark');
    setMounted(true);
  }, []);

  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {/* ── Global CSS injected here, re-evaluated on dark/light toggle ── */}
      <GlobalSellerStyles dark={dark} /> {/* ← NEW */}

      <SubscriptionProvider>
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
      </SubscriptionProvider>
    </ThemeContext.Provider>
  );
}