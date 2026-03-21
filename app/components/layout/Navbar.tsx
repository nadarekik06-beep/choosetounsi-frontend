"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated, getUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "Vendors", href: "/vendors" },
  { label: "Deals", href: "/deals" },
];

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const authenticated = isAuthenticated();
    setLoggedIn(authenticated);
    if (authenticated) {
      const user = getUser();
      setIsSeller(user?.role === "seller");
    }
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    setLoggedIn(false);
    setIsSeller(false);
    router.push("/auth/login");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-50">
      <div className="bg-zinc-950 text-white text-xs text-center py-2 tracking-widest uppercase font-medium">
        🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace
      </div>

      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo.png" alt="ChooseTounsi Logo" className="w-20 h-20 object-contain" />
          <span className="text-zinc-950 font-black text-xl tracking-tight">
            Choose<span className="text-red-600">Tounsi</span>
          </span>
        </Link>

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

        <div className="flex items-center gap-5">
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

          <div className="flex items-center gap-3">
            {/* Seller Dashboard Icon */}
            {loggedIn && isSeller && (
              <Link
                href="/seller"
                className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group hidden md:flex"
                title="Seller Dashboard"
              >
                <DashboardIcon />
                <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                  Dashboard
                </span>
              </Link>
            )}

            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <UserIcon />
                <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                  Account
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-48 bg-white border border-zinc-100 rounded-lg shadow-xl py-1.5 z-50">
                  {!loggedIn && (
                    <>
                      <Link
                        href="/auth/login"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                      >
                        <UserIcon />
                        Log In
                      </Link>
                      <Link
                        href="/auth/register"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                      >
                        <RegisterIcon />
                        Register
                      </Link>
                    </>
                  )}

                  {loggedIn && (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                      >
                        <UserIcon />
                        My Profile
                      </Link>
                      {isSeller && (
                        <Link
                          href="/seller"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                        >
                          <DashboardIcon />
                          Dashboard
                        </Link>
                      )}
                      <div className="my-1 border-t border-zinc-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogoutIcon />
                        Log Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group relative">
              <CartIcon />
              <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">Cart</span>
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">0</span>
            </button>

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

      {menuOpen && (
        <div className="lg:hidden border-t border-zinc-100 bg-white px-6 py-4 flex flex-col gap-4 animate-fade-in">
          <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400"
            />
            <button className="bg-red-600 px-4 text-white"><SearchIcon /></button>
          </div>

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

          {!loggedIn && (
            <>
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50">Log In</Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50">Register</Link>
            </>
          )}

          {loggedIn && isSeller && (
            <Link href="/seller" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50">
              Dashboard
            </Link>
          )}

          {loggedIn && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3 rounded-md transition-colors"
            >
              <LogoutIcon />
              Log Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
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
function LogoutIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function RegisterIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}