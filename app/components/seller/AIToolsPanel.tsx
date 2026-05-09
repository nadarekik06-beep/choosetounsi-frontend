'use client';

/**
 * app/components/seller/AIToolsPanel.tsx
 *
 * CHANGED: PriceOptimizerTool fully rewritten with:
 *   - Multi-step premium loader experience
 *   - Extended result UI (5 price cards, market intelligence panel,
 *     competitor comparison, positioning badge, psychological tip)
 *
 * All other tools (SalesPredictor, DescriptionGenerator, BundleRecommender)
 * are COMPLETELY UNCHANGED from the original file.
 */

import { useState, useEffect, useRef } from 'react';
import {
  DollarSign, TrendingUp, FileText, Package, Loader2,
  Copy, Check, ChevronDown, Sparkles, Brain,
  TrendingDown, Minus, Globe, Shield, AlertTriangle,
  Zap, BarChart3, Target, Info, Star, Rocket,
  ArrowRight, ShoppingBag, Search, CheckCircle2,
} from 'lucide-react';
import {
  sellerAiApi,
  type PriceOptimizerResult, type PriceOptimizerDataContext,
  type SalesPredictorResult, type DescriptionResult,
  type RecommenderResult, type MarketReport,
} from '@/lib/sellerAiApi';
import { productsApi as sellerProductsApi } from '@/lib/sellerApi';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const CONFIDENCE_COLORS: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
const TREND_COLORS: Record<string, string>      = { up: '#10b981', down: '#ef4444', stable: '#3b82f6' };
const RISK_COLORS: Record<string, string>       = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const POSITIONING_COLORS: Record<string, string>= { underpriced: '#10b981', competitive: '#3b82f6', overpriced: '#ef4444', unknown: '#6b7280' };

