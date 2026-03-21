'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SellerApplicationModal from "../sections/SellerApplicationModal"
import { isAuthenticated } from '@/lib/auth'

interface Category {
  id: number
  name: string
  name_ar: string
  slug: string
  icon: string | null
  image: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function resolveImageSrc(image: string | null): string | null {
  if (!image) return null
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  return `${API_URL}/storage/${image}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 4 FEATURE CARDS — EDIT HERE
// ═══════════════════════════════════════════════════════════════════════════════
// accent options: 'red' | 'green' | 'yellow' | 'dark'
// ═══════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  {
    title: 'Free Shipping',
    description: 'On all orders over 50 DT',
    href: '/shipping',
    accent: 'red',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Verified Vendors',
    description: 'Every seller is reviewed & approved',
    href: '/sellers',
    accent: 'green',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: '100% Local',
    description: 'Proudly made & sold in Tunisia 🇹🇳',
    href: '/about',
    accent: 'yellow',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: 'Secure Payment',
    description: 'Your transactions are always safe',
    href: '/security',
    accent: 'dark',
    icon: (
      <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
]

const ACCENT: Record<string, { ring: string; icon: string; shadow: string; hover: string }> = {
  red:    { ring: '#fee2e2', icon: '#dc2626', shadow: 'rgba(220,38,38,0.12)',  hover: '#dc2626' },
  green:  { ring: '#dcfce7', icon: '#16a34a', shadow: 'rgba(22,163,74,0.12)',  hover: '#16a34a' },
  yellow: { ring: '#fef9c3', icon: '#b45309', shadow: 'rgba(180,83,9,0.10)',   hover: '#b45309' },
  dark:   { ring: '#f4f4f5', icon: '#18181b', shadow: 'rgba(24,24,27,0.08)',   hover: '#18181b' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY IMAGE MAP
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORY_IMAGE_MAP: { keywords: string[]; src: string }[] = [
  { keywords: ['fashion', 'clothing', 'vetement', 'mode', 'clothes', 'wear', 'tenue'], src: '/images/hoodi.png' },
  { keywords: ['electronic', 'electronique', 'tech', 'phone', 'mobile', 'informatique', 'computer', 'laptop'], src: '/images/headphone.png' },
  { keywords: ['home', 'living', 'maison', 'meuble', 'decoration', 'decor', 'interieur', 'furniture'], src: '/images/pouf.png' },
  { keywords: ['food', 'grocery', 'alimentation', 'epicerie', 'nourriture', 'produit', 'cuisine', 'eat'], src: '/images/food.png' },
  { keywords: ['beauty', 'beaute', 'cosmetic', 'soin', 'makeup', 'skincare', 'personal care', 'hygiene', 'parfum', 'perfume'], src: '/images/beauty.png' },
  { keywords: ['health', 'wellness', 'sante', 'bien-etre', 'medical', 'pharmacie', 'sport sante'], src: '/images/health.png' },
  { keywords: ['sport', 'outdoor', 'fitness', 'gym', 'training', 'sportswear', 'exercise', 'running'], src: '/images/sport.png' },
  { keywords: ['art', 'craft', 'artisanat', 'handmade', 'diy', 'creation', 'peinture', 'dessin'], src: '/images/art.png' },
  { keywords: ['book', 'livre', 'stationery', 'papeterie', 'school', 'ecole', 'fourniture', 'pen', 'notebook'], src: '/images/book.png' },
  { keywords: ['kids', 'baby', 'enfant', 'bebe', 'child', 'children', 'jouet', 'toy', 'junior'], src: '/images/baby.png' },
  { keywords: ['auto', 'automotive', 'car', 'voiture', 'moto', 'vehicule', 'piece', 'garage'], src: '/images/car.png' },
  { keywords: ['other', 'autre', 'divers', 'misc', 'general', 'various'], src: '/images/box.png' },
]

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=85&auto=format&fit=crop'

function getFallbackImage(cat: Category): string {
  const searchStr = `${cat.name} ${cat.name_ar ?? ''} ${cat.slug}`.toLowerCase()
  for (const entry of CATEGORY_IMAGE_MAP) {
    if (entry.keywords.some((kw) => searchStr.includes(kw))) return entry.src
  }
  return FALLBACK_IMAGE
}

// ─── Hero slides ──────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { id: 1, tag: 'Latest Drop',  title: 'A New Era Of', headline: 'TUNISIAN STYLE',  bg: '#f5c518', src: '/images/im1.jpg', alt: 'Latest Drop' },
  { id: 2, tag: 'New Arrivals', title: 'Tunisian',     headline: 'FASHION',          bg: '#1a1a1a', src: '/images/im2.jpg', alt: 'New Arrivals' },
  { id: 3, tag: 'Fresh Drop',   title: 'Premium',      headline: 'SETS & HOODIES',  bg: '#dc2626', src: '/images/im3.jpg', alt: 'Fresh Drop' },
  { id: 4, tag: 'Best Deal',    title: 'Luxury',       headline: 'WEAR TOUNSI',     bg: '#0f172a', src: '/images/im4.jpg', alt: 'Best Deal' },
]

// ─── Category card ────────────────────────────────────────────────────────────
function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const dbImage = resolveImageSrc(cat.image)
  const imgSrc  = dbImage ?? getFallbackImage(cat)
  const [imgErr, setImgErr] = useState(false)
  const finalSrc = imgErr ? FALLBACK_IMAGE : imgSrc

  return (
    <Link href={`/category/${cat.slug}`} className="cat-card" style={{ animationDelay: `${index * 0.055}s` }}>
      <div className="cat-card__img-wrap">
        <Image src={finalSrc} alt={cat.name} fill className="cat-card__img" onError={() => setImgErr(true)} unoptimized />
      </div>
      <p className="cat-card__name">{cat.name}</p>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="cat-skeleton">
      <div className="cat-skeleton__img" />
      <div className="cat-skeleton__text" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Hero() {
  const [showModal, setShowModal]         = useState(false)
  const [mounted, setMounted]             = useState(false)
  const [activeSlide, setActiveSlide]     = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [categories, setCategories]       = useState<Category[]>([])
  const [catsLoading, setCatsLoading]     = useState(true)
  const [catsError, setCatsError]         = useState(false)

  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function fetchCategories() {
      try {
        setCatsLoading(true); setCatsError(false)
        const res = await fetch(`${API_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setCategories(json.data ?? [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setCatsError(true)
      } finally { setCatsLoading(false) }
    }
    fetchCategories()
    return () => controller.abort()
  }, [])

