'use client';

import { useEffect, useMemo, useState, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera, Heart, Search, ShoppingBag, Sparkles, Star, Store, Tag } from "lucide-react";
import { promoPricing, type PricedProduct } from "@/app/components/promotions/ProductPrice";
import ProductCard, { ProductCardSkeleton } from "@/app/components/product/ProductCard";
import PromoFlyerCard from "@/app/components/product/PromoFlyerCard";
import type { CardSwatch } from "@/app/components/product/cardData";
import { fillGrid, useGridExtras, type GridCell, type GridExtras } from "@/lib/gridFill";
import {
  dataUrlToBlob, loadPhotoSearch, logPhotoSearchClick, savePhotoSearch, searchByPhoto,
  type ImageSearchError, type ImageSearchResponse, type PredictedCategory,
} from "@/lib/imageSearch";
import ImageSearchModal from "@/app/components/search/ImageSearchModal";
import { usePageLoading } from '@/components/brand/NavigationLoader'
import { RouteLoading } from '@/components/brand/NavigationLoader'
import "./search.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SearchProduct extends PricedProduct {
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
  card_images?:     string[];
  card_swatches?:   CardSwatch[];
  variants?:        { id: number; stock: number }[];
  // Photo search: the matched color's photo / id, and how close it is
  image_url?:        string | null;
  matched_color_id?: number;
  similarity?:       number;
}

