"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "Vendors", href: "/vendors" },
  { label: "Deals", href: "/deals" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-zinc-950 text-white text-xs text-center py-2 tracking-widest uppercase font-medium">
        🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 tracking-tight">
            CT
          </span>
          <span className="text-zinc-950 font-black text-xl tracking-tight">
            Choose<span className="text-red-600">Tounsi</span>
          </span>
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden md:flex flex-1 mx-10">
          <div className="flex w-full max-w-xl border border-zinc-200 rounded-sm overflow-hidden hover:border-zinc-400 transition-colors">
            <input
              type="text"
              placeholder="Search products, brands, vendors..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400"
            />
            <button className="bg-red-600 hover:bg-red-700 transition-colors px-5 text-white">
              <SearchIcon />
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-5">
          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-3">
            <button className="hidden md:flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group">
              <UserIcon />
              <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                Account
              </span>
            </button>

            <button className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group relative">
              <CartIcon />
              <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                Cart
              </span>
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                0
              </span>
            </button>

            {/* Hamburger — mobile */}
            <button
              className="lg:hidden ml-2 text-zinc-700 hover:text-zinc-950 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-zinc-100 bg-white px-6 py-4 flex flex-col gap-4 animate-fade-in">
          {/* Mobile search */}
          <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400"
            />
            <button className="bg-red-600 px-4 text-white">
              <SearchIcon />
            </button>
          </div>

          {/* Mobile links */}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50 tracking-wide"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/account"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1"
          >
            My Account
          </Link>
        </div>
      )}
    </header>
  );
}

/* ─── SVG Icons ─── */
function SearchIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}