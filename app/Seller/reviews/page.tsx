'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star, MessageSquare, ThumbsUp, AlertCircle, Reply, Flag, RefreshCw,
  BarChart2, Tag, AlertTriangle, X, CheckCircle,
} from 'lucide-react';
import { useTheme } from '@/app/seller/layout';

const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () => typeof window !== 'undefined'
  ? (localStorage.getItem('ct_auth_token') ?? localStorage.getItem('auth_token') ?? null)
  : null;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewStats {
  total: number; average_rating: number;
  positive_count: number; negative_count: number; neutral_count: number;
  with_photos: number; response_rate: number; pending_reports: number;
  by_rating: Record<string, number>;
  best_products: { product_id: number; name: string; avg_rating: number; review_count: number }[];
  worst_products: { product_id: number; name: string; avg_rating: number; review_count: number }[];
  top_tags: { id: number; label: string; sentiment: string; icon: string; usage_count: number }[];
  alerts: { id: number; label: string; sentiment: string; icon: string; usage_count: number }[];
  trend: { month: string; count: number; avg_rating: number }[];
}

interface ReviewItem {
  id: number; rating: number; body: string | null; display_name: string;
  is_verified: boolean; status: string; helpful_count: number;
  tags: { id: number; label: string; sentiment: string; icon: string }[];
  media: { id: number; url: string }[];
  reply: { id: number; body: string; created_at: string } | null;
  reports_count: number;
  product: { id: number; name: string; slug: string };
  created_at: string;
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} fill={i <= rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={1.5} />
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, accent, icon: Icon, dark }: {
  title: string; value: string | number; subtitle?: string;
  accent: string; icon: React.ElementType; dark: boolean;
}) {
  const bg = dark ? '#161b27' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const txt = dark ? '#fff' : '#111';
  const muted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  return (
    <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: accent, opacity: dark ? 0.12 : 0.08, filter: 'blur(24px)' }} />
      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, marginBottom: 12 }}>
        <Icon size={18} />
      </div>
      <p style={{ fontSize: 24, fontWeight: 900, color: txt, margin: '0 0 4px', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 800, color: accent, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      {subtitle && <p style={{ fontSize: 11, color: muted, margin: 0, fontWeight: 500 }}>{subtitle}</p>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},transparent)`, opacity: 0.6 }} />
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────────────────

function ReportModal({ reviewId, dark, onClose, onDone }: {
  reviewId: number; dark: boolean; onClose: () => void; onDone: () => void;
}) {
  const [reason,    setReason]    = useState('');
  const [note,      setNote]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  const reasons = [
    { value: 'fake',          label: '🤥 Fake Review' },
    { value: 'spam',          label: '🚫 Spam' },
    { value: 'inappropriate', label: '⚠️ Inappropriate Content' },
    { value: 'offensive',     label: '🤬 Offensive Language' },
    { value: 'other',         label: '📝 Other' },
  ];

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason.'); return; }
    setSending(true); setError('');
    try {
      const res  = await fetch(`${API_URL}/seller/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ reason, note }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => { onDone(); onClose(); }, 1500);
      } else {
        setError(json.message ?? 'Failed to submit report.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: dark ? '#1a2035' : '#fff', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 16, fontWeight: 900, color: dark ? '#fff' : '#0f172a', margin: '0 0 6px' }}>Report Submitted</p>
            <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.5)' : '#64748b', margin: 0 }}>The admin will review this report.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: dark ? '#fff' : '#0f172a', margin: 0 }}>
                🚩 Report Review
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.5)' : '#64748b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select reason *
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {reasons.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  style={{
                    padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                    border: `1.5px solid ${reason === r.value ? '#ef4444' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: reason === r.value ? 'rgba(239,68,68,0.08)' : (dark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    color: reason === r.value ? '#ef4444' : (dark ? 'rgba(255,255,255,0.7)' : '#374151'),
                    fontSize: 13, fontWeight: reason === r.value ? 700 : 500, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.5)' : '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Additional note (optional)
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Explain why this review should be removed…"
              style={{
                width: '100%', borderRadius: 10, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                padding: '10px 12px', fontSize: 13, color: dark ? '#fff' : '#374151',
                fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: 'transparent', color: dark ? 'rgba(255,255,255,0.6)' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending || !reason}
                style={{
                  flex: 2, height: 44, borderRadius: 12, border: 'none',
                  background: !reason ? '#e2e8f0' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: !reason ? '#94a3b8' : '#fff',
                  fontWeight: 900, cursor: sending || !reason ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontFamily: 'inherit',
                }}
              >
                {sending ? 'Submitting…' : '🚩 Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reply Modal ───────────────────────────────────────────────────────────────

function ReplyModal({ reviewId, existing, dark, onClose, onSaved }: {
  reviewId: number; existing: string; dark: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [body,   setBody]   = useState(existing);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/seller/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ body }),
      });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#1a2035' : '#fff', borderRadius: 20, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: dark ? '#fff' : '#0f172a', margin: '0 0 16px' }}>Reply to Review</h3>
        <textarea
          value={body} onChange={e => setBody(e.target.value)}
          rows={5} maxLength={1000} placeholder="Write your professional reply…"
          style={{ width: '100%', borderRadius: 12, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', padding: '12px 14px', fontSize: 14, color: dark ? '#fff' : '#374151', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
        />
        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', margin: '4px 0 16px' }}>{body.length}/1000</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: 'transparent', color: dark ? 'rgba(255,255,255,0.6)' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || body.trim().length < 5}
            style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: body.trim().length >= 5 ? 'linear-gradient(135deg,#db142e,#a00f22)' : '#e2e8f0', color: body.trim().length >= 5 ? '#fff' : '#94a3b8', fontWeight: 900, cursor: saving ? 'wait' : 'pointer', fontSize: 13 }}>
            {saving ? 'Saving…' : 'Save Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Row ────────────────────────────────────────────────────────────────

function ReviewRow({ review, dark, onReply, onReport }: {
  review: ReviewItem; dark: boolean;
  onReply: (id: number, existing: string) => void;
  onReport: (id: number) => void;
}) {
  const bg     = dark ? '#161b27' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const txt    = dark ? '#fff' : '#0f172a';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  return (
    <div style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#db142e,#a00f22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
            {review.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: txt }}>{review.display_name}</span>
            {review.is_verified && <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, marginLeft: 6, background: 'rgba(5,150,105,0.1)', padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(5,150,105,0.2)' }}>✅ Verified</span>}
            <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>{review.product?.name} · {review.created_at}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Stars rating={review.rating} />
          {review.reports_count > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 7px', borderRadius: 999 }}>
              {review.reports_count} report{review.reports_count > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {review.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {review.tags.map(tag => (
            <span key={tag.id} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              background: tag.sentiment === 'positive' ? 'rgba(5,150,105,0.08)' : tag.sentiment === 'negative' ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)',
              color: tag.sentiment === 'positive' ? '#059669' : tag.sentiment === 'negative' ? '#ef4444' : '#64748b',
              border: `1px solid ${tag.sentiment === 'positive' ? 'rgba(5,150,105,0.2)' : tag.sentiment === 'negative' ? 'rgba(239,68,68,0.2)' : 'rgba(100,116,139,0.15)'}`,
            }}>
              {tag.icon} {tag.label}
            </span>
          ))}
        </div>
      )}

      {review.body && <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.8)' : '#374151', margin: 0, lineHeight: 1.6 }}>{review.body}</p>}

      {review.media.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {review.media.map(m => (
            <img key={m.id} src={m.url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: `1px solid ${border}` }} />
          ))}
        </div>
      )}

      {review.reply && (
        <div style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: 10, padding: '10px 12px', borderLeft: '3px solid #db142e' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#db142e', margin: '0 0 4px' }}>Your Reply</p>
          <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', margin: 0, lineHeight: 1.5 }}>{review.reply.body}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: `1px solid ${border}` }}>
        <button
          onClick={() => onReply(review.id, review.reply?.body ?? '')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: '#db142e', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Reply size={13} /> {review.reply ? 'Edit Reply' : 'Reply'}
        </button>
        <button
          onClick={() => onReport(review.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Flag size={13} /> Report Fake
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SellerReviewsPage() {
  const { dark } = useTheme();
  const [stats,       setStats]       = useState<ReviewStats | null>(null);
  const [reviews,     setReviews]     = useState<ReviewItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [rFilter,     setRFilter]     = useState<number | null>(null);
  const [reply,       setReply]       = useState<{ id: number; existing: string } | null>(null);
  const [reportId,    setReportId]    = useState<number | null>(null);
  const [meta,        setMeta]        = useState({ page: 1, lastPage: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  const bg     = dark ? '#0D1117' : '#f0f2f5';
  const card   = dark ? '#161b27' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const txt    = dark ? '#fff' : '#111';
  const muted  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/seller/reviews/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch {}
  }, []);

  const fetchReviews = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '10' });
      if (rFilter) params.set('rating', String(rFilter));
      const res  = await fetch(`${API_URL}/seller/reviews?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setReviews(prev => append ? [...prev, ...json.data] : json.data);
        setMeta({ page: json.meta.current_page, lastPage: json.meta.last_page, total: json.meta.total });
      }
    } catch {} finally { setLoading(false); setLoadingMore(false); }
  }, [rFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReviews(1); }, [fetchReviews]);

  const refresh = () => { fetchStats(); fetchReviews(1); };

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.4s ease both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: txt, margin: '0 0 3px', letterSpacing: '-0.02em' }}>Reviews & Reputation</h1>
            <p style={{ fontSize: 12, color: muted, margin: 0 }}>Manage customer feedback and build trust</p>
          </div>
          <button onClick={refresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${border}`, background: card, color: muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <KpiCard dark={dark} title="Average Rating"   value={stats.average_rating} subtitle={`${stats.total} total reviews`} accent="#f59e0b" icon={Star} />
            <KpiCard dark={dark} title="Positive Reviews" value={`${stats.total > 0 ? Math.round((stats.positive_count / stats.total) * 100) : 0}%`} subtitle={`${stats.positive_count} positive`} accent="#10b981" icon={ThumbsUp} />
            <KpiCard dark={dark} title="Response Rate"   value={`${stats.response_rate}%`} subtitle="Of reviews replied" accent="#3b82f6" icon={MessageSquare} />
            <KpiCard dark={dark} title="Pending Reports"  value={stats.pending_reports} subtitle="Awaiting admin review" accent={stats.pending_reports > 0 ? '#ef4444' : '#94a3b8'} icon={AlertCircle} />
          </div>
        )}

        {/* Rating Distribution + Tags */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: card, borderRadius: 18, border: `1px solid ${border}`, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: txt, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={15} color="#f59e0b" /> Rating Distribution
              </p>
              {[5,4,3,2,1].map(star => {
                const count = stats.by_rating[star] ?? 0;
                const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <button key={star} onClick={() => setRFilter(rFilter === star ? null : star)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 8, background: rFilter === star ? 'rgba(219,20,46,0.05)' : 'transparent', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: muted, minWidth: 12, textAlign: 'right' }}>{star}</span>
                    <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
                    <div style={{ flex: 1, height: 5, background: dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: star >= 4 ? '#10b981' : star === 3 ? '#f59e0b' : '#ef4444', width: `${pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: 'right' }}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.alerts.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', padding: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} /> Repeated Complaints
                  </p>
                  {stats.alerts.map(a => (
                    <div key={a.id} style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', marginBottom: 5, fontWeight: 600 }}>
                      {a.icon} {a.usage_count} customers mentioned "{a.label}"
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: card, borderRadius: 14, border: `1px solid ${border}`, padding: 16, flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: txt, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={13} color="#3b82f6" /> Most Used Tags
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {stats.top_tags.slice(0, 8).map(tag => (
                    <span key={tag.id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 700, background: tag.sentiment === 'positive' ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)', color: tag.sentiment === 'positive' ? '#059669' : '#ef4444', border: `1px solid ${tag.sentiment === 'positive' ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {tag.icon} {tag.label} ({tag.usage_count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div style={{ background: card, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: txt, margin: '0 10px 0 0' }}>All Reviews ({meta.total})</p>
            {rFilter && (
              <button onClick={() => setRFilter(null)} style={{ padding: '5px 12px', borderRadius: 999, border: '1.5px solid #db142e', background: 'rgba(219,20,46,0.06)', color: '#db142e', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ★ {rFilter} Stars ✕
              </button>
            )}
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: muted }}>
                <RefreshCw size={24} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontWeight: 600, fontSize: 13 }}>Loading reviews…</p>
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: muted }}>
                <Star size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700 }}>No reviews yet</p>
              </div>
            ) : reviews.map(review => (
              <ReviewRow
                key={review.id}
                review={review}
                dark={dark}
                onReply={(id, ex) => setReply({ id, existing: ex })}
                onReport={(id) => setReportId(id)}
              />
            ))}

            {meta.page < meta.lastPage && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button onClick={() => fetchReviews(meta.page + 1, true)} disabled={loadingMore}
                  style={{ padding: '10px 28px', borderRadius: 12, border: `1.5px solid ${border}`, background: 'transparent', color: txt, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loadingMore ? 'Loading…' : `Load More (${meta.total - reviews.length} remaining)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {reply && (
        <ReplyModal
          reviewId={reply.id}
          existing={reply.existing}
          dark={dark}
          onClose={() => setReply(null)}
          onSaved={refresh}
        />
      )}

      {/* Report Modal */}
      {reportId !== null && (
        <ReportModal
          reviewId={reportId}
          dark={dark}
          onClose={() => setReportId(null)}
          onDone={refresh}
        />
      )}
    </>
  );
}