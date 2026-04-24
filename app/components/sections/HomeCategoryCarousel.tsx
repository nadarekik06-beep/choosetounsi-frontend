'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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

const CATEGORY_IMAGE_MAP: { keywords: string[]; src: string }[] = [
  { keywords: ['fashion','clothing','vetement','mode','clothes','wear','tenue'], src: '/images/hoodi.png' },
  { keywords: ['electronic','electronique','tech','phone','mobile','informatique','computer','laptop'], src: '/images/headphone.png' },
  { keywords: ['home','living','maison','meuble','decoration','decor','interieur','furniture'], src: '/images/pouf.png' },
  { keywords: ['food','grocery','alimentation','epicerie','nourriture','produit','cuisine','eat'], src: '/images/food.png' },
  { keywords: ['beauty','beaute','cosmetic','soin','makeup','skincare','personal care','hygiene','parfum','perfume'], src: '/images/beauty.png' },
  { keywords: ['health','wellness','sante','bien-etre','medical','pharmacie','sport sante'], src: '/images/health.png' },
  { keywords: ['sport','outdoor','fitness','gym','training','sportswear','exercise','running'], src: '/images/sport.png' },
  { keywords: ['art','craft','artisanat','handmade','diy','creation','peinture','dessin'], src: '/images/art.png' },
  { keywords: ['book','livre','stationery','papeterie','school','ecole','fourniture','pen','notebook'], src: '/images/book.png' },
  { keywords: ['kids','baby','enfant','bebe','child','children','jouet','toy','junior'], src: '/images/baby.png' },
  { keywords: ['auto','automotive','car','voiture','moto','vehicule','piece','garage'], src: '/images/car.png' },
  { keywords: ['other','autre','divers','misc','general','various'], src: '/images/box.png' },
]

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=85&auto=format&fit=crop'

function getFallbackImage(cat: Category): string {
  const searchStr = `${cat.name} ${cat.name_ar ?? ''} ${cat.slug}`.toLowerCase()
  for (const entry of CATEGORY_IMAGE_MAP) {
    if (entry.keywords.some(kw => searchStr.includes(kw))) return entry.src
  }
  return FALLBACK_IMAGE
}

function CategoryCard({ cat, index, visible }: { cat: Category; index: number; visible: boolean }) {
  const dbImage = resolveImageSrc(cat.image)
  const imgSrc  = dbImage ?? getFallbackImage(cat)
  const [imgErr, setImgErr] = useState(false)
  const finalSrc = imgErr ? FALLBACK_IMAGE : imgSrc

  return (
    <Link
      href={`/category/${cat.slug}`}
      className="ccat"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.94)',
        transition: `opacity 0.38s ease ${index * 0.055}s, transform 0.38s ease ${index * 0.055}s`,
      }}
    >
      <div className="ccat__img-wrap">
        <Image src={finalSrc} alt={cat.name} fill className="ccat__img" onError={() => setImgErr(true)} unoptimized />
        <div className="ccat__shine" />
      </div>
      <p className="ccat__name">{cat.name}</p>
    </Link>
  )
}

