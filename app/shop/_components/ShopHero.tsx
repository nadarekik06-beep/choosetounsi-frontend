'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { LayoutGrid, Package, BadgeCheck, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { canScrollNext, canScrollPrev, scrollCarousel } from '@/lib/i18n/rtlScroll'
import CatIcon from '@/app/components/layout/CategoryIcon'
import { categoryName, type ShopOverview } from '@/lib/shopPageApi'
import { FloatingIcons, HeaderBadge } from './HeaderDecor'

/**
 * Compact page header: title, one line of live counts, then a full-width category
 * bar (same look as the /category/[slug] bar: flat items, red active pill, edge
 * arrows) with the mega menu's line icons. Search lives in the site header.
 */
export default function ShopHero({ overview }: { overview: ShopOverview | null }) {
  const t  = useTranslations('shopPage.hero')
  const th = useTranslations('homeFeed')
  const locale = useLocale()
  const fmt = useFormat()
  const list = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ prev: false, next: false })

  const stats = overview?.stats
  const cats = [...(overview?.categories ?? [])].sort((a, b) => b.products_count - a.products_count)

  const update = useCallback(() => {
    const el = list.current
    if (el) setEdges({ prev: canScrollPrev(el), next: canScrollNext(el) })
  }, [])

  useEffect(() => {
    const el = list.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [update, cats.length])

  const go = (dir: 'prev' | 'next') => { if (list.current) scrollCarousel(list.current, dir, 240) }

  return (
    <section className="sp-hero" aria-labelledby="sp-hero-title">
      <div className="sp-container sp-hero__top">
        <HeaderBadge kind="shop" />
        <div className="sp-hero__text">
          <h1 id="sp-hero-title" className="sp-hero__title">{t('heading')}</h1>
          {stats && stats.products > 0 && (
            <ul className="ph-stats" aria-label={t('summary', { products: stats.products, sellers: stats.sellers, productsN: fmt.number(stats.products), sellersN: fmt.number(stats.sellers) })}>
              <li className="ph-stat" style={{ '--i': 0 } as CSSProperties}>
                <Package size={13} aria-hidden="true" /><b className="ltr-iso">{fmt.number(stats.products)}</b> {t('statProducts')}
              </li>
              <li className="ph-stat ph-stat--green" style={{ '--i': 1 } as CSSProperties}>
                <BadgeCheck size={13} aria-hidden="true" /><b className="ltr-iso">{fmt.number(stats.sellers)}</b> {t('statSellers')}
              </li>
              {stats.average_rating ? (
                <li className="ph-stat ph-stat--gold" style={{ '--i': 2 } as CSSProperties}>
                  <Star size={13} fill="currentColor" aria-hidden="true" />
                  <b className="ltr-iso">{fmt.number(stats.average_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b> {t('statRating')}
                </li>
              ) : null}
            </ul>
          )}
        </div>
        <FloatingIcons kind="shop" />
      </div>

      <nav className="sp-catbar" aria-label={t('chipsLabel')}>
        <div className="sp-container sp-catbar__in">
          <button type="button" className={`sp-catbar__arr${edges.prev ? ' is-on' : ''}`} onClick={() => go('prev')}
            aria-label={th('scrollPrev')} tabIndex={edges.prev ? 0 : -1}>
            <svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div ref={list} className={`sp-catbar__list${edges.prev ? ' fade-s' : ''}${edges.next ? ' fade-e' : ''}`}>
            <Link href="#catalog" className="sp-catbar__item is-on" aria-current="page">
              <LayoutGrid size={15} strokeWidth={1.8} aria-hidden="true" />{t('all')}
            </Link>
            {!overview
              ? Array.from({ length: 8 }, (_, i) => <span key={i} className="sp-catbar__skel sp-shimmer" aria-hidden="true" />)
              : cats.map(c => {
                const name = categoryName(c, locale)
                return (
                  <Link key={c.id} href={`/category/${c.slug}`} className="sp-catbar__item">
                    <span className="sp-catbar__ico"><CatIcon slug={c.slug} name={c.name} size={15} /></span>
                    {name}
                    <span className="sp-catbar__n ltr-iso">{fmt.number(c.products_count)}</span>
                  </Link>
                )
              })}
          </div>
          <button type="button" className={`sp-catbar__arr${edges.next ? ' is-on' : ''}`} onClick={() => go('next')}
            aria-label={th('scrollNext')} tabIndex={edges.next ? 0 : -1}>
            <svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </nav>
    </section>
  )
}
