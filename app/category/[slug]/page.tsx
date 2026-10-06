'use client'

/**
 * app/category/[slug]/page.tsx
 
 */

import {
  useState, useEffect, useCallback,
  useMemo, useRef, Suspense,
} from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { PricedProduct } from '@/app/components/promotions/ProductPrice'
import ProductCard, { ProductCardSkeleton } from '@/app/components/product/ProductCard'
import PromoFlyerCard from '@/app/components/product/PromoFlyerCard'
import type { CardSwatch } from '@/app/components/product/cardData'

import Navbar from '@/app/components/layout/Navbar'
import { fillGrid, useGridExtras } from '@/lib/gridFill'
import ProductFilterSidebar, { type F, DEFAULT_FILTERS, appendFilterParams, hasActiveFilters } from '@/app/components/filters/ProductFilterSidebar'
import { useTranslations } from 'next-intl'
import { canScrollNext, canScrollPrev, scrollCarousel } from '@/lib/i18n/rtlScroll'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import { RouteLoading } from '@/components/brand/NavigationLoader'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API    = `${ORIGIN}/api`

// ─── Types ────────────────────────────────────────────────────────────────────
interface PImg { id: number; image_path: string; is_primary: boolean; url?: string; color_option_id?: number | null }

interface ColorSwatch { id: number; value: string; color_hex: string | null }

// ── NEW: promotion shape returned by the listing API ─────────────────────────
interface ActivePromotion {
  id: number
  type: 'flash_sale' | 'discount'
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_label: string
  ends_at: string
  flash_stock_remaining: number | null
  is_flash_sale: boolean
}

interface Product extends PricedProduct {
  id: number; name: string; slug: string
  price: string                // ← original base price (ALWAYS present)
  stock: number
  short_description?: string
  primary_image?: PImg | null; primary_image_url?: string | null
  images?: PImg[]
  seller?: { id: number; name: string }
  // ── REMOVED: original_price — was never filled by listing API ────────────
  is_new?: boolean; is_bestseller?: boolean
  color_swatches?: ColorSwatch[]
  variants?: { id: number; stock: number }[]
  sponsored_priority?: number
  // ── NEW: promotion overlay fields — sent by backend since PROMO FIX ──────
  effective_price?: number | null   // discounted price; equals price when no promo
  original_price?: number | null    // crossed-out price (30-day lowest) when discounted
  discount_amount?: number | null   // absolute savings amount
  promotion?: ActivePromotion | null
  card_images?: string[]
  card_swatches?: CardSwatch[]
  variant_images?: string[]
  avg_rating?: number | null
  reviews_count?: number
}

interface Category { id: number; name: string; slug: string; icon: string | null; description?: string | null }
interface Paginated { data: Product[]; current_page: number; last_page: number; total: number }
type View = 'grid' | 'list'

// ─── Product card — the shared storefront card (image slider, swatches) ──────
function Card({ p, idx, list = false }: { p: Product; idx: number; list?: boolean }) {
  const t = useTranslations('category')
  const badge = p.is_new || p.is_bestseller ? (
    <>
      {p.is_new        && <span className="pc-badge pc-badge--new">{t('badgeNew')}</span>}
      {p.is_bestseller && <span className="pc-badge pc-badge--top">{t('badgeTop')}</span>}
    </>
  ) : undefined
  return <ProductCard product={p} index={idx} section="category" eager={idx < 4} badge={badge} layout={list ? 'row' : 'default'} />
}

const Skel = () => <ProductCardSkeleton />

