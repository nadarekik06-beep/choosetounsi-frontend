'use client';

/**
 * ReviewSubmitModal.tsx — FIXED
 *
 * Fix #1: Token key corrected from 'auth_token' → 'ct_auth_token' (with fallback)
 * Fix #2: Tags loaded with useEffect (not useState hack which runs only once)
 * Fix #3: Error messages from API properly displayed
 * Fix #4: Image preview cleanup (URL.revokeObjectURL) to prevent memory leaks
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Star, X, Upload, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/** Consistent token lookup — matches the rest of the storefront */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('ct_auth_token') ??
    localStorage.getItem('auth_token') ??
    localStorage.getItem('token') ??
    null
  );
};

interface ReviewTag {
  id: number;
  label: string;
  label_fr?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  icon: string;
}

interface Props {
  orderItemId: number;
  productName: string;
  productImage?: string | null;
  variantLabel?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const HOVER_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const HOVER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export default function ReviewSubmitModal({
  orderItemId,
  productName,
  productImage,
  variantLabel,
  onClose,
  onSuccess,
}: Props) {
  const [rating,       setRating]      = useState(0);
  const [hoverRating,  setHoverRating] = useState(0);
  const [tags,         setTags]        = useState<ReviewTag[]>([]);
  const [selectedTags, setSelected]    = useState<number[]>([]);
  const [body,         setBody]        = useState('');
  const [isAnon,       setIsAnon]      = useState(false);
  const [images,       setImages]      = useState<File[]>([]);
  const [previews,     setPreviews]    = useState<string[]>([]);
  const [submitting,   setSubmitting]  = useState(false);
  const [success,      setSuccess]     = useState(false);
  const [error,        setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load tags on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API_URL}/client/reviews/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
      .then(r => r.json())
      .then(json => { if (json.success) setTags(json.data); })
      .catch(() => {}); // tags are optional — don't block the form
  }, []);

  // ── Clean up object URLs on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => { previews.forEach(url => URL.revokeObjectURL(url)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Image handling ────────────────────────────────────────────────────────
  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const remaining = 6 - images.length;
    const valid = Array.from(files)
      .filter(f => f.size <= 5 * 1024 * 1024) // 5MB max per image
      .slice(0, remaining);

    const newPreviews = valid.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Tag toggling ──────────────────────────────────────────────────────────
  const toggleTag = (id: number) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : prev.length >= 6 ? prev : [...prev, id]
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!rating) {
      setError('Please select a star rating.');
      return;
    }
    if (body && body.length > 0 && body.length < 10) {
      setError('Review text must be at least 10 characters (or leave it empty).');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('You must be logged in to submit a review.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('order_item_id', String(orderItemId));
      fd.append('rating',        String(rating));
      if (body) fd.append('body', body);
      fd.append('is_anonymous', isAnon ? '1' : '0');
      selectedTags.forEach(id => fd.append('tag_ids[]', String(id)));
      images.forEach(img => fd.append('images[]', img));

      const res  = await fetch(`${API_URL}/client/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        // Show validation errors if any
        if (json.errors) {
          const msgs = Object.values(json.errors as Record<string, string[]>).flat();
          setError(msgs[0] ?? json.message ?? 'Validation failed.');
        } else {
          setError(json.message ?? 'Failed to submit review. Please try again.');
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ct-rev-tag:hover  { border-color: #db142e !important; color: #db142e !important; }
        .ct-rev-star:hover { transform: scale(1.15); }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          fontFamily: "'Barlow', 'Inter', sans-serif",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 24, padding: 0,
            maxWidth: 520, width: '100%', maxHeight: '92vh', overflowY: 'auto',
            animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}
        >
          {success ? (
            /* ── Success state ── */
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle size={32} color="#10b981" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                Review Submitted!
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                Thank you for your feedback 🎉
              </p>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div style={{
                padding: '20px 24px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Leave a Review
                </h2>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '1.5px solid #e5e7eb', background: '#f8fafc',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#64748b',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Product info */}
                <div style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
                }}>
                  {productImage && (
                    <img
                      src={productImage}
                      alt={productName}
                      style={{
                        width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                        border: '1.5px solid #e5e7eb',
                      }}
                    />
                  )}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                      {productName}
                    </p>
                    {variantLabel && (
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{variantLabel}</p>
                    )}
                  </div>
                </div>

                {/* Star rating */}
                <div>
                  <p style={{
                    fontSize: 12, fontWeight: 800, color: '#64748b', margin: '0 0 10px',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    Overall Rating <span style={{ color: '#ef4444' }}>*</span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          type="button"
                          className="ct-rev-star"
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(i)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                            transition: 'transform 0.1s',
                          }}
                        >
                          <Star
                            size={32}
                            fill={i <= displayRating ? HOVER_COLORS[displayRating - 1] : 'none'}
                            stroke={i <= displayRating ? HOVER_COLORS[displayRating - 1] : '#d1d5db'}
                            strokeWidth={1.5}
                          />
                        </button>
                      ))}
                    </div>
                    {displayRating > 0 && (
                      <span style={{
                        fontSize: 14, fontWeight: 800,
                        color: HOVER_COLORS[displayRating - 1],
                        transition: 'color 0.15s',
                      }}>
                        {HOVER_LABELS[displayRating - 1]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div>
                    <p style={{
                      fontSize: 12, fontWeight: 800, color: '#64748b', margin: '0 0 10px',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      Quick Tags (select up to 6)
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {tags.map(tag => {
                        const selected = selectedTags.includes(tag.id);
                        const isNeg    = tag.sentiment === 'negative';
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            className="ct-rev-tag"
                            onClick={() => toggleTag(tag.id)}
                            style={{
                              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                              border: `1.5px solid ${selected ? (isNeg ? '#ef4444' : '#198f41') : '#e5e7eb'}`,
                              background: selected
                                ? (isNeg ? 'rgba(239,68,68,0.07)' : 'rgba(25,143,65,0.07)')
                                : '#f8fafc',
                              color: selected ? (isNeg ? '#ef4444' : '#198f41') : '#374151',
                              cursor: 'pointer', transition: 'all 0.15s',
                              fontFamily: 'inherit',
                            }}
                          >
                            {tag.icon} {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Text review */}
                <div>
                  <p style={{
                    fontSize: 12, fontWeight: 800, color: '#64748b', margin: '0 0 8px',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    Your Review{' '}
                    <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                      (optional, min 10 chars)
                    </span>
                  </p>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Tell others about your experience with this product…"
                    rows={4}
                    maxLength={2000}
                    style={{
                      width: '100%', borderRadius: 12, border: '1.5px solid #e5e7eb',
                      padding: '12px 14px', fontSize: 14, color: '#374151',
                      fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                      boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', margin: '4px 0 0' }}>
                    {body.length}/2000
                  </p>
                </div>

                {/* Image upload */}
                <div>
                  <p style={{
                    fontSize: 12, fontWeight: 800, color: '#64748b', margin: '0 0 8px',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    Add Photos (up to 6, max 5MB each)
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative', width: 76, height: 76,
                          borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb',
                        }}
                      >
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removeImage(i)}
                          style={{
                            position: 'absolute', top: 3, right: 3,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.65)', border: 'none',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#fff',
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {images.length < 6 && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        style={{
                          width: 76, height: 76, borderRadius: 10,
                          border: '2px dashed #e2e8f0', background: '#f8fafc',
                          cursor: 'pointer', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 4,
                          color: '#94a3b8', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                        }}
                      >
                        <Upload size={18} />
                        Add Photo
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept="image/jpg,image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => handleImages(e.target.files)}
                    />
                  </div>
                </div>

                {/* Anonymous toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f8fafc', borderRadius: 12, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAnon ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>
                        Post anonymously
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        Your name will appear as "A***a"
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnon(a => !a)}
                    style={{
                      width: 44, height: 24, borderRadius: 999, border: 'none',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: isAnon ? '#db142e' : '#e2e8f0', position: 'relative', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: isAnon ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef4444', fontWeight: 600,
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !rating}
                  style={{
                    width: '100%', height: 52, borderRadius: 14, border: 'none',
                    background: !rating ? '#e2e8f0' : 'linear-gradient(135deg,#db142e,#a00f22)',
                    color: !rating ? '#94a3b8' : '#fff',
                    fontSize: 15, fontWeight: 900,
                    cursor: !rating || submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: !rating ? 'none' : '0 8px 24px rgba(219,20,46,0.3)',
                    transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >
                  {submitting
                    ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : '⭐ Submit Review'
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}