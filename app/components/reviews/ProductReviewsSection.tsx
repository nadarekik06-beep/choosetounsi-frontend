'use client';

/**
 * ProductReviewsSection.tsx
 *
 * Drop-in component for the product detail page.
 * Inspired by SHEIN UX but 100% original implementation.
 *
 * Usage: Add <ProductReviewsSection slug={product.slug} /> at the bottom
 *        of app/(store)/products/[slug]/page.tsx
 *
 * Features:
 *  - Average rating + rating distribution bars
 *  - Customer photo gallery strip
 *  - Tag filter chips (with counts)
 *  - Star filter, verified filter, with-photos filter
 *  - Paginated review cards with: stars, name, verified badge,
 *    tags, images, helpful votes, seller reply, report button
 */

import { useState, useEffect, useCallback } from 'react';
import { Star, Camera, ThumbsUp, ThumbsDown, Flag, ChevronDown, ShieldCheck, BadgeCheck } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api');
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewTag {
  id: number; label: string; label_fr?: string; sentiment: 'positive' | 'negative' | 'neutral'; icon: string; usage_count?: number;
}
interface ReviewMedia { id: number; url: string; type: string; }
interface ReviewReply { body: string; seller_name: string; created_at: string; }
interface Review {
  id: number; rating: number; body: string | null; display_name: string;
  is_anonymous: boolean; is_verified: boolean;
  helpful_count: number; not_helpful_count: number; user_vote: 'helpful' | 'not_helpful' | null;
  tags: ReviewTag[]; media: ReviewMedia[]; reply: ReviewReply | null; created_at: string;
}
interface ReviewSummary {
  average: number; total: number;
  distribution: Record<string, { count: number; percent: number }>;
  top_tags: ReviewTag[];
  recent_photos: { id: number; url: string; review_id: number }[];
  photo_count: number;
  verified_count: number;
  with_photos_count: number;
}

