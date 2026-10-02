'use client';

/**
 * app/components/seller/AIToolsPanel.tsx — Outils IA: price optimizer, sales
 * forecast (SalesForecastDashboard), bundle recommender. (AI descriptions live in the product form.)
 */

import { useState, useEffect, useRef } from 'react';
import {
  DollarSign, TrendingUp, Package, Loader2,
  Check, ChevronDown, Sparkles, Brain,
  Globe, Shield,
  BarChart3, Target, Star, Rocket, Search, CheckCircle2,
} from 'lucide-react';

import {
  sellerAiApi,
  type PriceOptimizerResult, type PriceOptimizerDataContext,
  type RecommenderResult, type MarketReport,
} from '@/lib/sellerAiApi';
import { productsApi as sellerProductsApi } from '@/lib/sellerApi';
import SalesForecastDashboard from '@/app/seller/components/SalesForecastDashboard';
import { useLocale, useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';
import { ink } from '@/app/seller/ink';
import { useTheme } from '@/app/seller/SellerShell';

const CONFIDENCE_COLORS: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
const POSITIONING_COLORS: Record<string, string>= { underpriced: '#10b981', competitive: '#3b82f6', overpriced: '#ef4444', unknown: '#6b7280' };


/** Whole-number TND amount in the active locale. */
function useMoney0() {
  const { price } = useFormat();
  return (n: number) => price(n, { maximumFractionDigits: 0 });
}

// ─── Analysis steps for multi-step loader ────────────────────────────────────
const ANALYSIS_STEPS = [
  { id: 'internal',    icon: BarChart3, color: '#8b5cf6', duration: 800  },
  { id: 'market',      icon: Globe,     color: '#3b82f6', duration: 3500 },
  { id: 'competitors', icon: Target,    color: '#f59e0b', duration: 2000 },
  { id: 'normalizing', icon: Shield,    color: '#10b981', duration: 1200 },
  { id: 'strategy',    icon: TrendingUp,color: '#06b6d4', duration: 1000 },
  { id: 'ai',          icon: Brain,     color: '#db142e', duration: 1500 },
] as const;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AiTag() {
  const t = useTranslations('seller.aiTools');
  const { dark } = useTheme();
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.25)', fontSize:10, fontWeight:800, color:ink('#f87171', dark) }}>
      <Brain size={10} /> {t('aiPowered')}
    </span>
  );
}

function Field({ label, value, dark }: { label: string; value: string | number; dark: boolean }) {
  return (
    <div style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:10, fontWeight:700, color: dark ? 'rgba(255,255,255,0.55)' : '#5b6472', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:700, color: dark ? '#fff' : '#111', margin:0, lineHeight:1.5 }}>{value}</p>
    </div>
  );
}

