'use client';

const ITEMS = [
  { name: 'Lampe LED Solaire',     stock: 12, daysLeft: 3,  urgent: true  },
  { name: 'Jebba Homme Classique', stock: 0,  daysLeft: 0,  urgent: true  },
  { name: 'Harissa Artisanale',    stock: 34, daysLeft: 12, urgent: false },
];

export default function RestockAlerts() {
  return (
    <div className="red-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Restock Alerts</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Products running low</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style={{ textAlign: 'right' }}>Stock</th>
            <th style={{ textAlign: 'right' }}>Est. days left</th>
            <th style={{ textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(({ name, stock, daysLeft, urgent }) => (
            <tr key={name}>
              <td style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{name}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: urgent ? '#e74c3c' : '#f39c12', fontVariantNumeric: 'tabular-nums' }}>
                {stock}
              </td>
              <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>
                {daysLeft === 0 ? 'Out of stock' : `~${daysLeft} days`}
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  className={urgent ? 'red-btn' : 'ghost-btn'}
                  style={{ padding: '4px 12px', fontSize: 11 }}
                >
                  {urgent ? '⚠ Urgent' : 'Reorder'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}