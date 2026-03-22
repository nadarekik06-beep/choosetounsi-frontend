'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../layout';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number | null;
  icon: LucideIcon;
  iconClassName?: string;
  wrapperClassName?: string;
}

export default function StatCard({
  title, value, subtitle, change,
  icon: Icon, iconClassName = 'text-blue-500', wrapperClassName = '',
}: StatCardProps) {
  const { dark } = useTheme();

  const hasChange = change !== null && change !== undefined;
  const isPositive = hasChange && change! > 0;
  const isNeutral  = hasChange && change! === 0;

  const bg     = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : '#94a3b8';
  const iconBg    = dark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const iconBorder= dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease',
      }}
      className={`stat-card-hover ${wrapperClassName}`}
    >
      {/* glow blob */}
      <div style={{
        position:'absolute', top:-24, right:-24,
        width:80, height:80, borderRadius:'50%',
        background: '#3b82f6', opacity: dark ? 0.1 : 0.06,
        filter:'blur(20px)', pointerEvents:'none',
      }}/>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, position:'relative' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:textMuted, marginBottom:8 }}>
            {title}
          </p>
          <p style={{ fontSize:22, fontWeight:900, color:textMain, lineHeight:1, margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize:11, color:textMuted, margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {subtitle}
            </p>
          )}
          {hasChange && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap:4,
              marginTop:8, padding:'3px 8px', borderRadius:999,
              fontSize:10, fontWeight:800,
              background: isNeutral  ? (dark?'rgba(148,163,184,0.12)':'#f1f5f9')
                        : isPositive ? (dark?'rgba(16,185,129,0.12)':'#ecfdf5')
                                     : (dark?'rgba(239,68,68,0.12)':'#fef2f2'),
              color: isNeutral  ? (dark?'#94a3b8':'#64748b')
                   : isPositive ? '#10b981'
                                 : '#ef4444',
            }}>
              {isNeutral  ? <Minus size={10}/> :
               isPositive ? <TrendingUp size={10}/> :
                            <TrendingDown size={10}/>}
              {isPositive ? '+' : ''}{change!.toFixed(1)}% vs last month
            </div>
          )}
        </div>

        <div style={{
          width:44, height:44, borderRadius:12, flexShrink:0,
          background:iconBg, border:`1px solid ${iconBorder}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.2s ease',
        }} className="stat-icon-hover">
          <Icon size={20} className={iconClassName}/>
        </div>
      </div>

      <style>{`
        .stat-card-hover:hover { transform:translateY(-3px)!important; box-shadow:0 12px 32px rgba(0,0,0,0.15)!important; }
        .stat-card-hover:hover .stat-icon-hover { transform:scale(1.1)!important; }
      `}</style>
    </div>
  );
}