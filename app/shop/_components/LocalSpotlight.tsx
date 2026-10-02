'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import { fetchBrandProducts, fetchCatalogPage, type ShopCategory, type ShopProduct } from '@/lib/shopPageApi'
import ShopProductCard from './ShopProductCard'
import { ArrowIcon, CardSkeleton, PepperGlyph, Rail, Reveal } from './primitives'

const CRAFTS_SLUG = 'arts-crafts'

/**
 * Made-in-Tunisia spotlight: WearTounsi (platform brand) products, or — while the
 * brand has nothing in stock — the arts & crafts aisle. Hidden when both are empty.
 */
export default function LocalSpotlight({ categories }: { categories: ShopCategory[] | null }) {
  const t = useTranslations('shopPage.local')
  const [state, setState] = useState<{ mode: 'brand' | 'crafts'; products: ShopProduct[] } | null>(null)
  const hasCrafts = !!categories?.some(c => c.slug === CRAFTS_SLUG)

  useEffect(() => {
    if (!categories) return
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const brand = await fetchBrandProducts(8, ctrl.signal)
        if (brand.length) { setState({ mode: 'brand', products: brand }); return }
        if (!hasCrafts) { setState({ mode: 'crafts', products: [] }); return }
        const page = await fetchCatalogPage(new URLSearchParams({ category_slug: CRAFTS_SLUG, sort: 'views', per_page: '8', in_stock: '1' }), ctrl.signal)
        setState({ mode: 'crafts', products: page.data })
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') setState({ mode: 'crafts', products: [] })
      }
    })()
    return () => ctrl.abort()
  }, [categories, hasCrafts])

  // Same footprint while loading, so the sections below don't jump
  if (!state && categories) {
    return (
      <section className="sp-section" aria-hidden="true">
        <div className="sp-container sp-local">
          <div className="sp-local__intro sp-shimmer" />
          <div className="sp-local__rail"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: 14, overflow: 'hidden' }}>
            {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
          </div></div>
        </div>
      </section>
    )
  }
  if (!state || state.products.length === 0) return null
  const brand = state.mode === 'brand'

  return (
    <section className="sp-section" aria-labelledby="sp-local-title">
      <div className="sp-container sp-local">
        <Reveal className="sp-local__intro">
          <TunisianPattern color="#ffffff" className="sp-pattern" />
          <span className="sp-local__flag" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 30 30"><circle cx="15" cy="15" r="8" fill="#fff" /><circle cx="14.3" cy="15" r="6" fill="#db142e" /><circle cx="15.9" cy="15" r="4.8" fill="#fff" /><path d="M20.60 15.00 L18.79 15.65 L18.73 17.57 L17.56 16.05 L15.72 16.59 L16.80 15.00 L15.72 13.41 L17.56 13.95 L18.73 12.43 L18.79 14.35Z" fill="#db142e" /></svg>
          </span>
          <p className="sp-eyebrow"><span className="sp-eyebrow__dot" aria-hidden="true" />{t('eyebrow')}</p>
          <h2 id="sp-local-title" className="sp-title">
            {brand ? t('brandTitle1') : t('craftsTitle1')} <em>{brand ? t('brandTitle2') : t('craftsTitle2')}</em>
          </h2>
          <p className="sp-lead">{brand ? t('brandLead') : t('craftsLead')}</p>
          <Link href={brand ? '/brand' : `/category/${CRAFTS_SLUG}`} className="sp-btn sp-btn--white">
            <PepperGlyph tier="red" size={16} />{brand ? t('brandCta') : t('craftsCta')}<ArrowIcon />
          </Link>
        </Reveal>
        <div className="sp-local__rail">
          <Rail className="sp-rail--products" label={t('eyebrow')}>
            {state.products.map((p, i) => (
              <div key={p.id} role="listitem"><ShopProductCard product={p} index={i} section={brand ? 'shop_brand' : 'shop_crafts'} /></div>
            ))}
          </Rail>
        </div>
      </div>
    </section>
  )
}
