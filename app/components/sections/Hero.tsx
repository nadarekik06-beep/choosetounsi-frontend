'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SellerApplicationModal from "../sections/SellerApplicationModal"
import { isAuthenticated } from '@/lib/auth'

// ─── TypeScript type matching Laravel Category API response ───────────────
// Fields returned by GET /api/categories:
// id, name, name_ar, slug, icon, image
interface Category {
  id: number
  name: string
  name_ar: string
  slug: string
  icon: string | null    // emoji or icon name stored in DB (e.g. "👗")
  image: string | null   // relative path or full URL stored in DB
}

// ─── Your Laravel API base URL ────────────────────────────────────────────
// Set this in your .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Helper: resolve image src from DB value ──────────────────────────────
// The DB stores either a full URL ("https://...") or a storage path ("categories/img.jpg").
// This normalises both into a usable <Image> src.
function resolveImageSrc(image: string | null): string | null {
  if (!image) return null
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  return `${API_URL}/storage/${image}`
}

// ─── Color palette assigned to category cards by index ────────────────────
// Categories table has no card-color column, so we cycle through these.
// Edit to match your brand palette.
const CARD_PALETTE = [
  { bg: '#1a1a1a', textColor: '#ffffff' },  // dark
  { bg: '#f5c518', textColor: '#111111' },  // yellow
  { bg: '#dc2626', textColor: '#ffffff' },  // red
  { bg: '#f0f0f0', textColor: '#111111' },  // light grey
  { bg: '#16a34a', textColor: '#ffffff' },  // green
  { bg: '#1d4ed8', textColor: '#ffffff' },  // blue
  { bg: '#7c3aed', textColor: '#ffffff' },  // purple
  { bg: '#ea580c', textColor: '#ffffff' },  // orange
  { bg: '#0891b2', textColor: '#ffffff' },  // cyan
  { bg: '#be185d', textColor: '#ffffff' },  // pink
  { bg: '#4d7c0f', textColor: '#ffffff' },  // olive
  { bg: '#374151', textColor: '#ffffff' },  // slate
]

// ─── Hero catalog slides — static marketing banners, not from DB ──────────
// Replace src values with your actual banner images when ready.
const HERO_SLIDES = [
  {
    id: 1,
    tag: 'Latest Drop',
    title: 'A New Era Of',
    headline: 'TUNISIAN STYLE',
    bg: '#f5c518',
    src: '/images/im1.jpg',
    alt: 'Latest Drop',
  },
  {
    id: 2,
    tag: 'New Arrivals',
    title: 'Tunisian',
    headline: 'FASHION',
    bg: '#1a1a1a',
    src: '/images/im2.jpg',
    alt: 'New Arrivals',
  },
  {
    id: 3,
    tag: 'Fresh Drop',
    title: 'Premium',
    headline: 'SETS & HOODIES',
    bg: '#dc2626',
    src: '/images/im3.jpg',
    alt: 'Fresh Drop',
  },
  {
    id: 4,
    tag: 'Best Deal',
    title: 'Luxury',
    headline: 'WEAR TOUNSI',
    bg: '#0f172a',
    src: '/images/im4.jpg',
    alt: 'Best Deal',
  },
]

// ─── Trust badges ─────────────────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: '🚚', label: 'Free Shipping' },
  { icon: '✅', label: 'Verified Vendors' },
  { icon: '🇹🇳', label: '100% Local' },
  { icon: '🔒', label: 'Secure Payment' },
]

