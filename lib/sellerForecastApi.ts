/**
 * lib/sellerForecastApi.ts — FIXED
 *
 * KEY FIX: getForecast() now sends refresh=true by default.
 * Previously refresh defaulted to false → API always served the stale 6h cache.
 * Now every product selection triggers a fresh recompute.
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
    throw err;
  }
  return json;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastProjection {
  month: string; label: string; predicted_units: number;
  predicted_revenue: number; trend_base: number;
  seasonality_idx: number; event_boost: number;
  event_name: string | null; confidence: 'high' | 'medium' | 'low';
}

export interface ForecastHistoryPoint {
  month: string; label: string; units: number; revenue: number; orders: number;
}

export interface ForecastResult {
  product_id: number; product_name: string; category_name: string;
  subcategory_name: string | null; current_price: number; current_stock: number;
  projections: ForecastProjection[]; total_predicted_units: number;
  total_predicted_revenue: number; peak_month: ForecastProjection;
  lowest_month: ForecastProjection; overall_trend: 'up' | 'down' | 'stable';
  trend_slope: number; demand_score: number; confidence: number;
  confidence_label: 'high' | 'medium' | 'low'; data_points: number;
  history: ForecastHistoryPoint[]; stock_recommendation_3m: number;
  blend_note: string; computed_at: string; computed_by: string;
  forecast_months: number; _cache_hit: boolean; _cache_age_seconds: number;
}

export interface RegionalDemandRegion {
  wilaya: string; total_orders: number; total_units: number;
  total_revenue: number; demand_index: number; lat: number | null; lng: number | null;
}

export interface RegionalDemandResult {
  has_data: boolean; regions: RegionalDemandRegion[]; top_region: RegionalDemandRegion | null;
}

export interface SimilarProduct {
  id: number; name: string; price: number; stock: number; views: number;
  category_name: string; subcategory_name: string | null; primary_image: string | null;
  monthly_units: number; total_orders_6m: number; total_revenue_6m: number;
}

export interface SimilarProductsResult {
  has_data: boolean; similar: SimilarProduct[]; count: number;
  market_avg_price: number; market_median_monthly_units: number;
  own_monthly_units: number; relative_position_pct: number;
  top_competitor: SimilarProduct | null; insights: Array<{ type: string; message: string }>;
}

export interface EventSignal {
  slug: string; name: string; type: string; starts_at: string;
  ends_at: string; boost_score: number; top_regions: string[]; days_until: number;
}

export interface AIExplanation {
  summary: string; main_opportunity: string; main_risk: string; seasonal_tip: string;
}

export interface CacheAge {
  computed_at: string | null; age_minutes: number | null; is_stale: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const forecastApi = {
  /**
   * FIX: useCache defaults to FALSE → refresh=true is sent → always recomputes.
   * Pass useCache=true only if you explicitly want the 30-min cache (e.g. page re-open).
   */
  getForecast: (productId: number, months = 6, useCache = false) =>
    jsonRequest<{ success: boolean; data: ForecastResult }>(
      'POST', '/seller/analytics/forecast',
      { product_id: productId, months, refresh: !useCache }
    ),

  /** Always fresh — no cache on this endpoint */
  getRegional: (productId: number) =>
    jsonRequest<{ success: boolean; data: RegionalDemandResult }>(
      'GET', `/seller/analytics/forecast/regional?product_id=${productId}`
    ),

  /** Always fresh — no cache on this endpoint */
  getSimilar: (productId: number) =>
    jsonRequest<{ success: boolean; data: SimilarProductsResult }>(
      'GET', `/seller/analytics/forecast/similar?product_id=${productId}`
    ),

  getEvents: (categorySlug?: string) =>
    jsonRequest<{ success: boolean; data: EventSignal[] }>(
      'GET', `/seller/analytics/forecast/events${categorySlug ? `?category_slug=${categorySlug}` : ''}`
    ),

  getAIExplanation: (
    productId: number, forecastData: ForecastResult,
    regionalData: RegionalDemandResult | null, language: 'fr' | 'ar' | 'en' = 'fr'
  ) =>
    jsonRequest<{ success: boolean; data: AIExplanation }>(
      'POST', '/seller/analytics/forecast/explain',
      { product_id: productId, forecast_data: forecastData, regional_data: regionalData, language }
    ),

  invalidateCache: (productId: number) =>
    jsonRequest<{ success: boolean; message: string }>(
      'DELETE', `/seller/analytics/forecast/cache?product_id=${productId}`
    ),

  getCacheAge: (productId: number) =>
    jsonRequest<{ success: boolean; data: CacheAge }>(
      'GET', `/seller/analytics/forecast/cache-age?product_id=${productId}`
    ),
};