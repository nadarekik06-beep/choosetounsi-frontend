/**
 * lib/blackPepperApi.ts
 * Black Pepper endpoints (daily brief, Centre de profit, visitor insights, quality audit, VIP).
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

// ─── Centre de profit (money, goals, profitability) ──────────────────────────
// GET /seller/black/profit-center — see App\Services\Profit\ProfitCenter (backend)

export type GoalStatus = 'none' | 'unknown' | 'behind' | 'on_track' | 'ahead' | 'reached';
export type ProfitConfidence = 'low' | 'medium' | 'high';
export type GoalPreset = 'prudent' | 'realistic' | 'ambitious' | 'custom';

export interface ProfitGoal {
  month:           string;          // "2026-10"
  amount:          number;
  orders_target:   number | null;
  net_target:      number | null;
  preset:          GoalPreset | null;
  milestones_sent: number[];
  updated_at:      string | null;
}

export interface ProfitProgress {
  status:           GoalStatus;
  current_daily:    number;
  pct?:             number;
  pct_delivered?:   number;
  remaining?:       number;
  expected_by_now?: number;
  required_daily?:  number;
  orders_needed?:   number;
  gap_pct?:         number | null;
  orders?:          { done: number; target: number; pct: number } | null;
  net?:             { done: number; target: number; pct: number } | null;
}

export interface ProfitMonthTotals {
  month: string; sales: number; delivered: number; in_progress: number; orders: number;
  commission: number; shipping: number; refunds: number; ads: number; ads_credit: number; gross: number; net: number;
}

export interface ProfitHistoryMonth {
  month: string; current: boolean; sales: number; delivered: number; net: number; orders: number;
  goal: number; hit: boolean; pct: number | null;
}

export interface ProfitProduct {
  id: number; name: string; deleted: boolean; revenue: number; kept: number; units: number; share: number;
}

export interface ProfitDecliner {
  id: number; name: string; before: number; now: number; drop_pct: number; lost: number;
}

export interface ProfitTip {
  key: 'confirm_pending' | 'set_goal' | 'behind' | 'behind_flash' | 'no_sales_boost' | 'no_products'
     | 'ads_low_return' | 'declining' | 'ahead' | 'reached';
  tone: 'warn' | 'info' | 'good';
  href?: string;
  action?: 'open_goal';
  params: Record<string, string | number | null>;
}

export interface ProfitAlertSettings {
  enabled: boolean; milestones: boolean; pace: boolean; weekly: boolean;
  monthly_recap: boolean; new_goal_reminder: boolean; channel_bell: boolean; channel_email: boolean;
}

export interface ProfitCenterData {
  month: string; today: string; day: number; days_in_month: number; days_left: number;
  state: 'active' | 'new';
  goal: ProfitGoal | null;
  progress: ProfitProgress;
  projection: { amount: number; confidence: ProfitConfidence; run_rate: number; baseline: number | null; weight: number } | null;
  kpis: {
    sales: number; delivered: number; in_progress: number; orders: number; net: number;
    sales_prev_same: number; orders_prev_same: number; avg_basket: number | null;
    awaiting: { count: number; amount: number; oldest_days: number | null };
  };
  breakdown: { current: ProfitMonthTotals; previous: ProfitMonthTotals };
  cumulative: { day: number; sales: number }[];
  history: ProfitHistoryMonth[];
  streak: { current: number; best: number; hits: number; badges: string[]; best_month: { month: string; sales: number } | null };
  suggestion: {
    basis: 'starter' | 'last' | 'average'; months: number; reference: number | null;
    presets: Record<'prudent' | 'realistic' | 'ambitious', number> | null; same_month_last_year: number | null;
  };
  contributors: { top: ProfitProduct[]; declining: ProfitDecliner[]; compare_ready: boolean };
  ads: { spend: number; credit: number; revenue: number; orders: number; roas: number | null; campaigns: number } | null;
  payout: { awaiting_cash_in: number; ready: number; paid_this_month: number; last_paid_at: string | null };
  tips: ProfitTip[];
  alerts: ProfitAlertSettings;
}

export interface SaveGoalInput {
  month: string; amount: number; orders_target?: number | null; net_target?: number | null; preset?: GoalPreset;
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

  // ── Centre de profit ───────────────────────────────────────────────────────
  profitCenter: () =>
    jsonRequest<{ success: boolean; data: ProfitCenterData }>('GET', '/seller/black/profit-center'),

  saveGoal: (input: SaveGoalInput) =>
    jsonRequest<{ success: boolean; message: string; data: ProfitGoal }>('POST', '/seller/black/revenue-goals', input),

  deleteGoal: (month: string) =>
    jsonRequest<{ success: boolean; message: string }>('DELETE', `/seller/black/revenue-goals/${month}`),

  updateGoalAlerts: (settings: Partial<ProfitAlertSettings>) =>
    jsonRequest<{ success: boolean; message: string; data: ProfitAlertSettings }>('PUT', '/seller/black/profit-center/alerts', settings),

  /** Monthly CSV report, saved through a blob link (the token lives in storage, not a cookie). */
  exportProfitCsv: async (month: string) => {
    const res = await fetch(`${API_URL}/seller/black/profit-center/export?month=${month}`, { headers: { Accept: 'text/csv', ...authHeaders() } });
    if (!res.ok) throw new Error('Export failed');
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: `centre-de-profit-${month}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

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