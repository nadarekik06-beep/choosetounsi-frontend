'use client'

/**
 * app/deals/page.tsx
 * ChooseTounsi — Bundle Deals listing page
 * Same SHEIN-level grid layout as the category page.
 * "Add to Cart" on a card → redirects to /deals/[slug] (variant selection required).
 */

import {
  useState, useEffect, useCallback,
  useMemo, useRef,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import {
  TrendingDown, Tag, Package2, ArrowRight,
} from 'lucide-react'

const ORIGIN  = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
const API_URL = `${ORIGIN}/api`

// ─── Money formatter (matches category page) ─────────────────────────────────
const money = (n: number) => `${Number(n).toFixed(2)} DT`

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackItem {
  id: number
  quantity: number
  product: {
    name: string
    primary_image_url: string | null
  } | null
}

interface Pack {
  id: number
  name: string
  slug: string
  short_description: string | null
  image_url: string | null
  pack_price: number
  original_price: number
  savings: number
  items_count: number
  items: PackItem[]
  seller: { id: number; name: string } | null
}

interface Paginated {
  data: Pack[]
  current_page: number
  last_page: number
  total: number
}

// ─── Savings % helper ─────────────────────────────────────────────────────────
function savingsPct(pack: Pack): number | null {
  if (pack.original_price > 0 && pack.savings > 0) {
    return Math.round((pack.savings / pack.original_price) * 100)
  }
  return null
}

// ─── Pack Card — styled exactly like the category Card ───────────────────────
function PackCard({ pack, idx }: { pack: Pack; idx: number }) {
  const router   = useRouter()
  const [hov,    setHov]   = useState(false)
  const [imgErr, setErr]   = useState(false)

  const pct = savingsPct(pack)

  // Resolve image URL — handle both full URLs and storage paths
  const resolveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${ORIGIN}/storage/${url.replace(/^\/storage\//, '').replace(/^\//, '')}`
  }

  // Build gallery: pack cover → product thumbnails
  const gallery = useMemo<string[]>(() => {
    const out: string[] = []
    const cover = resolveUrl(pack.image_url)
    if (cover) out.push(cover)
    pack.items.forEach(i => {
      const thumb = resolveUrl(i.product?.primary_image_url)
      if (thumb && !out.includes(thumb)) out.push(thumb)
    })
    return out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack])

  // Slide animation between images on hover
  const [cur,    setCur]  = useState(0)
  const [prev,   setPrev] = useState<number | null>(null)
  const [slide,  setSlide]= useState(false)
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const advance = useCallback(() => {
    if (gallery.length < 2) return
    setCur(c => {
      const next = (c + 1) % gallery.length
      setPrev(c); setSlide(true)
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
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    resetRef.current = setTimeout(() => { setCur(0); setPrev(null); setSlide(false) }, 600)
  }
  useEffect(() => () => {
    if (tickRef.current)  clearInterval(tickRef.current)
    if (resetRef.current) clearTimeout(resetRef.current)
  }, [])

  // "Add to Cart" from listing → detail page (variant selection required)
  const handleCTA = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/deals/${pack.slug}`)
  }

  // Fallback: 2×2 product thumbnail mosaic when no pack cover image
  const showMosaic = gallery.length === 0 || (gallery.length > 0 && imgErr && !pack.image_url)
  const thumbs = pack.items
    .map(i => resolveUrl(i.product?.primary_image_url))
    .filter(Boolean) as string[]

  return (
    <Link
      href={`/deals/${pack.slug}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ '--d': `${Math.min(idx * 0.042, 0.5)}s` } as React.CSSProperties}
      className="shc"
    >
      {/* ── Image stage ── */}
      <div className="shc-stage">

        {/* Slide-out layer */}
        {slide && prev !== null && gallery[prev] && (
          <div className="shc-layer shc-layer-out">
            <img src={gallery[prev]} alt="" className="shc-img" draggable={false} />
          </div>
        )}

        {/* Main layer */}
        <div className={`shc-layer${slide ? ' shc-layer-in' : ''}${hov && !slide ? ' shc-layer-zoom' : ''}`}>
          {showMosaic && thumbs.length >= 2 ? (
            /* 2×2 mosaic */
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              width: '100%', height: '100%', gap: 2,
            }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: '#f1f5f9', overflow: 'hidden' }}>
                  {thumbs[i] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbs[i]}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : gallery[cur] && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gallery[cur]}
              alt={pack.name}
              className="shc-img"
              onError={() => setErr(true)}
              draggable={false}
            />
          ) : (
            <div className="shc-noimg">
              <Package2 size={36} color="#ccc" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="shc-badges">
          {pct !== null && (
            <span className="shc-badge shc-disc">-{pct}%</span>
          )}
          <span className="shc-badge" style={{
            background: 'rgba(15,23,42,0.75)',
            color: '#fff',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Tag size={8} />
            {pack.items_count} items
          </span>
        </div>

        {/* Image dots */}
        {gallery.length > 1 && (
          <div className="shc-dots">
            {gallery.slice(0, 5).map((_, i) => (
              <span key={i} className={`shc-dot${i === cur ? ' on' : ''}`} />
            ))}
          </div>
        )}

        {/* CTA bar — slides up on hover */}
        <div className={`shc-cta${hov ? ' show' : ''}`}>
          <button
            className="shc-add"
            onClick={handleCTA}
          >
            <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>View Bundle</span>
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="shc-info">
        {pack.seller?.name && (
          <p className="shc-seller">{pack.seller.name}</p>
        )}

        <p className="shc-name">{pack.name}</p>

        {pack.short_description && (
          <p className="shc-desc">{pack.short_description}</p>
        )}

        <div className="shc-prices">
          <span className="shc-price">{money(pack.pack_price)}</span>
          {pack.original_price > pack.pack_price && (
            <span className="shc-orig">{money(pack.original_price)}</span>
          )}
        </div>

        {pack.savings > 0 && (
          <p className="shc-low" style={{ color: '#10b981', background: '#f0fdf4' }}>
            Save {money(pack.savings)}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
const Skel = () => (
  <div className="shsk">
    <div className="shsk-img" />
    <div className="shsk-body">
      <div className="shsk-ln" style={{ width: '42%', height: 9 }} />
      <div className="shsk-ln" style={{ width: '75%', height: 13, marginTop: 5 }} />
      <div className="shsk-ln" style={{ width: '35%', height: 15, marginTop: 6 }} />
    </div>
  </div>
)

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pages({ cur, total, go }: { cur: number; total: number; go: (p: number) => void }) {
  if (total <= 1) return null
  const ps = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - cur) <= 1)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])
  return (
    <div className="pages">
      <button className="pgb" onClick={() => go(Math.max(1, cur - 1))} disabled={cur === 1}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      {ps.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} className="pg-sep">…</span>
          : <button key={p} className={`pgb${cur === p ? ' on' : ''}`} onClick={() => go(p as number)}>{p}</button>
      )}
      <button className="pgb" onClick={() => go(Math.min(total, cur + 1))} disabled={cur === total}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  )
}

