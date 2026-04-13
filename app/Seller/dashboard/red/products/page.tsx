'use client';
import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, Layers } from 'lucide-react';

const PRODUCTS = [
  { id: 1, name: 'Casque Bluetooth XL3',  category: 'Electronics', price: 26,  stock: 42, sales: 134, revenue: 3484, aiScore: 94, status: 'Active',       approved: true  },
  { id: 2, name: 'T-shirt Medina Print',  category: 'Clothing',    price: 18,  stock: 89, sales: 98,  revenue: 1764, aiScore: 78, status: 'Active',       approved: true  },
  { id: 3, name: 'Harissa Artisanale',    category: 'Food',        price: 14,  stock: 156,sales: 73,  revenue: 1022, aiScore: 71, status: 'Active',       approved: true  },
  { id: 4, name: 'Lampe LED Solaire',     category: 'Electronics', price: 17,  stock: 12, sales: 41,  revenue: 697,  aiScore: 55, status: 'Low Stock',    approved: true  },
  { id: 5, name: 'Jebba Homme Classique', category: 'Clothing',    price: 45,  stock: 0,  sales: 22,  revenue: 990,  aiScore: 43, status: 'Out of Stock', approved: false },
];

export default function RedProductsPage() {
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const scoreColor = (s: number) => s >= 80 ? '#2ecc71' : s >= 60 ? '#f39c12' : '#888';
  const statusStyle = (status: string): React.CSSProperties => ({
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    background:
      status === 'Active' ? 'rgba(46,204,113,0.12)' :
      status === 'Low Stock' ? 'rgba(243,156,18,0.12)' :
      'rgba(231,76,60,0.12)',
    color:
      status === 'Active' ? '#2ecc71' :
      status === 'Low Stock' ? '#f39c12' :
      '#e74c3c',
  });

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
          Products
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Enhanced product management with AI Score</p>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Products', value: '5',    color: '#c0392b' },
          { label: 'Active',         value: '3',    color: '#27ae60' },
          { label: 'Low / Out',      value: '2',    color: '#f39c12' },
          { label: 'Avg AI Score',   value: '68.2', color: '#3498db' },
        ].map(({ label, value, color }) => (
          <div key={label} className="red-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 14,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            className="red-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select className="red-select" style={{ width: 160 }}>
          <option>All categories</option>
          <option>Electronics</option>
          <option>Clothing</option>
          <option>Food</option>
        </select>
        <a href="/seller/products/new">
          <button className="red-btn"><Plus size={14} /> Add Product</button>
        </a>
      </div>

      {/* Table */}
      <div className="red-card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th style={{ textAlign: 'right' }}>Sales</th>
              <th style={{ textAlign: 'right' }}>Revenue</th>
              <th style={{ textAlign: 'center' }}>AI Score</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                  {!p.approved && (
                    <div style={{ fontSize: 10, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Layers size={9} /> Pending approval
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{p.category}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{p.price} DT</td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: 12,
                    color: p.stock === 0 ? '#e74c3c' : p.stock <= 15 ? '#f39c12' : 'var(--text)',
                  }}
                >
                  {p.stock}{p.stock === 0 && ' ⚠'}
                </td>
                <td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{p.sales}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2ecc71', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {p.revenue} DT
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: scoreColor(p.aiScore),
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.aiScore}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={statusStyle(p.status)}>{p.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {[Eye, Edit2, Trash2].map((Icon, i) => (
                      <button
                        key={i}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text2)',
                          padding: 5,
                          borderRadius: 7,
                          display: 'flex',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = i === 2 ? '#e74c3c' : 'var(--red-light)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface4)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }}
                      >
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: 13 }}>
            No products match your search.
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
        AI Score = composite of sales velocity, review rating, price competitiveness, and search visibility
      </div>
    </div>
  );
}