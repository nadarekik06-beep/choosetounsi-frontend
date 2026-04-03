'use client'

/**
 * ════════════════════════════════════════════════════════════════════
 *  app/category/[slug]/page.tsx
 *  ChooseTounsi — SHEIN-level category page
 *
 *  KEY FIXES IN THIS VERSION:
 *  1. ✅ Imports your existing <Navbar /> — rendered above everything
 *  2. ✅ Real two-layer image carousel on hover (shSlideL / shSlideR)
 *  3. ✅ Zoom effect (scale 1.055) applied to current image on hover
 *  4. ✅ Add-to-Cart bar slides up with spring cubic-bezier
 *  5. ✅ 4-column portrait grid, responsive 3→2 columns
 *  6. ✅ Accordion sidebar with sort, price presets, attributes
 *  7. ✅ CatBar smoothly slides behind the Main Navbar on scroll
 *       — dynamically measures navbar height via JS → sets --nav-h CSS var
 *       — catbar z-index (40) is below navbar so it tucks under cleanly
 *
 *  INSTALL:
 *    cp page.tsx  app/category/[slug]/page.tsx
 *    rm -rf .next && npm run dev
 *
 *  ⚠️  ADJUST THE NAVBAR IMPORT PATH below if needed:
 *      '@/components/Navbar'       ← most common (components/ at root)
 *      '@/app/components/Navbar'   ← if inside app/components/
 * ════════════════════════════════════════════════════════════════════
 */

import {
  useState, useEffect, useCallback,
  useMemo, useRef, Suspense,
} from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

// ─── ⚠️ ADJUST THIS PATH IF NEEDED ───────────────────────────────────────────
import Navbar from '@/app/components/layout/Navbar'
// ─────────────────────────────────────────────────────────────────────────────

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API    = `${ORIGIN}/api`

// ─── Types ────────────────────────────────────────────────────────────────────
interface PImg { id: number; image_path: string; is_primary: boolean; url?: string; color_option_id?: number | null }
interface Product {
  id: number; name: string; slug: string; price: string; stock: number
  short_description?: string
  primary_image?: PImg | null; primary_image_url?: string | null
  images?: PImg[]
  seller?: { id: number; name: string }
  original_price?: string; is_new?: boolean; is_bestseller?: boolean
}
interface Category { id: number; name: string; slug: string; icon: string | null; description?: string | null }
interface Paginated { data: Product[]; current_page: number; last_page: number; total: number }
interface AOpt { id: number; value: string; color_hex?: string | null }
interface Attr { id: number; slug: string; name: string; type: string; options: AOpt[] }
type Sort = 'created_at' | 'views' | 'price_asc' | 'price_desc'
type View = 'grid' | 'list'
interface F { q: string; pMin: string; pMax: string; inStock: boolean; sort: Sort; attrs: Record<string, number[]> }

