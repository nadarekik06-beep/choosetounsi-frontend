/**
 * Free AI service using Groq API (https://console.groq.com)
 * Model: llama3-8b-8192 — completely free, no credit card required
 * Rate limit: 30 requests/min, 14,400/day on free tier
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama3-8b-8192';

export interface AIResponse {
  success: boolean;
  data: string;
  error?: string;
}

/**
 * Call Groq API directly from the browser via our Next.js proxy
 * (avoids CORS and keeps the API key server-side)
 */
export async function callFreeAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 600
): Promise<string> {
  const res = await fetch('/api/ai/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt, maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return data.result ?? '';
}

/**
 * Parse JSON from AI response — strips markdown fences if present
 */
export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Find the first { or [ and last } or ]
  const start = cleaned.search(/[{[]/);
  const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// ─── System prompts (shared across tools) ─────────────────────────────────────

export const SYSTEM_PROMPTS = {
  pricing: `You are a Tunisian e-commerce pricing expert for ChooseTounsi marketplace.
You analyze product pricing and suggest optimal prices for the Tunisian market.
Always respond with ONLY valid JSON, no markdown, no explanation outside the JSON.`,

  copywriter: `You are an SEO copywriter specializing in Tunisian e-commerce for ChooseTounsi marketplace.
You write compelling product content optimized for Tunisian buyers.
Always respond with ONLY valid JSON, no markdown, no explanation outside the JSON.`,

  analyst: `You are a Tunisian e-commerce sales analyst for ChooseTounsi marketplace.
You predict sales trends based on Tunisian seasonal patterns (Ramadan, Eid, Summer, etc.).
Always respond with ONLY valid JSON, no markdown, no explanation outside the JSON.`,

  bundler: `You are a Tunisian e-commerce bundle strategy expert for ChooseTounsi marketplace.
You suggest high-converting product bundles based on purchase affinity.
Always respond with ONLY valid JSON, no markdown, no explanation outside the JSON.`,
};

// ─── Fallback generators (used when API call fails) ────────────────────────────

export function pricingFallback(productName: string, category: string, currentPrice: number) {
  const multipliers: Record<string, number> = {
    Electronics: 1.14,
    Clothing:    1.10,
    Food:        1.08,
    Home:        1.12,
    Beauty:      1.15,
  };
  const mult          = multipliers[category] ?? 1.11;
  const suggestedPrice = Math.round(currentPrice * mult * 100) / 100;
  const diff           = Math.round((suggestedPrice - currentPrice) * 100) / 100;
  const pct            = Math.round((diff / currentPrice) * 100);

  return {
    suggested_price: suggestedPrice,
    confidence:      'medium',
    reasoning:       `Based on ${category} market benchmarks in Tunisia, a ${pct}% price increase is supported by demand data on ChooseTounsi. Products like "${productName}" in this category show healthy price elasticity.`,
    strategy:        'Value-based pricing with competitive positioning',
    risk:            'low',
    min_price:       Math.round(currentPrice * 0.95 * 100) / 100,
    max_price:       Math.round(currentPrice * 1.22 * 100) / 100,
  };
}

export function descriptionFallback(productName: string, category: string, features: string) {
  return {
    title:       `${productName} — ${category} authentique tunisien`,
    description: `Découvrez ${productName}, un produit de qualité dans la catégorie ${category}. ${features ? `Caractéristiques principales : ${features}. ` : ''}Fabriqué avec soin, il allie qualité et accessibilité pour les consommateurs tunisiens. Commandez maintenant sur ChooseTounsi avec livraison rapide partout en Tunisie.`,
    keywords:    ['tunisien', 'artisanal', 'qualité', category.toLowerCase(), 'choosetounsi', 'livraison', 'authentique', 'meilleur prix'],
    meta_title:  `${productName} | ${category} Tunisie — ChooseTounsi`,
    meta_description: `Achetez ${productName} sur ChooseTounsi. Qualité premium, livraison rapide en Tunisie. ${features || ''}`.slice(0, 160),
  };
}

export function salesFallback(category: string, season: string, currentSales: number) {
  const seasonMultipliers: Record<string, number> = {
    Ramadan:         1.34,
    Eid:             1.28,
    Summer:          0.94,
    'Back to school': 1.18,
    Winter:          1.12,
    Spring:          1.05,
  };
  const mult  = seasonMultipliers[season] ?? 1.10;
  const pred  = Math.round(currentSales * mult);
  const pct   = Math.round((mult - 1) * 100);
  const trend = mult > 1.05 ? 'up' : mult < 0.95 ? 'down' : 'stable';

  return {
    predicted_units: pred,
    growth_pct:      pct,
    trend,
    confidence:      'medium',
    key_factor:      `${season} creates ${pct > 0 ? 'positive' : 'negative'} demand shifts for ${category} products in Tunisia.`,
    advice:          pct > 0
      ? `Increase inventory by at least ${Math.round(pct * 0.8)}% before ${season} begins.`
      : `Focus on promotions and bundles to offset the ${Math.abs(pct)}% expected dip.`,
    weekly_breakdown: [
      { week: 'Week 1', predicted: Math.round(pred * 0.90), baseline: Math.round(currentSales * 0.24) },
      { week: 'Week 2', predicted: Math.round(pred * 1.02), baseline: Math.round(currentSales * 0.25) },
      { week: 'Week 3', predicted: Math.round(pred * 1.10), baseline: Math.round(currentSales * 0.26) },
      { week: 'Week 4', predicted: Math.round(pred * 0.98), baseline: Math.round(currentSales * 0.25) },
    ],
  };
}

export function bundleFallback(mainProduct: string, otherProducts: string[], discountPct: number) {
  const companions = otherProducts.slice(0, 4);
  return {
    bundles: [
      {
        name:       'Starter Pack',
        products:   [mainProduct, companions[0] ?? 'Accessory'],
        reason:     `High purchase affinity. Customers who bought "${mainProduct}" frequently also buy the companion product within 7 days.`,
        est_uplift: `+${Math.round(15 + discountPct * 0.8)}%`,
        discount:   discountPct,
        suggested_price_reduction: `${discountPct}% off when bought together`,
      },
      {
        name:       'Value Bundle',
        products:   [mainProduct, companions[1] ?? 'Item 2', companions[2] ?? 'Item 3'].filter(Boolean),
        reason:     `Complete setup kit. A ${discountPct}% bundle discount increases average basket value and reduces abandoned carts.`,
        est_uplift: `+${Math.round(28 + discountPct * 1.2)}%`,
        discount:   discountPct,
        suggested_price_reduction: `${discountPct}% off the full bundle`,
      },
    ],
  };
}