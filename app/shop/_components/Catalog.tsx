'use client'

/**
 * The full catalogue: shared smart sidebar (+ category, rating, seller tier and
 * offers filters), sort chips, filters mirrored in the URL (shareable, survive
 * reloads), infinite scroll for the first pages then a "show more" button so
 * the footer stays reachable. Page 1 carries labelled ads in the platform's
 * reserved slots.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SlidersHorizontal, SearchX, PackageCheck } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import ProductFilterSidebar, { DEFAULT_FILTERS, appendFilterParams, hasActiveFilters, type F } from '@/app/components/filters/ProductFilterSidebar'
import { fetchAds, fetchAdsConfig, withAdSlots, type AdCard } from '@/lib/adsApi'
import { categoryName, fetchCatalogPage, type ShopCategory, type ShopProduct, type ShopSort, DEFAULT_SHOP_SORT, SHOP_SORTS } from '@/lib/shopPageApi'
import ShopProductCard from './ShopProductCard'
import { CardSkeleton, SectionHead } from './primitives'

const PER_PAGE = 24
const AUTO_PAGES = 3          // pages loaded by scrolling before the button takes over
const SORT_LABEL: Record<ShopSort, string> = {
  views: 'sortTrending', newest: 'sortNewest', price_asc: 'sortPriceAsc', price_desc: 'sortPriceDesc', rating: 'sortRating',
}

// ── URL <-> state ────────────────────────────────────────────────────────────

interface State { sort: ShopSort; f: F }

function readUrl(): State {
  const p = new URLSearchParams(window.location.search)
  const sort = (SHOP_SORTS as readonly string[]).includes(p.get('sort') ?? '') ? p.get('sort') as ShopSort : DEFAULT_SHOP_SORT
  const attrs: Record<string, number[]> = {}
  p.forEach((v, k) => {
    if (k.startsWith('a_')) attrs[k.slice(2)] = v.split(',').map(Number).filter(Number.isFinite)
  })
  const rating = Number(p.get('rating'))
  return {
    sort,
    f: {
      ...DEFAULT_FILTERS,
      q: p.get('q') ?? '',
      cat: p.get('cat') ?? '',
      pMin: p.get('min') ?? '',
      pMax: p.get('max') ?? '',
      inStock: p.get('stock') === '1',
      isPack: p.get('pack') === '1',
      onSale: p.get('sale') === '1',
      freeDelivery: p.get('freeship') === '1',
      minRating: rating >= 1 && rating <= 5 ? rating : 0,
      plans: (p.get('tier') ?? '').split(',').filter(x => ['free', 'red', 'black'].includes(x)),
      occasions: (p.get('occ') ?? '').split(',').filter(Boolean),
      attrs,
    },
  }
}

function writeUrl({ sort, f }: State) {
  const p = new URLSearchParams(window.location.search)
  for (const k of [...p.keys()]) {
    if (['sort', 'q', 'cat', 'min', 'max', 'stock', 'pack', 'sale', 'freeship', 'rating', 'tier', 'occ'].includes(k) || k.startsWith('a_')) p.delete(k)
  }
  if (sort !== DEFAULT_SHOP_SORT) p.set('sort', sort)
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.cat) p.set('cat', f.cat)
  if (f.pMin) p.set('min', f.pMin)
  if (f.pMax) p.set('max', f.pMax)
  if (f.inStock) p.set('stock', '1')
  if (f.isPack) p.set('pack', '1')
  if (f.onSale) p.set('sale', '1')
  if (f.freeDelivery) p.set('freeship', '1')
  if (f.minRating) p.set('rating', String(f.minRating))
  if (f.plans?.length) p.set('tier', f.plans.join(','))
  if (f.occasions.length) p.set('occ', f.occasions.join(','))
  Object.entries(f.attrs).forEach(([slug, ids]) => { if (ids.length) p.set(`a_${slug}`, ids.join(',')) })
  const qs = p.toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', url)
  }
}

function toQuery({ sort, f }: State): URLSearchParams {
  const qp = new URLSearchParams({ sort, per_page: String(PER_PAGE) })
  if (f.q.trim()) qp.set('search', f.q.trim())
  appendFilterParams(qp, f)
  return qp
}

const activeCount = (f: F) =>
  [f.cat, f.pMin || f.pMax, f.inStock, f.isPack, f.onSale, f.freeDelivery, f.minRating, f.plans?.length, f.occasions.length,
    Object.values(f.attrs).some(v => v.length), f.q.trim()].filter(Boolean).length

type Row = { ad: AdCard } | { item: ShopProduct }

export default function Catalog({ categories, excludeAds = [] }: { categories: ShopCategory[] | null; excludeAds?: number[] }) {
  const t  = useTranslations('shopPage.catalog')
  const tf = useTranslations('filters')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { number } = useFormat()

  const [state, setState] = useState<State | null>(null)      // null until the URL is read (client only)
  const [rows, setRows] = useState<Row[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mOpen, setMOpen] = useState(false)
  const [reload, setReload] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const adIds = useRef<Set<number>>(new Set())
  const firstLoad = useRef(true)
  const generation = useRef<AbortController | null>(null)   // aborted when filters change
  // Read at request time: the feed arriving later must not refetch the grid
  const exclude = useRef(excludeAds)
  exclude.current = excludeAds

  useEffect(() => { setState(readUrl()) }, [])
  useEffect(() => { if (state) writeUrl(state) }, [state])

  // Debounced query: typing a price or a search term doesn't fire a request per key
  const query = useMemo(() => (state ? toQuery(state).toString() : null), [state])
  const [debounced, setDebounced] = useState<string | null>(null)
  useEffect(() => {
    if (query === null) return
    const id = window.setTimeout(() => setDebounced(query), debounced === null ? 0 : 300)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only the query drives the debounce
  }, [query])

  const load = useCallback(async (q: string, pageNum: number, signal: AbortSignal) => {
    setLoading(true); setError(false)
    try {
      const params = new URLSearchParams(q); params.set('page', String(pageNum))
      const cat = params.get('category_slug') ?? undefined
      const search = params.get('search') ?? undefined
      // Ads only on an unfiltered page 1 (category / search are context): a paid card
      // must never look like it matches a price, rating or tier filter it doesn't
      const narrowed = [...params.keys()].some(k => !['sort', 'per_page', 'page', 'category_slug', 'search'].includes(k))
      const [res, ads, config] = await Promise.all([
        fetchCatalogPage(params, signal),
        pageNum === 1 && !narrowed
          ? fetchAds(cat ? 'category_top' : search ? 'search_top' : 'home_inline', { categorySlug: cat, q: search, exclude: exclude.current }, signal)
          : Promise.resolve([] as AdCard[]),
        fetchAdsConfig(),
      ])
      if (signal.aborted) return
      if (pageNum === 1) adIds.current = new Set(ads.map(a => a.id))
      const organic = res.data.filter(p => !adIds.current.has(p.id))
      const next: Row[] = pageNum === 1 ? withAdSlots(organic, ads, config?.reserved_slots ?? [1, 7]) : organic.map(item => ({ item }))
      setRows(prev => (pageNum === 1 ? next : [...prev, ...next]))
      setLastPage(res.last_page)
      setTotal(res.total)
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setError(true)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  // New filters / sort → page 1 (and bring the grid top into view if we were deep in it)
  useEffect(() => {
    if (debounced === null) return
    const ctrl = new AbortController()
    generation.current = ctrl
    setPage(1)
    load(debounced, 1, ctrl.signal)
    if (!firstLoad.current) {
      const top = sectionRef.current?.getBoundingClientRect().top ?? 0
      if (top < -200) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    else if (window.location.hash === '#catalog') {
      // Deep link: sections above have loaded since the browser's initial jump
      requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start' }))
    }
    firstLoad.current = false
    return () => ctrl.abort()
  }, [debounced, load, reload])

  const more = useCallback(() => {
    if (loading || page >= lastPage || debounced === null) return
    const next = page + 1
    setPage(next)
    if (generation.current) load(debounced, next, generation.current.signal)
  }, [loading, page, lastPage, debounced, load])

  // Infinite scroll for the first few pages
  useEffect(() => {
    const el = sentinel.current
    if (!el || page >= AUTO_PAGES || page >= lastPage) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) more() }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, page, lastPage])

  const setF = (f: F) => setState(s => (s ? { ...s, f } : s))
  const setSort = (sort: ShopSort) => setState(s => (s ? { ...s, sort } : s))
  const clear = () => setState(s => (s ? { ...s, f: { ...DEFAULT_FILTERS } } : s))

  const pickerCats = (categories ?? []).map(c => ({ slug: c.slug, label: categoryName(c, locale), count: c.products_count }))
  const f = state?.f ?? DEFAULT_FILTERS
  const nActive = activeCount(f)
  const showSkeleton = loading && page === 1
  const hasMore = page < lastPage

  return (
    <section ref={sectionRef} id="catalog" className="sp-section" aria-labelledby="sp-catalog-title">
      <div className="sp-container">
        <SectionHead id="sp-catalog-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
        <div className="sp-catalog">
          <ProductFilterSidebar
            f={f} setF={setF}
            total={total ?? 0} hideSort extended categories={pickerCats} mOpen={mOpen} setMOpen={setMOpen}
          />

          <div style={{ minWidth: 0 }}>
            <div className="sp-toolbar">
              <button type="button" className="sp-filter-btn" onClick={() => setMOpen(true)} aria-haspopup="dialog">
                <SlidersHorizontal size={15} aria-hidden="true" />{t('filters')}
                {nActive > 0 && <span className="sp-filter-btn__n">{nActive}</span>}
              </button>
              <div className="sp-toolbar__sorts" role="group" aria-label={t('sortLabel')}>
                {SHOP_SORTS.map(k => (
                  <button key={k} type="button" className="sp-sort" aria-pressed={state?.sort === k} onClick={() => setSort(k)}>
                    {t(SORT_LABEL[k])}
                  </button>
                ))}
              </div>
              <span className="sp-toolbar__count" aria-live="polite">{total !== null && tf('productCount', { count: total })}</span>
            </div>
            <p className="sp-mobile-count" aria-hidden="true">{total !== null && tf('productCount', { count: total })}</p>

            {error && rows.length === 0 ? (
              <div className="sp-empty" role="alert">
                <span className="sp-empty__icon"><SearchX size={26} aria-hidden="true" /></span>
                <p className="sp-empty__title">{t('error')}</p>
                <button type="button" className="sp-btn sp-btn--primary" onClick={() => setReload(n => n + 1)}>{tc('retry')}</button>
              </div>
            ) : !loading && rows.length === 0 ? (
              <div className="sp-empty">
                <span className="sp-empty__icon"><SearchX size={26} aria-hidden="true" /></span>
                <p className="sp-empty__title">{t('emptyTitle')}</p>
                <p className="sp-empty__body">{t('emptyBody')}</p>
                {hasActiveFilters(f) && <button type="button" className="sp-btn sp-btn--ghost" onClick={clear}>{tf('clearFilters')}</button>}
              </div>
            ) : (
              <div className="sp-grid" aria-busy={loading}>
                {!showSkeleton && rows.map((r, i) => 'ad' in r
                  ? <ShopProductCard key={`ad-${r.ad.id}`} product={r.ad} index={i} section="shop_catalog" eager={i < 4} />
                  : <ShopProductCard key={`p-${r.item.id}`} product={r.item} index={i} section="shop_catalog" eager={i < 4} />)}
                {loading && Array.from({ length: page === 1 ? 8 : 4 }, (_, i) => <CardSkeleton key={`sk-${i}`} />)}
              </div>
            )}

            <div ref={sentinel} className="sp-sentinel" aria-hidden="true" />
            {rows.length > 0 && (
              <div className="sp-more">
                {hasMore && !loading && (
                  <button type="button" className="sp-btn sp-btn--ghost" onClick={more}>{t('loadMore')}</button>
                )}
                {!hasMore && !loading && total !== null && total > 0 && (
                  <p className="sp-end"><PackageCheck size={16} aria-hidden="true" />{t('end')} <span className="ltr-iso">({number(total)})</span></p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
