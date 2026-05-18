// lib/sponsorshipApi.ts
// Sponsoring system API layer — seller + public endpoints.
// UPDATED: Added payment types, boost surcharge logic, card payment endpoint.

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

// ── Types ─────────────────────────────────────────────────────────────────────

export type SponsorPlan   = 'free' | 'red' | 'black';
export type SponsorStatus = 'active' | 'expired' | 'cancelled';

export interface SponsorshipRecord {
  id:               number;
  seller_id:        number;
  product_id:       number;
  plan_type:        SponsorPlan;
  boost_score:      number;
  status:           SponsorStatus;
  start_at:         string | null;
  end_at:           string | null;
  amount_charged:   number;
  was_paid:         boolean;
  used_free_quota:  boolean;
  ai_tags:          string[] | null;
  ai_ad_copy:       string | null;
  impressions:      number;
  clicks:           number;
  conversions:      number;
  created_at:       string;
  // Payment fields
  payment_status:   'pending' | 'paid' | 'free' | 'failed' | null;
  payment_method:   'card' | 'free_quota' | null;
  boost_extra_cost: number;   // extra DT charged for priority > 5
  product?: {
    id:        number;
    name:      string;
    slug:      string;
    price:     number;
    is_active: boolean;
    image_url: string | null;
  };
}

export interface SponsorQuota {
  plan:           SponsorPlan;
  free_per_week:  number;
  used_this_week: number;
  remaining:      number;
  week_resets_at: string;
  boost_scores:   Record<SponsorPlan, number>;
  prices:         Record<SponsorPlan, number>;
}

export interface SponsoredProduct {
  id:               number;
  name:             string;
  slug:             string;
  price:            number;
  stock:            number;
  is_sponsored:     boolean;
  primary_image_url: string | null;
  category?:        { id: number; name: string; slug: string };
  seller?:          { id: number; name: string };
  sponsor_data?: {
    id:         number;
    ai_ad_copy: string | null;
    ai_tags:    string[] | null;
    boost_score: number;
    end_at:     string | null;
  } | null;
}

// ── Payment types ─────────────────────────────────────────────────────────────

export interface CardPaymentDetails {
  card_number:  string;  // 16 digits (will be masked before sending)
  expiry_month: string;  // MM
  expiry_year:  string;  // YY
  cvv:          string;  // 3-4 digits
  cardholder:   string;  // name on card
}

export interface ActivatePayload {
  product_id:     number;
  duration_days?: number;   // default 7
  priority?:      number;   // 1-10, default 5
  // ── Targeting (all optional) ─────────────────────────────────────────
  target_gender?:        'male' | 'female' | 'unisex';
  target_wilaya_ids?:    string[];
  target_category_ids?:  number[];
  target_price_min?:     number;
  target_price_max?:     number;
  // ── Payment ──────────────────────────────────────────────────────────
  payment_method?: 'card' | 'free_quota';
  payment_token?:  string;   // tokenised card reference from gateway
}

// ── Pricing constants ─────────────────────────────────────────────────────────

export const BOOST_SCORES: Record<SponsorPlan, number> = {
  free:  10,
  red:   30,
  black: 70,
};

export const SPONSOR_PRICES: Record<SponsorPlan, number> = {
  free:  5.000,   // DT per day
  red:   2.000,   // DT per day
  black: 1.500,   // DT per day (after quota exhausted)
};

// Extra charge per visibility point above 5 (applies to ALL plans)
export const BOOST_SURCHARGE_PER_POINT = 5.000; // DT per extra point
export const BOOST_FREE_THRESHOLD      = 5;     // points ≤ 5 are free

/**
 * Calculate the boost surcharge given a priority (1-10).
 * Points above 5 cost 5 DT each on top of the base campaign price.
 */
export function calcBoostSurcharge(priority: number): number {
  const extra = Math.max(0, priority - BOOST_FREE_THRESHOLD);
  return extra * BOOST_SURCHARGE_PER_POINT;
}

/**
 * Calculate the full campaign cost.
 * @param plan         - seller plan
 * @param duration     - days
 * @param priority     - 1-10
 * @param freeQuota    - black plan free slot available
 */
