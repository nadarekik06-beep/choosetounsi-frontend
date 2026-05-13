/**
 * lib/sellerAiApi.ts
 *
 * CHANGED: PriceOptimizerResult extended with multi-price fields,
 * market intelligence data, and MarketReport type.
 * All other types and functions are unchanged.
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
  products: Array<{ id: number; name: string; price: number; stock: number; views: number; is_active: boolean; is_approved: boolean; category_name: string; total_revenue: number; total_units: number; total_orders: number; avg_order_val: number; conversion_rate: number; revenue_per_view: number }>;
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

export interface SalesPredictorResult {
  predicted_units:      number;
  growth_pct:           number;
  trend:                'up' | 'down' | 'stable';
  confidence:           'high' | 'medium' | 'low';
  key_factor:           string;
  advice:               string;
  stock_recommendation: string;
  promotion_ideas:      string[];
  best_selling_week:    string;
  weekly_breakdown:     Array<{ week: string; predicted: number; baseline: number }>;
  risk_factors:         string[];
  opportunity:          string;
}

export interface DescriptionResult {
  title:             string;
  short_description: string;
  description:       string;
  keywords:          string[];
  meta_title:        string;
  meta_description:  string;
  call_to_action:    string;
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
  priceOptimizer: (productId: number) =>
    jsonRequest<AIResponse<PriceOptimizerResult, PriceOptimizerDataContext>>(
      'POST', '/seller/ai/price-optimizer', { product_id: productId }
    ),

  salesPredictor: (productId: number) =>
    jsonRequest<AIResponse<SalesPredictorResult>>('POST', '/seller/ai/sales-predictor', { product_id: productId}),

  descriptionGenerator: (productId: number, tone = 'professional', language = 'fr') =>
    jsonRequest<AIResponse<DescriptionResult>>('POST', '/seller/ai/description-generator', { product_id: productId, tone, language }),

  recommender: (productId: number, mode: 'bundle' | 'related' = 'bundle', discountPct = 10) =>
    jsonRequest<AIResponse<RecommenderResult>>('POST', '/seller/ai/recommender', { product_id: productId, mode, discount_pct: discountPct }),

  quickDescription: (params: {
    name: string; category?: string; price?: string | number;
    short_description?: string; attributes?: Record<string, string>;
    variants?: string[]; image_count?: number; tone?: string; language?: string;
  }) => jsonRequest<AIResponse<DescriptionResult>>('POST', '/seller/ai/quick-description', params),
  // Already navigate via URL — but expose typed helper for programmatic use
navigateToPriceOptimizer: (productId: number) => {
  if (typeof window !== 'undefined') {
    window.location.href = `/seller/ai-tools?tab=price&product_id=${productId}&autorun=1`;
  }
},
};