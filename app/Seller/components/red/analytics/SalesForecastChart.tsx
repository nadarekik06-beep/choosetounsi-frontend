'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const DATA = [
  { week: 'Week 1', predicted: 175, actual: 168 },
  { week: 'Week 2', predicted: 198, actual: 185 },
  { week: 'Week 3', predicted: 221, actual: null  },
  { week: 'Week 4', predicted: 196, actual: null  },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        p.value !== null && (
          <div key={p.name} style={{ color: p.stroke, fontWeight: 600 }}>{p.name}: {p.value} units</div>
        )
      ))}
    </div>
  );
}

export default function SalesForecastChart() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sales Forecast</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Next 4 weeks prediction</div>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          color: '#2ecc71',
          background: 'rgba(46,204,113,0.1)',
          borderRadius: 20,
          padding: '2px 10px',
          marginBottom: 14,
        }}
      >
        Ramadan effect: <strong>+34%</strong> uplift expected
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
          <Line type="monotone" dataKey="predicted" stroke="#e74c3c" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4, fill: '#e74c3c' }} name="Predicted" connectNulls={false} />
          <Line type="monotone" dataKey="actual"    stroke="#888"    strokeWidth={2} dot={{ r: 4, fill: '#888' }} name="Actual" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}