export function calcTotalCost(
  plan: SponsorPlan,
  duration: number,
  priority: number,
  freeQuota: boolean,
): {
  basePerDay:     number;
  baseCost:       number;
  boostSurcharge: number;
  total:          number;
  isFree:         boolean;
} {
  const surcharge = calcBoostSurcharge(priority);

  if (freeQuota) {
    // Black plan free quota — only surcharge applies
    return {
      basePerDay:     0,
      baseCost:       0,
      boostSurcharge: surcharge,
      total:          surcharge,
      isFree:         surcharge === 0,
    };
  }

  const basePerDay = SPONSOR_PRICES[plan];
  const baseCost   = basePerDay * duration;
  const total      = baseCost + surcharge;

  return {
    basePerDay,
    baseCost,
    boostSurcharge: surcharge,
    total,
    isFree: total === 0,
  };
}

export const PLAN_BOOST_LABELS: Record<SponsorPlan, { label: string; color: string; description: string }> = {
  free:  { label: 'Low Boost',    color: '#198f41', description: '+10 visibility score — basic reach' },
  red:   { label: 'Medium Boost', color: '#db142e', description: '+30 visibility score — 3× more reach' },
  black: { label: 'High Boost',   color: '#f59e0b', description: '+70 visibility score — maximum reach' },
};

// ── Tokenise card locally (sandbox: just base64-encode masked data) ────────────
// In production replace with your gateway's JS SDK tokenisation call.
export function tokeniseCard(card: CardPaymentDetails): string {
  const masked = {
    last4:    card.card_number.slice(-4),
    exp:      `${card.expiry_month}/${card.expiry_year}`,
    holder:   card.cardholder,
    // Never send raw card number or CVV to your backend — use gateway tokenisation
  };
  return btoa(JSON.stringify(masked));  // sandbox token
}

// ── API ───────────────────────────────────────────────────────────────────────

export const sponsorshipApi = {
  // Seller: activate sponsorship
  sponsor: (payload: ActivatePayload) =>
    jsonRequest<{
      success:       boolean;
      message:       string;
      data: {
        sponsorship:      SponsorshipRecord;
        boost_score:      number;
        plan:             SponsorPlan;
        expires_at:       string;
        used_free_quota:  boolean;
        remaining_free:   number | null;
        ai_tags:          string[];
        ai_ad_copy:       string;
        amount_charged:   number;
        boost_extra_cost: number;
        payment_status:   string;
      };
    }>('POST', '/seller/sponsorships/sponsor', payload),

  // Seller: cancel active sponsorship
  cancel: (id: number) =>
    jsonRequest<{ success: boolean; message: string }>('DELETE', `/seller/sponsorships/${id}/cancel`),

  // Seller: list all sponsorships (paginated)
  list: (params: { status?: SponsorStatus; per_page?: number; page?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return jsonRequest<{
      success: boolean;
      data:    { data: SponsorshipRecord[]; current_page: number; last_page: number; total: number };
      meta:    { plan: SponsorPlan; remaining_free: number | null; boost_scores: any; prices: any };
    }>('GET', `/seller/sponsorships${qs ? `?${qs}` : ''}`);
  },

  // Seller: black-plan quota status
  quota: () =>
    jsonRequest<{ success: boolean; data: SponsorQuota }>('GET', '/seller/sponsorships/quota'),

  // Public: sponsored product feed (homepage / category / search)
  publicFeed: (params: { limit?: number; category_slug?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString();
    return jsonRequest<{ success: boolean; data: SponsoredProduct[] }>(
      'GET', `/sponsored-products${qs ? `?${qs}` : ''}`
    );
  },

  // Analytics: record impression (fire-and-forget)
  recordImpression: (sponsorshipId: number) => {
    fetch(`${API_URL}/sponsorships/${sponsorshipId}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },

  // Analytics: record click (fire-and-forget)
  recordClick: (sponsorshipId: number) => {
    fetch(`${API_URL}/sponsorships/${sponsorshipId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },
};