  const goToSlide = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => { setActiveSlide(index); setTransitioning(false) }, 300)
  }, [transitioning])

  useEffect(() => {
    const timer = setInterval(() => { goToSlide((activeSlide + 1) % HERO_SLIDES.length) }, 4000)
    return () => clearInterval(timer)
  }, [activeSlide, goToSlide])

  const slide = HERO_SLIDES[activeSlide]

  const handleBecomeVendor = () => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/?vendor=1'); return }
    setShowModal(true)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap');

        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes catFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes featFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }

        .hero-text-1 { animation: heroFadeIn 0.6s ease 0.1s both; }
        .hero-text-2 { animation: heroFadeIn 0.6s ease 0.2s both; }
        .hero-text-3 { animation: heroFadeIn 0.6s ease 0.3s both; }
        .hero-text-4 { animation: heroFadeIn 0.6s ease 0.4s both; }

        .dot-btn   { transition: width 0.3s ease, background 0.3s ease; }
        .thumb-btn { transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
        .thumb-btn:hover { opacity: 1 !important; transform: scale(1.05); }

        .btn-shop {
          position: relative; overflow: hidden;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .btn-shop:hover   { transform: translateY(-1px); }
        .btn-vendor       { transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease; }
        .btn-vendor:hover { transform: translateY(-1px); }

        /* ── Feature cards (replaces trust badge strip) ── */
        .feat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 1024px) { .feat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px)  { .feat-grid { grid-template-columns: 1fr; } }

        .feat-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #fff;
          border-radius: 14px;
          padding: 16px 18px;
          border: 1.5px solid #e6e6e6;
          text-decoration: none;
          overflow: hidden;
          animation: featFadeUp 0.42s ease both;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          will-change: transform;
        }
        .feat-card:nth-child(1) { animation-delay: 0.05s; }
        .feat-card:nth-child(2) { animation-delay: 0.11s; }
        .feat-card:nth-child(3) { animation-delay: 0.17s; }
        .feat-card:nth-child(4) { animation-delay: 0.23s; }

        .feat-card:hover { transform: translateY(-4px); border-color: #d4d4d4; }

        .feat-icon {
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.28s ease;
        }
        .feat-card:hover .feat-icon { transform: scale(1.1) rotate(-4deg); }

        .feat-body  { min-width: 0; flex: 1; }
        .feat-title {
          font-family: 'Barlow', sans-serif;
          font-size: 0.86rem;
          font-weight: 800;
          color: #111;
          margin: 0 0 2px;
          line-height: 1.2;
          letter-spacing: -0.01em;
          transition: color 0.18s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .feat-desc {
          font-family: 'Barlow', sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          color: #888;
          margin: 0;
          line-height: 1.4;
        }

        .feat-chevron {
          flex-shrink: 0;
          margin-left: auto;
          color: #ccc;
          opacity: 0;
          transform: translateX(-5px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .feat-card:hover .feat-chevron { opacity: 1; transform: translateX(0); }

        .feat-dot {
          position: absolute;
          right: -18px; top: -18px;
          width: 68px; height: 68px;
          border-radius: 50%;
          opacity: 0.07;
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .feat-card:hover .feat-dot { opacity: 0.14; transform: scale(1.15); }

        /* ── Category cards ── */
        .cat-card {
          display: flex; flex-direction: column; align-items: center;
          text-decoration: none; background: #fff; border-radius: 12px;
          padding: 14px 10px 13px; border: 1.5px solid #e4e4e4; cursor: pointer;
          animation: catFadeUp 0.42s ease both;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          will-change: transform;
        }
        .cat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 44px rgba(220,38,38,0.13), 0 4px 12px rgba(0,0,0,0.06);
          border-color: #dc2626;
        }
        .cat-card__img-wrap {
          position: relative; width: 100%; aspect-ratio: 1/1;
          border-radius: 8px; overflow: hidden; background: #f3f3f3;
          margin-bottom: 11px; transition: box-shadow 0.22s ease;
        }
        .cat-card:hover .cat-card__img-wrap { box-shadow: 0 4px 18px rgba(220,38,38,0.18); }
        .cat-card__img {
          object-fit: cover !important; object-position: center top !important;
          transition: transform 0.35s ease;
        }
        .cat-card:hover .cat-card__img { transform: scale(1.08); }
        .cat-card__name {
          font-family: 'Barlow', sans-serif; font-size: 0.79rem; font-weight: 700;
          color: #1a1a1a; text-align: center; line-height: 1.3; margin: 0;
          word-break: break-word; transition: color 0.18s ease;
        }
        .cat-card:hover .cat-card__name { color: #dc2626; }

        /* ── Skeletons ── */
        .cat-skeleton {
          background: #fff; border-radius: 12px; padding: 14px 10px 13px;
          border: 1.5px solid #e4e4e4; display: flex; flex-direction: column;
          align-items: center; gap: 11px;
        }
        .cat-skeleton__img {
          width: 100%; aspect-ratio: 1/1; border-radius: 8px;
          background: linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);
          background-size: 600px 100%; animation: shimmer 1.3s infinite linear;
        }
        .cat-skeleton__text {
          width: 55%; height: 11px; border-radius: 4px;
          background: linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);
          background-size: 600px 100%; animation: shimmer 1.3s infinite linear;
          animation-delay: 0.1s;
        }

        .cat-view-all {
          font-family: 'Barlow', sans-serif; font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase; color: #555;
          text-decoration: none; transition: color 0.18s ease;
        }
        .cat-view-all:hover { color: #dc2626; }
      `}</style>

      <section className="w-full bg-white">

        {/* ── HERO BANNER ──────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(135deg,#f0f0f0 0%,#e8e8e8 50%,#dcdcdc 100%)' }}>
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch min-h-[340px] lg:min-h-[420px]">

            {/* LEFT */}
            <div className="flex-1 z-10 px-6 lg:px-12 py-10 lg:py-14 flex flex-col justify-center">
              <p className={`text-zinc-500 text-sm font-semibold tracking-widest uppercase mb-2 ${mounted ? 'hero-text-1' : 'opacity-0'}`} style={{ fontFamily: "'Barlow',sans-serif" }}>{slide.tag}</p>
              <p className={`text-zinc-900 text-3xl lg:text-4xl font-bold leading-tight mb-1 ${mounted ? 'hero-text-2' : 'opacity-0'}`} style={{ fontFamily: "'Barlow',sans-serif" }}>{slide.title}</p>
              <div className="relative">
                <h1 className="select-none pointer-events-none absolute -top-6 -left-2 font-black text-zinc-900 leading-none whitespace-nowrap" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(4rem,10vw,9rem)', opacity: 0.07 }} aria-hidden="true">{slide.headline}</h1>
                <h2 className={`relative z-10 text-zinc-900 font-black leading-none tracking-tight ${mounted ? 'hero-text-3' : 'opacity-0'}`} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 'clamp(3rem,7vw,5.5rem)' }}>{slide.headline}</h2>
              </div>
              <div className={`flex flex-wrap gap-3 mt-6 ${mounted ? 'hero-text-4' : 'opacity-0'}`}>
                <Link href="/shop" className="btn-shop inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase shadow-md shadow-red-200" style={{ fontFamily: "'Barlow',sans-serif" }}>
                  SHOP THE COLLECTION
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
                <button onClick={handleBecomeVendor} className="btn-vendor inline-flex items-center gap-2 border-2 border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-800 font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase" style={{ fontFamily: "'Barlow',sans-serif" }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  BECOME A VENDOR
                </button>
              </div>
              <div className="flex items-center gap-2 mt-8">
                {HERO_SLIDES.map((s, i) => (
                  <button key={s.id} onClick={() => goToSlide(i)} className="dot-btn h-2 rounded-full" style={{ width: i === activeSlide ? '28px' : '8px', backgroundColor: i === activeSlide ? '#dc2626' : '#a1a1aa' }} aria-label={`Go to slide ${i + 1}`} />
                ))}
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative flex-shrink-0 w-full lg:w-[52%] min-h-[260px] lg:min-h-[550px] overflow-hidden" style={{ backgroundColor: slide.bg, transition: 'background-color 0.5s ease' }}>
              {HERO_SLIDES.map((s, i) => (
                <div key={s.id} className="absolute inset-0" style={{ opacity: i === activeSlide && !transitioning ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: i === activeSlide ? 'auto' : 'none' }}>
                  <Image src={s.src} alt={s.alt} fill className="object-cover object-center" priority={i === 0} unoptimized />
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-gradient-to-t from-black/40 to-transparent z-10">
                {HERO_SLIDES.map((s, i) => (
                  <button key={s.id} onClick={() => goToSlide(i)} className="thumb-btn relative flex-1 h-14 overflow-hidden rounded" style={{ opacity: i === activeSlide ? 1 : 0.55, boxShadow: i === activeSlide ? '0 0 0 2px #dc2626' : 'none' }} aria-label={`View ${s.headline}`}>
                    <Image src={s.src} alt={s.alt} fill className="object-cover object-center" unoptimized />
                  </button>
                ))}
              </div>
              <button onClick={() => goToSlide((activeSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all" aria-label="Previous slide">
                <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button onClick={() => goToSlide((activeSlide + 1) % HERO_SLIDES.length)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all" aria-label="Next slide">
                <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TRUST BADGES → replaced with 4 feature cards
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ background: '#f0f0f0', padding: '16px 0 0' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="feat-grid">
              {FEATURES.map((feat) => {
                const a = ACCENT[feat.accent]
                return (
                  <Link key={feat.title} href={feat.href} className="feat-card">
                    {/* Per-card scoped hover colours */}
                    <style>{`
                      .feat-card[href="${feat.href}"]:hover {
                        box-shadow: 0 14px 36px ${a.shadow}, 0 2px 8px rgba(0,0,0,0.04);
                      }
                      .feat-card[href="${feat.href}"]:hover .feat-title { color: ${a.hover}; }
                      .feat-card[href="${feat.href}"]:hover .feat-chevron { color: ${a.hover}; }
                    `}</style>

                    {/* Decorative bg dot */}
                    <div className="feat-dot" style={{ background: a.icon }} />

                    {/* Icon */}
                    <div className="feat-icon" style={{ background: a.ring, color: a.icon }}>
                      {feat.icon}
                    </div>

                    {/* Text */}
                    <div className="feat-body">
                      <p className="feat-title">{feat.title}</p>
                      <p className="feat-desc">{feat.description}</p>
                    </div>

                    {/* Chevron */}
                    <div className="feat-chevron">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── CATEGORY CARDS ───────────────────────────────────────────── */}
        <div style={{ background: '#f0f0f0', padding: '44px 0 52px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-baseline justify-between mb-7">
              <h2 style={{ fontFamily: "'Barlow',sans-serif", fontSize: 'clamp(1.3rem,2.5vw,1.75rem)', fontWeight: 800, color: '#111', letterSpacing: '-0.02em', margin: 0 }}>
                Popular categories
              </h2>
              <Link href="/shop" className="cat-view-all">View All Categories →</Link>
            </div>

            {catsLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
            {!catsLoading && catsError && (
              <p className="text-center py-10 text-zinc-400 text-sm">
                Could not load categories — make sure your API is running at{' '}
                <code className="font-mono text-xs">{API_URL}/api/categories</code>
              </p>
            )}
            {!catsLoading && !catsError && categories.length === 0 && (
              <p className="text-center py-10 text-zinc-400 text-sm">No active categories found.</p>
            )}
            {!catsLoading && !catsError && categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {categories.map((cat, i) => <CategoryCard key={cat.id} cat={cat} index={i} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── SALE BANNER ──────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="relative overflow-hidden rounded-md flex flex-col md:flex-row items-center justify-between px-8 py-6 gap-6" style={{ background: 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)' }}>
            <div className="text-white text-center md:text-left">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase opacity-80 mb-1" style={{ fontFamily: "'Barlow',sans-serif" }}>Exclusive Deals</p>
              <p className="text-4xl lg:text-5xl font-black leading-none tracking-tight" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>SEASON SALE</p>
            </div>
            <div className="relative w-40 h-28 md:w-52 md:h-36 flex-shrink-0 drop-shadow-2xl">
              <Image src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" alt="Sale product" fill className="object-contain" unoptimized />
            </div>
            <div className="text-white text-center md:text-right">
              <p className="text-2xl lg:text-3xl font-black" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>Winter Sale</p>
              <p className="text-xs opacity-70 max-w-[180px] mt-1 leading-relaxed" style={{ fontFamily: "'Barlow',sans-serif" }}>Discover exclusive deals on top Tunisian brands. Limited time only.</p>
              <Link href="/deals" className="inline-block mt-3 bg-white text-red-600 font-bold text-xs px-5 py-2 rounded-full tracking-widest uppercase hover:bg-zinc-100 transition-colors" style={{ fontFamily: "'Barlow',sans-serif" }}>Shop Now</Link>
            </div>
          </div>
        </div>

      </section>

      {showModal && <SellerApplicationModal onClose={() => setShowModal(false)} />}
    </>
  )
}