// ─── Corrected query banner ───────────────────────────────────────────────────
// "Résultats pour « ensemble » — rechercher plutôt « ensembel »": the results already are
// for the corrected words; the link searches exactly what was typed.
function DidYouMeanBanner({ original, corrected, onDismiss }: {
  original: string; corrected: string; onDismiss: () => void;
}) {
  const t = useTranslations("search");
  return (
    <div role="status" style={{
      display:"flex", alignItems:"center", gap:12,
      background:"linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%)",
      border:"1.5px solid #fcd34d", borderRadius:14,
      padding:"12px 18px", marginBottom:28,
      animation:"slideDown 0.3s ease",
    }}>
      <svg width="20" height="20" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink:0 }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <p style={{ flex:1, minWidth:0, margin:0, fontSize:14, color:"#78350f", lineHeight:1.5 }} dir="auto">
        {t.rich("correctedLine", {
          corrected, original,
          c: chunks => <strong style={{ fontWeight:900, color:"#0f172a" }}>{chunks}</strong>,
          o: chunks => (
            <Link href={`/search?q=${encodeURIComponent(original)}&exact=1`}
              style={{ fontWeight:700, color:"#db142e", textDecoration:"underline", textUnderlineOffset:3 }}>
              {chunks}
            </Link>
          ),
        })}
      </p>
      <button onClick={onDismiss} aria-label={t("dismiss")} style={{ background:"transparent", border:"none", cursor:"pointer", padding:4, color:"#d97706", lineHeight:1, flexShrink:0 }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ─── Inline Search Bar ────────────────────────────────────────────────────────
function InlineSearchBar({ initialQuery }: { initialQuery: string }) {
  const t         = useTranslations("search");
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
        <svg style={{ marginInlineStart:14, flexShrink:0 }} width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input ref={inputRef} value={q}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && q.trim()) doSearch(q); if (e.key === "Escape") setShowDrop(false); }}
          onFocus={() => { setFocused(true); setShowDrop(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowDrop(false), 150); }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          style={{ flex:1, border:"none", background:"transparent", padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#111", outline:"none" }}
        />
        {q && <button onClick={() => { setQ(""); setSuggs([]); inputRef.current?.focus(); }} aria-label={t("clear")} style={{ background:"none", border:"none", cursor:"pointer", padding:"0 8px", color:"#94a3b8" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>}
        <button onClick={() => q.trim() && doSearch(q)} aria-label={t("submit")} style={{ background:"#db142e", border:"none", cursor:"pointer", padding:"0 18px", height:"100%", minHeight:46, color:"#fff", display:"flex", alignItems:"center" }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
      </div>
      {showDrop && suggs.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", insetInline:0, background:"#fff", border:"1.5px solid #f1f5f9", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,0.10)", zIndex:999, overflow:"hidden", animation:"slideDown 0.15s ease" }}>
          {suggs.map((s, i) => (
            <button key={i} onMouseDown={() => doSearch(s)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:"none", border:"none", borderBottom: i < suggs.length-1 ? "1px solid #f8fafc" : "none", padding:"11px 16px", cursor:"pointer", textAlign:"start", fontFamily:"inherit" }}
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
// Organic order and ranks are untouched; sponsored cards and promo flyers take the
// extra positions handed in by fillGrid (lib/gridFill.ts).
function ProductGrid({ cells, showRank = false, rankOffset = 0, section, cardProps }: {
  cells: GridCell<SearchProduct>[]; showRank?: boolean; rankOffset?: number; section: string;
  /** Photo search: link with the matched color preselected, and log the click. */
  cardProps?: (p: SearchProduct, position: number) => { href?: string; onSelect?: () => void };
}) {
  const t = useTranslations("search");
  let organic = 0, shown = 0;
  return (
    <div className="sr-grid">
      {cells.map((cell, i) => {
        if (cell.kind === "flyer") return <PromoFlyerCard key={`f-${cell.flyer.id}`} flyer={cell.flyer} index={i} section={section}/>;
        if (cell.kind === "ad") return <ProductCard key={`ad-${cell.ad.id}`} product={cell.ad} index={i} section={section}/>;
        const p = cell.item;
        const rank = showRank ? rankOffset + (++organic) : undefined;
        const badge = (p.featured || (rank && rank <= 3)) ? (
          <>
            {rank && rank <= 3 && <span className="pc-badge pc-badge--top">{t("topN", { n: rank })}</span>}
            {p.featured && <span className="pc-badge pc-badge--featured">{t("featured")}</span>}
          </>
        ) : undefined;
        const position = rankOffset + (++shown);
        return <ProductCard key={p.id} product={p} index={i} section={section} eager={i < 4} badge={badge}
          label={p.subcategory_name ?? p.category_name} {...cardProps?.(p, position)}/>;
      })}
    </div>
  );
}

function SkeletonGrid({ count = 12 }: { count?: number }) {
  return <div className="sr-grid">{Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i}/>)}</div>;
}

// ─── Hero header: soft brand gradient + a few slowly floating icons ───────────
const HERO_ICONS = [
  { Icon: ShoppingBag, cls: "sr-ico--1" },
  { Icon: Tag,         cls: "sr-ico--2" },
  { Icon: Star,        cls: "sr-ico--3" },
  { Icon: Search,      cls: "sr-ico--4" },
  { Icon: Heart,       cls: "sr-ico--5" },
  { Icon: Sparkles,    cls: "sr-ico--6" },
];

function HeroDecor() {
  return (
    <div className="sr-hero__decor" aria-hidden="true">
      {HERO_ICONS.map(({ Icon, cls }) => (
        <span key={cls} className={`sr-ico ${cls}`}><Icon size={16} strokeWidth={2.2}/></span>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isImage, query }: { isImage: boolean; query: string }) {
  const t  = useTranslations("search");
  const tc = useTranslations("common");
  return (
    <div style={{ textAlign:"center", padding:"80px 24px" }}>
      <div style={{ width:80, height:80, borderRadius:"50%", background:"#f8fafc", border:"2px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
        <svg width="32" height="32" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <h2 style={{ fontSize:18, fontWeight:800, color:"#374151", margin:"0 0 8px" }}>{t("emptyTitle")}</h2>
      <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 28px", lineHeight:1.6 }}>
        {isImage ? t("emptyImage") : t("emptyText", { query })}
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <Link href="/shop" style={{ padding:"10px 22px", background:"#dc2626", color:"#fff", borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>{t("browseShop")}</Link>
        <Link href="/"    style={{ padding:"10px 22px", background:"#f8fafc", color:"#374151", border:"1px solid #e5e7eb", borderRadius:10, fontWeight:700, fontSize:13, textDecoration:"none" }}>{tc("backHome")}</Link>
      </div>
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = "relevance" | "price_asc" | "price_desc" | "popular";
function applySort(products: SearchProduct[], sort: SortKey): SearchProduct[] {
  const c = [...products];
  const pay = (p: SearchProduct) => promoPricing(p).final;
  if (sort === "price_asc")  return c.sort((a,b) => pay(a) - pay(b));
  if (sort === "price_desc") return c.sort((a,b) => pay(b) - pay(a));
  if (sort === "popular")    return c.sort((a,b) => b.views - a.views);
  return c;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
/** Under this many results, a "You might also like" block keeps the page full. */
const FEW_RESULTS = 8;

function SearchPageContent() {
  const t            = useTranslations("search");
  const ti           = useTranslations("imageSearch");
  const tc           = useTranslations("common");
  const searchParams = useSearchParams();
  const queryParam   = searchParams.get("q")    ?? "";
  const modeParam    = searchParams.get("mode") ?? "";
  const photoParam   = searchParams.get("t");   // photo search: key of the stored photo + results
  // exact=1: search what was typed, without spelling correction ("rechercher plutôt …")
  const exactParam   = searchParams.get("exact") === "1";

  // Sectioned (text search)
  const [directHits,   setDirectHits]   = useState<SearchProduct[]>([]);
  const [sameCategory, setSameCategory] = useState<SearchProduct[]>([]);
  const [related,      setRelated]      = useState<SearchProduct[]>([]);
  // Shops the query names ("dar el moda"): cards linking to the shop
  const [shops,        setShops]        = useState<{ id: number; name: string; avatar: string | null; products_count: number }[]>([]);
  // Photo search: exact matches / similar products (or, fallback, the closest of the detected category)
  const [imgExact,     setImgExact]     = useState<SearchProduct[]>([]);
  const [imgSimilar,   setImgSimilar]   = useState<SearchProduct[]>([]);
  const [imgFallback,  setImgFallback]  = useState(false);
  const [predicted,    setPredicted]    = useState<PredictedCategory | null>(null);
  const [photoSearchId, setPhotoSearchId] = useState<number | undefined>();
  const [photoError,   setPhotoError]   = useState<ImageSearchError | "expired" | null>(null);
  // "New photo search": this page has no Navbar, so it opens its own picker + crop dialog
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [newPhoto,     setNewPhoto]     = useState<File | null>(null);
  const openPhotoSearch = () => photoInputRef.current?.click();

  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [source,          setSource]          = useState<string | null>(null);
  const [searched,        setSearched]        = useState(false);
  const [imagePreview,    setImagePreview]    = useState<string | null>(null);
  const [sort,            setSort]            = useState<SortKey>("relevance");
  const [trendingNow,     setTrendingNow]     = useState<SearchProduct[]>([]);
  const [didYouMean,      setDidYouMean]      = useState<string | null>(null);
  // No real match: the backend sends the closest products in `related` with alternatives=true
  const [alternatives,    setAlternatives]    = useState(false);
  const [originalQuery,   setOriginalQuery]   = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isImageSearch = modeParam === "image";
  // holds the navigation loader until the first load is done
  const tLoader = useTranslations("loader");
  usePageLoading(loading || (!searched && (!!queryParam || isImageSearch)), { label: isImageSearch ? tLoader("analyzingImage") : undefined });
  const totalCount    = directHits.length + sameCategory.length + related.length + imgExact.length + imgSimilar.length;
  const fewResults    = searched && !loading && !error && totalCount < FEW_RESULTS;
  const gridIds       = useMemo(
    () => [...directHits, ...sameCategory, ...related, ...imgExact, ...imgSimilar].map(p => p.id),
    [directHits, sameCategory, related, imgExact, imgSimilar],
  );

  // Sponsored cards (search_top, relevant to the query; general picks only on image search) and
  // promo flyers, once the organic results are in. Never a product already in the grid.
  const extras = useGridExtras({
    placement: "search_top", q: isImageSearch ? undefined : queryParam, ids: gridIds,
    enabled: searched && !loading && !error && (!!queryParam || isImageSearch),
    minAds: fewResults ? 4 : 0,
    // A text search only shows sponsored products that match it (no headphones for "ensemble")
    generalFallback: isImageSearch,
  });

  // Reset on new query
  useEffect(() => {
    setBannerDismissed(false); setDidYouMean(null); setAlternatives(false);
    setDirectHits([]); setSameCategory([]); setRelated([]); setShops([]);
  }, [queryParam]);

  // Trending: the most-viewed products (also fills "You might also like" on thin results)
  useEffect(() => {
    fetch(`${API_URL}/api/products?sort=views&per_page=12`, { headers: { Accept:"application/json" } })
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return;
        type ListedProduct = Omit<SearchProduct, "category_name" | "category_slug"> & {
          category?: { name: string; slug: string } | null; primary_image_url?: string | null;
        };
        setTrendingNow((data.data?.data ?? []).map((p: ListedProduct) => ({
          ...p,
          price:Number(p.price), stock:p.stock??0, views:p.views??0, featured:p.featured??false,
          category_name:p.category?.name??null, category_slug:p.category?.slug??null,
          subcategory_name:null, subcategory_slug:null, primary_image:p.primary_image_url??null,
        })));
      }).catch(() => {});
  }, []);

  // Trigger search
  useEffect(() => {
    if (modeParam === "image") { loadPhotoResults(); return; }
    if (queryParam.trim()) doTextSearch(queryParam.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, modeParam, photoParam, exactParam]);

  async function doTextSearch(q: string) {
    setLoading(true); setError(null); setOriginalQuery(q);
    try {
      const res = await fetch(`${API_URL}/api/search/text`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({ query: q, limit: 40, ...(exactParam ? { exact: true } : {}) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      // New sectioned shape from controller
      if (data.sections) {
        setDirectHits(data.sections.direct          ?? []);
        setSameCategory(data.sections.same_category ?? []);
        setRelated(data.sections.related            ?? []);
      } else {
        // Old flat shape — best-effort split
        const all: SearchProduct[] = data.products ?? [];
        setDirectHits(all.slice(0, Math.min(4, all.length)));
        setSameCategory([]);
        setRelated(all.slice(4));
      }

      setSource(data.source ?? "keyword");
      setShops(data.shops ?? []);
      setAlternatives(!!data.alternatives);

      if (data.did_you_mean && data.did_you_mean !== q) {
        setDidYouMean(data.did_you_mean); setBannerDismissed(false);
      } else {
        setDidYouMean(null);
      }
    } catch {
      setError(t("errorText"));
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  function applyPhotoResults(data: ImageSearchResponse<SearchProduct>) {
    setImgExact(data.sections.exact ?? []);
    setImgSimilar(data.sections.similar ?? []);
    setImgFallback(!!data.fallback);
    setPredicted(data.predicted_category ?? null);
    setPhotoSearchId(data.search_id);
    setDirectHits([]); setSameCategory([]); setRelated([]);
    setSource("ai");
  }

  // The crop dialog stored the cropped photo + results; after a reload only the photo may be
  // left (or the results of an older version): search again with it.
  async function loadPhotoResults() {
    setError(null); setPhotoError(null);
    setImgExact([]); setImgSimilar([]); setPredicted(null);
    const entry = loadPhotoSearch<SearchProduct>(photoParam);
    if (!entry) { setPhotoError("expired"); setSearched(true); return; }
    setImagePreview(entry.preview);
    if (entry.result) { applyPhotoResults(entry.result); setSearched(true); return; }
    setLoading(true);
    try {
      const outcome = await searchByPhoto<SearchProduct>(await dataUrlToBlob(entry.preview));
      if (!outcome.ok) { setPhotoError(outcome.error); return; }
      savePhotoSearch({ ...entry, result: outcome.data });
      applyPhotoResults(outcome.data);
    } catch {
      setPhotoError("failed");
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  const photoCardProps = useCallback((p: SearchProduct, position: number) => ({
    href: `/products/${p.slug}${p.matched_color_id ? `?color=${p.matched_color_id}` : ""}`,
    onSelect: () => logPhotoSearchClick(photoSearchId, p.id, position),
  }), [photoSearchId]);

  const hasAnySections = directHits.length > 0 || sameCategory.length > 0 || related.length > 0;
  const showBanner     = !!didYouMean && !bannerDismissed && searched && !loading;
  const catLabel       = sameCategory[0]?.category_name ?? directHits[0]?.category_name ?? tc("category");

  // One sequence of positions across the sections: sponsored cards / flyers continue
  // where the previous section stopped; leftovers go to "You might also like".
  const grids = useMemo(() => {
    const opts = { adEvery: extras.adEvery, flyerEvery: extras.flyerEvery };
    let rest: GridExtras = { ads: extras.ads, flyers: extras.flyers };
    let at = 0;
    const fill = (list: SearchProduct[]) => {
      const r = fillGrid(applySort(list, sort), rest, { ...opts, startAt: at });
      rest = r.rest; at += r.cells.length;
      return r.cells;
    };
    const exact = fill(imgExact), similar = fill(imgSimilar), direct = fill(directHits), same = fill(sameCategory), rel = fill(related);
    return { exact, similar, direct, same, rel, rest };
  }, [extras, imgExact, imgSimilar, directHits, sameCategory, related, sort]);

  // Thin results: leftover sponsored cards first, then popular products not already shown
  const alsoLike = useMemo(() => {
    if (!fewResults) return [] as GridCell<SearchProduct>[];
    const shown = new Set([...gridIds, ...grids.rest.ads.map(a => a.id)]);
    const fill: GridCell<SearchProduct>[] = trendingNow.filter(p => !shown.has(p.id)).map(item => ({ kind: "product", item }));
    const ads: GridCell<SearchProduct>[] = grids.rest.ads.map(ad => ({ kind: "ad", ad }));
    // Ads spread among the popular picks (1st, 4th, 7th…), up to 12 cards
    const out: GridCell<SearchProduct>[] = [];
    while ((ads.length || fill.length) && out.length < 12) {
      out.push((out.length % 3 === 0 && ads.length) || !fill.length ? ads.shift()! : fill.shift()!);
    }
    if (grids.rest.flyers[0] && out.length >= 4) out.splice(4, 0, { kind: "flyer", flyer: grids.rest.flyers[0] });
    return out;
  }, [fewResults, gridIds, grids.rest, trendingNow]);

  const title = isImageSearch ? t("visualTitle")
              : queryParam    ? t("quoted", { query: queryParam })
              :                 t("resultsTitle");

  return (
    <div className="sr-page">
      <input ref={photoInputRef} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) setNewPhoto(f); e.target.value = ""; }}/>
      {newPhoto && <ImageSearchModal file={newPhoto} onClose={() => setNewPhoto(null)} onPickAnother={openPhotoSearch}/>}

      {/* ── Header ── */}
      <header className="sr-hero">
        <HeroDecor/>
        <div className="sr-wrap sr-hero__in">

          <nav className="sr-crumb" aria-label={t("crumb")}>
            <Link href="/">{tc("home")}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{isImageSearch ? t("visualCrumb") : t("crumb")}</span>
          </nav>

          <div className="sr-hero__row">
            {imagePreview && (
              <div className="sr-hero__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL from the camera / upload */}
                <img src={imagePreview} alt={t("queryImage")}/>
                <span aria-hidden="true"><Search size={10} strokeWidth={2.6}/></span>
              </div>
            )}

            <div className="sr-hero__main">
              <p className="sr-eyebrow"><Search size={12} strokeWidth={2.6} aria-hidden="true"/>{t("heroEyebrow")}</p>
              <h1 className="sr-title" dir="auto">{title}</h1>
              {!isImageSearch && <InlineSearchBar initialQuery={queryParam}/>}
              {isImageSearch && (
                <div className="sr-photo-bar">
                  {predicted?.confident && (
                    <span className="sr-photo-cat">
                      <Tag size={12} aria-hidden="true"/>
                      {ti("detected", { category: predicted.name })}
                    </span>
                  )}
                  <button type="button" className="sr-photo-new" onClick={openPhotoSearch}>
                    <Camera size={14} aria-hidden="true"/>{ti("newPhoto")}
                  </button>
                </div>
              )}
              {!isImageSearch && !searched && <p className="sr-tagline">{t("heroTagline")}</p>}
              {searched && !loading && (
                <div className="sr-meta">
                  <span className="sr-count">
                    {t.rich("found", { count: totalCount, b: c => <strong>{c}</strong> })}
                  </span>
                  {(source === "ai" || source === "semantic") && (
                    <span className="sr-ai">
                      <Sparkles size={11} aria-hidden="true"/>
                      {isImageSearch ? t("aiVisual") : t("aiSemantic")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sort */}
          {(hasAnySections || imgExact.length > 0 || imgSimilar.length > 0) && (
            <div className="sr-sort" role="group" aria-label={t("sort")}>
              <span className="sr-sort__label">{t("sort")}</span>
              {([ {key:"relevance",label:t("sortRelevance")},{key:"popular",label:t("sortPopular")},{key:"price_asc",label:t("sortPriceAsc")},{key:"price_desc",label:t("sortPriceDesc")} ] as {key:SortKey;label:string}[]).map(s => (
                <button key={s.key} type="button" onClick={() => setSort(s.key)} aria-pressed={sort===s.key}
                  className={`sort-btn${sort===s.key ? " active" : ""}`}>{s.label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="sr-wrap sr-body">

        {/* Did You Mean */}
        {showBanner && didYouMean && (
          <DidYouMeanBanner
            original={originalQuery} corrected={didYouMean}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Shops whose name was typed */}
        {!loading && !isImageSearch && shops.length > 0 && (
          <div className="sr-shops">
            {shops.map(s => (
              <Link key={s.id} href={`/sellers/${s.id}`} className="sr-shop">
                <span className="sr-shop__logo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- shop logo from the API */}
                  {s.avatar ? <img src={s.avatar} alt=""/> : <Store size={18} aria-hidden="true"/>}
                </span>
                <span className="sr-shop__text">
                  <strong dir="auto">{s.name}</strong>
                  <small>{t("shopProducts", { count: s.products_count })}</small>
                </span>
                <span className="sr-shop__cta">{t("visitShop")}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && <SkeletonGrid/>}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign:"center", padding:"80px 24px" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
            <p style={{ fontSize:16, fontWeight:700, color:"#ef4444", marginBottom:16 }}>{error}</p>
            <button onClick={() => queryParam ? doTextSearch(queryParam) : window.history.back()} style={{ padding:"10px 24px", background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>{tc("retry")}</button>
          </div>
        )}

        {/* Photo search could not run (service down, rate limit, photo gone after a reload…) */}
        {!loading && photoError && (
          <div className="sr-photo-error" role="alert">
            <p>{photoError === "expired" ? ti("expired")
              : photoError === "unavailable" ? ti("unavailable")
              : photoError === "rate_limited" ? ti("rateLimited")
              : photoError === "unreadable" ? ti("unreadable") : ti("failed")}</p>
            {photoError !== "unavailable" && (
              <button type="button" onClick={openPhotoSearch}><Camera size={15} aria-hidden="true"/>{ti("newPhoto")}</button>
            )}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && !photoError && searched && totalCount === 0 && <EmptyState isImage={isImageSearch} query={queryParam}/>}

        {/* ── PHOTO SEARCH: exact matches, then similar products ── */}
        {!loading && (imgExact.length > 0 || imgSimilar.length > 0) && (
          <div className="sr-fade">
            {imgExact.length > 0 && (
              <section>
                <SectionHeader
                  icon={<svg width="20" height="20" fill="none" stroke="#db142e" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
                  title={ti("exactTitle")}
                  count={imgExact.length}
                  accentColor="#db142e"
                  subtitle={ti("exactSub")}
                />
                <ProductGrid cells={grids.exact} showRank={sort==="relevance"} section="search_photo" cardProps={photoCardProps}/>
              </section>
            )}
            {imgSimilar.length > 0 && (
              <>
                {imgExact.length > 0 && <Divider label={ti("similarTitle")}/>}
                <section>
                  <SectionHeader
                    icon={<Sparkles size={20} color="#6366f1" aria-hidden="true"/>}
                    title={ti("similarTitle")}
                    count={imgSimilar.length}
                    accentColor="#6366f1"
                    subtitle={imgFallback && predicted ? ti("fallbackSub", { category: predicted.category.name }) : ti("similarSub")}
                  />
                  <ProductGrid cells={grids.similar} showRank={sort==="relevance" && !imgExact.length} rankOffset={imgExact.length}
                    section="search_photo" cardProps={photoCardProps}/>
                </section>
              </>
            )}
          </div>
        )}

        {/* ── TEXT SEARCH: 3 sections ── */}
        {!loading && hasAnySections && (
          <div className="sr-fade">

            {/* Section 1 — Direct matches */}
            {directHits.length > 0 && (
              <section>
                <SectionHeader
                  icon={<svg width="20" height="20" fill="none" stroke="#db142e" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
                  title={t("bestMatches")}
                  count={directHits.length}
                  accentColor="#db142e"
                  subtitle={t("bestMatchesSub", { query: queryParam })}
                />
                <ProductGrid cells={grids.direct} showRank={sort==="relevance"} rankOffset={0} section="search"/>
              </section>
            )}

            {/* Section 2 — Same category */}
            {sameCategory.length > 0 && (
              <>
                <Divider label={t("moreInCategoryDivider")}/>
                <section>
                  <SectionHeader
                    icon={<svg width="20" height="20" fill="none" stroke="#198f41" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
                    title={t("moreIn", { name: catLabel })}
                    count={sameCategory.length}
                    accentColor="#198f41"
                    subtitle={t("moreInSub")}
                  />
                  <ProductGrid cells={grids.same} section="search"/>
                </section>
              </>
            )}

            {/* Section 3 — Related (or the closest products when nothing matched) */}
            {related.length > 0 && (
              <>
                {!alternatives && <Divider label={t("alsoLike")}/>}
                <section>
                  <SectionHeader
                    icon={<svg width="20" height="20" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                    title={alternatives ? t("closestTitle") : t("alsoLike")}
                    count={related.length}
                    accentColor="#6366f1"
                    subtitle={alternatives ? t("closestSub", { query: queryParam }) : t("alsoLikeSub")}
                  />
                  <ProductGrid cells={grids.rel} section="search"/>
                </section>
              </>
            )}
          </div>
        )}

        {/* Thin or empty results: sponsored + popular picks so the page is never empty */}
        {fewResults && alsoLike.length > 0 && (
          <section className="sr-also sr-fade">
            <SectionHeader
              icon={<Heart size={20} color="#db142e" aria-hidden="true"/>}
              title={t("fewResultsTitle")}
              count={alsoLike.filter(c => c.kind !== "flyer").length}
              accentColor="#db142e"
              subtitle={totalCount === 0 || !queryParam ? t("noResultsSub") : t("fewResultsSub", { query: queryParam })}
            />
            <ProductGrid cells={alsoLike} section="search_also_like"/>
          </section>
        )}

        {/* Trending Now (plenty of results: a short row of popular products) */}
        {searched && !loading && !fewResults && trendingNow.length > 0 && (
          <div className="sr-trending">
            <div className="sr-trending__head">
              <span className="sr-trending__line"/>
              <span className="sr-trending__label"><i/>{t("trending")}<i/></span>
              <span className="sr-trending__line"/>
            </div>
            <ProductGrid section="search_trending"
              cells={trendingNow.filter(p => !gridIds.includes(p.id)).slice(0, 4).map(item => ({ kind: "product" as const, item }))}/>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <SearchPageContent/>
    </Suspense>
  );
}
