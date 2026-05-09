/**
 * lib/blackPepperApi.ts
 *
 * Frontend API layer for Black Pepper (tier 2) features.
 * Same fetch + token pattern as sellerApi.ts and sellerAiApi.ts.
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
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendingProduct {
  product_id:          number;
  product_name:        string;
  category:            string;
  price:               number;
  current_stock:       number;
  seven_day_units:     number;
  seven_day_revenue:   number;
  daily_velocity:      number;
  thirty_day_avg:      number;
  velocity_multiplier: number;
  trend_signal:        'hot' | 'rising' | 'warm';
  insight:             string;
  image_url: string | null;  // ← add this

}

export interface InventoryAlert {
  product_id:      number;
  product_name:    string;
  category:        string;
  current_stock:   number;
  daily_sales_avg: number;
  days_remaining:  number;
  urgency:         'critical' | 'high' | 'medium';
  revenue_at_risk: number;
  restock_units:   number;
  insight:         string;
  image_url:       string | null;

}

export interface MarketInsights {
  headline:            string;
  insights:            string[];
  priority_action:     string;
  market_temperature:  'hot' | 'warm' | 'cooling' | 'cold';
}

export interface AiHubData {
  trending_products: TrendingProduct[];
  inventory_alerts:  InventoryAlert[];
  market_insights:   MarketInsights;
  meta: {
    trending_count:  number;
    alert_count:     number;
    critical_count:  number;
    generated_at:    string;
  };
}

export interface ProfitPeriod {
  month:             string;
  revenue:           number;
  estimated_profit:  number;
  units:             number;
  orders:            number;
  avg_order_value:   number;
}

export interface ProductMargin {
  product_id:       number;
  product_name:     string;
  category:         string;
  price:            number;
  total_units:      number;
  total_revenue:    number;
  estimated_profit: number;
  margin_pct:       number;
  margin_label:     'excellent' | 'good' | 'fair' | 'low';
}

export interface ForecastData {
  next_30_days:   number;
  last_30_actual: number;
  growth_pct:     number;
  trend:          'up' | 'down' | 'stable';
  daily_points:   Array<{ day: string; predicted: number }>;
  confidence:     'high' | 'medium' | 'low';
}

export interface ProfitCenterData {
  summary: {
    total_revenue_90d:    number;
    estimated_profit_90d: number;
    estimated_margin_pct: number;
    margin_disclaimer:    string;
    data_points:          number;
  };
  period_breakdown: ProfitPeriod[];
  product_margins:  ProductMargin[];
  forecast:         ForecastData | null;
  daily_revenue:    Array<{ day: string; revenue: number; orders: number }>;
}

export interface SponsoredProduct {
  id:                  number;
  name:                string;
  price:               number;
  stock:               number;
  is_active:           boolean;
  is_approved:         boolean;
  is_sponsored:        boolean;
  sponsored_priority:  number;
  sponsored_at:        string | null;
  category_name:       string;
  image_url:           string | null;
}

export type VipRequestType   = 'reel' | 'promotion' | 'support';
export type VipRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface VipRequest {
  id:           number;
  type:         VipRequestType;
  type_label:   string;
  status:       VipRequestStatus;
  status_label: string;
  message:      string;
  admin_note:   string | null;
  created_at:   string;
  handled_at:   string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const blackPepperApi = {
  // AI Hub
  aiHub: () =>
    jsonRequest<{ success: boolean; data: AiHubData }>('GET', '/seller/black/ai-hub'),

  // Profit Center
  profitCenter: () =>
    jsonRequest<{ success: boolean; data: ProfitCenterData }>('GET', '/seller/black/profit-center'),

  // Sponsored Products
  getSponsoredProducts: () =>
    jsonRequest<{ success: boolean; data: SponsoredProduct[] }>('GET', '/seller/black/sponsored'),

  toggleSponsorship: (productId: number, action: 'activate' | 'deactivate', priority?: number) =>
    jsonRequest<{ success: boolean; message: string; data: any }>('POST', `/seller/black/sponsor/${productId}`, {
      action,
      priority: priority ?? 5,
    }),

  // VIP Requests
  getVipRequests: () =>
    jsonRequest<{ success: boolean; data: VipRequest[] }>('GET', '/seller/black/vip-requests'),

  submitVipRequest: (type: VipRequestType, message: string) =>
    jsonRequest<{ success: boolean; message: string; data: VipRequest }>('POST', '/seller/black/vip-request', {
      type,
      message,
    }),
};