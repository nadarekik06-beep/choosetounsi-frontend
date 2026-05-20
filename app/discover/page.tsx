'use client';
/**
 * app/discover/page.tsx — Premium "Explore / Discover" page
 * ChooseTounsi — Tunisia's #1 Marketplace
 *
 * Stack: Next.js App Router · Tailwind · Framer Motion · Lucide
 * Design: editorial luxury × North-African energy
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame, TrendingUp, Star, Heart, ShoppingBag, Eye,
  Compass, Zap, Award, ArrowRight, ChevronRight,
  SlidersHorizontal, Search, X, Check, Sparkles,
} from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import { sponsorshipApi, SponsoredProduct } from '@/lib/sponsorshipApi';

/* ─────────────────────────────────────────────
   CONSTANTS & TYPES
───────────────────────────────────────────── */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '');

const SPONSORED_EVERY = 4;

// Psychologically attractive labels for sponsored products
const PREMIUM_LABELS = [
  { text: 'Trending Now', icon: TrendingUp, color: '#e11d48', bg: '#fff1f2' },
  { text: 'Hot Pick',     icon: Flame,      color: '#ea580c', bg: '#fff7ed' },
  { text: 'Best Seller',  icon: Award,      color: '#0284c7', bg: '#f0f9ff' },
  { text: 'Most Loved',   icon: Heart,      color: '#db2777', bg: '#fdf2f8' },
  { text: 'Editor\'s Choice', icon: Star,   color: '#7c3aed', bg: '#faf5ff' },
  { text: 'Viral Product', icon: Zap,       color: '#d97706', bg: '#fffbeb' },
];

interface ActivePromotion {
  id: number;
  type: 'flash_sale' | 'discount';
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_flash_sale: boolean;
}

interface OrganicProduct {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  effective_price?: number | null;
  discount_amount?: number | null;
  promotion?: ActivePromotion | null;
  stock: number;
  primary_image_url: string | null;
  category?: { name: string; slug: string };
  seller?: { name: string };
  variant_images?: string[]   // ← ADD

}

type FeedItem = (OrganicProduct | SponsoredProduct) & {
  _is_sponsored: boolean;
  _sponsor_id?: number;
  _label_idx?: number;
};

/* ─────────────────────────────────────────────
   HERO SECTION
───────────────────────────────────────────── */

