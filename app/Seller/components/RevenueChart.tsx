'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlyDataPoint } from '@/types/seller';

interface RevenueChartProps {
  data: MonthlyDataPoint[];
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3.5 text-sm min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2 text-xs uppercase tracking-wider">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.dataKey === 'revenue' ? 'Revenue' : 'Orders'}
          </span>
          <span className="font-bold text-slate-900 text-xs">
            {entry.dataKey === 'revenue'
              ? `${entry.value.toLocaleString('fr-TN')} TND`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
      <div className="mb-5">
        <h3 className="font-extrabold text-slate-900 text-base">Revenue Overview</h3>
        <p className="text-xs text-slate-400 mt-0.5">Monthly performance — last 12 months</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3B82F6" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '14px', color: '#64748B' }}
            formatter={(val) => val === 'revenue' ? 'Revenue (TND)' : 'Orders'}
          />

          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={2.5}
            fill="url(#gradRevenue)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#3B82F6' }}
          />
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gradOrders)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#10B981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}