'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { MonthlyDataPoint } from '@/types/seller';
import { useTheme } from '../layout';

interface RevenueChartProps { data: MonthlyDataPoint[]; }

function CustomTooltip({ active, payload, label, dark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e2535' : '#ffffff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
      borderRadius: 12, padding: '12px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      minWidth: 160,
    }}>
      <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color: dark?'rgba(255,255,255,0.4)':'#94a3b8', marginBottom:8 }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:4 }}>
          <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:dark?'rgba(255,255,255,0.5)':'#64748b' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:entry.color, display:'inline-block' }}/>
            {entry.dataKey === 'revenue' ? 'Revenue' : 'Orders'}
          </span>
          <span style={{ fontSize:11, fontWeight:800, color:dark?'#fff':'#0f172a' }}>
            {entry.dataKey === 'revenue' ? `${entry.value.toLocaleString('fr-TN')} TND` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const { dark } = useTheme();

  const bg       = dark ? '#161b27' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const gridColor= dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';
  const tickColor= dark ? 'rgba(255,255,255,0.3)' : '#94a3b8';
  const textMain = dark ? '#ffffff' : '#0f172a';
  const textMuted= dark ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  return (
    <div style={{
      background: bg, borderRadius: 18,
      border: `1px solid ${border}`,
      padding: 24, height: '100%',
      transition: 'background 0.3s ease',
    }}>
      <div style={{ marginBottom:20 }}>
        <h3 style={{ fontSize:14, fontWeight:800, color:textMain, margin:0 }}>Revenue Overview</h3>
        <p style={{ fontSize:11, color:textMuted, margin:'3px 0 0' }}>Monthly performance — last 12 months</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top:4, right:4, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="gradRevenueDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3B82F6" stopOpacity={dark ? 0.3 : 0.18}/>
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gradOrdersDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity={dark ? 0.3 : 0.18}/>
              <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
          <XAxis dataKey="month" tick={{ fontSize:10, fill:tickColor, fontWeight:600 }} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="revenue" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={36}/>
          <YAxis yAxisId="orders" orientation="right" tick={{ fontSize:10, fill:tickColor }} axisLine={false} tickLine={false} width={28}/>

          <Tooltip content={<CustomTooltip dark={dark}/>}/>

          <Legend iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize:'11px', paddingTop:'14px', color:tickColor }}
            formatter={(val) => val === 'revenue' ? 'Revenue (TND)' : 'Orders'}/>

          <Area yAxisId="revenue" type="monotone" dataKey="revenue"
            stroke="#3B82F6" strokeWidth={2.5} fill="url(#gradRevenueDark)"
            dot={false} activeDot={{ r:5, strokeWidth:0, fill:'#3B82F6' }}/>
          <Area yAxisId="orders" type="monotone" dataKey="orders"
            stroke="#10B981" strokeWidth={2} fill="url(#gradOrdersDark)"
            dot={false} activeDot={{ r:5, strokeWidth:0, fill:'#10B981' }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}