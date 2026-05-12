'use client';
// BlackPepperHub.tsx -- PHASE 1 UPDATE
// Key changes:
//   1. DailyBriefCard added as first element
//   2. Sections collapsed by default (defaultOpen=false)
//   3. Human-language wording (velocityLabel, urgencyLabel helpers)
//   4. SmartActionButton inline with every insight card
//   5. Profit margin / confidence human labels applied

import { useState, useEffect, useCallback } from 'react';
import {
  Crown, TrendingUp, TrendingDown, AlertTriangle, Package,
  DollarSign, BarChart2, Zap, Star, Send, CheckCircle,
  Clock, ChevronDown, ChevronUp, RefreshCw, Eye, Flame,
  Sparkles, Info,
} from 'lucide-react';
import { blackPepperApi } from '@/lib/blackPepperApi';
import type {
  AiHubData, ProfitCenterData, 
  VipRequest, VipRequestType,
} from '@/lib/blackPepperApi';
import DailyBriefCard from './black/DailyBriefCard';
import SmartActionButton from './black/SmartActionButton';
import ConversionFunnelCard from './black/ConversionFunnelCard';
import ProductQualityAudit from './black/ProductQualityAudit';
import SmartPromoteCard from './black/SmartPromoteCard';

const GOLD   = '#f59e0b';
const GOLD_2 = '#fbbf24';
const ELITE  = 'linear-gradient(135deg, #1a1206 0%, #2d1f08 50%, #1a1206 100%)';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';
const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

// ---- Human-language helpers ------------------------------------------------

/** Convert raw multiplier to plain English */
function velocityLabel(m: number): string {
  if (m >= 3) return `Selling ${Math.round(m)}x faster than usual`;
  if (m >= 2) return 'Selling twice as fast as usual';
  return 'Selling 1.5x faster than usual';
}

/** Convert urgency + days to plain English */
function urgencyLabel(urgency: string, days: number): string {
  if (urgency === 'critical') return `Act today — only ${days} day${days === 1 ? '' : 's'} left`;
  if (urgency === 'high') return 'Restock within 48 hours';
  return 'Plan a restock this week';
}

const MARGIN_HUMAN: Record<string, string> = {
  excellent: 'Great profit margin',
  good:      'Good profit margin',
  fair:      'Average profit margin',
  low:       'Low profit product',
};

const CONFIDENCE_HUMAN: Record<string, string> = {
  high:   'Very reliable forecast',
  medium: 'Fairly confident forecast',
  low:    'Rough estimate — more data needed',
};

// ---- Shared UI -------------------------------------------------------------

function GoldBadge({ text }: { text: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.12))',
      border: '1px solid rgba(245,158,11,0.45)',
      fontSize: 9, fontWeight: 800, color: GOLD,
      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    }}>
      <Crown size={9} /> {text}
    </span>
  );
}

interface SectionCardProps {
  title: string; subtitle?: string; icon: React.ElementType;
  accentColor?: string; children: React.ReactNode;
  dark: boolean; collapsible?: boolean; defaultOpen?: boolean;
  badge?: React.ReactNode;
}

function SectionCard({ title, subtitle, icon: Icon, accentColor = GOLD,
  children, dark, collapsible = false, defaultOpen = false, badge }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const border    = 'rgba(245,158,11,0.2)';
  const bg        = dark ? '#0f0d0a' : '#fffdf5';
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ background: bg, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden',
      boxShadow: dark ? '0 4px 32px rgba(245,158,11,0.06)' : '0 4px 24px rgba(245,158,11,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
        borderBottom: open ? `1px solid ${border}` : 'none', cursor: collapsible ? 'pointer' : 'default',
        background: dark
          ? 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(245,158,11,0.03))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
      }} onClick={() => collapsible && setOpen(p => !p)}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: `${accentColor}18`, border: `1px solid ${accentColor}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: 0 }}>{title}</p>
            {badge}
          </div>
          {subtitle && <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{subtitle}</p>}
        </div>
        {collapsible && <div style={{ color: textMuted, flexShrink: 0 }}>{open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>}
      </div>
      {open && <div style={{ padding: 20 }}>{children}</div>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${GOLD}20`,
        borderTop: `3px solid ${GOLD}`, animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

// ---- Elite Banner ----------------------------------------------------------

