'use client';
// app/seller/components/Topbar.tsx
// FULL REPLACEMENT — NotificationBell integrated

import { useState, useEffect } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';
import { useTheme } from '../layout';
import NotificationBell from '@/app/components/NotificationBell';
import { sellerNotificationApi } from '@/lib/notificationApi';

const AVATAR_COLORS = [
  ['#fde68a', '#92400e'], ['#bfdbfe', '#1e40af'], ['#bbf7d0', '#14532d'],
  ['#fecaca', '#991b1b'], ['#e9d5ff', '#4c1d95'], ['#fed7aa', '#7c2d12'],
];

function avatarMeta(name: string) {
  const p       = name.trim().split(/\s+/);
  const initials = p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [bg, fg] = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return { initials, bg, fg };
}

function fixGoogle(url: string) {
  return url.replace(/=s\d+-?c?$/, '=s200-c');
}

export default function Topbar({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const { dark, toggle } = useTheme();
  const router           = useRouter();
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  const bg        = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const today     = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const { initials, bg: aBg, fg: aFg } = user
    ? avatarMeta(user.name)
    : { initials: '?', bg: '#eee', fg: '#999' };

  const avatarSrc = user?.avatar && !imgErr ? fixGoogle(user.avatar) : null;

  return (
    <header style={{
      height: 64, background: bg,
      borderBottom: `1px solid ${border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 12,
      position: 'sticky', top: 0, zIndex: 20,
      transition: 'background 0.3s ease',
    }}>
      {/* hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 4 }}
      >
        <Menu size={20} />
      </button>

      {/* title + date */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: textMain, margin: 0, lineHeight: 1.2 }}>
          Dashboard
        </h2>
        <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{today}</p>
      </div>

      {/* right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* dark/light */}
        <button
          onClick={toggle}
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: dark ? 'rgba(255,255,255,0.07)' : '#f0f2f5',
            border: `1px solid ${border}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: dark ? '#f59e0b' : '#6366f1', transition: 'all 0.2s ease',
          }}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* ── NOTIFICATION BELL ── */}
        <NotificationBell
          api={sellerNotificationApi}
          dark={dark}
          onNavigate={router.push}
          pollInterval={30_000}
        />

        {/* divider */}
        <div style={{ width: 1, height: 28, background: border }} />

        {/* user pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px 6px 6px', borderRadius: 12,
          background: dark ? 'rgba(255,255,255,0.05)' : '#f0f2f5',
          border: `1px solid ${border}`, cursor: 'pointer',
        }}>
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc} alt={user?.name}
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: aBg, color: aFg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {initials}
            </span>
          )}
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: textMain, margin: 0 }}>
              {user?.name?.split(' ')[0] ?? 'Seller'}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#198f41', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user?.role ?? 'seller'}
            </p>
          </div>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#198f41',
            boxShadow: '0 0 0 2px rgba(25,143,65,0.3)',
            animation: 'pulse-green 2s infinite',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0%,100% { box-shadow: 0 0 0 2px rgba(25,143,65,0.3); }
          50%      { box-shadow: 0 0 0 5px rgba(25,143,65,0.1); }
        }
      `}</style>
    </header>
  );
}