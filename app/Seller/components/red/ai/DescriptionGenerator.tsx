'use client';
import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import {
  callFreeAI,
  parseJSON,
  descriptionFallback,
  SYSTEM_PROMPTS,
} from '@/app/seller/services/ai/freeAI';

interface DescResult {
  title:            string;
  description:      string;
  keywords:         string[];
  meta_title:       string;
  meta_description: string;
}

export default function DescriptionGenerator() {
  const [name,     setName]     = useState('Harissa Artisanale Bio 500g');
  const [category, setCategory] = useState('Food');
  const [features, setFeatures] = useState('bio, handmade, spicy');
  const [lang,     setLang]     = useState('French');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<DescResult | null>(null);
  const [copied,   setCopied]   = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);

    const userPrompt = `Write SEO product content for a Tunisian e-commerce listing.

Product: "${name}"
Category: ${category}
Key features: ${features || 'standard product'}
Language: ${lang}
Platform: ChooseTounsi (Tunisian marketplace)
Target audience: Tunisian online shoppers

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "title": "<SEO product title, max 65 characters>",
  "description": "<compelling 2-3 sentence product description>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>", "<keyword6>"],
  "meta_title": "<meta title max 60 chars>",
  "meta_description": "<meta description max 155 chars>"
}`;

    try {
      const raw    = await callFreeAI(SYSTEM_PROMPTS.copywriter, userPrompt, 500);
      const parsed = parseJSON<DescResult>(raw);
      if (!parsed.title || !parsed.description) throw new Error('Invalid response structure');
      setResult(parsed);
    } catch (err) {
      console.warn('[DescriptionGenerator] AI call failed, using fallback:', err);
      setResult(descriptionFallback(name, category, features));
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copy(text, id)}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: copied === id ? '#2ecc71' : 'var(--text2)',
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
        padding: 0, fontFamily: 'inherit',
      }}
    >
      {copied === id ? <Check size={12} /> : <Copy size={12} />}
      {copied === id ? 'Copied' : 'Copy'}
    </button>
  );

  return (
    <div className="ai-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'var(--red-subtle)', border: '1px solid var(--border-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--red-light)', flexShrink: 0,
        }}>
          <FileText size={20} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Description Generator</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            SEO title, description & keywords
          </div>
          <span className="badge-red" style={{ marginTop: 5, display: 'inline-flex' }}>
            GROQ AI · FREE
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="red-label">Product Name</label>
          <input
            className="red-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Harissa Artisanale"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="red-label">Category</label>
            <select className="red-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option>Food</option>
              <option>Electronics</option>
              <option>Clothing</option>
              <option>Home</option>
              <option>Beauty</option>
            </select>
          </div>
          <div>
            <label className="red-label">Language</label>
            <select className="red-select" value={lang} onChange={e => setLang(e.target.value)}>
              <option>French</option>
              <option>Arabic</option>
              <option>English</option>
            </select>
          </div>
        </div>
        <div>
          <label className="red-label">Key Features (optional)</label>
          <input
            className="red-input"
            value={features}
            onChange={e => setFeatures(e.target.value)}
            placeholder="e.g. bio, handmade, spicy"
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
            : <><FileText size={14} /> Generate Content</>
          }
        </button>
      </div>

      <div className={`ai-output ${result ? 'has-result' : ''}`}>
        {!result && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>
            Fill fields and click Generate
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* SEO Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>SEO Title</span>
                <CopyBtn text={result.title} id="title" />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                background: 'var(--surface4)', borderRadius: 6, padding: '8px 10px',
                lineHeight: 1.4,
              }}>
                {result.title}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>Product Description</span>
                <CopyBtn text={result.description} id="desc" />
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
                background: 'var(--surface4)', borderRadius: 6, padding: '8px 10px',
              }}>
                {result.description}
              </div>
            </div>

            {/* Meta description */}
            {result.meta_description && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
                    textTransform: 'uppercase', letterSpacing: '0.6px',
                  }}>Meta Description</span>
                  <CopyBtn text={result.meta_description} id="meta" />
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text2)', lineHeight: 1.6,
                  background: 'var(--surface4)', borderRadius: 6, padding: '8px 10px',
                }}>
                  {result.meta_description}
                  <span style={{ color: 'var(--text3)', marginLeft: 6 }}>
                    ({result.meta_description.length}/155)
                  </span>
                </div>
              </div>
            )}

            {/* Keywords */}
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--red-light)',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6,
              }}>
                Keywords
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(result.keywords ?? []).map(kw => (
                  <span key={kw} className="chip">{kw}</span>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}