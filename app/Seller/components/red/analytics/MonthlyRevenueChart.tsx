'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const DATA = [
  { month: 'May',  revenue: 1820 },
  { month: 'Jun',  revenue: 2100 },
  { month: 'Jul',  revenue: 1980 },
  { month: 'Aug',  revenue: 2340 },
  { month: 'Sep',  revenue: 2760 },
  { month: 'Oct',  revenue: 2890 },
  { month: 'Nov',  revenue: 3100 },
  { month: 'Dec',  revenue: 2750 },
  { month: 'Jan',  revenue: 2980 },
  { month: 'Feb',  revenue: 3200 },
  { month: 'Mar',  revenue: 3560 },
  { month: 'Apr',  revenue: 3840 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--red-light)' }}>{payload[0].value.toLocaleString()} DT</div>
    </div>
  );
}

export default function MonthlyRevenueChart() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Monthly Revenue</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Last 12 months · DT</div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={DATA} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {DATA.map((_, i) => (
              <Cell key={i} fill={i === DATA.length - 1 ? '#e74c3c' : 'rgba(192,57,43,0.45)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}