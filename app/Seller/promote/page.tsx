'use client';
/**
 * app/seller/promote/page.tsx
 *
 * "Promote Product" page in the seller dashboard.
 * Accessible to ALL plan levels (free, red, black).
 * Plan affects pricing + boost level displayed in the preview.
 *
 * Flow:
 *   1. Seller selects a product from their approved+active list
 *   2. Chooses duration (3, 7, 14, 30 days)
 *   3. Sets priority (1-10 slider)
 *   4. Preview panel shows: boost level, AI tags, ad copy preview, estimated cost
 *   5. Confirms → POST /api/seller/sponsorships/sponsor
 *   6. Success screen shows AI-generated tags + ad copy
 *
 * Also shows: list of current active sponsorships with cancel buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, TrendingUp, Eye, Tag, Sparkles, CheckCircle,
  XCircle, Clock, Crown, Flame, Leaf, AlertCircle,
  ChevronDown, BarChart2,
} from 'lucide-react';
import { useTheme } from '../layout';
import { useSubscription } from '@/app/hooks/useSubscription';
import {
  sponsorshipApi,
  SponsorshipRecord,
  SponsorPlan,
  BOOST_SCORES,
  SPONSOR_PRICES,
  PLAN_BOOST_LABELS,
  SponsorQuota,
} from '@/lib/sponsorshipApi';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SellerProduct {
  id:          number;
  name:        string;
  slug:        string;
  price:       number;
  is_active:   boolean;
  is_approved: boolean;
  image_url:   string | null;
  is_sponsored: boolean;
  category?:   { id: number; name: string };
}

const DURATIONS = [
  { days: 3,  label: '3 days',  popular: false },
  { days: 7,  label: '1 week',  popular: true  },
  { days: 14, label: '2 weeks', popular: false },
  { days: 30, label: '1 month', popular: false },
];

const PLAN_ICONS: Record<SponsorPlan, React.ReactNode> = {
  free:  <Leaf  size={14} color="#198f41" />,
  red:   <Flame size={14} color="#db142e" />,
  black: <Crown size={14} color="#f59e0b" />,
};

const TUNISIAN_WILAYAS = [
  'Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte',
  'Béja','Jendouba','Kef','Siliana','Sousse','Monastir','Mahdia',
  'Sfax','Kairouan','Kasserine','Sidi Bouzid','Gabès','Medenine',
  'Tataouine','Gafsa','Tozeur','Kébili',
];

// ── Main page component ────────────────────────────────────────────────────────
export default function PromoteProductPage() {
  const { dark } = useTheme();
  const router   = useRouter();
  const { plan, loading: planLoading } = useSubscription();

  // Targeting state
  const [targetGender, setTargetGender] = useState<'male' | 'female' | 'unisex' | ''>('');
  const [targetWilayas,    setTargetWilayas]     = useState<string[]>([]);
  const [targetCategories, setTargetCategories]  = useState<number[]>([]);
  const [targetPriceMin,   setTargetPriceMin]    = useState<string>('');
  const [targetPriceMax,   setTargetPriceMax]    = useState<string>('');

  // Product list
  const [products,    setProducts]    = useState<SellerProduct[]>([]);
  const [loadingProds,setLoadingProds]= useState(true);

  // Form state
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [duration,    setDuration]    = useState(7);
  const [priority,    setPriority]    = useState(5);

  // Quota (black plan)
  const [quota,       setQuota]       = useState<SponsorQuota | null>(null);

  // Active sponsorships
  const [active,      setActive]      = useState<SponsorshipRecord[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  // Submission
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState<any | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [cancelling,  setCancelling]  = useState<number | null>(null);

  const bg       = dark ? '#0D1117' : '#f4f5f7';
  const card     = dark ? '#161b27' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : '#e8eaed';
  const textMain = dark ? '#f0f0f0' : '#111';
  const textMuted= dark ? 'rgba(255,255,255,0.45)' : '#888';

  // ── Fetch products ───────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProds(true);
      const token = localStorage.getItem('ct_auth_token');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
        .replace(/\/api\/?$/, '');
      const res = await fetch(`${apiUrl}/api/seller/products?is_approved=true&is_active=true&per_page=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = await res.json();
      const list = (json.data?.data ?? []) as SellerProduct[];
      setProducts(list);
    } catch { /* silent */ } finally {
      setLoadingProds(false);
    }
  }, []);

  // ── Fetch active sponsorships + quota ────────────────────────────────────────
  const fetchActive = useCallback(async () => {
    try {
      setLoadingActive(true);
      const res = await sponsorshipApi.list({ status: 'active', per_page: 50 });
      setActive(res.data.data ?? []);
    } catch { /* silent */ } finally {
      setLoadingActive(false);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    if (!plan || plan !== 'black') return;
    try {
      const res = await sponsorshipApi.quota();
      setQuota(res.data);
    } catch { /* silent */ }
  }, [plan]);

  useEffect(() => {
    fetchProducts();
    fetchActive();
    fetchQuota();
  }, [fetchProducts, fetchActive, fetchQuota]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const currentPlan   = (plan ?? 'free') as SponsorPlan;
  const boostBase     = BOOST_SCORES[currentPlan];
  const finalBoost    = Math.round(boostBase * (priority / 10));
  const pricePerDay   = SPONSOR_PRICES[currentPlan];
  const totalCost     = currentPlan === 'black' && (quota?.remaining ?? 0) > 0
    ? 0
    : pricePerDay * duration;

  const selectedProduct = products.find(p => p.id === selectedId);
  const isAlreadySponsored = selectedProduct
    ? active.some(a => a.product_id === selectedProduct.id)
    : false;

  const boostInfo     = PLAN_BOOST_LABELS[currentPlan];

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await sponsorshipApi.sponsor({
        product_id:           selectedId,
        duration_days:        duration,
        priority,
        target_gender:        targetGender || undefined,
        target_wilaya_ids:    targetWilayas.length ? targetWilayas : undefined,
        target_category_ids:  targetCategories.length ? targetCategories : undefined,
        target_price_min:     targetPriceMin ? Number(targetPriceMin) : undefined,
        target_price_max:     targetPriceMax ? Number(targetPriceMax) : undefined,
      });
      setSuccess(res.data);
      fetchActive();
      fetchQuota();
      setSelectedId(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to activate sponsorship. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────────
  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await sponsorshipApi.cancel(id);
      fetchActive();
      fetchQuota();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Cancel failed.');
    } finally {
      setCancelling(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 24px 48px' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Zap size={20} color="#db142e" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: textMain, margin: 0 }}>
            Promote a Product
          </h1>
        </div>
        <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
          Boost your product visibility across the homepage, category pages, and search results.
        </p>
      </div>

      {/* ── Success banner ── */}
      {success && (
        <div style={{
          background: dark ? 'rgba(25,143,65,0.15)' : '#f0fdf4',
          border: '1px solid #16a34a',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <CheckCircle size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#16a34a', margin: '0 0 6px' }}>
              Sponsorship activated!
            </p>
            <p style={{ fontSize: 13, color: textMuted, margin: '0 0 10px' }}>
              Boost: <strong>{success.boost_score}</strong> points •
              Expires: <strong>{new Date(success.expires_at).toLocaleDateString('en-GB')}</strong>
              {success.used_free_quota && (
                <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>
                  ⬛ Free quota used ({success.remaining_free} remaining this week)
                </span>
              )}
            </p>
            {success.ai_tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: textMuted, fontWeight: 700 }}>AI Tags:</span>
                {(success.ai_tags as string[]).map((tag, i) => (
                  <span key={i} style={{
                    background: dark ? 'rgba(99,102,241,0.18)' : '#ede9fe',
                    color: '#7c3aed', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 999,
                  }}>#{tag}</span>
                ))}
              </div>
            )}
            {success.ai_ad_copy && (
              <p style={{
                fontSize: 13, color: textMain, fontStyle: 'italic',
                background: dark ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
                padding: '8px 12px', borderRadius: 8, margin: 0,
                borderLeft: '3px solid #db142e',
              }}>
                "{success.ai_ad_copy}"
              </p>
            )}
          </div>
          <button
            onClick={() => setSuccess(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 4 }}
          >✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Step 1: Product selection */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#db142e', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>1</span>
              Select Product
            </h2>

            {loadingProds ? (
              <div style={{ color: textMuted, fontSize: 13 }}>Loading your products…</div>
            ) : products.length === 0 ? (
              <div style={{ color: textMuted, fontSize: 13 }}>
                No approved and active products found. Make sure your products are approved by admin.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {products.map(p => {
                  const isSelected     = selectedId === p.id;
                  const alreadySponsored = active.some(a => a.product_id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => !alreadySponsored && setSelectedId(isSelected ? null : p.id)}
                      disabled={alreadySponsored}
                      style={{
                        background: isSelected
                          ? dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.06)'
                          : dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
                        border: `1.5px solid ${isSelected ? '#db142e' : border}`,
                        borderRadius: 12,
                        padding: 12,
                        cursor: alreadySponsored ? 'not-allowed' : 'pointer',
                        opacity: alreadySponsored ? 0.5 : 1,
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{
                          width: '100%', aspectRatio: '4/3', objectFit: 'cover',
                          borderRadius: 8, display: 'block', marginBottom: 8,
                        }} />
                      ) : (
                        <div style={{
                          width: '100%', aspectRatio: '4/3', borderRadius: 8,
                          background: dark ? 'rgba(255,255,255,0.05)' : '#eee',
                          marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Tag size={20} color={textMuted} />
                        </div>
                      )}
                      <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: '0 0 2px', lineHeight: 1.3 }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#db142e', fontWeight: 700, margin: 0 }}>
                        {Number(p.price).toFixed(3)} DT
                      </p>
                      {alreadySponsored && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8,
                          background: '#db142e', color: '#fff',
                          fontSize: 8, fontWeight: 800, padding: '2px 5px',
                          borderRadius: 999, textTransform: 'uppercase',
                        }}>Active</span>
                      )}
                      {isSelected && !alreadySponsored && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8,
                          background: '#198f41', color: '#fff',
                          fontSize: 8, fontWeight: 800, padding: '2px 5px',
                          borderRadius: 999,
                        }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Duration */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#db142e', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>2</span>
              Duration
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {DURATIONS.map(d => (
                <button
                  key={d.days}
                  onClick={() => setDuration(d.days)}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    border: `1.5px solid ${duration === d.days ? '#db142e' : border}`,
                    background: duration === d.days
                      ? dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.06)'
                      : 'transparent',
                    color: duration === d.days ? '#db142e' : textMuted,
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {d.label}
                  {d.popular && (
                    <span style={{
                      position: 'absolute', top: -8, right: -6,
                      background: '#f59e0b', color: '#fff',
                      fontSize: 7, fontWeight: 900, padding: '1px 5px',
                      borderRadius: 999, textTransform: 'uppercase',
                    }}>Popular</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Priority */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#db142e', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>3</span>
              Visibility Priority
            </h2>
            <p style={{ fontSize: 12, color: textMuted, margin: '0 0 16px' }}>
              Higher priority = appears higher in sponsored slots. Capped by your plan's max boost.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input
                type="range" min={1} max={10} value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#db142e', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: 52, textAlign: 'center', fontWeight: 900,
                fontSize: 18, color: '#db142e',
              }}>
                {priority}/10
              </span>
            </div>
            <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(finalBoost / 70) * 100}%`,
                background: `linear-gradient(90deg, #198f41, #db142e, #f59e0b)`,
                borderRadius: 3,
                transition: 'width 0.2s ease',
              }} />
            </div>
            <p style={{ fontSize: 11, color: textMuted, marginTop: 6 }}>
              Final boost: <strong style={{ color: textMain }}>{finalBoost} points</strong>
              {' '}(plan base: {boostBase})
            </p>
          </div>

          {/* Step 4: Audience Targeting */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#db142e', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>4</span>
              Audience Targeting
              <span style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginLeft: 4 }}>(optional)</span>
            </h2>
            <p style={{ fontSize: 12, color: textMuted, margin: '0 0 18px' }}>
              Leave all fields empty to show to everyone. Fill any field to restrict who sees your ad.
            </p>

            {/* Gender */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Gender</p>
              <div style={{ display: 'flex', gap: 8 }}>
              {([ 
              { value: '' as const,       label: 'All'    },
              { value: 'male' as const,   label: 'Men'    },
              { value: 'female' as const, label: 'Women'  },
              { value: 'unisex' as const, label: 'Unisex' },
            ] as const).map(g => (
                  <button
                    key={g.value}
                    onClick={() => setTargetGender(g.value)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${targetGender === g.value ? '#db142e' : border}`,
                      background: targetGender === g.value
                        ? (dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.06)')
                        : 'transparent',
                      color: targetGender === g.value ? '#db142e' : textMuted,
                      transition: 'all 0.13s',
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Target Price Range (DT)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={targetPriceMin}
                  onChange={e => setTargetPriceMin(e.target.value)}
                  style={{
                    width: 90, padding: '7px 10px', borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.04)' : '#f8f9fa',
                    color: textMain, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <span style={{ color: textMuted, fontSize: 12 }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={targetPriceMax}
                  onChange={e => setTargetPriceMax(e.target.value)}
                  style={{
                    width: 90, padding: '7px 10px', borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.04)' : '#f8f9fa',
                    color: textMain, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 11, color: textMuted }}>Target users whose budget falls in this range</span>
              </div>
            </div>

            {/* Wilaya */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                Target Regions
                {targetWilayas.length > 0 && (
                  <span style={{ background: '#db142e', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 900, padding: '1px 6px', marginLeft: 6 }}>
                    {targetWilayas.length}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TUNISIAN_WILAYAS.map(w => {
                  const on = targetWilayas.includes(w);
                  return (
                    <button
                      key={w}
                      onClick={() => setTargetWilayas(prev => on ? prev.filter(x => x !== w) : [...prev, w])}
                      style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${on ? '#db142e' : border}`,
                        background: on ? '#db142e' : 'transparent',
                        color: on ? '#fff' : textMuted,
                        transition: 'all 0.12s',
                      }}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
              {targetWilayas.length > 0 && (
                <button
                  onClick={() => setTargetWilayas([])}
                  style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 11, color: '#db142e', cursor: 'pointer', fontWeight: 700 }}
                >
                  Clear regions
                </button>
              )}
            </div>

            {/* Categories */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                Target Categories
                {targetCategories.length > 0 && (
                  <span style={{ background: '#db142e', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 900, padding: '1px 6px', marginLeft: 6 }}>
                    {targetCategories.length}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {products
                  .reduce<{ id: number; name: string }[]>((acc, p) => {
                    const cat = p.category;
                    if (cat && !acc.find(c => c.id === cat.id)) acc.push(cat);
                    return acc;
                  }, [])
                  .map(cat => {
                    const on = targetCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setTargetCategories(prev => on ? prev.filter(x => x !== cat.id) : [...prev, cat.id])}
                        style={{
                          padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${on ? '#db142e' : border}`,
                          background: on ? '#db142e' : 'transparent',
                          color: on ? '#fff' : textMuted,
                          transition: 'all 0.12s',
                        }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
              border: '1px solid #ef4444', borderRadius: 12,
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle size={18} color="#ef4444" />
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 600 }}>{error}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview + Summary ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>

          {/* Plan info card */}
          <div style={{
            background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>
              Your Plan
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {PLAN_ICONS[currentPlan]}
              <span style={{ fontSize: 15, fontWeight: 900, color: textMain, textTransform: 'capitalize' }}>
                {currentPlan === 'free' ? 'Green Pepper (Free)' : currentPlan === 'red' ? 'Red Pepper' : 'Black Pepper'}
              </span>
            </div>
            <div style={{
              background: dark ? 'rgba(255,255,255,0.04)' : '#f8f9fa',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <TrendingUp size={14} color={boostInfo.color} />
                <span style={{ fontSize: 12, fontWeight: 800, color: boostInfo.color }}>
                  {boostInfo.label}
                </span>
              </div>
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{boostInfo.description}</p>
            </div>

            {/* Black quota */}
            {currentPlan === 'black' && quota && (
              <div style={{
                marginTop: 12,
                background: dark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', margin: '0 0 4px' }}>
                  ⬛ Free Quota This Week
                </p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: i < (quota.remaining ?? 0)
                        ? '#f59e0b'
                        : dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: textMuted, margin: '5px 0 0' }}>
                  {quota.remaining}/3 free activations remaining
                </p>
              </div>
            )}
          </div>

          {/* Cost summary */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>
              Sponsorship Summary
            </p>
            {[
              ['Product',  selectedProduct ? selectedProduct.name : '—'],
              ['Duration', `${duration} days`],
              ['Boost',    `+${finalBoost} points`],
              ['Rate',     currentPlan === 'black' && (quota?.remaining ?? 0) > 0 ? 'Free (quota)' : `${SPONSOR_PRICES[currentPlan].toFixed(3)} DT/day`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: textMuted }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: textMain }}>{value}</span>
              </div>
            ))}
            <div style={{ height: 1, background: border, margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Total Cost</span>
              <span style={{
                fontSize: 18, fontWeight: 900,
                color: totalCost === 0 ? '#198f41' : '#db142e',
              }}>
                {totalCost === 0 ? 'FREE' : `${totalCost.toFixed(3)} DT`}
              </span>
            </div>
            {totalCost > 0 && (
              <p style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>
                * Payment integration coming soon. Currently approved automatically.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedId || submitting || isAlreadySponsored}
              style={{
                width: '100%', marginTop: 16,
                padding: '13px 0',
                background: !selectedId || isAlreadySponsored
                  ? dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'
                  : 'linear-gradient(135deg, #db142e, #a00f22)',
                color: !selectedId || isAlreadySponsored ? textMuted : '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 800,
                cursor: !selectedId || isAlreadySponsored ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s ease',
                boxShadow: selectedId && !isAlreadySponsored ? '0 4px 14px rgba(219,20,46,0.35)' : 'none',
              }}
            >
              {submitting ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Activating…
                </>
              ) : isAlreadySponsored ? (
                'Already Sponsored'
              ) : (
                <><Zap size={16} /> Activate Sponsorship</>
              )}
            </button>
          </div>

          {/* Active sponsorships list */}
          {active.length > 0 && (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={12} /> Active Sponsorships ({active.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.map(s => (
                  <div key={s.id} style={{
                    background: dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
                    border: `1px solid ${border}`, borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.product?.name ?? `Product #${s.product_id}`}
                      </p>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                        <Eye size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {s.impressions} views • {s.clicks} clicks
                        {s.end_at && ` • expires ${new Date(s.end_at).toLocaleDateString('en-GB')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(s.id)}
                      disabled={cancelling === s.id}
                      style={{
                        background: 'none', border: `1px solid ${border}`,
                        borderRadius: 7, padding: '4px 9px',
                        fontSize: 10, fontWeight: 700, color: '#ef4444',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {cancelling === s.id ? '…' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/seller/promote/analytics')}
                style={{
                  width: '100%', marginTop: 12,
                  padding: '9px 0', borderRadius: 10,
                  background: 'transparent',
                  border: `1.5px solid ${border}`,
                  color: textMuted, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                <BarChart2 size={13} /> View Analytics
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}