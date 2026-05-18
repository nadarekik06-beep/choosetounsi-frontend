'use client';
/**
 * app/seller/promote/page.tsx
 *
 * UPDATED: Bank card payment modal integrated.
 *   - Real-time cost breakdown (base + boost surcharge)
 *   - Payment modal with card form, Luhn validation, masked display
 *   - Per-plan payment rules (Green pays always, Red pays always,
 *     Black pays only when quota exhausted or priority > 5)
 *   - Weekly quota auto-refresh (backend-driven, surfaced in UI)
 *   - Accessibility: focus trap in modal, keyboard-dismissible
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, TrendingUp, Eye, Tag, Sparkles, CheckCircle,
  XCircle, Clock, Crown, Flame, Leaf, AlertCircle,
  BarChart2, Search, ChevronRight,
  MapPin, Users, DollarSign, Star,
  Package, Gauge, Info, CreditCard, Lock, Shield,
  Calendar, Hash,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../layout';
import { useSubscription } from '@/app/hooks/useSubscription';
import {
  sponsorshipApi,
  SponsorshipRecord,
  SponsorPlan,
  BOOST_SCORES,
  SPONSOR_PRICES,
  PLAN_BOOST_LABELS,
  SponsorQuota,
  CardPaymentDetails,
  calcBoostSurcharge,
  calcTotalCost,
  tokeniseCard,
} from '@/lib/sponsorshipApi';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface SellerProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  is_active: boolean;
  is_approved: boolean;
  primary_image_url: string | null;
  is_sponsored: boolean;
  category?: { id: number; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DURATIONS = [
  { days: 3,  label: '3 Days',  sublabel: 'Quick test' },
  { days: 7,  label: '1 Week',  sublabel: 'Most popular', popular: true },
  { days: 14, label: '2 Weeks', sublabel: 'Best value' },
  { days: 30, label: '1 Month', sublabel: 'Max exposure' },
];

const TUNISIAN_WILAYAS = [
  'Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte',
  'Béja','Jendouba','Kef','Siliana','Sousse','Monastir','Mahdia',
  'Sfax','Kairouan','Kasserine','Sidi Bouzid','Gabès','Medenine',
  'Tataouine','Gafsa','Tozeur','Kébili',
];

const PLAN_META: Record<SponsorPlan, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  free:  { icon: <Leaf size={14} />,  label: 'Green Pepper', color: '#198f41', bg: 'rgba(25,143,65,0.12)'  },
  red:   { icon: <Flame size={14} />, label: 'Red Pepper',   color: '#db142e', bg: 'rgba(219,20,46,0.12)'  },
  black: { icon: <Crown size={14} />, label: 'Black Pepper',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Dev / sandbox mode detection
// ─────────────────────────────────────────────────────────────────────────────
const IS_DEV = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.endsWith('.local') ||
   process.env.NODE_ENV === 'development');

// A real Luhn-valid test card number (Visa test — safe to use in sandboxes)
const DEV_CARD: CardPaymentDetails = {
  card_number:  '4111111111111111',  // Luhn-valid Visa test card
  expiry_month: '12',
  expiry_year:  '27',
  cvv:          '123',
  cardholder:   'TEST USER',
};

// ─────────────────────────────────────────────────────────────────────────────
// Luhn check (client-side card validation)
// Skipped entirely in dev/localhost — any 16-digit number is accepted.
// ─────────────────────────────────────────────────────────────────────────────
function luhnCheck(num: string): boolean {
  if (IS_DEV) return true;   // ← bypass in development
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let isOdd = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (isOdd) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    isOdd = !isOdd;
  }
  return sum % 10 === 0;
}

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function maskCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return raw;
  return '•••• •••• •••• ' + digits.slice(-4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function BoostBar({ value, max = 70 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 40 ? '#198f41' : pct < 70 ? '#f59e0b' : '#db142e';
  return (
    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 99,
        background: `linear-gradient(90deg, #198f41 0%, ${color} 100%)`,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

function Skeleton({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function AdPreviewCard({
  product, boostScore, dark, textMuted, textMain, border,
}: {
  product: SellerProduct | undefined;
  boostScore: number;
  dark: boolean;
  textMuted: string;
  textMain: string;
  border: string;
}) {
  const card = dark ? '#1a2030' : '#fff';
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Eye size={10} /> Live Preview
      </p>
      <div style={{
        background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', position: 'relative',
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: 'linear-gradient(135deg,#db142e,#a00f22)',
          borderRadius: 6, padding: '3px 8px',
          fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(219,20,46,0.4)',
        }}>
          <Zap size={8} /> Sponsored
        </div>

        {product?.primary_image_url ? (
          <img src={product.primary_image_url} alt={product.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '16/9',
            background: dark ? 'rgba(255,255,255,0.04)' : '#f0f2f5',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {product ? (
              <><Package size={28} color={textMuted} /><span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>{product.name}</span></>
            ) : (
              <><Sparkles size={24} color={textMuted} /><span style={{ fontSize: 11, color: textMuted }}>Select a product to preview</span></>
            )}
          </div>
        )}

        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product?.name ?? 'Your product name'}
            </p>
            <p style={{ fontSize: 12, color: '#db142e', fontWeight: 800, margin: 0 }}>
              {product ? `${Number(product.price).toFixed(3)} DT` : '0.000 DT'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: dark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '4px 8px' }}>
            <TrendingUp size={11} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b' }}>+{boostScore}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 10, color: textMuted, marginTop: 6, textAlign: 'center' }}>This is how buyers will see your ad</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  amount: number;
  breakdown: { baseCost: number; boostSurcharge: number; basePerDay: number };
  plan: SponsorPlan;
  duration: number;
  dark: boolean;
  textMain: string;
  textMuted: string;
  border: string;
}

function PaymentModal({
  open, onClose, onSuccess, amount, breakdown, plan, duration, dark, textMain, textMuted, border,
}: PaymentModalProps) {
  const [card, setCard] = useState<CardPaymentDetails>({ card_number: '', expiry_month: '', expiry_year: '', cvv: '', cardholder: '' });
  const [showNum, setShowNum]   = useState(IS_DEV);  // show pre-filled test card by default in dev
  const [errors,  setErrors]    = useState<Partial<Record<keyof CardPaymentDetails, string>>>({});
  const [paying,  setPaying]    = useState(false);
  const [step,    setStep]      = useState<'form' | 'confirm' | 'success'>('form');
  const overlayRef = useRef<HTMLDivElement>(null);
  const planMeta   = PLAN_META[plan];

  // Reset on open — pre-fill dev card in localhost for frictionless testing
  useEffect(() => {
    if (open) {
      setCard(IS_DEV ? DEV_CARD : { card_number: '', expiry_month: '', expiry_year: '', cvv: '', cardholder: '' });
      setErrors({});
      setStep('form');
      setPaying(false);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const digits = card.card_number.replace(/\D/g, '');
    if (digits.length !== 16)      errs.card_number  = 'Card number must be 16 digits';
    else if (!luhnCheck(digits))   errs.card_number  = 'Invalid card number';

    const mo = parseInt(card.expiry_month, 10);
    const yr = parseInt('20' + card.expiry_year, 10);
    if (!card.expiry_month || mo < 1 || mo > 12) errs.expiry_month = 'Invalid month (MM)';
    if (!card.expiry_year  || card.expiry_year.length !== 2) errs.expiry_year  = 'Invalid year (YY)';
    else {
      const now  = new Date();
      const expDate = new Date(yr, mo - 1, 1);
      if (expDate < new Date(now.getFullYear(), now.getMonth(), 1)) errs.expiry_year = 'Card has expired';
    }
    if (!card.cvv || card.cvv.length < 3)        errs.cvv          = 'CVV must be 3-4 digits';
    if (!card.cardholder.trim())                  errs.cardholder   = 'Cardholder name required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async () => {
    if (step === 'form') { if (validate()) setStep('confirm'); return; }
    setPaying(true);
    try {
      // In production: call gateway JS SDK here to get a real token
      const token = tokeniseCard(card);
      setStep('success');
      setTimeout(() => onSuccess(token), 900);
    } catch {
      setErrors({ cardholder: 'Payment failed. Please try again.' });
      setStep('form');
    } finally { setPaying(false); }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'fadeUp 0.2s ease',
  };
  const modal: React.CSSProperties = {
    width: '100%', maxWidth: 440,
    background: dark ? '#161b27' : '#fff',
    borderRadius: 20,
    border: `1px solid ${border}`,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    animation: 'fadeUp 0.25s ease',
  };
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: `1.5px solid ${border}`,
    background: dark ? 'rgba(255,255,255,0.04)' : '#f8f9fb',
    color: textMain, outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={overlay} ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div style={modal} role="dialog" aria-modal="true" aria-label="Card Payment">

        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${border}`,
          background: planMeta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: planMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: textMain, margin: 0 }}>Secure Payment</p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={9} /> SSL encrypted · {planMeta.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Dev mode banner */}
        {IS_DEV && (
          <div style={{ padding: '7px 20px', background: 'rgba(99,102,241,0.12)', borderBottom: `1px solid rgba(99,102,241,0.25)`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', letterSpacing: '0.05em' }}>⚡ SANDBOX MODE — Card pre-filled with test data. No real charge.</span>
          </div>
        )}

        {/* Order summary */}
        <div style={{ padding: '14px 20px', background: dark ? 'rgba(255,255,255,0.02)' : '#fafbfc', borderBottom: `1px solid ${border}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Order Summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {breakdown.baseCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: textMuted }}>Base ({breakdown.basePerDay.toFixed(3)} DT/day × {duration}d)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: textMain }}>{breakdown.baseCost.toFixed(3)} DT</span>
              </div>
            )}
            {breakdown.boostSurcharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: textMuted }}>Boost surcharge (priority &gt; 5)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>+{breakdown.boostSurcharge.toFixed(3)} DT</span>
              </div>
            )}
            <div style={{ height: 1, background: border, margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Total due</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#db142e', letterSpacing: '-0.02em' }}>
                {amount.toFixed(3)} DT
              </span>
            </div>
          </div>
        </div>

        {/* Card form */}
        {step !== 'success' && (
          <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Card number */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <CreditCard size={11} /> Card Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNum ? 'text' : 'password'}
                  placeholder="1234 5678 9012 3456"
                  value={showNum ? formatCardNumber(card.card_number) : card.card_number.replace(/\D/g, '').slice(0, 16)}
                  onChange={e => setCard(c => ({ ...c, card_number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                  style={{ ...inp, paddingRight: 44, borderColor: errors.card_number ? '#ef4444' : border }}
                  autoComplete="cc-number"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowNum(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 11, fontWeight: 700 }}
                >
                  {showNum ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.card_number && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.card_number}</p>}
            </div>

            {/* Expiry + CVV */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Calendar size={10} /> Month
                </label>
                <input
                  type="text" placeholder="MM" maxLength={2}
                  value={card.expiry_month}
                  onChange={e => setCard(c => ({ ...c, expiry_month: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                  style={{ ...inp, borderColor: errors.expiry_month ? '#ef4444' : border }}
                  autoComplete="cc-exp-month" inputMode="numeric"
                />
                {errors.expiry_month && <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0' }}>{errors.expiry_month}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Calendar size={10} /> Year
                </label>
                <input
                  type="text" placeholder="YY" maxLength={2}
                  value={card.expiry_year}
                  onChange={e => setCard(c => ({ ...c, expiry_year: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                  style={{ ...inp, borderColor: errors.expiry_year ? '#ef4444' : border }}
                  autoComplete="cc-exp-year" inputMode="numeric"
                />
                {errors.expiry_year && <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0' }}>{errors.expiry_year}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Hash size={10} /> CVV
                </label>
                <input
                  type="password" placeholder="•••" maxLength={4}
                  value={card.cvv}
                  onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  style={{ ...inp, borderColor: errors.cvv ? '#ef4444' : border }}
                  autoComplete="cc-csc" inputMode="numeric"
                />
                {errors.cvv && <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0' }}>{errors.cvv}</p>}
              </div>
            </div>

            {/* Cardholder */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Users size={10} /> Cardholder Name
              </label>
              <input
                type="text" placeholder="FIRST LAST"
                value={card.cardholder}
                onChange={e => setCard(c => ({ ...c, cardholder: e.target.value.toUpperCase() }))}
                style={{ ...inp, borderColor: errors.cardholder ? '#ef4444' : border, textTransform: 'uppercase' }}
                autoComplete="cc-name"
              />
              {errors.cardholder && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{errors.cardholder}</p>}
            </div>

            {/* Confirm step banner */}
            {step === 'confirm' && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: dark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.4)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Shield size={16} color="#f59e0b" />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', margin: 0 }}>Confirm payment of {amount.toFixed(3)} DT</p>
                  <p style={{ fontSize: 11, color: textMuted, margin: '2px 0 0' }}>Card ending in •••• {card.card_number.slice(-4)}</p>
                </div>
              </div>
            )}

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
              <Lock size={10} color={textMuted} />
              <span style={{ fontSize: 10, color: textMuted }}>Your card data is encrypted and never stored on our servers.</span>
            </div>

            {/* CTA */}
            <button
              onClick={handlePay}
              disabled={paying}
              style={{
                width: '100%', padding: '14px 0',
                background: paying ? (dark ? 'rgba(255,255,255,0.08)' : '#e5e8ed') : 'linear-gradient(135deg,#db142e,#a00f22)',
                color: paying ? textMuted : '#fff',
                border: 'none', borderRadius: 12, cursor: paying ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: paying ? 'none' : '0 6px 18px rgba(219,20,46,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {paying ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Processing…</>
              ) : step === 'confirm' ? (
                <><Shield size={15} /> Confirm & Pay {amount.toFixed(3)} DT</>
              ) : (
                <><CreditCard size={15} /> Review Payment</>
              )}
            </button>
          </div>
        )}

        {/* Success state */}
        {step === 'success' && (
          <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(25,143,65,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #198f41' }}>
              <CheckCircle size={28} color="#198f41" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#198f41', margin: 0 }}>Payment successful!</p>
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Activating your sponsorship…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PromoteProductPage() {
  const { dark } = useTheme();
  const router   = useRouter();
  const { plan, loading: planLoading } = useSubscription();

  // Theme tokens
  const bg       = dark ? '#0D1117' : '#f0f2f5';
  const card     = dark ? '#161b27' : '#ffffff';
  const cardAlt  = dark ? '#1a2030' : '#f8f9fb';
  const border   = dark ? 'rgba(255,255,255,0.07)' : '#e5e8ed';
  const textMain = dark ? '#f0f0f0' : '#111827';
  const textMuted= dark ? 'rgba(255,255,255,0.4)' : '#6b7280';
  const shadow   = dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)';

  // Product state
  const [products,      setProducts]      = useState<SellerProduct[]>([]);
  const [loadingProds,  setLoadingProds]  = useState(true);
  const [search,        setSearch]        = useState('');
  const [selectedId,    setSelectedId]    = useState<number | null>(null);

  // Campaign state
  const [duration,  setDuration]  = useState(7);
  const [priority,  setPriority]  = useState(5);

  // Targeting
  const [targetGender,     setTargetGender]     = useState<'male' | 'female' | 'unisex' | ''>('');
  const [targetWilayas,    setTargetWilayas]    = useState<string[]>([]);
  const [targetCategories, setTargetCategories] = useState<number[]>([]);
  const [targetPriceMin,   setTargetPriceMin]   = useState('');
  const [targetPriceMax,   setTargetPriceMax]   = useState('');

  // Quota
  const [quota,         setQuota]         = useState<SponsorQuota | null>(null);
  const [active,        setActive]        = useState<SponsorshipRecord[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState<any | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProds(true);
      const token  = localStorage.getItem('ct_auth_token');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');
      const res    = await fetch(`${apiUrl}/api/seller/products?is_approved=true&is_active=true&per_page=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = await res.json();
      setProducts((json.data?.data ?? []) as SellerProduct[]);
    } catch { /* silent */ } finally { setLoadingProds(false); }
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      setLoadingActive(true);
      const res = await sponsorshipApi.list({ status: 'active', per_page: 50 });
      setActive(res.data.data ?? []);
    } catch { /* silent */ } finally { setLoadingActive(false); }
  }, []);

  const fetchQuota = useCallback(async () => {
    if (plan !== 'black') return;
    try { const res = await sponsorshipApi.quota(); setQuota(res.data); } catch { /* silent */ }
  }, [plan]);

  useEffect(() => { fetchProducts(); fetchActive(); fetchQuota(); }, [fetchProducts, fetchActive, fetchQuota]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentPlan        = (plan ?? 'free') as SponsorPlan;
  const boostBase          = BOOST_SCORES[currentPlan];
  const finalBoost         = Math.round(boostBase * (priority / 10));
  const freeQuotaAvailable = currentPlan === 'black' && (quota?.remaining ?? 0) > 0;

  const costBreakdown = useMemo(
    () => calcTotalCost(currentPlan, duration, priority, freeQuotaAvailable),
    [currentPlan, duration, priority, freeQuotaAvailable]
  );
  const totalCost   = costBreakdown.total;
  const needsPayment = totalCost > 0;

  const planMeta            = PLAN_META[currentPlan];
  const selectedProduct     = products.find(p => p.id === selectedId);
  const isAlreadySponsored  = selectedProduct ? active.some(a => a.product_id === selectedProduct.id) : false;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter(p => p.name.toLowerCase().includes(q) || p.category?.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const targetingCount = [
    targetGender ? 1 : 0,
    targetWilayas.length,
    targetCategories.length,
    (targetPriceMin || targetPriceMax) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ── Submit flow ────────────────────────────────────────────────────────────
  const activateSponsorship = useCallback(async (paymentToken?: string) => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await sponsorshipApi.sponsor({
        product_id:          selectedId,
        duration_days:       duration,
        priority,
        target_gender:       targetGender || undefined,
        target_wilaya_ids:   targetWilayas.length ? targetWilayas : undefined,
        target_category_ids: targetCategories.length ? targetCategories : undefined,
        target_price_min:    targetPriceMin ? Number(targetPriceMin) : undefined,
        target_price_max:    targetPriceMax ? Number(targetPriceMax) : undefined,
        payment_method:      paymentToken ? 'card' : 'free_quota',
        payment_token:       paymentToken,
      });
      setSuccess(res.data);
      setSelectedId(null);
      setPendingToken(null);
      fetchActive();
      fetchQuota();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to activate sponsorship.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, duration, priority, targetGender, targetWilayas, targetCategories, targetPriceMin, targetPriceMax, fetchActive, fetchQuota]);

  const handleSubmit = () => {
    if (!selectedId || isAlreadySponsored || submitting) return;
    if (needsPayment) {
      // Open payment modal — activation runs after successful tokenisation
      setShowPayModal(true);
    } else {
      // Fully free — activate immediately
      activateSponsorship(undefined);
    }
  };

  const handlePaymentSuccess = (token: string) => {
    setShowPayModal(false);
    setPendingToken(token);
    activateSponsorship(token);
  };

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try { await sponsorshipApi.cancel(id); fetchActive(); fetchQuota(); }
    catch (e: any) { alert(e?.response?.data?.message ?? 'Cancel failed.'); }
    finally { setCancelling(null); }
  };

  const canSubmit = !!selectedId && !submitting && !isAlreadySponsored;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .promote-grid { display: grid; grid-template-columns: 360px 1fr 320px; gap: 20px; align-items: start; padding: 20px 24px 48px; }
        .prod-row:hover { background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important; }
        .dur-btn:hover  { border-color: #db142e !important; }
        .cancel-btn:hover { background: rgba(239,68,68,0.08) !important; }
        @media (max-width: 1100px) {
          .promote-grid { grid-template-columns: 1fr; padding: 16px; }
        }
      `}</style>

      {/* Payment modal */}
      <PaymentModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={totalCost}
        breakdown={{ baseCost: costBreakdown.baseCost, boostSurcharge: costBreakdown.boostSurcharge, basePerDay: costBreakdown.basePerDay }}
        plan={currentPlan}
        duration={duration}
        dark={dark}
        textMain={textMain}
        textMuted={textMuted}
        border={border}
      />

      {/* ── Page Header ── */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: '20px 24px 18px', background: card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#db142e,#a00f22)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(219,20,46,0.35)' }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: textMain, margin: 0, letterSpacing: '-0.02em' }}>Ads & Boost</h1>
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Promote your products across homepage, categories & search</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Plan badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: planMeta.bg, borderRadius: 10, padding: '6px 12px', border: `1px solid ${planMeta.color}33` }}>
            <span style={{ color: planMeta.color }}>{planMeta.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: planMeta.color }}>{planMeta.label}</span>
            {currentPlan === 'black' && quota && (
              <span style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>· {quota.remaining}/3 free</span>
            )}
          </div>

          <Link href="/seller/promote/analytics" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${border}`, color: textMuted, textDecoration: 'none', fontSize: 12, fontWeight: 700, background: cardAlt }}>
            <BarChart2 size={13} /> Analytics
          </Link>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {success && (
        <div style={{ margin: '16px 24px 0', background: dark ? 'rgba(25,143,65,0.12)' : '#f0fdf4', border: '1px solid #16a34a', borderRadius: 14, padding: '16px 20px', animation: 'fadeUp 0.3s ease', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#16a34a', margin: '0 0 4px' }}>Sponsorship activated!</p>
            <p style={{ fontSize: 12, color: textMuted, margin: '0 0 8px' }}>
              Boost: <strong style={{ color: textMain }}>{success.boost_score} pts</strong> &nbsp;·&nbsp;
              Expires: <strong style={{ color: textMain }}>{new Date(success.expires_at).toLocaleDateString('en-GB')}</strong>
              {success.used_free_quota && (
                <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>⬛ Free quota used ({success.remaining_free} left this week)</span>
              )}
              {success.amount_charged > 0 && (
                <span style={{ marginLeft: 8, color: '#198f41', fontWeight: 700 }}>✓ {Number(success.amount_charged).toFixed(3)} DT charged</span>
              )}
            </p>
            {success.ai_ad_copy && (
              <p style={{ fontSize: 12, color: textMain, fontStyle: 'italic', margin: '0 0 8px', background: dark ? 'rgba(255,255,255,0.05)' : '#f8f9fa', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #db142e' }}>
                "{success.ai_ad_copy}"
              </p>
            )}
            {success.ai_tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(success.ai_tags as string[]).map((tag: string, i: number) => (
                  <span key={i} style={{ background: dark ? 'rgba(99,102,241,0.18)' : '#ede9fe', color: '#7c3aed', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 4 }}>✕</button>
        </div>
      )}

      {/* ── Three-Column Grid ── */}
      <div className="promote-grid">

        {/* ══ COLUMN 1 — Product Picker ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: shadow }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: '#db142e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>1</div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Select Product</span>
                </div>
                {selectedProduct && (
                  <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, fontSize: 11, fontWeight: 700 }}>Clear</button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={13} color={textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text" placeholder="Search products…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 30px', borderRadius: 9, fontSize: 12, border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.04)' : '#f5f6f8', color: textMain, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Product list */}
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {loadingProds ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Skeleton w={48} h={48} r={10} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><Skeleton h={12} w="70%" /><Skeleton h={10} w="40%" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <Package size={28} color={textMuted} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: textMuted, margin: '0 0 4px' }}>{search ? 'No products match your search' : 'No approved products found'}</p>
                  {!search && <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>Make sure your products are approved by admin.</p>}
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected       = selectedId === p.id;
                  const alreadySponsored = active.some(a => a.product_id === p.id);
                  return (
                    <button
                      key={p.id} className="prod-row"
                      onClick={() => !alreadySponsored && setSelectedId(isSelected ? null : p.id)}
                      disabled={alreadySponsored}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                        background: isSelected ? (dark ? 'rgba(219,20,46,0.1)' : 'rgba(219,20,46,0.05)') : 'transparent',
                        border: 'none', borderBottom: `1px solid ${border}`,
                        borderLeft: isSelected ? '3px solid #db142e' : '3px solid transparent',
                        cursor: alreadySponsored ? 'not-allowed' : 'pointer', opacity: alreadySponsored ? 0.55 : 1,
                        textAlign: 'left', transition: 'all 0.12s ease', outline: 'none',
                      }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.06)' : '#f0f2f5', overflow: 'hidden', position: 'relative', border: isSelected ? '2px solid #db142e' : `1px solid ${border}` }}>
                        {p.primary_image_url ? (
                          <img src={p.primary_image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tag size={16} color={textMuted} /></div>
                        )}
                        {alreadySponsored && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(219,20,46,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={12} color="#fff" /></div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#db142e', fontWeight: 800 }}>{Number(p.price).toFixed(3)} DT</span>
                          {p.category && <span style={{ fontSize: 10, color: textMuted, background: dark ? 'rgba(255,255,255,0.06)' : '#f0f2f5', borderRadius: 5, padding: '1px 5px' }}>{p.category.name}</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {alreadySponsored ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#db142e', background: 'rgba(219,20,46,0.1)', borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase' }}>Live</span>
                        ) : isSelected ? (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#198f41', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={12} color="#fff" /></div>
                        ) : (
                          <ChevronRight size={14} color={textMuted} />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {!loadingProds && (
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, background: cardAlt }}>
                <span style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} · {active.length} active sponsorship{active.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Active sponsorships mini list */}
          {active.length > 0 && (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, marginTop: 12, overflow: 'hidden', boxShadow: shadow }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={11} color="#db142e" />
                <span style={{ fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Running ({active.length})</span>
              </div>
              {active.map(s => (
                <div key={s.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: textMain, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.product?.name ?? `#${s.product_id}`}</p>
                    <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                      {s.impressions} views · {s.clicks} clicks{s.end_at && ` · until ${new Date(s.end_at).toLocaleDateString('en-GB')}`}
                    </p>
                  </div>
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancel(s.id)}
                    disabled={cancelling === s.id}
                    style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 7, padding: '4px 9px', fontSize: 10, fontWeight: 700, color: '#ef4444', cursor: 'pointer', flexShrink: 0, transition: 'background 0.12s' }}
                  >
                    {cancelling === s.id ? '…' : 'Stop'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ COLUMN 2 — Campaign Builder ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Step 2: Duration */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#db142e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>2</div>
              <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Campaign Duration</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {DURATIONS.map(d => (
                <button key={d.days} className="dur-btn" onClick={() => setDuration(d.days)} style={{
                  padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${duration === d.days ? '#db142e' : border}`,
                  background: duration === d.days ? (dark ? 'rgba(219,20,46,0.12)' : 'rgba(219,20,46,0.05)') : cardAlt,
                  color: textMain, textAlign: 'center', position: 'relative', transition: 'all 0.15s ease',
                }}>
                  {d.popular && (
                    <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#fff', fontSize: 7, fontWeight: 900, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>★ Popular</span>
                  )}
                  <p style={{ fontSize: 16, fontWeight: 900, color: duration === d.days ? '#db142e' : textMain, margin: '0 0 2px' }}>{d.label}</p>
                  <p style={{ fontSize: 10, color: textMuted, margin: '0 0 6px' }}>{d.sublabel}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: duration === d.days ? '#db142e' : textMuted, margin: 0 }}>
                    {freeQuotaAvailable && priority <= 5
                      ? 'FREE'
                      : `${(costBreakdown.basePerDay * d.days).toFixed(2)} DT`}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Boost Priority */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: '#db142e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>3</div>
              <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Visibility Boost</span>
            </div>
            <p style={{ fontSize: 11, color: textMuted, margin: '4px 0 16px 30px' }}>
              Priority 1-5 is free. Each point above 5 adds <strong style={{ color: '#f59e0b' }}>+5.000 DT</strong> to your campaign.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: textMuted }}>Low reach</span>
                  <span style={{ fontSize: 11, color: textMuted }}>Max reach</span>
                </div>
                <input type="range" min={1} max={10} value={priority} onChange={e => setPriority(Number(e.target.value))} style={{ width: '100%', accentColor: '#db142e', cursor: 'pointer' }} />
                <BoostBar value={finalBoost} max={boostBase} />

                {/* Surcharge indicator */}
                {priority > 5 && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: dark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={12} color="#f59e0b" />
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                      Priority {priority}: +{calcBoostSurcharge(priority).toFixed(3)} DT surcharge ({priority - 5} pt{priority - 5 > 1 ? 's' : ''} × 5 DT)
                    </span>
                  </div>
                )}
              </div>

              <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, background: dark ? 'rgba(219,20,46,0.1)' : 'rgba(219,20,46,0.05)', border: '2px solid rgba(219,20,46,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#db142e', lineHeight: 1 }}>{priority}</span>
                <span style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>/ 10</span>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={14} color="#6366f1" />
              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                Final boost: <strong>+{finalBoost} points</strong>
                <span style={{ fontWeight: 500, color: textMuted }}> (base {boostBase} × {priority}/10)</span>
              </span>
            </div>
          </div>

          {/* Step 4: Audience Targeting */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: shadow }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: targetingCount > 0 ? '#db142e' : dark ? 'rgba(255,255,255,0.1)' : '#e5e8ed', color: targetingCount > 0 ? '#fff' : textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>4</div>
                <span style={{ fontSize: 13, fontWeight: 800, color: textMain }}>Audience Targeting</span>
                {targetingCount > 0 && (
                  <span style={{ background: '#db142e', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 900, padding: '2px 7px' }}>{targetingCount} active</span>
                )}
              </div>
              {targetingCount > 0 && (
                <button onClick={() => { setTargetGender(''); setTargetWilayas([]); setTargetCategories([]); setTargetPriceMin(''); setTargetPriceMax(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444', fontWeight: 700 }}>
                  Clear all
                </button>
              )}
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Gender */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={11} /> Gender
                </p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {[{ value: '' as const, label: 'All' }, { value: 'male' as const, label: 'Men' }, { value: 'female' as const, label: 'Women' }, { value: 'unisex' as const, label: 'Unisex' }].map(g => (
                    <button key={g.value} onClick={() => setTargetGender(g.value)} style={{ padding: '7px 18px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: `1.5px solid ${targetGender === g.value ? '#db142e' : border}`, background: targetGender === g.value ? (dark ? 'rgba(219,20,46,0.12)' : 'rgba(219,20,46,0.06)') : cardAlt, color: targetGender === g.value ? '#db142e' : textMuted, transition: 'all 0.12s' }}>{g.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: border }} />

              {/* Price range */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <DollarSign size={11} /> Target Budget Range (DT)
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input type="number" placeholder="Min" value={targetPriceMin} onChange={e => setTargetPriceMin(e.target.value)} style={{ width: 100, padding: '9px 12px', borderRadius: 9, fontSize: 12, border: `1.5px solid ${targetPriceMin ? '#db142e' : border}`, background: cardAlt, color: textMain, outline: 'none', fontFamily: 'inherit' }} />
                  <span style={{ color: textMuted, fontWeight: 700, fontSize: 14 }}>–</span>
                  <input type="number" placeholder="Max" value={targetPriceMax} onChange={e => setTargetPriceMax(e.target.value)} style={{ width: 100, padding: '9px 12px', borderRadius: 9, fontSize: 12, border: `1.5px solid ${targetPriceMax ? '#db142e' : border}`, background: cardAlt, color: textMain, outline: 'none', fontFamily: 'inherit' }} />
                  <span style={{ fontSize: 11, color: textMuted }}>Users whose budget is in this range</span>
                </div>
              </div>

              <div style={{ height: 1, background: border }} />

              {/* Regions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={11} /> Target Regions
                    {targetWilayas.length > 0 && <span style={{ background: '#db142e', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 900, padding: '1px 6px' }}>{targetWilayas.length}</span>}
                  </p>
                  {targetWilayas.length > 0 && <button onClick={() => setTargetWilayas([])} style={{ background: 'none', border: 'none', fontSize: 10, color: '#db142e', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {TUNISIAN_WILAYAS.map(w => {
                    const on = targetWilayas.includes(w);
                    return (
                      <button key={w} onClick={() => setTargetWilayas(prev => on ? prev.filter(x => x !== w) : [...prev, w])} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${on ? '#db142e' : border}`, background: on ? '#db142e' : cardAlt, color: on ? '#fff' : textMuted, transition: 'all 0.12s' }}>{w}</button>
                    );
                  })}
                </div>
              </div>

              {products.some(p => p.category) && (
                <>
                  <div style={{ height: 1, background: border }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Tag size={11} /> Target Categories
                      {targetCategories.length > 0 && <span style={{ background: '#db142e', color: '#fff', borderRadius: 999, fontSize: 9, fontWeight: 900, padding: '1px 6px' }}>{targetCategories.length}</span>}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {products.reduce<{ id: number; name: string }[]>((acc, p) => {
                        const cat = p.category;
                        if (cat && !acc.find(c => c.id === cat.id)) acc.push(cat);
                        return acc;
                      }, []).map(cat => {
                        const on = targetCategories.includes(cat.id);
                        return <button key={cat.id} onClick={() => setTargetCategories(prev => on ? prev.filter(x => x !== cat.id) : [...prev, cat.id])} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${on ? '#db142e' : border}`, background: on ? '#db142e' : cardAlt, color: on ? '#fff' : textMuted, transition: 'all 0.12s' }}>{cat.name}</button>;
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid #ef4444', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp 0.2s ease' }}>
              <AlertCircle size={16} color="#ef4444" />
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0, fontWeight: 600 }}>{error}</p>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 'auto', padding: 0 }}>✕</button>
            </div>
          )}
        </div>

        {/* ══ COLUMN 3 — Sticky Launch Panel ══ */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <AdPreviewCard product={selectedProduct} boostScore={finalBoost} dark={dark} textMuted={textMuted} textMain={textMain} border={border} />

          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Plan strip */}
            <div style={{ padding: '10px 16px', background: planMeta.bg, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: planMeta.color }}>{planMeta.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: planMeta.color }}>{planMeta.label}</span>
              {currentPlan === 'black' && quota && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i < (quota.remaining ?? 0) ? '#f59e0b' : dark ? 'rgba(255,255,255,0.12)' : '#d1d5db' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ padding: '16px 16px 0' }}>
              {[
                { label: 'Product',   value: selectedProduct?.name ?? '—', trunc: true },
                { label: 'Duration',  value: `${duration} days` },
                { label: 'Boost',     value: `+${finalBoost} pts` },
                { label: 'Base rate', value: costBreakdown.isFree && costBreakdown.boostSurcharge === 0 ? 'FREE (quota)' : `${costBreakdown.basePerDay.toFixed(3)} DT/day` },
              ].map(({ label, value, trunc }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: textMuted }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: textMain, maxWidth: trunc ? 140 : undefined, overflow: trunc ? 'hidden' : undefined, textOverflow: trunc ? 'ellipsis' : undefined, whiteSpace: trunc ? 'nowrap' : undefined }}>{value}</span>
                </div>
              ))}

              {/* Boost surcharge line (only when applicable) */}
              {costBreakdown.boostSurcharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>Boost surcharge</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>+{costBreakdown.boostSurcharge.toFixed(3)} DT</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{ margin: '0 16px', height: 1, background: border }} />
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: textMain }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: totalCost === 0 ? '#198f41' : '#db142e' }}>
                {totalCost === 0 ? 'FREE' : `${totalCost.toFixed(3)} DT`}
              </span>
            </div>

            {/* CTA */}
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '14px 0',
                  background: canSubmit ? 'linear-gradient(135deg,#db142e 0%,#a00f22 100%)' : (dark ? 'rgba(255,255,255,0.07)' : '#e5e8ed'),
                  color: canSubmit ? '#fff' : textMuted,
                  border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: canSubmit ? '0 6px 18px rgba(219,20,46,0.4)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? (
                  <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Activating…</>
                ) : isAlreadySponsored ? (
                  'Already Sponsored'
                ) : !selectedId ? (
                  'Select a product first'
                ) : needsPayment ? (
                  <><CreditCard size={16} /> Pay & Activate — {totalCost.toFixed(3)} DT</>
                ) : (
                  <><Zap size={16} /> Activate for Free</>
                )}
              </button>

              {needsPayment && canSubmit && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Lock size={9} color={textMuted} />
                  <span style={{ fontSize: 10, color: textMuted }}>Secure payment · SSL encrypted</span>
                </div>
              )}
            </div>

            {/* How it works */}
            {!selectedId && (
              <div style={{ margin: '0 16px 16px', padding: '10px 12px', borderRadius: 10, background: dark ? 'rgba(255,255,255,0.03)' : '#f8f9fb', border: `1px solid ${border}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Info size={10} /> How it works
                </p>
                {[
                  '① Pick a product from the list',
                  '② Set duration & boost level',
                  '③ Fine-tune your audience targeting',
                  '④ Pay (if needed) & go live instantly',
                ].map((tip, i) => (
                  <p key={i} style={{ fontSize: 10, color: textMuted, margin: '3px 0', lineHeight: 1.5 }}>{tip}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}