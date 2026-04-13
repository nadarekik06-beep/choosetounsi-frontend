'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const DATA = [
  { name: 'Electronics', value: 42, color: '#c0392b' },
  { name: 'Clothing',    value: 28, color: '#8e44ad' },
  { name: 'Food',        value: 18, color: '#16a085' },
  { name: 'Other',       value: 12, color: '#d35400' },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text)',
      }}
    >
      <div style={{ fontWeight: 600 }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].value}%</div>
    </div>
  );
}

export default function CategoryChart() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Sales by Category</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>Revenue distribution</div>

      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie
            data={DATA}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={58}
            dataKey="value"
            strokeWidth={0}
          >
            {DATA.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {DATA.map(({ name, value, color }) => (
          <div key={name}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text2)',
                marginBottom: 3,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {name}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}