// ── Star Row ──────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          fill={i <= rating ? '#f59e0b' : 'none'}
          stroke="#f59e0b" strokeWidth={1.5} />
      ))}
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, onVote, onReport }: {
  review: Review;
  onVote: (id: number, type: 'helpful' | 'not_helpful') => void;
  onReport: (id: number) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#db142e,#a00f22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 800,
          }}>
            {review.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{review.display_name}</span>
              {review.is_verified && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3, fontSize: 10,
                  fontWeight: 700, color: '#059669',
                  background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)',
                  padding: '2px 7px', borderRadius: 999,
                }}>
                  <BadgeCheck size={10} /> Verified Purchase
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{review.created_at}</span>
          </div>
        </div>
        <StarRow rating={review.rating} size={13} />
      </div>

      {/* Tags */}
      {review.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {review.tags.map(tag => (
            <span key={tag.id} style={{
              fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999,
              background: tag.sentiment === 'positive' ? 'rgba(5,150,105,0.08)' : tag.sentiment === 'negative' ? 'rgba(239,68,68,0.08)' : '#f8fafc',
              color: tag.sentiment === 'positive' ? '#059669' : tag.sentiment === 'negative' ? '#ef4444' : '#64748b',
              border: `1px solid ${tag.sentiment === 'positive' ? 'rgba(5,150,105,0.2)' : tag.sentiment === 'negative' ? 'rgba(239,68,68,0.2)' : '#e5e7eb'}`,
            }}>
              {tag.icon} {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      {review.body && (
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
          {review.body}
        </p>
      )}

      {/* Media */}
      {review.media.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {review.media.map(m => (
            <button key={m.id} onClick={() => setLightbox(m.url)}
              style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb', padding: 0, cursor: 'zoom-in', background: '#f8fafc', transition: 'border-color 0.15s' }}>
              <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Seller reply */}
      {review.reply && (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #db142e' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#db142e', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🏪 Seller's Reply — {review.reply.seller_name}
          </p>
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{review.reply.body}</p>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #f8fafc' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onVote(review.id, 'helpful')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999,
              border: `1px solid ${review.user_vote === 'helpful' ? '#db142e' : '#e5e7eb'}`,
              background: review.user_vote === 'helpful' ? 'rgba(219,20,46,0.06)' : '#fff',
              color: review.user_vote === 'helpful' ? '#db142e' : '#64748b',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <ThumbsUp size={12} /> {review.helpful_count > 0 ? review.helpful_count : 'Helpful'}
          </button>
        </div>
        <button onClick={() => onReport(review.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <Flag size={11} /> Report
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

// ── Main Section ───────────────────────────────────────────────────────────────

export default function ProductReviewsSection({ slug }: { slug: string }) {
  const [summary, setSummary]   = useState<ReviewSummary | null>(null);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [filter, setFilter]     = useState<string>('');
  const [ratingFilter, setRating] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<number | null>(null);
  const [reportModal, setReportModal] = useState<{ id: number } | null>(null);

  const fetchReviews = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('filter', filter);
      if (ratingFilter) params.set('rating', String(ratingFilter));
      if (tagFilter) params.set('tag_id', String(tagFilter));
      params.set('page', String(reset ? 1 : page));
      params.set('per_page', '8');

      const headers: Record<string, string> = { Accept: 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res  = await fetch(`${API_URL}/products/${slug}/reviews?${params}`, { headers });
      const json = await res.json();

      if (json.success) {
        if (reset) {
          setSummary(json.summary);
          setReviews(json.data);
          setPage(2);
        } else {
          setReviews(prev => [...prev, ...json.data]);
          setPage(p => p + 1);
        }
        setHasMore(json.meta.current_page < json.meta.last_page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug, filter, ratingFilter, tagFilter, page]);

  useEffect(() => { fetchReviews(true); }, [slug, filter, ratingFilter, tagFilter]); // eslint-disable-line

  const handleVote = async (reviewId: number, type: 'helpful' | 'not_helpful') => {
    if (!isAuthenticated()) return;
    const token = getToken();
    await fetch(`${API_URL}/reviews/${reviewId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type }),
    });
    fetchReviews(true);
  };

  const handleReport = async (reviewId: number, reason: string) => {
    if (!isAuthenticated()) return;
    const token = getToken();
    await fetch(`${API_URL}/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    setReportModal(null);
  };

  if (!summary && loading) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ height: 24, width: 200, background: '#f1f5f9', borderRadius: 8, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: 120, background: '#f8fafc', borderRadius: 12 }} />)}
      </div>
    </div>
  );

  if (!summary) return null;

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .rev-chip{transition:all 0.15s;cursor:pointer}
        .rev-chip:hover{border-color:#db142e!important;color:#db142e!important}
        .rev-load-btn:hover{background:#db142e!important;color:#fff!important}
      `}</style>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px', fontFamily: "'Barlow', sans-serif" }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 28px', letterSpacing: '-0.02em' }}>
          Customer Reviews ({summary.total.toLocaleString()})
        </h2>

        {/* ── Summary Block ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, marginBottom: 28, background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', padding: 24 }}>
          {/* Left: Score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRight: '1px solid #f1f5f9', paddingRight: 24 }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em' }}>{summary.average}</span>
            <StarRow rating={Math.round(summary.average)} size={22} />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{summary.total.toLocaleString()} reviews</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', marginTop: 8 }}>
              <span>📸 {summary.photo_count} photos</span>
              <span>✅ {summary.verified_count} verified</span>
            </div>
          </div>

          {/* Right: Distribution bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            {[5, 4, 3, 2, 1].map(star => {
              const d = summary.distribution[star] ?? { count: 0, percent: 0 };
              return (
            <button key={star} className="rev-chip"
  onClick={() => setRating(ratingFilter === star ? null : star)}
  style={{
    display: 'flex', alignItems: 'center', gap: 10, border: 'none',
    cursor: 'pointer', padding: '3px 8px', borderRadius: 8,
    background: ratingFilter === star ? 'rgba(219,20,46,0.04)' : 'transparent',
  }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 12 }}>{star}</span>
                  <Star size={12} fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5} />
                  <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', width: `${d.percent}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>{d.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Customer Photos Strip ─────────────────────────────────── */}
        {summary.recent_photos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📸 Customer Photos ({summary.photo_count})
            </p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {summary.recent_photos.map(photo => (
                <div key={photo.id} style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1.5px solid #e5e7eb', cursor: 'pointer' }}>
                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tag Filter Chips ──────────────────────────────────────── */}
        {summary.top_tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {summary.top_tags.map(tag => (
              <button key={tag.id} className="rev-chip"
                onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${tagFilter === tag.id ? '#db142e' : '#e5e7eb'}`,
                  background: tagFilter === tag.id ? 'rgba(219,20,46,0.06)' : '#fff',
                  color: tagFilter === tag.id ? '#db142e' : '#374151',
                  cursor: 'pointer',
                }}>
                {tag.icon} {tag.label} {tag.usage_count ? `(${tag.usage_count})` : ''}
              </button>
            ))}
          </div>
        )}

        {/* ── Filter Bar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: '', label: 'All Reviews' },
            { key: 'with_photos', label: `📸 With Photos (${summary.with_photos_count})` },
            { key: 'verified', label: `✅ Verified (${summary.verified_count})` },
            { key: 'helpful', label: '👍 Most Helpful' },
          ].map(f => (
            <button key={f.key} className="rev-chip"
              onClick={() => setFilter(filter === f.key ? '' : f.key)}
              style={{
                padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${filter === f.key ? '#db142e' : '#e5e7eb'}`,
                background: filter === f.key ? 'rgba(219,20,46,0.06)' : '#fff',
                color: filter === f.key ? '#db142e' : '#374151',
                cursor: 'pointer',
              }}>
              {f.label}
            </button>
          ))}
          {ratingFilter && (
            <button className="rev-chip" onClick={() => setRating(null)}
              style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1.5px solid #db142e', background: 'rgba(219,20,46,0.06)', color: '#db142e', cursor: 'pointer' }}>
              ★ {ratingFilter} Stars ✕
            </button>
          )}
        </div>

        {/* ── Reviews List ─────────────────────────────────────────── */}
        {reviews.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <Star size={32} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 700, fontSize: 14 }}>No reviews match your filters</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map((review, i) => (
              <div key={review.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                <ReviewCard
                  review={review}
                  onVote={handleVote}
                  onReport={(id) => setReportModal({ id })}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Load More ────────────────────────────────────────────── */}
        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="rev-load-btn"
              onClick={() => fetchReviews(false)}
              disabled={loading}
              style={{
                padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 800,
                border: '2px solid #db142e', background: '#fff', color: '#db142e',
                cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <ChevronDown size={16} /> {loading ? 'Loading…' : 'Load More Reviews'}
            </button>
          </div>
        )}
      </section>

      {/* ── Report Modal ──────────────────────────────────────────────── */}
      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setReportModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: '0 0 16px' }}>Report Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['spam', 'fake', 'inappropriate', 'offensive', 'other'].map(r => (
                <button key={r} onClick={() => handleReport(reportModal.id, r)}
                  style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8fafc', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#374151', cursor: 'pointer', textTransform: 'capitalize' }}>
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setReportModal(null)}
              style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#f1f5f9', fontWeight: 700, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}