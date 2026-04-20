'use client';
/**
 * components/SponsoredProductsSection.tsx
 *
 * Reusable sponsored products carousel/grid.
 * Drop this into:
 *   - Homepage (between hero and categories)
 *   - Category page (top of product grid)
 *   - Search results page (pinned top row)
 *
 * Props:
 *   title          — section heading (default: "🔥 Trending Now")
 *   categorySlug   — optional filter by category
 *   limit          — max products to fetch (default 8)
 *   layout         — 'grid' | 'row' (horizontal scroll)
 *   showBadge      — whether to show the product badge (default true)
 *
 * Tracks impressions + clicks via sponsorshipApi (fire-and-forget).
 *
 * ─── REBRANDING CHANGES (labels only, zero logic changes) ────────────────────
 *   BEFORE → AFTER
 *   "Sponsored Products"  → "🔥 Trending Now"   (default title prop)
 *   "Promoted"            → "Popular Choice"     (subtitle pill)
 *   "Sponsored" (badge)   → "🔥 Hot"             (card image badge)
 *   Zap icon              → 🔥 emoji             (section header icon)
 *   Purple accent         → warm red/orange      (badge & icon colours)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { sponsorshipApi, SponsoredProduct } from '@/lib/sponsorshipApi';

interface Props {
  title?:        string;
  categorySlug?: string;
  limit?:        number;
  layout?:       'grid' | 'row';
  showBadge?:    boolean;
}

// ── Single card ───────────────────────────────────────────────────────────────
function SponsoredCard({
  product,
  showBadge,
}: {
  product: SponsoredProduct;
  showBadge: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const tracked = useRef(false);

  // Record impression once on mount
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
    <Link
      href={`/products/${product.slug}`}
      onClick={handleClick}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          /* ── CHANGE: border colour shifted from purple to warm neutral ── */
          border: '1.5px solid #f0f0f0',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          /* ── CHANGE: hover shadow shifted from purple to red brand colour ── */
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(219,20,46,0.13)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
      >
        {/* Image */}
        <div style={{ aspectRatio: '3/4', background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}>
          {product.primary_image_url && !imgErr ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setImgErr(true)}
            />
          ) : (
            /* ── CHANGE: fallback bg colour shifted from purple to warm red ── */
            <div style={{ width: '100%', height: '100%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>🔥</span>
            </div>
          )}

          {/* ── CHANGE: badge text "Sponsored" → "🔥 Hot" ─────────────────
               Colour: purple rgba(99,102,241) → warm red rgba(219,20,46)   */}
          {showBadge && (
            <span style={{
              position: 'absolute', top: 8, left: 8,
              background: 'rgba(219,20,46,0.88)',
              color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '2px 7px', borderRadius: 999,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
            }}>
              🔥 Hot
            </span>
          )}

          {/* Out of stock — unchanged */}
          {product.stock <= 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                background: '#111', color: '#fff',
                fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '4px 12px', borderRadius: 999,
              }}>Sold Out</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 13px' }}>
          {product.category?.name && (
            /* ── CHANGE: category label colour purple → brand red ── */
            <p style={{ fontSize: 9, color: '#db142e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>
              {product.category.name}
            </p>
          )}
          <p style={{
            fontSize: 12.5, fontWeight: 700, color: '#1f2937',
            margin: '0 0 5px', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {product.name}
          </p>

          {/* AI ad copy — unchanged */}
          {product.sponsor_data?.ai_ad_copy && (
            <p style={{
              fontSize: 10.5, color: '#6b7280', fontStyle: 'italic',
              margin: '0 0 6px', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {product.sponsor_data.ai_ad_copy}
            </p>
          )}

          <p style={{ fontSize: 14, fontWeight: 900, color: '#db142e', margin: 0 }}>
            {Number(product.price).toFixed(2)} DT
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function SponsoredProductsSection({
  /* ── CHANGE: default title "Sponsored Products" → "🔥 Trending Now" ── */
  title        = '\uD83D\uDD25 Trending Now',
  categorySlug,
  limit        = 8,
  layout       = 'row',
  showBadge    = true,
}: Props) {
  const [products, setProducts] = useState<SponsoredProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await sponsorshipApi.publicFeed({ limit, category_slug: categorySlug });
        setProducts(res.data ?? []);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [limit, categorySlug]);

  if (!loading && products.length === 0) return null;

  return (
    <section style={{ padding: '32px 0' }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ── CHANGE: icon box purple → warm red gradient ── */}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #db142e, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            🔥
          </div>
          <h2 style={{
            fontSize: 18, fontWeight: 900, color: '#111',
            margin: 0, fontFamily: "'Barlow', sans-serif",
          }}>
            {title}
          </h2>
          {/* ── CHANGE: pill label "Promoted" → "Popular Choice"
               Colour: purple → warm red/orange ── */}
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(219,20,46,0.08)', color: '#db142e',
            border: '1px solid rgba(219,20,46,0.18)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Popular Choice</span>
        </div>
      </div>

      {/* Grid or horizontal row — layout logic UNCHANGED */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: layout === 'grid'
            ? 'repeat(auto-fill, minmax(180px, 1fr))'
            : `repeat(${limit}, 180px)`,
          gap: 14, padding: '0 24px',
          overflowX: layout === 'row' ? 'auto' : undefined,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 12, overflow: 'hidden', background: '#f5f5f5',
            }}>
              <div style={{
                aspectRatio: '3/4',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)',
                backgroundSize: '600px 100%',
                animation: 'shimmer 1.3s infinite linear',
              }} />
              <div style={{ padding: 12 }}>
                <div style={{ height: 10, background: '#eee', borderRadius: 4, marginBottom: 6, width: '60%' }} />
                <div style={{ height: 13, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 15, background: '#fde8ea', borderRadius: 4, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: layout === 'row' ? 'flex' : 'grid',
          gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(180px, 1fr))' : undefined,
          flexDirection: layout === 'row' ? 'row' : undefined,
          gap: 14, padding: '0 24px',
          overflowX: layout === 'row' ? 'auto' : undefined,
          paddingBottom: layout === 'row' ? 8 : 0,
          scrollbarWidth: 'none',
        }}>
          {products.map(p => (
            <div key={p.id} style={{
              flexShrink: layout === 'row' ? 0 : undefined,
              width: layout === 'row' ? 180 : undefined,
            }}>
              <SponsoredCard product={p} showBadge={showBadge} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        section div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}