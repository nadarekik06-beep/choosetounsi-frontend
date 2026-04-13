'use client';

const ITEMS = [
  { name: 'Casque Bluetooth XL3', current: 26, suggested: 29, uplift: '+11.5%' },
  { name: 'Harissa Artisanale',   current: 14, suggested: 16, uplift: '+14.3%' },
  { name: 'T-shirt Medina Print', current: 18, suggested: 19, uplift: '+5.6%'  },
];

export default function PricingOpportunities() {
  return (
    <div className="red-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Pricing Opportunities</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>AI-detected price uplift potential</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style={{ textAlign: 'right' }}>Your Price</th>
            <th style={{ textAlign: 'right' }}>Suggested</th>
            <th style={{ textAlign: 'right' }}>Est. Uplift</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map(({ name, current, suggested, uplift }) => (
            <tr key={name}>
              <td style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{name}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{current} DT</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#2ecc71', fontFamily: 'monospace', fontSize: 12 }}>
                {suggested} DT
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#2ecc71', fontSize: 12 }}>{uplift}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}