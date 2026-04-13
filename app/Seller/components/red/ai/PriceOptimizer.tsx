'use client';
import { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import {
  callFreeAI,
  parseJSON,
  pricingFallback,
  SYSTEM_PROMPTS,
} from '@/app/seller/services/ai/freeAI';

interface PriceResult {
  suggested_price:          number;
  confidence:               string;
  reasoning:                string;
  strategy:                 string;
  risk:                     string;
  min_price?:               number;
  max_price?:               number;
}

export default function PriceOptimizer() {
  const [name,     setName]     = useState('Casque Bluetooth XL3');
  const [category, setCategory] = useState('Electronics');
  const [price,    setPrice]    = useState('26');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<PriceResult | null>(null);
  const [error,    setError]    = useState('');

  const run = async () => {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p <= 0) {
      setError('Please fill in all fields correctly.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    const userPrompt = `Analyze the optimal price for this Tunisian e-commerce product:
Product name: "${name}"
Category: ${category}
Current price: ${price} DT (Tunisian Dinar)
Market: ChooseTounsi marketplace, Tunisia

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "suggested_price": <number>,
  "confidence": "<low|medium|high>",
  "reasoning": "<2 sentences explaining the recommendation>",
  "strategy": "<one line pricing strategy>",
  "risk": "<low|medium|high>",
  "min_price": <number>,
  "max_price": <number>
}`;

    try {
      const raw    = await callFreeAI(SYSTEM_PROMPTS.pricing, userPrompt, 400);
      const parsed = parseJSON<PriceResult>(raw);
      if (typeof parsed.suggested_price !== 'number') throw new Error('Invalid response');
      setResult(parsed);
    } catch (err) {
      console.warn('[PriceOptimizer] AI call failed, using fallback:', err);
      setResult(pricingFallback(name, category, p));
    } finally {
      setLoading(false);
    }
  };

  const diff = result ? Math.round((result.suggested_price - parseFloat(price)) * 100) / 100 : 0;
  const pct  = result && parseFloat(price) > 0
    ? Math.round((diff / parseFloat(price)) * 100)
    : 0;

  return (
    <div className="ai-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'var(--red-subtle)', border: '1px solid var(--border-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--red-light)', flexShrink: 0,
        }}>
          <Zap size={20} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Price Optimizer</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            AI suggests the optimal price for max revenue
          </div>
          <span className="badge-red" style={{ marginTop: 5, display: 'inline-flex' }}>
            GROQ AI · FREE
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="red-label">Product Name</label>
          <input
            className="red-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Casque Bluetooth XL3"
          />
        </div>
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
          <label className="red-label">Current Price (DT)</label>
          <input
            className="red-input"
            type="number"
            min="0"
            step="0.001"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 26"
          />
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 12, color: '#e74c3c',
            background: 'rgba(231,76,60,0.1)',
            border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: 8, padding: '8px 12px',
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <button
          className="red-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={run}
          disabled={loading}
        >
          {loading
            ? <><span className="dot" /><span className="dot" /><span className="dot" /></>
            : <><Zap size={14} /> Analyze & Optimize</>
          }
        </button>
      </div>

      {/* Result */}
      <div className={`ai-output ${result ? 'has-result' : ''}`}>
        {!result && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>
            Fill fields and click Analyze
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
              Recommended Price
            </div>

            {/* Main price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 30, fontWeight: 800, color: 'var(--red-light)',
                letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums',
              }}>
                {result.suggested_price} DT
              </span>
              <span style={{ fontSize: 14, color: 'var(--text3)', textDecoration: 'line-through' }}>
                {price} DT
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: diff > 0 ? '#2ecc71' : '#e74c3c' }}>
                {diff > 0 ? '+' : ''}{pct}%
              </span>
            </div>

            {/* Price range */}
            {result.min_price && result.max_price && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--text2)', marginBottom: 10,
                background: 'var(--surface4)', borderRadius: 6, padding: '6px 10px',
              }}>
                <span>Safe range:</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {result.min_price} DT — {result.max_price} DT
                </span>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
              {result.reasoning}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip">Strategy: {result.strategy}</span>
              <span className="chip">Risk: {result.risk}</span>
              <span className="chip">Confidence: {result.confidence}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}