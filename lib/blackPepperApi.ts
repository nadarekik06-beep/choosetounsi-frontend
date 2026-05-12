/**
 * lib/blackPepperApi.ts
 * FIXED: Added FunnelInsight and QualityAuditProduct interfaces (were missing, causing TS2304 errors)
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

// ─── Daily Brief ──────────────────────────────────────────────────────────────

export interface DailyBriefAction {
  label: string;
  href:  string;
  type:  'restock' | 'promote' | 'flash_sale' | 'default';
}

export interface DailyBriefData {
  greeting:         string;
  revenue_delta:    string;
  revenue_positive: boolean;
  trending_count:   number;
  risk_count:       number;
  ai_message:       string;
  top_action:       DailyBriefAction | null;
}

// ─── SmartAction ─────────────────────────────────────────────────────────────

export interface SmartAction {
  label: string;
  href:  string;
  type:  'restock' | 'promote' | 'flash_sale' | 'edit' | 'default';
}

// ─── AI Hub ───────────────────────────────────────────────────────────────────

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
  velocity_label:      string;
  image_url:           string | null;
  smart_actions:       SmartAction[];
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
  smart_actions:   SmartAction[];
}

export interface MarketInsights {
  headline:           string;
  insights:           string[];
  priority_action:    string;
  market_temperature: 'hot' | 'warm' | 'cooling' | 'cold';
}

export interface AiHubData {
  trending_products: TrendingProduct[];
  inventory_alerts:  InventoryAlert[];
  market_insights:   MarketInsights;
  meta: {
    trending_count: number;
    alert_count:    number;
    critical_count: number;
    generated_at:   string;
  };
}

// ─── Profit Center ────────────────────────────────────────────────────────────

export interface ProfitPeriod {
  month:            string;
  revenue:          number;
  estimated_profit: number;
  units:            number;
  orders:           number;
  avg_order_value:  number;
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
  margin_human:     string;
}

export interface ForecastData {
  next_30_days:     number;
  last_30_actual:   number;
  growth_pct:       number;
  trend:            'up' | 'down' | 'stable';
  daily_points:     Array<{ day: string; predicted: number }>;
  confidence:       'high' | 'medium' | 'low';
  confidence_human: string;
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

// ─── FunnelInsight — FIX: was missing, caused TS2304 in ConversionFunnelCard ─

export interface FunnelInsight {
  product_id:       number;
  product_name:     string;
  category:         string;
  image_url:        string | null;
  views:            number;
  units_sold:       number;
  opportunity_tnd:  number;
  diagnosis:        string;
  fix_type:         'image' | 'price' | 'description' | 'promote' | 'default';
  fix_suggestion:   string;
  fix_action_label: string;
  fix_action_href:  string;
}

// ─── QualityAuditProduct — FIX: was missing, caused TS2304 in ProductQualityAudit ─

export interface QualityAuditTip {
  type:         'images' | 'description' | 'title' | 'attributes' | 'stock' | 'default';
  label:        string;
  points:       number;
  action_href:  string;
}

export interface QualityAuditProduct {
  product_id:   number;
  product_name: string;
  image_url:    string | null;
  score:        number;
  tips:         QualityAuditTip[];
}

// ─── Auto-Promote ─────────────────────────────────────────────────────────────

export interface AutoPromoteSuggestion {
  product_id:           number;
  product_name:         string;
  category:             string;
  image_url:            string | null;
  trend_signal:         'hot' | 'rising' | 'warm';
  velocity_label:       string;
  seven_day_revenue:    string;
  velocity_multiplier:  number;
  rationale:            string;
  boost_explanation:    string;
  estimated_boost_tnd:  number;
  already_sponsored:    boolean;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const blackPepperApi = {

  dailyBrief: () =>
    jsonRequest<{ success: boolean; data: DailyBriefData }>('GET', '/seller/black/daily-brief'),

  aiHub: () =>
    jsonRequest<{ success: boolean; data: AiHubData }>('GET', '/seller/black/ai-hub'),

  profitCenter: () =>
    jsonRequest<{ success: boolean; data: ProfitCenterData }>('GET', '/seller/black/profit-center'),



  getVipRequests: () =>
    jsonRequest<{ success: boolean; data: VipRequest[] }>('GET', '/seller/black/vip-requests'),

  // FIX: typed with the now-defined FunnelInsight interface
  funnelInsights: () =>
    jsonRequest<{ success: boolean; data: FunnelInsight[] }>('GET', '/seller/black/funnel-insights'),

  // FIX: typed with the now-defined QualityAuditProduct interface
  qualityAudit: () =>
    jsonRequest<{ success: boolean; data: QualityAuditProduct[] }>('GET', '/seller/black/quality-audit'),

  autoPromoteSuggestions: () =>
    jsonRequest<{ success: boolean; data: AutoPromoteSuggestion[] }>('GET', '/seller/black/auto-promote-suggestions'),

  submitVipRequest: (type: VipRequestType, message: string) =>
    jsonRequest<{ success: boolean; message: string; data: VipRequest }>('POST', '/seller/black/vip-request', {
      type, message,
    }),
};