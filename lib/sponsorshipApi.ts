// lib/sponsorshipApi.ts
// Sponsoring system API layer — seller + public endpoints.
// Same fetch + token pattern as sellerApi.ts.

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

export interface ActivatePayload {
  product_id:     number;
  duration_days?: number;  // default 7
  priority?:      number;  // 1-10, default 5
 // ── Targeting (all optional) ─────────────────────────────────────────
  target_gender?:        'male' | 'female' | 'unisex';
  target_wilaya_ids?:    string[];
  target_category_ids?:  number[];
  target_price_min?:     number;
  target_price_max?:     number;
}

// ── Boost info (mirrors backend BOOST constant) ───────────────────────────────

export const BOOST_SCORES: Record<SponsorPlan, number> = {
  free:  10,
  red:   30,
  black: 70,
};

export const SPONSOR_PRICES: Record<SponsorPlan, number> = {
  free:  5.000,
  red:   2.000,
  black: 0.000,  // free from quota
};

export const PLAN_BOOST_LABELS: Record<SponsorPlan, { label: string; color: string; description: string }> = {
  free:  { label: 'Low Boost',    color: '#198f41', description: '+10 visibility score — basic reach' },
  red:   { label: 'Medium Boost', color: '#db142e', description: '+30 visibility score — 3× more reach' },
  black: { label: 'High Boost',   color: '#f59e0b', description: '+70 visibility score — maximum reach' },
};

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