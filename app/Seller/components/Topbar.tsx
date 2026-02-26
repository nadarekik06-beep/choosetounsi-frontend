'use client';

import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, ChevronRight } from 'lucide-react';

const BREADCRUMB: Record<string, string> = {
  '/seller':          'Dashboard',
  '/seller/products': 'Products',
  '/seller/orders':   'Orders',
};

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

export default function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const currentPage = BREADCRUMB[pathname] ?? 'Seller';

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-4 lg:px-6 bg-white/90 backdrop-blur-md border-b border-slate-100">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <span>Seller</span>
        <ChevronRight size={12} />
        <span className="text-slate-700">{currentPage}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm relative hidden md:block">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search orders, products…"
          className="
            w-full bg-slate-50 border border-slate-200
            rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400
            focus:bg-white transition-all duration-150
          "
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Store status pill */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Store Live
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-extrabold shadow cursor-pointer select-none">
          S
        </div>
      </div>
    </header>
  );
}