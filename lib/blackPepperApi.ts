/**
 * lib/blackPepperApi.ts
 * UPDATED: Replaced ProfitCenter with RevenueGoals tracker
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

// ─── Revenue Goals ────────────────────────────────────────────────────────────

export interface RevenueGoalMonth {
  month:   string;   // "2026-05"
  revenue: number;
  goal:    number;
  hit:     boolean;
  pct:     number;   // 0-100
}

export interface RevenueGoalsData {
  current_month:   string;
  current_revenue: number;
  last_revenue:    number;
  current_goal:    number;
  projected:       number;
  progress_pct:    number;   // 0-100
  on_track:        boolean;
  days_left:       number;
  days_in_month:   number;
  daily_pace:      number;
  streak:          number;
  ai_message:      string;
  history:         RevenueGoalMonth[];
}

// ─── VIP Requests ─────────────────────────────────────────────────────────────

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

// ─── Visitor Insights (Analyse des visiteurs) ─────────────────────────────────

export type FunnelStage = 'click' | 'product_page' | 'cart' | 'checkout';
export type BenchScope = 'subcategory' | 'category' | 'platform' | 'own_previous' | 'target';
export type TrafficSourceKey = 'search' | 'category' | 'home' | 'sponsored' | 'storefront' | 'external' | 'direct';
export type ProblemCode =
  | 'low_visibility' | 'low_ctr' | 'price_high' | 'listing_quality' | 'no_reviews' | 'stock_variants'
  | 'low_add_to_cart' | 'shipping_cost' | 'cart_abandon' | 'checkout_abandon';

export interface InsightKpi {
  key: 'impressions' | 'ctr' | 'views' | 'unique_visitors' | 'add_to_cart_rate' | 'cart_to_order' | 'revenue_per_visit';
  value: number | null;
  previous: number | null;
  format: 'count' | 'rate' | 'money';
  change_pct: number | null;
  bench: { value: number; scope: BenchScope } | null;
}

export type FunnelStepKey = 'impressions' | 'clicks' | 'views' | 'carts' | 'checkouts' | 'orders';

export interface InsightEvidence {
  metric: string;
  value: number;
  bench: number | null;
  scope: BenchScope | null;
  rate?: boolean;
  weakest?: string | null;
}

export interface InsightAction {
  kind: 'edit' | 'discount' | 'ai_description' | 'boost' | 'restock' | 'listing_quality';
  focus?: string;
  pct?: number;
}

export interface InsightProduct {
  status: 'problem';
  stage: FunnelStage;
  code: ProblemCode;
  severity: 'high' | 'medium' | 'low';
  evidence: InsightEvidence[];
  actions: InsightAction[];
  lost_revenue: number | null;
  views: number;
  product: { id: number; name: string; slug: string; image: string | null; price: number };
}

export interface InsightResult {
  id: number;
  product: { id: number; name: string; image: string | null };
  kind: 'edit' | 'restock' | 'discount' | 'flash_sale' | 'coupon' | 'boost';
  problem_code: ProblemCode | null;
  stage: FunnelStage | null;
  applied_on: string;
  status: 'measured' | 'measuring' | 'insufficient';
  days_after: number;
  days_needed: number;
  metrics: { metric: 'ctr' | 'view_to_cart' | 'cart_to_order' | 'conversion' | 'views_per_day'; before: number | null; after: number | null }[];
}

export interface VisitorInsightsData {
  period: { days: 7 | 30 | 90; from: string; to: string; previous_from: string; previous_to: string };
  state: 'ok' | 'low_data' | 'no_products';
  tracking: { impressions_since: string | null; checkout_since: string | null; impressions_full: boolean; checkout_full: boolean };
  kpis: InsightKpi[];
  funnel: {
    steps: { key: FunnelStepKey; value: number; tracked: boolean }[];
    transitions: { from: FunnelStepKey; to: FunnelStepKey; rate: number | null; metric: string; bench: number | null; scope: BenchScope | null; ratio: number | null }[];
    leak: { from: FunnelStepKey; to: FunnelStepKey; ratio: number | null; scope: BenchScope | null; basis: 'benchmark' | 'drop' } | null;
  };
  traffic: {
    sources: { source: TrafficSourceKey; impressions: number; views: number; carts: number; orders: number; conversion: number | null }[];
    devices: { device: 'mobile' | 'tablet' | 'desktop' | 'unknown'; views: number; orders: number; share: number; conversion: number | null }[];
  };
  fix_this_week: InsightProduct[];
  stages: { stage: FunnelStage; count: number; lost_revenue: number; items: InsightProduct[] }[];
  summary: { products: number; problems: number; ok: number; insufficient: number; lost_revenue: number };
  actions: InsightResult[];
  generated_at: string;
}

// ─── QualityAuditProduct ──────────────────────────────────────────────────────

export interface QualityAuditTip {
  type:        'images' | 'description' | 'title' | 'attributes' | 'stock' | 'default';
  label:       string;
  points:      number;
  action_href: string;
}

export interface QualityAuditProduct {
  product_id:   number;
  product_name: string;
  image_url:    string | null;
  score:        number;
  tips:         QualityAuditTip[];
}

// ─── API client ───────────────────────────────────────────────────────────────

export const blackPepperApi = {

  dailyBrief: () =>
    jsonRequest<{ success: boolean; data: DailyBriefData }>('GET', '/seller/black/daily-brief'),

  // ── Revenue Goals (replaces profitCenter) ──────────────────────────────────
  revenueGoals: () =>
    jsonRequest<{ success: boolean; data: RevenueGoalsData }>('GET', '/seller/black/revenue-goals'),

  setRevenueGoal: (month: string, amount: number) =>
    jsonRequest<{ success: boolean; message: string; data: { month: string; amount: number } }>(
      'POST', '/seller/black/revenue-goals', { month, amount }
    ),

  getVipRequests: () =>
    jsonRequest<{ success: boolean; data: VipRequest[] }>('GET', '/seller/black/vip-requests'),

  visitorInsights: (period: 7 | 30 | 90) =>
    jsonRequest<{ success: boolean; data: VisitorInsightsData }>('GET', `/seller/black/visitor-insights?period=${period}`),

  /** A listing edit / restock saved from an Analyse des visiteurs action (promotions & boosts record themselves). */
  insightApplied: (productId: number, kind: 'edit' | 'restock', problem?: string | null, stage?: string | null) =>
    jsonRequest<{ success: boolean }>('POST', '/seller/black/visitor-insights/actions', {
      product_id: productId, kind, problem_code: problem ?? null, stage: stage ?? null,
    }),

  qualityAudit: () =>
    jsonRequest<{ success: boolean; data: QualityAuditProduct[] }>('GET', '/seller/black/quality-audit'),

  submitVipRequest: (type: VipRequestType, message: string) =>
    jsonRequest<{ success: boolean; message: string; data: VipRequest }>('POST', '/seller/black/vip-request', {
      type, message,
    }),
};