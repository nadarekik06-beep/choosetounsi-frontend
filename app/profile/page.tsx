'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated, logout, AuthUser } from '@/lib/auth';

/* ── palette ──────────────────────────────────────────────── */
const RED   = '#db142e';
const GREEN = '#198f41';

/* ── avatar helpers ─────────────────────────────────────────── */
const COLORS = [
  ['#fde68a','#92400e'],['#bfdbfe','#1e40af'],['#bbf7d0','#14532d'],
  ['#fecaca','#991b1b'],['#e9d5ff','#4c1d95'],['#fed7aa','#7c2d12'],
];
function avatarMeta(name: string) {
  const p = name.trim().split(/\s+/);
  const initials = p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
  let h = 0; for (let i=0;i<name.length;i++) h = name.charCodeAt(i)+((h<<5)-h);
  const [bg,fg] = COLORS[Math.abs(h)%COLORS.length];
  return { initials, bg, fg };
}
function fixGoogle(url: string) { return url.replace(/=s\d+-?c?$/,'=s200-c'); }

/* ── Clickable avatar with upload overlay ─────────────────── */
function BigAvatar({ user, onUpload }: { user: AuthUser; onUpload: (file: File) => void }) {
  const [err,       setErr]      = useState(false);
  const [preview,   setPreview]  = useState<string | null>(null);
  const [uploading, setUploading]= useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { initials, bg, fg }    = avatarMeta(user.name);
  const src = preview ?? (user.avatar && !err ? fixGoogle(user.avatar) : null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    onUpload(file);
    setTimeout(() => setUploading(false), 1500);
  };

  return (
    <div className="avatar-wrap" onClick={() => inputRef.current?.click()} title="Change profile photo">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={user.name} referrerPolicy="no-referrer"
          onError={() => setErr(true)} className="avatar-img" />
      ) : (
        <span className="avatar-img avatar-initials" style={{ background: bg, color: fg }}>
          {initials}
        </span>
      )}
      <div className="avatar-overlay">
        {uploading
          ? <div className="upload-spinner" />
          : <><CameraIcon /><span>Change</span></>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ── stat card ──────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      <div className="stat-bar" style={{ background: color }} />
    </div>
  );
}

