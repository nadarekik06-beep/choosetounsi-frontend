"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, isAuthenticated, getUser, AuthUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Shop",       href: "/shop"       },
  { label: "Categories", href: "/categories" },
  { label: "Vendors",    href: "/vendors"    },
  { label: "Deals",      href: "/deals"      },
];

/* ── Deterministic colour from name ── */
const AVATAR_COLORS = [
  ["#fde68a", "#92400e"],
  ["#bfdbfe", "#1e40af"],
  ["#bbf7d0", "#14532d"],
  ["#fecaca", "#991b1b"],
  ["#e9d5ff", "#4c1d95"],
  ["#fed7aa", "#7c2d12"],
  ["#cffafe", "#164e63"],
  ["#fce7f3", "#831843"],
];

function avatarMeta(name: string): { initials: string; bg: string; fg: string } {
  const parts    = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const [bg, fg] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return { initials, bg, fg };
}

/**
 * Fix Google avatar URL — replace the tiny =s96-c suffix with =s200-c
 * so we get a bigger image that renders clearly in the circle.
 */
function fixGoogleAvatarUrl(url: string): string {
  // Google URLs end with =s96-c or =s96 — bump to s200 for crisp display
  return url.replace(/=s\d+-?c?$/, '=s200-c');
}

/* ── Avatar circle ── */
function Avatar({ user, size = 36 }: { user: AuthUser; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const { initials, bg, fg } = avatarMeta(user.name);

  const avatarUrl = user.avatar
    ? fixGoogleAvatarUrl(user.avatar)
    : null;

  if (avatarUrl && !imgErr) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={user.name}
        referrerPolicy="no-referrer"   /* CRITICAL — Google blocks requests without this */
        onError={() => setImgErr(true)}
        style={{
          width:        size,
          height:       size,
          borderRadius: "50%",
          objectFit:    "cover",
          flexShrink:   0,
          border:       "2px solid rgba(0,0,0,0.08)",
          display:      "block",
        }}
      />
    );
  }

  /* Fallback: coloured initials circle */
  return (
    <span
      style={{
        width:          size,
        height:         size,
        background:     bg,
        color:          fg,
        fontSize:       size * 0.38,
        borderRadius:   "50%",
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        fontWeight:     800,
        letterSpacing:  "-0.02em",
        flexShrink:     0,
        lineHeight:     1,
        border:         "2px solid rgba(0,0,0,0.06)",
      }}
    >
      {initials}
    </span>
  );
}

/* ── Role pill ── */
function RoleBadge({ role }: { role: AuthUser["role"] }) {
  const map: Record<string, string> = {
    seller: "bg-amber-100 text-amber-700",
    client: "bg-blue-100  text-blue-700",
    admin:  "bg-red-100   text-red-700",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${map[role] ?? map.client}`}>
      {role}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function Navbar() {
  const router = useRouter();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated()) setUser(getUser());
  }, []);

  const loggedIn = !!user;
  const isSeller = user?.role === "seller";

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    setUser(null);
    router.push("/auth/login");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="w-full bg-white border-b border-zinc-100 sticky top-0 z-50">

      {/* Announcement bar */}
      <div className="bg-zinc-950 text-white text-xs text-center py-2 tracking-widest uppercase font-medium">
        🇹🇳 Free delivery on orders over 50 DT — Tunisia&apos;s #1 marketplace
      </div>

      {/* ── Main row ── */}
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo.png" alt="ChooseTounsi Logo" className="w-16 h-16 object-contain" />
          <span className="text-zinc-950 font-black text-xl tracking-tight">
            Choose<span className="text-red-600">Tounsi</span>
          </span>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 mx-4">
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

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-6 shrink-0">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors tracking-wide">
              {l.label}
            </Link>
          ))}
        </div>

        {/* ── Far-right group: Dashboard · Cart · Account ── */}
        <div className="flex items-center gap-4 ml-auto shrink-0">

          {/* Seller dashboard shortcut */}
          {loggedIn && isSeller && (
            <Link href="/seller"
              className="hidden md:flex flex-col items-center text-zinc-500 hover:text-red-600 transition-colors group"
              title="Seller Dashboard">
              <DashboardIcon />
              <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">
                Dashboard
              </span>
            </Link>
          )}

          {/* Cart */}
          <button className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors group relative">
            <CartIcon />
            <span className="text-[10px] mt-0.5 font-medium tracking-wider group-hover:text-red-600">Cart</span>
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              0
            </span>
          </button>

          {/* ══ Account — AFTER cart, far right ══ */}
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-2 group focus:outline-none"
            >
              {loggedIn && user ? (
                <>
                  <Avatar user={user} size={36} />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-bold text-zinc-800 group-hover:text-red-600 transition-colors max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <RoleBadge role={user.role} />
                  </div>
                  <ChevronIcon open={dropdownOpen} />
                </>
              ) : (
                <div className="flex flex-col items-center text-zinc-600 hover:text-red-600 transition-colors">
                  <UserIcon />
                  <span className="text-[10px] mt-0.5 font-medium tracking-wider">Account</span>
                </div>
              )}
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-white border border-zinc-100 rounded-2xl shadow-2xl shadow-black/10 py-2 z-50 overflow-hidden">

                {loggedIn && user && (
                  <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
                    <Avatar user={user} size={42} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{user.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {!loggedIn && (
                  <>
                    <Link href="/auth/login" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                      <UserIcon /> Log In
                    </Link>
                    <Link href="/auth/register" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                      <RegisterIcon /> Register
                    </Link>
                  </>
                )}

                {loggedIn && (
                  <>
                    <Link href="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                      <UserIcon /> My Profile
                    </Link>
                    {isSeller && (
                      <Link href="/seller" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors">
                        <DashboardIcon /> Dashboard
                      </Link>
                    )}
                    <div className="my-1.5 border-t border-zinc-100" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                      <LogoutIcon /> Log Out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hamburger (mobile only) */}
          <button
            className="lg:hidden text-zinc-700 hover:text-zinc-950 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* ════ Mobile drawer ════ */}
      {menuOpen && (
        <div className="lg:hidden border-t border-zinc-100 bg-white px-6 py-4 flex flex-col gap-4">

          {loggedIn && user && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <Avatar user={user} size={44} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{user.name}</p>
                <p className="text-xs text-zinc-400 truncate mb-1">{user.email}</p>
                <RoleBadge role={user.role} />
              </div>
            </div>
          )}

          <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
            <input type="text" placeholder="Search..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-zinc-800 placeholder:text-zinc-400" />
            <button className="bg-red-600 px-4 text-white"><SearchIcon /></button>
          </div>

          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-zinc-800 hover:text-red-600 transition-colors py-1 border-b border-zinc-50 tracking-wide">
              {l.label}
            </Link>
          ))}

          {!loggedIn && (
            <>
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">Log In</Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">Register</Link>
            </>
          )}

          {loggedIn && isSeller && (
            <Link href="/seller" onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-zinc-800 hover:text-red-600 py-1 border-b border-zinc-50">
              Dashboard
            </Link>
          )}

          {loggedIn && (
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3 rounded-xl transition-colors">
              <LogoutIcon /> Log Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */
function SearchIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function UserIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function DashboardIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function CartIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>;
}
function MenuIcon() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
}
function CloseIcon() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function RegisterIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
}
function ChevronIcon({ open }: { open: boolean }) {
  return <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}><path d="M6 9l6 6 6-6"/></svg>;
}