/**
 * lib/sellerForecastApi.ts — Outils IA → Ventes (sales forecast).
 *
 * Forecasts are computed on the server (nightly + after confirmed orders) and
 * served from stored snapshots: reading is cheap, there is no polling. The only
 * recompute from the page is "Actualiser", limited to once per 10 minutes.
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

/** Errors carry the HTTP status and body (429 refresh cooldown: { code, message, retry_in }). */
export type ApiError = Error & { response?: { status: number; data: { message?: string; code?: string; retry_in?: number } } };

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

// ─── Types (mirror App\Services\Forecast\ProductForecaster / ShopAggregator) ──

export type Tier = 'insufficient' | 'category' | 'blend' | 'limited' | 'own';
export type Labels = { fr: string; en: string; ar: string };

export interface Bucket {
  point: number; low: number; high: number;
  revenue_point: number; revenue_low: number; revenue_high: number;
}
export interface WeekBucket extends Bucket { start: string; end: string }
export interface MonthBucket extends Bucket { month: string }

export interface StockView {
  current: number; lead_time_days: number; safety_days: number;
  days_left: number | null; stockout_date: string | null;
  reorder_qty: number; reorder_by: string | null;
}

export interface VariantView {
  variant_id: number; labels: Labels; share: number; sold_180d: number;
  next28: { point: number; low: number; high: number };
  stock: StockView;
}

export interface ForecastEvent {
  id: number; key: string; names: Labels; starts_on: string; ends_on: string; days_until: number;
  effect: { change_pct: number | null; event_orders: number; baseline_orders: number; year: number } | null;
  applied: boolean;
}

/** Built by AppServicesForecastActionBuilder; which fields are set depends on the type. */
export interface ActionParams {
  product_id: number | null; product_name: string | null;
  variant_id?: number; variant?: Labels | null; stock?: number;
  days_left?: number; stockout_date?: string | null; reorder_qty?: number; reorder_by?: string | null;
  event_id?: number; event?: Labels; days_until?: number; starts_on?: string;
  change_pct?: number | null; effect_year?: number | null; effect_orders?: number | null; effect_reliable?: boolean;
  since?: string; actual?: number; expected_low?: number; expected_point?: number;
  views?: number; cart_adds?: number; cart_rate_pct?: number; category_rate_pct?: number | null;
  days_without_sale?: number; never_sold?: boolean;
}

export interface ForecastAction {
  type: 'out_of_stock' | 'stockout' | 'event' | 'sales_drop' | 'low_cart' | 'dormant' | 'no_data' | 'low_views';
  severity: 1 | 2 | 3;
  params: ActionParams;
  links: Array<{ kind: 'restock' | 'discount' | 'price' | 'description' | 'packs' | 'promote'; href: string }>;
}

export interface Signals {
  views_30d: number; cart_adds_30d: number; favorites_30d: number; orders_30d: number;
  cart_rate: number | null; conversion_rate: number | null; category_cart_rate: number | null;
}

export interface Accuracy {
  snapshot_date: string; point: number; low: number; high: number; actual: number; within: boolean;
}

export interface Forecast {
  scope: 'product' | 'shop';
  tier: Tier;
  model: string | null;
  weight_own?: number;
  product_id?: number;
  product_name?: string;
  live?: boolean;
  confidence: { score: number; level: 'high' | 'medium' | 'low' | 'none'; orders?: number; days?: number; error_pct?: number | null };
  data?: { orders: number; units: number; days: number; last_sale: string | null; promo_days: number; promo_excluded: boolean; intermittent: boolean };
  prior?: { products: number; sellers: number; orders: number; scope: 'price_band' | 'category' } | null;
  promo_uplift?: { factor: number; promo_days: number; promo_orders: number; applied: boolean } | null;
  weeks: WeekBucket[];
  months: MonthBucket[];
  next28: Bucket | null;
  unit_price: number | null;
  stock: StockView & { at_risk?: Array<{ product_id: number; name: string; days_left: number }> };
  variants?: VariantView[];
  history: Array<{ start: string; units: number; promo: boolean }>;
  signals: Signals;
  events: ForecastEvent[];
  actions: ForecastAction[];
  accuracy: Accuracy | null;
  tiers?: Partial<Record<Tier, number>>;
  products_count?: number;
  snapshot_date: string;
  computed_at: string;
}

export interface ProductRow {
  id: number; name: string; tier: Tier; confidence: number; days_left: number | null;
  has_variants: boolean; live: boolean; actions: number;
}

export interface ForecastSettings {
  lead_time_days: number; safety_days: number;
  alerts_enabled: boolean; alerts_email: boolean; weekly_digest: boolean; stockout_alert_days: number;
  product: { lead_time_days?: number; safety_days?: number } | null;
}

export interface TrackRecord {
  forecasts: number; products?: number; coverage_pct?: number; wape_pct?: number | null; mae_units?: number;
}

export interface ForecastResponse {
  forecast: Forecast | null;
  products: ProductRow[];
  track_record: TrackRecord;
  settings: ForecastSettings;
  refresh_in: number;
}

export type SettingsBody = Partial<Omit<ForecastSettings, 'product' | 'lead_time_days' | 'safety_days'>> & {
  product_id?: number | null; view_product_id?: number | null; lead_time_days?: number | null; safety_days?: number | null;
};

export interface Explanation { text: string; source: 'ai' | 'template' }

const q = (productId: number | null) => (productId ? `?product_id=${productId}` : '');

export const forecastApi = {
  get: (productId: number | null) =>
    jsonRequest<{ success: boolean; data: ForecastResponse }>('GET', `/seller/forecast${q(productId)}`).then(r => r.data),

  refresh: (productId: number | null) =>
    jsonRequest<{ success: boolean; data: ForecastResponse }>('POST', '/seller/forecast/refresh', { product_id: productId }).then(r => r.data),

  explain: (productId: number | null, locale: string) =>
    jsonRequest<{ success: boolean; data: Explanation | null }>(
      'GET', `/seller/forecast/explain?locale=${locale}${productId ? `&product_id=${productId}` : ''}`
    ).then(r => r.data),

  saveSettings: (body: SettingsBody) =>
    jsonRequest<{ success: boolean; data: ForecastResponse }>('PUT', '/seller/forecast/settings', body).then(r => r.data),
};