function ProdSelect({ products, value, onChange, dark }: { products: Array<{ id:number; name:string }>; value: number|null; onChange:(id:number)=>void; dark:boolean }) {
  const selectBg  = dark ? '#1e2330' : '#f8fafc';
  const selectClr = dark ? '#ffffff' : '#111111';
  const optionBg  = dark ? '#1e2330' : '#ffffff';
  const t = useTranslations('seller.aiTools');
  return (
    <div style={{ position:'relative' }}>
      <select value={value ?? ''} onChange={e => onChange(Number(e.target.value))} style={{ width:'100%', padding:'10px 12px', paddingInlineEnd:36, borderRadius:10, border:`1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, background:selectBg, color:selectClr, fontSize:13, fontWeight:600, cursor:'pointer', appearance:'none', outline:'none', colorScheme: dark ? 'dark' : 'light' }}>
        <option value="" style={{ background:optionBg, color:selectClr }}>{t('selectProductOption')}</option>
        {products.map(p => <option key={p.id} value={p.id} style={{ background:optionBg, color:selectClr }}>{p.name}</option>)}
      </select>
      <ChevronDown size={14} style={{ position:'absolute', insetInlineEnd:12, top:'50%', transform:'translateY(-50%)', color:selectClr, pointerEvents:'none' }} />
    </div>
  );
}

function RunBtn({ onClick, loading, label, icon: Icon = Sparkles }: { onClick:()=>void; loading:boolean; label?:string; icon?: React.ElementType }) {
  const t = useTranslations('seller.aiTools');
  return (
    <button onClick={onClick} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background: loading ? 'rgba(219,20,46,0.4)' : 'linear-gradient(135deg,#db142e,#a00f22)', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(219,20,46,0.35)' }}>
      {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Icon size={14} />}
      {loading ? t('analyzing') : (label ?? t('analyze'))}
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
  const t = useTranslations('seller.aiTools.loader');

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
  const muted   = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const cardBg  = dark ? '#161b27' : '#ffffff';

  return (
    <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(219,20,46,0.2)', padding:'24px 22px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'rgba(219,20,46,0.12)', border:'1px solid rgba(219,20,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Brain size={18} style={{ color:'#db142e', animation:'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:'0 0 2px' }}>{t('title')}</p>
          <p style={{ fontSize:11, color:muted, margin:0 }}>{t('subtitle')}</p>
        </div>
        <div style={{ marginInlineStart:'auto', fontSize:24, fontWeight:900, color:'#db142e', letterSpacing:'-0.04em' }}>
          {progressPct}%
        </div>
      </div>

      <div style={{ height:6, borderRadius:999, background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', overflow:'hidden' }}>
        <div className="rtl-flip" style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#db142e,#f59e0b)', width:`${progressPct}%`, transition:'width 0.1s linear' }} />
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
                  ? <Check size={14} style={{ color:ink('#10b981', dark) }} />
                  : isActive
                    ? <Loader2 size={14} style={{ color:ink(step.color, dark), animation:'spin 0.8s linear infinite' }} />
                    : <Icon size={14} style={{ color: isPending ? muted : step.color, opacity: isPending ? 0.4 : 1 }} />
                }
              </div>

              <div style={{ flex:1 }}>
                <p style={{ fontSize:12, fontWeight:700, color: isDone ? ink('#10b981', dark) : isActive ? text : muted, margin:'0 0 4px', transition:'color 0.3s' }}>
                  {t(`steps.${step.id}`)}
                </p>
                {isActive && (
                  <div style={{ height:3, borderRadius:999, background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, background:step.color, width:'100%', animation:'stepProgress 0.8s ease-in-out infinite alternate' }} />
                  </div>
                )}
              </div>

              {isDone && <span style={{ fontSize:9, fontWeight:800, color:ink('#10b981', dark), background:'rgba(16,185,129,0.1)', padding:'2px 6px', borderRadius:999 }}>{t('done')}</span>}
              {isActive && <span style={{ fontSize:9, fontWeight:800, color:ink(step.color, dark), background:`${step.color}15`, padding:'2px 6px', borderRadius:999, animation:'pulse 1s ease-in-out infinite' }}>{t('active')}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ background: dark?'rgba(59,130,246,0.06)':'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:10, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
        <Globe size={14} style={{ color:ink('#3b82f6', dark), marginTop:1, flexShrink:0 }} />
        <p style={{ fontSize:11, color:muted, margin:0, lineHeight:1.5 }}>
  {t.rich('scanning', { b: (c) => <strong style={{ color:ink('#3b82f6', dark) }}>{c}</strong> })}
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
      <p style={{ fontSize:9, fontWeight:800, color: highlight ? accent : (dark?'rgba(255,255,255,0.55)':'#5b6472'), margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
      <p style={{ fontSize: highlight ? 20 : 16, fontWeight:900, color: highlight ? accent : (dark?'#fff':'#111'), margin:0, letterSpacing:'-0.03em' }}>
        {new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(price)}
        <span style={{ fontSize:10, fontWeight:700, marginInlineStart:3 }}>TND</span>
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
  const muted  = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const hasRealData = report.has_data && (dataSource === 'serper' || dataSource === 'cache');
  const t = useTranslations('seller.aiTools.market');
  const money0 = useMoney0();

  const PLATFORM_META: Record<string, { color: string; emoji: string }> = {
    'Mytek':                    { color:'#e84393', emoji:'🖥️' },
    'Tunisianet':               { color:ink('#f97316', dark), emoji:'🛒' },
    'Tayara.tn':                { color:ink('#06b6d4', dark), emoji:'📦' },
    'ChooseTounsi':             { color:'#db142e', emoji:'🇹🇳' },
    'Tunisian Market Knowledge':{ color:ink('#8b5cf6', dark), emoji:'🧠' },
    'Tunisian Market Knowledge (AI)': { color:ink('#8b5cf6', dark), emoji:'🧠' },
    'Google Tunisie':   { color:'#4285f4', emoji:'🔍' },
    'Tunisian Market':  { color:ink('#10b981', dark), emoji:'🏪' },
    'Facebook Market':  { color:'#1877f2', emoji:'📘' },
    'Scoop.tn':         { color:ink('#8b5cf6', dark), emoji:'🛍️' },
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
          {t('platforms')}
        </p>
      <span style={{ marginInlineStart:'auto', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999,
  background: hasRealData ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
  color: hasRealData ? ink('#10b981', dark) : ink('#f59e0b', dark),
  border: hasRealData ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.25)' }}>
  {report.has_data
    ? `✓ ${t('results', { count: report.data_points })}`
    : dataSource === 'none'
    ? `⚠ ${t('noData')}`
    : `⚠ ${t('searchUnavailable')}`}
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
              <p style={{ fontSize:9, color:muted, margin:0 }}>{t('platformData')}</p>
            </div>
            <CheckCircle2 size={12} style={{ color:ink('#10b981', dark), marginInlineStart:2 }} />
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
                <p style={{ fontSize:11, fontWeight:800, color:ink(m.color, dark), margin:0 }}>{src.source}</p>
                <p style={{ fontSize:9, color:muted, margin:0 }}>{t('sourceLine', { count: src.count, avg: money0(src.avg) })}</p>
              </div>
              <CheckCircle2 size={12} style={{ color:ink('#10b981', dark), marginInlineStart:2 }} />
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
        <p style={{ fontSize:11, fontWeight:800, color:ink(m.color, dark), margin:0 }}>{name}</p>
        <p style={{ fontSize:9, color:muted, margin:0 }}>{t('googleIndexed')}</p>
      </div>
      <CheckCircle2 size={12} style={{ color:ink('#10b981', dark), marginInlineStart:2 }} />
    </div>
  );
})}
        {scrapedSources.length === 0 && (!aiPlatforms || aiPlatforms.length === 0) && (
  <div style={{ padding:'12px 14px', borderRadius:12,
    background: dark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
    border:'1px solid rgba(245,158,11,0.18)' }}>
    <p style={{ fontSize:11, color:ink('#f59e0b', dark), margin:0, fontWeight:700 }}>
      ⚠ {t('noExternal')}
    </p>
  </div>
)}
      </div>

      {report.has_data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:t('avg'),     val:report.market_avg,  color: hasRealData ? ink('#10b981', dark) : ink('#f59e0b', dark), icon:'📊' },
            { label:t('lowest'),  val:report.market_min,  color: hasRealData ? ink('#10b981', dark) : ink('#f59e0b', dark), icon:'⬇️' },
            { label:t('highest'), val:report.market_max,  color: hasRealData ? ink('#10b981', dark) : ink('#f59e0b', dark), icon:'⬆️' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} style={{ background:subBg, borderRadius:12, padding:'12px', textAlign:'center', border:`1px solid ${border}` }}>
              <p style={{ fontSize:14, margin:'0 0 2px' }}>{icon}</p>
              <p style={{ fontSize:15, fontWeight:900, color, margin:'0 0 2px' }}>
                {money0(val)}
              </p>
              <p style={{ fontSize:9, fontWeight:700, color:muted, margin:0, textTransform:'uppercase' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {[
          { emoji:'💰', label:t('chips.benchmarked') },
          { emoji:'📈', label:t('chips.demand') },
          { emoji:'🎯', label:t('chips.margin') },
          { emoji:'🧮', label:t('chips.power') },
          { emoji:'✨', label:t('chips.charm') },
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
        <Shield size={18} style={{ color:ink('#10b981', dark), flexShrink:0 }} />
        <div>
          <p style={{ fontSize:11, fontWeight:900, color:ink('#10b981', dark), margin:'0 0 1px' }}>{t('verified')}</p>
          <p style={{ fontSize:10, color:muted, margin:0 }}>{t('verifiedSub')}</p>
        </div>
        <Star size={14} style={{ color:ink('#f59e0b', dark), marginInlineStart:'auto', flexShrink:0 }} />
      </div>
    </div>
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
  const t = useTranslations('seller.aiTools.price');
  const locale = useLocale();
  const { price, number } = useFormat();
  const money  = (n: number) => price(n, { maximumFractionDigits: 3 });
  const money0 = useMoney0();
  const { number: fmtNum } = useFormat();
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
  const muted  = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async (idOverride?: number) => {
  const targetId = typeof idOverride === 'number' ? idOverride : selectedId;
  if (!targetId) return;
  setLoading(true); setError(null); setResult(null);
  try {
    const res = await sellerAiApi.priceOptimizer(targetId, locale);
      setResult(res.data);
    } catch (e: any) {
      setError(e.message ?? t('failed'));
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
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>{t('selectProduct')}</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <RunBtn onClick={run} loading={loading} label={t('run')} icon={DollarSign} />
        </div>
        {error && <p style={{ color:ink('#ef4444', dark), fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>

      {loading && <PriceAnalysisLoader dark={dark} />}

      {!loading && ctx !== null && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px', animation:'fadeIn 0.4s ease' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{t('basedOn')}</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {([
              { label:t('ctx.current'),    val: money(ctx.current_price) },
              { label:t('ctx.units'),      val: number(ctx.total_units) },
              { label:t('ctx.conversion'), val: number(ctx.conversion_rate / 100, { style:'percent', maximumFractionDigits:2 }) },
              { label:t('ctx.catAvg'),     val: ctx.category_avg > 0 ? money(ctx.category_avg) : t('na') },
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
            <div style={{ position:'absolute', top:-40, insetInlineEnd:-40, width:120, height:120, borderRadius:'50%', background:'rgba(219,20,46,0.08)', pointerEvents:'none' }} />

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:34, height:34, borderRadius:11, background:'rgba(219,20,46,0.15)', border:'1px solid rgba(219,20,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Rocket size={16} style={{ color:'#db142e' }} />
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:900, color:'#db142e', margin:0, letterSpacing:'0.04em' }}>{t('optimal')}</p>
                  <p style={{ fontSize:10, color:muted, margin:0 }}>{t('optimalSub')}</p>
                </div>
              </div>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:800,
                padding:'4px 11px', borderRadius:999,
                background: CONFIDENCE_COLORS[r.confidence] ? `${CONFIDENCE_COLORS[r.confidence]}18` : 'rgba(148,163,184,0.12)',
                color: CONFIDENCE_COLORS[r.confidence] ?? ink('#94a3b8', dark),
                border:`1px solid ${CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8'}30` }}>
                {r.confidence === 'high' ? <><Star size={9}/> {t('confidence.high')}</>
                : r.confidence === 'medium' ? <>◎ {t('confidence.medium')}</>
                : <>○ {t('confidence.low')}</>}
              </span>
            </div>

            <div style={{ textAlign:'center', padding:'10px 0 18px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'0.12em' }}>{t('recommended')}</p>
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:6 }}>
                <p style={{ fontSize:58, fontWeight:900, color:'#db142e', margin:0, letterSpacing:'-0.05em', lineHeight:1 }}>
                  {number(r.suggested_price, { minimumFractionDigits:0, maximumFractionDigits:3 })}
                </p>
                <p style={{ fontSize:20, fontWeight:800, color:'rgba(219,20,46,0.7)', margin:0 }}>{t('currency')}</p>
              </div>
              {r.market_avg_price > 0 && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:8, padding:'4px 12px', borderRadius:999,
                  background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  <Globe size={10} style={{ color:muted }} />
                  <span style={{ fontSize:10, color:muted }}>
                    {t('marketAvg')} <strong style={{ color: dark?'rgba(255,255,255,0.7)':'#555' }}>
                      {money0(r.market_avg_price)}
                    </strong>
                  </span>
                  <span style={{ fontSize:10, fontWeight:800,
                    color: POSITIONING_COLORS[r.market_positioning] ?? '#6b7280' }}>
                    {r.market_positioning === 'underpriced' ? `↓ ${t('below', { pct: fmtNum(Math.abs(ctx.market_report?.positioning_pct ?? 0)) })}`
                    : r.market_positioning === 'overpriced'  ? `↑ ${t('above', { pct: fmtNum(Math.abs(ctx.market_report?.positioning_pct ?? 0)) })}`
                    : `✓ ${t('competitive')}`}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, borderTop:'1px solid rgba(219,20,46,0.12)', paddingTop:16 }}>
              {([
                { label:t('tiers.competitive'), amount:r.competitive_price,    color:ink('#3b82f6', dark), icon:'⚖️', desc:t('tiers.competitiveDesc') },
                { label:t('tiers.premium'),     amount:r.premium_price,        color:ink('#8b5cf6', dark), icon:'👑', desc:t('tiers.premiumDesc') },
                { label:t('tiers.floor'),       amount:r.min_profitable_price, color:ink('#10b981', dark), icon:'🛡️', desc:t('tiers.floorDesc') },
              ]).map(({ label, amount, color, icon, desc }) => (
                <div key={label} style={{ background: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', borderRadius:12, padding:'10px', textAlign:'center' }}>
                  <p style={{ fontSize:14, margin:'0 0 3px' }}>{icon}</p>
                  <p style={{ fontSize:15, fontWeight:900, color, margin:'0 0 2px', letterSpacing:'-0.02em' }}>
                    {money0(amount)}
                  </p>
                  <p style={{ fontSize:9, color:muted, margin:'0 0 1px', fontWeight:700, textTransform:'uppercase' }}>{label}</p>
                  <p style={{ fontSize:9, color:muted, margin:0, opacity:0.7 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {([
              { icon:'🎯', label:t('strategy'), val:r.strategy },
              { icon:'📏', label:t('safeZone'), val:t('range', { min: money0(r.min_price), max: money0(r.max_price) }) },
              { icon:'⚡', label:t('riskLevel'), val: t.has(`risk.${r.risk}`) ? t(`risk.${r.risk}`) : r.risk },
            ]).map(({ icon, label, val }) => (
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
              <p style={{ fontSize:11, fontWeight:900, color:'#db142e', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{t('verdict')}</p>
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
                  <p style={{ fontSize:10, fontWeight:900, color:ink('#f59e0b', dark), margin:'0 0 4px', textTransform:'uppercase' }}>{t('tip')}</p>
                  <p style={{ fontSize:11, color: dark?'rgba(255,255,255,0.75)':'#555', margin:0, lineHeight:1.55 }}>{r.psychological_tip}</p>
                </div>
              </div>
            )}
            {r.competitor_summary && (
              <div style={{ background:cardBg, borderRadius:14, border:`1px solid ${border}`, padding:'13px 15px', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>🏪</span>
                <div>
                  <p style={{ fontSize:10, fontWeight:900, color:muted, margin:'0 0 4px', textTransform:'uppercase' }}>{t('market')}</p>
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
// TOOL 4 — BUNDLE RECOMMENDER — UNCHANGED
// ═════════════════════════════════════════════════════════════════════════════

function BundleProductChip({ name, imageUrl, dark }: { name: string; imageUrl: string | null | undefined; dark: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const showImage = !!imageUrl && !imgErr;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px', paddingInlineEnd:10, borderRadius:999, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, fontWeight:700, color:ink('#fbbf24', dark) }}>
      <span style={{ width:24, height:24, borderRadius:'50%', overflow:'hidden', background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {showImage ? <img src={imageUrl as string} alt={name} onError={() => setImgErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /> : <Package size={12} style={{ color:ink('#fbbf24', dark), opacity:0.7 }} />}
      </span>
      {name}
    </span>
  );
}

function BundleRecommenderTool({ products, dark, initialProductId }: { products: Array<{ id:number; name:string }>; dark:boolean; initialProductId?: number }) {
  const [selectedId, setSelectedId] = useState<number|null>(initialProductId ?? null);
  const [mode,        setMode]        = useState<'bundle'|'related'>('bundle');
  const [discountPct, setDiscountPct] = useState(10);
  const t = useTranslations('seller.aiTools.bundles');
  const { number } = useFormat();
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
  const muted  = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const subBg  = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try { const res = await sellerAiApi.recommender(selectedId, mode, discountPct); setResult(res.data); }
    catch (e: any) { setError(e.message ?? t('failed')); }
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
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>{t('title')}</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <div style={{ display:'flex', gap:6 }}>
            {(['bundle','related'] as const).map(m => <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: mode===m?'rgba(219,20,46,0.15)':subBg, color: mode===m?ink('#f87171', dark):muted, outline: mode===m?'1px solid rgba(219,20,46,0.35)':'1px solid transparent' }}>{m==='bundle'?`📦 ${t('modeBundle')}`:`🔗 ${t('modeRelated')}`}</button>)}
          </div>
          {mode === 'bundle' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <p style={{ fontSize:10, fontWeight:700, color:muted, margin:0, textTransform:'uppercase' }}>{t('discount')}</p>
                <p style={{ fontSize:12, fontWeight:900, color:'#db142e', margin:0 }}>{number(discountPct / 100, { style:'percent' })}</p>
              </div>
              <input type="range" min="5" max="30" value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} style={{ width:'100%', accentColor:'#db142e', cursor:'pointer' }} />
            </div>
          )}
          <RunBtn onClick={run} loading={loading} label={t('run')} icon={Package} />
        </div>
        {error && <p style={{ color:ink('#ef4444', dark), fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>
      {coPurchased.length > 0 && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>{t('coPurchase')}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {coPurchased.map((p: any) => <span key={p.id} style={{ padding:'3px 9px', borderRadius:999, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', fontSize:11, fontWeight:700, color:ink('#34d399', dark) }}>{p.name} ×{p.co_count}</span>)}
          </div>
        </div>
      )}
      {r !== null && (r.bundles ?? []).map((bundle, i) => (
        <div key={i} style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(245,158,11,0.25)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:14, fontWeight:900, color:text, margin:0 }}>{bundle.name}</p>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', fontSize:11, fontWeight:800, color:ink('#34d399', dark) }}>{bundle.est_uplift}</span>
              <span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(219,20,46,0.1)', border:'1px solid rgba(219,20,46,0.25)', fontSize:11, fontWeight:800, color:ink('#f87171', dark) }}>{bundle.display_label}</span>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {(bundle.products ?? []).map((name, j) => <BundleProductChip key={j} name={name} imageUrl={productImages[name]} dark={dark} />)}
          </div>
          <Field dark={dark} label={t('why')} value={bundle.reason} />
          <Field dark={dark} label={t('strategy')} value={bundle.suggested_price_reduction} />
        </div>
      ))}
      {r !== null && r.recommendations != null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(59,130,246,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {r.placement_strategy != null && <Field dark={dark} label={t('placement')} value={r.placement_strategy} />}
          {r.best_time_to_show  != null && <Field dark={dark} label={t('bestTime')} value={r.best_time_to_show} />}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {r.recommendations.map((rec, i) => (
              <div key={i} style={{ background: dark?'rgba(255,255,255,0.04)':'#f8fafc', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:ink('#60a5fa', dark), flexShrink:0, fontSize:13, fontWeight:900 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:text, margin:'0 0 3px' }}>{rec.product_name}</p>
                  <p style={{ fontSize:11, color:muted, margin:'0 0 6px', lineHeight:1.4 }}>{rec.reason}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(59,130,246,0.1)', fontSize:10, fontWeight:700, color:ink('#60a5fa', dark) }}>{rec.placement}</span>
                    <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(16,185,129,0.1)', fontSize:10, fontWeight:700, color:ink('#34d399', dark) }}>{t('ctr', { rate: rec.est_click_rate })}</span>
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
  { key:'price',       icon:DollarSign, accent:'#db142e' },
  { key:'sales',       icon:TrendingUp, accent:'#3b82f6' },
  { key:'bundles',     icon:Package,    accent:'#f59e0b' },
];

export default function AIToolsPanel({  dark,
  initialTab,
  initialProductId,
  autorun = false,}: { dark: boolean;
  initialTab?: string;
  initialProductId?: number;
  autorun?: boolean; }) {

const validTab = ['price','sales','bundles'].includes(initialTab ?? '') ? initialTab! : 'price';
const [activeTool, setActiveTool] = useState(validTab);
  const [products,   setProducts]   = useState<Array<{ id:number; name:string }>>([]);
  const t = useTranslations('seller.aiTools');

  const text  = dark ? '#fff' : '#111';
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';

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
            <p style={{ fontSize:14, fontWeight:900, color:text, margin:'0 0 2px' }}>{t('title')}</p>
            <p style={{ fontSize:11, color:muted, margin:0, fontWeight:500 }}>{t('subtitle')}</p>
          </div>
        </div>
        <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(219,20,46,0.12)', border:'1px solid rgba(219,20,46,0.3)', fontSize:10, fontWeight:800, color:ink('#f87171', dark) }}>🔴 Red Pepper</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.key;
          return (
            <button key={tool.key} onClick={() => setActiveTool(tool.key)} style={{ padding:'10px 8px', borderRadius:12, cursor:'pointer', border:'none', background: isActive?`${tool.accent}18`:(dark?'rgba(255,255,255,0.04)':'#f8fafc'), outline: isActive?`1px solid ${tool.accent}44`:'1px solid transparent', display:'flex', flexDirection:'column', alignItems:'center', gap:5, transition:'all 0.2s ease' }}>
              <Icon size={16} style={{ color: isActive?tool.accent:muted }} />
              <span style={{ fontSize:10, fontWeight:700, color: isActive?text:muted }}>{t(`tabs.${tool.key}`)}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTool === 'price'       && <PriceOptimizerTool      products={products} dark={dark} initialProductId={initialProductId} autorun={autorun} />}
        {activeTool === 'sales'       && <SalesForecastDashboard   dark={dark} initialProductId={initialProductId} />}
        {activeTool === 'bundles'     && <BundleRecommenderTool    products={products} dark={dark} initialProductId={initialProductId} />}
      </div>
    </div>
  );
}