'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DATA = [
  { name: 'Cash on Delivery', value: 48, color: '#e74c3c' },
  { name: 'Card (Stripe)',     value: 27, color: '#3498db' },
  { name: 'D17 Mobile',       value: 18, color: '#27ae60' },
  { name: 'Wallet',           value: 7,  color: '#f39c12' },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].value}%</div>
    </div>
  );
}

export default function PaymentMethodChart() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Payment Methods</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>Distribution this month</div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={DATA} cx="50%" cy="50%" outerRadius={65} dataKey="value" strokeWidth={0}>
            {DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}