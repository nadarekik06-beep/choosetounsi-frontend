'use client';
import { useEffect, useState } from 'react';
import KPIGrid from '@/app/seller/components/red/overview/KPIGrid';
import RevenueChart from '@/app/seller/components/red/overview/RevenueChart';
import CategoryChart from '@/app/seller/components/red/overview/CategoryChart';
import TopProductsTable from '@/app/seller/components/red/overview/TopProductsTable';
import { getUser } from '@/lib/auth';
import { dashboardApi } from '@/lib/sellerApi';
import type { DashboardData } from '@/types/seller';

export default function RedOverviewPage() {
  const user = getUser();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardApi.getOverview()
      .then(res => setData(res.data))
      .catch(console.error);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // ── Derived from real data ─────────────────────────────────────────────────

  // Order status distribution from backend
  const orderStatusEntries = data
    ? Object.entries(data.order_status_distribution)
    : [];
  const totalOrders = orderStatusEntries.reduce((sum, [, count]) => sum + count, 0);

  const STATUS_COLORS: Record<string, string> = {
    completed:  '#2ecc71',
    processing: '#3498db',
    pending:    '#f39c12',
    cancelled:  '#e74c3c',
    delivered:  '#1abc9c',
    refunded:   '#a855f7',
  };

  // Last 7 days of monthly data used as "this week" proxy
  // monthly_revenue gives us month-level data; we use the last 7 entries
  // and label them by their month string until a weekly endpoint exists
  const weeklyData = data
    ? data.charts.monthly_revenue.slice(-7)
    : [];
  const weeklyMax = weeklyData.length
    ? Math.max(...weeklyData.map(d => d.orders), 1)
    : 1;

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.5px',
            margin: 0,
          }}
        >
          {greeting}, {user?.name?.split(' ')[0] ?? 'Seller'} 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Your store is performing{' '}
          <span style={{ color: 'var(--red-light)', fontWeight: 600 }}>above average</span> this week.
        </p>
      </div>

      {/* KPIs */}
      <KPIGrid />

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <RevenueChart />
        <CategoryChart />
      </div>

      {/* Orders summary + top products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* ── Weekly orders card — real data ── */}
        <div className="red-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
            Recent Months
          </div>
          {!data ? (
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>Loading…</p>
          ) : weeklyData.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>No order data yet.</p>
          ) : (
            weeklyData.map(({ month, orders }) => (
              <div key={month} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--text2)',
                    marginBottom: 3,
                  }}
                >
                  <span>{month}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{orders} orders</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(orders / weeklyMax) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Order status card — real data ── */}
        <div className="red-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
            Order Status
          </div>
          {!data ? (
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>Loading…</p>
          ) : orderStatusEntries.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>No orders yet.</p>
          ) : (
            orderStatusEntries.map(([status, count]) => {
              const color = STATUS_COLORS[status.toLowerCase()] ?? '#888888';
              return (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 80, background: 'var(--surface4)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: color,
                          borderRadius: 4,
                          width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text)',
                        minWidth: 28,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      <TopProductsTable />
    </div>
  );
}