// ─── Category bar — UNCHANGED ─────────────────────────────────────────────────
function CatBar({ cats, active, view, setView, mOpen, setMOpen, fCount, shown, total }: {
  cats: Category[]; active: string; view: View; setView:(v:View)=>void
  mOpen:boolean; setMOpen:(v:boolean)=>void; fCount:number; shown:number; total:number
}) {
  const t=useTranslations('category')
  const tc=useTranslations('common')
  const ref=useRef<HTMLDivElement>(null)
  const [cl,setCl]=useState(false); const [cr,setCr]=useState(false)
  const [drag,setDrag]=useState(false); const dx=useRef(0); const ds=useRef(0)
  const check=useCallback(()=>{ const el=ref.current; if(!el) return; setCl(canScrollPrev(el,6)); setCr(canScrollNext(el,6)) },[])
  useEffect(()=>{ const el=ref.current; if(!el) return; check(); el.addEventListener('scroll',check,{passive:true}); const ro=new ResizeObserver(check); ro.observe(el); return()=>{ el.removeEventListener('scroll',check); ro.disconnect() } },[cats,check])
  useEffect(()=>{ const el=ref.current; if(!el||!active) return; const nd=el.querySelector(`[data-slug="${active}"]`) as HTMLElement|null; if(nd){ const cr2=el.getBoundingClientRect(); const nr=nd.getBoundingClientRect(); el.scrollBy({left:nr.left-cr2.left-cr2.width/2+nr.width/2,behavior:'smooth'}) } },[active,cats])
  const sb=(d:'prev'|'next')=>{ if(ref.current) scrollCarousel(ref.current,d,240) }
  return (
    <div className="catbar">
      <div className="catbar-w">
        <button className={`catbar-arr${cl?' show':''}`} onClick={()=>sb('prev')} aria-label={tc('scrollPrev')}><svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div className={`catbar-fade catbar-fl${cl?' show':''}`}/>
        <div ref={ref} className="catbar-list" style={{cursor:drag?'grabbing':'grab'}}
          onMouseDown={e=>{setDrag(true);dx.current=e.clientX;ds.current=ref.current?.scrollLeft??0}}
          onMouseMove={e=>{if(!drag||!ref.current)return;ref.current.scrollLeft=ds.current-(e.clientX-dx.current)}}
          onMouseUp={()=>setDrag(false)} onMouseLeave={()=>setDrag(false)}>
          {cats.map(c=>(
            <Link key={c.id} href={`/category/${c.slug}`} data-slug={c.slug}
              className={`catbar-chip${c.slug===active?' on':''}`} draggable={false}>{c.name}</Link>
          ))}
        </div>
        <div className={`catbar-fade catbar-fr${cr?' show':''}`}/>
        <button className={`catbar-arr${cr?' show':''}`} onClick={()=>sb('next')} aria-label={tc('scrollNext')}><svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
        <div className="catbar-ctrl">
          <button className="catbar-fb" onClick={()=>setMOpen(!mOpen)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            {t('filters')}{fCount>0&&<span className="catbar-fbdg">{fCount}</span>}
          </button>
          {total>0&&<span className="catbar-cnt">{shown}/{total}</span>}
          <button className={`catbar-vb${view==='grid'?' on':''}`} onClick={()=>setView('grid')} aria-label={t('gridView')} aria-pressed={view==='grid'}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`catbar-vb${view==='list'?' on':''}`} onClick={()=>setView('list')} aria-label={t('listView')} aria-pressed={view==='list'}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagination — UNCHANGED ───────────────────────────────────────────────────
function Pages({ cur, total, go }: { cur:number; total:number; go:(p:number)=>void }) {
  const t=useTranslations('common')
  if (total<=1) return null
  const ps=Array.from({length:total},(_,i)=>i+1).filter(p=>p===1||p===total||Math.abs(p-cur)<=1)
    .reduce<(number|'…')[]>((acc,p,i,arr)=>{if(i>0&&(p as number)-(arr[i-1] as number)>1)acc.push('…');acc.push(p);return acc},[])
  return (
    <div className="pages">
      <button className="pgb" onClick={()=>go(Math.max(1,cur-1))} disabled={cur===1} aria-label={t('previous')}><svg className="rtl-flip" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      {ps.map((p,i)=>p==='…'?<span key={`e${i}`} className="pg-sep">…</span>:<button key={p} className={`pgb${cur===p?' on':''}`} onClick={()=>go(p as number)}>{p}</button>)}
      <button className="pgb" onClick={()=>go(Math.min(total,cur+1))} disabled={cur===total} aria-label={t('next')}><svg className="rtl-flip" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE INNER
// ══════════════════════════════════════════════════════════════════════════════
function Inner() {
  const t       = useTranslations('category')
  const tMega   = useTranslations('mega')
  const tf      = useTranslations('filters')
  const params  = useParams()
  const sp      = useSearchParams()
  const slug    = params?.slug as string
  const subSlug = sp.get('sub') ?? ''

  const [allC, setAllC]  = useState<Category[]>([])
  const [prods,setProds] = useState<Paginated|null>(null)
  const [load, setLoad]  = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(load)
  const [page, setPage]  = useState(1)
  const [view, setView]  = useState<View>('grid')
  const [mOpen,setMOpen] = useState(false)
  const [f, setF] = useState<F>(DEFAULT_FILTERS)

  useEffect(() => {
    const measure = () => {
      const navbar =
        document.querySelector<HTMLElement>('header') ??
        document.querySelector<HTMLElement>('nav:not(.catbar):not(.catbar *)') ??
        document.querySelector<HTMLElement>('[class*="navbar"],[class*="Navbar"],[class*="nav-bar"]')
      const h = navbar ? navbar.getBoundingClientRect().height : 0
      document.documentElement.style.setProperty('--nav-h', `${Math.round(h)}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 400)
    return () => { window.removeEventListener('resize', measure); clearTimeout(t) }
  }, [])

  useEffect(()=>{
    fetch(`${API}/categories`,{headers:{Accept:'application/json'}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(j=>setAllC((Array.isArray(j)?j:(j.data??[])).filter((c:Category)=>c.slug!=='other')))
      .catch(()=>{})
  },[])

  // Every server-side filter: a change refetches and goes back to page 1
  const filterKey=JSON.stringify([f.pMin,f.pMax,f.inStock,f.isPack,f.occasions,f.attrs])

  const fetchP=useCallback(async()=>{
    if(!slug) return; setLoad(true)
    try {
      const qp=new URLSearchParams()
      qp.set('page',String(page)); qp.set('sort',f.sort); qp.set('category_slug',slug)
      if(subSlug) qp.set('subcategory_slug',subSlug)
      appendFilterParams(qp,f)
      const r=await fetch(`${API}/products?${qp}`,{headers:{Accept:'application/json'}})
      if(!r.ok) throw new Error()
      setProds((await r.json()).data)
    } catch { setProds(null) } finally { setLoad(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey covers f's server-side filters
  },[slug,subSlug,f.sort,filterKey,page])

  useEffect(()=>{ fetchP() },[fetchP])
  useEffect(()=>{ setPage(1) },[f.sort,filterKey,subSlug])

  const displayed=useMemo(()=>{
    if(!prods?.data) return []
    if(!f.q) return prods.data
    const q=f.q.toLowerCase(); return prods.data.filter(p=>p.name.toLowerCase().includes(q))
  },[prods,f.q])

  const subLabel=tMega.has(`items.${subSlug}`)?tMega(`items.${subSlug}`):subSlug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
  const fCount=[f.q!=='',f.inStock,f.isPack,f.occasions.length>0,f.pMin!==''||f.pMax!=='',subSlug!=='',Object.values(f.attrs).some(v=>v.length)].filter(Boolean).length
  const filtered=hasActiveFilters(f)||f.q!==''

  // Sponsored products (category_top, this category) and promo flyers between the organic
  // cards; organic order and the chosen sort are untouched. Not on a filtered list: a paid
  // card must never look like it matches a price / stock / attribute filter it doesn't.
  const pageIds=useMemo(()=>(prods?.data??[]).map(p=>p.id),[prods])
  const extras=useGridExtras({ placement:'category_top', categorySlug:slug, ids:pageIds, enabled:!load&&pageIds.length>0&&!filtered })
  const cells=useMemo(()=>fillGrid(displayed,extras,{ adEvery:extras.adEvery, flyerEvery:view==='grid'?extras.flyerEvery:0 }).cells,[displayed,extras,view])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        @keyframes shFadeUp {from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}
        @keyframes shFadeIn {from{opacity:0}to{opacity:1}}
        @keyframes shShimmer{0%{background-position:-700px 0}100%{background-position:700px 0}}
        @keyframes shSpin   {to{transform:rotate(360deg)}}
        @keyframes shSlideL {from{transform:translateX(0%)}to{transform:translateX(-100%)}}
        @keyframes shSlideR {from{transform:translateX(100%)}to{transform:translateX(0%)}}
        @keyframes shSlideLRtl {from{transform:translateX(0%)}to{transform:translateX(100%)}}
        @keyframes shSlideRRtl {from{transform:translateX(-100%)}to{transform:translateX(0%)}}
        @keyframes shSlideIn{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes shPop    {0%{transform:scale(1)}50%{transform:scale(1.22)}100%{transform:scale(1)}}
        @keyframes shcPulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

        .shpage{min-height:100vh;background:#f6f6f7;font-family:'Outfit',sans-serif;color:#111}

        .catbar{background:#fff;border-bottom:1px solid #eee;position:sticky;top:var(--nav-h,0px);z-index:40;box-shadow:0 2px 12px rgba(0,0,0,.04);transition:top .15s ease}
        .catbar-w{max-width:1520px;margin:0 auto;padding:0 6px;display:flex;align-items:stretch;position:relative}
        .catbar-arr{position:relative;display:flex;align-items:center;justify-content:center;width:24px;min-height:48px;flex-shrink:0;background:transparent;border:none;cursor:pointer;color:#ccc;opacity:0;pointer-events:none;transition:opacity .2s,color .14s}
        .catbar-arr.show{opacity:1;pointer-events:auto}.catbar-arr:hover{color:#db142e}
        .catbar-fade{position:absolute;top:0;bottom:0;width:40px;pointer-events:none;z-index:2;opacity:0;transition:opacity .2s}
        .catbar-fl{inset-inline-start:30px;background:linear-gradient(to right,#fff,transparent)}.catbar-fr{inset-inline-end:30px;background:linear-gradient(to left,#fff,transparent)}
        [dir=rtl] .catbar-fl{background:linear-gradient(to left,#fff,transparent)}[dir=rtl] .catbar-fr{background:linear-gradient(to right,#fff,transparent)}
        .catbar-fade.show{opacity:1}
        .catbar-list{display:flex;align-items:center;gap:2px;flex:1;overflow-x:auto;scrollbar-width:none;padding:5px 2px;user-select:none}
        .catbar-list::-webkit-scrollbar{display:none}
        .catbar-chip{display:flex;align-items:center;padding:6px 13px;border-radius:7px;border:1.5px solid transparent;background:transparent;font-size:12.5px;font-weight:600;color:#555;text-decoration:none;white-space:nowrap;flex-shrink:0;font-family:'Outfit',sans-serif;transition:all .15s;cursor:pointer}
        .catbar-chip:hover{background:#f8f8f8;border-color:#eee;color:#111;transform:translateY(-1px)}
        .catbar-chip.on{background:#db142e;color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(219,20,46,.24);transform:translateY(-1px)}
        .catbar-ctrl{display:flex;align-items:center;gap:6px;flex-shrink:0;border-inline-start:1px solid #f0f0f0;padding-block:5px;padding-inline:11px 6px;margin-inline-start:3px}
        .catbar-fb{display:none;align-items:center;gap:6px;padding:6px 11px;background:#fff;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:700;color:#374151;cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;transition:all .13s}
        .catbar-fb:hover{border-color:#db142e;color:#db142e}
        .catbar-fbdg{background:#db142e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px}
        .catbar-cnt{font-size:11px;color:#bbb;font-weight:500;white-space:nowrap}
        .catbar-vb{width:29px;height:29px;border-radius:6px;border:1.5px solid #e5e7eb;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#bbb;transition:all .13s}
        .catbar-vb:hover,.catbar-vb.on{border-color:#db142e;color:#db142e}.catbar-vb.on{background:rgba(219,20,46,.06)}

        .shlayout{max-width:1520px;margin:0 auto;padding:18px 32px 50px;display:grid;grid-template-columns:246px minmax(0,1fr);gap:18px;align-items:start;--pfs-offset:48px}
        .sbar-desk{display:block}

        .sbar{background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden;position:sticky;top:calc(var(--nav-h,0px) + 56px + 8px);max-height:calc(100vh - var(--nav-h,0px) - 56px - 16px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#f0f0f0 transparent}
        .sbar-hd{display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;border-bottom:1px solid #f5f5f5;position:sticky;top:0;background:#fff;z-index:2}
        .sbar-title{font-size:13px;font-weight:800;color:#111;margin-bottom:2px}
        .sbar-count{font-size:10px;color:#bbb;font-weight:500}
        .sbar-clear{background:rgba(219,20,46,.08);border:none;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;color:#db142e;cursor:pointer;font-family:'Outfit',sans-serif;transition:background .12s}
        .sbar-clear:hover{background:rgba(219,20,46,.15)}
        .sbar-blk{padding:8px 15px 3px}
        .sbar-search{display:flex;align-items:center;gap:7px;background:#f8f8f8;border:1.5px solid #eee;border-radius:8px;padding:6px 10px;transition:border-color .13s}
        .sbar-search:focus-within{border-color:#db142e}
        .sbar-search input{flex:1;border:none;background:transparent;font-size:12px;font-family:'Outfit',sans-serif;color:#111;outline:none}
        .sbar-search input::placeholder{color:#ccc}
        .sb-acc{border-bottom:1px solid #f5f5f5}
        .sb-head{width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#444;transition:color .12s}
        .sb-head:hover{color:#db142e}
        .sb-body{padding:3px 15px 10px}
        .sbar-sort{display:flex;align-items:center;gap:7px;width:100%;padding:7px 7px;border-radius:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12.5px;font-weight:500;color:#555;text-align:left;transition:all .11s}
        .sbar-sort:hover{background:#f8f8f8;color:#db142e}
        .sbar-sort.on{background:rgba(219,20,46,.05);color:#db142e;font-weight:700}
        .sbar-dot{width:5px;height:5px;border-radius:50%;border:1.5px solid currentColor;flex-shrink:0;transition:background .11s}
        .sbar-sort.on .sbar-dot{background:#db142e}
        .sbar-pr-row{display:flex;align-items:center;gap:5px;margin-bottom:8px}
        .sbar-pin{flex:1;min-width:0;padding:6px 8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-family:'Outfit',sans-serif;color:#111;background:#f8f8f8;outline:none;-moz-appearance:textfield;transition:border-color .12s}
        .sbar-pin::-webkit-outer-spin-button,.sbar-pin::-webkit-inner-spin-button{-webkit-appearance:none}
        .sbar-pin:focus{border-color:#db142e;background:#fff}.sbar-pin::placeholder{color:#ccc}
        .sbar-pr{display:flex;align-items:center;gap:7px;width:100%;padding:7px 7px;border-radius:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#555;text-align:left;transition:all .11s}
        .sbar-pr::before{content:'';display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid #d1d5db;flex-shrink:0;background:#fff;transition:all .11s}
        .sbar-pr:hover{background:#f8f8f8;color:#db142e}.sbar-pr:hover::before{border-color:#db142e}
        .sbar-pr.on{color:#db142e;font-weight:700}.sbar-pr.on::before{background:#db142e;border-color:#db142e;box-shadow:inset 0 0 0 3px #fff}
        .sbar-trow{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer}
        .sbar-tgl{width:35px;height:19px;border-radius:999px;background:#e5e7eb;position:relative;cursor:pointer;flex-shrink:0;transition:background .19s}
        .sbar-tgl.on{background:#db142e}
        .sbar-tgl-k{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.14);transition:transform .19s}
        .sbar-tgl.on .sbar-tgl-k{transform:translateX(16px)}
        .sbar-badge{display:inline-flex;align-items:center;justify-content:center;background:#db142e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:14px;height:14px;margin-left:5px;padding:0 3px}
        .sbar-sw-row{display:flex;flex-wrap:wrap;gap:7px;padding:4px 0}
        .sbar-sw{width:24px;height:24px;border-radius:50%;background:var(--c,#ccc);border:2px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform .11s,border-color .11s,box-shadow .11s}
        .sbar-sw:hover{transform:scale(1.1)}.sbar-sw.on{border-color:#db142e;transform:scale(1.15);box-shadow:0 0 0 3px rgba(219,20,46,.17)}
        .sbar-checks{display:flex;flex-direction:column;gap:2px}
        .sbar-chk{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;color:#374151;transition:background .1s}
        .sbar-chk:hover{background:#f8f8f8}.sbar-chk.on{color:#db142e;font-weight:700}
        .sbar-cb{width:13px;height:13px;border-radius:4px;border:1.5px solid #d1d5db;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .11s}
        .sbar-cb.on{background:#db142e;border-color:#db142e}
        .sbar-pills{display:flex;flex-wrap:wrap;gap:5px;padding:2px 0}
        .sbar-pill{padding:4px 10px;border-radius:999px;border:1.5px solid #e5e7eb;background:#fff;font-size:11px;font-weight:600;color:#555;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .11s}
        .sbar-pill:hover{border-color:#db142e;color:#db142e}.sbar-pill.on{background:#db142e;border-color:#db142e;color:#fff}
        .sbar-apply{display:none;width:calc(100% - 30px);margin:11px 15px 15px;padding:10px;background:#db142e;color:#fff;font-weight:800;font-size:12.5px;border:none;border-radius:9px;cursor:pointer;font-family:'Outfit',sans-serif;align-items:center;justify-content:center}
        .sbar-bd{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:200;animation:shFadeIn .17s ease;backdrop-filter:blur(2px)}
        .sbar-drawer{position:fixed;left:0;top:0;bottom:0;z-index:201;width:282px;max-width:90vw;overflow-y:auto;background:#fff;box-shadow:4px 0 24px rgba(0,0,0,.12);animation:shSlideIn .22s ease}
        .sbar-drawer .sbar{border-radius:0;position:static;box-shadow:none;border:none;max-height:none}
        .sbar-drawer .sbar-apply{display:flex}

        .shlist{display:flex;flex-direction:column;gap:10px}
        .shgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}
        .pages{display:flex;align-items:center;justify-content:center;gap:5px;padding:24px 0 0;flex-wrap:wrap}
        .pgb{width:34px;height:34px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;color:#555;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .13s}
        .pgb:hover:not(:disabled){border-color:#db142e;color:#db142e}.pgb:disabled{opacity:.35;cursor:not-allowed}
        .pgb.on{background:#db142e;border-color:#db142e;color:#fff}
        .pg-sep{color:#bbb;font-size:13px;padding:0 3px}
        .shempty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:62px 24px;background:#fff;border-radius:12px;border:1px solid #eee;text-align:center;gap:9px}
        .shempty-ico{font-size:3rem}
        .shempty-ttl{font-size:16px;font-weight:800;color:#374151}
        .shempty-sub{font-size:12px;color:#bbb;max-width:270px;line-height:1.6}
        .shempty-cta{margin-top:5px;display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#db142e;color:#fff;font-weight:800;font-size:12px;border-radius:8px;text-decoration:none;transition:background .13s}
        .shempty-cta:hover{background:#b91c1c}
        @media(max-width:1260px){.shgrid{grid-template-columns:repeat(3,minmax(0,1fr))}.shlayout{grid-template-columns:220px minmax(0,1fr)}}
        @media(max-width:920px){
          .shlayout{grid-template-columns:1fr;padding:13px 15px 38px}
          .sbar-desk{display:none}.catbar-fb{display:flex}
          .shgrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        }
        @media(max-width:560px){
          .shgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          .shlayout{padding:10px 10px 30px}
        }
      `}</style>

      <div className="shpage">
        <CatBar cats={allC} active={slug} view={view} setView={setView} mOpen={mOpen} setMOpen={setMOpen} fCount={fCount} shown={displayed.length} total={prods?.total??0}/>

        <div className="shlayout">
          <ProductFilterSidebar f={f} setF={setF} total={prods?.total??0} catSlug={slug} subSlug={subSlug}
            searchPlaceholder={t('searchInCategory')} mOpen={mOpen} setMOpen={setMOpen}/>

          <div>
            {load && <div className="shgrid">{Array.from({length:12}).map((_,i)=><Skel key={i}/>)}</div>}
            {!load&&displayed.length===0&&(
              <div className="shempty">
                <span className="shempty-ico">🛍️</span>
                <p className="shempty-ttl">{filtered?t('emptyFiltered'):subSlug?t('emptySub',{name:subLabel}):t('empty')}</p>
                <p className="shempty-sub">{t('emptyHint')}</p>
                {filtered
                  ?<button type="button" className="shempty-cta" onClick={()=>setF({...DEFAULT_FILTERS,sort:f.sort})}>{tf('clearFilters')}</button>
                  :<Link href="/shop" className="shempty-cta">{t('browseAll')}<svg className="rtl-flip" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>}
              </div>
            )}
            {!load&&displayed.length>0&&(
              <>
                <div className={view==='grid'?'shgrid':'shlist'}>
                  {cells.map((c,i)=>c.kind==='flyer'
                    ?<PromoFlyerCard key={`f-${c.flyer.id}`} flyer={c.flyer} index={i} section="category"/>
                    :c.kind==='ad'
                      ?<ProductCard key={`ad-${c.ad.id}`} product={c.ad} index={i} section="category" layout={view==='list'?'row':'default'}/>
                      :<Card key={c.item.id} p={c.item} idx={i} list={view==='list'}/>)}
                </div>
                {prods&&<Pages cur={page} total={prods.last_page} go={n=>{setPage(n);window.scrollTo({top:0,behavior:'smooth'})}}/>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function CategoryPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<RouteLoading minHeight="80vh" />}>
        <Inner />
      </Suspense>
    </>
  )
}