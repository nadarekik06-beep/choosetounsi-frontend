'use client'

import Link from 'next/link'

const FEATURES = [
  {
    title: 'Free Shipping',
    description: 'On all orders over 50 DT',
    href: '/shipping',
    accent: 'red',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    title: 'Verified Vendors',
    description: 'Every seller is reviewed & approved',
    href: '/sellers',
    accent: 'green',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  {
    title: '100% Local',
    description: 'Proudly made & sold in Tunisia 🇹🇳',
    href: '/about',
    accent: 'yellow',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    title: 'Secure Payment',
    description: 'Your transactions are always safe',
    href: '/security',
    accent: 'dark',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
]

const ACCENT: Record<string, { ring: string; icon: string; shadow: string; hover: string }> = {
  red:    { ring: '#fee2e2', icon: '#dc2626', shadow: 'rgba(220,38,38,0.12)',  hover: '#dc2626' },
  green:  { ring: '#dcfce7', icon: '#16a34a', shadow: 'rgba(22,163,74,0.12)',  hover: '#16a34a' },
  yellow: { ring: '#fef9c3', icon: '#b45309', shadow: 'rgba(180,83,9,0.10)',   hover: '#b45309' },
  dark:   { ring: '#f4f4f5', icon: '#18181b', shadow: 'rgba(24,24,27,0.08)',   hover: '#18181b' },
}

export default function HomeTrustBadges() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');
        @keyframes featFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:1024px){.feat-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:540px){.feat-grid{grid-template-columns:1fr}}
        .feat-card{position:relative;display:flex;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #e6e6e6;text-decoration:none;overflow:hidden;animation:featFadeUp .42s ease both;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;will-change:transform}
        .feat-card:nth-child(1){animation-delay:.05s}
        .feat-card:nth-child(2){animation-delay:.11s}
        .feat-card:nth-child(3){animation-delay:.17s}
        .feat-card:nth-child(4){animation-delay:.23s}
        .feat-card:hover{transform:translateY(-4px);border-color:#d4d4d4}
        .feat-icon{flex-shrink:0;width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;transition:transform .28s ease}
        .feat-card:hover .feat-icon{transform:scale(1.1) rotate(-4deg)}
        .feat-body{min-width:0;flex:1}
        .feat-title{font-family:'Barlow',sans-serif;font-size:.86rem;font-weight:800;color:#111;margin:0 0 2px;line-height:1.2;letter-spacing:-.01em;transition:color .18s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .feat-desc{font-family:'Barlow',sans-serif;font-size:.7rem;font-weight:500;color:#888;margin:0;line-height:1.4}
        .feat-chevron{flex-shrink:0;margin-left:auto;color:#ccc;opacity:0;transform:translateX(-5px);transition:opacity .2s ease,transform .2s ease}
        .feat-card:hover .feat-chevron{opacity:1;transform:translateX(0)}
        .feat-dot{position:absolute;right:-18px;top:-18px;width:68px;height:68px;border-radius:50%;opacity:.07;pointer-events:none;transition:opacity .3s ease,transform .3s ease}
        .feat-card:hover .feat-dot{opacity:.14;transform:scale(1.15)}
      `}</style>

      <div style={{ background: '#f0f0f0', padding: '16px 0 20px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="feat-grid">
            {FEATURES.map((feat) => {
              const a = ACCENT[feat.accent]
              return (
                <Link key={feat.title} href={feat.href} className="feat-card">
                  <style>{`
                    .feat-card[href="${feat.href}"]:hover{box-shadow:0 14px 36px ${a.shadow},0 2px 8px rgba(0,0,0,.04)}
                    .feat-card[href="${feat.href}"]:hover .feat-title{color:${a.hover}}
                    .feat-card[href="${feat.href}"]:hover .feat-chevron{color:${a.hover}}
                  `}</style>
                  <div className="feat-dot" style={{ background: a.icon }} />
                  <div className="feat-icon" style={{ background: a.ring, color: a.icon }}>{feat.icon}</div>
                  <div className="feat-body">
                    <p className="feat-title">{feat.title}</p>
                    <p className="feat-desc">{feat.description}</p>
                  </div>
                  <div className="feat-chevron">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}