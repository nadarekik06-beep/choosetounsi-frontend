'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Sidebar             from './components/Sidebar';
import Topbar              from './components/Topbar';
import AuthGuard           from './components/AuthGuard';
import { SubscriptionProvider } from '@/app/hooks/useSubscription';
import GlobalSellerStyles  from '@/app/components/seller/GlobalSellerStyles';

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

  // Lock page scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
      <GlobalSellerStyles dark={dark} />

      <SubscriptionProvider>
        <AuthGuard>
          <div
            className="min-h-screen w-full max-w-full flex font-sans transition-colors duration-300"
            style={{ background: dark ? '#0D1117' : '#f0f2f5' }}
          >
            <Sidebar
              collapsed={collapsed}
              onCollapse={setCollapsed}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
            />

            {/* margin-left only applies on desktop (lg+); on mobile the sidebar is a drawer */}
            <div
              className="seller-main flex-1 flex flex-col min-h-screen min-w-0"
              style={{ '--sb-w': `${collapsed ? 64 : 242}px` } as React.CSSProperties}
            >
              <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
              <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
                {children}
              </main>
            </div>
          </div>
        </AuthGuard>
      </SubscriptionProvider>

      <style>{`
        .seller-main { margin-left: 0; transition: margin-left 0.28s ease; }
        @media (min-width: 1024px) {
          .seller-main { margin-left: var(--sb-w); }
        }
      `}</style>
    </ThemeContext.Provider>
  );
}