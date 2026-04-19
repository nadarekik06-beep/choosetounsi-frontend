'use client';
/**
 * app/discover/page.tsx  — "Explore / Discover" page
 *
 * Mix of sponsored + organic products in a single feed.
 * Rotation logic:
 *   - Every 4th product is a sponsored product (injected at positions 0, 4, 8, …)
 *   - Rest are organic products fetched from /api/products sorted by views
 *   - If fewer sponsored products are available, organic fills the gap
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Zap, Compass } from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import { sponsorshipApi, SponsoredProduct } from '@/lib/sponsorshipApi';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '');

interface OrganicProduct {
  id:                number;
  name:              string;
  slug:              string;
  price:             number | string;
  stock:             number;
  primary_image_url: string | null;
  category?:         { name: string; slug: string };
  seller?:           { name: string };
  is_sponsored?:     false;
  sponsor_data?:     null;
}

type FeedItem = (OrganicProduct | SponsoredProduct) & {
  _is_sponsored: boolean;
  _sponsor_id?:  number;
};

const SPONSORED_EVERY = 4; // insert sponsored at every Nth position

function ProductCard({ item }: { item: FeedItem }) {
  const [err, setErr] = useState(false);

  const handleClick = () => {
    if (item._is_sponsored && item._sponsor_id) {
      sponsorshipApi.recordClick(item._sponsor_id);
    }
  };

  return (
    <Link href={`/products/${item.slug}`} onClick={handleClick} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 13,
          overflow: 'hidden',
          border: item._is_sponsored ? '1.5px solid #e0d9ff' : '1px solid #eee',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = item._is_sponsored
            ? '0 8px 28px rgba(99,102,241,0.15)'
            : '0 8px 24px rgba(0,0,0,0.1)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
      >
        {/* Image */}
        <div style={{ aspectRatio: '3/4', background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}>
          {(item as any).primary_image_url && !err ? (
            <img
              src={(item as any).primary_image_url}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setErr(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: item._is_sponsored ? '#ede9fe' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item._is_sponsored ? <Zap size={28} color="#7c3aed" /> : <Compass size={28} color="#ccc" />}
            </div>
          )}

          {item._is_sponsored && (
            <span style={{
              position: 'absolute', top: 8, left: 8,
              background: 'rgba(99,102,241,0.9)',
              color: '#fff', fontSize: 8, fontWeight: 800,
              padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>Sponsored</span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 13px' }}>
          {(item as any).category?.name && (
            <p style={{ fontSize: 9, color: item._is_sponsored ? '#7c3aed' : '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>
              {(item as any).category.name}
            </p>
          )}
          <p style={{
            fontSize: 12.5, fontWeight: 700, color: '#1f2937',
            margin: '0 0 6px', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.name}
          </p>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', margin: 0 }}>
            {Number(item.price).toFixed(2)} DT
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const [feed,    setFeed]    = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const buildFeed = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      // Fetch sponsored + organic in parallel
      const [sponsoredRes, organicRes] = await Promise.allSettled([
        sponsorshipApi.publicFeed({ limit: 12 }),
        fetch(`${API_URL}/api/products?sort=views&per_page=20&page=${pageNum}`, {
          headers: { Accept: 'application/json' },
        }).then(r => r.json()),
      ]);

      const sponsored: SponsoredProduct[] =
        sponsoredRes.status === 'fulfilled' ? (sponsoredRes.value.data ?? []) : [];

      const organic: OrganicProduct[] =
        organicRes.status === 'fulfilled' ? (organicRes.value.data?.data ?? []) : [];

      const lastPage =
        organicRes.status === 'fulfilled' ? (organicRes.value.data?.last_page ?? 1) : 1;

      if (pageNum >= lastPage) setHasMore(false);

      // Deduplicate: remove organic products that are already sponsored
      const sponsoredIds = new Set(sponsored.map(s => s.id));
      const cleanOrganic = organic.filter(o => !sponsoredIds.has(o.id));

      // Interleave: insert one sponsored every SPONSORED_EVERY positions
      const merged: FeedItem[] = [];
      let sIdx = 0;

      cleanOrganic.forEach((o, i) => {
        if (i % SPONSORED_EVERY === 0 && sIdx < sponsored.length) {
          const s = sponsored[sIdx++];
          merged.push({
            ...s,
            _is_sponsored: true,
            _sponsor_id:   s.sponsor_data?.id,
          } as FeedItem);
        }
        merged.push({
          ...o,
          _is_sponsored: false,
        } as FeedItem);
      });

      // Append remaining sponsored items at end if any
      while (sIdx < sponsored.length) {
        const s = sponsored[sIdx++];
        merged.push({ ...s, _is_sponsored: true, _sponsor_id: s.sponsor_data?.id } as FeedItem);
      }

      setFeed(prev => pageNum === 1 ? merged : [...prev, ...merged]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buildFeed(1);
  }, [buildFeed]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    buildFeed(next);
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 60px' }}>
        <style>{`
          @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #db142e, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Compass size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: '0 0 2px', fontFamily: "'Barlow', sans-serif" }}>
              Explore & Discover
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              Curated mix of promoted and trending Tunisian products
            </p>
          </div>
        </div>

        {/* Feed grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {feed.map((item, i) => <ProductCard key={`${item._is_sponsored ? 's' : 'o'}-${item.id}-${i}`} item={item} />)}

          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={`sk-${i}`} style={{ borderRadius: 13, overflow: 'hidden', background: '#fff', border: '1px solid #eee' }}>
              <div style={{
                aspectRatio: '3/4',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)',
                backgroundSize: '600px 100%',
                animation: 'shimmer 1.3s infinite linear',
              }} />
              <div style={{ padding: 12 }}>
                <div style={{ height: 9, background: '#eee', borderRadius: 4, marginBottom: 6, width: '50%' }} />
                <div style={{ height: 12, background: '#eee', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 14, background: '#ede9fe', borderRadius: 4, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {!loading && hasMore && feed.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <button
              onClick={loadMore}
              style={{
                padding: '12px 36px', borderRadius: 12,
                background: 'linear-gradient(135deg, #db142e, #a00f22)',
                color: '#fff', border: 'none', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(219,20,46,0.3)',
              }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  );
}