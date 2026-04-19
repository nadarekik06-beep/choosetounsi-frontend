'use client';
/**
 * app/search/page.tsx  — COMPLETE REPLACEMENT
 *
 * Changes from original:
 *   1. Sponsored products pinned to top row when query is present
 *   2. SponsoredProductsSection rendered above organic results
 *   3. Impression/click tracking wired into sponsored results
 *   4. All original search logic (text + image) preserved exactly
 *   5. "Sponsored" badge on promoted results
 *
 * The original SearchResultCard is preserved. SponsoredSearchCard is new.
 */

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { sponsorshipApi, SponsoredProduct } from "@/lib/sponsorshipApi";

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

// ─── Original organic result card (unchanged) ─────────────────────────────────
function SearchResultCard({ product }: { product: SearchProduct }) {
  const imageUrl = product.primary_image ?? "/images/placeholder.png";
  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "#fff", borderRadius: 12, overflow: "hidden",
          border: "1px solid #f1f5f9", cursor: "pointer",
          transition: "box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        <div style={{ aspectRatio: "1/1", background: "#f8fafc", overflow: "hidden", position: "relative" }}>
          <img
            src={imageUrl} alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/placeholder.png"; }}
          />
          {product.featured && (
            <span style={{
              position: "absolute", top: 8, left: 8, background: "#dc2626", color: "#fff",
              fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>Featured</span>
          )}
        </div>
        <div style={{ padding: "12px 14px" }}>
          {(product.subcategory_name ?? product.category_name) && (
            <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {product.subcategory_name ?? product.category_name}
            </p>
          )}
          <h3 style={{
            fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 8px", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {product.name}
          </h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>
              {product.price.toFixed(2)} DT
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: product.stock === 0 ? "#94a3b8" : "#16a34a" }}>
              {product.stock === 0 ? "Out of stock" : "In stock"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Sponsored result card (new) ──────────────────────────────────────────────
function SponsoredSearchCard({ product }: { product: SponsoredProduct }) {
  const [imgErr, setImgErr] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current && product.sponsor_data?.id) {
      tracked.current = true;
      sponsorshipApi.recordImpression(product.sponsor_data.id);
    }
  }, [product.sponsor_data?.id]);

  const handleClick = () => {
    if (product.sponsor_data?.id) {
      sponsorshipApi.recordClick(product.sponsor_data.id);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} onClick={handleClick} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "#fff", borderRadius: 12, overflow: "hidden",
          border: "1.5px solid #e0d9ff", cursor: "pointer",
          transition: "box-shadow 0.2s, transform 0.2s",
          position: "relative",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(99,102,241,0.18)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        <div style={{ aspectRatio: "1/1", background: "#f5f0ff", overflow: "hidden", position: "relative" }}>
          {product.primary_image_url && !imgErr ? (
            <img
              src={product.primary_image_url} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#7c3aed" /></svg>
            </div>
          )}
          {/* Sponsored badge */}
          <span style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(99,102,241,0.9)", color: "#fff",
            fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Sponsored
          </span>
          {product.stock <= 0 && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "#111", color: "#fff", fontSize: 9, fontWeight: 900, padding: "4px 12px", borderRadius: 999, textTransform: "uppercase" }}>Sold Out</span>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px" }}>
          {product.category?.name && (
            <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {product.category.name}
            </p>
          )}
          <h3 style={{
            fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 4px", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {product.name}
          </h3>
          {product.sponsor_data?.ai_ad_copy && (
            <p style={{ fontSize: 10.5, color: "#6b7280", fontStyle: "italic", margin: "0 0 6px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.sponsor_data.ai_ad_copy}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>
              {Number(product.price).toFixed(2)} DT
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: product.stock === 0 ? "#94a3b8" : "#16a34a" }}>
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
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #f1f5f9" }}>
      <div style={{ aspectRatio: "1/1", background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: "12px 14px" }}>
        {[["60%", 12], ["100%", 14], ["40%", 16]].map(([w, h], i) => (
          <div key={i} style={{ height: h as number, background: "#f1f5f9", borderRadius: 6, marginBottom: 8, width: w as string, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main search content ──────────────────────────────────────────────────────
function SearchPageContent() {
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q")    ?? "";
  const modeParam  = searchParams.get("mode") ?? "";
  const idsParam   = searchParams.get("ids")  ?? "";

  const [products,      setProducts]      = useState<SearchProduct[]>([]);
  const [sponsored,     setSponsored]     = useState<SponsoredProduct[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [loadingSponsored, setLoadingSponsored] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [source,        setSource]        = useState<string | null>(null);
  const [searched,      setSearched]      = useState(false);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);

  // Restore image preview from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("searchImagePreview");
    if (stored && modeParam === "image") {
      setImagePreview(stored);
      sessionStorage.removeItem("searchImagePreview");
    }
  }, [modeParam]);

  // Fetch sponsored products when a text query is present
  useEffect(() => {
    if (!queryParam.trim() || modeParam === "image") {
      setSponsored([]);
      return;
    }
    setLoadingSponsored(true);
    sponsorshipApi.publicFeed({ limit: 4 })
      .then(res => setSponsored(res.data ?? []))
      .catch(() => setSponsored([]))
      .finally(() => setLoadingSponsored(false));
  }, [queryParam, modeParam]);

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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/search/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setSource(data.source ?? "ai");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function fetchProductsByIds(ids: number[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setSource("ai");
    } catch {
      setError("Failed to load image search results. Please try again.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const isImageSearch = modeParam === "image";
  const title = isImageSearch
    ? "Visual Search Results"
    : queryParam ? `Results for "${queryParam}"` : "Search Results";

  // Deduplicate: remove organic results that appear in sponsored
  const sponsoredIds = new Set(sponsored.map(s => s.id));
  const organicProducts = products.filter(p => !sponsoredIds.has(p.id));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px", minHeight: "60vh" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {imagePreview && (
            <img src={imagePreview} alt="Search image" style={{
              width: 64, height: 64, objectFit: "cover",
              borderRadius: 10, border: "2px solid #e5e7eb", flexShrink: 0,
            }} />
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>{title}</h1>
            {searched && !loading && (
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                {products.length} product{products.length !== 1 ? "s" : ""} found
                {isImageSearch && <span style={{ marginLeft: 8, fontSize: 11, color: "#198f41", fontWeight: 700 }}>• AI visual match</span>}
                {!isImageSearch && source === "ai" && <span style={{ marginLeft: 8, fontSize: 11, color: "#198f41", fontWeight: 700 }}>• AI semantic match</span>}
                {!isImageSearch && source === "fallback" && <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>(keyword search)</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sponsored results row (text search only) ── */}
      {!isImageSearch && queryParam && (loadingSponsored || sponsored.length > 0) && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#fff" }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>Sponsored Results</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "#7c3aed", border: "1px solid rgba(99,102,241,0.2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Promoted
            </span>
          </div>

          {loadingSponsored ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {sponsored.map(p => <SponsoredSearchCard key={`sp-${p.id}`} product={p} />)}
            </div>
          )}

          {/* Divider */}
          <div style={{ marginTop: 28, marginBottom: 4, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Organic Results</span>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
          </div>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#ef4444" }}>{error}</p>
          <button
            onClick={() => queryParam ? doTextSearch(queryParam) : window.history.back()}
            style={{ marginTop: 16, padding: "10px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && !error && searched && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#374151", marginBottom: 8 }}>No products found</h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
            {isImageSearch ? "No visually similar products found. Try a clearer photo." : "Try different keywords or browse our categories."}
          </p>
          <Link href="/" style={{ display: "inline-block", padding: "10px 24px", background: "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
            Browse Categories
          </Link>
        </div>
      )}

      {/* ── Organic results grid ── */}
      {!loading && organicProducts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
          {organicProducts.map(product => (
            <SearchResultCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Edge case: all organic results were deduplicated (all were already sponsored) */}
      {!loading && !error && searched && products.length > 0 && organicProducts.length === 0 && sponsored.length > 0 && (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          All matching products are shown above as sponsored results.
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading search...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}