/* ── menu item ──────────────────────────────────────────────── */
function MenuItem({ icon, label, badge, href, danger, onClick }: {
  icon: React.ReactNode; label: string; badge?: string;
  href?: string; danger?: boolean; onClick?: () => void;
}) {
  const cls = `menu-item${danger ? ' danger' : ''}`;
  const inner = (
    <>
      <span className="menu-icon">{icon}</span>
      <span className="menu-label">{label}</span>
      {badge && <span className="menu-badge">{badge}</span>}
      <span className="menu-arrow"><ArrowRight /></span>
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

/* ═══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [visible, setVisible] = useState(false);
  const [toast,   setToast]   = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/auth/login'); return; }
    setUser(getUser());
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleUpload = (_file: File) => {
    setToast('Profile photo updated!');
    setTimeout(() => setToast(''), 3000);
  };

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" />
    </div>
  );

  const isSeller = user.role === 'seller';

  const MENU_SECTIONS = [
    {
      title: 'My Orders',
      items: [
        { icon: <OrderIcon />,     label: 'My Orders',          href: '/orders'              },
        { icon: <ComplaintIcon />, label: 'My Complaints',      href: '/complaints'          },
        { icon: <HeartIcon />,     label: 'Wishlist',           href: '/wishlist'            },
        { icon: <ReturnIcon />,    label: 'Returns & Refunds',  href: '/returns'             },
        { icon: <ReviewIcon />,    label: 'My Reviews',         href: '/reviews'             },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: <EditIcon />,      label: 'Edit Profile',       href: '/profile/edit'        },
        { icon: <LockIcon />,      label: 'Change Password',    href: '/profile/password'    },
        // ── NEW: Address Book entry ────────────────────────────────────────────
        { icon: <AddressIcon />,   label: 'Address Book',       href: '/account/addresses'   },
        { icon: <BellIcon />,      label: 'Notifications',      href: '/notifications', badge: '3' },
        { icon: <ShieldIcon />,    label: 'Privacy & Security', href: '/profile/security'    },
      ],
    },
    ...(isSeller ? [{
      title: 'Seller Hub',
      items: [
        { icon: <StoreIcon />,   label: 'My Store',       href: '/seller'            },
        { icon: <ProductIcon />, label: 'My Products',        href: '/seller/products'   },
        { icon: <SalesIcon />,   label: 'Sales & Orders',     href: '/seller/orders'     },
      ],
    }] : [{
      title: 'Become a Seller',
      items: [
        { icon: <StoreIcon />,   label: 'Open Your Store',    href: '/?vendor=1'         },
      ],
    }]),
    {
      title: '',
      items: [
        { icon: <SupportIcon />,   label: 'Help & Support',   href: '/support'           },
        { icon: <LogoutIconSVG />, label: 'Sign Out', danger: true, onClick: handleLogout },
      ],
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap');
        :root { --red: ${RED}; --green: ${GREEN}; }

        .profile-root {
          min-height: 100vh;
          background: #f0f0f0;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── hero ── */
        .hero {
          background: linear-gradient(135deg,#0d0d0d 0%,#1a1a1a 60%,#2a0a0f 100%);
          padding: 28px 0 80px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 80% at 80% 50%, rgba(219,20,46,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 60px;
          background: #f0f0f0;
          clip-path: ellipse(55% 100% at 50% 100%);
        }

        .hero-inner {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.5);
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 24px;
          transition: color 0.15s ease;
        }
        .back-link:hover { color: #fff; }

        .hero-profile {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .avatar-wrap {
          position: relative;
          width: 96px; height: 96px;
          border-radius: 50%;
          cursor: pointer;
          flex-shrink: 0;
        }
        .avatar-img {
          width: 96px; height: 96px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 0 0 4px #fff, 0 8px 24px rgba(0,0,0,0.4);
          display: block;
        }
        .avatar-initials {
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 800; letter-spacing: -0.02em;
        }
        .avatar-overlay {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 4px;
          color: #fff;
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
          opacity: 0;
          transition: opacity 0.2s ease;
          backdrop-filter: blur(2px);
        }
        .avatar-wrap:hover .avatar-overlay { opacity: 1; }

        .upload-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .hero-text h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.6rem,4vw,2.2rem);
          color: #fff; margin: 0 0 4px; line-height: 1.15;
        }
        .hero-text p {
          color: rgba(255,255,255,0.5);
          font-size: 0.82rem; margin: 0 0 10px;
        }
        .role-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 999px;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .role-chip.seller { background:rgba(219,20,46,0.18); color:#ff6b80; border:1px solid rgba(219,20,46,0.35); }
        .role-chip.client { background:rgba(25,143,65,0.18);  color:#4dbb78; border:1px solid rgba(25,143,65,0.35); }
        .role-chip.admin  { background:rgba(219,20,46,0.18); color:#ff6b80; border:1px solid rgba(219,20,46,0.35); }

        .body {
          max-width: 780px;
          margin: -44px auto 0;
          padding: 0 16px 48px;
          position: relative; z-index: 2;
          display: flex; flex-direction: column; gap: 16px;
        }

        .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .stat-card {
          background: #fff; border-radius: 16px;
          padding: 18px 14px 14px; text-align: center;
          position: relative; overflow: hidden;
          border: 1.5px solid #ebebeb;
          transition: transform 0.22s ease, box-shadow 0.22s ease; cursor: default;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .stat-icon  { font-size: 1.4rem; margin-bottom: 6px; }
        .stat-value { font-size: 1.35rem; font-weight: 800; color: #111; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 0.68rem; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0.7;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.5s ease 0.2s;
        }
        .stat-card:hover .stat-bar { transform: scaleX(1); }

        .section-card {
          background: #fff; border-radius: 20px;
          overflow: hidden; border: 1.5px solid #ebebeb;
        }
        .section-title {
          padding: 14px 20px 10px;
          font-size: 0.7rem; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #bbb; border-bottom: 1px solid #f4f4f4;
        }

        .menu-item {
          width: 100%; display: flex; align-items: center; gap: 14px;
          padding: 15px 20px; text-align: left;
          border: none; background: transparent; cursor: pointer;
          text-decoration: none; color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 600;
          border-bottom: 1px solid #f7f7f7;
          transition: background 0.15s ease, padding-left 0.18s ease;
        }
        .menu-item:last-child  { border-bottom: none; }
        .menu-item:hover       { background: #fafafa; padding-left: 26px; }
        .menu-item.danger      { color: var(--red); }
        .menu-item.danger:hover{ background: #fff5f6; }

        .menu-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #f5f5f5; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; color: #555;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .menu-item:hover .menu-icon        { background: #ffeaed; color: var(--red); }
        .menu-item.danger .menu-icon       { color: var(--red); }
        .menu-item.danger:hover .menu-icon { background: #ffeaed; }

        .menu-label { flex: 1; }
        .menu-badge {
          background: var(--red); color: #fff;
          font-size: 0.65rem; font-weight: 800;
          padding: 2px 7px; border-radius: 999px; min-width: 20px; text-align: center;
        }
        .menu-arrow {
          color: #ccc; display: flex; align-items: center;
          transition: color 0.15s ease, transform 0.18s ease;
        }
        .menu-item:hover .menu-arrow { color: var(--red); transform: translateX(3px); }

        .verified-bar {
          background: linear-gradient(135deg,#e6f9ee,#f0fff6);
          border: 1.5px solid #b7eccc; border-radius: 14px;
          padding: 14px 18px; display: flex; align-items: center; gap: 12px;
        }
        .v-icon {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--green);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .verified-bar h4 { font-size: 0.82rem; font-weight: 800; color: #0f5c28; margin: 0 0 2px; }
        .verified-bar p  { font-size: 0.72rem; color: #2d8a52; margin: 0; }

        .toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: #111; color: #fff;
          padding: 10px 22px; border-radius: 999px;
          font-size: 0.82rem; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.25);
          animation: toastIn 0.3s ease;
          z-index: 9999;
        }
        @keyframes toastIn {
          from { opacity:0; transform: translateX(-50%) translateY(10px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }

        .fade-in {
          opacity: 0; transform: translateY(18px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .fade-in.show              { opacity: 1; transform: translateY(0); }
        .fade-in:nth-child(1)      { transition-delay: 0.05s; }
        .fade-in:nth-child(2)      { transition-delay: 0.12s; }
        .fade-in:nth-child(3)      { transition-delay: 0.19s; }
        .fade-in:nth-child(4)      { transition-delay: 0.26s; }
        .fade-in:nth-child(5)      { transition-delay: 0.33s; }
        .fade-in:nth-child(6)      { transition-delay: 0.40s; }

        .spinner {
          width:36px; height:36px;
          border:3px solid #eee; border-top-color:var(--red);
          border-radius:50%; animation:spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="profile-root">

        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-inner">
            <Link href="/" className="back-link">← Back to Homepage</Link>
            <div className="hero-profile">
              <BigAvatar user={user} onUpload={handleUpload} />
              <div className="hero-text">
                <h1>{user.name}</h1>
                <p>{user.email}</p>
                <span className={`role-chip ${user.role}`}>
                  {user.role === 'seller' ? '🏪' : user.role === 'admin' ? '🛡️' : '🛍️'} {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="body">

          <div className={`stats-row fade-in ${visible ? 'show' : ''}`}>
            <StatCard icon="🛍️" label="Orders"   value="0" color={RED}     />
            <StatCard icon="⭐"  label="Reviews"  value="0" color="#f59e0b" />
            <StatCard icon="❤️"  label="Wishlist" value="0" color="#ec4899" />
          </div>

          <div className={`verified-bar fade-in ${visible ? 'show' : ''}`}>
            <div className="v-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <h4>Verified Account</h4>
              <p>Your identity has been confirmed</p>
            </div>
          </div>

          {MENU_SECTIONS.map((sec, si) => (
            <div key={si} className={`section-card fade-in ${visible ? 'show' : ''}`}>
              {sec.title && <div className="section-title">{sec.title}</div>}
              {sec.items.map((item, ii) => (
                <MenuItem key={ii} {...item} />
              ))}
            </div>
          ))}

        </div>
      </div>

      {toast && (
        <div className="toast">
          <svg width="14" height="14" fill="none" stroke={GREEN} strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          {toast}
        </div>
      )}
    </>
  );
}

/* ─── SVG Icons ──────────────────────────────────────────── */
function CameraIcon()    { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function ArrowRight()    { return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>; }
function OrderIcon()     { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>; }
function HeartIcon()     { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function ReturnIcon()    { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>; }
function ReviewIcon()    { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function EditIcon()      { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function LockIcon()      { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function BellIcon()      { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function ShieldIcon()    { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function StoreIcon()     { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function ProductIcon()   { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>; }
function SalesIcon()     { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>; }
function SupportIcon()   { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function LogoutIconSVG() { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function ComplaintIcon() { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
// NEW: Address Book icon
function AddressIcon()   { return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }