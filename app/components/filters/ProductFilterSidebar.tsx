'use client'

/**
 * app/components/filters/ProductFilterSidebar.tsx
 *
 * Extracted from the page-local `Sidebar` in app/category/[slug]/page.tsx so
 * it can be reused on other product-grid pages (e.g. the seller storefront's
 * "All Products" tab) instead of being duplicated a second time.
 *
 * This component owns sort / price range / in-stock / pack / dynamic
 * attribute filters — NOT category selection (that's handled by whatever
 * routes the consuming page to a category, same as before).
 *
 * Attribute options are fetched from the category's filter-attributes
 * endpoint, scoped to `catSlug`/`subSlug` exactly as before, plus an optional
 * `sellerId` (new backend support) so a seller storefront only shows
 * attribute values that seller actually stocks. When `catSlug` is omitted
 * (e.g. a seller page with no category context), the attribute section
 * simply stays empty — sort/price/in-stock/search still work fully.
 */

import { useState, useEffect } from 'react'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API    = `${ORIGIN}/api`

export type Sort = 'created_at' | 'views' | 'price_asc' | 'price_desc'

export interface F {
  q: string; pMin: string; pMax: string; inStock: boolean; isPack: boolean
  sort: Sort; attrs: Record<string, number[]>
}

export interface AOpt { id: number; value: string; color_hex?: string | null }
export interface Attr { id: number; slug: string; name: string; type: string; options: AOpt[] }

export const DEFAULT_FILTERS: F = { q: '', pMin: '', pMax: '', inStock: false, isPack: false, sort: 'created_at', attrs: {} }

export const SORTS: { k: Sort; l: string }[] = [
  { k: 'created_at', l: 'Newest First' },
  { k: 'views',      l: 'Most Popular' },
  { k: 'price_asc',  l: 'Price: Low → High' },
  { k: 'price_desc', l: 'Price: High → Low' },
]

export const PRANGES = [
  { l: 'Under 50 DT',  mn: '0',   mx: '50' },
  { l: '50 – 100 DT',  mn: '50',  mx: '100' },
  { l: '100 – 200 DT', mn: '100', mx: '200' },
  { l: '200 – 500 DT', mn: '200', mx: '500' },
  { l: 'Over 500 DT',  mn: '500', mx: '' },
]

interface Props {
  f: F
  setF: (v: F) => void
  total: number
  catSlug?: string
  subSlug?: string
  sellerId?: number | string
  searchPlaceholder?: string
  hideSearch?: boolean
  mOpen: boolean
  setMOpen: (v: boolean) => void
}

