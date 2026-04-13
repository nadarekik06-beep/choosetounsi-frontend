'use client';
import MonthlyRevenueChart from '@/app/seller/components/red/analytics/MonthlyRevenueChart';
import SalesForecastChart  from '@/app/seller/components/red/analytics/SalesForecastChart';
import PaymentMethodChart  from '@/app/seller/components/red/analytics/PaymentMethodChart';

const METRICS = [
  { label: 'Conversion Rate', value: '3.8%',    change: '+0.6% this month', color: '#c0392b' },
  { label: 'Return Rate',     value: '2.1%',    change: '▼ down from 3.4%',  color: '#27ae60' },
  { label: 'Repeat Buyers',   value: '31%',     change: '▲ 7% vs last mo.',  color: '#f39c12' },
  { label: 'Avg Ship Time',   value: '1.4 days', change: '▼ faster than avg', color: '#3498db' },
];

export default function AnalyticsPage() {
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Deep dive into your store performance metrics</p>
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {METRICS.map(({ label, value, change, color }) => (
          <div key={label} className="kpi-card">
            <div
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: 2,
                background: `linear-gradient(90deg, ${color}, transparent)`,
                borderRadius: '0 0 14px 14px',
                opacity: 0.7,
              }}
            />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color, fontWeight: 500 }}>{change}</div>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div style={{ marginBottom: 14 }}>
        <MonthlyRevenueChart />
      </div>

      {/* Forecast + Payment side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <SalesForecastChart />
        <PaymentMethodChart />
      </div>

      {/* Top wilayas */}
      <div className="red-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
          Revenue by Wilaya
        </div>
        {[
          { wilaya: 'Sfax',    revenue: 1240, pct: 32 },
          { wilaya: 'Tunis',   revenue: 980,  pct: 25 },
          { wilaya: 'Sousse',  revenue: 760,  pct: 20 },
          { wilaya: 'Nabeul',  revenue: 560,  pct: 15 },
          { wilaya: 'Bizerte', revenue: 300,  pct: 8  },
        ].map(({ wilaya, revenue, pct }) => (
          <div key={wilaya} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{wilaya}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{revenue} DT · {pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}