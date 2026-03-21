'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: number
  name: string
  name_ar: string
  slug: string
  icon: string | null
  image: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function resolveImageSrc(image: string | null): string | null {
  if (!image) return null
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  return `${API_URL}/storage/${image}`
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCategoryCard() {
  return (
    <div className="category-skeleton">
      <div className="skeleton-img" />
      <div className="skeleton-text" />
    </div>
  )
}

// ─── Single category card — matches inspiration layout ────────────────────────
function CategoryCard({ category, index }: { category: Category; index: number }) {
  const imageSrc = resolveImageSrc(category.image)
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      href={`/category/${category.slug}`}
      className="category-card"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Image area */}
      <div className="category-card__img-wrap">
        {imageSrc && !imgError ? (
          <Image
            src={imageSrc}
            alt={category.name}
            fill
            className="category-card__img"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : category.icon ? (
          <span className="category-card__icon" aria-hidden="true">
            {category.icon}
          </span>
        ) : (
          /* Fallback placeholder */
          <svg
            className="category-card__placeholder"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        )}
      </div>

      {/* Name */}
      <p className="category-card__name">{category.name}</p>
    </Link>
  )
}

// ─── Main exported section ────────────────────────────────────────────────────
export default function CategoryShowcase() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      try {
        setLoading(true)
        setError(false)
        const res = await fetch(`${API_URL}/api/categories`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setCategories(json.data ?? [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    return () => controller.abort()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap');

        /* ── Section wrapper ── */
        .category-showcase {
          width: 100%;
          background: #f0f0f0;
          padding: 40px 0 48px;
          font-family: 'Barlow', sans-serif;
        }

        .category-showcase__inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ── Header row ── */
        .category-showcase__header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .category-showcase__title {
          font-family: 'Barlow', sans-serif;
          font-size: clamp(1.4rem, 3vw, 1.75rem);
          font-weight: 800;
          color: #111;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .category-showcase__view-all {
          font-size: 0.8rem;
          font-weight: 700;
          color: #555;
          text-decoration: none;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.18s ease;
        }
        .category-showcase__view-all:hover {
          color: #dc2626;
        }

        /* ── Grid ── */
        .category-showcase__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (min-width: 480px) {
          .category-showcase__grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 768px) {
          .category-showcase__grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .category-showcase__grid { grid-template-columns: repeat(6, 1fr); }
        }

        /* ── Category card ── */
        @keyframes catFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          background: #fff;
          border-radius: 10px;
          padding: 20px 12px 16px;
          border: 1.5px solid #e8e8e8;
          cursor: pointer;
          animation: catFadeUp 0.42s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          will-change: transform;
        }

        .category-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.10);
          border-color: #d0d0d0;
        }

        /* ── Image wrap — square, centered ── */
        .category-card__img-wrap {
          position: relative;
          width: 100%;
          /* Enforce square via padding-bottom trick */
          aspect-ratio: 1 / 1;
          max-width: 120px;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f7f7;
          margin-bottom: 14px;
          /* Subtle red/green tint overlay via mix-blend-mode — 
             makes images pop on the grey background */
          filter: saturate(1.12) contrast(1.04);
          transition: filter 0.25s ease;
        }

        .category-card:hover .category-card__img-wrap {
          filter: saturate(1.25) contrast(1.06);
        }

        .category-card__img {
          object-fit: contain !important;
          object-position: center !important;
          padding: 8px;
          transition: transform 0.3s ease;
        }

        .category-card:hover .category-card__img {
          transform: scale(1.07);
        }

        /* Icon emoji fallback */
        .category-card__icon {
          font-size: 3rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          transition: transform 0.3s ease;
        }
        .category-card:hover .category-card__icon {
          transform: scale(1.08);
        }

        /* SVG placeholder */
        .category-card__placeholder {
          color: #c0c0c0;
          flex-shrink: 0;
        }

        /* ── Category name ── */
        .category-card__name {
          font-size: 0.8rem;
          font-weight: 700;
          color: #222;
          text-align: center;
          line-height: 1.3;
          letter-spacing: 0.01em;
          margin: 0;
          word-break: break-word;
          transition: color 0.18s ease;
        }

        .category-card:hover .category-card__name {
          color: #dc2626;
        }

        /* ── Skeletons ── */
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }

        .category-skeleton {
          background: #fff;
          border-radius: 10px;
          padding: 20px 12px 16px;
          border: 1.5px solid #e8e8e8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .skeleton-img {
          width: 100%;
          max-width: 120px;
          aspect-ratio: 1 / 1;
          border-radius: 6px;
          background: linear-gradient(90deg, #e8e8e8 25%, #f3f3f3 50%, #e8e8e8 75%);
          background-size: 600px 100%;
          animation: shimmer 1.3s infinite linear;
        }

        .skeleton-text {
          width: 60%;
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(90deg, #e8e8e8 25%, #f3f3f3 50%, #e8e8e8 75%);
          background-size: 600px 100%;
          animation: shimmer 1.3s infinite linear;
          animation-delay: 0.1s;
        }

        /* ── Error / empty states ── */
        .category-showcase__state {
          text-align: center;
          padding: 48px 0;
          color: #aaa;
          font-size: 0.875rem;
        }
      `}</style>

      <section className="category-showcase">
        <div className="category-showcase__inner">

          {/* Header */}
          <div className="category-showcase__header">
            <h2 className="category-showcase__title">Popular categories</h2>
            <Link href="/shop" className="category-showcase__view-all">
              View All Categories →
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <div className="category-showcase__grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCategoryCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="category-showcase__state">
              Could not load categories — make sure your API is running at{' '}
              <code>{API_URL}/api/categories</code>
            </p>
          )}

          {/* Empty */}
          {!loading && !error && categories.length === 0 && (
            <p className="category-showcase__state">
              No active categories yet. Add some from your admin panel.
            </p>
          )}

          {/* Grid */}
          {!loading && !error && categories.length > 0 && (
            <div className="category-showcase__grid">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} index={i} />
              ))}
            </div>
          )}

        </div>
      </section>
    </>
  )
}