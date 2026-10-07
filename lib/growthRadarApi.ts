/**
 * lib/growthRadarApi.ts — Seller dashboard → Growth Radar.
 *
 * Black Pepper only. Scores and cards are computed nightly on the server
 * (growth:compute) and only read here. Card actions open the existing promotion / coupon / boost / product
 * flows pre-filled (see growthActionHref); those flows send `growth_card_id`
 * back so the server can measure the result.
 */

const RAW_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const BASE_URL = RAW_URL.replace(/\/api\/?$/, '');
const API_URL  = `${BASE_URL}/api`;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const k of ['ct_auth_token', 'auth_token', 'token', 'access_token']) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

export type ApiError = Error & { response?: { status: number; data: { message?: string; code?: string } } };

async function jsonRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message ?? 'Request failed') as ApiError;
    err.response = { data: json, status: res.status };
    throw err;
  }
  return json;
}

// ─── Types (mirror App\Services\GrowthRadar\Presenter) ────────────────────────

export type CardType = 'leaking_product' | 'price_position' | 'hidden_demand' | 'warm_audience' | 'seasonal' | 'dead_stock' | 'promo_timing';
export type Confidence = 'low' | 'medium' | 'high';
export type SubKey = 'pricing' | 'visibility' | 'conversion' | 'stock';

export interface Impact { low: number; high: number }

export interface EvidenceNumber { key: string; value: number; unit?: 'dt' | '%' | 'x'; compare?: number }

export type Chart =
  | { kind: 'sparkline'; views: number[]; orders: number[] }
  | { kind: 'price_range'; p25: number; median: number; p75: number; mine: number }
  | { kind: 'traffic'; hours: number[]; days: number[]; day: number; hour: number }
  | { kind: 'timeline'; today: string; start: string; event_start: string; event_end: string };

export type CardAction =
  | { kind: 'discount' | 'flash_sale'; product_ids: number[]; discount_type: 'percentage'; discount_value: number; starts_at: string; ends_at: string }
  | { kind: 'coupon'; product_ids: number[]; discount_type: 'percentage'; discount_value: number; days: number; audience: number; usage_limit_per_customer: number }
  | { kind: 'boost'; product_id: number }
  | { kind: 'edit'; product_id: number; focus: 'photos' | 'description' | 'price'; price?: number }
  | { kind: 'listing'; query: string; category_id: number }
  | { kind: 'bundle'; product_id: number };

export interface GrowthCard {
  id: number;
  type: CardType;
  status: 'new' | 'snoozed';
  confidence: Confidence;
  impact: Impact | null;
  headline: string;
  headline_plain: string;
  recommendation: string;
  basis: string[];
  evidence: { numbers?: EvidenceNumber[]; chart?: Chart };
  action: CardAction | null;
  alt: CardAction | null;
  product: { id: number; name: string; slug: string; price: number; stock: number; image: string | null } | null;
  params: Record<string, unknown>;
  /** leaking_product: the full funnel diagnosis in Analyse des visiteurs */
  insights_href?: string | null;
  created_at: string;
}

export interface ResultMetrics { units: number; revenue: number; views: number; orders: number }

export interface ActionResult {
  days: number;
  baseline: ResultMetrics;
  during: ResultMetrics;
  after: ResultMetrics | null;
  daily?: { day: string; units: number; phase: 'before' | 'during' | 'after' }[];
  discount_cost: number;
  ad_spend: number;
  gross_gain: number;
  net_gain: number;
  lift_pct: number | null;
  unclear?: string[];
}

export interface GrowthAction {
  id: number;
  kind: 'discount' | 'flash_sale' | 'coupon' | 'boost' | 'edit' | 'listing' | 'bundle';
  kind_label: string;
  card_type: CardType | null;
  product: { id: number; name: string | null } | null;
  starts_at: string;
  ends_at: string;
  status: 'running' | 'measured';
  verdict: 'win' | 'loss' | 'neutral' | 'unclear' | null;
  headline: string | null;
  result: ActionResult | null;
  unclear_reasons: string[];
  measure_on: string;
}

export interface Unlock { key: 'add_products' | 'more_views' | 'first_sale' | 'market_data' | 'platform_data'; count?: number }

export interface GrowthScore {
  value: number | null;
  trend: number | null;
  subs: { key: SubKey; value: number | null; trend: number | null }[];
  inputs: Record<string, unknown>;
  unlocks: Unlock[];
}

export interface GrowthRadarData {
  week_start: string;
  computed_at: string | null;
  score: GrowthScore | null;
  cards: GrowthCard[];
  results: GrowthAction[];
  snoozed: number;
}

export interface LearningSummary {
  by_kind: Record<string, { n: number; wins: number; lift: number; multiplier: number }>;
  best: string | null;
  min_actions: number;
}

export interface GrowthHistory {
  actions: GrowthAction[];
  learning: LearningSummary | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const growthRadarApi = {
  get:      () => jsonRequest<{ success: boolean; data: GrowthRadarData }>('GET', '/seller/growth-radar'),
  refresh:  () => jsonRequest<{ success: boolean; data: GrowthRadarData }>('POST', '/seller/growth-radar/refresh'),
  history:  () => jsonRequest<{ success: boolean; data: GrowthHistory }>('GET', '/seller/growth-radar/history'),
  dismiss:  (id: number) => jsonRequest<{ success: boolean }>('POST', `/seller/growth-radar/cards/${id}/dismiss`),
  snooze:   (id: number, days: 3 | 7) => jsonRequest<{ success: boolean }>('POST', `/seller/growth-radar/cards/${id}/snooze`, { days }),
  applied:  (id: number, kind: 'edit' | 'listing' | 'bundle') =>
    jsonRequest<{ success: boolean }>('POST', `/seller/growth-radar/cards/${id}/applied`, { kind }),
};

/**
 * Where a card's action button goes: the existing flow, pre-filled. `card` travels
 * along so the flow can send growth_card_id when it saves.
 */
export function growthActionHref(cardId: number, a: CardAction): string {
  const q = (o: Record<string, string | number | undefined>) =>
    new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  switch (a.kind) {
    case 'discount':
    case 'flash_sale':
      return `/seller/promotions?${q({
        create: a.kind, product: a.product_ids.join(','), discount_type: a.discount_type,
        discount_value: a.discount_value, starts_at: a.starts_at, ends_at: a.ends_at, card: cardId,
      })}`;
    case 'coupon':
      return `/seller/promotions?${q({
        create: 'coupon', product: a.product_ids.join(','), discount_type: a.discount_type,
        discount_value: a.discount_value, days: a.days, per_customer: a.usage_limit_per_customer, audience: a.audience, card: cardId,
      })}`;
    case 'boost':
      return `/seller/promote/new?${q({ product_id: a.product_id, card: cardId })}`;
    case 'edit':
      return `/seller/products?${q({ edit: a.product_id, focus: a.focus, price: a.price, card: cardId })}`;
    case 'listing':
      return `/seller/products?${q({ create: 1, name: a.query, category: a.category_id, card: cardId })}`;
    case 'bundle':
      return `/seller/ai-tools?${q({ tab: 'bundles', product_id: a.product_id, autorun: 1, card: cardId })}`;
  }
}

/** growth_card_id from the current URL (?card=…), for the flows a card opens. */
export function growthCardFromUrl(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = Number(new URLSearchParams(window.location.search).get('card'));
  return Number.isFinite(v) && v > 0 ? v : undefined;
}
