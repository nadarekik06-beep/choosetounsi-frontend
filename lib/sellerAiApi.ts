/**
 * lib/sellerAiApi.ts
 *
 * Seller analytics + AI tools API (price optimizer, recommender, product descriptions).
 */

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '');
const API_URL  = `${BASE_URL}/api`;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const keys = ['ct_auth_token', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json.message ?? 'Request failed');
    err.response = { data: json, status: res.status };
    err.code = json.code;
    throw err;
  }
  return json;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  avg_order_value: number;
  repeat_customers: { repeat_customers: number; total_unique_customers: number; repeat_rate_pct: number };
  period_stats: { this_week: number; last_week: number; this_month: number; last_month: number; week_growth: number; month_growth: number };
  revenue_by_payment: Array<{ method: string; revenue: number; orders: number }>;
  charts: { weekly_revenue: Array<{ week: string; revenue: number; orders: number }>; daily_revenue: Array<{ day: string; revenue: number; orders: number }> };
}

export interface ProductAnalytics {
  products: Array<{ id: number; name: string; price: number; stock: number; views: number; is_active: boolean; is_approved: boolean; category_name: string; total_revenue: number; total_units: number; total_orders: number; avg_order_val: number; conversion_rate: number | null; conversion_sample_ok?: boolean; revenue_per_view: number }>;
  by_category: Array<{ category: string; total_revenue: number; total_units: number; product_count: number }>;
  stock_health: { healthy: number; low_stock: number; out: number };
}

export interface CustomerAnalytics {
  customers: Array<{ id: number; name: string; email: string; order_count: number; total_spent: number; avg_order_value: number; last_order_at: string; days_since_last: number; rfm_score: number; segment: string }>;
  segments: Array<{ segment: string; count: number; revenue: number }>;
}

export interface HeatmapData {
  heatmap: Array<{ day: string; hours: Array<{ hour: number; count: number }> }>;
}

// ─── Market Intelligence Types ────────────────────────────────────────────────

export interface MarketSourceSummary {
  source: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  reliability: number;
}

export interface ScraperMeta {
  source: string;
  status: 'success' | 'failed' | 'disabled';
  count: number;
}

export interface MarketReport {
  has_data: boolean;
  data_points: number;
  sources_count: number;
  market_avg: number;
  market_median: number;
  market_min: number;
  market_max: number;
  confidence: 'high' | 'medium' | 'low';
  confidence_score: number;
  positioning: 'underpriced' | 'competitive' | 'overpriced' | 'unknown';
  positioning_pct: number;
  by_source: MarketSourceSummary[];
  scrapers_meta: ScraperMeta[];
  /** 'scrapers' | 'groq_knowledge' | 'cache' */
  data_source?: string;
}

// ─── AI Result Types ──────────────────────────────────────────────────────────

/** EXTENDED: New fields added for 3-layer market intelligence */
export interface PriceOptimizerResult {
  // Core recommendation
  suggested_price:      number;
  competitive_price:    number;   // NEW — price matching market avg
  premium_price:        number;   // NEW — max supportable premium
  min_profitable_price: number;   // NEW — floor price
  market_avg_price:     number;   // NEW — Groq's estimate of market avg

  // Risk & confidence
  confidence: 'high' | 'medium' | 'low';
  risk:       'low'  | 'medium' | 'high';

  // Strategy & reasoning
  strategy:         string;
  reasoning:        string;
  expected_impact:  string;

  // Market positioning (NEW)
  market_positioning:  'underpriced' | 'competitive' | 'overpriced';
  competitor_summary:  string;
  overpriced_warning:  string | null;
  opportunity_note:    string | null;
  psychological_tip:   string;

  // Price bounds
  platforms_compared?: string[];
  min_price: number;
  max_price: number;
}

export interface PriceOptimizerDataContext {
  product_name:    string;
  current_price:   number;
  total_units:     number;
  total_revenue:   number;
  conversion_rate: number;
  category_avg:    number;
  monthly_trend:   Array<{ month: string; units: number }>;
  market_report:   MarketReport;
}

// ─── AI Descriptions ──────────────────────────────────────────────────────────

export type DescriptionTone     = 'professional' | 'friendly' | 'luxury' | 'promo' | 'artisanal';
export type DescriptionLanguage = 'fr' | 'ar' | 'en';
export type DescriptionLength   = 'short' | 'medium' | 'long';
export type DescriptionLevel    = 'free' | 'red' | 'black';

export interface DescriptionUsage {
  used:      number;
  limit:     number | null;
  remaining: number | null;
  resets_at: string;
}

