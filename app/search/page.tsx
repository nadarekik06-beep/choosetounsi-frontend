'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

// ─── Placeholder SVG inline (no file needed) ──────────────────────────────────
function PlaceholderImg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" fill="#f1f5f9"/>
      <rect x="20" y="18" width="40" height="32" rx="4" fill="#e2e8f0"/>
      <circle cx="30" cy="28" r="4" fill="#cbd5e1"/>
      <path d="M20 42l14-12 10 10 8-6 8 8v8H20V42z" fill="#cbd5e1"/>
    </svg>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, rank }: { product: SearchProduct; rank?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const imageUrl = product.primary_image && !imgErr ? product.primary_image : null;
  const label = product.subcategory_name ?? product.category_name;

  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="pcard">
        {/* Image */}
        <div style={{ position: "relative", aspectRatio: "3/4", background: "#f8fafc", overflow: "hidden" }}>
          {imageUrl ? (
            <img
              src={imageUrl} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
              className="pcard-img"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlaceholderImg size={64}/>
            </div>
          )}

          {/* Badges */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 5 }}>
            {product.featured && (
              <span style={{ background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Featured
              </span>
            )}
            {rank && rank <= 3 && (
              <span style={{ background: "#0f172a", color: "#fbbf24", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Top {rank}
              </span>
            )}
          </div>

          {/* Stock badge */}
          {product.stock === 0 && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 14px", borderRadius: 999 }}>Sold Out</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px 14px" }}>
          {label && (
            <p style={{ fontSize: 10, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>
              {label}
            </p>
          )}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: "0 0 10px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#dc2626", letterSpacing: "-0.02em" }}>
              {Number(product.price).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 700 }}>DT</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: product.stock === 0 ? "#94a3b8" : "#16a34a", background: product.stock === 0 ? "#f1f5f9" : "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 999 }}>
              {product.stock === 0 ? "Out of stock" : "In stock"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #f1f5f9" }}>
      <div style={{ aspectRatio: "3/4", background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }}/>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ height: 10, width: "40%", background: "#f1f5f9", borderRadius: 6, marginBottom: 8, animation: "shimmer 1.4s infinite" }}/>
        <div style={{ height: 13, width: "90%", background: "#f1f5f9", borderRadius: 6, marginBottom: 5, animation: "shimmer 1.4s infinite" }}/>
        <div style={{ height: 13, width: "60%", background: "#f1f5f9", borderRadius: 6, marginBottom: 12, animation: "shimmer 1.4s infinite" }}/>
        <div style={{ height: 16, width: "45%", background: "#f1f5f9", borderRadius: 6, animation: "shimmer 1.4s infinite" }}/>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isImage, query }: { isImage: boolean; query: string }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f8fafc", border: "2px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="32" height="32" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#374151", margin: "0 0 8px" }}>No results found</h2>
      <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 28px", lineHeight: 1.6 }}>
        {isImage
          ? "No visually similar products found. Try uploading a clearer photo."
          : `No products matched "${query}". Try different keywords.`
        }
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/shop" style={{ padding: "10px 22px", background: "#dc2626", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          Browse Shop
        </Link>
        <Link href="/" style={{ padding: "10px 22px", background: "#f8fafc", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Sort control ─────────────────────────────────────────────────────────────
type SortKey = "relevance" | "price_asc" | "price_desc" | "popular";

function sortProducts(products: SearchProduct[], sort: SortKey): SearchProduct[] {
  const copy = [...products];
  if (sort === "price_asc")  return copy.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") return copy.sort((a, b) => b.price - a.price);
  if (sort === "popular")    return copy.sort((a, b) => b.views - a.views);
  return copy; // relevance = AI order preserved
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function SearchPageContent() {
  const searchParams = useSearchParams();
  const queryParam   = searchParams.get("q")    ?? "";
  const modeParam    = searchParams.get("mode") ?? "";
  const idsParam     = searchParams.get("ids")  ?? "";

  const [products,     setProducts]     = useState<SearchProduct[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [source,       setSource]       = useState<string | null>(null);
  const [searched,     setSearched]     = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sort,         setSort]         = useState<SortKey>("relevance");
  const [trendingNow,  setTrendingNow]  = useState<SearchProduct[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Restore image preview from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("searchImagePreview");
    if (stored && modeParam === "image") {
      setImagePreview(stored);
      sessionStorage.removeItem("searchImagePreview");
    }
  }, [modeParam]);

  // Fetch "Trending Now" — uses sponsored feed but shown without any mention of sponsoring
  useEffect(() => {
    if (searched && products.length === 0) return; // only show when we have context
    setTrendingLoading(true);
    fetch(`${API_URL}/api/sponsorships/public?limit=4`, {
      headers: { Accept: "application/json" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const items = (data.data ?? []).map((p: any) => ({
          id:               p.id,
          name:             p.name,
          slug:             p.slug,
          description:      p.description ?? null,
          price:            Number(p.price),
          stock:            p.stock ?? 0,
          views:            p.views ?? 0,
          featured:         p.featured ?? false,
          category_name:    p.category?.name ?? null,
          category_slug:    p.category?.slug ?? null,
          subcategory_name: null,
          subcategory_slug: null,
          primary_image:    p.primary_image_url ?? null,
        }));
        setTrendingNow(items);
      })
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, [searched]);

  // Main search trigger
  useEffect(() => {
    if (modeParam === "image" && idsParam) {
      const ids = idsParam.split(",").map(Number).filter(Boolean);
      if (ids.length === 0) { setSearched(true); return; }
      fetchProductsByIds(ids);
      return;
    }
    if (queryParam.trim()) {
      doTextSearch(queryParam.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, modeParam, idsParam]);

  async function doTextSearch(q: string) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/search/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: q, limit: 24 }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setSource(data.source ?? "ai");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  async function fetchProductsByIds(ids: number[]) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setSource("ai");
    } catch {
      setError("Failed to load image search results. Please try again.");
    } finally {
      setLoading(false); setSearched(true);
    }
  }

  const isImageSearch  = modeParam === "image";
  const sorted         = sortProducts(products, sort);
  const hasResults     = products.length > 0;

  const title = isImageSearch
    ? "Visual Search Results"
    : queryParam ? `"${queryParam}"` : "Search Results";

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .pcard {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          transition: box-shadow 0.22s, transform 0.22s;
          cursor: pointer;
        }
        .pcard:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.10); transform: translateY(-3px); }
        .pcard:hover .pcard-img { transform: scale(1.04); }
        .sort-btn { background: transparent; border: 1.5px solid #e5e7eb; borderRadius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .sort-btn:hover, .sort-btn.active { background: #0f172a; border-color: #0f172a; color: #fff; }
        .filter-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1.5px solid #e5e7eb; background: #fff; color: #64748b; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
        .filter-chip:hover, .filter-chip.active { background: #fef2f2; border-color: #dc2626; color: #dc2626; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

        {/* ── Header band ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "24px 0 0" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
              <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Home</Link>
              <span>/</span>
              <span style={{ color: "#374151", fontWeight: 600 }}>
                {isImageSearch ? "Visual Search" : "Search"}
              </span>
            </div>

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap", paddingBottom: 20 }}>
              {imagePreview && (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img src={imagePreview} alt="Query" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "2.5px solid #dc2626", display: "block" }}/>
                  <div style={{ position: "absolute", bottom: -6, right: -6, width: 22, height: 22, background: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                    <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title}
                </h1>
                {searched && !loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>
                      <strong style={{ color: "#0f172a" }}>{products.length}</strong> product{products.length !== 1 ? "s" : ""} found
                    </span>
                    {source === "ai" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#198f41", background: "rgba(25,143,65,0.08)", padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(25,143,65,0.2)" }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="#198f41"><circle cx="5" cy="5" r="5"/></svg>
                        {isImageSearch ? "AI visual match" : "AI semantic match"}
                      </span>
                    )}
                    {source === "fallback" && (
                      <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>keyword search</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sort bar */}
            {hasResults && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 16, overflowX: "auto" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>Sort</span>
                {([
                  { key: "relevance",  label: "Best Match" },
                  { key: "popular",    label: "Most Popular" },
                  { key: "price_asc",  label: "Price ↑" },
                  { key: "price_desc", label: "Price ↓" },
                ] as { key: SortKey; label: string }[]).map(s => (
                  <button key={s.key} onClick={() => setSort(s.key)}
                    className={`sort-btn ${sort === s.key ? "active" : ""}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 64px" }}>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i}/>)}
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 16 }}>{error}</p>
              <button
                onClick={() => queryParam ? doTextSearch(queryParam) : window.history.back()}
                style={{ padding: "10px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                Try again
              </button>
            </div>
          )}

          {/* ── No results ── */}
          {!loading && !error && searched && products.length === 0 && (
            <EmptyState isImage={isImageSearch} query={queryParam}/>
          )}

          {/* ── Results grid ── */}
          {!loading && sorted.length > 0 && (
            <div style={{ animation: "fadeUp 0.35s ease both" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
                {sorted.map((product, i) => (
                  <ProductCard key={product.id} product={product} rank={sort === "relevance" ? i + 1 : undefined}/>
                ))}
              </div>
            </div>
          )}

          {/* ── Trending Now section (sponsored shown discreetly as trending) ── */}
          {searched && !loading && trendingNow.length > 0 && (
            <div style={{ marginTop: 64, animation: "fadeUp 0.4s ease 0.2s both" }}>
              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "#f1f5f9" }}/>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }}/>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Trending Now
                  </span>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }}/>
                </div>
                <div style={{ flex: 1, height: 1, background: "#f1f5f9" }}/>
              </div>

              {trendingLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
                  {[1,2,3,4].map(i => <SkeletonCard key={i}/>)}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
                  {trendingNow.map(p => <ProductCard key={`t-${p.id}`} product={p}/>)}
                </div>
              )}
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
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #f1f5f9", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SearchPageContent/>
    </Suspense>
  );
}