export default function HomeCategoryCarousel() {
  const trackRef   = useRef<HTMLDivElement>(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)
  const [visible,  setVisible]  = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => setCategories(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!loading && categories.length > 0) {
      const t = setTimeout(() => setVisible(true), 60)
      return () => clearTimeout(t)
    }
  }, [loading, categories.length])

  const checkArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', checkArrows, { passive: true })
    checkArrows()
    return () => el.removeEventListener('scroll', checkArrows)
  }, [checkArrows, categories])

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? el.clientWidth * 0.75 : -(el.clientWidth * 0.75), behavior: 'smooth' })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        @keyframes arrowPulse{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
        @keyframes arrowPulseL{0%,100%{transform:translateX(0)}50%{transform:translateX(-3px)}}
        .cat-section{background:#f0f0f0;padding:40px 0 50px}
        .cat-inner{max-width:1280px;margin:0 auto;padding:0 24px}
        .cat-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .cat-title{font-family:'Barlow',sans-serif;font-size:clamp(1.2rem,2.5vw,1.65rem);font-weight:800;color:#111;letter-spacing:-.02em;margin:0}
        .cat-view-all{font-family:'Barlow',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#555;text-decoration:none;transition:color .18s ease}
        .cat-view-all:hover{color:#dc2626}
        .cc-wrap{position:relative;display:flex;align-items:center}
        .cc-arrow{flex-shrink:0;width:42px;height:42px;border-radius:50%;background:#fff;border:1.5px solid #e2e2e2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#333;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,opacity .25s ease,transform .18s ease;box-shadow:0 2px 8px rgba(0,0,0,0.07);z-index:2}
        .cc-arrow:hover:not(:disabled){background:#dc2626;border-color:#dc2626;color:#fff;box-shadow:0 4px 18px rgba(220,38,38,0.32);transform:scale(1.08)}
        .cc-arrow--right:not(:disabled) svg{animation:arrowPulse 1.8s ease-in-out infinite}
        .cc-arrow--left:not(:disabled) svg{animation:arrowPulseL 1.8s ease-in-out infinite}
        .cc-track{flex:1;display:flex;gap:14px;overflow-x:auto;scroll-behavior:smooth;padding:12px 16px;scrollbar-width:none;-ms-overflow-style:none}
        .cc-track::-webkit-scrollbar{display:none}
        .ccat{flex:0 0 auto;width:148px;display:flex;flex-direction:column;align-items:center;gap:11px;text-decoration:none;cursor:pointer;will-change:transform,opacity}
        .ccat__img-wrap{position:relative;width:148px;height:148px;border-radius:18px;overflow:hidden;background:#fff;border:2px solid #e6e6e6;transition:border-color .22s ease,transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s ease;flex-shrink:0}
        .ccat:hover .ccat__img-wrap{border-color:#dc2626;transform:translateY(-7px) scale(1.03);box-shadow:0 18px 44px rgba(220,38,38,0.22),0 6px 14px rgba(0,0,0,0.09)}
        .ccat__img{object-fit:cover!important;object-position:center!important;transition:transform .4s ease}
        .ccat:hover .ccat__img{transform:scale(1.1)}
        .ccat__shine{position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 60%);pointer-events:none;border-radius:16px;opacity:0;transition:opacity .25s ease}
        .ccat:hover .ccat__shine{opacity:1}
        .ccat__img-wrap::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#dc2626,#ff6b6b);transform:scaleX(0);transform-origin:left;transition:transform .28s ease;border-radius:0 0 16px 16px}
        .ccat:hover .ccat__img-wrap::after{transform:scaleX(1)}
        .ccat__name{font-family:'Barlow',sans-serif;font-size:.8rem;font-weight:700;color:#222;text-align:center;line-height:1.3;margin:0;max-width:138px;word-break:break-word;transition:color .18s ease}
        .ccat:hover .ccat__name{color:#dc2626}
        .ccat-skeleton{flex:0 0 auto;width:148px;display:flex;flex-direction:column;align-items:center;gap:11px}
        .ccat-skeleton__img{width:148px;height:148px;border-radius:18px;background:linear-gradient(90deg,#e4e4e4 25%,#efefef 50%,#e4e4e4 75%);background-size:600px 100%;animation:shimmer 1.3s infinite linear}
        .ccat-skeleton__text{width:90px;height:12px;border-radius:4px;background:linear-gradient(90deg,#e4e4e4 25%,#efefef 50%,#e4e4e4 75%);background-size:600px 100%;animation:shimmer 1.3s infinite linear}
        @media(max-width:640px){.ccat{width:118px}.ccat__img-wrap{width:118px;height:118px}.ccat-skeleton{width:118px}.ccat-skeleton__img{width:118px;height:118px}.cc-arrow{width:34px;height:34px}}
      `}</style>

      <div className="cat-section">
        <div className="cat-inner">
          <div className="cat-header">
            <h2 className="cat-title">Popular categories</h2>
            <Link href="/shop" className="cat-view-all">View All →</Link>
          </div>
          <div className="cc-wrap">
            <button
              className="cc-arrow cc-arrow--left"
              onClick={() => scroll('left')}
              disabled={!canLeft}
              aria-label="Scroll left"
              style={{ opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div className="cc-track" ref={trackRef}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="ccat-skeleton">
                      <div className="ccat-skeleton__img" style={{ animationDelay: `${i * 0.07}s` }} />
                      <div className="ccat-skeleton__text" style={{ animationDelay: `${i * 0.07 + 0.1}s` }} />
                    </div>
                  ))
                : categories.map((cat, i) => (
                    <CategoryCard key={cat.id} cat={cat} index={i} visible={visible} />
                  ))
              }
            </div>
            <button
              className="cc-arrow cc-arrow--right"
              onClick={() => scroll('right')}
              disabled={!canRight}
              aria-label="Scroll right"
              style={{ opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}