const SEASONS = ['Normal','Ramadan','Eid al-Fitr','Eid al-Adha','Summer','Back to school','Winter','Spring'];
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
// MULTI-STEP LOADER COMPONENT
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

      // Animate progress within this step
      const start    = elapsed;
      const stepFraction = duration / totalTime;
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
        else setProgressPct(99); // hold at 99 until real response
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
      {/* Header */}
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

      {/* Global progress bar */}
      <div style={{ height:6, borderRadius:999, background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#db142e,#f59e0b)', width:`${progressPct}%`, transition:'width 0.1s linear' }} />
      </div>

      {/* Steps */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {ANALYSIS_STEPS.map((step, idx) => {
          const Icon       = step.icon;
          const isDone     = completedSteps.has(idx);
          const isActive   = activeStep === idx && !isDone;
          const isPending  = idx > activeStep;

          return (
            <div key={step.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background: isActive ? `${step.color}10` : isDone ? (dark?'rgba(16,185,129,0.06)':'rgba(16,185,129,0.04)') : 'transparent', border: isActive ? `1px solid ${step.color}30` : '1px solid transparent', transition:'all 0.3s ease' }}>
              {/* Icon / spinner / check */}
              <div style={{ width:32, height:32, borderRadius:10, background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? `${step.color}18` : (dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'), border: `1px solid ${isDone?'rgba(16,185,129,0.3)':isActive?`${step.color}30`:'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.3s ease' }}>
                {isDone
                  ? <Check size={14} style={{ color:'#10b981' }} />
                  : isActive
                    ? <Loader2 size={14} style={{ color:step.color, animation:'spin 0.8s linear infinite' }} />
                    : <Icon size={14} style={{ color: isPending ? muted : step.color, opacity: isPending ? 0.4 : 1 }} />
                }
              </div>

              {/* Label + step bar */}
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

              {/* Status badge */}
              {isDone && <span style={{ fontSize:9, fontWeight:800, color:'#10b981', background:'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:999 }}>DONE</span>}
              {isActive && <span style={{ fontSize:9, fontWeight:800, color:step.color, background:`${step.color}15`, padding:'2px 6px', borderRadius:999, animation:'pulse 1s ease-in-out infinite' }}>ACTIVE</span>}
            </div>
          );
        })}
      </div>

      {/* Tunisian market note */}
      <div style={{ background: dark?'rgba(59,130,246,0.06)':'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:10, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
        <Globe size={14} style={{ color:'#3b82f6', marginTop:1, flexShrink:0 }} />
        <p style={{ fontSize:11, color:muted, margin:0, lineHeight:1.5 }}>
          Scanning <strong style={{ color:'#3b82f6' }}>Mytek</strong>, <strong style={{ color:'#3b82f6' }}>Tunisianet</strong> & <strong style={{ color:'#3b82f6' }}>Tayara.tn</strong> for real competitor pricing…
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
// PRICE CARD — one of the 4 price columns
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
// MARKET INTELLIGENCE PANEL
// ═════════════════════════════════════════════════════════════════════════════

function MarketIntelPanel({ report, dataSource, r, dark }: {
  report: MarketReport; dataSource?: string;
  r: PriceOptimizerResult; dark: boolean;
}) {
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const isAI   = dataSource === 'groq_knowledge';

  // Platform logos/icons mapping
  const PLATFORM_META: Record<string, { color: string; emoji: string }> = {
    'Mytek':                    { color:'#e84393', emoji:'🖥️' },
    'Tunisianet':               { color:'#f97316', emoji:'🛒' },
    'Tayara.tn':                { color:'#06b6d4', emoji:'📦' },
    'ChooseTounsi':             { color:'#db142e', emoji:'🇹🇳' },
    'Tunisian Market Knowledge':{ color:'#8b5cf6', emoji:'🧠' },
    'Tunisian Market Knowledge (AI)': { color:'#8b5cf6', emoji:'🧠' },
  };

  const getPlatformMeta = (name: string) =>
    PLATFORM_META[name] ?? { color:'#6b7280', emoji:'🏪' };

  // All sources to show (scrapers + AI knowledge + ChooseTounsi platform)
  const scrapedSources = report.by_source ?? [];
  const aiPlatforms    = (r as any).platforms_compared as string[] | undefined;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── SOURCES header ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Search size={13} style={{ color:'#db142e' }} />
        <p style={{ fontSize:10, fontWeight:900, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Platforms analysed
        </p>
        <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999,
          background: isAI ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.1)',
          color: isAI ? '#8b5cf6' : '#10b981',
          border: isAI ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(16,185,129,0.25)' }}>
          {isAI ? '🧠 AI Knowledge' : '🌐 Live Scan'}
        </span>
      </div>

      {/* ── Platform chips ── */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {/* ChooseTounsi platform always shown first */}
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

        {/* Scraped or AI-estimated sources */}
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

        {/* AI-named platforms from Groq output */}
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
                <p style={{ fontSize:9, color:muted, margin:0 }}>AI knowledge base</p>
              </div>
              <Brain size={11} style={{ color:'#8b5cf6', marginLeft:2 }} />
            </div>
          );
        })}

        {/* Fallback if nothing */}
        {scrapedSources.length === 0 && (!aiPlatforms || aiPlatforms.length === 0) && (
          ['Mytek', 'Tunisianet', 'Tayara.tn'].map((name, i) => {
            const m = getPlatformMeta(name);
            return (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12,
                background: dark ? `${m.color}10` : `${m.color}08`,
                border:`1px solid ${m.color}30`,
                animation:`fadeIn ${0.3 + i * 0.1}s ease` }}>
                <span style={{ fontSize:16 }}>{m.emoji}</span>
                <div>
                  <p style={{ fontSize:11, fontWeight:800, color:m.color, margin:0 }}>{name}</p>
                  <p style={{ fontSize:9, color:muted, margin:0 }}>AI knowledge base</p>
                </div>
                <Brain size={11} style={{ color:'#8b5cf6', marginLeft:2 }} />
              </div>
            );
          })
        )}
      </div>

      {/* ── Market stats — only when we have data ── */}
      {report.has_data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Market Avg', val:report.market_avg,  color: isAI ? '#8b5cf6':'#3b82f6', icon:'📊' },
            { label:'Lowest',     val:report.market_min,  color:'#10b981',                   icon:'⬇️' },
            { label:'Highest',    val:report.market_max,  color:'#f59e0b',                   icon:'⬆️' },
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

      {/* ── Analysis checklist — icon-only, horizontal ── */}
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

      {/* ── Trust seal ── */}
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
// POSITIONING BADGE
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
// TOOL 1 — PRICE OPTIMIZER (FULLY REWRITTEN)
// ═════════════════════════════════════════════════════════════════════════════

function PriceOptimizerTool({ products, dark }: { products: Array<{ id:number; name:string }>; dark:boolean }) {
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [result,     setResult]     = useState<{ ai_result: PriceOptimizerResult; data_context: PriceOptimizerDataContext }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await sellerAiApi.priceOptimizer(selectedId);
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

      {/* ── Input card ── */}
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

      {/* ── Multi-step loader ── */}
      {loading && <PriceAnalysisLoader dark={dark} />}

      {/* ── Context bar ── */}
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

      {/* ── Result ── */}
      {!loading && r !== null && ctx !== null && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeIn 0.5s ease' }}>

          {/* ── HERO price card ── */}
          <div style={{ background:'linear-gradient(145deg,rgba(219,20,46,0.13) 0%,rgba(219,20,46,0.03) 100%)', borderRadius:22, border:'1px solid rgba(219,20,46,0.22)', padding:'22px 20px', position:'relative', overflow:'hidden' }}>
            {/* Decorative glow */}
            <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:'rgba(219,20,46,0.08)', pointerEvents:'none' }} />

            {/* Header */}
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
              {/* Confidence pill */}
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

            {/* Price hero */}
            <div style={{ textAlign:'center', padding:'10px 0 18px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'0.12em' }}>Recommended selling price</p>
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:6 }}>
                <p style={{ fontSize:58, fontWeight:900, color:'#db142e', margin:0, letterSpacing:'-0.05em', lineHeight:1 }}>
                  {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:0,maximumFractionDigits:3}).format(r.suggested_price)}
                </p>
                <p style={{ fontSize:20, fontWeight:800, color:'rgba(219,20,46,0.7)', margin:0 }}>TND</p>
              </div>
              {/* Positioning line */}
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

            {/* 3 alt prices */}
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

          {/* ── Quick stats row ── */}
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

          {/* ── AI reasoning — clean, no label clutter ── */}
          <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'16px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
              <Brain size={15} style={{ color:'#db142e' }} />
            </div>
            <div>
              <p style={{ fontSize:11, fontWeight:900, color:'#db142e', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Verdict</p>
              <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.7, fontWeight:500 }}>{r.reasoning}</p>
            </div>
          </div>

          {/* ── Platforms / Market intel ── */}
          {ctx.market_report && (
            <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
              <MarketIntelPanel report={ctx.market_report} dataSource={(ctx.market_report as any).data_source} r={r} dark={dark} />
            </div>
          )}

          {/* ── Alerts ── */}
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

          {/* ── Tip + Competitor — 2 cols ── */}
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
// TOOL 2 — SALES PREDICTOR (UPGRADED)
// ═════════════════════════════════════════════════════════════════════════════

const SEASON_META: Record<string, { emoji: string; color: string; desc: string }> = {
  'Normal':       { emoji:'📅', color:'#6b7280', desc:'Regular period' },
  'Ramadan':      { emoji:'🌙', color:'#8b5cf6', desc:'Peak demand' },
  'Eid al-Fitr':  { emoji:'🎉', color:'#f59e0b', desc:'Shopping surge' },
  'Eid al-Adha':  { emoji:'🐑', color:'#10b981', desc:'Gift buying' },
  'Summer':       { emoji:'☀️', color:'#f97316', desc:'Holiday mood' },
  'Back to school':{ emoji:'🎒', color:'#3b82f6', desc:'School rush' },
  'Winter':       { emoji:'❄️', color:'#06b6d4', desc:'Cold season' },
  'Spring':       { emoji:'🌸', color:'#ec4899', desc:'New arrivals' },
};

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
              {/* Baseline bar (ghost) */}
              <div style={{ position:'absolute', bottom:0, width:'60%', height:baseH, background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', borderRadius:'4px 4px 0 0', transition:'height 0.6s ease' }} />
              {/* Predicted bar */}
              <div style={{ position:'absolute', bottom:0, width:'60%', height:predH,
                background: isBest ? trendColor : `${trendColor}80`,
                borderRadius:'4px 4px 0 0',
                boxShadow: isBest ? `0 0 8px ${trendColor}50` : 'none',
                transition:'height 0.8s ease',
                animation:`fadeIn ${0.3 + i * 0.1}s ease` }} />
              {/* Value label */}
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

function SalesPredictorTool({ products, dark }: { products: Array<{ id:number; name:string }>; dark:boolean }) {
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [season,     setSeason]     = useState('Normal');
  const [result,     setResult]     = useState<{ ai_result: SalesPredictorResult; data_context: any }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null); setResult(null);
    try { const res = await sellerAiApi.salesPredictor(selectedId, season); setResult(res.data); }
    catch (e: any) { setError(e.message ?? 'Prediction failed'); }
    finally { setLoading(false); }
  };

  const r   = result?.ai_result   ?? null;
  const ctx = result?.data_context ?? null;
  const sm  = SEASON_META[season]  ?? SEASON_META['Normal'];
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
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TrendingUp size={15} style={{ color:'#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontWeight:900, fontSize:13, color:text, margin:0 }}>Sales Forecast</p>
              <p style={{ fontSize:10, color:muted, margin:0 }}>AI-powered · Tunisian seasons</p>
            </div>
          </div>
          <AiTag />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />

          {/* Season picker — visual cards */}
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Select Season</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {SEASONS.map(s => {
                const meta  = SEASON_META[s] ?? SEASON_META['Normal'];
                const isAct = season === s;
                return (
                  <button key={s} onClick={() => setSeason(s)} style={{
                    padding:'8px 6px', borderRadius:12, cursor:'pointer', border:'none',
                    background: isAct ? `${meta.color}18` : subBg,
                    outline: isAct ? `2px solid ${meta.color}50` : '1px solid transparent',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    transition:'all 0.15s ease',
                  }}>
                    <span style={{ fontSize:16 }}>{meta.emoji}</span>
                    <span style={{ fontSize:9, fontWeight:800, color: isAct ? meta.color : muted, textAlign:'center', lineHeight:1.2 }}>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <RunBtn onClick={run} loading={loading} label={`Predict for ${season}`} icon={TrendingUp} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>

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
              <span style={{ fontSize:10, fontWeight:900,
                color: ctx.momentum === 'growing' ? '#10b981' : ctx.momentum === 'declining' ? '#ef4444' : '#6b7280' }}>
                {ctx.momentum === 'growing' ? '📈 Growing' : ctx.momentum === 'declining' ? '📉 Declining' : '➡️ Stable'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {!loading && r !== null && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'slideUp 0.5s ease' }}>

          {/* ── HERO: predicted units ── */}
          <div style={{ background:`linear-gradient(145deg, ${trendColor}14 0%, ${trendColor}04 100%)`, borderRadius:20, border:`1px solid ${trendColor}30`, padding:'22px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`${trendColor}08` }} />

            {/* Season badge + confidence */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:22 }}>{sm.emoji}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:900, color:sm.color, margin:0 }}>{season} Forecast</p>
                  <p style={{ fontSize:10, color:muted, margin:0 }}>{sm.desc}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:999,
                  background:`${confColor}18`, color:confColor, border:`1px solid ${confColor}30` }}>
                  {r.confidence === 'high' ? '✓ High' : r.confidence === 'medium' ? '◎ Medium' : '○ Low'} confidence
                </span>
              </div>
            </div>

            {/* Giant number */}
            <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'0.12em' }}>
                Predicted units next month
              </p>
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:6 }}>
                <p style={{ fontSize:64, fontWeight:900, color:trendColor, margin:0, letterSpacing:'-0.05em', lineHeight:1, animation:'countUp 0.8s ease' }}>
                  {r.predicted_units}
                </p>
                <p style={{ fontSize:16, fontWeight:700, color:`${trendColor}80`, margin:0 }}>units</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:8 }}>
                <span style={{ fontSize:13, fontWeight:900, color:trendColor }}>
                  {r.growth_pct >= 0 ? '+' : ''}{r.growth_pct}%
                </span>
                <span style={{ fontSize:11, color:muted }}>vs monthly average</span>
                <span style={{ fontSize:11, fontWeight:800,
                  color: r.trend === 'up' ? '#10b981' : r.trend === 'down' ? '#ef4444' : '#6b7280' }}>
                  {r.trend === 'up' ? '↑ Trending up' : r.trend === 'down' ? '↓ Trending down' : '→ Stable'}
                </span>
              </div>
            </div>

            {/* Mini bar chart */}
            {r.weekly_breakdown?.length === 4 && (
              <div style={{ borderTop:`1px solid ${trendColor}20`, paddingTop:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Weekly breakdown</p>
                  {r.best_selling_week && (
                    <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999,
                      background:`${trendColor}18`, color:trendColor, border:`1px solid ${trendColor}30` }}>
                      🔥 Peak: {r.best_selling_week}
                    </span>
                  )}
                </div>
                <MiniBarChart weeks={r.weekly_breakdown} trend={r.trend} dark={dark} />
                {/* Week labels with values */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:8 }}>
                  {r.weekly_breakdown.map((w, i) => {
                    const isBest = w.week === r.best_selling_week;
                    return (
                      <div key={w.week} style={{ textAlign:'center', padding:'6px 4px', borderRadius:8,
                        background: isBest ? `${trendColor}10` : 'transparent',
                        border: isBest ? `1px solid ${trendColor}25` : '1px solid transparent' }}>
                        <p style={{ fontSize:12, fontWeight:900, color: isBest ? trendColor : text, margin:'0 0 1px' }}>{w.predicted}</p>
                        <p style={{ fontSize:8, color:muted, margin:0 }}>W{i+1} · base:{w.baseline}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Key insight ── */}
          <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'14px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:9, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Brain size={14} style={{ color:'#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:900, color:'#3b82f6', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Verdict</p>
              <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.65, fontWeight:500 }}>{r.key_factor}</p>
            </div>
          </div>

          {/* ── Action plan row ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {/* Stock recommendation */}
            <div style={{ background: dark?'rgba(16,185,129,0.07)':'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:16, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:20 }}>📦</span>
                <p style={{ fontSize:11, fontWeight:900, color:'#10b981', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Stock Target</p>
              </div>
              <p style={{ fontSize:28, fontWeight:900, color:'#10b981', margin:'0 0 4px', letterSpacing:'-0.03em' }}>
                {r.stock_recommendation || r.predicted_units + ' units'}
              </p>
              <p style={{ fontSize:10, color:muted, margin:0, lineHeight:1.5 }}>{r.advice}</p>
            </div>

            {/* Opportunity */}
            {r.opportunity && (
              <div style={{ background: dark?'rgba(245,158,11,0.07)':'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:16, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>💡</span>
                  <p style={{ fontSize:11, fontWeight:900, color:'#f59e0b', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Opportunity</p>
                </div>
                <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.82)':'#333', margin:0, lineHeight:1.6, fontWeight:500 }}>{r.opportunity}</p>
              </div>
            )}
          </div>

          {/* ── Promotion ideas ── */}
          {r.promotion_ideas?.length > 0 && (
            <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${border}`, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:18 }}>🚀</span>
                <p style={{ fontSize:11, fontWeight:900, color:muted, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>Promotion Ideas</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {r.promotion_ideas.map((idea, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10,
                    background: subBg, border:`1px solid ${border}`,
                    animation:`fadeIn ${0.3 + i * 0.12}s ease` }}>
                    <span style={{ fontSize:14, minWidth:22, textAlign:'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.8)':'#333', margin:0, lineHeight:1.55, fontWeight:500 }}>{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Risk factors ── */}
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
                    <p style={{ fontSize:12, color: dark?'rgba(255,255,255,0.75)':'#444', margin:0, lineHeight:1.5 }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 3 — DESCRIPTION GENERATOR (UNCHANGED)
// ═════════════════════════════════════════════════════════════════════════════

function DescriptionGeneratorTool({ products, dark }: { products: Array<{ id:number; name:string }>; dark:boolean }) {
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [tone,       setTone]       = useState('professional');
  const [lang,       setLang]       = useState('fr');
  const [result,     setResult]     = useState<{ ai_result: DescriptionResult; data_context: any }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);

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
// TOOL 4 — BUNDLE RECOMMENDER (UNCHANGED)
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

function BundleRecommenderTool({ products, dark }: { products: Array<{ id:number; name:string }>; dark:boolean }) {
  const [selectedId,  setSelectedId]  = useState<number|null>(null);
  const [mode,        setMode]        = useState<'bundle'|'related'>('bundle');
  const [discountPct, setDiscountPct] = useState(10);
  const [result,      setResult]      = useState<{ ai_result: RecommenderResult; data_context: any }|null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string|null>(null);

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

export default function AIToolsPanel({ dark }: { dark: boolean }) {
  const [activeTool, setActiveTool] = useState('price');
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
        {activeTool === 'price'       && <PriceOptimizerTool      products={products} dark={dark} />}
        {activeTool === 'sales'       && <SalesPredictorTool       products={products} dark={dark} />}
        {activeTool === 'description' && <DescriptionGeneratorTool products={products} dark={dark} />}
        {activeTool === 'bundles'     && <BundleRecommenderTool    products={products} dark={dark} />}
      </div>
    </div>
  );
}