'use client'

/**
 * app/(storefront)/deals/page.tsx — ChooseTounsi
 *
 * CHANGES vs previous version:
 *  1. ✅ Fetches /api/discounts alongside /api/flash-sales and /api/packs
 *  2. ✅ DiscountItem type added to unified DealItem union
 *  3. ✅ DiscountCard component — same .dc design, green accent instead of red
 *  4. ✅ Hero stats: added "Discounts" count
 *  5. ✅ Filter: "Deal Type" now includes Discounts option
 *  6. ✅ Sidebar sort: discount items sorted by discount % desc
 *  7. ✅ All existing flash + bundle logic UNTOUCHED
 */

import {
  useState, useEffect, useCallback,
  useMemo, useRef,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import CountdownTimer from '@/app/components/promotions/CountdownTimer'
import { publicPromotionsApi } from '@/lib/promotionsApi'
import { Package2, ArrowRight } from 'lucide-react'

const ORIGIN  = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL = `${ORIGIN}/api`

const money = (n: number | string) => `${Number(n).toFixed(2)} DT`

function resolveImg(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${ORIGIN}/storage/${url.replace(/^\/storage\//, '').replace(/^\//, '')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlashProduct {
  id: number; name: string; slug: string
  effective_price: number; original_price: number
  primary_image_url?: string | null
  seller?: { name: string } | null
  stock?: number
}
interface FlashSale {
  id: number; name: string; discount_label: string; ends_at: string
  flash_stock?: number | null; flash_stock_remaining?: number | null
  products: FlashProduct[]
}

// ── NEW: discount promotion shape (same as flash but type='discount') ─────────
interface DiscountProduct {
  id: number; name: string; slug: string
  effective_price: number; original_price: number
  primary_image_url?: string | null
  seller?: { name: string } | null
  stock?: number
}
interface DiscountPromotion {
  id: number; name: string; discount_label: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  ends_at: string
  products: DiscountProduct[]
}

interface PackItem {
  id: number; quantity: number
  product: { name: string; primary_image_url: string | null } | null
}
interface Pack {
  id: number; name: string; slug: string
  short_description: string | null; image_url: string | null
  pack_price: number; original_price: number; savings: number
  items_count: number; items: PackItem[]
  seller: { id: number; name: string } | null
}

// ─── Unified item type ────────────────────────────────────────────────────────

interface FlashItem {
  _type: 'flash'; _id: string; _discPct: number; _price: number
  product: FlashProduct; sale: FlashSale
}
interface DiscountItem {
  _type: 'discount'; _id: string; _discPct: number; _price: number
  product: DiscountProduct; promo: DiscountPromotion
}
interface BundleItem {
  _type: 'bundle'; _id: string; _discPct: number; _price: number
  pack: Pack
}
type DealItem = FlashItem | DiscountItem | BundleItem

// ─── Filters ──────────────────────────────────────────────────────────────────

type SortKey = 'flash_first' | 'savings_desc' | 'price_asc' | 'price_desc' | 'newest'
interface Filters {
  dealType: 'all' | 'flash' | 'discounts' | 'bundles'
  sort: SortKey
  priceMin: string
  priceMax: string
  inStock: boolean
}

const DEFAULT_FILTERS: Filters = {
  dealType: 'all', sort: 'flash_first',
  priceMin: '', priceMax: '', inStock: false,
}

const ITEMS_PER_PAGE = 20

const SORTS: { k: SortKey; l: string }[] = [
  { k: 'flash_first',  l: 'Flash Priority' },
  { k: 'savings_desc', l: 'Biggest Savings' },
  { k: 'price_asc',    l: 'Price: Low → High' },
  { k: 'price_desc',   l: 'Price: High → Low' },
  { k: 'newest',       l: 'Newest First' },
]

const PRICE_RANGES = [
  { l: 'Under 50 DT',  mn: '0',   mx: '50'  },
  { l: '50 – 100 DT',  mn: '50',  mx: '100' },
  { l: '100 – 200 DT', mn: '100', mx: '200' },
  { l: '200 – 500 DT', mn: '200', mx: '500' },
  { l: 'Over 500 DT',  mn: '500', mx: ''    },
]

// ══════════════════════════════════════════════════════════════════════════════
//  FLASH CARD — unchanged
// ══════════════════════════════════════════════════════════════════════════════
function FlashCard({ item, idx }: { item: FlashItem; idx: number }) {
  const { product, sale } = item
  const [hov, setHov] = useState(false)
  const [imgErr, setErr] = useState(false)
  const img = resolveImg(product.primary_image_url)
  const hasStock = sale.flash_stock != null && sale.flash_stock > 0
  const stockUsed = hasStock
    ? Math.max(0, sale.flash_stock! - (sale.flash_stock_remaining ?? sale.flash_stock!)) : 0
  const stockPct  = hasStock ? Math.min(100, (stockUsed / sale.flash_stock!) * 100) : 0
  const remaining = sale.flash_stock_remaining ?? product.stock ?? null
  const isUrgent  = remaining != null && remaining <= 3

  return (
    <Link href={`/products/${product.slug}`} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="dc" data-type="flash" style={{ '--d': `${Math.min(idx * 0.04, 0.4)}s` } as React.CSSProperties}>
      <div className="dc-stage">
        {img && !imgErr
          ? <img src={img} alt={product.name} className={`dc-img${hov ? ' zoom' : ''}`} onError={() => setErr(true)} draggable={false} />
          : <div className="dc-noimg"><svg width="32" height="32" fill="none" stroke="#ccc" strokeWidth="1.2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>
        }
        <div className="dc-badges">
          {item._discPct > 0 && <span className="dc-badge dc-disc dc-disc-flash">-{item._discPct}%</span>}
          <span className="dc-badge dc-flash-live"><span className="dc-pulse" />⚡ LIVE</span>
        </div>
        {isUrgent && <div className="dc-urgent">🔥 Only {remaining} left!</div>}
        <div className={`dc-cta${hov ? ' show' : ''}`}>
          <button className="dc-cta-btn dc-cta-flash" onClick={e => e.preventDefault()}>
            <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            View Deal
          </button>
        </div>
        <div className={`dc-countdown${hov ? ' hidden' : ''}`}>
          <CountdownTimer endsAt={sale.ends_at} compact={false} />
        </div>
      </div>
      {hasStock && (
        <div className="dc-stock-wrap">
          <div className="dc-stock-track">
            <div className={`dc-stock-fill${stockPct > 70 ? ' hot' : ''}`} style={{ width: `${Math.max(5, stockPct)}%` }} />
          </div>
          <span className={`dc-stock-txt${stockPct > 70 ? ' hot' : ''}`}>{remaining != null ? `${remaining} left` : 'Limited'}</span>
        </div>
      )}
      <div className="dc-info">
        {product.seller?.name && <p className="dc-seller">{product.seller.name}</p>}
        <p className="dc-name">{product.name}</p>
        <div className="dc-prices">
          <span className="dc-price">{money(product.effective_price)}</span>
          {product.original_price > product.effective_price && <span className="dc-orig">{money(product.original_price)}</span>}
        </div>
      </div>
    </Link>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  DISCOUNT CARD — new, green accent, no countdown bar
// ══════════════════════════════════════════════════════════════════════════════
function DiscountCard({ item, idx }: { item: DiscountItem; idx: number }) {
  const { product, promo } = item
  const [hov, setHov]       = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const img = resolveImg(product.primary_image_url)

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="dc"
      data-type="discount"
      style={{ '--d': `${Math.min(idx * 0.04, 0.4)}s` } as React.CSSProperties}
    >
      <div className="dc-stage">
        {img && !imgErr
          ? <img src={img} alt={product.name} className={`dc-img${hov ? ' zoom' : ''}`} onError={() => setImgErr(true)} draggable={false} />
          : <div className="dc-noimg"><svg width="32" height="32" fill="none" stroke="#ccc" strokeWidth="1.2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>
        }

        {/* Badges */}
        <div className="dc-badges">
          {item._discPct > 0 && (
            <span className="dc-badge" style={{ background: '#059669', color: '#fff', fontSize: 9, padding: '3px 7px' }}>
              -{item._discPct}%
            </span>
          )}
          <span className="dc-badge" style={{ background: 'rgba(5,150,105,0.85)', color: '#fff', backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            🏷️ DISCOUNT
          </span>
        </div>

        {/* CTA */}
        <div className={`dc-cta${hov ? ' show' : ''}`}>
          <button className="dc-cta-btn" style={{ background: '#059669', color: '#fff', boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}
            onClick={e => e.preventDefault()}>
            <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            View Deal
          </button>
        </div>

        
      </div>

      {/* Discount label strip below image */}
      <div style={{
        background: 'rgba(5,150,105,0.07)',
        borderTop: '1px solid rgba(5,150,105,0.15)',
        padding: '4px 10px',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', letterSpacing: '0.04em' }}>
          🏷️ {promo.discount_label}
        </span>
        <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 'auto' }}>{promo.name}</span>
      </div>

      <div className="dc-info">
        {product.seller?.name && <p className="dc-seller">{product.seller.name}</p>}
        <p className="dc-name">{product.name}</p>
        <div className="dc-prices">
          <span className="dc-price">{money(product.effective_price)}</span>
          {product.original_price > product.effective_price && (
            <span className="dc-orig">{money(product.original_price)}</span>
          )}
        </div>
        {/* Savings pill */}
        {product.original_price > product.effective_price && (
          <p style={{
            fontSize: 9, fontWeight: 700, color: '#059669',
            background: '#f0fdf4', padding: '1px 6px', borderRadius: 999,
            display: 'inline-block', marginTop: 2,
          }}>
            Save {money(product.original_price - product.effective_price)}
          </p>
        )}
      </div>
    </Link>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  BUNDLE CARD — unchanged
// ══════════════════════════════════════════════════════════════════════════════
function BundleCard({ item, idx }: { item: BundleItem; idx: number }) {
  const { pack } = item
  const router = useRouter()
  const [hov, setHov]       = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const resolveUrl = (url: string | null | undefined) => resolveImg(url)
  const gallery = useMemo<string[]>(() => {
    const out: string[] = []
    const cover = resolveUrl(pack.image_url); if (cover) out.push(cover)
    pack.items.forEach(i => { const t = resolveUrl(i.product?.primary_image_url); if (t && !out.includes(t)) out.push(t) })
    return out
  }, [pack])
  const [cur, setCur]   = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [slide, setSlide] = useState(false)
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetRef = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const advance = useCallback(() => {
    if (gallery.length < 2) return
    setCur(c => { const next = (c + 1) % gallery.length; setPrev(c); setSlide(true); setTimeout(() => { setSlide(false); setPrev(null) }, 550); return next })
  }, [gallery.length])
  const onEnter = () => { setHov(true); if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null }; if (gallery.length > 1) tickRef.current = setInterval(advance, 1600) }
  const onLeave = () => { setHov(false); if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }; resetRef.current = setTimeout(() => { setCur(0); setPrev(null); setSlide(false) }, 600) }
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); if (resetRef.current) clearTimeout(resetRef.current) }, [])
  const thumbs = pack.items.map(i => resolveUrl(i.product?.primary_image_url)).filter(Boolean) as string[]
  const showMosaic = gallery.length === 0 || (imgErr && !pack.image_url)

  return (
    <Link href={`/deals/${pack.slug}`} onMouseEnter={onEnter} onMouseLeave={onLeave}
      className="dc" data-type="bundle" style={{ '--d': `${Math.min(idx * 0.04, 0.4)}s` } as React.CSSProperties}>
      <div className="dc-stage">
        {slide && prev !== null && gallery[prev] && <div className="dc-layer dc-layer-out"><img src={gallery[prev]} alt="" className="dc-img" draggable={false} /></div>}
        <div className={`dc-layer${slide ? ' dc-layer-in' : ''}${hov && !slide ? ' zoom' : ''}`}>
          {showMosaic && thumbs.length >= 2
            ? <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', width:'100%', height:'100%', gap:2 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ background:'#f1f5f9', overflow:'hidden' }}>{thumbs[i] && <img src={thumbs[i]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />}</div>)}
              </div>
            : gallery[cur] && !imgErr
              ? <img src={gallery[cur]} alt={pack.name} className="dc-img" onError={() => setImgErr(true)} draggable={false} />
              : <div className="dc-noimg"><Package2 size={32} color="#ccc" /></div>
          }
        </div>
        <div className="dc-badges">
          {item._discPct > 0 && <span className="dc-badge dc-disc">-{item._discPct}%</span>}
          <span className="dc-badge dc-bundle-tag">📦 {pack.items_count} items</span>
        </div>
        {gallery.length > 1 && <div className="dc-dots">{gallery.slice(0,5).map((_,i) => <span key={i} className={`dc-dot${i===cur?' on':''}`} />)}</div>}
        <div className={`dc-cta${hov ? ' show' : ''}`}>
          <button className="dc-cta-btn dc-cta-bundle" onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/deals/${pack.slug}`) }}>
            <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            View Bundle
          </button>
        </div>
      </div>
      <div className="dc-info">
        {pack.seller?.name && <p className="dc-seller">{pack.seller.name}</p>}
        <p className="dc-name">{pack.name}</p>
        {pack.short_description && <p className="dc-desc">{pack.short_description}</p>}
        <div className="dc-prices">
          <span className="dc-price">{money(pack.pack_price)}</span>
          {pack.original_price > pack.pack_price && <span className="dc-orig">{money(pack.original_price)}</span>}
        </div>
        {pack.savings > 0 && <p className="dc-save">Save {money(pack.savings)}</p>}
      </div>
    </Link>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
const FlashSkel = () => (
  <div className="dsk"><div className="dsk-img" /><div className="dsk-bar" />
    <div className="dsk-body"><div className="dsk-ln" style={{ width:'40%', height:9 }} /><div className="dsk-ln" style={{ width:'72%', height:12, marginTop:5 }} /><div className="dsk-ln" style={{ width:'44%', height:14, marginTop:5 }} /></div>
  </div>
)
const DiscountSkel = () => (
  <div className="dsk"><div className="dsk-img" style={{ background:'linear-gradient(90deg,#d1fae5 25%,#ecfdf5 50%,#d1fae5 75%)', backgroundSize:'700px 100%' }} />
    <div style={{ height:24, background:'rgba(5,150,105,0.07)', borderTop:'1px solid rgba(5,150,105,0.1)' }} />
    <div className="dsk-body"><div className="dsk-ln" style={{ width:'40%', height:9 }} /><div className="dsk-ln" style={{ width:'72%', height:12, marginTop:5 }} /><div className="dsk-ln" style={{ width:'44%', height:14, marginTop:5 }} /></div>
  </div>
)
const BundleSkel = () => (
  <div className="dsk"><div className="dsk-img" />
    <div className="dsk-body"><div className="dsk-ln" style={{ width:'40%', height:9 }} /><div className="dsk-ln" style={{ width:'72%', height:12, marginTop:5 }} /><div className="dsk-ln" style={{ width:'44%', height:14, marginTop:5 }} /></div>
  </div>
)

// ── Sidebar ───────────────────────────────────────────────────────────────────
function DealsSidebar({ f, setF, total, mOpen, setMOpen }: {
  f: Filters; setF: (v: Filters) => void; total: number; mOpen: boolean; setMOpen: (v: boolean) => void
}) {
  const [open, setOpen] = useState(new Set(['sort', 'dealtype', 'price', 'avail']))
  const upd = (p: Partial<Filters>) => setF({ ...f, ...p })
  const tog = (k: string) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const isR = (mn: string, mx: string) => f.priceMin === mn && f.priceMax === mx
  const applyR = (mn: string, mx: string) => isR(mn, mx) ? upd({ priceMin: '', priceMax: '' }) : upd({ priceMin: mn, priceMax: mx })
  const hasAny = f.dealType !== 'all' || f.inStock || f.priceMin !== '' || f.priceMax !== ''
  const Acc = ({ k, label }: { k: string; label: string }) => (
    <button className="sb-head" onClick={() => tog(k)}>
      <span>{label}</span>
      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open.has(k) ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
    </button>
  )
  const inner = (
    <aside className="sbar">
      <div className="sbar-hd">
        <div><p className="sbar-title">Filters</p><p className="sbar-count">{total.toLocaleString()} deals</p></div>
        {hasAny && <button className="sbar-clear" onClick={() => setF(DEFAULT_FILTERS)}>✕ Clear</button>}
      </div>
      <div className="sb-acc"><Acc k="sort" label="Sort By" />
        {open.has('sort') && <div className="sb-body">{SORTS.map(s => (
          <button key={s.k} className={`sbar-sort${f.sort === s.k ? ' on' : ''}`} onClick={() => upd({ sort: s.k })}>
            <span className="sbar-dot" />{s.l}
            {f.sort === s.k && <svg width="9" height="9" fill="none" stroke="#db142e" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}><path d="M20 6L9 17l-5-5"/></svg>}
          </button>
        ))}</div>}
      </div>
      {/* Deal Type — now includes Discounts */}
      <div className="sb-acc"><Acc k="dealtype" label="Deal Type" />
        {open.has('dealtype') && <div className="sb-body">
          {([
            { k: 'all',       l: '🔥 All Deals'   },
            { k: 'flash',     l: '⚡ Flash Sales'  },
            { k: 'discounts', l: '🏷️ Discounts'   },
            { k: 'bundles',   l: '📦 Bundles'      },
          ] as { k: Filters['dealType']; l: string }[]).map(d => (
            <button key={d.k} className={`sbar-sort${f.dealType === d.k ? ' on' : ''}`} onClick={() => upd({ dealType: d.k })}>
              <span className="sbar-dot" />{d.l}
              {f.dealType === d.k && <svg width="9" height="9" fill="none" stroke="#db142e" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>}
      </div>
      <div className="sb-acc"><Acc k="price" label="Price Range" />
        {open.has('price') && <div className="sb-body">
          <div className="sbar-pr-row">
            <input type="number" placeholder="Min" value={f.priceMin} onChange={e => upd({ priceMin: e.target.value })} className="sbar-pin" />
            <span style={{ color:'#bbb', fontSize:12 }}>–</span>
            <input type="number" placeholder="Max" value={f.priceMax} onChange={e => upd({ priceMax: e.target.value })} className="sbar-pin" />
          </div>
          {PRICE_RANGES.map(r => <button key={r.l} className={`sbar-pr${isR(r.mn, r.mx) ? ' on' : ''}`} onClick={() => applyR(r.mn, r.mx)}>{r.l}</button>)}
        </div>}
      </div>
      <div className="sb-acc"><Acc k="avail" label="Availability" />
        {open.has('avail') && <div className="sb-body" style={{ padding:'6px 16px 12px' }}>
          <label className="sbar-trow">
            <span>In stock only</span>
            <div className={`sbar-tgl${f.inStock ? ' on' : ''}`} onClick={() => upd({ inStock: !f.inStock })}><div className="sbar-tgl-k" /></div>
          </label>
        </div>}
      </div>
      <button className="sbar-apply" onClick={() => setMOpen(false)}>Apply Filters</button>
    </aside>
  )
  return (
    <>
      <div className="sbar-desk">{inner}</div>
      {mOpen && <><div className="sbar-bd" onClick={() => setMOpen(false)} /><div className="sbar-drawer">{inner}</div></>}
    </>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pages({ cur, total, go }: { cur: number; total: number; go: (p: number) => void }) {
  if (total <= 1) return null
  const ps = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - cur) <= 1)
    .reduce<(number | '…')[]>((acc, p, i, arr) => { if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push('…'); acc.push(p); return acc }, [])
  return (
    <div className="pages">
      <button className="pgb" onClick={() => go(Math.max(1, cur - 1))} disabled={cur === 1}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      {ps.map((p, i) => p === '…' ? <span key={`e${i}`} className="pg-sep">…</span> : <button key={p} className={`pgb${cur === p ? ' on' : ''}`} onClick={() => go(p as number)}>{p}</button>)}
      <button className="pgb" onClick={() => go(Math.min(total, cur + 1))} disabled={cur === total}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function DealsPage() {
  const [rawFlash,     setRawFlash]     = useState<FlashSale[]>([])
  const [rawDiscounts, setRawDiscounts] = useState<DiscountPromotion[]>([])   // ← NEW
  const [rawBundles,   setRawBundles]   = useState<Pack[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS)
  const [page,         setPage]         = useState(1)
  const [mOpen,        setMOpen]        = useState(false)

  // ── Fetch: flash + discounts + bundles in parallel ─────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([
      publicPromotionsApi.flashSales().then(r => r.data ?? []).catch(() => []),
      publicPromotionsApi.discounts().then(r => r.data ?? []).catch(() => []),   // ← NEW
      fetch(`${API_URL}/packs?per_page=100`, { headers: { Accept: 'application/json' } })
        .then(r => r.json())
        .then(json => {
          if (json.data && typeof json.data === 'object' && 'data' in json.data) return json.data.data ?? []
          if (Array.isArray(json.data)) return json.data
          if (Array.isArray(json)) return json
          return []
        })
        .catch(() => []),
    ]).then(([flash, discounts, bundles]) => {
      setRawFlash(flash)
      setRawDiscounts(discounts)
      setRawBundles(bundles)
    }).finally(() => setLoading(false))
  }, [])

  // ── Merge all three sources into unified array ─────────────────────────────
  const mergedItems = useMemo<DealItem[]>(() => {
    const flashItems: FlashItem[] = rawFlash.flatMap(sale =>
      (sale.products ?? []).map(p => {
        const discPct = p.original_price > 0
          ? Math.round(((p.original_price - p.effective_price) / p.original_price) * 100) : 0
        return { _type: 'flash' as const, _id: `flash-${sale.id}-${p.id}`, _discPct: discPct, _price: p.effective_price, product: p, sale }
      })
    )

    // ── NEW: discount items ───────────────────────────────────────────────────
    const discountItems: DiscountItem[] = rawDiscounts.flatMap(promo =>
      (promo.products ?? []).map(p => {
        const discPct = p.original_price > 0
          ? Math.round(((p.original_price - p.effective_price) / p.original_price) * 100) : 0
        return { _type: 'discount' as const, _id: `discount-${promo.id}-${p.id}`, _discPct: discPct, _price: p.effective_price, product: p, promo }
      })
    )

    const bundleItems: BundleItem[] = rawBundles.map(pack => {
      const discPct = pack.original_price > 0 && pack.savings > 0
        ? Math.round((pack.savings / pack.original_price) * 100) : 0
      return { _type: 'bundle' as const, _id: `bundle-${pack.id}`, _discPct: discPct, _price: pack.pack_price, pack }
    })

    // Order: flash → discounts → bundles
    return [...flashItems, ...discountItems, ...bundleItems]
  }, [rawFlash, rawDiscounts, rawBundles])

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredItems = useMemo<DealItem[]>(() => {
    return mergedItems.filter(item => {
      if (filters.dealType === 'flash'     && item._type !== 'flash')    return false
      if (filters.dealType === 'discounts' && item._type !== 'discount') return false
      if (filters.dealType === 'bundles'   && item._type !== 'bundle')   return false
      if (filters.priceMin !== '' && item._price < Number(filters.priceMin)) return false
      if (filters.priceMax !== '' && item._price > Number(filters.priceMax)) return false
      if (filters.inStock && item._type === 'flash') {
        const stock = item.sale.flash_stock_remaining ?? item.product.stock ?? 1
        if (stock <= 0) return false
      }
      if (filters.inStock && item._type === 'discount') {
        const stock = item.product.stock ?? 1
        if (stock <= 0) return false
      }
      return true
    })
  }, [mergedItems, filters.dealType, filters.priceMin, filters.priceMax, filters.inStock])

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sortedItems = useMemo<DealItem[]>(() => {
    const arr = [...filteredItems]
    switch (filters.sort) {
      case 'flash_first':
        return arr.sort((a, b) => {
          // Priority: flash → discount → bundle
          const rank = (t: string) => t === 'flash' ? 0 : t === 'discount' ? 1 : 2
          if (rank(a._type) !== rank(b._type)) return rank(a._type) - rank(b._type)
          return b._discPct - a._discPct
        })
      case 'savings_desc': return arr.sort((a, b) => b._discPct - a._discPct)
      case 'price_asc':    return arr.sort((a, b) => a._price - b._price)
      case 'price_desc':   return arr.sort((a, b) => b._price - a._price)
      case 'newest':
        return arr.sort((a, b) => {
          if (a._type === 'flash'    && b._type === 'flash')    return new Date(a.sale.ends_at).getTime() - new Date(b.sale.ends_at).getTime()
          if (a._type === 'discount' && b._type === 'discount') return new Date(a.promo.ends_at).getTime() - new Date(b.promo.ends_at).getTime()
          if (a._type === 'bundle'   && b._type === 'bundle')   return b.pack.id - a.pack.id
          const rank = (t: string) => t === 'flash' ? 0 : t === 'discount' ? 1 : 2
          return rank(a._type) - rank(b._type)
        })
      default: return arr
    }
  }, [filteredItems, filters.sort])

  const totalPages     = Math.ceil(sortedItems.length / ITEMS_PER_PAGE)
  const displayedItems = useMemo(() => sortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [sortedItems, page])
  useEffect(() => { setPage(1) }, [filters])

  // ── Hero stats ─────────────────────────────────────────────────────────────
  const flashCount    = rawFlash.reduce((s, sale) => s + (sale.products?.length ?? 0), 0)
  const discountCount = rawDiscounts.reduce((s, promo) => s + (promo.products?.length ?? 0), 0)   // ← NEW
  const bundleCount   = rawBundles.length
  const maxFlashDisc  = rawFlash.flatMap(s => s.products).reduce((max, p) => {
    const d = p.original_price > 0 ? Math.round(((p.original_price - p.effective_price) / p.original_price) * 100) : 0
    return Math.max(max, d)
  }, 0)
  const maxDiscountDisc = rawDiscounts.flatMap(s => s.products).reduce((max, p) => {
    const d = p.original_price > 0 ? Math.round(((p.original_price - p.effective_price) / p.original_price) * 100) : 0
    return Math.max(max, d)
  }, 0)
  const maxBundleSave = rawBundles.reduce((max, p) => {
    const d = p.original_price > 0 && p.savings > 0 ? Math.round((p.savings / p.original_price) * 100) : 0
    return Math.max(max, d)
  }, 0)

  const filterCount = [filters.dealType !== 'all', filters.inStock, filters.priceMin !== '' || filters.priceMax !== ''].filter(Boolean).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        @keyframes dpFadeUp  {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes dpShimmer {0%{background-position:-700px 0}100%{background-position:700px 0}}
        @keyframes dpPulse   {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.8)}}
        @keyframes dpSlideL  {from{transform:translateX(0)}to{transform:translateX(-100%)}}
        @keyframes dpSlideR  {from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes dpFadeIn  {from{opacity:0}to{opacity:1}}
        @keyframes dpSlideIn {from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}

        .dp{min-height:100vh;background:#f5f5f7;font-family:'Outfit',sans-serif;color:#111}

        /* Hero */
        .dp-hero{background:linear-gradient(135deg,#c0111f 0%,#7f1d1d 55%,#450a0a 100%);padding:32px 24px 28px;position:relative;overflow:hidden}
        .dp-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.035'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
        .dp-hero-inner{max-width:1520px;margin:0 auto;position:relative;z-index:1}
        .dp-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
        .dp-hero-eyebrow{font-size:10px;font-weight:800;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px}
        .dp-hero-title{font-size:clamp(1.5rem,3.5vw,2.3rem);font-weight:900;color:#fff;letter-spacing:-0.025em;line-height:1.1;margin:0 0 5px}
        .dp-hero-sub{font-size:13px;color:rgba(255,255,255,0.7);font-weight:500;margin:0}
        .dp-hero-back{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);text-decoration:none;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);padding:8px 14px;border-radius:999px;transition:background 0.15s;white-space:nowrap;flex-shrink:0}
        .dp-hero-back:hover{background:rgba(255,255,255,0.22)}
        .dp-hero-stats{display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden}
        .dp-stat-div{background:rgba(255,255,255,0.12)}
        .dp-stat{padding:12px 14px;display:flex;flex-direction:column;align-items:center;gap:1px}
        .dp-stat-icon{font-size:15px;margin-bottom:1px}
        .dp-stat-val{font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.02em;line-height:1}
        .dp-stat-lbl{font-size:8.5px;color:rgba(255,255,255,0.6);font-weight:700;text-transform:uppercase;letter-spacing:0.07em}

        /* Mobile bar */
        .dp-mbar{display:none;position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #eee;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:0 16px;height:48px;align-items:center;gap:10px}
        .dp-mbar-title{font-size:13px;font-weight:800;color:#111;flex:1}
        .dp-mbar-sort{padding:5px 10px;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;font-size:11px;font-weight:600;color:#555;font-family:'Outfit',sans-serif;cursor:pointer;outline:none}
        .dp-mbar-filter{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;font-size:11px;font-weight:700;color:#374151;cursor:pointer;font-family:'Outfit',sans-serif;position:relative;white-space:nowrap}
        .dp-mbar-filter:hover{border-color:#db142e;color:#db142e}
        .dp-filter-badge{position:absolute;top:-5px;right:-5px;background:#db142e;color:#fff;font-size:8px;font-weight:900;border-radius:999px;width:15px;height:15px;display:flex;align-items:center;justify-content:center}

        /* Layout */
        .dp-layout{max-width:1520px;margin:0 auto;padding:18px 32px 60px;display:grid;grid-template-columns:246px 1fr;gap:18px;align-items:start}
        .sbar-desk{display:block}

        /* Sidebar */
        .sbar{background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden;position:sticky;top:8px;max-height:calc(100vh - 24px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:#f0f0f0 transparent}
        .sbar-hd{display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;border-bottom:1px solid #f5f5f5;position:sticky;top:0;background:#fff;z-index:2}
        .sbar-title{font-size:13px;font-weight:800;color:#111;margin-bottom:2px}
        .sbar-count{font-size:10px;color:#bbb;font-weight:500}
        .sbar-clear{background:rgba(219,20,46,.08);border:none;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:700;color:#db142e;cursor:pointer;font-family:'Outfit',sans-serif;transition:background .12s}
        .sbar-clear:hover{background:rgba(219,20,46,.15)}
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
        .sbar-pin:focus{border-color:#db142e;background:#fff}
        .sbar-pin::placeholder{color:#ccc}
        .sbar-pr{display:flex;align-items:center;gap:7px;width:100%;padding:7px 7px;border-radius:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#555;text-align:left;transition:all .11s}
        .sbar-pr::before{content:'';display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid #d1d5db;flex-shrink:0;background:#fff;transition:all .11s}
        .sbar-pr:hover{background:#f8f8f8;color:#db142e}
        .sbar-pr:hover::before{border-color:#db142e}
        .sbar-pr.on{color:#db142e;font-weight:700}
        .sbar-pr.on::before{background:#db142e;border-color:#db142e;box-shadow:inset 0 0 0 3px #fff}
        .sbar-trow{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer}
        .sbar-tgl{width:35px;height:19px;border-radius:999px;background:#e5e7eb;position:relative;cursor:pointer;flex-shrink:0;transition:background .19s}
        .sbar-tgl.on{background:#db142e}
        .sbar-tgl-k{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.14);transition:transform .19s}
        .sbar-tgl.on .sbar-tgl-k{transform:translateX(16px)}
        .sbar-apply{display:none;width:calc(100% - 30px);margin:11px 15px 15px;padding:10px;background:#db142e;color:#fff;font-weight:800;font-size:12.5px;border:none;border-radius:9px;cursor:pointer;font-family:'Outfit',sans-serif;align-items:center;justify-content:center}
        .sbar-bd{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:200;animation:dpFadeIn .17s ease;backdrop-filter:blur(2px)}
        .sbar-drawer{position:fixed;left:0;top:0;bottom:0;z-index:201;width:282px;max-width:90vw;overflow-y:auto;background:#fff;box-shadow:4px 0 24px rgba(0,0,0,.12);animation:dpSlideIn .22s ease}
        .sbar-drawer .sbar{border-radius:0;position:static;box-shadow:none;border:none;max-height:none}
        .sbar-drawer .sbar-apply{display:flex}

        /* Deal cards */
        .dc{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;cursor:pointer;animation:dpFadeUp .42s ease both;animation-delay:var(--d,0s);transition:box-shadow .22s,transform .22s,border-color .2s;will-change:transform}
        .dc[data-type="flash"]:hover{box-shadow:0 10px 32px rgba(219,20,46,.15);border-color:rgba(219,20,46,.35);transform:translateY(-3px) scale(1.015)}
        .dc[data-type="discount"]:hover{box-shadow:0 10px 32px rgba(5,150,105,.15);border-color:rgba(5,150,105,.35);transform:translateY(-3px) scale(1.015)}
        .dc[data-type="bundle"]:hover{box-shadow:0 10px 32px rgba(0,0,0,.1);border-color:#d8d8d8;transform:translateY(-3px) scale(1.015)}
        .dc-stage{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#f5f5f5;flex-shrink:0}
        .dc-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .55s cubic-bezier(.25,.46,.45,.94)}
        .dc-img.zoom{transform:scale(1.06)}
        .dc-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f4f4f6}
        .dc-layer{position:absolute;inset:0;will-change:transform}
        .dc-layer-out{z-index:1;animation:dpSlideL .52s cubic-bezier(.77,0,.175,1) forwards}
        .dc-layer-in{z-index:2;animation:dpSlideR .52s cubic-bezier(.77,0,.175,1) forwards}
        .dc-badges{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:5}
        .dc-badge{font-size:8px;font-weight:900;padding:2px 6px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;display:inline-flex;align-items:center;gap:3px}
        .dc-disc{background:#db142e;color:#fff}
        .dc-disc-flash{font-size:9px;padding:3px 7px}
        .dc-flash-live{background:rgba(0,0,0,0.75);color:#fff;backdrop-filter:blur(4px)}
        .dc-pulse{width:5px;height:5px;border-radius:50%;background:#fbbf24;flex-shrink:0;animation:dpPulse 1.4s ease-in-out infinite}
        .dc-bundle-tag{background:rgba(15,23,42,0.72);color:#fff}
        .dc-dots{position:absolute;bottom:52px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:5}
        .dc-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);transition:all .22s}
        .dc-dot.on{background:#fff;width:14px;border-radius:3px}
        .dc-urgent{position:absolute;bottom:56px;left:0;right:0;background:rgba(220,38,38,0.92);color:#fff;font-size:9px;font-weight:900;text-align:center;padding:3px 8px;letter-spacing:.03em;z-index:6}
        .dc-cta{position:absolute;bottom:0;left:0;right:0;padding:0 9px 9px;z-index:7;transform:translateY(110%);opacity:0;transition:transform .3s cubic-bezier(.34,1.48,.64,1),opacity .22s}
        .dc-cta.show{transform:translateY(0);opacity:1}
        .dc-cta-btn{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;padding:8px 10px;font-size:11.5px;font-weight:800;border:none;border-radius:7px;cursor:pointer;font-family:'Outfit',sans-serif;transition:background .13s,transform .11s;letter-spacing:.01em}
        .dc-cta-flash{background:#db142e;color:#fff;box-shadow:0 4px 14px rgba(219,20,46,.4)}
        .dc-cta-flash:hover{background:#b91c1c}
        .dc-cta-bundle{background:#0f172a;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25)}
        .dc-cta-bundle:hover{background:#1e293b}
        .dc-countdown{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:5px 8px;z-index:6;transition:opacity .2s,transform .2s}
        .dc-countdown.hidden{opacity:0;transform:translateY(4px);pointer-events:none}
        .dc-stock-wrap{display:flex;align-items:center;gap:7px;padding:5px 10px 2px;background:#fff}
        .dc-stock-track{flex:1;height:3.5px;background:#f1f5f9;border-radius:999px;overflow:hidden}
        .dc-stock-fill{height:100%;border-radius:999px;background:linear-gradient(to right,#fbbf24,#f59e0b);transition:width .6s ease}
        .dc-stock-fill.hot{background:linear-gradient(to right,#ef4444,#dc2626)}
        .dc-stock-txt{font-size:8.5px;font-weight:800;color:#f59e0b;white-space:nowrap}
        .dc-stock-txt.hot{color:#dc2626}
        .dc-info{padding:8px 10px 10px;display:flex;flex-direction:column;gap:2px;flex:1}
        .dc-seller{font-size:8.5px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.07em}
        .dc-name{font-size:12px;font-weight:600;color:#1f2937;line-height:1.38;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .dc[data-type="flash"]:hover .dc-name,.dc[data-type="discount"]:hover .dc-name,.dc[data-type="bundle"]:hover .dc-name{color:#db142e}
        .dc-desc{font-size:10px;color:#9ca3af;line-height:1.35;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin-top:1px}
        .dc-prices{display:flex;align-items:baseline;gap:5px;margin-top:3px}
        .dc-price{font-size:13px;font-weight:900;color:#db142e}
        .dc-orig{font-size:9.5px;font-weight:500;color:#bbb;text-decoration:line-through}
        .dc-save{font-size:9px;font-weight:700;color:#10b981;background:#f0fdf4;padding:1px 6px;border-radius:999px;display:inline-block;margin-top:2px}

        /* Grid */
        .dp-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}

        /* Skeletons */
        .dsk{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden}
        .dsk-img{aspect-ratio:3/4;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:dpShimmer 1.3s infinite linear}
        .dsk-bar{height:36px;background:linear-gradient(90deg,#fee2e2 25%,#fef2f2 50%,#fee2e2 75%);background-size:700px 100%;animation:dpShimmer 1.3s infinite linear}
        .dsk-body{padding:8px 10px 11px;display:flex;flex-direction:column;gap:6px}
        .dsk-ln{border-radius:4px;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:dpShimmer 1.3s infinite linear}

        /* Pagination */
        .pages{display:flex;align-items:center;justify-content:center;gap:5px;padding:28px 0 0;flex-wrap:wrap}
        .pgb{width:34px;height:34px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;color:#555;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .13s}
        .pgb:hover:not(:disabled){border-color:#db142e;color:#db142e}
        .pgb:disabled{opacity:.35;cursor:not-allowed}
        .pgb.on{background:#db142e;border-color:#db142e;color:#fff}
        .pg-sep{color:#bbb;font-size:13px;padding:0 3px}

        /* Empty */
        .dp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 24px;background:#fff;border-radius:12px;border:1px solid #eee;text-align:center;gap:10px;grid-column:1/-1}

        /* Responsive */
        @media(max-width:1400px){.dp-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:1100px){.dp-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:960px){
          .dp-layout{grid-template-columns:1fr;padding:0 16px 40px}
          .sbar-desk{display:none}.dp-mbar{display:flex}
          .dp-grid{grid-template-columns:repeat(3,1fr);gap:10px;padding-top:14px}
          .dp-hero-stats{grid-template-columns:1fr 1px 1fr 1px 1fr}
        }
        @media(max-width:600px){
          .dp-hero{padding:20px 16px 18px}
          .dp-grid{grid-template-columns:repeat(2,1fr);gap:8px}
        }
      `}</style>

      <Navbar />
      <div className="dp">

        {/* Hero */}
        <div className="dp-hero">
          <div className="dp-hero-inner">
            <div className="dp-hero-top">
              <div>
                <p className="dp-hero-eyebrow">ChooseTounsi Exclusive</p>
                <h1 className="dp-hero-title">Deals &amp; Offers 🔥</h1>
                <p className="dp-hero-sub">Flash sales, discounts &amp; curated bundles from Tunisia's best sellers</p>
              </div>
              <Link href="/" className="dp-hero-back">← Back to Home</Link>
            </div>

            {/* Stats — now 5 columns with Discounts added */}
            <div className="dp-hero-stats">
              <div className="dp-stat">
                <span className="dp-stat-icon">⚡</span>
                <span className="dp-stat-val">{loading ? '—' : flashCount}</span>
                <span className="dp-stat-lbl">Flash Deals</span>
              </div>
              <div className="dp-stat-div" />
              <div className="dp-stat">
                <span className="dp-stat-icon">🏷️</span>
                <span className="dp-stat-val">{loading ? '—' : discountCount}</span>
                <span className="dp-stat-lbl">Discounts</span>
              </div>
              <div className="dp-stat-div" />
              <div className="dp-stat">
                <span className="dp-stat-icon">📦</span>
                <span className="dp-stat-val">{loading ? '—' : bundleCount}</span>
                <span className="dp-stat-lbl">Bundles</span>
              </div>
              <div className="dp-stat-div" />
              <div className="dp-stat">
                <span className="dp-stat-icon">🔖</span>
                <span className="dp-stat-val">{loading ? '—' : `${Math.max(maxFlashDisc, maxDiscountDisc)}%`}</span>
                <span className="dp-stat-lbl">Max Off</span>
              </div>
              <div className="dp-stat-div" />
              <div className="dp-stat">
                <span className="dp-stat-icon">💰</span>
                <span className="dp-stat-val">{loading ? '—' : `${maxBundleSave}%`}</span>
                <span className="dp-stat-lbl">Bundle Save</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bar */}
        <div className="dp-mbar">
          <span className="dp-mbar-title">{sortedItems.length} Deals</span>
          <select className="dp-mbar-sort" value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value as SortKey }))}>
            {SORTS.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
          <button className="dp-mbar-filter" onClick={() => setMOpen(true)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
            Filters
            {filterCount > 0 && <span className="dp-filter-badge">{filterCount}</span>}
          </button>
        </div>

        {/* Layout */}
        <div className="dp-layout">
          <DealsSidebar f={filters} setF={setFilters} total={sortedItems.length} mOpen={mOpen} setMOpen={setMOpen} />

          <div>
            {loading ? (
              <div className="dp-grid">
                {Array.from({ length: 10 }).map((_, i) =>
                  i % 3 === 0 ? <FlashSkel key={i} /> : i % 3 === 1 ? <DiscountSkel key={i} /> : <BundleSkel key={i} />
                )}
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="dp-grid">
                <div className="dp-empty">
                  <span style={{ fontSize: '2.5rem' }}>🔍</span>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#374151' }}>No deals match your filters</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 260, lineHeight: 1.6 }}>Try adjusting your filters or clearing them to see all deals.</p>
                  <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ marginTop: 4, padding: '8px 18px', background: '#db142e', color: '#fff', fontWeight: 800, fontSize: 12, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Clear All Filters</button>
                  <Link href="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: '1.5px solid #e5e7eb', borderRadius: 8, color: '#374151', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>
                    Browse Products <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="dp-grid">
                  {displayedItems.map((item, i) =>
                    item._type === 'flash'    ? <FlashCard    key={item._id} item={item} idx={i} /> :
                    item._type === 'discount' ? <DiscountCard key={item._id} item={item} idx={i} /> :
                                                <BundleCard   key={item._id} item={item} idx={i} />
                  )}
                </div>
                <Pages cur={page} total={totalPages} go={n => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}