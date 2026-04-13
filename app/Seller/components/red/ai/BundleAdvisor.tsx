'use client';
import { useState } from 'react';
import { Package, ChevronUp } from 'lucide-react';
import {
  callFreeAI,
  parseJSON,
  bundleFallback,
  SYSTEM_PROMPTS,
} from '@/app/seller/services/ai/freeAI';

interface Bundle {
  name:                       string;
  products:                   string[];
  reason:                     string;
  est_uplift:                 string;
  discount:                   number;
  suggested_price_reduction:  string;
}

interface BundleResponse {
  bundles: Bundle[];
}

export default function BundleAdvisor() {
  const [main,    setMain]    = useState('Casque Bluetooth XL3');
  const [others,  setOthers]  = useState('Câble USB-C, Pochette Transport, Power Bank 10000mAh, Adaptateur 3.5mm');
  const [disc,    setDisc]    = useState('10');
  const [loading, setLoading] = useState(false);
  const [bundles, setBundles] = useState<Bundle[]>([]);

  const run = async () => {
    setLoading(true);
    setBundles([]);

    const otherList = others.split(',').map(s => s.trim()).filter(Boolean);
    const discNum   = parseInt(disc, 10) || 10;

    const userPrompt = `Suggest high-converting product bundles for a Tunisian e-commerce seller on ChooseTounsi.

Main product: "${main}"
Other products available: ${otherList.join(', ')}
Bundle discount to offer: ${discNum}%
Market: Tunisia, ChooseTounsi marketplace

Create 2-3 bundle recommendations based on purchase affinity and complementary use cases.

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "bundles": [
    {
      "name": "<bundle name>",
      "products": ["<product1>", "<product2>"],
      "reason": "<why these products go together, 1-2 sentences>",
      "est_uplift": "<e.g. +23%>",
      "discount": ${discNum},
      "suggested_price_reduction": "<e.g. 10% off when bought together>"
    }
  ]
}`;

    try {
      const raw    = await callFreeAI(SYSTEM_PROMPTS.bundler, userPrompt, 700);
      const parsed = parseJSON<BundleResponse>(raw);
      if (!Array.isArray(parsed.bundles)) throw new Error('Invalid response');
      setBundles(parsed.bundles);
    } catch (err) {
      console.warn('[BundleAdvisor] AI call failed, using fallback:', err);
      setBundles(bundleFallback(main, otherList, discNum).bundles);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'var(--red-subtle)', border: '1px solid var(--border-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--red-light)', flexShrink: 0,
        }}>
          <Package size={20} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Bundle Advisor</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Discover high-converting product bundles
          </div>
          <span className="badge-red" style={{ marginTop: 5, display: 'inline-flex' }}>
            GROQ AI · FREE
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="red-label">Main Product</label>
          <input
            className="red-input"
            value={main}
            onChange={e => setMain(e.target.value)}
            placeholder="e.g. Casque Bluetooth XL3"
          />
        </div>
        <div>
          <label className="red-label">Other Products in Your Catalog (comma-separated)</label>
          <input
            className="red-input"
            value={others}
            onChange={e => setOthers(e.target.value)}
            placeholder="Product A, Product B, Product C..."
          />
        </div>
        <div>
          <label className="red-label">Bundle Discount (%)</label>
          <input
            className="red-input"
            type="number"
            min="0"
            max="50"
            value={disc}
            onChange={e => setDisc(e.target.value)}
            placeholder="e.g. 10"
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
            : <><Package size={14} /> Find Best Bundles</>
          }
        </button>
      </div>

      <div className={`ai-output ${bundles.length > 0 ? 'has-result' : ''}`}>
        {bundles.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>
            Fill fields and click Find
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        {bundles.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10,
            }}>
              Recommended Bundles — {disc}% Discount
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bundles.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface4)',
                    borderRadius: 10,
                    padding: 14,
                    border: '1px solid var(--border)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-red)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
                >
                  {/* Bundle header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{b.name}</span>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 13, fontWeight: 800, color: '#2ecc71',
                    }}>
                      <ChevronUp size={13} />
                      {b.est_uplift}
                    </span>
                  </div>

                  {/* Products */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {(b.products ?? []).map((p, pi) => (
                      <span key={pi} className="chip">{p}</span>
                    ))}
                  </div>

                  {/* Reason */}
                  <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 6 }}>
                    {b.reason}
                  </div>

                  {/* Discount info */}
                  <div style={{ fontSize: 11, color: 'var(--red-light)', fontWeight: 500 }}>
                    💰 {b.suggested_price_reduction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}