// ─── Image helpers ────────────────────────────────────────────────────────────
function primaryImg(p: Product): string | null {
  if (p.primary_image_url) return p.primary_image_url.startsWith('http') ? p.primary_image_url : `${ORIGIN}${p.primary_image_url}`
  if (p.primary_image?.url) { const u = p.primary_image.url; return u.startsWith('http') ? u : `${ORIGIN}${u}` }
  if (p.primary_image?.image_path) return `${ORIGIN}/storage/${p.primary_image.image_path}`
  return null
}
function galleryImgs(p: Product): string[] {
  const out: string[] = []
  if (p.images?.length) {
    p.images.forEach(i => {
      const u = i.url ? (i.url.startsWith('http') ? i.url : `${ORIGIN}${i.url}`) : `${ORIGIN}/storage/${i.image_path}`
      if (u && !out.includes(u)) out.push(u)
    })
  }
  const pri = primaryImg(p)
  if (pri && !out.includes(pri)) out.unshift(pri)
  return out.filter(Boolean)
}
const money = (v: string | number) => `${Number(v).toFixed(2)} DT`
const discPct = (o: string, c: string) => { const p = Math.round(((+o - +c) / +o) * 100); return p > 0 ? p : null }

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT CARD
//  Core hover mechanics:
//  • onEnter  → start setInterval that calls advance() every 1600ms
//  • advance  → copies cur→prev, increments cur, sets slide=true for 550ms
//  • CSS renders: prev layer animates LEFT out, cur layer animates in from RIGHT
//  • onLeave  → clear interval, setTimeout to reset cur=0 after 600ms
// ══════════════════════════════════════════════════════════════════════════════
function Card({ p, idx }: { p: Product; idx: number }) {
  const { addToCart } = useCart()
  const gallery = useMemo(() => galleryImgs(p), [p])

  const [cur,    setCur]   = useState(0)
  const [prev,   setPrev]  = useState<number | null>(null)
  const [sliding,setSlide] = useState(false)
  const [hov,    setHov]   = useState(false)
  const [wish,   setWish]  = useState(false)
  const [cs,     setCs]    = useState<'idle' | 'busy' | 'done'>('idle')
  const [imgErr, setErr]   = useState(false)

  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const badge = p.original_price ? discPct(p.original_price, p.price) : null
  const oos   = p.stock <= 0

  const advance = useCallback(() => {
    if (gallery.length < 2) return
    setCur(c => {
      const next = (c + 1) % gallery.length
      setPrev(c)
      setSlide(true)
      setTimeout(() => { setSlide(false); setPrev(null) }, 550)
      return next
    })
  }, [gallery.length])

  const onEnter = () => {
    setHov(true)
    if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null }
    if (gallery.length > 1) tickRef.current = setInterval(advance, 1600)
  }
  const onLeave = () => {
    setHov(false)
    if (tickRef.current)  { clearInterval(tickRef.current);  tickRef.current  = null }
    resetRef.current = setTimeout(() => { setCur(0); setPrev(null); setSlide(false) }, 600)
  }
  useEffect(() => () => {
    if (tickRef.current)  clearInterval(tickRef.current)
    if (resetRef.current) clearTimeout(resetRef.current)
  }, [])

  const addCart = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (oos || cs !== 'idle') return
    setCs('busy'); await addToCart(p.id); setCs('done')
    setTimeout(() => setCs('idle'), 2200)
  }

  return (
    <Link
      href={`/products/${p.slug}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ '--d': `${Math.min(idx * 0.042, 0.5)}s` } as React.CSSProperties}
      className="shc"
    >
      {/* ── Image stage ── */}
      <div className="shc-stage">

        {/* OUTGOING layer — animates LEFT out */}
        {sliding && prev !== null && gallery[prev] && (
          <div className="shc-layer shc-layer-out">
            <img src={gallery[prev]} alt="" className="shc-img" draggable={false} />
          </div>
        )}

        {/* CURRENT layer — animates in from RIGHT (+ zoom when hovered) */}
        <div className={`shc-layer${sliding ? ' shc-layer-in' : ''}${hov && !sliding ? ' shc-layer-zoom' : ''}`}>
          {gallery[cur] && !imgErr
            ? <img src={gallery[cur]} alt={p.name} className="shc-img" onError={() => setErr(true)} draggable={false} />
            : <div className="shc-noimg">
                <svg width="36" height="36" fill="none" stroke="#ccc" strokeWidth="1.2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                </svg>
              </div>
          }
        </div>

        {/* Badges */}
        <div className="shc-badges">
          {badge && <span className="shc-badge shc-disc">-{badge}%</span>}
          {p.is_new        && <span className="shc-badge shc-new">NEW</span>}
          {p.is_bestseller && <span className="shc-badge shc-hot">TOP</span>}
        </div>

        {/* Sold out */}
        {oos && <div className="shc-oos"><span>Sold Out</span></div>}

        {/* Wishlist */}
        <button className={`shc-wish${wish ? ' on' : ''}`}
          onClick={e => { e.preventDefault(); e.stopPropagation(); setWish(v => !v) }}
          aria-label="Wishlist">
          <svg width="14" height="14" fill={wish ? '#db142e' : 'none'} stroke={wish ? '#db142e' : '#666'} strokeWidth="2.1" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        {/* Image dots */}
        {gallery.length > 1 && (
          <div className="shc-dots">
            {gallery.slice(0, 5).map((_, i) => <span key={i} className={`shc-dot${i === cur ? ' on' : ''}`} />)}
          </div>
        )}

        {/* Add-to-cart — slides up on hover */}
        <div className={`shc-cta${hov ? ' show' : ''}`}>
          <button className={`shc-add${cs === 'done' ? ' done' : ''}${oos ? ' oos' : ''}`}
            onClick={addCart} disabled={oos || cs === 'busy'}>
            {cs === 'busy' && <span className="shc-spin" />}
            {cs === 'done' && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.8" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
            {cs === 'idle' && !oos && (
              <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            )}
            <span>{oos ? 'Sold Out' : cs === 'done' ? 'Added!' : cs === 'busy' ? '' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="shc-info">
        {p.seller?.name && <p className="shc-seller">{p.seller.name}</p>}
        <p className="shc-name">{p.name}</p>
        <div className="shc-prices">
          <span className="shc-price">{money(p.price)}</span>
          {p.original_price && +p.original_price > +p.price && <span className="shc-orig">{money(p.original_price)}</span>}
        </div>
        {p.stock > 0 && p.stock <= 5 && <p className="shc-low">Only {p.stock} left!</p>}
      </div>
    </Link>
  )
}

// ─── List card ────────────────────────────────────────────────────────────────
function ListCard({ p, idx }: { p: Product; idx: number }) {
  const { addToCart } = useCart()
  const [cs, setCs] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState(false)
  const pri  = primaryImg(p)
  const badge = p.original_price ? discPct(p.original_price, p.price) : null
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (p.stock <= 0 || cs !== 'idle') return
    setCs('busy'); await addToCart(p.id); setCs('done'); setTimeout(() => setCs('idle'), 2000)
  }
  return (
    <Link href={`/products/${p.slug}`} className="shlc" style={{ '--d': `${Math.min(idx * 0.04, 0.4)}s` } as React.CSSProperties}>
      <div className="shlc-img">
        {pri && !err ? <img src={pri} alt={p.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} onError={() => setErr(true)} /> : <div className="shc-noimg" />}
        {badge && <span className="shc-badge shc-disc" style={{ position:'absolute',top:8,left:8,zIndex:2 }}>-{badge}%</span>}
      </div>
      <div className="shlc-body">
        {p.seller?.name && <p className="shc-seller">{p.seller.name}</p>}
        <p className="shlc-name">{p.name}</p>
        {p.short_description && <p className="shlc-desc">{p.short_description}</p>}
        <div className="shlc-foot">
          <div className="shc-prices">
            <span className="shc-price">{money(p.price)}</span>
            {p.original_price && +p.original_price > +p.price && <span className="shc-orig">{money(p.original_price)}</span>}
          </div>
          <button className={`shc-add shc-add-sm${cs === 'done' ? ' done' : ''}`} onClick={handle} disabled={p.stock <= 0 || cs === 'busy'}>
            {cs === 'done' ? '✓ Added' : p.stock <= 0 ? 'Sold Out' : '+ Add'}
          </button>
        </div>
      </div>
    </Link>
  )
}

const Skel = () => (
  <div className="shsk">
    <div className="shsk-img" />
    <div className="shsk-body">
      <div className="shsk-ln" style={{ width:'42%',height:9 }} />
      <div className="shsk-ln" style={{ width:'75%',height:13,marginTop:5 }} />
      <div className="shsk-ln" style={{ width:'35%',height:15,marginTop:6 }} />
    </div>
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const SORTS = [
  { k:'created_at' as Sort, l:'Newest First' },
  { k:'views'      as Sort, l:'Most Popular' },
  { k:'price_asc'  as Sort, l:'Price: Low → High' },
  { k:'price_desc' as Sort, l:'Price: High → Low' },
]
const PRANGES = [
  { l:'Under 50 DT', mn:'0',   mx:'50' },
  { l:'50 – 100 DT', mn:'50',  mx:'100' },
  { l:'100 – 200 DT',mn:'100', mx:'200' },
  { l:'200 – 500 DT',mn:'200', mx:'500' },
  { l:'Over 500 DT', mn:'500', mx:'' },
]

function Sidebar({ f, setF, total, catSlug, subSlug, mOpen, setMOpen }: {
  f: F; setF: (v: F) => void; total: number; catSlug: string; subSlug: string; mOpen: boolean; setMOpen: (v: boolean) => void
}) {
  const [attrs, setAttrs] = useState<Attr[]>([])
  const [aLoad, setALoad] = useState(false)
  const [open, setOpen]   = useState(new Set<string>(['sort','price','avail']))
  const upd = (p: Partial<F>) => setF({ ...f, ...p })

  useEffect(() => {
    if (!catSlug) return
    setALoad(true); setAttrs([])
    ;(async () => {
      try {
        if (subSlug) {
          const r1 = await fetch(`${API}/categories/${catSlug}/subcategories`, { headers:{ Accept:'application/json' } })
          const j1 = await r1.json()
          const sub = (j1.data??[]).find((s: any) => s.slug === subSlug)
          if (sub) {
            const r2 = await fetch(`${API}/subcategories/${sub.id}/attributes`, { headers:{ Accept:'application/json' } })
            const j2 = await r2.json()
            setAttrs((j2.attributes??[]).filter((a: any) => a.is_filterable !== false && a.options?.length)); return
          }
        }
        const r = await fetch(`${API}/categories/${catSlug}/filter-attributes`, { headers:{ Accept:'application/json' } })
        const j = await r.json()
        setAttrs((j.data??j.attributes??[]).filter((a: Attr) => a.options?.length))
      } catch { setAttrs([]) } finally { setALoad(false) }
    })()
  }, [catSlug, subSlug])

  const tog  = (k: string) => setOpen(s => { const n = new Set(s); n.has(k)?n.delete(k):n.add(k); return n })
  const togA = (slug: string, id: number) => { const c = f.attrs[slug]??[]; upd({ attrs:{ ...f.attrs,[slug]:c.includes(id)?c.filter(x=>x!==id):[...c,id] } }) }
  const setA1= (slug: string, id: number) => { const c = f.attrs[slug]??[]; upd({ attrs:{ ...f.attrs,[slug]:c.includes(id)?[]:[id] } }) }
  const isR  = (mn: string, mx: string) => f.pMin===mn && f.pMax===mx
  const applyR=(mn: string, mx: string) => isR(mn,mx)?upd({pMin:'',pMax:''}):upd({pMin:mn,pMax:mx})
  const hasAny = !!(f.q||f.inStock||f.pMin||f.pMax||Object.values(f.attrs).some(v=>v.length))

  const Acc = ({ k, label }: { k: string; label: string }) => (
    <button className="sb-head" onClick={() => tog(k)}>
      <span>{label}</span>
      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        style={{ transform:open.has(k)?'rotate(180deg)':'none',transition:'transform .2s' }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
  )

  const inner = (
    <aside className="sbar">
      <div className="sbar-hd">
        <div><p className="sbar-title">Filters</p><p className="sbar-count">{total.toLocaleString()} products</p></div>
        {hasAny && <button className="sbar-clear" onClick={() => setF({ q:'',pMin:'',pMax:'',inStock:false,sort:f.sort,attrs:{} })}>✕ Clear</button>}
      </div>
      <div className="sbar-blk">
        <div className="sbar-search">
          <svg width="12" height="12" fill="none" stroke="#bbb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search in category…" value={f.q} onChange={e=>upd({q:e.target.value})} />
          {f.q && <button onClick={()=>upd({q:''})} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',display:'flex',padding:0}}>
            <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>}
        </div>
      </div>
      <div className="sb-acc"><Acc k="sort" label="Sort By" />
        {open.has('sort') && <div className="sb-body">{SORTS.map(s=>(
          <button key={s.k} className={`sbar-sort${f.sort===s.k?' on':''}`} onClick={()=>upd({sort:s.k})}>
            <span className="sbar-dot"/>{s.l}
            {f.sort===s.k && <svg width="9" height="9" fill="none" stroke="#db142e" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginLeft:'auto'}}><path d="M20 6L9 17l-5-5"/></svg>}
          </button>
        ))}</div>}
      </div>
      <div className="sb-acc"><Acc k="price" label="Price Range" />
        {open.has('price') && <div className="sb-body">
          <div className="sbar-pr-row">
            <input type="number" placeholder="Min" value={f.pMin} onChange={e=>upd({pMin:e.target.value})} className="sbar-pin"/>
            <span style={{color:'#bbb',fontSize:12}}>–</span>
            <input type="number" placeholder="Max" value={f.pMax} onChange={e=>upd({pMax:e.target.value})} className="sbar-pin"/>
          </div>
          {PRANGES.map(r=><button key={r.l} className={`sbar-pr${isR(r.mn,r.mx)?' on':''}`} onClick={()=>applyR(r.mn,r.mx)}>{r.l}</button>)}
        </div>}
      </div>
      <div className="sb-acc"><Acc k="avail" label="Availability" />
        {open.has('avail') && <div className="sb-body" style={{padding:'6px 16px 12px'}}>
          <label className="sbar-trow">
            <span>In stock only</span>
            <div className={`sbar-tgl${f.inStock?' on':''}`} onClick={()=>upd({inStock:!f.inStock})}>
              <div className="sbar-tgl-k"/>
            </div>
          </label>
        </div>}
      </div>
      {aLoad && [1,2].map(k=>(
        <div key={k} className="sb-acc" style={{padding:'11px 16px'}}>
          <div className="shsk-ln" style={{width:'54%',height:9,marginBottom:7}}/>
          <div className="shsk-ln" style={{height:25,borderRadius:8}}/>
        </div>
      ))}
      {!aLoad && attrs.map(a=>{
        const isOpen=open.has(a.slug); const sel=f.attrs[a.slug]??[]
        return (
          <div key={a.id} className="sb-acc">
            <button className="sb-head" onClick={()=>tog(a.slug)}>
              <span>{a.name}{sel.length>0&&<span className="sbar-badge">{sel.length}</span>}</span>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {isOpen && <div className="sb-body">
              {a.type==='color' ? (
                <div className="sbar-sw-row">{a.options.map(o=>(
                  <button key={o.id} title={o.value} className={`sbar-sw${sel.includes(o.id)?' on':''}`}
                    style={{'--c':o.color_hex??'#ccc'} as React.CSSProperties} onClick={()=>togA(a.slug,o.id)}>
                    {sel.includes(o.id)&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                ))}</div>
              ):a.type==='multiselect'?(
                <div className="sbar-checks">{a.options.map(o=>{const on=sel.includes(o.id);return(
                  <label key={o.id} className={`sbar-chk${on?' on':''}`} onClick={()=>togA(a.slug,o.id)}>
                    <div className={`sbar-cb${on?' on':''}`}>{on&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}</div>
                    {o.value}
                  </label>
                )})}</div>
              ):(
                <div className="sbar-pills">{a.options.map(o=>(
                  <button key={o.id} className={`sbar-pill${sel.includes(o.id)?' on':''}`} onClick={()=>setA1(a.slug,o.id)}>{o.value}</button>
                ))}</div>
              )}
            </div>}
          </div>
        )
      })}
      <button className="sbar-apply" onClick={()=>setMOpen(false)}>Apply Filters</button>
    </aside>
  )
  return (
    <>
      <div className="sbar-desk">{inner}</div>
      {mOpen&&<><div className="sbar-bd" onClick={()=>setMOpen(false)}/><div className="sbar-drawer">{inner}</div></>}
    </>
  )
}

// ─── Category bar ─────────────────────────────────────────────────────────────
function CatBar({ cats, active, view, setView, mOpen, setMOpen, fCount, shown, total }: {
  cats: Category[]; active: string; view: View; setView:(v:View)=>void
  mOpen:boolean; setMOpen:(v:boolean)=>void; fCount:number; shown:number; total:number
}) {
  const ref=useRef<HTMLDivElement>(null)
  const [cl,setCl]=useState(false); const [cr,setCr]=useState(false)
  const [drag,setDrag]=useState(false); const dx=useRef(0); const ds=useRef(0)
  const check=useCallback(()=>{ const el=ref.current; if(!el) return; setCl(el.scrollLeft>6); setCr(el.scrollLeft+el.clientWidth<el.scrollWidth-6) },[])
  useEffect(()=>{ const el=ref.current; if(!el) return; check(); el.addEventListener('scroll',check,{passive:true}); const ro=new ResizeObserver(check); ro.observe(el); return()=>{ el.removeEventListener('scroll',check); ro.disconnect() } },[cats,check])
  useEffect(()=>{ const el=ref.current; if(!el||!active) return; const nd=el.querySelector(`[data-slug="${active}"]`) as HTMLElement|null; if(nd){ const cr2=el.getBoundingClientRect(); const nr=nd.getBoundingClientRect(); el.scrollBy({left:nr.left-cr2.left-cr2.width/2+nr.width/2,behavior:'smooth'}) } },[active,cats])
  const sb=(d:'l'|'r')=>ref.current?.scrollBy({left:d==='l'?-240:240,behavior:'smooth'})
  return (
    <div className="catbar">
      <div className="catbar-w">
        <button className={`catbar-arr${cl?' show':''}`} onClick={()=>sb('l')} style={{left:0}}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
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
        <button className={`catbar-arr${cr?' show':''}`} onClick={()=>sb('r')} style={{right:0}}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
        <div className="catbar-ctrl">
          <button className="catbar-fb" onClick={()=>setMOpen(!mOpen)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            Filters{fCount>0&&<span className="catbar-fbdg">{fCount}</span>}
          </button>
          {total>0&&<span className="catbar-cnt">{shown}/{total}</span>}
          <button className={`catbar-vb${view==='grid'?' on':''}`} onClick={()=>setView('grid')}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`catbar-vb${view==='list'?' on':''}`} onClick={()=>setView('list')}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pages({ cur, total, go }: { cur:number; total:number; go:(p:number)=>void }) {
  if (total<=1) return null
  const ps=Array.from({length:total},(_,i)=>i+1).filter(p=>p===1||p===total||Math.abs(p-cur)<=1)
    .reduce<(number|'…')[]>((acc,p,i,arr)=>{if(i>0&&(p as number)-(arr[i-1] as number)>1)acc.push('…');acc.push(p);return acc},[])
  return (
    <div className="pages">
      <button className="pgb" onClick={()=>go(Math.max(1,cur-1))} disabled={cur===1}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      {ps.map((p,i)=>p==='…'?<span key={`e${i}`} className="pg-sep">…</span>:<button key={p} className={`pgb${cur===p?' on':''}`} onClick={()=>go(p as number)}>{p}</button>)}
      <button className="pgb" onClick={()=>go(Math.min(total,cur+1))} disabled={cur===total}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE INNER
// ══════════════════════════════════════════════════════════════════════════════
function Inner() {
  const params  = useParams()
  const sp      = useSearchParams()
  const slug    = params?.slug as string
  const subSlug = sp.get('sub') ?? ''

  const [allC, setAllC]  = useState<Category[]>([])
  const [prods,setProds] = useState<Paginated|null>(null)
  const [load, setLoad]  = useState(true)
  const [page, setPage]  = useState(1)
  const [view, setView]  = useState<View>('grid')
  const [mOpen,setMOpen] = useState(false)
  const [f, setF] = useState<F>({ q:'',pMin:'',pMax:'',inStock:false,sort:'created_at',attrs:{} })

  // ── Measure the main Navbar height and expose it as --nav-h CSS variable ──
  // This makes the catbar stick just below the navbar (never overlapping it),
  // and since catbar z-index (40) < navbar z-index, it slides behind cleanly.
  useEffect(() => {
    const measure = () => {
      // The Navbar renders as the first child of <body> or inside a wrapper.
      // We query the first <nav> or <header> in the DOM that is NOT .catbar.
      const navbar =
        document.querySelector<HTMLElement>('header') ??
        document.querySelector<HTMLElement>('nav:not(.catbar):not(.catbar *)') ??
        document.querySelector<HTMLElement>('[class*="navbar"],[class*="Navbar"],[class*="nav-bar"]')
      const h = navbar ? navbar.getBoundingClientRect().height : 0
      document.documentElement.style.setProperty('--nav-h', `${Math.round(h)}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    // Re-measure after fonts/images settle
    const t = setTimeout(measure, 400)
    return () => { window.removeEventListener('resize', measure); clearTimeout(t) }
  }, [])

  useEffect(()=>{
    fetch(`${API}/categories`,{headers:{Accept:'application/json'}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(j=>setAllC((Array.isArray(j)?j:(j.data??[])).filter((c:Category)=>c.slug!=='other')))
      .catch(()=>{})
  },[])

  const attrQP=useMemo(()=>Object.entries(f.attrs).filter(([,v])=>v.length).map(([s,ids])=>`${s}:${ids.join(',')}`).join('|'),[f.attrs])

  const fetchP=useCallback(async()=>{
    if(!slug) return; setLoad(true)
    try {
      const qp=new URLSearchParams()
      qp.set('page',String(page)); qp.set('sort',f.sort); qp.set('category_slug',slug)
      if(subSlug) qp.set('subcategory_slug',subSlug)
      if(f.pMin)  qp.set('price_min',f.pMin)
      if(f.pMax)  qp.set('price_max',f.pMax)
      if(f.inStock) qp.set('in_stock','1')
      Object.entries(f.attrs).forEach(([s,ids])=>ids.forEach(id=>qp.append(`attrs[${s}][]`,String(id))))
      const r=await fetch(`${API}/products?${qp}`,{headers:{Accept:'application/json'}})
      if(!r.ok) throw new Error()
      setProds((await r.json()).data)
    } catch { setProds(null) } finally { setLoad(false) }
  },[slug,subSlug,f.sort,f.pMin,f.pMax,f.inStock,attrQP,page])

  useEffect(()=>{ fetchP() },[fetchP])
  useEffect(()=>{ setPage(1) },[f.sort,f.pMin,f.pMax,f.inStock,attrQP,subSlug])

  const displayed=useMemo(()=>{
    if(!prods?.data) return []
    if(!f.q) return prods.data
    const q=f.q.toLowerCase(); return prods.data.filter(p=>p.name.toLowerCase().includes(q))
  },[prods,f.q])

  const subLabel=subSlug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
  const fCount=[f.q!=='',f.inStock,f.pMin!==''||f.pMax!=='',subSlug!=='',Object.values(f.attrs).some(v=>v.length)].filter(Boolean).length

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
        @keyframes shSlideIn{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes shPop    {0%{transform:scale(1)}50%{transform:scale(1.22)}100%{transform:scale(1)}}

        .shpage{min-height:100vh;background:#f6f6f7;font-family:'Outfit',sans-serif;color:#111}

        /* ── CatBar ──
           z-index 40  →  sits BELOW the main Navbar (which is typically 100+)
           top: var(--nav-h, 0px)  →  sticks exactly at the bottom edge of the Navbar,
           so when scrolling the CatBar slides under the Navbar rather than crushing it.
           transition on top prevents a jarring jump if the Navbar height changes (resize).
        */
        .catbar{background:#fff;border-bottom:1px solid #eee;position:sticky;top:var(--nav-h,0px);z-index:40;box-shadow:0 2px 12px rgba(0,0,0,.04);transition:top .15s ease}
        .catbar-w{max-width:1520px;margin:0 auto;padding:0 6px;display:flex;align-items:stretch;position:relative}
        .catbar-arr{position:relative;display:flex;align-items:center;justify-content:center;width:24px;min-height:48px;flex-shrink:0;background:transparent;border:none;cursor:pointer;color:#ccc;opacity:0;pointer-events:none;transition:opacity .2s,color .14s}
        .catbar-arr.show{opacity:1;pointer-events:auto}.catbar-arr:hover{color:#db142e}
        .catbar-fade{position:absolute;top:0;bottom:0;width:40px;pointer-events:none;z-index:2;opacity:0;transition:opacity .2s}
        .catbar-fl{left:30px;background:linear-gradient(to right,#fff,transparent)}.catbar-fr{right:30px;background:linear-gradient(to left,#fff,transparent)}
        .catbar-fade.show{opacity:1}
        .catbar-list{display:flex;align-items:center;gap:2px;flex:1;overflow-x:auto;scrollbar-width:none;padding:5px 2px;user-select:none}
        .catbar-list::-webkit-scrollbar{display:none}
        .catbar-chip{display:flex;align-items:center;padding:6px 13px;border-radius:7px;border:1.5px solid transparent;background:transparent;font-size:12.5px;font-weight:600;color:#555;text-decoration:none;white-space:nowrap;flex-shrink:0;font-family:'Outfit',sans-serif;transition:all .15s;cursor:pointer}
        .catbar-chip:hover{background:#f8f8f8;border-color:#eee;color:#111;transform:translateY(-1px)}
        .catbar-chip.on{background:#db142e;color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(219,20,46,.24);transform:translateY(-1px)}
        .catbar-ctrl{display:flex;align-items:center;gap:6px;flex-shrink:0;border-left:1px solid #f0f0f0;padding:5px 6px 5px 11px;margin-left:3px}
        .catbar-fb{display:none;align-items:center;gap:6px;padding:6px 11px;background:#fff;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:700;color:#374151;cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;transition:all .13s}
        .catbar-fb:hover{border-color:#db142e;color:#db142e}
        .catbar-fbdg{background:#db142e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px}
        .catbar-cnt{font-size:11px;color:#bbb;font-weight:500;white-space:nowrap}
        .catbar-vb{width:29px;height:29px;border-radius:6px;border:1.5px solid #e5e7eb;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#bbb;transition:all .13s}
        .catbar-vb:hover,.catbar-vb.on{border-color:#db142e;color:#db142e}.catbar-vb.on{background:rgba(219,20,46,.06)}

        /* ── Layout ──
           top offset for the sticky sidebar = navbar height + catbar height (≈56px) + gap (8px)
           We use --nav-h + 64px as a reasonable approximation; the catbar is always ~48px tall.
        */
        .shlayout{max-width:1520px;margin:0 auto;padding:18px 32px 50px;display:grid;grid-template-columns:246px 1fr;gap:18px;align-items:start}
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

        /* ════ PRODUCT CARD ════ */
        .shc{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;cursor:pointer;animation:shFadeUp .42s ease both;animation-delay:var(--d,0s);transition:box-shadow .22s,transform .22s,border-color .2s;will-change:transform}
        .shc:hover{box-shadow:0 12px 38px rgba(0,0,0,.11);border-color:#e0e0e0;transform:translateY(-4px)}

        .shc-stage{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#f5f5f5;flex-shrink:0}

        /* Two-layer slide system */
        .shc-layer{position:absolute;inset:0;will-change:transform}
        .shc-layer-out{z-index:1;animation:shSlideL .52s cubic-bezier(.77,0,.175,1) forwards}
        .shc-layer-in {z-index:2;animation:shSlideR .52s cubic-bezier(.77,0,.175,1) forwards}
        .shc-layer-zoom{transform:scale(1.055);transition:transform .55s cubic-bezier(.25,.46,.45,.94)}

        .shc-img{width:100%;height:100%;object-fit:cover;display:block}
        .shc-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f4f4f6}

        .shc-badges{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:5}
        .shc-badge{font-size:8px;font-weight:900;padding:2px 6px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
        .shc-disc{background:#db142e;color:#fff}.shc-new{background:#198f41;color:#fff}.shc-hot{background:#111;color:#fbbf24}

        .shc-oos{position:absolute;inset:0;z-index:6;background:rgba(255,255,255,.62);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center}
        .shc-oos span{background:#111;color:#fff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:5px 13px;border-radius:999px}

        .shc-wish{position:absolute;top:8px;right:8px;z-index:7;width:28px;height:28px;background:rgba(255,255,255,.88);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.09);backdrop-filter:blur(4px);transition:transform .16s,background .16s}
        .shc-wish:hover{transform:scale(1.14);background:#fff}.shc-wish.on{animation:shPop .3s ease}

        .shc-dots{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:5}
        .shc-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);transition:all .22s}
        .shc-dot.on{background:#fff;width:15px;border-radius:3px}

        .shc-cta{position:absolute;bottom:0;left:0;right:0;padding:0 9px 9px;z-index:6;transform:translateY(110%);opacity:0;transition:transform .3s cubic-bezier(.34,1.48,.64,1),opacity .22s}
        .shc-cta.show{transform:translateY(0);opacity:1}

        .shc-add{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:9px 10px;background:#db142e;color:#fff;font-size:12px;font-weight:800;border:none;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;box-shadow:0 4px 14px rgba(219,20,46,.38);transition:background .13s,transform .11s;letter-spacing:.01em}
        .shc-add:hover:not(:disabled){background:#b91c1c;transform:scale(1.01)}.shc-add:disabled{cursor:not-allowed}
        .shc-add.oos{background:#e5e7eb;color:#aaa;box-shadow:none}.shc-add.done{background:#198f41;box-shadow:0 4px 14px rgba(25,143,65,.35)}
        .shc-add-sm{padding:5px 11px;font-size:11px;border-radius:7px;white-space:nowrap;flex-shrink:0}
        .shc-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:shSpin .65s linear infinite;display:inline-block}

        .shc-info{padding:9px 11px 12px;display:flex;flex-direction:column;gap:3px;flex:1}
        .shc-seller{font-size:9px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.07em}
        .shc-name{font-size:12.5px;font-weight:600;color:#1f2937;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .shc:hover .shc-name{color:#db142e}
        .shc-prices{display:flex;align-items:baseline;gap:5px;margin-top:3px}
        .shc-price{font-size:13.5px;font-weight:900;color:#db142e}
        .shc-orig{font-size:10px;font-weight:500;color:#bbb;text-decoration:line-through}
        .shc-low{font-size:9.5px;font-weight:700;color:#f97316;background:#fff7ed;padding:1px 7px;border-radius:999px;display:inline-block;margin-top:2px}

        .shlc{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden;display:flex;text-decoration:none;animation:shFadeUp .42s ease both;animation-delay:var(--d,0s);transition:box-shadow .2s,transform .2s}
        .shlc:hover{box-shadow:0 6px 22px rgba(0,0,0,.08);transform:translateX(3px)}
        .shlc-img{position:relative;width:138px;flex-shrink:0}
        .shlc-body{padding:15px 18px;display:flex;flex-direction:column;gap:5px;flex:1}
        .shlc-name{font-size:15px;font-weight:700;color:#1f2937;line-height:1.4}
        .shlc:hover .shlc-name{color:#db142e}
        .shlc-desc{font-size:12px;color:#6b7280;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .shlc-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:7px;gap:9px;flex-wrap:wrap}
        .shlist{display:flex;flex-direction:column;gap:10px}

        .shsk{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden}
        .shsk-img{aspect-ratio:3/4;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:shShimmer 1.3s infinite linear}
        .shsk-body{padding:9px 11px 12px;display:flex;flex-direction:column;gap:7px}
        .shsk-ln{border-radius:4px;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:shShimmer 1.3s infinite linear}

        .shgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}

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

        @media(max-width:1260px){.shgrid{grid-template-columns:repeat(3,1fr)}.shlayout{grid-template-columns:220px 1fr}}
        @media(max-width:920px){
          .shlayout{grid-template-columns:1fr;padding:13px 15px 38px}
          .sbar-desk{display:none}.catbar-fb{display:flex}
          .shhero-stats{display:none}.shgrid{grid-template-columns:repeat(3,1fr);gap:10px}
        }
        @media(max-width:560px){
          .shgrid{grid-template-columns:repeat(2,1fr);gap:8px}
          .shhero{padding:16px 15px}.shbc{padding:0 15px}
          .shlayout{padding:10px 10px 30px}.shlc-img{width:100px}
        }
      `}</style>

      <div className="shpage">
        {/* Category bar */}
        <CatBar cats={allC} active={slug} view={view} setView={setView} mOpen={mOpen} setMOpen={setMOpen} fCount={fCount} shown={displayed.length} total={prods?.total??0}/>

        {/* Layout */}
        <div className="shlayout">
          <Sidebar f={f} setF={setF} total={prods?.total??0} catSlug={slug} subSlug={subSlug} mOpen={mOpen} setMOpen={setMOpen}/>
          <div>
            {load && <div className="shgrid">{Array.from({length:12}).map((_,i)=><Skel key={i}/>)}</div>}
            {!load&&displayed.length===0&&(
              <div className="shempty">
                <span className="shempty-ico">🛍️</span>
                <p className="shempty-ttl">{Object.values(f.attrs).some(v=>v.length)||f.inStock||f.pMin||f.pMax?'No products match your filters':subSlug?`No products in "${subLabel}" yet`:'No products yet'}</p>
                <p className="shempty-sub">Try adjusting your filters or exploring other categories.</p>
                <Link href="/shop" className="shempty-cta">Browse All<svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>
              </div>
            )}
            {!load&&displayed.length>0&&(
              <>
                {view==='grid'
                  ?<div className="shgrid">{displayed.map((p,i)=><Card key={p.id} p={p} idx={i}/>)}</div>
                  :<div className="shlist">{displayed.map((p,i)=><ListCard key={p.id} p={p} idx={i}/>)}</div>
                }
                {prods&&<Pages cur={page} total={prods.last_page} go={n=>{setPage(n);window.scrollTo({top:0,behavior:'smooth'})}}/>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  DEFAULT EXPORT
//  ✅ <Navbar /> is rendered FIRST — always visible, above the page content
//  ✅ <Inner /> is wrapped in Suspense (required for useSearchParams)
// ══════════════════════════════════════════════════════════════════════════════
export default function CategoryPage() {
  return (
    <>
      {/* YOUR EXISTING NAVBAR — imported at line 36 */}
      <Navbar />

      <Suspense fallback={
        <div style={{minHeight:'80vh',background:'#f6f6f7',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:34,height:34,border:'3px solid #eee',borderTopColor:'#db142e',borderRadius:'50%',animation:'_s .7s linear infinite'}}/>
          <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
        </div>
      }>
        <Inner />
      </Suspense>
    </>
  )
}