export function EliteBanner({ dark }: { dark: boolean }) {
  const textMuted = dark ? 'rgba(255,255,255,0.5)' : '#666';
  return (
    <div style={{ background: dark ? ELITE : 'linear-gradient(135deg,#fffbeb,#fef3c7,#fffbeb)',
      borderRadius: 20, border: '1px solid rgba(245,158,11,0.35)', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(245,158,11,0.12)' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'rgba(245,158,11,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }}/>
      <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.15))',
        border: '1px solid rgba(245,158,11,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}>
        <Crown size={24} color={GOLD}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: GOLD, margin: 0 }}>Black Seller Elite</h2>
          <GoldBadge text="Black Pepper"/>
        </div>
        <p style={{ fontSize: 12, color: textMuted, margin: 0, fontWeight: 500 }}>
          Full access to AI Hub, Profit Center, Visibility Control &amp; VIP Lounge.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {[...Array(3)].map((_,i) => <Star key={i} size={14} fill={GOLD} color={GOLD} style={{ opacity: 1-i*0.2 }}/>)}
      </div>
    </div>
  );
}

// ---- AI Hub ----------------------------------------------------------------

export function AiHubSection({ dark }: { dark: boolean }) {
  const [data, setData]       = useState<AiHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await blackPepperApi.aiHub(); setData(r.data); }
    catch (e: any) { setError(e.message ?? 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';
  const sigColors = { hot:'#ef4444', rising:GOLD, warm:'#10b981' };

  return (
    <SectionCard title="AI Intelligence"
      subtitle="Trending products, stock alerts and market insights"
      icon={Sparkles} dark={dark} collapsible defaultOpen={false}
      badge={data?.market_insights?.market_temperature==='hot' ? <GoldBadge text="Market Hot"/> : undefined}>
      {loading && <LoadingSpinner/>}
      {error && (
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <p style={{ color:'#ef4444', fontSize:13 }}>{error}</p>
          <button onClick={load} style={{ marginTop:8, padding:'8px 16px', borderRadius:8,
            background:`${GOLD}18`, border:`1px solid ${GOLD}33`, color:GOLD, cursor:'pointer', fontWeight:700, fontSize:12 }}>
            <RefreshCw size={12} style={{ display:'inline', marginRight:4 }}/> Retry
          </button>
        </div>
      )}
      {!loading && !error && data && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {data.market_insights && (
            <div style={{ background: dark
              ? 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.05))'
              : 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.04))',
              borderRadius:14, border:`1px solid ${GOLD}25`, padding:16 }}>
              <p style={{ fontSize:15, fontWeight:800, color:GOLD, margin:'0 0 10px' }}>{data.market_insights.headline}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {data.market_insights.insights.map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ color:GOLD, fontSize:14, lineHeight:1.5, flexShrink:0 }}>›</span>
                    <p style={{ fontSize:12, color:textMain, margin:0, fontWeight:500, lineHeight:1.5 }}>{s}</p>
                  </div>
                ))}
              </div>
              {data.market_insights.priority_action && (
                <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:`${GOLD}15`, border:`1px solid ${GOLD}25` }}>
                  <p style={{ fontSize:11, fontWeight:800, color:GOLD, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Priority Action
                  </p>
                  <p style={{ fontSize:12, color:textMain, margin:0, fontWeight:600 }}>{data.market_insights.priority_action}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p style={{ fontSize:12, fontWeight:800, color:GOLD, margin:'0 0 12px', textTransform:'uppercase', letterSpacing:'0.08em',
              display:'flex', alignItems:'center', gap:6 }}>
              <TrendingUp size={13}/> Trending Right Now ({data.trending_products.length})
            </p>
            {data.trending_products.length===0 ? (
              <p style={{ fontSize:13, color:textMuted, textAlign:'center', padding:'16px 0' }}>
                No trending signals yet — keep selling and check back soon.
              </p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {data.trending_products.map(p => {
                  const sc = sigColors[p.trend_signal];
                  const vl = p.velocity_label || velocityLabel(p.velocity_multiplier);
                  return (
                    <div key={p.product_id} style={{ background:cardBg, borderRadius:12, border:`1px solid ${cardBdr}`,
                      padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:12 }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.product_name} style={{ width:36, height:36, borderRadius:10, objectFit:'cover', flexShrink:0, border:`1px solid ${sc}30` }}/>
                        : <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:`${sc}15`, border:`1px solid ${sc}30`, display:'flex', alignItems:'center', justifyContent:'center' }}><Flame size={16} color={sc}/></div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <p style={{ fontSize:13, fontWeight:800, color:textMain, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.product_name}</p>
                          <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${sc}18`, color:sc, border:`1px solid ${sc}30`, whiteSpace:'nowrap', textTransform:'uppercase' as const }}>
                            {p.trend_signal==='hot' ? '🔥 Hot' : p.trend_signal==='rising' ? '📈 Rising' : '🌿 Warm'}
                          </span>
                        </div>
                        <p style={{ fontSize:11, color:sc, fontWeight:700, margin:'0 0 2px' }}>{vl}</p>
                        <p style={{ fontSize:11, color:textMuted, margin:'0 0 8px' }}>{p.insight}</p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#10b981' }}>{p.seven_day_units} sold this week</span>
                          <span style={{ fontSize:11, fontWeight:700, color:GOLD }}>{fmt(p.seven_day_revenue)}</span>
                          {(p.smart_actions||[]).map((a,i) => (
                            <SmartActionButton key={i} label={a.label}
                              icon={a.type==='promote' ? TrendingUp : a.type==='restock' ? Package : Zap}
                              href={a.href} color={a.type==='promote' ? 'gold' : a.type==='restock' ? 'red' : 'blue'}
                              size="sm" dark={dark}/>
                          ))}
                          {(!p.smart_actions||p.smart_actions.length===0) && (
                            <SmartActionButton label="Promote" icon={TrendingUp} href="/seller/promote" color="gold" size="sm" dark={dark}/>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p style={{ fontSize:12, fontWeight:800, color:'#ef4444', margin:'0 0 12px', textTransform:'uppercase', letterSpacing:'0.08em',
              display:'flex', alignItems:'center', gap:6 }}>
              <AlertTriangle size={13}/> Stock Alerts ({data.inventory_alerts.length})
            </p>
            {data.inventory_alerts.length===0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px', background:'rgba(16,185,129,0.08)', borderRadius:10, border:'1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={16} color="#10b981"/>
                <p style={{ fontSize:13, color:'#10b981', margin:0, fontWeight:600 }}>You have enough stock for everything right now.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.inventory_alerts.map(a => {
                  const uc = a.urgency==='critical' ? '#ef4444' : a.urgency==='high' ? GOLD : '#3b82f6';
                  const ul = urgencyLabel(a.urgency, a.days_remaining);
                  return (
                    <div key={a.product_id} style={{ background:cardBg, borderRadius:12, border:`1px solid ${uc}28`,
                      padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:12 }}>
                      {a.image_url
                        ? <img src={a.image_url} alt={a.product_name} style={{ width:36, height:36, borderRadius:10, objectFit:'cover', flexShrink:0, border:`1px solid ${uc}28` }}/>
                        : <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:`${uc}12`, border:`1px solid ${uc}28`, display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={16} color={uc}/></div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:textMain, margin:'0 0 3px' }}>{a.product_name}</p>
                        <p style={{ fontSize:11, color:uc, fontWeight:700, margin:'0 0 2px' }}>{ul}</p>
                        <p style={{ fontSize:11, color:textMuted, margin:'0 0 8px', lineHeight:1.4 }}>{a.insight}</p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#ef4444' }}>Could lose {fmt(a.revenue_at_risk)}</span>
                          {(a.smart_actions||[]).map((ac,i) => (
                            <SmartActionButton key={i} label={ac.label}
                              icon={ac.type==='restock' ? Package : TrendingUp}
                              href={ac.href} color={ac.type==='restock' ? 'red' : 'gold'} size="sm" dark={dark}/>
                          ))}
                          {(!a.smart_actions||a.smart_actions.length===0) && (
                            <SmartActionButton label="Restock Now" icon={Package} href="/seller/products" color="red" size="sm" dark={dark}/>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---- Profit Center ---------------------------------------------------------

export function ProfitCenterSection({ dark }: { dark: boolean }) {
  const [data, setData]       = useState<ProfitCenterData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);
  const [tab, setTab]         = useState<'overview'|'products'|'forecast'>('overview');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await blackPepperApi.profitCenter(); setData(r.data); }
    catch (e: any) { setError(e.message ?? 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';
  const tabsBg    = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const mColors: Record<string,string> = { excellent:'#10b981', good:'#3b82f6', fair:GOLD, low:'#ef4444' };

  return (
    <SectionCard title="Your Profit Center" subtitle="Revenue, estimated profits, and 30-day forecast"
      icon={DollarSign} dark={dark} collapsible defaultOpen={false}>
      {loading && <LoadingSpinner/>}
      {error && <p style={{ color:'#ef4444', textAlign:'center', fontSize:13 }}>{error}</p>}
      {!loading && !error && data && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px', borderRadius:10, background:`${GOLD}10`, border:`1px solid ${GOLD}20` }}>
            <Info size={14} color={GOLD} style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:11, color:textMuted, margin:0, lineHeight:1.5 }}>{data.summary.margin_disclaimer}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { label:'Revenue (90d)', value:fmt(data.summary.total_revenue_90d), color:GOLD, icon:DollarSign },
              { label:'Est. Profit',   value:fmt(data.summary.estimated_profit_90d), color:'#10b981', icon:TrendingUp },
              { label:'Est. Margin',   value:data.summary.estimated_margin_pct+'%', color:'#3b82f6', icon:BarChart2 },
            ].map(({ label, value, color, icon:Ic }) => (
              <div key={label} style={{ background:cardBg, borderRadius:12, border:`1px solid ${cardBdr}`, padding:'14px 16px', textAlign:'center' }}>
                <Ic size={16} color={color} style={{ margin:'0 auto 6px', display:'block' }}/>
                <p style={{ fontSize:15, fontWeight:900, color, margin:'0 0 2px' }}>{value}</p>
                <p style={{ fontSize:10, fontWeight:700, color:textMuted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, background:tabsBg, borderRadius:10, padding:4 }}>
            {(['overview','products','forecast'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex:1, padding:'7px 0', borderRadius:8,
                background: tab===t ? `${GOLD}20` : 'transparent',
                border: tab===t ? `1px solid ${GOLD}35` : '1px solid transparent',
                color: tab===t ? GOLD : textMuted,
                fontSize:11, fontWeight:800, cursor:'pointer', textTransform:'capitalize' as const,
              }}>{t}</button>
            ))}
          </div>
          {tab==='overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {data.period_breakdown.map(period => {
                const maxRev = Math.max(...data.period_breakdown.map(p => p.revenue), 1);
                return (
                  <div key={period.month} style={{ background:cardBg, borderRadius:10, border:`1px solid ${cardBdr}`, padding:'10px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:textMain }}>{period.month}</span>
                      <div style={{ display:'flex', gap:16 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:GOLD }}>{fmt(period.revenue)}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#10b981' }}>~{fmt(period.estimated_profit)}</span>
                      </div>
                    </div>
                    <div style={{ height:4, background:dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(period.revenue/maxRev)*100}%`, background:`linear-gradient(90deg,${GOLD},${GOLD_2})`, borderRadius:999 }}/>
                    </div>
                    <div style={{ display:'flex', gap:16, marginTop:6 }}>
                      <span style={{ fontSize:10, color:textMuted }}>{period.units} units</span>
                      <span style={{ fontSize:10, color:textMuted }}>{period.orders} orders</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab==='products' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {data.product_margins.length===0
                ? <p style={{ color:textMuted, textAlign:'center', fontSize:13, padding:'16px 0' }}>No sales data yet.</p>
                : data.product_margins.map(p => {
                  const mc = mColors[p.margin_label] ?? GOLD;
                  const mh = (p as any).margin_human || MARGIN_HUMAN[p.margin_label] || p.margin_label;
                  return (
                    <div key={p.product_id} style={{ background:cardBg, borderRadius:10, border:`1px solid ${cardBdr}`, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:textMain, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.product_name}</p>
                        <p style={{ fontSize:10, color:textMuted, margin:0 }}>{p.total_units} units · {fmt(p.total_revenue)}</p>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <p style={{ fontSize:14, fontWeight:900, color:mc, margin:'0 0 2px' }}>{p.margin_pct.toFixed(1)}%</p>
                        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${mc}15`, color:mc, border:`1px solid ${mc}28` }}>{mh}</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
          {tab==='forecast' && (
            data.forecast ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ background:cardBg, borderRadius:12, border:`1px solid ${cardBdr}`, padding:'14px 16px' }}>
                    <p style={{ fontSize:12, color:textMuted, margin:'0 0 4px', fontWeight:700 }}>Next 30 Days</p>
                    <p style={{ fontSize:18, fontWeight:900, color:GOLD, margin:'0 0 2px' }}>{fmt(data.forecast.next_30_days)}</p>
                    <span style={{ fontSize:11, fontWeight:700, color:data.forecast.growth_pct>=0 ? '#10b981' : '#ef4444' }}>
                      {pct(data.forecast.growth_pct)} vs last 30 days
                    </span>
                  </div>
                  <div style={{ background:cardBg, borderRadius:12, border:`1px solid ${cardBdr}`, padding:'14px 16px' }}>
                    <p style={{ fontSize:12, color:textMuted, margin:'0 0 4px', fontWeight:700 }}>Forecast Reliability</p>
                    <p style={{ fontSize:13, fontWeight:800, color:textMain, margin:'0 0 4px' }}>
                      {(data.forecast as any).confidence_human || CONFIDENCE_HUMAN[data.forecast.confidence]}
                    </p>
                    <span style={{ fontSize:10, color:textMuted }}>
                      {data.forecast.trend==='up' ? '📈 Trending up' : data.forecast.trend==='down' ? '📉 Trending down' : '➡️ Stable'}
                    </span>
                  </div>
                </div>
                <div style={{ background:cardBg, borderRadius:12, border:`1px solid ${cardBdr}`, padding:14 }}>
                  <p style={{ fontSize:11, fontWeight:800, color:textMuted, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>30-Day Forecast</p>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:60 }}>
                    {data.forecast.daily_points.map((pt,i) => {
                      const mx = Math.max(...data.forecast!.daily_points.map(x => x.predicted),1);
                      const h  = Math.max(4,(pt.predicted/mx)*56);
                      return <div key={i} title={`${pt.day}: ${fmt(pt.predicted)}`} style={{ flex:1, height:h, borderRadius:2, background:`linear-gradient(0deg,${GOLD},${GOLD_2})`, opacity:0.5+(i/data.forecast!.daily_points.length)*0.5 }}/>;
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:9, color:textMuted }}>Today</span>
                    <span style={{ fontSize:9, color:textMuted }}>+30 days</span>
                  </div>
                </div>
              </div>
            ) : <p style={{ color:textMuted, textAlign:'center', fontSize:13, padding:'16px 0' }}>Keep selling for 7 days to unlock your forecast.</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}



// ---- VIP Lounge (unchanged logic, kept for completeness) -------------------

export function VipLoungeSection({ dark }: { dark: boolean }) {
  const [requests, setRequests]   = useState<VipRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState<{ type: VipRequestType; message: string }>({ type:'reel', message:'' });
  const [success, setSuccess]     = useState<string|null>(null);
  const [formError, setFormError] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await blackPepperApi.getVipRequests(); setRequests(r.data); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.message.trim() || form.message.length<10) { setFormError('Minimum 10 characters.'); return; }
    setSubmitting(true); setFormError(null); setSuccess(null);
    try {
      const r = await blackPepperApi.submitVipRequest(form.type, form.message);
      setSuccess(r.message); setForm({ type:'reel', message:'' }); load();
    } catch (e: any) { setFormError(e.message ?? 'Submission failed.'); }
    finally { setSubmitting(false); }
  };

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const inputBg   = dark ? 'rgba(255,255,255,0.05)' : '#f9f7f0';
  const inputBdr  = dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.25)';
  const cardBg    = dark ? '#141209' : '#fff';
  const cardBdr   = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';

  const typeConfig: Record<VipRequestType,{ icon:string; label:string; desc:string }> = {
    reel:      { icon:'🎬', label:'Request Reel',      desc:'Professional video reel for your products' },
    promotion: { icon:'📣', label:'Request Promotion', desc:'Featured placement on homepage & socials' },
    support:   { icon:'👑', label:'VIP Support',       desc:'Priority 1-on-1 support from our team' },
  };
  const statusColors: Record<string,string> = { pending:GOLD, in_progress:'#3b82f6', completed:'#10b981', rejected:'#ef4444' };

  return (
    <SectionCard title="VIP Lounge" subtitle="Request reels, promotions, or priority support"
      icon={Crown} dark={dark} collapsible defaultOpen={true}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {(Object.keys(typeConfig) as VipRequestType[]).map(type => {
            const cfg = typeConfig[type];
            const sel = form.type===type;
            return (
              <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{
                padding:'12px 10px', borderRadius:12, textAlign:'center',
                background:sel ? `${GOLD}18` : 'transparent',
                border:`1px solid ${sel ? `${GOLD}45` : inputBdr}`, cursor:'pointer',
              }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{cfg.icon}</div>
                <p style={{ fontSize:11, fontWeight:800, color:sel ? GOLD : textMuted, margin:'0 0 2px' }}>{cfg.label}</p>
                <p style={{ fontSize:9, color:textMuted, margin:0, lineHeight:1.3 }}>{cfg.desc}</p>
              </button>
            );
          })}
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:800, color:GOLD, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
            Describe your request
          </label>
          <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message:e.target.value }))}
            placeholder={`Tell us about your ${typeConfig[form.type].label.toLowerCase()}...`}
            rows={3} style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:inputBg,
              border:`1px solid ${inputBdr}`, color:textMain, fontSize:13, fontFamily:'inherit',
              resize:'vertical', outline:'none', boxSizing:'border-box' as const }}/>
          <p style={{ fontSize:10, color:textMuted, margin:'4px 0 0', textAlign:'right' }}>{form.message.length} / 1000</p>
        </div>
        {formError && <p style={{ fontSize:12, color:'#ef4444', margin:0, fontWeight:600 }}>{formError}</p>}
        {success && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={14} color="#10b981"/>
            <p style={{ fontSize:12, color:'#10b981', margin:0, fontWeight:600 }}>{success}</p>
          </div>
        )}
        <button onClick={handleSubmit} disabled={submitting} style={{
          padding:'12px 0', borderRadius:12,
          background:submitting ? 'rgba(245,158,11,0.3)' : `linear-gradient(135deg,${GOLD},${GOLD_2})`,
          border:'none', color:'#000', fontSize:13, fontWeight:900, cursor:submitting ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          boxShadow:submitting ? 'none' : `0 4px 18px ${GOLD}40`,
        }}>
          <Send size={14}/>
          {submitting ? 'Submitting…' : `Submit ${typeConfig[form.type].label}`}
        </button>
        {!loading && requests.length>0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:textMuted, textTransform:'uppercase', letterSpacing:'0.08em', margin:'4px 0 10px' }}>
              Your Requests ({requests.length})
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {requests.map(req => {
                const sc = statusColors[req.status] ?? GOLD;
                return (
                  <div key={req.id} style={{ background:cardBg, borderRadius:10, border:`1px solid ${cardBdr}`, padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{typeConfig[req.type as VipRequestType]?.icon ?? '📋'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <p style={{ fontSize:12, fontWeight:800, color:textMain, margin:0 }}>{req.type_label}</p>
                        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${sc}15`, color:sc, border:`1px solid ${sc}28`, textTransform:'uppercase' as const }}>{req.status_label}</span>
                      </div>
                      <p style={{ fontSize:11, color:textMuted, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.message}</p>
                      {req.admin_note && <p style={{ fontSize:11, color:'#10b981', margin:0, fontWeight:600 }}>💬 {req.admin_note}</p>}
                      <p style={{ fontSize:10, color:textMuted, margin:'4px 0 0' }}>
                        <Clock size={9} style={{ display:'inline', marginRight:3 }}/>
                        {new Date(req.created_at).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---- Main Export -----------------------------------------------------------

export default function BlackPepperHub({ dark }: { dark: boolean }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'4px 0' }}>
        <div style={{ flex:1, height:1, background:'rgba(245,158,11,0.2)' }}/>
        <GoldBadge text="Black Pepper Elite Features"/>
        <div style={{ flex:1, height:1, background:'rgba(245,158,11,0.2)' }}/>
      </div>

      {/* Daily Brief is always visible — the first thing sellers see */}
      <DailyBriefCard dark={dark}/>
      <EliteBanner dark={dark}/>

      {/* These three start collapsed — tap to expand */}
      <AiHubSection dark={dark}/>
      <ConversionFunnelCard dark={dark}/>
      <ProductQualityAudit dark={dark}/>
      <SmartPromoteCard dark={dark}/>
      <ProfitCenterSection dark={dark}/>

      {/* VIP Lounge starts open — sellers use it frequently */}
      <VipLoungeSection dark={dark}/>
    </div>
  );
}