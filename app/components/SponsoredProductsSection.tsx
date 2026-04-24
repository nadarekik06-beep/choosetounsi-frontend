'use client';

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

function SponsoredCard({
  product,
  showBadge,
  index,
}: {
  product: SponsoredProduct;
  showBadge: boolean;
  index: number;
}) {
  const [imgErr, setImgErr]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current && product.sponsor_data?.id) {
      tracked.current = true;
      sponsorshipApi.recordImpression(product.sponsor_data.id);
    }
  }, [product.sponsor_data?.id]);

  const handleClick = () => {
    if (product.sponsor_data?.id) sponsorshipApi.recordClick(product.sponsor_data.id);
  };

  // Alternate red / green / red spotlight tint per card
  const isGreen       = index % 3 === 1;
  const spotColor     = isGreen ? 'rgba(25,143,65,0.13)'  : 'rgba(219,20,46,0.13)';
  const spotColorMid  = isGreen ? 'rgba(25,143,65,0.06)'  : 'rgba(219,20,46,0.06)';
  const borderHover   = isGreen ? 'rgba(25,143,65,0.30)'  : 'rgba(219,20,46,0.30)';
  const shadowHover   = isGreen
    ? '0 16px 48px rgba(25,143,65,0.16), 0 4px 14px rgba(0,0,0,0.06)'
    : '0 16px 48px rgba(219,20,46,0.16), 0 4px 14px rgba(0,0,0,0.06)';
  const accentColor   = isGreen ? '#198f41' : '#db142e';
  const arrowShadow   = isGreen
    ? '0 3px 10px rgba(25,143,65,0.4)'
    : '0 3px 10px rgba(219,20,46,0.4)';
  const topLineGrad   = isGreen
    ? 'linear-gradient(90deg, transparent, rgba(25,143,65,0.65), transparent)'
    : 'linear-gradient(90deg, transparent, rgba(219,20,46,0.65), transparent)';

  return (
    <Link
      href={`/products/${product.slug}`}
      onClick={handleClick}
      className="spcard-link"
      style={{ animationDelay: `${index * 0.055}s` }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 14,
          overflow: 'hidden',
          border: `1.5px solid ${hovered ? borderHover : '#efefef'}`,
          cursor: 'pointer',
          transition: 'transform 0.3s cubic-bezier(.34,1.4,.64,1), box-shadow 0.3s ease, border-color 0.3s ease',
          transform: hovered ? 'translateY(-7px) scale(1.025)' : 'translateY(0) scale(1)',
          boxShadow: hovered ? shadowHover : '0 2px 8px rgba(0,0,0,0.04)',
          willChange: 'transform',
        }}
      >
        {/* Stage spotlight cone — projects from top down */}
        <div style={{
          position: 'absolute',
          top: -1, left: '50%',
          transform: 'translateX(-50%)',
          width: '130%',
          height: '75%',
          background: `radial-gradient(ellipse at 50% 0%, ${spotColor} 0%, ${spotColorMid} 40%, transparent 72%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.35s ease',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Thin top glowing line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: topLineGrad,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.28s ease',
          zIndex: 3,
          pointerEvents: 'none',
        }} />

        {/* ── Image ── */}
        <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f7f7f7', overflow: 'hidden', zIndex: 1 }}>
          {product.primary_image_url && !imgErr ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transition: 'transform 0.4s ease',
                transform: hovered ? 'scale(1.07)' : 'scale(1)',
              }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#fff1f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>🔥</div>
          )}

          {/* HOT badge */}
          {showBadge && (
            <span style={{
              position: 'absolute', top: 7, left: 7,
              background: 'linear-gradient(135deg, #db142e, #ff4757)',
              color: '#fff', fontSize: 8, fontWeight: 800,
              padding: '2px 7px', borderRadius: 999,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(219,20,46,0.38)',
              zIndex: 2,
              fontFamily: "'Barlow', sans-serif",
            }}>
              🔥 HOT
            </span>
          )}

          {/* Sold out */}
          {product.stock <= 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,0.68)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
            }}>
              <span style={{
                background: '#111', color: '#fff', fontSize: 8, fontWeight: 900,
                padding: '4px 10px', borderRadius: 999,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: "'Barlow', sans-serif",
              }}>SOLD OUT</span>
            </div>
          )}

          {/* Quick View pill — slides up on hover */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%',
            transform: hovered ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(10px)',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(6px)',
            color: '#111', fontSize: 9, fontWeight: 800,
            padding: '5px 11px', borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            whiteSpace: 'nowrap', zIndex: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            fontFamily: "'Barlow', sans-serif",
            letterSpacing: '0.03em',
            pointerEvents: 'none',
          }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Quick View
          </div>
        </div>

        {/* ── Info ── */}
        <div style={{ padding: '9px 11px 11px', position: 'relative', zIndex: 1, background: '#fff' }}>
          {product.category?.name && (
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 8, fontWeight: 800,
              color: accentColor,
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px',
            }}>
              {product.category.name}
            </p>
          )}
          <p style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: 12, fontWeight: 700, color: '#111',
            margin: '0 0 5px', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {product.name}
          </p>
          {product.sponsor_data?.ai_ad_copy && (
            <p style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 9.5, color: '#bbb', fontStyle: 'italic',
              margin: '0 0 5px', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {product.sponsor_data.ai_ad_copy}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 15, fontWeight: 900,
              color: hovered ? accentColor : '#db142e',
              margin: 0,
              transition: 'color 0.2s ease',
            }}>
              {Number(product.price).toFixed(2)} DT
            </p>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: hovered ? accentColor : '#f5f5f5',
              border: `1px solid ${hovered ? accentColor : '#e8e8e8'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: hovered ? '#fff' : '#aaa',
              transition: 'all 0.22s ease',
              transform: hovered ? 'rotate(-45deg)' : 'rotate(0deg)',
              boxShadow: hovered ? arrowShadow : 'none',
              flexShrink: 0,
            }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SponsoredProductsSection({
  title        = '🔥 Trending Now',
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800;900&display=swap');

        @keyframes spShimmer   { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes spFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes spIconPulse {
          0%,100% { box-shadow: 0 4px 14px rgba(219,20,46,0.35); }
          50%     { box-shadow: 0 4px 24px rgba(219,20,46,0.65); }
        }

        /* ── Section wrapper — full viewport width ── */
        .sp-section {
          position: relative;
          width: 100%;
          background:
            radial-gradient(ellipse 100% 100% at 0%   50%, rgba(219,20,46,0.11) 0%, transparent 60%),
            radial-gradient(ellipse 100% 100% at 100% 50%, rgba(25,143,65,0.09)  0%, transparent 60%),
            radial-gradient(ellipse 100% 60%  at 50%  0%,  rgba(219,20,46,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 100% 60%  at 50%  100%, rgba(25,143,65,0.05) 0%, transparent 55%),
            #fdf7f7;
          padding: 22px 0 22px;
          overflow: hidden;
          display: block;
        }

        .sp-spotlight-tl,
        .sp-spotlight-tr,
        .sp-spotlight-bl,
        .sp-spotlight-br,
        .sp-spotlight-center { display: none; }

        /* ══════════════════════════════════════════
           LEGENDARY ANIMATED BORDERS
        ══════════════════════════════════════════ */

        /* Shared keyframes */
        @keyframes borderSweep {
          0%   { background-position: -200% center; }
          100% { background-position: 300% center; }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.7; transform: scaleX(1);   }
          50%       { opacity: 1;   transform: scaleX(1.01); }
        }
        @keyframes particleLeft {
          0%   { transform: translateX(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(100vw);  opacity: 0; }
        }
        @keyframes particleRight {
          0%   { transform: translateX(100vw);  opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes glowFlicker {
          0%,100% { opacity: 1; }
          45%     { opacity: 0.6; }
          50%     { opacity: 1; }
          55%     { opacity: 0.7; }
        }

        /* ── TOP BORDER — same as bottom ── */
        .sp-top-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          overflow: hidden;
          pointer-events: none;
          z-index: 10;
        }

        /* Base glow — green left, red right (same as bottom) */
        .sp-top-line::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(25,143,65,0.5)   0%,
            rgba(80,200,120,0.8)  20%,
            rgba(255,255,255,0.9) 50%,
            rgba(255,80,80,0.8)   80%,
            rgba(219,20,46,0.5)   100%);
          animation: borderPulse 5s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        /* Sweep — right to left (same as bottom) */
        .sp-top-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            transparent 30%,
            rgba(255,255,255,0.0) 38%,
            rgba(255,255,255,1.0) 50%,
            rgba(255,255,255,0.0) 62%,
            transparent 70%,
            transparent 100%);
          background-size: 200% 100%;
          animation: borderSweep 5s linear infinite reverse;
          animation-delay: 1.4s;
        }

        /* Particle — green, right to left */
        .sp-top-particle-red {
          position: absolute;
          top: -1px;
          right: 0;
          width: 6px; height: 5px;
          border-radius: 50%;
          background: #1adb6a;
          box-shadow: 0 0 8px 3px rgba(25,143,65,0.9), 0 0 16px 6px rgba(25,143,65,0.4);
          animation: particleRight 5s linear infinite;
          animation-delay: 1.4s;
          pointer-events: none;
          z-index: 11;
        }

        /* Particle — red, right to left */
        .sp-top-particle-white {
          position: absolute;
          top: -1px;
          right: 0;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #ff4757;
          box-shadow: 0 0 10px 4px rgba(219,20,46,0.9), 0 0 20px 8px rgba(219,20,46,0.4);
          animation: particleRight 5s linear infinite;
          animation-delay: 0s;
          pointer-events: none;
          z-index: 11;
        }

        /* ── BOTTOM BORDER ── */
        .sp-bottom-line {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          overflow: hidden;
          pointer-events: none;
          z-index: 10;
        }

        /* Base glow — reversed colors (green left, red right) */
        .sp-bottom-line::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(25,143,65,0.5)   0%,
            rgba(80,200,120,0.8)  20%,
            rgba(255,255,255,0.9) 50%,
            rgba(255,80,80,0.8)   80%,
            rgba(219,20,46,0.5)   100%);
          animation: borderPulse 5s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        /* Moving sweep — goes right to left on bottom */
        .sp-bottom-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            transparent 30%,
            rgba(255,255,255,0.0) 38%,
            rgba(255,255,255,1.0) 50%,
            rgba(255,255,255,0.0) 62%,
            transparent 70%,
            transparent 100%);
          background-size: 200% 100%;
          animation: borderSweep 5s linear infinite reverse;
          animation-delay: 1.4s;
        }

        /* Particle dot — green, goes right to left */
        .sp-bottom-particle-green {
          position: absolute;
          bottom: -1px;
          right: 0;
          width: 6px; height: 5px;
          border-radius: 50%;
          background: #1adb6a;
          box-shadow: 0 0 8px 3px rgba(25,143,65,0.9), 0 0 16px 6px rgba(25,143,65,0.4);
          animation: particleRight 5s linear infinite;
          animation-delay: 1.4s;
          pointer-events: none;
          z-index: 11;
        }

        /* Particle dot — red, right to left */
        .sp-bottom-particle-red {
          position: absolute;
          bottom: -1px;
          right: 0;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #ff4757;
          box-shadow: 0 0 10px 4px rgba(219,20,46,0.9), 0 0 20px 8px rgba(219,20,46,0.4);
          animation: particleRight 5s linear infinite;
          animation-delay: 0s;
          pointer-events: none;
          z-index: 11;
        }

        .sp-inner {
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ── Header ── */
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          margin-bottom: 12px;
        }
        .sp-header-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .sp-icon-box {
          width: 30px; height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, #db142e, #f97316);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
          animation: spIconPulse 5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .sp-title {
          font-family: 'Barlow', sans-serif;
          font-size: 17px;
          font-weight: 900;
          color: #111;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .sp-pill {
          font-family: 'Barlow', sans-serif;
          font-size: 8px; font-weight: 800;
          padding: 3px 8px; border-radius: 999px;
          background: rgba(219,20,46,0.07);
          color: #db142e;
          border: 1px solid rgba(219,20,46,0.18);
          text-transform: uppercase; letter-spacing: 0.09em;
          white-space: nowrap;
        }
        .sp-view-all {
          font-family: 'Barlow', sans-serif;
          font-size: 11px; font-weight: 700;
          color: #999; text-decoration: none;
          letter-spacing: 0.05em; text-transform: uppercase;
          transition: color 0.18s;
          display: flex; align-items: center; gap: 4px;
        }
        .sp-view-all:hover { color: #db142e; }

        /* ── Row ── */
        .sp-row {
          display: flex;
          gap: 10px;
          padding: 4px 24px 10px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sp-row::-webkit-scrollbar { display: none; }

        .spcard-link {
          flex: 0 0 auto;
          width: 150px;
          text-decoration: none;
          color: inherit;
          display: block;
          animation: spFadeUp 0.42s ease both;
        }

        /* ── Skeleton ── */
        .sp-skel {
          flex: 0 0 auto; width: 150px;
          border-radius: 14px; overflow: hidden;
          background: #fff; border: 1.5px solid #f0f0f0;
        }
        .sp-skel-img {
          aspect-ratio: 3/4;
          background: linear-gradient(90deg, #f4f4f4 25%, #fafafa 50%, #f4f4f4 75%);
          background-size: 600px 100%;
          animation: spShimmer 1.4s infinite linear;
        }
        .sp-skel-line {
          margin: 0 11px; border-radius: 4px;
          background: linear-gradient(90deg, #f4f4f4 25%, #fafafa 50%, #f4f4f4 75%);
          background-size: 600px 100%;
          animation: spShimmer 1.4s infinite linear;
        }
        .sp-skel-info { padding: 9px 0 11px; display: flex; flex-direction: column; gap: 6px; }
      `}</style>

      <section className="sp-section">
        <div className="sp-top-line">
          <div className="sp-top-particle-red" />
          <div className="sp-top-particle-white" />
        </div>
        <div className="sp-bottom-line">
          <div className="sp-bottom-particle-green" />
          <div className="sp-bottom-particle-red" />
        </div>
        <div className="sp-spotlight-tl" />
        <div className="sp-spotlight-tr" />
        <div className="sp-spotlight-bl" />
        <div className="sp-spotlight-br" />
        <div className="sp-spotlight-center" />

        <div className="sp-inner">
          <div className="sp-header">
            <div className="sp-header-left">
              <div className="sp-icon-box">🔥</div>
              <h2 className="sp-title">{title}</h2>
              <span className="sp-pill">Popular Choice</span>
            </div>
            <Link href="/shop" className="sp-view-all">
              View All
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="sp-row">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="sp-skel">
                  <div className="sp-skel-img" style={{ animationDelay: `${i * 0.07}s` }} />
                  <div className="sp-skel-info">
                    <div className="sp-skel-line" style={{ height: 8, width: '55%' }} />
                    <div className="sp-skel-line" style={{ height: 12 }} />
                    <div className="sp-skel-line" style={{ height: 14, width: '45%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sp-row">
              {products.map((p, i) => (
                <SponsoredCard key={p.id} product={p} showBadge={showBadge} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}