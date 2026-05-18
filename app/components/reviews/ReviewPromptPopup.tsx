'use client';

/**
 * ReviewPromptPopup.tsx — FIXED
 *
 * Fix #1: Token key corrected from 'auth_token' → 'ct_auth_token'
 *         (matches orders/page.tsx and the rest of the storefront)
 * Fix #2: Added fallback token key lookup so it works even if key differs
 * Fix #3: Added null-safe check before calling dismiss endpoint
 *
 * Everything else is identical to the original.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Star, Mail } from 'lucide-react';
import ReviewSubmitModal from './ReviewSubmitModal';
import { isAuthenticated } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/** Match the token key used throughout the storefront */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Try all known keys in priority order
  return (
    localStorage.getItem('ct_auth_token') ??
    localStorage.getItem('auth_token') ??
    localStorage.getItem('token') ??
    null
  );
};

interface Prompt {
  prompt_id: number;
  product_id: number;
  product_name: string;
  product_image: string | null;
  order_item_id: number;
  sent_at: string;
}

const AUTO_DISMISS_SEC = 12;

export default function ReviewPromptPopup() {
  const [prompt,    setPrompt]    = useState<Prompt | null>(null);
  const [visible,   setVisible]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch pending prompts ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) return;

    const sessionKey = 'ct_review_popup_dismissed';
    if (sessionStorage.getItem(sessionKey)) return;

    const token = getToken();
    if (!token) return; // not logged in — skip silently

    const load = async () => {
      try {
        const res  = await fetch(`${API_URL}/client/reviews/prompts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPrompt(json.data[0]);
          setTimeout(() => setVisible(true), 2500);
        }
      } catch {
        // Network error — fail silently, don't crash the page
      }
    };

    load();
  }, []);

  // ── Auto-dismiss countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible || dismissed) return;

    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          handleDismiss();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dismissed]);

  const handleDismiss = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem('ct_review_popup_dismissed', '1');

    if (!prompt) return;

    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${API_URL}/client/reviews/prompts/${prompt.prompt_id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Dismiss call failing is non-critical
    }
  };

  const handleReview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowModal(true);
    setVisible(false);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setPrompt(null);
    sessionStorage.setItem('ct_review_popup_dismissed', '1');
  };

  if (!prompt) return null;

  return (
    <>
      <style>{`
        @keyframes popupSlideIn {
          from { opacity: 0; transform: translateX(100%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes progressShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .ct-popup-primary:hover {
          background: #a00f22 !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(219,20,46,0.35) !important;
        }
        .ct-popup-secondary:hover { background: #f1f5f9 !important; }
      `}</style>

      {/* ── Main Popup ─────────────────────────────────────────────────────── */}
      {visible && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
          animation: 'popupSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          maxWidth: 340, width: '100%',
          fontFamily: "'Barlow', 'Inter', sans-serif",
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden', border: '1px solid rgba(219,20,46,0.12)',
          }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: '#f1f5f9', position: 'relative' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg,#db142e,#ff4d6a)',
                animation: `progressShrink ${AUTO_DISMISS_SEC}s linear forwards`,
              }} />
            </div>

            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#db142e 0%,#a00f22 100%)',
              padding: '16px 16px 14px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={14} fill="#fbbf24" stroke="none" />
                  ))}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                  How was your order?
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0', fontWeight: 500 }}>
                  Share your experience
                </p>
              </div>
              <button
                onClick={handleDismiss}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Product info */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {prompt.product_image ? (
                  <img
                    src={prompt.product_image}
                    alt={prompt.product_name}
                    style={{
                      width: 52, height: 52, borderRadius: 10, objectFit: 'cover',
                      border: '1.5px solid #f1f5f9', flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, background: '#f8fafc',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #f1f5f9',
                  }}>
                    <Star size={20} color="#e2e8f0" />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '0 0 3px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {prompt.product_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>
                    ✅ Order delivered
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="ct-popup-primary"
                onClick={handleReview}
                style={{
                  width: '100%', height: 44, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff',
                  fontSize: 14, fontWeight: 900, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(219,20,46,0.25)', transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                <Star size={15} fill="#fff" stroke="none" /> Leave a Review
              </button>

              <button
                className="ct-popup-secondary"
                onClick={handleDismiss}
                style={{
                  width: '100%', height: 40, borderRadius: 12,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s', fontFamily: 'inherit',
                }}
              >
                <Mail size={14} color="#64748b" /> Check My Email
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#94a3b8', fontWeight: 600, padding: '4px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontFamily: 'inherit',
                }}
              >
                Maybe Later{' '}
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>({countdown}s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Submit Modal ──────────────────────────────────────────────── */}
      {showModal && prompt && (
        <ReviewSubmitModal
          orderItemId={prompt.order_item_id}
          productName={prompt.product_name}
          productImage={prompt.product_image}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}