'use client';

/**
 * app/components/seller/AIToolsPanel.tsx
 *
 * CHANGED: SalesPredictorTool — added "Product DNA" strip that
 * surfaces subcategory, variant axes, top-selling combos, and
 * info-attributes so the seller sees exactly what data the AI used.
 *
 * All other tools (PriceOptimizer, DescriptionGenerator,
 * BundleRecommender) are COMPLETELY UNCHANGED.
 */

import { useState, useEffect, useRef } from 'react';
import {
  DollarSign, TrendingUp, FileText, Package, Loader2,
  Copy, Check, ChevronDown, Sparkles, Brain,
  TrendingDown, Minus, Globe, Shield, AlertTriangle,
  Zap, BarChart3, Target, Info, Star, Rocket,
  ArrowRight, ShoppingBag, Search, CheckCircle2, Layers, Tag,
} from 'lucide-react';

import {
  sellerAiApi,
  type PriceOptimizerResult, type PriceOptimizerDataContext,
  type SalesPredictorResult, type DescriptionResult,
  type RecommenderResult, type MarketReport,
} from '@/lib/sellerAiApi';
import { productsApi as sellerProductsApi } from '@/lib/sellerApi';
import SalesForecastDashboard from '@/app/seller/components/SalesForecastDashboard';
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const CONFIDENCE_COLORS: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
const TREND_COLORS: Record<string, string>      = { up: '#10b981', down: '#ef4444', stable: '#3b82f6' };
const RISK_COLORS: Record<string, string>       = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const POSITIONING_COLORS: Record<string, string>= { underpriced: '#10b981', competitive: '#3b82f6', overpriced: '#ef4444', unknown: '#6b7280' };

const TONES   = ['professional','casual','exciting','trust-focused'];
const LANGS   = [{ value: 'fr', label: 'French' },{ value: 'ar', label: 'Arabic' },{ value: 'en', label: 'English' }];

// ─── Analysis steps for multi-step loader ────────────────────────────────────
const ANALYSIS_STEPS = [
  { id: 'internal',    label: 'Analyzing your store data',        icon: BarChart3, color: '#8b5cf6', duration: 800  },
  { id: 'market',      label: 'Collecting Tunisian market data',  icon: Globe,     color: '#3b82f6', duration: 3500 },
  { id: 'competitors', label: 'Analyzing competitors',            icon: Target,    color: '#f59e0b', duration: 2000 },
  { id: 'normalizing', label: 'Normalizing prices',               icon: Shield,    color: '#10b981', duration: 1200 },
  { id: 'strategy',    label: 'Calculating pricing strategy',     icon: TrendingUp,color: '#06b6d4', duration: 1000 },
  { id: 'ai',          label: 'Generating AI recommendation',     icon: Brain,     color: '#db142e', duration: 1500 },
] as const;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AiTag() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.25)', fontSize:10, fontWeight:800, color:'#f87171' }}>
      <Brain size={10} /> AI Powered
    </span>
  );
}

function CopyBtn({ text, dark }: { text: string; dark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, border:`1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, background:'transparent', cursor:'pointer', fontSize:11, fontWeight:700, color: dark ? 'rgba(255,255,255,0.5)' : '#888' }}
    >
      {copied ? <Check size={11} style={{ color:'#10b981' }} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Field({ label, value, dark }: { label: string; value: string | number; dark: boolean }) {
  return (
    <div style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:10, fontWeight:700, color: dark ? 'rgba(255,255,255,0.4)' : '#888', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:700, color: dark ? '#fff' : '#111', margin:0, lineHeight:1.5 }}>{value}</p>
    </div>
  );
}

function ProdSelect({ products, value, onChange, dark }: { products: Array<{ id:number; name:string }>; value: number|null; onChange:(id:number)=>void; dark:boolean }) {
  const selectBg  = dark ? '#1e2330' : '#f8fafc';
  const selectClr = dark ? '#ffffff' : '#111111';
  const optionBg  = dark ? '#1e2330' : '#ffffff';
  return (
    <div style={{ position:'relative' }}>
      <select value={value ?? ''} onChange={e => onChange(Number(e.target.value))} style={{ width:'100%', padding:'10px 36px 10px 12px', borderRadius:10, border:`1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, background:selectBg, color:selectClr, fontSize:13, fontWeight:600, cursor:'pointer', appearance:'none', outline:'none', colorScheme: dark ? 'dark' : 'light' }}>
        <option value="" style={{ background:optionBg, color:selectClr }}>— Select a product —</option>
        {products.map(p => <option key={p.id} value={p.id} style={{ background:optionBg, color:selectClr }}>{p.name}</option>)}
      </select>
      <ChevronDown size={14} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:selectClr, pointerEvents:'none' }} />
    </div>
  );
}

