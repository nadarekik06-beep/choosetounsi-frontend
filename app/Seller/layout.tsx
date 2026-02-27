'use client';

import { useState } from 'react';
import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';
import AuthGuard from './components/AuthGuard';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans">

        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main content area — shifts right based on sidebar width */}
        <div
          className={`
            flex-1 flex flex-col min-h-screen
            transition-all duration-300
            ${collapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]'}
          `}
        >
          <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>

      </div>
    </AuthGuard>
  );
}