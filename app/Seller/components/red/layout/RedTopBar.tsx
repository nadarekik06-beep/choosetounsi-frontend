'use client';
import { usePathname } from 'next/navigation';
import { Bell, TrendingUp, ShoppingBag, Star } from 'lucide-react';
import { getUser } from '@/lib/auth';

const TITLES: Record<string, string> = {
  '/seller/dashboard/red':                 'Overview',
  '/seller/dashboard/red/analytics':       'Analytics',
  '/seller/dashboard/red/products':        'Products',
  '/seller/dashboard/red/ai-tools':        'AI Tools',
  '/seller/dashboard/red/recommendations': 'Recommendations',
};

export default function RedTopBar() {
  const pathname = usePathname();
  const user = getUser();
  const title = TITLES[pathname] ?? 'Red Pepper Dashboard';

  return (
    <div
      style={{
        height: 64,
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 12,
            color: '#2ecc71',
            fontWeight: 600,
          }}
        >
          <TrendingUp size={12} />
          <span>+23.4%</span>
          <span style={{ color: 'var(--text2)', fontWeight: 400 }}>this month</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 12,
            color: 'var(--text2)',
            fontWeight: 500,
          }}
        >
          <ShoppingBag size={12} />
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>4</span>
          <span>pending</span>
        </div>

        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text2)',
            position: 'relative',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-red)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)')}
        >
          <Bell size={15} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              background: 'var(--red-light)',
              borderRadius: '50%',
              border: '1.5px solid var(--surface2)',
            }}
          />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px 5px 5px',
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--red-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {user?.name?.slice(0, 2).toUpperCase() ?? 'SE'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {user?.name?.split(' ')[0] ?? 'Seller'}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--red-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Star size={9} fill="currentColor" />
              Red Pepper
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}