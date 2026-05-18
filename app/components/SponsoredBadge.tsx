'use client';

/**
 * app/components/SponsoredBadge.tsx
 *
 * Drop-in badge for the choosetounsi-frontend product cards.
 * Show it when product.is_sponsored === true.
 *
 * Usage:
 *   import SponsoredBadge from '@/components/SponsoredBadge';
 *   {product.is_sponsored && <SponsoredBadge />}
 *
 * Variants:
 *   <SponsoredBadge />           → default (gold pill, top-left)
 *   <SponsoredBadge compact />   → tiny, for grid cards
 */

interface SponsoredBadgeProps {
  compact?: boolean;
  className?: string;
}

export default function SponsoredBadge({ compact = false, className }: SponsoredBadgeProps) {
  if (compact) {
    return (
      <span
        className={className}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            3,
          padding:        '2px 6px',
          borderRadius:   999,
          background:     'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))',
          border:         '1px solid rgba(245,158,11,0.4)',
          fontSize:       9,
          fontWeight:     800,
          color:          '#f59e0b',
          letterSpacing:  '0.06em',
          textTransform:  'uppercase',
          whiteSpace:     'nowrap',
          pointerEvents:  'none',
        }}
      >
        ⭐ Trending 
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           4,
        padding:       '4px 10px',
        borderRadius:  999,
        background:    'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(251,191,36,0.14))',
        border:        '1px solid rgba(245,158,11,0.45)',
        fontSize:      10,
        fontWeight:    800,
        color:         '#f59e0b',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        whiteSpace:    'nowrap',
        pointerEvents: 'none',
        boxShadow:     '0 2px 8px rgba(245,158,11,0.2)',
      }}
    >
      ⭐ Trending
    </span>
  );
}

/**
 * ─── HOW TO ADD TO PRODUCT CARDS IN STOREFRONT ───────────────────────────────
 *
 * In your product card component (e.g. ProductCard.tsx), add this inside the
 * card's absolute-positioned badge area (where you already show "Featured", etc.):
 *
 *   import SponsoredBadge from '@/components/SponsoredBadge';
 *
 *   // Inside the card:
 *   <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
 *     {product.is_sponsored && <SponsoredBadge compact />}
 *     {product.featured && <span className="featured-badge">Featured</span>}
 *   </div>
 *
 * ─── TYPE EXTENSION ───────────────────────────────────────────────────────────
 * Add is_sponsored to your Product type interface:
 *
 *   interface Product {
 *     ...
 *     is_sponsored:       boolean;
 *     sponsored_priority: number;
 *   }
 */