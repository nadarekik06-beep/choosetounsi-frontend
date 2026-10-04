'use client'

/**
 * /deals — every offer on ChooseTounsi in one dense grid: flash sales, promotions,
 * packs and coupon products (GET /api/deals). Filters live in the URL
 * (?type=flash&sort=savings&cat=3&min=10&max=80&disc=20) so they survive a
 * refresh and can be shared; the last choice is remembered in localStorage and
 * restored on a bare /deals. Cards are the /shop ShopProductCard in its "deal" layout.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { SlidersHorizontal, TrendingDown, X } from 'lucide-react'
import Navbar from '@/app/components/layout/Navbar'
import { useFormat } from '@/lib/i18n/useFormat'
import { categoryName, type ShopProduct } from '@/lib/shopPageApi'
import { fetchDeals, fetchPopular, type DealsData } from '@/lib/dealsApi'
import ShopProductCard from '@/app/shop/_components/ShopProductCard'
import { QuickViewProvider } from '@/app/shop/_components/QuickView'
import { DealCard, DealSkeleton, ProductOfferBadge } from './DealCards'
import { FilterSheet, FiltersBody, TYPE_ORDER, TypeIcon, type Facets, type FacetOption } from './DealFiltersPanel'
import {
  DISCOUNT_STEPS, SORT_KEYS, activeFilterCount, buildItems, matches, parseQuery, sortItems, toQuery,
  type DealFilters, type DealItem, type SortKey, type TypeFilter,
} from './model'
import '@/app/shop/_components/shop.css'
import './deals.css'

const PAGE = 24
const RELATED = 8
const STORE_KEY = 'ct_deals_query'

/** Height of the site's sticky header, so the tab bar and sidebar stick right under it. */
function useHeaderHeight(): number {
  const [h, setH] = useState(0)
  useEffect(() => {
    const el = document.querySelector('body header')
    if (!el) return
    const measure = () => setH(Math.round(el.getBoundingClientRect().height))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return h
}

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export default function DealsPage() {
  const t  = useTranslations('deals')
  const tf = useTranslations('filters')
  const locale = useLocale()
  const fmt = useFormat()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const query = params.toString()
  const f = useMemo(() => parseQuery(new URLSearchParams(query)), [query])

  const [data, setData]       = useState<DealsData | null>(null)
  const [failed, setFailed]   = useState(false)
  const [visible, setVisible] = useState(PAGE)
  const [sheet, setSheet]     = useState(false)
  const headerH = useHeaderHeight()

  // ── Data ──────────────────────────────────────────────────────────────────
  const load = useCallback((signal?: AbortSignal) => {
    setFailed(false)
    fetchDeals(signal).then(setData).catch(() => { if (!signal?.aborted) setFailed(true) })
  }, [])
  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  // ── URL is the source of truth; localStorage remembers the last choice ───
  const update = useCallback((patch: Partial<DealFilters>) => {
    const q = toQuery({ ...f, ...patch })
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [f, pathname, router])
  const clear = useCallback(() => update({ cats: [], min: null, max: null, disc: 0, type: 'all' }), [update])

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      // A bare /deals restores the last filters; a shared link keeps its own
      if (!query) {
        const saved = storage()?.getItem(STORE_KEY)
        if (saved) router.replace(`${pathname}?${toQuery(parseQuery(new URLSearchParams(saved)))}`, { scroll: false })
      }
      return
    }
    try {
      const q = toQuery(f)
      if (q) storage()?.setItem(STORE_KEY, q)
      else storage()?.removeItem(STORE_KEY)
    } catch { /* storage blocked */ }
  }, [f, query, pathname, router])

  useEffect(() => { setVisible(PAGE) }, [query])

  // ── Items, filters, facets ────────────────────────────────────────────────
  const items     = useMemo(() => (data ? buildItems(data) : []), [data])
  const interests = useMemo(() => data?.interest_category_ids ?? [], [data])
  const results   = useMemo(() => sortItems(items.filter(i => matches(i, f)), f.sort, interests), [items, f, interests])

  const facets = useMemo<Facets>(() => {
    const types = Object.fromEntries(TYPE_ORDER.map(k => [k, 0])) as Record<TypeFilter, number>
    const cats = new Map<number, FacetOption>()
    const disc: Record<number, number> = {}
    const catLabel = new Map<number, string>()
    for (const i of items) if (i.categoryId !== null && i.categoryName) catLabel.set(i.categoryId, categoryName(i.categoryName, locale))

    for (const i of items) {
      if (matches(i, f, 'type')) {
        types.all++
        for (const o of i.offers) types[o]++
      }
      if (i.categoryId !== null && catLabel.has(i.categoryId)) {
        const c = cats.get(i.categoryId) ?? { id: i.categoryId, label: catLabel.get(i.categoryId)!, count: 0 }
        if (matches(i, f, 'cats')) c.count++
        cats.set(i.categoryId, c)
      }
      if (matches(i, f, 'disc')) for (const d of DISCOUNT_STEPS) if (i.bestPercent >= d) disc[d] = (disc[d] ?? 0) + 1
    }
    const prices = items.map(i => i.price)
    const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label)
    return {
      types,
      cats: [...cats.values()].sort(byCount),
      disc,
      bounds: prices.length ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) } : { min: 0, max: 0 },
    }
  }, [items, f, locale])

  // Header chip: the biggest real price reduction on the page (not the filtered view)
  const totals = useMemo(() => ({ maxPercent: items.reduce((m, i) => Math.max(m, i.percent), 0) }), [items])

  // ── Infinite scroll (the button stays as the keyboard / no-JS-observer path) ─
  const sentinel = useRef<HTMLDivElement>(null)
  const more = results.length > visible
  useEffect(() => {
    const el = sentinel.current
    if (!el || !more) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(v => v + PAGE) }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, visible])

  // ── "You may also like": popular products from the deals' main category / shop ─
  const seed = useMemo(() => {
    if (!data) return null
    const count = new Map<number, number>()
    for (const i of results) if (i.categoryId !== null) count.set(i.categoryId, (count.get(i.categoryId) ?? 0) + 1)
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    return { category: f.cats[0] ?? top ?? interests[0] ?? null }
  }, [data, results, f.cats, interests])

  const [related, setRelated] = useState<{ title: 'alsoLike' | 'popular'; products: ShopProduct[] } | null>(null)
  const seedKey = seed ? String(seed.category) : null
  useEffect(() => {
    if (!seed || !data) return
    const ctrl = new AbortController()
    const exclude = new Set(data.products.map(p => p.id))
    const fresh = (rows: ShopProduct[]) => rows.filter(p => !exclude.has(p.id) && p.stock > 0)
    ;(async () => {
      let rows: ShopProduct[] = []
      if (seed.category) {
        rows = fresh(await fetchPopular({ category_id: seed.category, per_page: 16 }, ctrl.signal))
      }
      let title: 'alsoLike' | 'popular' = 'alsoLike'
      if (rows.length < 4) {
        const ids = new Set(rows.map(p => p.id))
        rows = [...rows, ...fresh(await fetchPopular({ per_page: 16 }, ctrl.signal)).filter(p => !ids.has(p.id))]
        title = 'popular'
      }
      if (!ctrl.signal.aborted) setRelated({ title, products: rows.slice(0, RELATED) })
    })()
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, data])

  // ── Active filter chips ─────────────────────────────────────────────────────
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (f.type !== 'all') chips.push({ key: 'type', label: t(`tabs.${f.type}`), remove: () => update({ type: 'all' }) })
  for (const id of f.cats) {
    const c = facets.cats.find(x => x.id === id)
    if (c) chips.push({ key: `c${id}`, label: c.label, remove: () => update({ cats: f.cats.filter(x => x !== id) }) })
  }
  if (f.min !== null || f.max !== null) {
    chips.push({
      key: 'price',
      label: `${fmt.price(f.min ?? facets.bounds.min)} – ${fmt.price(f.max ?? facets.bounds.max)}`,
      remove: () => update({ min: null, max: null }),
    })
  }
  if (f.disc) chips.push({ key: 'disc', label: t('discountAtLeast', { percent: f.disc }), remove: () => update({ disc: 0 }) })

  const filterBadge = activeFilterCount(f) + (f.type !== 'all' ? 1 : 0)
  const loading = !data && !failed
  const filtersBody = <FiltersBody f={f} facets={facets} update={update} clear={clear} hasActive={chips.length > 0} />


  return (
    <>
      <Navbar />
      <main className="sp dl" style={{ '--nav-h': `${headerH}px` } as CSSProperties}>
        <QuickViewProvider>
          {/* ── Page header: light, compact, products carry the colour ─── */}
          <div className="dl-head">
            <div className="dl-wrap dl-head__row">
              <div className="dl-head__text">
                <nav className="dl-crumbs" aria-label={t('breadcrumb')}>
                  <Link href="/">{t('crumbHome')}</Link>
                  <span aria-hidden="true">›</span>
                  <span aria-current="page">{t('crumbDeals')}</span>
                </nav>
                <h1 className="dl-head__title">{t('heroTitle')}</h1>
                <p className="dl-head__sub">{t('heroSubShort')}</p>
              </div>
              {totals.maxPercent > 0 && (
                <button type="button" className={`dl-head__chip${f.sort === 'savings' ? ' is-on' : ''}`} aria-pressed={f.sort === 'savings'}
                  onClick={() => update({ sort: f.sort === 'savings' ? 'recommended' : 'savings' })}>
                  <TrendingDown size={16} aria-hidden="true" /> {t('upToSavings', { percent: totals.maxPercent })}
                </button>
              )}
            </div>
          </div>

          {/* ── Offer type tabs (sticky) ───────────────────────────────── */}
          <nav className="dl-tabs" aria-label={t('dealType')}>
            <div className="dl-wrap dl-tabs__track">
              {TYPE_ORDER.map(k => {
                const n = facets.types[k]
                const on = f.type === k
                return (
                  <button key={k} type="button" className={`dl-tab${on ? ' is-on' : ''}`} aria-pressed={on}
                    disabled={!loading && n === 0 && !on} onClick={() => update({ type: k })}>
                    <TypeIcon type={k} />
                    {t(`tabs.${k}`)}
                    <span className="dl-tab__n">{loading ? '–' : n}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="dl-wrap dl-layout">
            {/* ── Sidebar (desktop) ──────────────────────────────────────── */}
            <aside className="dl-side" aria-label={tf('title')}>{filtersBody}</aside>

            <section className="dl-main" aria-label={t('resultsLabel')}>
              <div className="dl-bar">
                <p className="dl-bar__count" aria-live="polite">{loading ? ' ' : t('dealsCount', { count: results.length })}</p>
                <div className="dl-bar__tools">
                  <button type="button" className="dl-bar__filters" onClick={() => setSheet(true)}>
                    <SlidersHorizontal size={15} aria-hidden="true" /> {t('filters')}
                    {filterBadge > 0 && <span className="dl-bar__badge">{filterBadge}</span>}
                  </button>
                  <label className="dl-sort">
                    <span className="dl-sort__label">{tf('sortBy')}</span>
                    <select value={f.sort} onChange={e => update({ sort: e.target.value as SortKey })} aria-label={t('sortLabel')}>
                      {SORT_KEYS.map(k => <option key={k} value={k}>{t(`sort.${k}`)}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {chips.length > 0 && (
                <div className="dl-chips">
                  {chips.map(c => (
                    <button key={c.key} type="button" className="dl-chip" onClick={c.remove} aria-label={t('removeFilter', { label: c.label })}>
                      {c.label} <X size={12} aria-hidden="true" />
                    </button>
                  ))}
                  <button type="button" className="dl-chips__clear" onClick={clear}>{tf('clearFilters')}</button>
                </div>
              )}

              {failed ? (
                <div className="dl-empty">
                  <p className="dl-empty__title">{t('loadError')}</p>
                  <button type="button" className="dl-btn" onClick={() => load()}>{t('retry')}</button>
                </div>
              ) : loading ? (
                <div className="dl-grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <DealSkeleton key={i} />)}</div>
              ) : results.length === 0 ? (
                <div className="dl-empty">
                  <p className="dl-empty__title">{items.length ? t('emptyTitle') : t('noDealsTitle')}</p>
                  <p className="dl-empty__body">{items.length ? t('emptyBody') : t('noDealsBody')}</p>
                  {chips.length > 0 && <button type="button" className="dl-btn" onClick={clear}>{t('clearAll')}</button>}
                </div>
              ) : (
                <>
                  <div className="dl-grid">
                    {results.slice(0, visible).map((item: DealItem, i) => <DealCard key={item.key} item={item} index={i} />)}
                  </div>
                  {more && (
                    <div className="dl-more" ref={sentinel}>
                      <button type="button" className="dl-btn dl-btn--ghost" onClick={() => setVisible(v => v + PAGE)}>
                        {t('showMore', { shown: Math.min(visible, results.length), total: results.length })}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── Keep browsing: shown once every offer is on screen ───── */}
              {!more && related && related.products.length > 0 && (
                <section className="dl-related" aria-labelledby="dl-related-title">
                  <div className="dl-related__head">
                    <h2 id="dl-related-title">{t(`related.${related.title}`)}</h2>
                    <Link href="/shop" className="dl-related__link">{t('browse')} →</Link>
                  </div>
                  <div className="dl-grid">
                    {related.products.map((p, i) => <ShopProductCard key={p.id} product={p} index={i} section="deals_related" layout="deal" badge={<ProductOfferBadge product={p} />} />)}
                  </div>
                </section>
              )}
            </section>
          </div>

          <FilterSheet open={sheet} onClose={() => setSheet(false)} resultCount={results.length}>{filtersBody}</FilterSheet>
        </QuickViewProvider>
      </main>
    </>
  )
}
