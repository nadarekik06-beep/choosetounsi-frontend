'use client';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const PRODUCTS = [
  { name: 'Casque Bluetooth XL3', category: 'Electronics', units: 34, revenue: 884,  trend: 'up',     pct: 12 },
  { name: 'T-shirt Medina Print', category: 'Clothing',    units: 28, revenue: 504,  trend: 'up',     pct: 8  },
  { name: 'Harissa Artisanale',   category: 'Food',        units: 21, revenue: 294,  trend: 'stable', pct: 0  },
  { name: 'Lampe LED Solaire',    category: 'Electronics', units: 14, revenue: 238,  trend: 'down',   pct: 8  },
];

export default function TopProductsTable() {
  return (
    <div className="red-card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Top Products</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Ranked by units sold this week</div>
        </div>
        <Link
          href="/seller/dashboard/red/products"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--red-light)',
            textDecoration: 'none',
          }}
        >
          View all <ArrowUpRight size={12} />
        </Link>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}>Units</th>
            <th style={{ textAlign: 'right' }}>Revenue</th>
            <th style={{ textAlign: 'center' }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCTS.map(({ name, category, units, revenue, trend, pct }) => (
            <tr key={name}>
              <td>
                <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{name}</span>
              </td>
              <td style={{ fontSize: 12 }}>{category}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {units}
              </td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  color: '#2ecc71',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {revenue} DT
              </td>
              <td style={{ textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background:
                      trend === 'up'
                        ? 'rgba(46,204,113,0.12)'
                        : trend === 'down'
                        ? 'rgba(231,76,60,0.12)'
                        : 'rgba(243,156,18,0.12)',
                    color:
                      trend === 'up'
                        ? '#2ecc71'
                        : trend === 'down'
                        ? '#e74c3c'
                        : '#f39c12',
                  }}
                >
                  {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '→'}{' '}
                  {pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : 'Stable'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}