// ─── Sort bar ─────────────────────────────────────────────────────────────────
type Sort = 'created_at' | 'savings_desc' | 'price_asc' | 'price_desc'
const SORTS: { k: Sort; l: string }[] = [
  { k: 'created_at',   l: 'Newest First' },
  { k: 'savings_desc', l: 'Biggest Savings' },
  { k: 'price_asc',    l: 'Price: Low → High' },
  { k: 'price_desc',   l: 'Price: High → Low' },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DealsPage() {
  const [packs,   setPacks]   = useState<Paginated | null>(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [sort,    setSort]    = useState<Sort>('created_at')
  const [q,       setQ]       = useState('')
  const [mSort,   setMSort]   = useState(false) // mobile sort dropdown

  const fetchPacks = useCallback(async () => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      qp.set('page',     String(page))
      qp.set('per_page', '12')
      qp.set('sort',     sort)
      const r = await fetch(`${API_URL}/packs?${qp}`, {
        headers: { Accept: 'application/json' },
      })
      if (!r.ok) throw new Error()
      const json = await r.json()

      // Handle all possible response shapes from PublicPackController:
      // Shape A (paginated): { data: { data: [...], current_page, last_page, total } }
      // Shape B (flat):      { data: [...] }
      // Shape C (raw):       { data: [...], current_page, last_page, total }
      let paginatedResult: Paginated

      if (json.data && typeof json.data === 'object' && 'data' in json.data && Array.isArray(json.data.data)) {
        // Shape A — standard Laravel paginate() wrapped in a resource
        paginatedResult = json.data as Paginated
      } else if (json.data && typeof json.data === 'object' && 'current_page' in json.data) {
        // Shape C — paginate() at top level inside data
        paginatedResult = json.data as Paginated
      } else if (Array.isArray(json.data)) {
        // Shape B — flat array
        paginatedResult = { data: json.data, current_page: 1, last_page: 1, total: json.data.length }
      } else if (Array.isArray(json)) {
        // Shape D — bare array
        paginatedResult = { data: json, current_page: 1, last_page: 1, total: json.length }
      } else {
        paginatedResult = { data: [], current_page: 1, last_page: 1, total: 0 }
      }

      setPacks(paginatedResult)
    } catch {
      setPacks(null)
    } finally {
      setLoading(false)
    }
  }, [page, sort])

  useEffect(() => { fetchPacks() }, [fetchPacks])
  useEffect(() => { setPage(1) },  [sort])

  // Client-side search filter
  const displayed = useMemo(() => {
    if (!packs?.data) return []
    if (!q.trim()) return packs.data
    const lq = q.toLowerCase()
    return packs.data.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.short_description?.toLowerCase().includes(lq) ||
      p.seller?.name?.toLowerCase().includes(lq)
    )
  }, [packs, q])

  const totalPacks = packs?.total ?? 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shFadeUp   { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:none} }
        @keyframes shShimmer  { 0%{background-position:-700px 0} 100%{background-position:700px 0} }
        @keyframes shSpin     { to{transform:rotate(360deg)} }
        @keyframes shSlideL   { from{transform:translateX(0%)}   to{transform:translateX(-100%)} }
        @keyframes shSlideR   { from{transform:translateX(100%)} to{transform:translateX(0%)} }
        @keyframes shFadeIn   { from{opacity:0} to{opacity:1} }

        .dpage { min-height:100vh; background:#f6f6f7; font-family:'Outfit',sans-serif; color:#111; }

        /* ── Hero banner ── */
        .dp-hero {
          background: linear-gradient(135deg, #db142e 0%, #7f1d1d 100%);
          padding: 36px 24px;
          position: relative; overflow: hidden;
        }
        .dp-hero::before {
          content:'';
          position:absolute; inset:0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .dp-hero-inner { max-width:1520px; margin:0 auto; position:relative; z-index:1; }
        .dp-hero h1 { font-size:clamp(1.6rem,3vw,2.4rem); font-weight:900; color:#fff; letter-spacing:-0.02em; margin-bottom:6px; }
        .dp-hero p  { font-size:14px; color:rgba(255,255,255,0.75); font-weight:500; }
        .dp-hero-stats {
          display:flex; gap:24px; margin-top:20px; flex-wrap:wrap;
        }
        .dp-stat {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
          border-radius: 10px; padding: 10px 18px;
          display: flex; flex-direction: column; align-items: center;
        }
        .dp-stat strong { font-size:20px; font-weight:900; color:#fff; }
        .dp-stat span   { font-size:11px; color:rgba(255,255,255,0.7); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }

        /* ── Toolbar ── */
        .dp-toolbar {
          background:#fff; border-bottom:1px solid #eee;
          position: sticky; top: 0; z-index: 40;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .dp-toolbar-inner {
          max-width:1520px; margin:0 auto;
          padding:0 24px;
          display:flex; align-items:center; gap:12px; height:52px;
          flex-wrap:nowrap;
        }
        .dp-search {
          display:flex; align-items:center; gap:7px;
          background:#f8f8f8; border:1.5px solid #eee;
          border-radius:8px; padding:6px 12px;
          flex:1; max-width:340px; transition:border-color .13s;
        }
        .dp-search:focus-within { border-color:#db142e; }
        .dp-search input {
          flex:1; border:none; background:transparent;
          font-size:12.5px; font-family:'Outfit',sans-serif; color:#111; outline:none;
        }
        .dp-search input::placeholder { color:#ccc; }
        .dp-sort-group { display:flex; gap:6px; margin-left:auto; }
        .dp-sort-btn {
          padding:6px 12px; border-radius:7px; font-size:12px; font-weight:600;
          font-family:'Outfit',sans-serif; cursor:pointer;
          border:1.5px solid #e5e7eb; background:#fff; color:#555;
          white-space:nowrap; transition:all .13s;
        }
        .dp-sort-btn:hover { border-color:#db142e; color:#db142e; }
        .dp-sort-btn.on   { background:#db142e; border-color:#db142e; color:#fff; }
        .dp-count { font-size:11px; color:#bbb; font-weight:500; white-space:nowrap; }

        /* ── Main layout ── */
        .dp-main { max-width:1520px; margin:0 auto; padding:22px 32px 60px; }

        /* ── Grid — exactly like .shgrid ── */
        .dp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:13px; }

        /* ── Reuse ALL .shc / .shc-* classes from category page ── */
        .shc{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;cursor:pointer;animation:shFadeUp .42s ease both;animation-delay:var(--d,0s);transition:box-shadow .22s,transform .22s,border-color .2s;will-change:transform}
        .shc:hover{box-shadow:0 12px 38px rgba(0,0,0,.11);border-color:#e0e0e0;transform:translateY(-4px)}
        .shc-stage{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#f5f5f5;flex-shrink:0}
        .shc-layer{position:absolute;inset:0;will-change:transform}
        .shc-layer-out{z-index:1;animation:shSlideL .52s cubic-bezier(.77,0,.175,1) forwards}
        .shc-layer-in{z-index:2;animation:shSlideR .52s cubic-bezier(.77,0,.175,1) forwards}
        .shc-layer-zoom{transform:scale(1.055);transition:transform .55s cubic-bezier(.25,.46,.45,.94)}
        .shc-img{width:100%;height:100%;object-fit:cover;display:block}
        .shc-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f4f4f6}
        .shc-badges{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:5}
        .shc-badge{font-size:8px;font-weight:900;padding:2px 6px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
        .shc-disc{background:#db142e;color:#fff}
        .shc-dots{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:5}
        .shc-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);transition:all .22s}
        .shc-dot.on{background:#fff;width:15px;border-radius:3px}
        .shc-cta{position:absolute;bottom:0;left:0;right:0;padding:0 9px 9px;z-index:6;transform:translateY(110%);opacity:0;transition:transform .3s cubic-bezier(.34,1.48,.64,1),opacity .22s}
        .shc-cta.show{transform:translateY(0);opacity:1}
        .shc-add{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:9px 10px;background:#db142e;color:#fff;font-size:12px;font-weight:800;border:none;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;box-shadow:0 4px 14px rgba(219,20,46,.38);transition:background .13s,transform .11s;letter-spacing:.01em}
        .shc-add:hover:not(:disabled){background:#b91c1c;transform:scale(1.01)}
        .shc-info{padding:9px 11px 12px;display:flex;flex-direction:column;gap:3px;flex:1}
        .shc-seller{font-size:9px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.07em}
        .shc-name{font-size:12.5px;font-weight:600;color:#1f2937;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .shc:hover .shc-name{color:#db142e}
        .shc-desc{font-size:10.5px;font-weight:400;color:#9ca3af;line-height:1.4;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin-top:1px}
        .shc-prices{display:flex;align-items:baseline;gap:5px;margin-top:3px}
        .shc-price{font-size:13.5px;font-weight:900;color:#db142e}
        .shc-orig{font-size:10px;font-weight:500;color:#bbb;text-decoration:line-through}
        .shc-low{font-size:9.5px;font-weight:700;color:#f97316;background:#fff7ed;padding:1px 7px;border-radius:999px;display:inline-block;margin-top:2px}

        /* ── Skeletons ── */
        .shsk{background:#fff;border-radius:11px;border:1px solid #eee;overflow:hidden}
        .shsk-img{aspect-ratio:3/4;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:shShimmer 1.3s infinite linear}
        .shsk-body{padding:9px 11px 12px;display:flex;flex-direction:column;gap:7px}
        .shsk-ln{border-radius:4px;background:linear-gradient(90deg,#f2f2f2 25%,#fafafa 50%,#f2f2f2 75%);background-size:700px 100%;animation:shShimmer 1.3s infinite linear}

        /* ── Pagination ── */
        .pages{display:flex;align-items:center;justify-content:center;gap:5px;padding:28px 0 0;flex-wrap:wrap}
        .pgb{width:34px;height:34px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;color:#555;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .13s}
        .pgb:hover:not(:disabled){border-color:#db142e;color:#db142e}
        .pgb:disabled{opacity:.35;cursor:not-allowed}
        .pgb.on{background:#db142e;border-color:#db142e;color:#fff}
        .pg-sep{color:#bbb;font-size:13px;padding:0 3px}

        /* ── Empty state ── */
        .dp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 24px;background:#fff;border-radius:12px;border:1px solid #eee;text-align:center;gap:10px}

        /* ── Responsive ── */
        @media(max-width:1260px) { .dp-grid{grid-template-columns:repeat(3,1fr)} }
        @media(max-width:920px)  {
          .dp-main{padding:14px 15px 40px}
          .dp-grid{grid-template-columns:repeat(3,1fr);gap:10px}
          .dp-sort-group { display:none; }
        }
        @media(max-width:560px)  {
          .dp-grid{grid-template-columns:repeat(2,1fr);gap:8px}
          .dp-hero{padding:24px 16px}
          .dp-main{padding:10px 10px 30px}
        }
      `}</style>

      <Navbar />

      <div className="dpage">

        {/* ── Hero Banner ── */}
        <div className="dp-hero">
          <div className="dp-hero-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Package2 size={20} color="#fff" />
                  </div>
                  <h1 className="dp-hero" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                    Bundle Deals 🎁
                  </h1>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  Save more when you buy together — curated bundles from Tunisian sellers
                </p>
              </div>
              <Link href="/" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700,
                color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '8px 14px', borderRadius: 999,
                transition: 'background 0.15s',
              }}>
                ← Back to Home
              </Link>
            </div>

            {totalPacks > 0 && (
              <div className="dp-hero-stats">
                <div className="dp-stat">
                  <strong>{totalPacks}</strong>
                  <span>Bundles</span>
                </div>
                <div className="dp-stat">
                  <strong>
                    {packs?.data
                      ? Math.max(...packs.data.map(p => {
                          const pct = savingsPct(p)
                          return pct ?? 0
                        }))
                      : 0}%
                  </strong>
                  <span>Max Savings</span>
                </div>
                <div className="dp-stat">
                  <strong>🇹🇳</strong>
                  <span>Local Sellers</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Toolbar ── */}
        <div className="dp-toolbar">
          <div className="dp-toolbar-inner">
            {/* Search */}
            <div className="dp-search">
              <svg width="12" height="12" fill="none" stroke="#bbb" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="Search bundles…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex', padding: 0 }}
                >
                  <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Sort buttons */}
            <div className="dp-sort-group">
              {SORTS.map(s => (
                <button
                  key={s.k}
                  className={`dp-sort-btn${sort === s.k ? ' on' : ''}`}
                  onClick={() => setSort(s.k)}
                >
                  {s.l}
                </button>
              ))}
            </div>

            {/* Count */}
            {totalPacks > 0 && (
              <span className="dp-count" style={{ marginLeft: 'auto' }}>
                {displayed.length}/{totalPacks}
              </span>
            )}
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="dp-main">
          {loading ? (
            <div className="dp-grid">
              {Array.from({ length: 12 }).map((_, i) => <Skel key={i} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="dp-empty">
              <Package2 size={52} style={{ color: '#d1d5db', display: 'block', margin: '0 auto' }} />
              <p style={{ fontSize: 16, fontWeight: 800, color: '#374151', margin: 0 }}>
                {q ? `No bundles matching "${q}"` : 'No bundle deals yet'}
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
                {q ? 'Try a different search term.' : 'Check back soon — sellers are creating bundles!'}
              </p>
              {q && (
                <button
                  onClick={() => setQ('')}
                  style={{
                    marginTop: 8, padding: '9px 20px',
                    background: '#db142e', color: '#fff',
                    fontWeight: 800, fontSize: 12, border: 'none',
                    borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Clear Search
                </button>
              )}
              <Link href="/shop" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', border: '1.5px solid #e5e7eb',
                borderRadius: 8, color: '#374151', textDecoration: 'none',
                fontWeight: 700, fontSize: 12,
              }}>
                Browse Products <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <>
              <div className="dp-grid">
                {displayed.map((pack, i) => (
                  <PackCard key={pack.id} pack={pack} idx={i} />
                ))}
              </div>
              {packs && (
                <Pages
                  cur={page}
                  total={packs.last_page}
                  go={n => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}