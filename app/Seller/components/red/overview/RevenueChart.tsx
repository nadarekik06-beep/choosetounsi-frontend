'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const DATA = [
  { day: '1',  revenue: 82  },
  { day: '3',  revenue: 118 },
  { day: '5',  revenue: 95  },
  { day: '7',  revenue: 140 },
  { day: '9',  revenue: 125 },
  { day: '11', revenue: 165 },
  { day: '13', revenue: 148 },
  { day: '15', revenue: 190 },
  { day: '17', revenue: 172 },
  { day: '19', revenue: 210 },
  { day: '21', revenue: 195 },
  { day: '23', revenue: 230 },
  { day: '25', revenue: 215 },
  { day: '27', revenue: 248 },
  { day: '29', revenue: 260 },
  { day: '31', revenue: 245 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface3)',
        border: '1px solid var(--border-red)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: 'var(--text)',
      }}
    >
      <div style={{ color: 'var(--text2)', marginBottom: 4, fontSize: 11 }}>Day {label}</div>
      <div style={{ fontWeight: 700, color: 'var(--red-light)' }}>{payload[0].value} DT</div>
    </div>
  );
}

export default function RevenueChart() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Revenue Trend</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Last 30 days · DT</div>
        </div>
        <span className="badge-red">+23.4% vs last month</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#c0392b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c0392b" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#e74c3c"
            strokeWidth={2}
            fill="url(#redGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#e74c3c', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}