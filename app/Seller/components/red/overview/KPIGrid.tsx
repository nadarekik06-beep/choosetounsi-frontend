'use client';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, Star } from 'lucide-react';

interface KPI {
  label: string;
  value: string;
  change: number;
  accent: string;
  icon: React.ElementType;
  sub?: string;
}

const KPIS: KPI[] = [
  { label: 'Total Revenue',    value: '3,840 DT', change: 23.4,  accent: '#c0392b', icon: DollarSign,  sub: 'Completed & paid' },
  { label: 'Orders Completed', value: '147',      change: 18.1,  accent: '#27ae60', icon: ShoppingBag, sub: '4 pending today'   },
  { label: 'Avg Order Value',  value: '26.1 DT',  change: 4.3,   accent: '#f39c12', icon: Package,     sub: 'vs 25.0 last mo.'  },
  { label: 'Store Rating',     value: '4.87',     change: 2.1,   accent: '#3498db', icon: Star,        sub: '+12 reviews'       },
];

export default function KPIGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
      {KPIS.map(({ label, value, change, accent, icon: Icon, sub }) => (
        <div key={label} className="kpi-card">
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: accent,
              opacity: 0.07,
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              borderRadius: '0 0 14px 14px',
              opacity: 0.6,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${accent}18`,
                border: `1px solid ${accent}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent,
                flexShrink: 0,
              }}
            >
              <Icon size={18} />
            </div>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11,
                fontWeight: 700,
                color: change >= 0 ? '#2ecc71' : '#e74c3c',
                background: change >= 0 ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                padding: '3px 7px',
                borderRadius: 999,
              }}
            >
              {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.8px',
              lineHeight: 1,
              marginBottom: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>
            {label}
          </div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}