// ─────────────────────────────────────────────────────────────────────────
export default function Hero() {
  const [showModal, setShowModal]           = useState(false)
  const [mounted, setMounted]               = useState(false)
  const [activeSlide, setActiveSlide]       = useState(0)
  const [transitioning, setTransitioning]   = useState(false)

  // ── Dynamic category state (fetched from /api/categories) ────────────
  const [categories, setCategories]         = useState<Category[]>([])
  const [catsLoading, setCatsLoading]       = useState(true)
  const [catsError, setCatsError]           = useState(false)

  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  // ── Fetch active categories from Laravel API ──────────────────────────
  // Calls: GET /api/categories
  // Response: { success: true, data: Category[] }
  // The controller already filters is_active = true and orders by `order` ASC.
  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      try {
        setCatsLoading(true)
        setCatsError(false)

        const res = await fetch(`${API_URL}/api/categories`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        setCategories(json.data ?? [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[Hero] Failed to fetch categories:', err)
        setCatsError(true)
      } finally {
        setCatsLoading(false)
      }
    }

    fetchCategories()
    return () => controller.abort()
  }, [])

  // ── Auto-advance slideshow every 4 s ─────────────────────────────────
  const goToSlide = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => { setActiveSlide(index); setTransitioning(false) }, 300)
  }, [transitioning])

  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((activeSlide + 1) % HERO_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [activeSlide, goToSlide])

  const slide = HERO_SLIDES[activeSlide]

  const handleBecomeVendor = () => {
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/?vendor=1')
      return
    }
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
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }

        .hero-text-1 { animation: heroFadeIn 0.6s ease 0.1s both; }
        .hero-text-2 { animation: heroFadeIn 0.6s ease 0.2s both; }
        .hero-text-3 { animation: heroFadeIn 0.6s ease 0.3s both; }
        .hero-text-4 { animation: heroFadeIn 0.6s ease 0.4s both; }

        .cat-card {
          animation: cardFadeUp 0.5s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        }

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

        .skeleton {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>

      <section className="w-full bg-white">

        {/* ── MAIN HERO BANNER ─────────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 50%, #dcdcdc 100%)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch min-h-[340px] lg:min-h-[420px]">

            {/* LEFT: Copy & CTAs */}
            <div className="flex-1 z-10 px-6 lg:px-12 py-10 lg:py-14 flex flex-col justify-center">
              <p
                className={`text-zinc-500 text-sm font-semibold tracking-widest uppercase mb-2 ${mounted ? 'hero-text-1' : 'opacity-0'}`}
                style={{ fontFamily: "'Barlow', sans-serif" }}
              >
                {slide.tag}
              </p>

              <p
                className={`text-zinc-900 text-3xl lg:text-4xl font-bold leading-tight mb-1 ${mounted ? 'hero-text-2' : 'opacity-0'}`}
                style={{ fontFamily: "'Barlow', sans-serif" }}
              >
                {slide.title}
              </p>

              <div className="relative">
                <h1
                  className="select-none pointer-events-none absolute -top-6 -left-2 font-black text-zinc-900 leading-none whitespace-nowrap"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(4rem,10vw,9rem)', opacity: 0.07 }}
                  aria-hidden="true"
                >
                  {slide.headline}
                </h1>
                <h2
                  className={`relative z-10 text-zinc-900 font-black leading-none tracking-tight ${mounted ? 'hero-text-3' : 'opacity-0'}`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(3rem,7vw,5.5rem)' }}
                >
                  {slide.headline}
                </h2>
              </div>

              <div className={`flex flex-wrap gap-3 mt-6 ${mounted ? 'hero-text-4' : 'opacity-0'}`}>
                {/* ── Button 1: Start Shopping ── */}
                <Link
                  href="/shop"
                  className="btn-shop inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase shadow-md shadow-red-200"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                >
                  SHOP THE COLLECTION
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* ── Button 2: Become a Vendor ── */}
                <button
                  onClick={handleBecomeVendor}
                  className="btn-vendor inline-flex items-center gap-2 border-2 border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-800 font-bold text-xs px-6 py-3 rounded-full tracking-widest uppercase"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  BECOME A VENDOR
                </button>
              </div>

              {/* Dot navigation */}
              <div className="flex items-center gap-2 mt-8">
                {HERO_SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goToSlide(i)}
                    className="dot-btn h-2 rounded-full"
                    style={{ width: i === activeSlide ? '28px' : '8px', backgroundColor: i === activeSlide ? '#dc2626' : '#a1a1aa' }}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT: Catalog image panel */}
            {/*
              ── HERO SLIDE IMAGES ─────────────────────────────────────────────
              Edit HERO_SLIDES at the top of this file to change banner images.
              Replace each `src` with your own: e.g. src: '/images/banner1.jpg'
              ─────────────────────────────────────────────────────────────────── */}
            <div
              className="relative flex-shrink-0 w-full lg:w-[52%] min-h-[260px] lg:min-h-[550px] overflow-hidden"
              style={{ backgroundColor: slide.bg, transition: 'background-color 0.5s ease' }}
            >
              {HERO_SLIDES.map((s, i) => (
                <div
                  key={s.id}
                  className="absolute inset-0"
                  style={{ opacity: i === activeSlide && !transitioning ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: i === activeSlide ? 'auto' : 'none' }}
                >
                  <Image src={s.src} alt={s.alt} fill className="object-cover object-center" priority={i === 0} unoptimized />
                </div>
              ))}

              {/* Thumbnail strip */}
              <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-gradient-to-t from-black/40 to-transparent z-10">
                {HERO_SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goToSlide(i)}
                    className="thumb-btn relative flex-1 h-14 overflow-hidden rounded"
                    style={{ opacity: i === activeSlide ? 1 : 0.55, boxShadow: i === activeSlide ? '0 0 0 2px #dc2626' : 'none' }}
                    aria-label={`View ${s.headline}`}
                  >
                    <Image src={s.src} alt={s.alt} fill className="object-cover object-center" unoptimized />
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToSlide((activeSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
                aria-label="Previous slide"
              >
                <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={() => goToSlide((activeSlide + 1) % HERO_SLIDES.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
                aria-label="Next slide"
              >
                <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>

          </div>
        </div>

        {/* ── TRUST BADGE STRIP ──────────────────────────────────────────── */}
        <div className="border-t border-b border-zinc-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-around flex-wrap gap-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="text-lg">{b.icon}</span>
                <span className="text-zinc-600 text-xs font-semibold tracking-wide" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CATEGORY CARDS GRID ────────────────────────────────────────────
            SOURCE: GET /api/categories  →  { success: true, data: Category[] }
            - Only is_active=true rows are returned (filtered in Laravel controller)
            - Ordered by the `order` column ASC
            - Each card links to /category/[slug]  (slug comes from DB)
            - Card colors cycle through CARD_PALETTE (no color stored in DB)
            - If `image` is set: shown as a thumbnail bottom-right
            - If no image but `icon` is set: shown as large emoji watermark
        ──────────────────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Loading skeletons */}
          {catsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton rounded-md min-h-[130px]" />
              ))}
            </div>
          )}

          {/* API error */}
          {!catsLoading && catsError && (
            <div className="text-center py-8 text-zinc-400 text-sm space-y-1">
              <p>Could not load categories. Please verify your API is running.</p>
              <p className="text-xs text-zinc-300 font-mono">{API_URL}/api/categories</p>
            </div>
          )}

          {/* No categories in DB */}
          {!catsLoading && !catsError && categories.length === 0 && (
            <p className="text-center py-8 text-zinc-400 text-sm">
              No active categories found. Add some from your admin panel.
            </p>
          )}

          {/* Dynamic cards */}
          {!catsLoading && !catsError && categories.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map((cat, i) => {
                const palette  = CARD_PALETTE[i % CARD_PALETTE.length]
                const imageSrc = resolveImageSrc(cat.image)
                const isLight  = palette.textColor === '#111111'

                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="cat-card relative overflow-hidden rounded-md flex flex-col justify-between p-4 min-h-[130px] cursor-pointer"
                    style={{ backgroundColor: palette.bg, animationDelay: `${0.5 + i * 0.07}s` }}
                  >
                    {/* Label + name */}
                    <div>
                      <p
                        className="text-[10px] font-semibold tracking-widest uppercase opacity-60"
                        style={{ color: palette.textColor, fontFamily: "'Barlow', sans-serif" }}
                      >
                        Shop With
                      </p>
                      <p
                        className="text-sm font-bold leading-tight mt-0.5"
                        style={{ color: palette.textColor, fontFamily: "'Barlow', sans-serif" }}
                      >
                        {cat.name}
                      </p>
                    </div>

                    {/* Shop Now pill */}
                    <span
                      className="mt-2 self-start text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.18)',
                        color: palette.textColor,
                        fontFamily: "'Barlow', sans-serif",
                      }}
                    >
                      Shop Now
                    </span>

                    {/* Category image from DB */}
                    {imageSrc && (
                      <div className="absolute bottom-0 right-0 w-16 h-16 opacity-90">
                        <Image src={imageSrc} alt={cat.name} fill className="object-contain object-right-bottom" unoptimized />
                      </div>
                    )}

                    {/* Fallback: icon emoji watermark when no image */}
                    {!imageSrc && cat.icon && (
                      <span
                        className="absolute bottom-2 right-3 text-4xl opacity-25 select-none pointer-events-none"
                        aria-hidden="true"
                      >
                        {cat.icon}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── SALE BANNER ────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div
            className="relative overflow-hidden rounded-md flex flex-col md:flex-row items-center justify-between px-8 py-6 gap-6"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
          >
            <div className="text-white text-center md:text-left">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase opacity-80 mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>
                Exclusive Deals
              </p>
              <p className="text-4xl lg:text-5xl font-black leading-none tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                SEASON SALE
              </p>
            </div>

            <div className="relative w-40 h-28 md:w-52 md:h-36 flex-shrink-0 drop-shadow-2xl">
              {/*
                ── SALE BANNER IMAGE ─────────────────────────────────────────
                Replace src with your sale product image.
                Example: src="/images/sale-product.png"
                ─────────────────────────────────────────────────────────────── */}
              <Image
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80"
                alt="Sale product"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <div className="text-white text-center md:text-right">
              <p className="text-2xl lg:text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Winter Sale
              </p>
              <p className="text-xs opacity-70 max-w-[180px] mt-1 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
                Discover exclusive deals on top Tunisian brands. Limited time only.
              </p>
              <Link
                href="/deals"
                className="inline-block mt-3 bg-white text-red-600 font-bold text-xs px-5 py-2 rounded-full tracking-widest uppercase hover:bg-zinc-100 transition-colors"
                style={{ fontFamily: "'Barlow', sans-serif" }}
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>

      </section>

      {showModal && <SellerApplicationModal onClose={() => setShowModal(false)} />}
    </>
  )
}