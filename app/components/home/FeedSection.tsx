'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  Flame, Heart, History, Lightbulb, Megaphone, PackagePlus, Sparkles, Star, Store, TrendingUp, Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { FeedSection as FeedSectionData, FeedSectionType } from '@/lib/homeFeedApi'
import { canScrollNext, canScrollPrev, scrollCarousel } from '@/lib/i18n/rtlScroll'
import FeedProductCard, { FeedCardSkeleton, type CardVariant } from './FeedProductCard'

type Localized = { name: string; name_fr?: string | null; name_ar?: string | null }

function localizedName(item: Localized, locale: string): string {
  if (locale === 'ar' && item.name_ar) return item.name_ar
  if (locale === 'fr' && item.name_fr) return item.name_fr
  return item.name
}

/** Per-row identity: icon, accent colour, card treatment. */
const LOOK: Record<FeedSectionType, { icon: LucideIcon; color: string; bg: string; card?: CardVariant }> = {
  recommended:         { icon: Sparkles,    color: '#db142e', bg: '#fff1f2' },
  sponsored:           { icon: Megaphone,   color: '#b45309', bg: '#fef3c7' },
  trending:            { icon: Flame,       color: '#ea580c', bg: '#fff7ed', card: 'ranked' },
  best_sellers:        { icon: Trophy,      color: '#a16207', bg: '#fefce8', card: 'bestseller' },
  similar:             { icon: Lightbulb,   color: '#7c3aed', bg: '#f5f3ff' },
  favorites:           { icon: Heart,       color: '#db2777', bg: '#fdf2f8' },
  favorite_sellers:    { icon: Store,       color: '#198f41', bg: '#f0fdf4' },
  recently_viewed:     { icon: History,     color: '#475569', bg: '#f1f5f9' },
  new_arrivals:        { icon: PackagePlus, color: '#0284c7', bg: '#f0f9ff' },
  top_rated:           { icon: Star,        color: '#ca8a04', bg: '#fefce8' },
  popular_in_category: { icon: TrendingUp,  color: '#0f766e', bg: '#f0fdfa' },
}

function seeAllHref(section: FeedSectionData): string {
  switch (section.type) {
    case 'popular_in_category': return section.meta.category ? `/category/${section.meta.category.slug}` : '/shop'
    case 'favorites':           return '/favorites'
    case 'favorite_sellers':    return section.meta.sellers?.[0] ? `/sellers/${section.meta.sellers[0].id}` : '/shop'
    case 'new_arrivals':        return '/shop?sort=newest'
    case 'trending':
    case 'best_sellers':        return '/shop?sort=views'
    default:                    return '/shop'
  }
}

function Arrow({ dir, disabled, onClick, label }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="feed-arrow"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 30, height: 30, borderRadius: 999, border: '1px solid #eee', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1, color: '#111',
      }}
    >
      <svg className="rtl-flip" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}

export default function FeedSection({ section }: { section: FeedSectionData }) {
  const t      = useTranslations('homeFeed')
  const locale = useLocale()
  const track  = useRef<HTMLDivElement>(null)
  const [prev, setPrev] = useState(false)
  const [next, setNext] = useState(false)

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setPrev(canScrollPrev(el))
    setNext(canScrollNext(el))
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update, section.products.length])

  const look = LOOK[section.type] ?? LOOK.recommended
  const Icon = look.icon
  const category = section.meta.category
  const title = section.type === 'popular_in_category' && category
    ? t('titles.popular_in_category', { category: localizedName(category, locale) })
    : t(`titles.${section.type}`)
  const subtitle = t(`subtitles.${section.type}`)
  const sellers = section.type === 'favorite_sellers' ? section.meta.sellers ?? [] : []
  const highlighted = section.type === 'recommended'

  return (
    <section
      className={`feed-section${highlighted ? ' feed-section--highlight' : ''}`}
      aria-label={title}
      data-section={section.key}
    >
      <div className="feed-wrap">
        <div className={highlighted ? 'feed-panel' : undefined}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span aria-hidden style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: look.bg, color: look.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 0 0 1px ${look.color}22`,
              }}>
                <Icon size={17} strokeWidth={2.4} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: '0 0 2px', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', lineHeight: 1.2 }}>
                  {title}
                  {section.type === 'sponsored' && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('sponsoredBadge')}
                    </span>
                  )}
                </h2>
                <p className="feed-subtitle" style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontFamily: "'Outfit', sans-serif" }}>{subtitle}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Link href={seeAllHref(section)} style={{
                fontSize: 11, fontWeight: 700, color: '#db142e', textDecoration: 'none', display: 'flex', alignItems: 'center',
                gap: 4, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.85, whiteSpace: 'nowrap',
              }}>
                {t('viewAll')}
                <svg className="rtl-flip" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="feed-arrows" style={{ display: 'flex', gap: 6 }}>
                <Arrow dir="prev" disabled={!prev} label={t('scrollPrev')} onClick={() => track.current && scrollCarousel(track.current, 'prev')} />
                <Arrow dir="next" disabled={!next} label={t('scrollNext')} onClick={() => track.current && scrollCarousel(track.current, 'next')} />
              </div>
            </div>
          </div>

          {sellers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {sellers.map(s => (
                <Link key={s.id} href={`/sellers/${s.id}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 999,
                  border: '1px solid #eee', background: '#fafafa', textDecoration: 'none', color: '#111', fontSize: 12, fontWeight: 700,
                }}>
                  {s.avatar
                    ? <img src={s.avatar} alt="" style={{ width: 22, height: 22, borderRadius: 999, objectFit: 'cover' }} />
                    : <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, background: '#db142e', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                        {(s.business_name ?? '?').charAt(0).toUpperCase()}
                      </span>}
                  {s.business_name}
                  {s.followed && <span style={{ fontSize: 9, color: '#198f41', fontWeight: 800, textTransform: 'uppercase' }}>✓ {t('following')}</span>}
                </Link>
              ))}
            </div>
          )}

          <div ref={track} className="feed-track" onScroll={update}>
            {section.products.map((p, i) => (
              <FeedProductCard key={p.id} product={p} index={i} section={section.key} variant={look.card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeedSectionSkeleton() {
  const bar = (w: string, h: number): React.CSSProperties => ({
    width: w, height: h, borderRadius: 4, background: 'linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%)',
    backgroundSize: '600px 100%', animation: 'feedShimmer 1.3s infinite linear',
  })
  return (
    <section className="feed-section" aria-hidden>
      <div className="feed-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ ...bar('34px', 34), borderRadius: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={bar('220px', 18)} />
            <div style={bar('160px', 10)} />
          </div>
        </div>
        <div className="feed-track">
          {Array.from({ length: 8 }).map((_, i) => <FeedCardSkeleton key={i} />)}
        </div>
      </div>
    </section>
  )
}