export default function ProductFilterSidebar({
  f, setF, total, catSlug = '', subSlug = '', sellerId, searchPlaceholder = 'Search…', hideSearch = false, mOpen, setMOpen,
}: Props) {
  const [attrs, setAttrs] = useState<Attr[]>([])
  const [aLoad, setALoad] = useState(false)
  const [open, setOpen]   = useState(new Set<string>(['sort', 'price', 'avail']))
  const upd = (p: Partial<F>) => setF({ ...f, ...p })

  useEffect(() => {
    if (!catSlug) { setAttrs([]); return }
    setALoad(true); setAttrs([])
    ;(async () => {
      try {
        if (subSlug) {
          const r1 = await fetch(`${API}/categories/${catSlug}/subcategories`, { headers: { Accept: 'application/json' } })
          const j1 = await r1.json()
          const sub = (j1.data ?? []).find((s: any) => s.slug === subSlug)
          if (sub) {
            const r2 = await fetch(`${API}/subcategories/${sub.id}/attributes`, { headers: { Accept: 'application/json' } })
            const j2 = await r2.json()
            setAttrs((j2.attributes ?? []).filter((a: any) => a.is_filterable !== false && a.options?.length))
            return
          }
        }
        const qs = sellerId ? `?seller_id=${sellerId}` : ''
        const r = await fetch(`${API}/categories/${catSlug}/filter-attributes${qs}`, { headers: { Accept: 'application/json' } })
        const j = await r.json()
        setAttrs((j.data ?? j.attributes ?? []).filter((a: Attr) => a.options?.length))
      } catch { setAttrs([]) } finally { setALoad(false) }
    })()
  }, [catSlug, subSlug, sellerId])

  const tog   = (k: string) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const togA  = (slug: string, id: number) => { const c = f.attrs[slug] ?? []; upd({ attrs: { ...f.attrs, [slug]: c.includes(id) ? c.filter(x => x !== id) : [...c, id] } }) }
  const setA1 = (slug: string, id: number) => { const c = f.attrs[slug] ?? []; upd({ attrs: { ...f.attrs, [slug]: c.includes(id) ? [] : [id] } }) }
  const isR   = (mn: string, mx: string) => f.pMin === mn && f.pMax === mx
  const applyR = (mn: string, mx: string) => isR(mn, mx) ? upd({ pMin: '', pMax: '' }) : upd({ pMin: mn, pMax: mx })
  const hasAny = !!(f.q || f.inStock || f.pMin || f.pMax || Object.values(f.attrs).some(v => v.length))

  const Acc = ({ k, label }: { k: string; label: string }) => (
    <button className="pfs-head" onClick={() => tog(k)}>
      <span>{label}</span>
      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        style={{ transform: open.has(k) ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  )

  const inner = (
    <aside className="pfs">
      <div className="pfs-hd">
        <div><p className="pfs-title">Filters</p><p className="pfs-count">{total.toLocaleString()} products</p></div>
        {hasAny && <button className="pfs-clear" onClick={() => setF({ ...DEFAULT_FILTERS, sort: f.sort })}>✕ Clear</button>}
      </div>
      {!hideSearch && (
        <div className="pfs-blk">
          <div className="pfs-search">
            <svg width="12" height="12" fill="none" stroke="#bbb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input placeholder={searchPlaceholder} value={f.q} onChange={e => upd({ q: e.target.value })} />
            {f.q && <button onClick={() => upd({ q: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex', padding: 0 }}>
              <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>}
          </div>
        </div>
      )}
      <div className="pfs-acc"><Acc k="sort" label="Sort By" />
        {open.has('sort') && <div className="pfs-body">{SORTS.map(s => (
          <button key={s.k} className={`pfs-sort${f.sort === s.k ? ' on' : ''}`} onClick={() => upd({ sort: s.k })}>
            <span className="pfs-dot" />{s.l}
            {f.sort === s.k && <svg width="9" height="9" fill="none" stroke="#db142e" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}><path d="M20 6L9 17l-5-5" /></svg>}
          </button>
        ))}</div>}
      </div>
      <div className="pfs-acc"><Acc k="price" label="Price Range" />
        {open.has('price') && <div className="pfs-body">
          <div className="pfs-pr-row">
            <input type="number" placeholder="Min" value={f.pMin} onChange={e => upd({ pMin: e.target.value })} className="pfs-pin" />
            <span style={{ color: '#bbb', fontSize: 12 }}>–</span>
            <input type="number" placeholder="Max" value={f.pMax} onChange={e => upd({ pMax: e.target.value })} className="pfs-pin" />
          </div>
          {PRANGES.map(r => <button key={r.l} className={`pfs-pr${isR(r.mn, r.mx) ? ' on' : ''}`} onClick={() => applyR(r.mn, r.mx)}>{r.l}</button>)}
        </div>}
      </div>
      <div className="pfs-acc"><Acc k="avail" label="Availability" />
        {open.has('avail') && <div className="pfs-body" style={{ padding: '6px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="pfs-trow">
            <span>In stock only</span>
            <div className={`pfs-tgl${f.inStock ? ' on' : ''}`} onClick={() => upd({ inStock: !f.inStock })}><div className="pfs-tgl-k" /></div>
          </label>
          <label className="pfs-trow">
            <span>Packs only</span>
            <div className={`pfs-tgl${f.isPack ? ' on' : ''}`} onClick={() => upd({ isPack: !f.isPack })}><div className="pfs-tgl-k" /></div>
          </label>
        </div>}
      </div>
      {aLoad && [1, 2].map(k => (
        <div key={k} className="pfs-acc" style={{ padding: '11px 16px' }}>
          <div className="pfs-skln" style={{ width: '54%', height: 9, marginBottom: 7 }} />
          <div className="pfs-skln" style={{ height: 25, borderRadius: 8 }} />
        </div>
      ))}
      {!aLoad && attrs.map(a => {
        const isOpen = open.has(a.slug); const sel = f.attrs[a.slug] ?? []
        return (
          <div key={a.id} className="pfs-acc">
            <button className="pfs-head" onClick={() => tog(a.slug)}>
              <span>{a.name}{sel.length > 0 && <span className="pfs-badge">{sel.length}</span>}</span>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isOpen && <div className="pfs-body">
              {a.type === 'color' ? (
                <div className="pfs-sw-row">{a.options.map(o => (
                  <button key={o.id} title={o.value} className={`pfs-sw${sel.includes(o.id) ? ' on' : ''}`}
                    style={{ '--c': o.color_hex ?? '#ccc' } as React.CSSProperties} onClick={() => togA(a.slug, o.id)}>
                    {sel.includes(o.id) && <svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                ))}</div>
              ) : a.type === 'multiselect' ? (
                <div className="pfs-checks">{a.options.map(o => { const on = sel.includes(o.id); return (
                  <label key={o.id} className={`pfs-chk${on ? ' on' : ''}`} onClick={() => togA(a.slug, o.id)}>
                    <div className={`pfs-cb${on ? ' on' : ''}`}>{on && <svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}</div>
                    {o.value}
                  </label>
                )})}</div>
              ) : (
                <div className="pfs-pills">{a.options.map(o => (
                  <button key={o.id} className={`pfs-pill${sel.includes(o.id) ? ' on' : ''}`} onClick={() => setA1(a.slug, o.id)}>{o.value}</button>
                ))}</div>
              )}
            </div>}
          </div>
        )
      })}
      <button className="pfs-apply" onClick={() => setMOpen(false)}>Apply Filters</button>
    </aside>
  )

  return (
    <>
      <style>{`
        @keyframes pfsFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pfsSlideIn { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes pfsShimmer { 0%{background-position:-700px 0} 100%{background-position:700px 0} }

        .pfs-desk{display:block}

        .pfs{background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden;position:sticky;top:8px;max-height:calc(100vh - 16px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#f0f0f0 transparent;font-family:'Outfit',sans-serif}
        .pfs-hd{display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;border-bottom:1px solid #f5f5f5;position:sticky;top:0;background:#fff;z-index:2}
        .pfs-title{font-size:13px;font-weight:800;color:#111;margin-bottom:2px}
        .pfs-count{font-size:10px;color:#bbb;font-weight:500}
        .pfs-clear{background:rgba(219,20,46,.08);border:none;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;color:#db142e;cursor:pointer;font-family:'Outfit',sans-serif;transition:background .12s}
        .pfs-clear:hover{background:rgba(219,20,46,.15)}
        .pfs-blk{padding:8px 15px 3px}
        .pfs-search{display:flex;align-items:center;gap:7px;background:#f8f8f8;border:1.5px solid #eee;border-radius:8px;padding:6px 10px;transition:border-color .13s}
        .pfs-search:focus-within{border-color:#db142e}
        .pfs-search input{flex:1;border:none;background:transparent;font-size:12px;font-family:'Outfit',sans-serif;color:#111;outline:none}
        .pfs-search input::placeholder{color:#ccc}
        .pfs-acc{border-bottom:1px solid #f5f5f5}
        .pfs-head{width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#444;transition:color .12s}
        .pfs-head:hover{color:#db142e}
        .pfs-body{padding:3px 15px 10px}
        .pfs-sort{display:flex;align-items:center;gap:7px;width:100%;padding:7px 7px;border-radius:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12.5px;font-weight:500;color:#555;text-align:left;transition:all .11s}
        .pfs-sort:hover{background:#f8f8f8;color:#db142e}
        .pfs-sort.on{background:rgba(219,20,46,.05);color:#db142e;font-weight:700}
        .pfs-dot{width:5px;height:5px;border-radius:50%;border:1.5px solid currentColor;flex-shrink:0;transition:background .11s}
        .pfs-sort.on .pfs-dot{background:#db142e}
        .pfs-pr-row{display:flex;align-items:center;gap:5px;margin-bottom:8px}
        .pfs-pin{flex:1;min-width:0;padding:6px 8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-family:'Outfit',sans-serif;color:#111;background:#f8f8f8;outline:none;-moz-appearance:textfield;transition:border-color .12s}
        .pfs-pin::-webkit-outer-spin-button,.pfs-pin::-webkit-inner-spin-button{-webkit-appearance:none}
        .pfs-pin:focus{border-color:#db142e;background:#fff}.pfs-pin::placeholder{color:#ccc}
        .pfs-pr{display:flex;align-items:center;gap:7px;width:100%;padding:7px 7px;border-radius:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#555;text-align:left;transition:all .11s}
        .pfs-pr::before{content:'';display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid #d1d5db;flex-shrink:0;background:#fff;transition:all .11s}
        .pfs-pr:hover{background:#f8f8f8;color:#db142e}.pfs-pr:hover::before{border-color:#db142e}
        .pfs-pr.on{color:#db142e;font-weight:700}.pfs-pr.on::before{background:#db142e;border-color:#db142e;box-shadow:inset 0 0 0 3px #fff}
        .pfs-trow{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer}
        .pfs-tgl{width:35px;height:19px;border-radius:999px;background:#e5e7eb;position:relative;cursor:pointer;flex-shrink:0;transition:background .19s}
        .pfs-tgl.on{background:#db142e}
        .pfs-tgl-k{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.14);transition:transform .19s}
        .pfs-tgl.on .pfs-tgl-k{transform:translateX(16px)}
        .pfs-badge{display:inline-flex;align-items:center;justify-content:center;background:#db142e;color:#fff;font-size:9px;font-weight:900;border-radius:999px;min-width:14px;height:14px;margin-left:5px;padding:0 3px}
        .pfs-sw-row{display:flex;flex-wrap:wrap;gap:7px;padding:4px 0}
        .pfs-sw{width:24px;height:24px;border-radius:50%;background:var(--c,#ccc);border:2px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform .11s,border-color .11s,box-shadow .11s}
        .pfs-sw:hover{transform:scale(1.1)}.pfs-sw.on{border-color:#db142e;transform:scale(1.15);box-shadow:0 0 0 3px rgba(219,20,46,.17)}
        .pfs-checks{display:flex;flex-direction:column;gap:2px}
        .pfs-chk{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;color:#374151;transition:background .1s}
        .pfs-chk:hover{background:#f8f8f8}.pfs-chk.on{color:#db142e;font-weight:700}
        .pfs-cb{width:13px;height:13px;border-radius:4px;border:1.5px solid #d1d5db;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .11s}
        .pfs-cb.on{background:#db142e;border-color:#db142e}
        .pfs-pills{display:flex;flex-wrap:wrap;gap:5px;padding:2px 0}
        .pfs-pill{padding:4px 10px;border-radius:999px;border:1.5px solid #e5e7eb;background:#fff;font-size:11px;font-weight:600;color:#555;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .11s}
        .pfs-pill:hover{border-color:#db142e;color:#db142e}.pfs-pill.on{background:#db142e;border-color:#db142e;color:#fff}
        .pfs-apply{display:none;width:calc(100% - 30px);margin:11px 15px 15px;padding:10px;background:#db142e;color:#fff;font-weight:800;font-size:12.5px;border:none;border-radius:9px;cursor:pointer;font-family:'Outfit',sans-serif;align-items:center;justify-content:center}
        .pfs-bd{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:200;animation:pfsFadeIn .17s ease;backdrop-filter:blur(2px)}
        .pfs-drawer{position:fixed;left:0;top:0;bottom:0;z-index:201;width:282px;max-width:90vw;overflow-y:auto;background:#fff;box-shadow:4px 0 24px rgba(0,0,0,.12);animation:pfsSlideIn .22s ease}
        .pfs-drawer .pfs{border-radius:0;position:static;box-shadow:none;border:none;max-height:none}
        .pfs-drawer .pfs-apply{display:flex}
        .pfs-skln{border-radius:4px;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:pfsShimmer 1.3s infinite linear}

        @media(max-width:920px){ .pfs-desk{display:none} }
      `}</style>
      <div className="pfs-desk">{inner}</div>
      {mOpen && <><div className="pfs-bd" onClick={() => setMOpen(false)} /><div className="pfs-drawer">{inner}</div></>}
    </>
  )
}