export interface DescriptionOptions {
  level:            DescriptionLevel;
  plan:             { slug: string; name: string };
  default_language: DescriptionLanguage;
  tones:            Array<{ key: DescriptionTone; locked: boolean; requires: DescriptionLevel | null }>;
  languages:        Array<{ key: DescriptionLanguage; locked: boolean; requires: DescriptionLevel | null }>;
  lengths:          DescriptionLength[];
  max_variants:     number;
  multi_language:   boolean;
  extras:           boolean;
  brand_voice:      boolean;
  voice:            { voice: string; keywords: string[] } | null;
  requires:         Record<'variants' | 'extras' | 'multi_language' | 'brand_voice', DescriptionLevel | null>;
  limits:           Record<DescriptionLevel, number>;
  upgrade:          Record<'red' | 'black', { slug: string; name: string } | null>;
  usage:            DescriptionUsage;
}

export interface DescriptionVariant {
  id:                string;
  language:          DescriptionLanguage;
  hook_style:        string;
  intro:             string;
  bullets:           string[];
  closing:           string;
  description:       string;
  short_description: string;
  /** 'banned_phrase' | 'unverified_spec' | 'needs_review' — parts the server fixed or wants reviewed */
  flags:             string[];
  seo_title?:        string;
  tags?:             string[];
  social?:           string;
}

export interface DescriptionRequest {
  product_id?:        number;
  name:               string;
  category?:          string;
  subcategory?:       string;
  price?:             string | number;
  short_description?: string;
  notes?:             string;
  keywords?:          string;
  attributes?:        Record<string, string>;
  /** exact combinations, e.g. "Black / XL" */
  variants?:          string[];
  /** options grouped by type, e.g. { Size: ['S', 'M'] } */
  option_groups?:     Record<string, string[]>;
  occasions?:         string[];
  is_pack?:           boolean;
  pack_quantity?:     number | null;
  pack_contents?:     string;
  tone:               DescriptionTone;
  length:             DescriptionLength;
  language?:          DescriptionLanguage;
  languages?:         DescriptionLanguage[];
  count:              number;
  extras?:            boolean;
}

export interface DescriptionResponse {
  success: boolean;
  data: {
    variants: DescriptionVariant[];
    options:  { tone: DescriptionTone; length: DescriptionLength; languages: DescriptionLanguage[]; count: number; extras: boolean };
    partial:  boolean;
    usage:    DescriptionUsage;
    model:    string;
  };
}

export interface RecommenderResult {
  bundles?: Array<{ name: string; products: string[]; reason: string; est_uplift: string; discount: number; suggested_price_reduction: string; display_label: string }>;
  recommendations?: Array<{ product_name: string; reason: string; placement: string; est_click_rate: string }>;
  placement_strategy?: string;
  best_time_to_show?:  string;
}

export interface AIResponse<T, C = Record<string, any>> {
  success: boolean;
  data: { ai_result: T; data_context: C };
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  overview:  () => jsonRequest<{ success: boolean; data: AnalyticsOverview }>('GET', '/seller/analytics/overview'),
  products:  () => jsonRequest<{ success: boolean; data: ProductAnalytics }>('GET', '/seller/analytics/products'),
  customers: () => jsonRequest<{ success: boolean; data: CustomerAnalytics }>('GET', '/seller/analytics/customers'),
  heatmap:   () => jsonRequest<{ success: boolean; data: HeatmapData }>('GET', '/seller/analytics/heatmap'),
};

// ─── AI Tools API ─────────────────────────────────────────────────────────────

export const sellerAiApi = {
  priceOptimizer: (productId: number, language?: string) =>
    jsonRequest<AIResponse<PriceOptimizerResult, PriceOptimizerDataContext>>(
      'POST', '/seller/ai/price-optimizer', { product_id: productId, language }
    ),


  recommender: (productId: number, mode: 'bundle' | 'related' = 'bundle', discountPct = 10) =>
    jsonRequest<AIResponse<RecommenderResult>>('POST', '/seller/ai/recommender', { product_id: productId, mode, discount_pct: discountPct }),

  // ── AI descriptions (every plan; tiers enforced by the backend) ──
  descriptionOptions: () =>
    jsonRequest<{ success: boolean; data: DescriptionOptions }>('GET', '/seller/ai/description/options'),

  generateDescription: (params: DescriptionRequest) =>
    jsonRequest<DescriptionResponse>('POST', '/seller/ai/description', params),

  saveDescriptionVoice: (voice: string, keywords: string) =>
    jsonRequest<{ success: boolean; message: string; data: { voice: string; keywords: string[] } }>(
      'PUT', '/seller/ai/description/voice', { voice, keywords }
    ),

  // Already navigate via URL — but expose typed helper for programmatic use
navigateToPriceOptimizer: (productId: number) => {
  if (typeof window !== 'undefined') {
    window.location.href = `/seller/ai-tools?tab=price&product_id=${productId}&autorun=1`;
  }
},
};