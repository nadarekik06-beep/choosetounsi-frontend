'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, FileText, Package, Loader2,
  Copy, Check, ChevronDown, Sparkles, Brain,
} from 'lucide-react';
import {
  sellerAiApi,
  type PriceOptimizerResult, type SalesPredictorResult,
  type DescriptionResult, type RecommenderResult,
} from '@/lib/sellerAiApi';
import { productsApi as sellerProductsApi } from '@/lib/sellerApi';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n) + ' TND';

const CONFIDENCE_COLORS: Record<string, string> = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
const TREND_COLORS: Record<string, string>      = { up: '#10b981', down: '#ef4444', stable: '#3b82f6' };
const RISK_COLORS: Record<string, string>       = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

const SEASONS = ['Normal','Ramadan','Eid al-Fitr','Eid al-Adha','Summer','Back to school','Winter','Spring'];
const TONES   = ['professional','casual','exciting','trust-focused'];
const LANGS   = [{ value: 'fr', label: 'French' },{ value: 'ar', label: 'Arabic' },{ value: 'en', label: 'English' }];

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

// ─── FIX: solid background colors so <option> elements are visible in dark mode ─
function ProdSelect({ products, value, onChange, dark }: { products: Array<{ id:number; name:string }>; value: number|null; onChange:(id:number)=>void; dark:boolean }) {
  const selectBg  = dark ? '#1e2330' : '#f8fafc';
  const selectClr = dark ? '#ffffff' : '#111111';
  const optionBg  = dark ? '#1e2330' : '#ffffff';

  return (
    <div style={{ position:'relative' }}>
      <select
        value={value ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '10px 36px 10px 12px',
          borderRadius: 10,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
          background: selectBg,
          color: selectClr,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          appearance: 'none',
          outline: 'none',
          // Force browsers to use our background on the dropdown itself
          colorScheme: dark ? 'dark' : 'light',
        }}
      >
        <option value="" style={{ background: optionBg, color: selectClr }}>
          — Select a product —
        </option>
        {products.map(p => (
          <option
            key={p.id}
            value={p.id}
            style={{ background: optionBg, color: selectClr }}
          >
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color: selectClr, pointerEvents:'none' }} />
    </div>
  );
}

