'use client';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  callFreeAI,
  parseJSON,
  salesFallback,
  SYSTEM_PROMPTS,
} from '@/app/seller/services/ai/freeAI';

interface WeekBreakdown {
  week:      string;
  predicted: number;
  baseline:  number;
}

interface PredResult {
  predicted_units:   number;
  growth_pct:        number;
  trend:             'up' | 'down' | 'stable';
  confidence:        string;
  key_factor:        string;
  advice:            string;
  weekly_breakdown:  WeekBreakdown[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.stroke, fontWeight: 600 }}>
          {p.name}: {p.value} units
        </div>
      ))}
    </div>
  );
}

export default function SalesPredictor() {
  const [category, setCategory] = useState('Electronics');
  const [season,   setSeason]   = useState('Ramadan');
  const [current,  setCurrent]  = useState('147');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<PredResult | null>(null);

  const run = async () => {
    const cur = parseInt(current, 10);
    if (isNaN(cur) || cur <= 0) return;
    setLoading(true);
    setResult(null);

    const userPrompt = `Predict next month's sales for a Tunisian e-commerce seller.

Category: ${category}
Current monthly sales: ${current} units
Season/Period: ${season}
Market: ChooseTounsi marketplace, Tunisia

Consider Tunisian seasonal patterns:
- Ramadan: strong surge in food, clothing, gifts
- Eid: big boost across all categories
- Summer: slight dip in electronics, increase in clothing
- Back to school: surge in electronics, stationery

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "predicted_units": <integer>,
  "growth_pct": <integer, can be negative>,
  "trend": "<up|down|stable>",
  "confidence": "<low|medium|high>",
  "key_factor": "<one sentence explaining main driver>",
  "advice": "<one actionable tip for the seller>",
  "weekly_breakdown": [
    {"week": "Week 1", "predicted": <int>, "baseline": <int>},
    {"week": "Week 2", "predicted": <int>, "baseline": <int>},
    {"week": "Week 3", "predicted": <int>, "baseline": <int>},
    {"week": "Week 4", "predicted": <int>, "baseline": <int>}
  ]
}`;

    try {
      const raw    = await callFreeAI(SYSTEM_PROMPTS.analyst, userPrompt, 600);
      const parsed = parseJSON<PredResult>(raw);
      if (typeof parsed.predicted_units !== 'number') throw new Error('Invalid response');
      setResult(parsed);
    } catch (err) {
      console.warn('[SalesPredictor] AI call failed, using fallback:', err);
      setResult(salesFallback(category, season, cur) as PredResult);
    } finally {
      setLoading(false);
    }
  };

  const trendColor  = result?.trend === 'up' ? '#2ecc71' : result?.trend === 'down' ? '#e74c3c' : '#f39c12';
  const TrendIcon   = result?.trend === 'up' ? TrendingUp : result?.trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="ai-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'var(--red-subtle)', border: '1px solid var(--border-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--red-light)', flexShrink: 0,
        }}>
          <TrendingUp size={20} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Sales Predictor</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Forecast next month based on season & category
          </div>
          <span className="badge-red" style={{ marginTop: 5, display: 'inline-flex' }}>
            GROQ AI · FREE
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="red-label">Category</label>
          <select className="red-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option>Electronics</option>
            <option>Clothing</option>
            <option>Food</option>
            <option>Home</option>
            <option>Beauty</option>
          </select>
        </div>
        <div>
          <label className="red-label">Season / Period</label>
          <select className="red-select" value={season} onChange={e => setSeason(e.target.value)}>
            <option>Ramadan</option>
            <option>Eid</option>
            <option>Summer</option>
            <option>Back to school</option>
            <option>Winter</option>
            <option>Spring</option>
          </select>
        </div>
        <div>
          <label className="red-label">Current Monthly Sales (units)</label>
          <input
            className="red-input"
            type="number"
            min="1"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="e.g. 147"
          />
        </div>
        <button
          className="red-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={run}
          disabled={loading}
        >
          {loading
            ? <><span className="dot" /><span className="dot" /><span className="dot" /></>
            : <><TrendingUp size={14} /> Predict Sales</>
          }
        </button>
      </div>

      <div className={`ai-output ${result ? 'has-result' : ''}`}>
        {!result && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>
            Fill fields and click Predict
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        {result && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8,
            }}>
              Next Month Forecast
            </div>

            {/* Big number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 32, fontWeight: 800, color: 'var(--text)',
                letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums',
              }}>
                {result.predicted_units}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text2)' }}>units</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 14, fontWeight: 700, color: trendColor,
              }}>
                <TrendIcon size={14} />
                {result.growth_pct > 0 ? '+' : ''}{result.growth_pct}%
              </span>
            </div>

            {/* Confidence */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: 'var(--text2)',
              background: 'var(--surface4)', borderRadius: 6,
              padding: '3px 8px', marginBottom: 8,
            }}>
              Confidence: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{result.confidence}</span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>
              {result.key_factor}
            </div>

            {/* Chart */}
            {result.weekly_breakdown?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={result.weekly_breakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
                    <Line
                      type="monotone" dataKey="predicted"
                      stroke="#e74c3c" strokeWidth={2} strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#e74c3c' }} name="Predicted"
                    />
                    <Line
                      type="monotone" dataKey="baseline"
                      stroke="#555" strokeWidth={1.5}
                      dot={{ r: 2, fill: '#555' }} name="Baseline"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Advice */}
            <div style={{
              background: 'var(--red-subtle)', border: '1px solid var(--border-red)',
              borderRadius: 8, padding: '8px 12px',
              fontSize: 11, color: 'var(--red-light)', lineHeight: 1.5,
            }}>
              💡 {result.advice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}