function RunBtn({ onClick, loading, label = 'Analyze', icon: Icon = Sparkles }: { onClick:()=>void; loading:boolean; label?:string; icon?: React.ElementType }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background: loading ? 'rgba(219,20,46,0.4)' : 'linear-gradient(135deg,#db142e,#a00f22)', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(219,20,46,0.35)' }}>
      {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Icon size={14} />}
      {loading ? 'Analyzing…' : label}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MULTI-STEP LOADER COMPONENT — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

interface LoaderProps { dark: boolean; onComplete?: () => void }

function PriceAnalysisLoader({ dark }: LoaderProps) {
  const [activeStep, setActiveStep]       = useState(0);
  const [completedSteps, setCompleted]    = useState<Set<number>>(new Set());
  const [progressPct, setProgressPct]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stepIndex = 0;
    let elapsed   = 0;
    const totalTime = ANALYSIS_STEPS.reduce((s, st) => s + st.duration, 0);

    const advance = () => {
      if (stepIndex >= ANALYSIS_STEPS.length) return;
      setActiveStep(stepIndex);
      const duration = ANALYSIS_STEPS[stepIndex].duration;

      const start    = elapsed;
      let localPct   = 0;
      const tick     = 60;
      const steps    = duration / tick;
      let i          = 0;

      const interval = setInterval(() => {
        i++;
        localPct = Math.min(1, i / steps);
        const globalPct = ((start + localPct * duration) / totalTime) * 100;
        setProgressPct(Math.round(globalPct));
        if (localPct >= 1) clearInterval(interval);
      }, tick);

      timerRef.current = setTimeout(() => {
        elapsed += duration;
        setCompleted(prev => new Set([...prev, stepIndex]));
        stepIndex++;
        if (stepIndex < ANALYSIS_STEPS.length) advance();
        else setProgressPct(99);
      }, duration);
    };

    advance();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text    = dark ? '#fff' : '#111';
  const muted   = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg  = dark ? '#161b27' : '#ffffff';

  return (
    <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(219,20,46,0.2)', padding:'24px 22px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'rgba(219,20,46,0.12)', border:'1px solid rgba(219,20,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Brain size={18} style={{ color:'#db142e', animation:'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:'0 0 2px' }}>AI Price Analysis Running</p>
          <p style={{ fontSize:11, color:muted, margin:0 }}>Collecting real Tunisian market data…</p>
        </div>
        <div style={{ marginLeft:'auto', fontSize:24, fontWeight:900, color:'#db142e', letterSpacing:'-0.04em' }}>
          {progressPct}%
        </div>
      </div>

      <div style={{ height:6, borderRadius:999, background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#db142e,#f59e0b)', width:`${progressPct}%`, transition:'width 0.1s linear' }} />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {ANALYSIS_STEPS.map((step, idx) => {
          const Icon       = step.icon;
          const isDone     = completedSteps.has(idx);
          const isActive   = activeStep === idx && !isDone;
          const isPending  = idx > activeStep;

          return (
            <div key={step.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background: isActive ? `${step.color}10` : isDone ? (dark?'rgba(16,185,129,0.06)':'rgba(16,185,129,0.04)') : 'transparent', border: isActive ? `1px solid ${step.color}30` : '1px solid transparent', transition:'all 0.3s ease' }}>
              <div style={{ width:32, height:32, borderRadius:10, background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? `${step.color}18` : (dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'), border: `1px solid ${isDone?'rgba(16,185,129,0.3)':isActive?`${step.color}30`:'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.3s ease' }}>
                {isDone
                  ? <Check size={14} style={{ color:'#10b981' }} />
                  : isActive
                    ? <Loader2 size={14} style={{ color:step.color, animation:'spin 0.8s linear infinite' }} />
                    : <Icon size={14} style={{ color: isPending ? muted : step.color, opacity: isPending ? 0.4 : 1 }} />
                }
              </div>

              <div style={{ flex:1 }}>
                <p style={{ fontSize:12, fontWeight:700, color: isDone ? '#10b981' : isActive ? text : muted, margin:'0 0 4px', transition:'color 0.3s' }}>
                  {step.label}
                </p>
                {isActive && (
                  <div style={{ height:3, borderRadius:999, background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, background:step.color, width:'100%', animation:'stepProgress 0.8s ease-in-out infinite alternate' }} />
                  </div>
                )}
              </div>

              {isDone && <span style={{ fontSize:9, fontWeight:800, color:'#10b981', background:'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:999 }}>DONE</span>}
              {isActive && <span style={{ fontSize:9, fontWeight:800, color:step.color, background:`${step.color}15`, padding:'2px 6px', borderRadius:999, animation:'pulse 1s ease-in-out infinite' }}>ACTIVE</span>}
            </div>
          );
        })}
      </div>

      <div style={{ background: dark?'rgba(59,130,246,0.06)':'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:10, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
        <Globe size={14} style={{ color:'#3b82f6', marginTop:1, flexShrink:0 }} />
        <p style={{ fontSize:11, color:muted, margin:0, lineHeight:1.5 }}>
  Scanning <strong style={{ color:'#3b82f6' }}>Tayara.tn</strong>, <strong style={{ color:'#3b82f6' }}>Mytek</strong> & <strong style={{ color:'#3b82f6' }}>Tunisianet</strong> via Google Search API…
</p>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes stepProgress { from{opacity:0.4} to{opacity:1} }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PRICE CARD — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function PriceCard({ label, price, accent, highlight = false, dark }: {
  label: string; price: number; accent: string; highlight?: boolean; dark: boolean;
}) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  return (
    <div style={{ background: highlight ? `${accent}12` : (dark?'rgba(255,255,255,0.03)':'#f8fafc'), borderRadius:12, padding:'14px 12px', textAlign:'center', border: highlight ? `1px solid ${accent}30` : `1px solid ${border}`, flex:1, minWidth:0 }}>
      <p style={{ fontSize:9, fontWeight:800, color: highlight ? accent : (dark?'rgba(255,255,255,0.4)':'#888'), margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
      <p style={{ fontSize: highlight ? 20 : 16, fontWeight:900, color: highlight ? accent : (dark?'#fff':'#111'), margin:0, letterSpacing:'-0.03em' }}>
        {new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(price)}
        <span style={{ fontSize:10, fontWeight:700, marginLeft:3 }}>TND</span>
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE PANEL — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function MarketIntelPanel({ report, dataSource, r, dark }: {
  report: MarketReport; dataSource?: string;
  r: PriceOptimizerResult; dark: boolean;
}) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const hasRealData = report.has_data && (dataSource === 'serper' || dataSource === 'cache');

  const PLATFORM_META: Record<string, { color: string; emoji: string }> = {
    'Mytek':                    { color:'#e84393', emoji:'🖥️' },
    'Tunisianet':               { color:'#f97316', emoji:'🛒' },
    'Tayara.tn':                { color:'#06b6d4', emoji:'📦' },
    'ChooseTounsi':             { color:'#db142e', emoji:'🇹🇳' },
    'Tunisian Market Knowledge':{ color:'#8b5cf6', emoji:'🧠' },
    'Tunisian Market Knowledge (AI)': { color:'#8b5cf6', emoji:'🧠' },
    'Google Tunisie':   { color:'#4285f4', emoji:'🔍' },
    'Tunisian Market':  { color:'#10b981', emoji:'🏪' },
    'Facebook Market':  { color:'#1877f2', emoji:'📘' },
    'Scoop.tn':         { color:'#8b5cf6', emoji:'🛍️' },
  };

  const getPlatformMeta = (name: string) =>
    PLATFORM_META[name] ?? { color:'#6b7280', emoji:'🏪' };

  const scrapedSources = report.by_source ?? [];
  const aiPlatforms    = (r as any).platforms_compared as string[] | undefined;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Search size={13} style={{ color:'#db142e' }} />
        <p style={{ fontSize:10, fontWeight:900, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Platforms analysed
        </p>
      <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999,
  background: hasRealData ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
  color: hasRealData ? '#10b981' : '#f59e0b',
  border: hasRealData ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.25)' }}>
  {report.has_data
    ? `✓ ${report.data_points} results found`
    : dataSource === 'none'
    ? '⚠ No data — internal only'
    : '⚠ Search unavailable'}
</span>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {(() => { const m = getPlatformMeta('ChooseTounsi'); return (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12,
            background: dark ? 'rgba(219,20,46,0.08)' : 'rgba(219,20,46,0.04)',
            border:'1px solid rgba(219,20,46,0.2)', animation:'fadeIn 0.3s ease' }}>
            <span style={{ fontSize:16 }}>{m.emoji}</span>
            <div>
              <p style={{ fontSize:11, fontWeight:800, color:'#db142e', margin:0 }}>ChooseTounsi</p>
              <p style={{ fontSize:9, color:muted, margin:0 }}>Platform data</p>
            </div>
            <CheckCircle2 size={12} style={{ color:'#10b981', marginLeft:2 }} />
          </div>
        ); })()}

        {scrapedSources.length > 0 && scrapedSources.map((src, i) => {
          const m = getPlatformMeta(src.source);
          return (
            <div key={src.source} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12,
              background: dark ? `${m.color}10` : `${m.color}08`,
              border:`1px solid ${m.color}30`,
              animation:`fadeIn ${0.3 + i * 0.1}s ease` }}>
              <span style={{ fontSize:16 }}>{m.emoji}</span>
              <div>
                <p style={{ fontSize:11, fontWeight:800, color:m.color, margin:0 }}>{src.source}</p>
                <p style={{ fontSize:9, color:muted, margin:0 }}>{src.count} products · avg {new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(src.avg)} TND</p>
              </div>
              <CheckCircle2 size={12} style={{ color:'#10b981', marginLeft:2 }} />
            </div>
          );
        })}

        {scrapedSources.length === 0 && aiPlatforms && aiPlatforms.map((name, i) => {
  const m = getPlatformMeta(name);
  return (
    <div key={name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12,
      background: dark ? `${m.color}10` : `${m.color}08`,
      border:`1px solid ${m.color}30`,
      animation:`fadeIn ${0.3 + i * 0.1}s ease` }}>
      <span style={{ fontSize:16 }}>{m.emoji}</span>
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:m.color, margin:0 }}>{name}</p>
        <p style={{ fontSize:9, color:muted, margin:0 }}>Google indexed</p>
      </div>
      <CheckCircle2 size={12} style={{ color:'#10b981', marginLeft:2 }} />
    </div>
  );
})}
        {scrapedSources.length === 0 && (!aiPlatforms || aiPlatforms.length === 0) && (
  <div style={{ padding:'12px 14px', borderRadius:12,
    background: dark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
    border:'1px solid rgba(245,158,11,0.18)' }}>
    <p style={{ fontSize:11, color:'#f59e0b', margin:0, fontWeight:700 }}>
      ⚠ No external market data found for this product.
      Recommendation is based on your platform data only.
    </p>
  </div>
)}
      </div>

      {report.has_data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Market Avg', val:report.market_avg,  color: hasRealData ? '#10b981' : '#f59e0b', icon:'📊' },
            { label:'Lowest',     val:report.market_min,  color: hasRealData ? '#10b981' : '#f59e0b', icon:'⬇️' },
            { label:'Highest',    val:report.market_max,  color: hasRealData ? '#10b981' : '#f59e0b', icon:'⬆️' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} style={{ background:subBg, borderRadius:12, padding:'12px', textAlign:'center', border:`1px solid ${border}` }}>
              <p style={{ fontSize:14, margin:'0 0 2px' }}>{icon}</p>
              <p style={{ fontSize:15, fontWeight:900, color, margin:'0 0 2px' }}>
                {new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(val)} TND
              </p>
              <p style={{ fontSize:9, fontWeight:700, color:muted, margin:0, textTransform:'uppercase' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {[
          { emoji:'💰', label:'Price benchmarked' },
          { emoji:'📈', label:'Demand analysed' },
          { emoji:'🎯', label:'Margin optimised' },
          { emoji:'🧮', label:'Purchasing power' },
          { emoji:'✨', label:'Charm pricing' },
        ].map(({ emoji, label }) => (
          <span key={label} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999,
            background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
            border:'1px solid rgba(16,185,129,0.18)', fontSize:10, fontWeight:700,
            color: dark ? 'rgba(255,255,255,0.65)' : '#444' }}>
            <span>{emoji}</span>{label}
          </span>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12,
        background: dark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
        border:'1px solid rgba(16,185,129,0.18)' }}>
        <Shield size={18} style={{ color:'#10b981', flexShrink:0 }} />
        <div>
          <p style={{ fontSize:11, fontWeight:900, color:'#10b981', margin:'0 0 1px' }}>Verified by ChooseTounsi AI</p>
          <p style={{ fontSize:10, color:muted, margin:0 }}>Cross-validated · Tunisian market · Optimised for conversion</p>
        </div>
        <Star size={14} style={{ color:'#f59e0b', marginLeft:'auto', flexShrink:0 }} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// POSITIONING BADGE — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function PositioningBadge({ positioning, pct, dark }: { positioning: string; pct: number; dark: boolean }) {
  const color = POSITIONING_COLORS[positioning] ?? '#6b7280';
  const Icon  = positioning === 'underpriced' ? TrendingDown
              : positioning === 'overpriced'  ? TrendingUp
              : Minus;
  const label = positioning === 'underpriced' ? `${Math.abs(pct)}% below market`
              : positioning === 'overpriced'  ? `${Math.abs(pct)}% above market`
              : 'Competitively priced';

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:`${color}14`, border:`1px solid ${color}30`, fontSize:11, fontWeight:800, color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 1 — PRICE OPTIMIZER — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function PriceOptimizerTool({ products, dark, initialProductId, autorun }: { products: Array<{ id:number; name:string }>; dark:boolean; initialProductId?: number; autorun?: boolean }) {
  const autoranRef = useRef(false);
  const [selectedId, setSelectedId] = useState<number|null>(initialProductId ?? null);
  const [result,     setResult]     = useState<{ ai_result: PriceOptimizerResult; data_context: PriceOptimizerDataContext }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);
  // ADD THIS after the useState lines:
useEffect(() => {
  if (!initialProductId || products.length === 0) return;
  const found = products.find(p => p.id === initialProductId);
  if (!found) return;
  setSelectedId(initialProductId);
  if (autorun && !autoranRef.current) {
    autoranRef.current = true;
    setTimeout(() => run(initialProductId), 50);
  }
}, [initialProductId, products]);

  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async (idOverride?: number) => {
  const targetId = typeof idOverride === 'number' ? idOverride : selectedId;
  if (!targetId) return;
  setLoading(true); setError(null); setResult(null);
  try {
    const res = await sellerAiApi.priceOptimizer(targetId);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const r   = result?.ai_result   ?? null;
  const ctx = result?.data_context ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stepProgress{from{opacity:0.4}to{opacity:1}}
      `}</style>

      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>Select Product</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <RunBtn onClick={run} loading={loading} label="Optimize Price" icon={DollarSign} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>

      {loading && <PriceAnalysisLoader dark={dark} />}

      {!loading && ctx !== null && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px', animation:'fadeIn 0.4s ease' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Based on your real data</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {([
              { label:'Current Price',    val: fmt(ctx.current_price) },
              { label:'Units Sold',       val: ctx.total_units },
              { label:'Conversion Rate',  val: ctx.conversion_rate + '%' },
              { label:'Platform Cat Avg', val: ctx.category_avg > 0 ? fmt(ctx.category_avg) : 'N/A' },
            ] as { label:string; val:string|number }[]).map(({ label, val }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <p style={{ fontSize:14, fontWeight:900, color:text, margin:'0 0 2px' }}>{val}</p>
                <p style={{ fontSize:10, color:muted, margin:0, fontWeight:600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && r !== null && ctx !== null && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeIn 0.5s ease' }}>

          <div style={{ background:'linear-gradient(145deg,rgba(219,20,46,0.13) 0%,rgba(219,20,46,0.03) 100%)', borderRadius:22, border:'1px solid rgba(219,20,46,0.22)', padding:'22px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:'rgba(219,20,46,0.08)', pointerEvents:'none' }} />

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:34, height:34, borderRadius:11, background:'rgba(219,20,46,0.15)', border:'1px solid rgba(219,20,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Rocket size={16} style={{ color:'#db142e' }} />
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:900, color:'#db142e', margin:0, letterSpacing:'0.04em' }}>AI Optimal Price</p>
                  <p style={{ fontSize:10, color:muted, margin:0 }}>Tunisian market · right now</p>
                </div>
              </div>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:800,
                padding:'4px 11px', borderRadius:999,
                background: CONFIDENCE_COLORS[r.confidence] ? `${CONFIDENCE_COLORS[r.confidence]}18` : 'rgba(148,163,184,0.12)',
                color: CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8',
                border:`1px solid ${CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8'}30` }}>
                {r.confidence === 'high' ? <><Star size={9}/> High confidence</>
                : r.confidence === 'medium' ? <>◎ Medium confidence</>
                : <>○ Low confidence</>}
              </span>
            </div>

            <div style={{ textAlign:'center', padding:'10px 0 18px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'0.12em' }}>Recommended selling price</p>
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:6 }}>
                <p style={{ fontSize:58, fontWeight:900, color:'#db142e', margin:0, letterSpacing:'-0.05em', lineHeight:1 }}>
                  {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:0,maximumFractionDigits:3}).format(r.suggested_price)}
                </p>
                <p style={{ fontSize:20, fontWeight:800, color:'rgba(219,20,46,0.7)', margin:0 }}>TND</p>
              </div>
              {r.market_avg_price > 0 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:8, padding:'4px 12px', borderRadius:999,
                  background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  <Globe size={10} style={{ color:muted }} />
                  <span style={{ fontSize:10, color:muted }}>
                    Market avg: <strong style={{ color: dark?'rgba(255,255,255,0.7)':'#555' }}>
                      {new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(r.market_avg_price)} TND
                    </strong>
                  </span>
                  <span style={{ fontSize:10, fontWeight:800,
                    color: POSITIONING_COLORS[r.market_positioning] ?? '#6b7280' }}>
                    {r.market_positioning === 'underpriced' ? `↓ ${Math.abs(ctx.market_report?.positioning_pct ?? 0)}% below`
                    : r.market_positioning === 'overpriced'  ? `↑ ${Math.abs(ctx.market_report?.positioning_pct ?? 0)}% above`
                    : '✓ Competitive'}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, borderTop:'1px solid rgba(219,20,46,0.12)', paddingTop:16 }}>
              {([
                { label:'Competitive', price:r.competitive_price,    color:'#3b82f6', icon:'⚖️', desc:'Market match' },
                { label:'Premium',     price:r.premium_price,        color:'#8b5cf6', icon:'👑', desc:'Top position' },
                { label:'Floor',       price:r.min_profitable_price, color:'#10b981', icon:'🛡️', desc:'Never below' },
              ] as const).map(({ label, price, color, icon, desc }) => (
                <div key={label} style={{ background: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', borderRadius:12, padding:'10px', textAlign:'center' }}>
                  <p style={{ fontSize:14, margin:'0 0 3px' }}>{icon}</p>
                  <p style={{ fontSize:15, fontWeight:900, color, margin:'0 0 2px', letterSpacing:'-0.02em' }}>
                    {new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(price)} TND
                  </p>
                  <p style={{ fontSize:9, color:muted, margin:'0 0 1px', fontWeight:700, textTransform:'uppercase' }}>{label}</p>
                  <p style={{ fontSize:9, color:muted, margin:0, opacity:0.7 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {([
              { icon:'🎯', label:'Strategy',   val:r.strategy },
              { icon:'📏', label:'Safe zone',  val:`${new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(r.min_price)} → ${new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(r.max_price)} TND` },
              { icon:'⚡', label:'Risk level', val: r.risk.charAt(0).toUpperCase() + r.risk.slice(1) },
            ] as const).map(({ icon, label, val }) => (
              <div key={label} style={{ background:cardBg, borderRadius:14, border:`1px solid ${border}`, padding:'12px 14px' }}>
                <p style={{ fontSize:14, margin:'0 0 4px' }}>{icon}</p>
                <p style={{ fontSize:12, fontWeight:800, color:text, margin:'0 0 2px', lineHeight:1.3 }}>{val}</p>
                <p style={{ fontSize:9, fontWeight:700, color:muted, margin:0, textTransform:'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'16px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
              <Brain size={15} style={{ color:'#db142e' }} />
            </div>
            <div>
              <p style={{ fontSize:11, fontWeight:900, color:'#db142e', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Verdict</p>
              <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.7, fontWeight:500 }}>{r.reasoning}</p>
            </div>
          </div>

          {ctx.market_report && (
            <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
              <MarketIntelPanel report={ctx.market_report} dataSource={(ctx.market_report as any).data_source} r={r} dark={dark} />
            </div>
          )}

          {(r.overpriced_warning || r.opportunity_note) && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {r.overpriced_warning && (
                <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:14, padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
                  <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.8)':'#444', margin:0, lineHeight:1.6 }}>{r.overpriced_warning}</p>
                </div>
              )}
              {r.opportunity_note && (
                <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:14, padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
                  <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.8)':'#444', margin:0, lineHeight:1.6 }}>{r.opportunity_note}</p>
                </div>
              )}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns: r.psychological_tip && r.competitor_summary ? '1fr 1fr' : '1fr', gap:8 }}>
            {r.psychological_tip && (
              <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:14, padding:'13px 15px', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>🧲</span>
                <div>
                  <p style={{ fontSize:10, fontWeight:900, color:'#f59e0b', margin:'0 0 4px', textTransform:'uppercase' }}>Price tip</p>
                  <p style={{ fontSize:11, color: dark?'rgba(255,255,255,0.75)':'#555', margin:0, lineHeight:1.55 }}>{r.psychological_tip}</p>
                </div>
              </div>
            )}
            {r.competitor_summary && (
              <div style={{ background:cardBg, borderRadius:14, border:`1px solid ${border}`, padding:'13px 15px', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>🏪</span>
                <div>
                  <p style={{ fontSize:10, fontWeight:900, color:muted, margin:'0 0 4px', textTransform:'uppercase' }}>Market</p>
                  <p style={{ fontSize:11, color: dark?'rgba(255,255,255,0.75)':'#555', margin:0, lineHeight:1.55 }}>{r.competitor_summary}</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 2 — SALES PREDICTOR — UPGRADED WITH PRODUCT DNA STRIP
// ═════════════════════════════════════════════════════════════════════════════

// CHANGE 1: Only one SEASON_META — using DB slugs as keys
const ALL_SEASONS = [
  { value: 'all_seasons',    label: 'All Seasons',    emoji: '📅' },
  { value: 'summer',         label: 'Summer',         emoji: '☀️' },
  { value: 'winter',         label: 'Winter',         emoji: '❄️' },
  { value: 'spring',         label: 'Spring',         emoji: '🌸' },
  { value: 'autumn',         label: 'Autumn',         emoji: '🍂' },
  { value: 'ramadan',        label: 'Ramadan',        emoji: '🌙' },
  { value: 'eid_al_fitr',    label: 'Eid al-Fitr',   emoji: '🎉' },
  { value: 'eid_al_adha',    label: 'Eid al-Adha',   emoji: '🐑' },
  { value: 'back_to_school', label: 'Back to School', emoji: '📚' },
  { value: 'new_year',       label: 'New Year',       emoji: '🎆' },
] as const;

const SEASON_MAP = Object.fromEntries(ALL_SEASONS.map(s => [s.value, s]));

const SEASON_META: Record<string, { emoji: string; color: string; desc: string }> = {
  all_seasons:   { emoji: '📅', color: '#6b7280', desc: 'Regular period' },
  ramadan:       { emoji: '🌙', color: '#8b5cf6', desc: 'Peak demand' },
  eid_al_fitr:   { emoji: '🎉', color: '#f59e0b', desc: 'Shopping surge' },
  eid_al_adha:   { emoji: '🐑', color: '#10b981', desc: 'Gift buying' },
  summer:        { emoji: '☀️', color: '#f97316', desc: 'Holiday mood' },
  back_to_school:{ emoji: '📚', color: '#3b82f6', desc: 'School rush' },
  winter:        { emoji: '❄️', color: '#06b6d4', desc: 'Cold season' },
  spring:        { emoji: '🌸', color: '#ec4899', desc: 'New arrivals' },
  autumn:        { emoji: '🍂', color: '#a16207', desc: 'Harvest period' },
  new_year:      { emoji: '🎆', color: '#db142e', desc: 'Celebration surge' },
};
function SeasonSelector({
  productSeasons, selected, onChange, dark,
}: {
  productSeasons: string[]; selected: string[];
  onChange: (seasons: string[]) => void; dark: boolean;
}) {
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const toggle = (slug: string) => {
    if (slug === 'all_seasons') {
      onChange(selected.includes('all_seasons') ? [] : ['all_seasons']);
      return;
    }
    const without = selected.filter(s => s !== 'all_seasons');
    if (without.includes(slug)) {
      const next = without.filter(s => s !== slug);
      onChange(next.length > 0 ? next : []);
    } else {
      onChange([...without, slug]);
    }
  };
  const availableSeasons = productSeasons
    .map(slug => SEASON_MAP[slug as keyof typeof SEASON_MAP])
    .filter(Boolean);
  if (availableSeasons.length === 0) return null;
  if (availableSeasons.length === 1 && availableSeasons[0].value === 'all_seasons') return null;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <p style={{ fontSize:10, fontWeight:800, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Forecast for season
        </p>
        {selected.length > 0 && (
          <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.25)', color:'#f87171' }}>
            {selected.length} selected
          </span>
        )}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {availableSeasons.map(season => {
          const isSelected = selected.includes(season.value);
          const meta = SEASON_META[season.value] ?? { emoji:'📅', color:'#6b7280' };
          return (
            <button key={season.value} onClick={() => toggle(season.value)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, border: isSelected ? `1.5px solid ${meta.color}` : `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: isSelected ? `${meta.color}18` : (dark ? 'rgba(255,255,255,0.04)' : '#f8fafc'), cursor:'pointer', fontSize:12, fontWeight: isSelected ? 800 : 600, color: isSelected ? meta.color : muted, transition:'all 0.15s ease', outline:'none' }}>
              <span style={{ fontSize:14 }}>{season.emoji}</span>
              {season.label}
              {isSelected && <span style={{ width:6, height:6, borderRadius:'50%', background:meta.color, flexShrink:0 }} />}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p style={{ fontSize:10, color: dark ? 'rgba(255,255,255,0.3)' : '#aaa', margin:'6px 0 0', fontStyle:'italic' }}>
          No season selected — will forecast across all product seasons.
        </p>
      )}
    </div>
  );
}

function SeasonBreakdownPanel({ perSeasonData, dark }: {
  perSeasonData: Array<{ slug: string; label: string; effective_multiplier: number; multiplier_source: string; real_data_points: number; same_season_products: number }>;
  dark: boolean;
}) {
  if (!perSeasonData || perSeasonData.length < 2) return null;
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <p style={{ fontSize:10, fontWeight:800, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Per-season breakdown</p>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(perSeasonData.length, 3)}, 1fr)`, gap:8 }}>
        {perSeasonData.map(sd => {
          const meta = SEASON_META[sd.slug] ?? { emoji:'📅', color:'#6b7280' };
          const isReal = sd.multiplier_source === 'real_data';
          return (
            <div key={sd.slug} style={{ background: dark?'rgba(255,255,255,0.03)':'#f8fafc', borderRadius:12, border:`1px solid ${meta.color}22`, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ fontSize:18 }}>{meta.emoji}</span>
                <p style={{ fontSize:11, fontWeight:800, color:meta.color, margin:0 }}>{sd.label}</p>
              </div>
              <p style={{ fontSize:22, fontWeight:900, color:meta.color, margin:'0 0 4px', letterSpacing:'-0.03em' }}>×{sd.effective_multiplier.toFixed(2)}</p>
              <p style={{ fontSize:9, color:muted, margin:0, fontWeight:700, textTransform:'uppercase' }}>
                {isReal ? `✓ Real data (${sd.real_data_points} samples)` : '📊 Market baseline'}
              </p>
              {sd.same_season_products > 0 && (
                <p style={{ fontSize:9, color:muted, margin:'3px 0 0' }}>{sd.same_season_products} similar products</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlgorithmPanel({ algorithm, dark }: {
  algorithm: { base_monthly: number; season_multiplier: number; resilience_bonus?: number; momentum_factor: number; formula: string; total_real_data_points?: number };
  dark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const text  = dark ? '#fff' : '#111';
  return (
    <div style={{ borderRadius:12, border:'1px solid rgba(99,102,241,0.2)', overflow:'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background: dark?'rgba(99,102,241,0.06)':'rgba(99,102,241,0.04)', border:'none', cursor:'pointer', outline:'none' }}>
        <BarChart3 size={13} style={{ color:'#6366f1', flexShrink:0 }} />
        <p style={{ fontSize:10, fontWeight:800, color:'#6366f1', margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Algorithm transparency</p>
        <ChevronDown size={12} style={{ color:'#6366f1', marginLeft:'auto', transform: open?'rotate(180deg)':'none', transition:'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding:'12px 14px', background: dark?'rgba(255,255,255,0.02)':'#fafafa', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:text, background: dark?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.05)', padding:'8px 12px', borderRadius:8 }}>
            {algorithm.formula}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              { label:'Base monthly',      val: algorithm.base_monthly + ' units' },
              { label:'Season multiplier', val: '×' + algorithm.season_multiplier },
              { label:'Resilience bonus',  val: algorithm.resilience_bonus ? '×' + algorithm.resilience_bonus : '×1.0' },
              { label:'Momentum factor',   val: '×' + algorithm.momentum_factor },
              { label:'Real data samples', val: (algorithm.total_real_data_points ?? 0) + ' orders' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: dark?'rgba(255,255,255,0.03)':'#f1f5f9', borderRadius:8, padding:'6px 10px' }}>
                <p style={{ fontSize:9, fontWeight:700, color:muted, margin:'0 0 2px', textTransform:'uppercase' }}>{label}</p>
                <p style={{ fontSize:12, fontWeight:800, color:text, margin:0 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function MiniBarChart({ weeks, trend, dark }: {
  weeks: Array<{ week: string; predicted: number; baseline: number }>;
  trend: string; dark: boolean;
}) {
  const trendColor = TREND_COLORS[trend] ?? '#3b82f6';
  const maxVal = Math.max(...weeks.map(w => Math.max(w.predicted, w.baseline)), 1);

  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:80, padding:'0 4px' }}>
      {weeks.map((w, i) => {
        const predH   = Math.round((w.predicted / maxVal) * 72);
        const baseH   = Math.round((w.baseline  / maxVal) * 72);
        const isBest  = w.predicted === Math.max(...weeks.map(x => x.predicted));
        return (
          <div key={w.week} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:2, justifyContent:'flex-end', height:72, position:'relative' }}>
              <div style={{ position:'absolute', bottom:0, width:'60%', height:baseH, background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', borderRadius:'4px 4px 0 0', transition:'height 0.6s ease' }} />
              <div style={{ position:'absolute', bottom:0, width:'60%', height:predH,
                background: isBest ? trendColor : `${trendColor}80`,
                borderRadius:'4px 4px 0 0',
                boxShadow: isBest ? `0 0 8px ${trendColor}50` : 'none',
                transition:'height 0.8s ease',
                animation:`fadeIn ${0.3 + i * 0.1}s ease` }} />
              {w.predicted > 0 && (
                <span style={{ position:'absolute', top:-18, fontSize:10, fontWeight:900, color: isBest ? trendColor : dark?'rgba(255,255,255,0.5)':'#888' }}>
                  {w.predicted}
                </span>
              )}
            </div>
            <p style={{ fontSize:8, color: dark?'rgba(255,255,255,0.35)':'#aaa', margin:0, fontWeight:700, textAlign:'center' }}>
              W{i+1}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── NEW: Product DNA strip ────────────────────────────────────────────────
// Shows the enriched product context the AI received:
// subcategory, variant axes, top combos, info attributes
function ProductDNAStrip({ ctx, dark }: {
  ctx: {
    subcategory?: string | null;
    has_variants?: boolean;
    variant_axes?: string[];
    active_variants?: number;
    total_variants?: number;
    variant_price_min?: number | null;
    variant_price_max?: number | null;
    top_variant_sales?: Array<{ combo: string; units_sold: number; price: number }>;
    info_attributes?: Record<string, string>;
    stock_by_axis?: Record<string, Array<{ value: string; stock: number }>>;
  };
  dark: boolean;
}) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.03)' : '#fafafa';

  const hasInfo      = ctx.info_attributes && Object.keys(ctx.info_attributes).length > 0;
  const hasVariants  = ctx.has_variants;
  const topVariants  = ctx.top_variant_sales ?? [];
  const infoAttrs    = ctx.info_attributes   ?? {};
  const axes         = ctx.variant_axes      ?? [];

  // Stockout detection: any option with 0 stock
  const stockByAxis  = ctx.stock_by_axis     ?? {};
  const stockoutList: string[] = [];
  Object.entries(stockByAxis).forEach(([axisName, options]) => {
    options.forEach(opt => {
      if (opt.stock === 0) stockoutList.push(`${opt.value} (${axisName})`);
    });
  });

  return (
    <div style={{ background:subBg, borderRadius:14, border:`1px solid rgba(139,92,246,0.2)`, padding:'14px 16px', display:'flex', flexDirection:'column', gap:12, animation:'fadeIn 0.45s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:26, height:26, borderRadius:8, background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Layers size={12} style={{ color:'#8b5cf6' }} />
        </div>
        <p style={{ fontSize:10, fontWeight:900, color:'#8b5cf6', margin:0, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          Product DNA — used by AI
        </p>
        <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', color:'#8b5cf6' }}>
          🧬 Context
        </span>
      </div>

      {/* Row 1: Subcategory + variant axes */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {ctx.subcategory && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: dark?'rgba(139,92,246,0.1)':'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.22)', fontSize:10, fontWeight:700, color:'#8b5cf6' }}>
            📂 {ctx.subcategory}
          </span>
        )}
        {hasVariants && axes.length > 0 && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: dark?'rgba(59,130,246,0.1)':'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.22)', fontSize:10, fontWeight:700, color:'#3b82f6' }}>
            🎨 {axes.join(' × ')}
          </span>
        )}
        {hasVariants && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: dark?'rgba(16,185,129,0.08)':'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', fontSize:10, fontWeight:700, color:'#10b981' }}>
            🔀 {ctx.active_variants}/{ctx.total_variants} variants active
          </span>
        )}
        {!hasVariants && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: dark?'rgba(107,114,128,0.1)':'rgba(107,114,128,0.07)', border:'1px solid rgba(107,114,128,0.2)', fontSize:10, fontWeight:700, color:'#6b7280' }}>
            📦 Simple product
          </span>
        )}
        {/* Price range */}
        {hasVariants && ctx.variant_price_min != null && ctx.variant_price_max != null && ctx.variant_price_min !== ctx.variant_price_max && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background: dark?'rgba(245,158,11,0.08)':'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', fontSize:10, fontWeight:700, color:'#f59e0b' }}>
            💰 {new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(ctx.variant_price_min)}–{new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(ctx.variant_price_max)} TND range
          </span>
        )}
      </div>

      {/* Row 2: Info attributes (brand, material, gender…) */}
      {hasInfo && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {Object.values(infoAttrs).map((val, i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, background: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', border:`1px solid ${border}`, fontSize:10, fontWeight:600, color: dark?'rgba(255,255,255,0.7)':'#444' }}>
              <Tag size={9} style={{ opacity:0.6 }} />
              {val}
            </span>
          ))}
        </div>
      )}

      {/* Row 3: Top-selling variant combos */}
      {topVariants.length > 0 && (
        <div>
          <p style={{ fontSize:9, fontWeight:800, color:muted, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            🔥 Top-selling combos
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {topVariants.slice(0, 3).map((v, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background: i === 0 ? (dark?'rgba(16,185,129,0.08)':'rgba(16,185,129,0.05)') : 'transparent', border: i === 0 ? '1px solid rgba(16,185,129,0.2)' : `1px solid ${border}` }}>
                <span style={{ fontSize:11, minWidth:16, textAlign:'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </span>
                <p style={{ fontSize:10, fontWeight:700, color: i === 0 ? '#10b981' : (dark?'rgba(255,255,255,0.7)':'#444'), margin:0, flex:1 }}>
                  {v.combo}
                </p>
                <span style={{ fontSize:10, fontWeight:900, color: i === 0 ? '#10b981' : muted }}>
                  {v.units_sold} units
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Stockout warning */}
      {stockoutList.length > 0 && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={12} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }} />
          <p style={{ fontSize:10, fontWeight:700, color:'#ef4444', margin:0, lineHeight:1.4 }}>
            Stockout detected: {stockoutList.slice(0, 4).join(', ')}{stockoutList.length > 4 ? ` +${stockoutList.length - 4} more` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function SalesPredictorTool({ products, dark, initialProductId }: { products: Array<{ id:number; name:string }>; dark:boolean; initialProductId?: number }) {
  const [selectedId,     setSelectedId]     = useState<number|null>(initialProductId ?? null);
  const [productSeasons, setProductSeasons] = useState<string[]>([]);
  const [targetSeasons,  setTargetSeasons]  = useState<string[]>([]);
  const [result,         setResult]         = useState<{ ai_result: SalesPredictorResult; data_context: any }|null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string|null>(null);

  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  useEffect(() => {
    if (!initialProductId || products.length === 0) return;
    if (products.find(p => p.id === initialProductId)) setSelectedId(initialProductId);
  }, [initialProductId, products]);

  useEffect(() => {
    if (!selectedId) { setProductSeasons([]); setTargetSeasons([]); setResult(null); }
  }, [selectedId]);

  useEffect(() => {
    if (result?.data_context?.product_seasons) {
      const ps: string[] = result.data_context.product_seasons;
      setProductSeasons(ps);
      setTargetSeasons(prev =>
        prev.filter(s => ps.includes(s)).length > 0 ? prev.filter(s => ps.includes(s)) : ps
      );
    }
  }, [result]);

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await sellerAiApi.salesPredictor(selectedId, targetSeasons);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const r   = result?.ai_result   ?? null;
  const ctx = result?.data_context ?? null;
  const primarySeason = ctx?.season ?? 'all_seasons';
  const sm = SEASON_META[primarySeason] ?? SEASON_META['all_seasons'];
  const trendColor = r ? (TREND_COLORS[r.trend] ?? '#3b82f6') : '#3b82f6';
  const confColor  = r ? (CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8') : '#94a3b8';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes countUp{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* ── Input card ── */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingUp size={15} style={{ color:'#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontWeight:900, fontSize:13, color:text, margin:0 }}>Sales Forecast</p>
              <p style={{ fontSize:10, color:muted, margin:0 }}>AI-powered · Season-aware · Variant intelligence</p>
            </div>
          </div>
          <AiTag />
        </div>

        <ProdSelect products={products} value={selectedId} onChange={id => { setSelectedId(id); setResult(null); setTargetSeasons([]); setProductSeasons([]); }} dark={dark} />

        {productSeasons.length > 0 && !(productSeasons.length === 1 && productSeasons[0] === 'all_seasons') && (
          <div style={{ padding:'12px 14px', borderRadius:12, background: dark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)', border:`1px solid ${border}` }}>
            <SeasonSelector productSeasons={productSeasons} selected={targetSeasons} onChange={setTargetSeasons} dark={dark} />
          </div>
        )}

        {!selectedId && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:dark?'rgba(59,130,246,0.06)':'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)' }}>
            <Info size={13} style={{ color:'#3b82f6', flexShrink:0 }} />
            <p style={{ fontSize:11, color:muted, margin:0, lineHeight:1.5 }}>Select a product to see its declared seasons and forecast demand.</p>
          </div>
        )}

        <RunBtn onClick={run} loading={loading} label="Predict Sales" icon={TrendingUp} />
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:0, fontWeight:600 }}>{error}</p>}
      </div>

      {/* ── Season badge ── */}
      {ctx?.season_label && !loading && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:dark?'rgba(139,92,246,0.08)':'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.2)', animation:'fadeIn 0.3s ease' }}>
          <span style={{ fontSize:18 }}>{ctx.is_multi_season ? '🌐' : (SEASON_META[ctx.season]?.emoji ?? '📅')}</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:10, fontWeight:800, color:'#8b5cf6', margin:'0 0 1px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {ctx.is_multi_season ? 'Multi-season forecast' : 'Product season'}
            </p>
            <p style={{ fontSize:12, fontWeight:700, color:text, margin:0 }}>{ctx.season_label}</p>
          </div>
          {ctx.is_multi_season && (
            <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', color:'#8b5cf6' }}>
              {ctx.target_seasons?.length} seasons combined
            </span>
          )}
          <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', color:'#8b5cf6' }}>Set on product</span>
        </div>
      )}

      {/* ── Context strip ── */}
      {ctx !== null && !loading && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px', animation:'fadeIn 0.4s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {([
              { emoji:'📦', label:'Avg/Month', val: ctx.avg_monthly_sales > 0 ? ctx.avg_monthly_sales : '—' },
              { emoji:'📅', label:'Last Month', val: ctx.last_month_sales > 0 ? ctx.last_month_sales : '—' },
              { emoji:'🏦', label:'Stock',      val: ctx.current_stock },
              { emoji:'👁️', label:'Views',      val: ctx.views > 0 ? ctx.views : '—' },
              { emoji:'🔄', label:'Conv. Rate', val: ctx.conversion_rate > 0 ? ctx.conversion_rate + '%' : '—' },
            ] as const).map(({ emoji, label, val }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <p style={{ fontSize:14, margin:'0 0 2px' }}>{emoji}</p>
                <p style={{ fontSize:15, fontWeight:900, color:text, margin:'0 0 1px' }}>{val}</p>
                <p style={{ fontSize:9, color:muted, margin:0, fontWeight:600 }}>{label}</p>
              </div>
            ))}
          </div>
          {ctx.momentum && (
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:muted }}>Trend:</span>
              <span style={{ fontSize:10, fontWeight:900, color: ctx.momentum==='growing'?'#10b981':ctx.momentum==='declining'?'#ef4444':'#6b7280' }}>
                {ctx.momentum==='growing'?'📈 Growing':ctx.momentum==='declining'?'📉 Declining':'➡️ Stable'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Product DNA ── */}
      {ctx !== null && !loading && <ProductDNAStrip ctx={ctx} dark={dark} />}

      {/* ── Results ── */}
      {!loading && r !== null && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'slideUp 0.5s ease' }}>

          <div style={{ background:`linear-gradient(145deg, ${trendColor}14 0%, ${trendColor}04 100%)`, borderRadius:20, border:`1px solid ${trendColor}30`, padding:'22px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`${trendColor}08` }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:22 }}>{ctx?.is_multi_season ? '🌐' : sm.emoji}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:900, color:sm.color, margin:0 }}>{ctx?.season_label ?? 'Sales'} Forecast</p>
                  <p style={{ fontSize:10, color:muted, margin:0 }}>{ctx?.is_multi_season ? 'Combined season intelligence' : sm.desc}</p>
                </div>
              </div>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:999, background:`${confColor}18`, color:confColor, border:`1px solid ${confColor}30` }}>
                {r.confidence==='high'?'✓ High':r.confidence==='medium'?'◎ Medium':'○ Low'} confidence
              </span>
            </div>
            <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'0.12em' }}>Predicted units next month</p>
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:6 }}>
                <p style={{ fontSize:64, fontWeight:900, color:trendColor, margin:0, letterSpacing:'-0.05em', lineHeight:1, animation:'countUp 0.8s ease' }}>{r.predicted_units}</p>
                <p style={{ fontSize:16, fontWeight:700, color:`${trendColor}80`, margin:0 }}>units</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:8 }}>
                <span style={{ fontSize:13, fontWeight:900, color:trendColor }}>{r.growth_pct >= 0 ? '+' : ''}{r.growth_pct}%</span>
                <span style={{ fontSize:11, color:muted }}>vs monthly average</span>
                <span style={{ fontSize:11, fontWeight:800, color: r.trend==='up'?'#10b981':r.trend==='down'?'#ef4444':'#6b7280' }}>
                  {r.trend==='up'?'↑ Trending up':r.trend==='down'?'↓ Trending down':'→ Stable'}
                </span>
              </div>
            </div>
            {r.weekly_breakdown?.length === 4 && (
              <div style={{ borderTop:`1px solid ${trendColor}20`, paddingTop:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Weekly breakdown</p>
                  {r.best_selling_week && <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${trendColor}18`, color:trendColor, border:`1px solid ${trendColor}30` }}>🔥 Peak: {r.best_selling_week}</span>}
                </div>
                <MiniBarChart weeks={r.weekly_breakdown} trend={r.trend} dark={dark} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:8 }}>
                  {r.weekly_breakdown.map((w, i) => {
                    const isBest = w.week === r.best_selling_week;
                    return (
                      <div key={w.week} style={{ textAlign:'center', padding:'6px 4px', borderRadius:8, background:isBest?`${trendColor}10`:'transparent', border:isBest?`1px solid ${trendColor}25`:'1px solid transparent' }}>
                        <p style={{ fontSize:12, fontWeight:900, color:isBest?trendColor:text, margin:'0 0 1px' }}>{w.predicted}</p>
                        <p style={{ fontSize:8, color:muted, margin:0 }}>W{i+1} · base:{w.baseline}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {ctx?.per_season_data && ctx.per_season_data.length > 1 && (
            <SeasonBreakdownPanel perSeasonData={ctx.per_season_data} dark={dark} />
          )}

          <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'14px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:9, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Brain size={14} style={{ color:'#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:900, color:'#3b82f6', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Verdict</p>
              <p style={{ fontSize:12, color:dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.65, fontWeight:500 }}>{r.key_factor}</p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:dark?'rgba(16,185,129,0.07)':'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:16, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:20 }}>📦</span>
                <p style={{ fontSize:11, fontWeight:900, color:'#10b981', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Stock Target</p>
              </div>
              <p style={{ fontSize:28, fontWeight:900, color:'#10b981', margin:'0 0 4px', letterSpacing:'-0.03em' }}>{r.stock_recommendation || r.predicted_units + ' units'}</p>
              <p style={{ fontSize:10, color:muted, margin:0, lineHeight:1.5 }}>{r.advice}</p>
            </div>
            {r.opportunity && (
              <div style={{ background:dark?'rgba(245,158,11,0.07)':'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:16, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>💡</span>
                  <p style={{ fontSize:11, fontWeight:900, color:'#f59e0b', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Opportunity</p>
                </div>
                <p style={{ fontSize:12, color:dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.6, fontWeight:500 }}>{r.opportunity}</p>
              </div>
            )}
          </div>

          {r.promotion_ideas?.length > 0 && (
            <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:18 }}>🚀</span>
                <p style={{ fontSize:11, fontWeight:900, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Promotion Ideas</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {r.promotion_ideas.map((idea, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10, background:subBg, border:`1px solid ${border}` }}>
                    <span style={{ fontSize:14, minWidth:22, textAlign:'center' }}>{i===0?'🥇':i===1?'🥈':'🥉'}</span>
                    <p style={{ fontSize:12, color:dark?'rgba(255,255,255,0.8)':'#333', margin:0, lineHeight:1.55, fontWeight:500 }}>{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(r.risk_factors?.length ?? 0) > 0 && (
            <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:16 }}>⚠️</span>
                <p style={{ fontSize:10, fontWeight:900, color:'#ef4444', margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Watch Out For</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {r.risk_factors.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ fontSize:11, color:'#ef4444', flexShrink:0, marginTop:1 }}>→</span>
                    <p style={{ fontSize:12, color:dark?'rgba(255,255,255,0.75)':'#444', margin:0, lineHeight:1.5 }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ctx?.algorithm && <AlgorithmPanel algorithm={ctx.algorithm} dark={dark} />}

        </div>
      )}
    </div>
  );
}
// ═════════════════════════════════════════════════════════════════════════════
// TOOL 3 — DESCRIPTION GENERATOR — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function DescriptionGeneratorTool({ products, dark, initialProductId }: { products: Array<{ id:number; name:string }>; dark:boolean; initialProductId?: number }) {
  const [selectedId, setSelectedId] = useState<number|null>(initialProductId ?? null);
  const [tone,       setTone]       = useState('professional');
  const [lang,       setLang]       = useState('fr');
  const [result,     setResult]     = useState<{ ai_result: DescriptionResult; data_context: any }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);
  useEffect(() => {
  if (!initialProductId || products.length === 0) return;
  const found = products.find(p => p.id === initialProductId);
  if (found) setSelectedId(initialProductId);
}, [initialProductId, products]);
  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try { const res = await sellerAiApi.descriptionGenerator(selectedId, tone, lang); setResult(res.data); }
    catch (e: any) { setError(e.message ?? 'Generation failed'); }
    finally { setLoading(false); }
  };

  const r = result?.ai_result ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>Generate Product Content</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Tone</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {TONES.map(t => <button key={t} onClick={() => setTone(t)} style={{ padding:'5px 10px', borderRadius:999, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background: tone===t?'rgba(219,20,46,0.15)':subBg, color: tone===t?'#f87171':muted, outline: tone===t?'1px solid rgba(219,20,46,0.35)':'1px solid transparent', textTransform:'capitalize' }}>{t}</button>)}
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Language</p>
              <div style={{ display:'flex', gap:5 }}>
                {LANGS.map(l => <button key={l.value} onClick={() => setLang(l.value)} style={{ padding:'5px 10px', borderRadius:999, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background: lang===l.value?'rgba(59,130,246,0.15)':subBg, color: lang===l.value?'#60a5fa':muted, outline: lang===l.value?'1px solid rgba(59,130,246,0.35)':'1px solid transparent' }}>{l.label}</button>)}
              </div>
            </div>
          </div>
          <RunBtn onClick={run} loading={loading} label="Generate Content" icon={FileText} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>
      {r !== null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(16,185,129,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {[{ key:'title', label:'SEO TITLE' },{ key:'short_description', label:'SHORT DESCRIPTION' },{ key:'description', label:'FULL DESCRIPTION' }].map(({ key, label }) => (
            <div key={key} style={{ background:subBg, borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', gap:10 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 4px', textTransform:'uppercase' }}>{label}</p>
                <p style={{ fontSize: key==='title'?14:12, fontWeight: key==='title'?800:400, color:text, margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{(r as any)[key]}</p>
              </div>
              <CopyBtn text={(r as any)[key]} dark={dark} />
            </div>
          ))}
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>SEO KEYWORDS</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(r.keywords ?? []).map((kw, i) => <span key={i} style={{ padding:'4px 10px', borderRadius:999, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', fontSize:11, fontWeight:700, color:'#60a5fa' }}>{kw}</span>)}
            </div>
          </div>
          <Field dark={dark} label="Meta Title"       value={r.meta_title} />
          <Field dark={dark} label="Meta Description" value={r.meta_description} />
          <Field dark={dark} label="Call to Action"   value={r.call_to_action} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 4 — BUNDLE RECOMMENDER — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function BundleProductChip({ name, imageUrl, dark }: { name: string; imageUrl: string | null | undefined; dark: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const showImage = !!imageUrl && !imgErr;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px 4px 4px', borderRadius:999, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, fontWeight:700, color:'#fbbf24' }}>
      <span style={{ width:24, height:24, borderRadius:'50%', overflow:'hidden', background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {showImage ? <img src={imageUrl as string} alt={name} onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /> : <Package size={12} style={{ color:'#fbbf24', opacity:0.7 }} />}
      </span>
      {name}
    </span>
  );
}

function BundleRecommenderTool({ products, dark, initialProductId }: { products: Array<{ id:number; name:string }>; dark:boolean; initialProductId?: number }) {
  const [selectedId, setSelectedId] = useState<number|null>(initialProductId ?? null);
  const [mode,        setMode]        = useState<'bundle'|'related'>('bundle');
  const [discountPct, setDiscountPct] = useState(10);
  const [result,      setResult]      = useState<{ ai_result: RecommenderResult; data_context: any }|null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string|null>(null);

  useEffect(() => {
  if (!initialProductId || products.length === 0) return;
  const found = products.find(p => p.id === initialProductId);
  if (found) setSelectedId(initialProductId);
}, [initialProductId, products]);
  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try { const res = await sellerAiApi.recommender(selectedId, mode, discountPct); setResult(res.data); }
    catch (e: any) { setError(e.message ?? 'Recommendation failed'); }
    finally { setLoading(false); }
  };

  const r   = result?.ai_result ?? null;
  const ctx = result?.data_context ?? null;
  const coPurchased: any[] = ctx?.co_purchased ?? [];
  const productImages: Record<string, string | null> = ctx?.product_images ?? {};

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>Bundle & Recommendations</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <div style={{ display:'flex', gap:6 }}>
            {(['bundle','related'] as const).map(m => <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: mode===m?'rgba(219,20,46,0.15)':subBg, color: mode===m?'#f87171':muted, outline: mode===m?'1px solid rgba(219,20,46,0.35)':'1px solid transparent', textTransform:'capitalize' }}>{m==='bundle'?'📦 Bundle Suggestions':'🔗 Related Products'}</button>)}
          </div>
          {mode === 'bundle' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <p style={{ fontSize:10, fontWeight:700, color:muted, margin:0, textTransform:'uppercase' }}>Bundle Discount</p>
                <p style={{ fontSize:12, fontWeight:900, color:'#db142e', margin:0 }}>{discountPct}%</p>
              </div>
              <input type="range" min="5" max="30" value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} style={{ width:'100%', accentColor:'#db142e', cursor:'pointer' }} />
            </div>
          )}
          <RunBtn onClick={run} loading={loading} label="Generate Recommendations" icon={Package} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>
      {coPurchased.length > 0 && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>Real co-purchase data used</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {coPurchased.map((p: any) => <span key={p.id} style={{ padding:'3px 9px', borderRadius:999, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', fontSize:11, fontWeight:700, color:'#34d399' }}>{p.name} ×{p.co_count}</span>)}
          </div>
        </div>
      )}
      {r !== null && (r.bundles ?? []).map((bundle, i) => (
        <div key={i} style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(245,158,11,0.25)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:14, fontWeight:900, color:text, margin:0 }}>{bundle.name}</p>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', fontSize:11, fontWeight:800, color:'#34d399' }}>{bundle.est_uplift}</span>
              <span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.25)', fontSize:11, fontWeight:800, color:'#f87171' }}>{bundle.display_label}</span>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {(bundle.products ?? []).map((name, j) => <BundleProductChip key={j} name={name} imageUrl={productImages[name]} dark={dark} />)}
          </div>
          <Field dark={dark} label="Why it works"      value={bundle.reason} />
          <Field dark={dark} label="Discount Strategy" value={bundle.suggested_price_reduction} />
        </div>
      ))}
      {r !== null && r.recommendations != null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(59,130,246,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {r.placement_strategy != null && <Field dark={dark} label="Placement Strategy" value={r.placement_strategy} />}
          {r.best_time_to_show  != null && <Field dark={dark} label="Best Time to Show"  value={r.best_time_to_show} />}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {r.recommendations.map((rec, i) => (
              <div key={i} style={{ background: dark?'rgba(255,255,255,0.04)':'#f8fafc', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#60a5fa', flexShrink:0, fontSize:13, fontWeight:900 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:text, margin:'0 0 3px' }}>{rec.product_name}</p>
                  <p style={{ fontSize:11, color:muted, margin:'0 0 6px', lineHeight:1.4 }}>{rec.reason}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(59,130,246,0.1)', fontSize:10, fontWeight:700, color:'#60a5fa' }}>{rec.placement}</span>
                    <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(16,185,129,0.1)', fontSize:10, fontWeight:700, color:'#34d399' }}>CTR: {rec.est_click_rate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

const TOOLS = [
  { key:'price',       label:'Price',       icon:DollarSign, accent:'#db142e' },
  { key:'sales',       label:'Sales',       icon:TrendingUp, accent:'#3b82f6' },
  { key:'description', label:'Description', icon:FileText,   accent:'#10b981' },
  { key:'bundles',     label:'Bundles',     icon:Package,    accent:'#f59e0b' },
];

export default function AIToolsPanel({  dark,
  initialTab,
  initialProductId,
  autorun = false,}: { dark: boolean;
  initialTab?: string;
  initialProductId?: number;
  autorun?: boolean; }) {

const validTab = ['price','sales','description','bundles'].includes(initialTab ?? '') ? initialTab! : 'price';
const [activeTool, setActiveTool] = useState(validTab);
  const [products,   setProducts]   = useState<Array<{ id:number; name:string }>>([]);

  const text  = dark ? '#fff' : '#111';
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';

  useEffect(() => {
    sellerProductsApi.getAll({ per_page: 50 })
      .then(res => {
        const list: any[] = res?.data?.data ?? res?.data ?? [];
        setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:'linear-gradient(135deg,rgba(219,20,46,0.08) 0%,rgba(59,130,246,0.04) 100%)', border:'1px solid rgba(219,20,46,0.2)', borderRadius:18, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(219,20,46,0.15)', border:'1px solid rgba(219,20,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#db142e' }}>
            <Brain size={18} />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:900, color:text, margin:'0 0 2px' }}>AI Business Tools</p>
            <p style={{ fontSize:11, color:muted, margin:0, fontWeight:500 }}>Powered by real data from your store</p>
          </div>
        </div>
        <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(219,20,46,0.12)', border:'1px solid rgba(219,20,46,0.3)', fontSize:10, fontWeight:800, color:'#f87171' }}>🔴 Red Pepper</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.key;
          return (
            <button key={tool.key} onClick={() => setActiveTool(tool.key)} style={{ padding:'10px 8px', borderRadius:12, cursor:'pointer', border:'none', background: isActive?`${tool.accent}18`:(dark?'rgba(255,255,255,0.04)':'#f8fafc'), outline: isActive?`1px solid ${tool.accent}44`:'1px solid transparent', display:'flex', flexDirection:'column', alignItems:'center', gap:5, transition:'all 0.2s ease' }}>
              <Icon size={16} style={{ color: isActive?tool.accent:muted }} />
              <span style={{ fontSize:10, fontWeight:700, color: isActive?text:muted }}>{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTool === 'price'       && <PriceOptimizerTool      products={products} dark={dark} initialProductId={initialProductId} autorun={autorun} />}
        {activeTool === 'sales'       && <SalesForecastDashboard   dark={dark} />}
        {activeTool === 'description' && <DescriptionGeneratorTool products={products} dark={dark} initialProductId={initialProductId} />}
        {activeTool === 'bundles'     && <BundleRecommenderTool    products={products} dark={dark} initialProductId={initialProductId} />}
      </div>
    </div>
  );
}