function RunBtn({ onClick, loading, label = 'Analyze', icon: Icon = Sparkles }: { onClick:()=>void; loading:boolean; label?:string; icon?: React.ElementType }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background: loading ? 'rgba(219,20,46,0.4)' : 'linear-gradient(135deg,#db142e,#a00f22)', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(219,20,46,0.35)' }}
    >
      {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Icon size={14} />}
      {loading ? 'Analyzing…' : label}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 1 — PRICE OPTIMIZER
// ═════════════════════════════════════════════════════════════════════════════

function PriceOptimizerTool({ products, dark }: { products: Array<{ id:number; name:string }>; dark:boolean }) {
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [result,     setResult]     = useState<{ ai_result: PriceOptimizerResult; data_context: any }|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const cardBg = dark ? '#161b27' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const text   = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  const run = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try { const res = await sellerAiApi.priceOptimizer(selectedId); setResult(res.data); }
    catch (e: any) { setError(e.message ?? 'Analysis failed'); }
    finally { setLoading(false); }
  };

  const r = result?.ai_result ?? null;
  const ctx = result?.data_context ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Input card */}
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

      {/* Context card */}
      {ctx !== null && (
        <div style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Based on your real data</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {([
              { label:'Current Price', val: fmt(ctx.current_price) },
              { label:'Units Sold',    val: ctx.total_units },
              { label:'Category Avg',  val: fmt(ctx.category_avg) },
            ] as { label:string; val:string|number }[]).map(({ label, val }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <p style={{ fontSize:14, fontWeight:900, color:text, margin:'0 0 2px' }}>{val}</p>
                <p style={{ fontSize:10, color:muted, margin:0, fontWeight:600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result card */}
      {r !== null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(219,20,46,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ textAlign:'center', padding:'16px 0', borderBottom:`1px solid ${border}` }}>
            <p style={{ fontSize:11, color:muted, fontWeight:700, margin:'0 0 6px' }}>SUGGESTED PRICE</p>
            <p style={{ fontSize:36, fontWeight:900, color:'#db142e', margin:'0 0 4px', letterSpacing:'-0.04em' }}>{fmt(r.suggested_price)}</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:`${CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8'}18`, color: CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8', border:`1px solid ${CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8'}33` }}>
                Confidence: {r.confidence}
              </span>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:`${RISK_COLORS[r.risk] ?? '#94a3b8'}18`, color: RISK_COLORS[r.risk] ?? '#94a3b8', border:`1px solid ${RISK_COLORS[r.risk] ?? '#94a3b8'}33` }}>
                Risk: {r.risk}
              </span>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Field dark={dark} label="Strategy"    value={r.strategy} />
            <Field dark={dark} label="Price Range" value={`${fmt(r.min_price)} – ${fmt(r.max_price)}`} />
          </div>
          <Field dark={dark} label="AI Reasoning"    value={r.reasoning} />
          <Field dark={dark} label="Expected Impact" value={r.expected_impact} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 2 — SALES PREDICTOR
// ═════════════════════════════════════════════════════════════════════════════

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
    setLoading(true); setError(null);
    try { const res = await sellerAiApi.salesPredictor(selectedId, season); setResult(res.data); }
    catch (e: any) { setError(e.message ?? 'Prediction failed'); }
    finally { setLoading(false); }
  };

  const r   = result?.ai_result ?? null;
  const ctx = result?.data_context ?? null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Input card */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>Select Product & Season</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {SEASONS.map(s => (
              <button key={s} onClick={() => setSeason(s)} style={{ padding:'6px 12px', borderRadius:999, fontSize:11, fontWeight:700, cursor:'pointer', border:'none', background: season === s ? 'rgba(219,20,46,0.15)' : subBg, color: season === s ? '#f87171' : muted, outline: season === s ? '1px solid rgba(219,20,46,0.4)' : '1px solid transparent' }}>
                {s}
              </button>
            ))}
          </div>
          <RunBtn onClick={run} loading={loading} label="Predict Sales" icon={TrendingUp} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>

      {/* Context card */}
      {ctx !== null && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Historical context</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {([
              { label:'Avg Monthly', val: ctx.avg_monthly_sales },
              { label:'Last Month',  val: ctx.last_month_sales },
              { label:'Stock',       val: ctx.current_stock },
            ] as { label:string; val:string|number }[]).map(({ label, val }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <p style={{ fontSize:16, fontWeight:900, color:text, margin:'0 0 2px' }}>{val}</p>
                <p style={{ fontSize:10, color:muted, margin:0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result card */}
      {r !== null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(59,130,246,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ textAlign:'center', padding:'16px 0', borderBottom:`1px solid ${border}` }}>
            <p style={{ fontSize:11, color:muted, fontWeight:700, margin:'0 0 6px' }}>PREDICTED UNITS (NEXT MONTH)</p>
            <p style={{ fontSize:36, fontWeight:900, color: TREND_COLORS[r.trend] ?? '#3b82f6', margin:'0 0 4px', letterSpacing:'-0.04em' }}>{r.predicted_units}</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:800, color: TREND_COLORS[r.trend] ?? '#3b82f6' }}>
                {r.growth_pct >= 0 ? '+' : ''}{r.growth_pct}% vs baseline
              </span>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:`${CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8'}18`, color: CONFIDENCE_COLORS[r.confidence] ?? '#94a3b8' }}>
                {r.confidence} confidence
              </span>
            </div>
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>Weekly Breakdown</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {r.weekly_breakdown.map(w => (
                <div key={w.week} style={{ background:subBg, borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                  <p style={{ fontSize:18, fontWeight:900, color: TREND_COLORS[r.trend] ?? '#3b82f6', margin:'0 0 2px' }}>{w.predicted}</p>
                  <p style={{ fontSize:9, color:muted, margin:'0 0 2px' }}>{w.week}</p>
                  <p style={{ fontSize:9, color:muted, opacity:0.7, margin:0 }}>baseline: {w.baseline}</p>
                </div>
              ))}
            </div>
          </div>
          <Field dark={dark} label="Key Factor" value={r.key_factor} />
          <Field dark={dark} label="Advice"     value={r.advice} />
          {(r.risk_factors?.length ?? 0) > 0 && (
            <div style={{ background:subBg, borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 6px', textTransform:'uppercase' }}>Risk Factors</p>
              {r.risk_factors.map((f, i) => (
                <p key={i} style={{ fontSize:12, color:'#f59e0b', margin:'2px 0', fontWeight:600 }}>⚠ {f}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 3 — DESCRIPTION GENERATOR
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

      {/* Input card */}
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
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{ padding:'5px 10px', borderRadius:999, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background: tone === t ? 'rgba(219,20,46,0.15)' : subBg, color: tone === t ? '#f87171' : muted, outline: tone === t ? '1px solid rgba(219,20,46,0.35)' : '1px solid transparent', textTransform:'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:muted, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Language</p>
              <div style={{ display:'flex', gap:5 }}>
                {LANGS.map(l => (
                  <button key={l.value} onClick={() => setLang(l.value)} style={{ padding:'5px 10px', borderRadius:999, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background: lang === l.value ? 'rgba(59,130,246,0.15)' : subBg, color: lang === l.value ? '#60a5fa' : muted, outline: lang === l.value ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <RunBtn onClick={run} loading={loading} label="Generate Content" icon={FileText} />
        </div>
        {error && <p style={{ color:'#ef4444', fontSize:12, margin:'10px 0 0', fontWeight:600 }}>{error}</p>}
      </div>

      {/* Result card */}
      {r !== null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(16,185,129,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:subBg, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 4px', textTransform:'uppercase' }}>SEO TITLE</p>
              <p style={{ fontSize:14, fontWeight:800, color:text, margin:0 }}>{r.title}</p>
            </div>
            <CopyBtn text={r.title} dark={dark} />
          </div>
          <div style={{ background:subBg, borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', gap:10 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 4px', textTransform:'uppercase' }}>SHORT DESCRIPTION</p>
              <p style={{ fontSize:12, color:text, margin:0, lineHeight:1.5 }}>{r.short_description}</p>
            </div>
            <CopyBtn text={r.short_description} dark={dark} />
          </div>
          <div style={{ background:subBg, borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', gap:10 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 6px', textTransform:'uppercase' }}>FULL DESCRIPTION</p>
              <p style={{ fontSize:12, color:text, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{r.description}</p>
            </div>
            <CopyBtn text={r.description} dark={dark} />
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>SEO KEYWORDS</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(r.keywords ?? []).map((kw, i) => (
                <span key={i} style={{ padding:'4px 10px', borderRadius:999, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', fontSize:11, fontWeight:700, color:'#60a5fa' }}>
                  {kw}
                </span>
              ))}
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
// TOOL 4 — BUNDLE RECOMMENDER
// ═════════════════════════════════════════════════════════════════════════════

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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Input card */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontWeight:900, fontSize:14, color:text, margin:0 }}>Bundle & Recommendations</p>
          <AiTag />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <ProdSelect products={products} value={selectedId} onChange={setSelectedId} dark={dark} />
          <div style={{ display:'flex', gap:6 }}>
            {(['bundle','related'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: mode === m ? 'rgba(219,20,46,0.15)' : subBg, color: mode === m ? '#f87171' : muted, outline: mode === m ? '1px solid rgba(219,20,46,0.35)' : '1px solid transparent', textTransform:'capitalize' }}>
                {m === 'bundle' ? '📦 Bundle Suggestions' : '🔗 Related Products'}
              </button>
            ))}
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

      {/* Co-purchase context */}
      {coPurchased.length > 0 && (
        <div style={{ background:subBg, borderRadius:14, border:`1px solid ${border}`, padding:'14px 16px' }}>
          <p style={{ fontSize:10, fontWeight:800, color:muted, margin:'0 0 8px', textTransform:'uppercase' }}>Real co-purchase data used</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {coPurchased.map((p: any) => (
              <span key={p.id} style={{ padding:'3px 9px', borderRadius:999, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', fontSize:11, fontWeight:700, color:'#34d399' }}>
                {p.name} ×{p.co_count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bundle results */}
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
            {(bundle.products ?? []).map((name, j) => (
              <span key={j} style={{ padding:'5px 12px', borderRadius:999, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, fontWeight:700, color:'#fbbf24' }}>
                📦 {name}
              </span>
            ))}
          </div>
          <Field dark={dark} label="Why it works"      value={bundle.reason} />
          <Field dark={dark} label="Discount Strategy" value={bundle.suggested_price_reduction} />
        </div>
      ))}

      {/* Related products results */}
      {r !== null && r.recommendations != null && (
        <div style={{ background:cardBg, borderRadius:18, border:'1px solid rgba(59,130,246,0.2)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {r.placement_strategy != null && <Field dark={dark} label="Placement Strategy" value={r.placement_strategy} />}
          {r.best_time_to_show  != null && <Field dark={dark} label="Best Time to Show"  value={r.best_time_to_show} />}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {r.recommendations.map((rec, i) => (
              <div key={i} style={{ background:subBg, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#60a5fa', flexShrink:0, fontSize:13, fontWeight:900 }}>
                  {i + 1}
                </div>
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
// MAIN EXPORT
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
      {/* Header */}
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
        <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(219,20,46,0.12)', border:'1px solid rgba(219,20,46,0.3)', fontSize:10, fontWeight:800, color:'#f87171' }}>
          🔴 Red Pepper
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.key;
          return (
            <button key={tool.key} onClick={() => setActiveTool(tool.key)} style={{ padding:'10px 8px', borderRadius:12, cursor:'pointer', border:'none', background: isActive ? `${tool.accent}18` : dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', outline: isActive ? `1px solid ${tool.accent}44` : '1px solid transparent', display:'flex', flexDirection:'column', alignItems:'center', gap:5, transition:'all 0.2s ease' }}>
              <Icon size={16} style={{ color: isActive ? tool.accent : muted }} />
              <span style={{ fontSize:10, fontWeight:700, color: isActive ? text : muted }}>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div>
        {activeTool === 'price'       && <PriceOptimizerTool      products={products} dark={dark} />}
        {activeTool === 'sales'       && <SalesPredictorTool       products={products} dark={dark} />}
        {activeTool === 'description' && <DescriptionGeneratorTool products={products} dark={dark} />}
        {activeTool === 'bundles'     && <BundleRecommenderTool    products={products} dark={dark} />}
      </div>
    </div>
  );
}