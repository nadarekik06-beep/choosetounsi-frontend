'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';
import AuthGuard from './components/AuthGuard';

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

  useEffect(() => {
    // Read persisted preference on first mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setDark(saved === 'dark');
    }
    setMounted(true);
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