'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SearchProduct {
  id:               number;
  name:             string;
  slug:             string;
  description:      string | null;
  price:            number;
  stock:            number;
  views:            number;
  featured:         boolean;
  category_name:    string | null;
  category_slug:    string | null;
  subcategory_name: string | null;
  subcategory_slug: string | null;
  primary_image:    string | null;
}

// ─── Placeholder ──────────────────────────────────────────────────────────────
function PlaceholderImg({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" fill="#f1f5f9"/>
      <rect x="20" y="18" width="40" height="32" rx="4" fill="#e2e8f0"/>
      <circle cx="30" cy="28" r="4" fill="#cbd5e1"/>
      <path d="M20 42l14-12 10 10 8-6 8 8v8H20V42z" fill="#cbd5e1"/>
    </svg>
  );
}

// ─── Did You Mean Banner ──────────────────────────────────────────────────────
function DidYouMeanBanner({ original, corrected, onAccept, onDismiss }: {
  original: string; corrected: string; onAccept: () => void; onDismiss: () => void;
}) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      background:"linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%)",
      border:"1.5px solid #fcd34d", borderRadius:14,
      padding:"14px 20px", marginBottom:28,
      animation:"slideDown 0.3s ease", flexWrap:"wrap",
    }}>
      <div style={{ width:48, height:48, borderRadius:"50%", background:"#fef3c7", border:"2px solid #fbbf24", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="22" height="22" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          <path d="M11 8v3l2 2" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex:1, minWidth:200 }}>
        <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#92400e", textTransform:"uppercase", letterSpacing:"0.07em" }}>Did you mean?</p>
        <p style={{ margin:0, fontSize:14, color:"#78350f" }}>
          Showing results for{" "}
          <button onClick={onAccept} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:900, color:"#db142e", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3 }}>
            {corrected}
          </button>
          {" "}instead of <span style={{ fontStyle:"italic", color:"#92400e", fontWeight:600 }}>"{original}"</span>
        </p>
      </div>
      <button onClick={onDismiss} style={{ background:"transparent", border:"1.5px solid #d97706", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#92400e", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
        Search "{original}"
      </button>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background:"transparent", border:"none", cursor:"pointer", padding:4, color:"#d97706", lineHeight:1, flexShrink:0 }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ─── Inline Search Bar ────────────────────────────────────────────────────────
function InlineSearchBar({ initialQuery }: { initialQuery: string }) {
  const router    = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [suggs, setSuggs]     = useState<string[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [focused, setFocused]   = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggs = useCallback(async (val: string) => {
    if (val.length < 2) { setSuggs([]); return; }
    try {
      const res = await fetch(`${API_URL}/api/search/suggestions?q=${encodeURIComponent(val)}&limit=8`, { headers: { Accept:"application/json" } });
      if (!res.ok) return;
      setSuggs((await res.json()).suggestions ?? []);
    } catch { setSuggs([]); }
  }, []);

  const handleChange = (val: string) => {
    setQ(val); setShowDrop(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => fetchSuggs(val), 300);
  };

  const doSearch = (term: string) => {
    setSuggs([]); setShowDrop(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div style={{ position:"relative", maxWidth:580, width:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", background:"#f8fafc", border:`2px solid ${focused ? "#db142e" : "#e5e7eb"}`, borderRadius:14, overflow:"hidden", transition:"border-color 0.2s" }}>
        <svg style={{ marginLeft:14, flexShrink:0 }} width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input ref={inputRef} value={q}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) doSearch(q); if (e.key === "Escape") setShowDrop(false); }}
          onFocus={() => { setFocused(true); setShowDrop(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowDrop(false), 150); }}
          placeholder="Search products, brands..."
          style={{ flex:1, border:"none", background:"transparent", padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#111", outline:"none" }}
        />
        {q && <button onClick={() => { setQ(""); setSuggs([]); inputRef.current?.focus(); }} style={{ background:"none", border:"none", cursor:"pointer", padding:"0 8px", color:"#94a3b8" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>}
        <button onClick={() => q.trim() && doSearch(q)} style={{ background:"#db142e", border:"none", cursor:"pointer", padding:"0 18px", height:"100%", minHeight:46, color:"#fff", display:"flex", alignItems:"center" }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
      </div>
      {showDrop && suggs.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#fff", border:"1.5px solid #f1f5f9", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,0.10)", zIndex:999, overflow:"hidden", animation:"slideDown 0.15s ease" }}>
          {suggs.map((s, i) => (
            <button key={i} onMouseDown={() => doSearch(s)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:"none", border:"none", borderBottom: i < suggs.length-1 ? "1px solid #f8fafc" : "none", padding:"11px 16px", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ fontSize:13, color:"#374151" }}>
                <strong style={{ color:"#db142e" }}>{s.slice(0, q.length)}</strong>{s.slice(q.length)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, rank }: { product: SearchProduct; rank?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const imageUrl = product.primary_image && !imgErr ? product.primary_image : null;
  const label    = product.subcategory_name ?? product.category_name;
  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration:"none", color:"inherit", display:"block" }}>
      <div className="pcard">
        <div style={{ position:"relative", aspectRatio:"3/4", background:"#f8fafc", overflow:"hidden" }}>
          {imageUrl
            ? <img src={imageUrl} alt={product.name} className="pcard-img" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s ease" }} onError={() => setImgErr(true)}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><PlaceholderImg/></div>
          }
          <div style={{ position:"absolute", top:10, left:10, display:"flex", flexDirection:"column", gap:5 }}>
            {product.featured && <span style={{ background:"#dc2626", color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:999, letterSpacing:"0.06em", textTransform:"uppercase" }}>Featured</span>}
            {rank && rank <= 3 && <span style={{ background:"#0f172a", color:"#fbbf24", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:999, letterSpacing:"0.06em", textTransform:"uppercase" }}>Top {rank}</span>}
          </div>
          {product.stock === 0 && (
            <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ background:"#0f172a", color:"#fff", fontSize:11, fontWeight:800, padding:"5px 14px", borderRadius:999 }}>Sold Out</span>
            </div>
          )}
        </div>
        <div style={{ padding:"12px 14px 14px" }}>
          {label && <p style={{ fontSize:10, fontWeight:800, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 5px" }}>{label}</p>}
          <h3 style={{ fontSize:13, fontWeight:700, color:"#111", margin:"0 0 10px", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {product.name}
          </h3>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:16, fontWeight:900, color:"#dc2626", letterSpacing:"-0.02em" }}>
              {Number(product.price).toFixed(2)} <span style={{ fontSize:11, fontWeight:700 }}>DT</span>
            </span>
            <span style={{ fontSize:10, fontWeight:700, color: product.stock===0 ? "#94a3b8":"#16a34a", background: product.stock===0 ? "#f1f5f9":"rgba(22,163,74,0.08)", padding:"2px 8px", borderRadius:999 }}>
              {product.stock === 0 ? "Out of stock" : "In stock"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, accentColor, subtitle }: {
  icon: React.ReactNode; title: string; count: number; accentColor: string; subtitle?: string;
}) {
  const bg = accentColor === "#db142e" ? "rgba(219,20,46,0.08)"
           : accentColor === "#198f41" ? "rgba(25,143,65,0.08)"
           : "rgba(99,102,241,0.08)";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22 }}>
      <div style={{ width:42, height:42, borderRadius:13, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h2 style={{ fontSize:17, fontWeight:900, color:"#0f172a", margin:0, letterSpacing:"-0.01em" }}>{title}</h2>
          <span style={{ fontSize:11, fontWeight:800, color:accentColor, background:bg, padding:"2px 10px", borderRadius:999 }}>{count}</span>
        </div>
        {subtitle && <p style={{ margin:0, fontSize:12, color:"#94a3b8", marginTop:2 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, margin:"52px 0 32px" }}>
      <div style={{ flex:1, height:1, background:"#f1f5f9" }}/>
      <span style={{ fontSize:11, fontWeight:800, color:"#cbd5e1", textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>{label}</span>
      <div style={{ flex:1, height:1, background:"#f1f5f9" }}/>
    </div>
  );
}

// ─── Product Grid ─────────────────────────────────────────────────────────────
function ProductGrid({ products, showRank = false, rankOffset = 0 }: {
  products: SearchProduct[]; showRank?: boolean; rankOffset?: number;
}) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:18 }}>
      {products.map((p, i) => <ProductCard key={p.id} product={p} rank={showRank ? rankOffset + i + 1 : undefined}/>)}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", border:"1px solid #f1f5f9" }}>
      <div style={{ aspectRatio:"3/4", background:"linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
      <div style={{ padding:"12px 14px 14px" }}>
        {[40,90,60,45].map((w,i) => <div key={i} style={{ height: i===3?16:i===0?10:13, width:`${w}%`, background:"#f1f5f9", borderRadius:6, marginBottom: i<3?8:0, animation:"shimmer 1.4s infinite" }}/>)}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isImage, query }: { isImage: boolean; query: string }) {
  return (
    <div style={{ textAlign:"center", padding:"80px 24px" }}>
      <div style={{ width:80, height:80, borderRadius:"50%", background:"#f8fafc", border:"2px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
        <svg width="32" height="32" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <h2 style={{ fontSize:18, fontWeight:800, color:"#374151", margin:"0 0 8px" }}>No results found</h2>
      <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 28px", lineHeight:1.6 }}>
        {isImage ? "No visually similar products found. Try a clearer photo." : `No products matched "${query}". Try different keywords.`}
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <Link href="/shop" style={{ padding:"10px 22px", background:"#dc2626", color:"#fff", borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>Browse Shop</Link>
        <Link href="/"    style={{ padding:"10px 22px", background:"#f8fafc", color:"#374151", border:"1px solid #e5e7eb", borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>Back to Home</Link>
      </div>
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = "relevance" | "price_asc" | "price_desc" | "popular";
function applySort(products: SearchProduct[], sort: SortKey): SearchProduct[] {
  const c = [...products];
  if (sort === "price_asc")  return c.sort((a,b) => a.price - b.price);
  if (sort === "price_desc") return c.sort((a,b) => b.price - a.price);
  if (sort === "popular")    return c.sort((a,b) => b.views - a.views);
  return c;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function SearchPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryParam   = searchParams.get("q")    ?? "";
  const modeParam    = searchParams.get("mode") ?? "";
  const idsParam     = searchParams.get("ids")  ?? "";

  // Sectioned (text search)
  const [directHits,   setDirectHits]   = useState<SearchProduct[]>([]);
  const [sameCategory, setSameCategory] = useState<SearchProduct[]>([]);
  const [related,      setRelated]      = useState<SearchProduct[]>([]);
  // Flat (image search)
  const [flatProducts, setFlatProducts] = useState<SearchProduct[]>([]);

  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [source,          setSource]          = useState<string | null>(null);
  const [searched,        setSearched]        = useState(false);
  const [imagePreview,    setImagePreview]    = useState<string | null>(null);
  const [sort,            setSort]            = useState<SortKey>("relevance");
  const [trendingNow,     setTrendingNow]     = useState<SearchProduct[]>([]);
  const [didYouMean,      setDidYouMean]      = useState<string | null>(null);
  const [originalQuery,   setOriginalQuery]   = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Reset on new query
  useEffect(() => {
    setBannerDismissed(false); setDidYouMean(null);
    setDirectHits([]); setSameCategory([]); setRelated([]); setFlatProducts([]);
  }, [queryParam]);

  useEffect(() => {
    const stored = sessionStorage.getItem("searchImagePreview");
    if (stored && modeParam === "image") { setImagePreview(stored); sessionStorage.removeItem("searchImagePreview"); }
  }, [modeParam]);

  // Trending
  useEffect(() => {
    fetch(`${API_URL}/api/sponsorships/public?limit=4`, { headers: { Accept:"application/json" } })
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return;
        setTrendingNow((data.data ?? []).map((p: any) => ({
          id:p.id, name:p.name, slug:p.slug, description:p.description??null,
          price:Number(p.price), stock:p.stock??0, views:p.views??0, featured:p.featured??false,
          category_name:p.category?.name??null, category_slug:p.category?.slug??null,
          subcategory_name:null, subcategory_slug:null, primary_image:p.primary_image_url??null,
        })));
      }).catch(() => {});
  }, []);

  // Trigger search
  useEffect(() => {
    if (modeParam === "image" && idsParam) {
      const ids = idsParam.split(",").map(Number).filter(Boolean);
      if (!ids.length) { setSearched(true); return; }
      fetchByIds(ids); return;
    }
    if (queryParam.trim()) doTextSearch(queryParam.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, modeParam, idsParam]);

  async function doTextSearch(q: string) {
    setLoading(true); setError(null); setOriginalQuery(q);
    try {
      const res = await fetch(`${API_URL}/api/search/text`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ query: q, limit: 40 }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      // New sectioned shape from controller
      if (data.sections) {
        setDirectHits(data.sections.direct          ?? []);
        setSameCategory(data.sections.same_category ?? []);
        setRelated(data.sections.related            ?? []);
        setFlatProducts([]);
      } else {
        // Old flat shape — best-effort split
        const all: SearchProduct[] = data.products ?? [];
        setDirectHits(all.slice(0, Math.min(4, all.length)));
        setSameCategory([]);
        setRelated(all.slice(4));
        setFlatProducts([]);
      }

      setSource(data.source ?? "ai");

      if (data.did_you_mean && data.did_you_mean !== q) {
        setDidYouMean(data.did_you_mean); setBannerDismissed(false);
      } else {
        setDidYouMean(null);
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  async function fetchByIds(ids: number[]) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products/by-ids`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setFlatProducts(data.products ?? []);
      setDirectHits([]); setSameCategory([]); setRelated([]);
      setSource("ai");
    } catch {
      setError("Failed to load image search results.");
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  const isImageSearch  = modeParam === "image";
  const hasAnySections = directHits.length > 0 || sameCategory.length > 0 || related.length > 0;
  const totalCount     = directHits.length + sameCategory.length + related.length + flatProducts.length;
  const showBanner     = !!didYouMean && !bannerDismissed && searched && !loading;
  const catLabel       = sameCategory[0]?.category_name ?? directHits[0]?.category_name ?? "Category";

  const title = isImageSearch ? "Visual Search Results"
              : queryParam    ? `"${queryParam}"`
              :                 "Search Results";

  return (
    <>
      <style>{`
        @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .pcard { background:#fff; border-radius:14px; overflow:hidden; border:1px solid #f1f5f9; transition:box-shadow 0.22s,transform 0.22s; cursor:pointer; }
        .pcard:hover { box-shadow:0 12px 40px rgba(0,0,0,0.10); transform:translateY(-3px); }
        .pcard:hover .pcard-img { transform:scale(1.04); }
        .sort-btn { background:transparent; border:1.5px solid #e5e7eb; border-radius:8px; padding:6px 14px; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .sort-btn:hover,.sort-btn.active { background:#0f172a; border-color:#0f172a; color:#fff; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#f9fafb" }}>

        {/* ── Header ── */}
        <div style={{ background:"#fff", borderBottom:"1px solid #f1f5f9", padding:"24px 0 0" }}>
          <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 24px" }}>

            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#94a3b8", marginBottom:14 }}>
              <Link href="/" style={{ color:"#94a3b8", textDecoration:"none" }}>Home</Link>
              <span>/</span>
              <span style={{ color:"#374151", fontWeight:600 }}>{isImageSearch ? "Visual Search" : "Search"}</span>
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap", paddingBottom:20 }}>
              {imagePreview && (
                <div style={{ position:"relative", flexShrink:0 }}>
                  <img src={imagePreview} alt="Query" style={{ width:72, height:72, objectFit:"cover", borderRadius:12, border:"2.5px solid #dc2626", display:"block" }}/>
                  <div style={{ position:"absolute", bottom:-6, right:-6, width:22, height:22, background:"#dc2626", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #fff" }}>
                    <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </div>
                </div>
              )}

              <div style={{ flex:1, minWidth:0 }}>
                <h1 style={{ fontSize:26, fontWeight:900, color:"#0f172a", margin:"0 0 14px", letterSpacing:"-0.02em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {title}
                </h1>
                {!isImageSearch && <InlineSearchBar initialQuery={queryParam}/>}
                {searched && !loading && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginTop:12 }}>
                    <span style={{ fontSize:13, color:"#64748b" }}>
                      <strong style={{ color:"#0f172a" }}>{totalCount}</strong> product{totalCount !== 1 ? "s" : ""} found
                    </span>
                    {source === "ai" && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#198f41", background:"rgba(25,143,65,0.08)", padding:"2px 10px", borderRadius:999, border:"1px solid rgba(25,143,65,0.2)" }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="#198f41"><circle cx="5" cy="5" r="5"/></svg>
                        {isImageSearch ? "AI visual match" : "AI semantic match"}
                      </span>
                    )}
                    {source === "fallback" && <span style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>keyword search</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Sort */}
            {(hasAnySections || flatProducts.length > 0) && (
              <div style={{ display:"flex", alignItems:"center", gap:8, paddingBottom:16, overflowX:"auto" }}>
                <span style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>Sort</span>
                {([ {key:"relevance",label:"Best Match"},{key:"popular",label:"Most Popular"},{key:"price_asc",label:"Price ↑"},{key:"price_desc",label:"Price ↓"} ] as {key:SortKey;label:string}[]).map(s => (
                  <button key={s.key} onClick={() => setSort(s.key)} className={`sort-btn ${sort===s.key?"active":""}`}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"32px 24px 64px" }}>

          {/* Did You Mean */}
          {showBanner && didYouMean && (
            <DidYouMeanBanner
              original={originalQuery} corrected={didYouMean}
              onAccept={() => { setBannerDismissed(true); router.push(`/search?q=${encodeURIComponent(didYouMean)}`); }}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:18 }}>
              {Array.from({length:12}).map((_,i) => <SkeletonCard key={i}/>)}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign:"center", padding:"80px 24px" }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
              <p style={{ fontSize:16, fontWeight:700, color:"#ef4444", marginBottom:16 }}>{error}</p>
              <button onClick={() => queryParam ? doTextSearch(queryParam) : window.history.back()} style={{ padding:"10px 24px", background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>Try again</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && searched && totalCount === 0 && <EmptyState isImage={isImageSearch} query={queryParam}/>}

          {/* ── IMAGE SEARCH: flat ── */}
          {!loading && flatProducts.length > 0 && (
            <div style={{ animation:"fadeUp 0.35s ease both" }}>
              <ProductGrid products={applySort(flatProducts, sort)} showRank/>
            </div>
          )}

          {/* ── TEXT SEARCH: 3 sections ── */}
          {!loading && hasAnySections && (
            <div style={{ animation:"fadeUp 0.35s ease both" }}>

              {/* Section 1 — Direct matches */}
              {directHits.length > 0 && (
                <section>
                  <SectionHeader
                    icon={<svg width="20" height="20" fill="none" stroke="#db142e" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
                    title="Best Matches"
                    count={directHits.length}
                    accentColor="#db142e"
                    subtitle={`Most relevant results for "${queryParam}"`}
                  />
                  <ProductGrid products={applySort(directHits, sort)} showRank={sort==="relevance"} rankOffset={0}/>
                </section>
              )}

              {/* Section 2 — Same category */}
              {sameCategory.length > 0 && (
                <>
                  <Divider label="More in this category"/>
                  <section>
                    <SectionHeader
                      icon={<svg width="20" height="20" fill="none" stroke="#198f41" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
                      title={`More in ${catLabel}`}
                      count={sameCategory.length}
                      accentColor="#198f41"
                      subtitle="Other products from the same category"
                    />
                    <ProductGrid products={applySort(sameCategory, sort)}/>
                  </section>
                </>
              )}

              {/* Section 3 — Related */}
              {related.length > 0 && (
                <>
                  <Divider label="You might also like"/>
                  <section>
                    <SectionHeader
                      icon={<svg width="20" height="20" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                      title="You Might Also Like"
                      count={related.length}
                      accentColor="#6366f1"
                      subtitle="Other products you may find interesting"
                    />
                    <ProductGrid products={applySort(related, sort)}/>
                  </section>
                </>
              )}
            </div>
          )}

          {/* Trending Now */}
          {searched && !loading && trendingNow.length > 0 && (
            <div style={{ marginTop:64, animation:"fadeUp 0.4s ease 0.2s both" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
                <div style={{ flex:1, height:1, background:"#f1f5f9" }}/>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#dc2626" }}/>
                  <span style={{ fontSize:12, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em" }}>Trending Now</span>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#dc2626" }}/>
                </div>
                <div style={{ flex:1, height:1, background:"#f1f5f9" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:18 }}>
                {trendingNow.map(p => <ProductCard key={`t-${p.id}`} product={p}/>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ padding:60, textAlign:"center" }}>
        <div style={{ width:36, height:36, border:"3px solid #f1f5f9", borderTopColor:"#dc2626", borderRadius:"50%", animation:"spin 0.7s linear infinite", margin:"0 auto" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SearchPageContent/>
    </Suspense>
  );
}