function HeroSection() {
  const phrases = ['Discover something new', 'Find Tunisian treasures', 'Shop what\'s trending'];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(cycle);
  }, []);

  const stats = [
    { value: '12K+', label: 'Products' },
    { value: '800+', label: 'Sellers' },
    { value: '4.8★', label: 'Rating' },
    { value: '50+', label: 'Categories' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 50%, #0a0a0a 100%)',
      borderRadius: 24,
      padding: '52px 48px',
      marginBottom: 40,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)',
      }} />

      {/* Red glow orb */}
      <div style={{
        position: 'absolute', right: -60, top: -60,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(219,20,46,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', left: '40%', bottom: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(25,143,65,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(219,20,46,0.15)', border: '1px solid rgba(219,20,46,0.3)',
          borderRadius: 999, padding: '4px 14px', marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#db142e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Live · {new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Animated headline */}
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 900,
          color: '#fff',
          margin: '0 0 8px',
          fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}>
          Explore &{' '}
          <span style={{
            background: 'linear-gradient(90deg, #db142e, #ff6b6b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}>
            Discover
          </span>
        </h1>

        {/* Animated sub-phrase */}
        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,0.5)', margin: '0 0 32px',
          fontFamily: "'Barlow', sans-serif",
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(-8px)',
          transition: 'opacity 0.35s ease 0.1s, transform 0.35s ease 0.1s',
          minHeight: 26,
        }}>
          {phrases[phraseIdx]}
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: "'Barlow Condensed', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating tag cloud - right side */}
      <div style={{
        position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6,
      }} className="hero-tags">
        {['Fashion', 'Electronics', 'Beauty', 'Home', 'Sports'].map((tag, i) => (
          <div key={tag} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999, padding: '4px 14px',
            fontSize: 11, color: 'rgba(255,255,255,0.7)',
            fontWeight: 600, letterSpacing: '0.05em',
            transform: `translateX(${i % 2 === 0 ? 8 : 0}px)`,
          }}>{tag}</div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:640px) { .hero-tags { display: none !important; } }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILTER BAR
───────────────────────────────────────────── */

const SORT_OPTIONS = [
  { key: 'views',      label: 'Trending' },
  { key: 'newest',     label: 'New Arrivals' },
  { key: 'price_asc',  label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
];

function FilterBar({
  activeSort, onSort,
}: { activeSort: string; onSort: (k: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
      overflowX: 'auto', paddingBottom: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#f8f8f8', borderRadius: 999, padding: '4px 6px',
        marginRight: 4,
      }}>
        <SlidersHorizontal size={13} color="#888" />
        <span style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</span>
      </div>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onSort(opt.key)}
          style={{
            padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            border: '1.5px solid',
            borderColor: activeSort === opt.key ? '#db142e' : '#e5e7eb',
            background: activeSort === opt.key ? '#db142e' : '#fff',
            color: activeSort === opt.key ? '#fff' : '#374151',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.18s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}




function getDisplayPrice(item: FeedItem) {
  const p         = item as any
  const base      = Number(p.price ?? 0)
  const effective = p.effective_price != null ? Number(p.effective_price) : base
  const hasDiscount = effective < base - 0.001
  if (!hasDiscount || !p.promotion) {
    return { display: base, original: null, badge: null, isFlash: false }
  }
  let badge: string | null = null
  if (p.promotion.discount_type === 'percentage') {
    const pct = Math.round(((base - effective) / base) * 100)
    if (pct > 0) badge = `-${pct}%`
  } else {
    const saved = base - effective
    if (saved > 0) badge = `-${saved.toFixed(2)} DT`
  }
  return { display: effective, original: base, badge, isFlash: p.promotion.is_flash_sale }
}

/* ─────────────────────────────────────────────
   PREMIUM PRODUCT CARD
───────────────────────────────────────────── */

function ProductCard({ item, index }: { item: FeedItem; index: number }) {
  const [imgErr, setImgErr]   = useState(false);
  const [wished, setWished]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const [added, setAdded]     = useState(false);
  const [imgIndex, setImgIndex] = useState(0);          // ← NEW
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null); // ← NEW
const allImages = useMemo(() => {                     // ← NEW
    const imgs: string[] = [];
    const primary = (item as any).primary_image_url;
    if (primary) imgs.push(primary);
    ((item as any).variant_images ?? []).forEach((url: string) => {
      if (url && !imgs.includes(url)) imgs.push(url);
    });
    return imgs;
  }, [(item as any).primary_image_url, (item as any).variant_images]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);
  const label = item._is_sponsored && item._label_idx !== undefined
    ? PREMIUM_LABELS[item._label_idx % PREMIUM_LABELS.length]
    : null;

  const handleClick = () => {
    if (item._is_sponsored && item._sponsor_id) sponsorshipApi.recordClick(item._sponsor_id);
  };

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setWished(w => !w);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

const { display, original, badge, isFlash } = getDisplayPrice(item);
console.log((item as any).name, display, original, badge);



  return (
    <Link
      href={`/products/${item.slug}`}
      onClick={handleClick}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div
        onMouseEnter={() => {
  setHovered(true);
  if (allImages.length > 1) {
    tickRef.current = setInterval(() => {
      setImgIndex(i => (i + 1) % allImages.length);
    }, 1400);
  }
}}
onMouseLeave={() => {
  setHovered(false);
  if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  setImgIndex(0);
}}
    style={{
          background: '#fff',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid #f0f0f0',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: hovered ? '0 20px 60px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
          transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
          transition: 'box-shadow 0.28s cubic-bezier(.16,1,.3,1), transform 0.28s cubic-bezier(.16,1,.3,1)',
          animationDelay: `${(index % 8) * 60}ms`,
        }}
        className="card-enter"
      >
        {/* ── Image area */}
        <div style={{ aspectRatio: '3/4', background: '#f7f7f7', overflow: 'hidden', position: 'relative' }}>
          {allImages.length > 0 && !imgErr ? (
            <img
              src={allImages[imgIndex]}
              alt={item.name}
              loading="lazy"
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transform: hovered ? 'scale(1.07)' : 'scale(1)',
                transition: 'transform 0.5s cubic-bezier(.16,1,.3,1)',
              }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e9ecef 100%)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Compass size={32} color="#d1d5db" />
              <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 600 }}>No image</span>
            </div>
          )}

          {/* Label badge */}
          {label && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: label.bg,
              color: label.color,
              fontSize: 9, fontWeight: 800, padding: '3px 8px',
              borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.07em',
              display: 'flex', alignItems: 'center', gap: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <label.icon size={9} />
              {label.text}
            </div>
          )}
          {badge && (
  <span style={{
    position: 'absolute', top: label ? 38 : 10, left: 10,
    background: isFlash ? 'linear-gradient(135deg,#dc2626,#f97316)' : '#dc2626',
    color: '#fff', fontSize: 9, fontWeight: 900,
    padding: '2px 7px', borderRadius: 999,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }}>
    {badge}
  </span>
)}

          {/* Wishlist button */}
          <button
            onClick={handleWish}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 32, height: 32, borderRadius: '50%',
              background: wished ? '#db142e' : 'rgba(255,255,255,0.92)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              transform: hovered ? 'scale(1)' : 'scale(0.88)',
              opacity: hovered || wished ? 1 : 0,
              transition: 'all 0.22s cubic-bezier(.16,1,.3,1)',
            }}
            aria-label="Ajouter aux favoris"
          >
            <Heart size={14} color={wished ? '#fff' : '#374151'} fill={wished ? '#fff' : 'none'} />
          </button>

          {/* Quick-add overlay (bottom of image) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '10px 12px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            display: 'flex', justifyContent: 'flex-end',
            transform: hovered ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(.16,1,.3,1)',
          }}>
            <button
              onClick={handleAdd}
              style={{
                padding: '6px 12px', borderRadius: 10,
                background: added ? '#198f41' : '#db142e',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.2s ease',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {added ? <><Check size={11} />Ajouté</> : <><ShoppingBag size={11} />Ajouter</>}
            </button>
          </div>
        </div>

        {/* ── Info area */}
        <div style={{ padding: '12px 14px 15px' }}>
          {(item as any).category?.name && (
            <p style={{
              fontSize: 9, color: '#db142e', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 4px',
            }}>
              {(item as any).category.name}
            </p>
          )}
          <p style={{
            fontSize: 13, fontWeight: 700, color: '#111',
            margin: '0 0 8px', lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.name}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#db142e', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {display.toFixed(2)} <span style={{ fontSize: 10, fontWeight: 700 }}>DT</span>
              </span>
              {original !== null && (
                <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500, marginLeft: 4 }}>
                  {original.toFixed(2)} DT
                </span>
              )}

            {(item as any).stock !== undefined && (item as any).stock <= 5 && (item as any).stock > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#ea580c',
                background: '#fff7ed', padding: '2px 7px', borderRadius: 999,
              }}>
                {(item as any).stock} left
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: '#fff', border: '1px solid #f0f0f0' }}>
      <div style={{
        aspectRatio: '3/4',
        background: 'linear-gradient(90deg, #f3f4f6 25%, #f9fafb 50%, #f3f4f6 75%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.4s infinite linear',
      }} />
      <div style={{ padding: '12px 14px 15px' }}>
        <div style={{ height: 8, width: '45%', background: '#f3f4f6', borderRadius: 4, marginBottom: 8, animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }} />
        <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, marginBottom: 5, animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }} />
        <div style={{ height: 12, width: '70%', background: '#f3f4f6', borderRadius: 4, marginBottom: 10, animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }} />
        <div style={{ height: 15, width: '35%', background: '#fee2e2', borderRadius: 4, animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION DIVIDER
───────────────────────────────────────────── */

function SectionDivider({ icon: Icon, title, subtitle, accentColor = '#db142e' }: {
  icon: any; title: string; subtitle?: string; accentColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      margin: '48px 0 20px',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${accentColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={accentColor} />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: 0, fontFamily: "'Barlow', sans-serif" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>{subtitle}</p>
        )}
      </div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #e5e7eb, transparent)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */

export default function DiscoverPage() {
  const [feed,      setFeed]      = useState<FeedItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(true);
  const [activeSort, setActiveSort] = useState('views');
  const [labelCounter, setLabelCounter] = useState(0);
  const labelRef = useRef(0);

  const buildFeed = useCallback(async (pageNum: number, sort: string) => {
    setLoading(true);
    try {
      const [sponsoredRes, organicRes] = await Promise.allSettled([
        sponsorshipApi.publicFeed({ limit: 12 }),
        fetch(`${API_URL}/api/products?sort=${sort}&per_page=20&page=${pageNum}`, {
          headers: { Accept: 'application/json' },
        }).then(r => r.json()),
      ]);

      const sponsored: SponsoredProduct[] =
        sponsoredRes.status === 'fulfilled' ? (sponsoredRes.value.data ?? []) : [];
      const organic: any[] =
        organicRes.status === 'fulfilled' ? (organicRes.value.data?.data ?? []) : [];
      const lastPage =
        organicRes.status === 'fulfilled' ? (organicRes.value.data?.last_page ?? 1) : 1;

      if (pageNum >= lastPage) setHasMore(false);

      const organicById = new Map(organic.map(o => [o.id, o]));
const sponsoredWithPromo = sponsored.map(s => ({
  ...s,
  ...(organicById.get(s.id) ?? {}),
}));
const sponsoredIds = new Set(sponsored.map(s => s.id));
const cleanOrganic = organic.filter(o => !sponsoredIds.has(o.id));
      const merged: FeedItem[] = [];
      let sIdx = 0;

      cleanOrganic.forEach((o, i) => {
        if (i % SPONSORED_EVERY === 0 && sIdx < sponsored.length) {
          const s = sponsored[sIdx++];
          const enriched = sponsoredWithPromo.find(sp => sp.id === s.id) ?? s;
          merged.push({
            ...enriched,
            _is_sponsored: true,
            _sponsor_id: s.sponsor_data?.id,
            _label_idx: labelRef.current++,
          } as FeedItem);
        }
        merged.push({ ...o, _is_sponsored: false } as FeedItem);
      });
    while (sIdx < sponsored.length) {
  const s = sponsored[sIdx++];
  const enriched = sponsoredWithPromo.find(sp => sp.id === s.id) ?? s;
  merged.push({ ...enriched, _is_sponsored: true, _sponsor_id: s.sponsor_data?.id, _label_idx: labelRef.current++ } as FeedItem);
}
      setFeed(prev => pageNum === 1 ? merged : [...prev, ...merged]);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setFeed([]);
    buildFeed(1, activeSort);
  }, [activeSort, buildFeed]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    buildFeed(next, activeSort);
  };

  // Split feed into sections
  const sponsored  = feed.filter(f => f._is_sponsored);
  const organic    = feed.filter(f => !f._is_sponsored);
  const firstBatch = feed.slice(0, 12);
  const restBatch  = feed.slice(12);

  return (
    <>
      <Navbar />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700;900&family=Barlow+Condensed:wght@700;900&display=swap');
        @keyframes shimmer {
          0%   { background-position: -400px 0 }
          100% { background-position: 400px 0 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter {
          animation: fadeUp 0.45s cubic-bezier(.16,1,.3,1) both;
        }
        .load-more-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 28px rgba(219,20,46,0.35) !important;
        }
        .load-more-btn:active {
          transform: translateY(0) !important;
        }
      `}</style>

      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '24px 20px 80px',
        fontFamily: "'Barlow', sans-serif",
      }}>
        {/* ── Hero */}
        <HeroSection />

        {/* ── Filter bar */}
        <FilterBar activeSort={activeSort} onSort={setActiveSort} />

        {/* ── First section: All featured/trending */}
        {(firstBatch.length > 0 || loading) && (
          <>
            <SectionDivider
              icon={Sparkles}
              title="Featured for You"
              subtitle="Curated mix of trending and promoted products"
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 14,
            }}>
              {firstBatch.map((item, i) => (
                <ProductCard key={`${item._is_sponsored ? 's' : 'o'}-${item.id}-${i}`} item={item} index={i} />
              ))}
              {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk1-${i}`} />)}
            </div>
          </>
        )}

        {/* ── Promo banner */}
        {!loading && feed.length > 0 && (
          <div style={{
            margin: '48px 0',
            background: 'linear-gradient(135deg, #db142e 0%, #9b0d1f 100%)',
            borderRadius: 20,
            padding: '28px 36px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: -20, top: -20,
              width: 180, height: 180, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }} />
            <div style={{
              position: 'absolute', right: 60, bottom: -40,
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
            }} />
            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Livraison gratuite</p>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>Sur toutes commandes +50 DT</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Partout en Tunisie — livraison rapide garantie</p>
            </div>
            <Link href="/shop" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '12px 24px', borderRadius: 12,
                background: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 13, color: '#db142e',
                display: 'flex', alignItems: 'center', gap: 6,
                position: 'relative',
                transition: 'all 0.2s ease',
              }}>
                Explorer le Shop <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        )}

        {/* ── Rest of the feed */}
        {restBatch.length > 0 && (
          <>
            <SectionDivider
              icon={TrendingUp}
              title="Plus de Découvertes"
              subtitle="Les produits qui font parler d'eux"
              accentColor="#198f41"
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 14,
            }}>
              {restBatch.map((item, i) => (
                <ProductCard key={`${item._is_sponsored ? 's' : 'o'}-${item.id}-${i + 12}`} item={item} index={i} />
              ))}
            </div>
          </>
        )}

        {/* ── Load more */}
        {!loading && hasMore && feed.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button
              onClick={loadMore}
              className="load-more-btn"
              style={{
                padding: '14px 48px', borderRadius: 14,
                background: 'linear-gradient(135deg, #db142e 0%, #a00f22 100%)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                boxShadow: '0 4px 16px rgba(219,20,46,0.25)',
                transition: 'all 0.22s cubic-bezier(.16,1,.3,1)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <ChevronRight size={16} />
              Voir plus de produits
            </button>
          </div>
        )}

        {/* ── End of feed */}
        {!loading && !hasMore && feed.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 48, color: '#9ca3af' }}>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={20} color="#9ca3af" />
              </div>
              <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>Vous avez tout vu !</p>
              <p style={{ fontSize: 11, margin: 0, color: '#d1d5db' }}>Revenez bientôt pour de nouveaux produits</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}