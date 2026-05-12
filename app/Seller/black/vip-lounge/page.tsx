'use client';
/**
 * app/seller/black/vip-lounge/page.tsx
 * Dedicated VIP Lounge page — moved from accordion to full page.
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../layout';
import { blackPepperApi, type VipRequest, type VipRequestType } from '@/lib/blackPepperApi';
import { Crown, Film, Tag, Headphones, CheckCircle, Clock, XCircle, Loader } from 'lucide-react';

const GOLD = '#f59e0b';

const REQUEST_TYPES: { key: VipRequestType; label: string; description: string; icon: React.ElementType }[] = [
  {
    key: 'reel',
    label: 'Product Reel',
    description: 'Request a short professional video for one of your products.',
    icon: Film,
  },
  {
    key: 'promotion',
    label: 'Custom Promotion',
    description: 'Get a tailored promotional campaign designed for your store.',
    icon: Tag,
  },
  {
    key: 'support',
    label: 'Priority Support',
    description: 'Jump the queue — get a direct response within 2 hours.',
    icon: Headphones,
  },
];

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending:     { icon: Clock,        color: GOLD,      label: 'Pending' },
  in_progress: { icon: Loader,       color: '#60a5fa', label: 'In Progress' },
  completed:   { icon: CheckCircle,  color: '#34d399', label: 'Done' },
  rejected:    { icon: XCircle,      color: '#f87171', label: 'Rejected' },
};

export default function VipLoungePage() {
  const { dark } = useTheme();
  const { isBlack, loading } = useSubscription();
  const router = useRouter();

  const [requests,    setRequests]    = useState<VipRequest[]>([]);
  const [reqLoading,  setReqLoading]  = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [selected,    setSelected]    = useState<VipRequestType>('reel');
  const [message,     setMessage]     = useState('');
  const [success,     setSuccess]     = useState('');
  const [err,         setErr]         = useState('');

  useEffect(() => { if (!loading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, loading, router]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try { const r = await blackPepperApi.getVipRequests(); setRequests(r.data); }
    catch { /* silent */ }
    finally { setReqLoading(false); }
  }, []);

  useEffect(() => { if (isBlack) loadRequests(); }, [isBlack, loadRequests]);

  if (loading || !isBlack) return null;

  const txtMain = dark ? '#fff' : '#111';
  const txtMut  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg  = dark ? 'rgba(255,255,255,0.03)' : '#fff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const handleSubmit = async () => {
    if (!message.trim() || message.length < 10) {
      setErr('Please describe your request in at least 10 characters.');
      return;
    }
    setSubmitting(true); setErr(''); setSuccess('');
    try {
      await blackPepperApi.submitVipRequest(selected, message);
      setSuccess('Request submitted! Our team will contact you within 24 hours.');
      setMessage('');
      loadRequests();
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: txtMain, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          VIP Lounge
        </h1>
        <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>
          Exclusive requests reserved for Black Elite sellers. Our team responds within 24 hours.
        </p>
      </div>

      {/* Request type selector */}
      <div style={{
        background: dark
          ? 'linear-gradient(135deg,#1a1206,#2d1f08)'
          : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
        borderRadius: 20, border: '1px solid rgba(245,158,11,0.3)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={17} color={GOLD} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 900, color: txtMain, margin: 0 }}>Submit a Request</p>
        </div>

        {/* Type cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          {REQUEST_TYPES.map(({ key, label, description, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              style={{
                padding: '14px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: selected === key ? 'rgba(245,158,11,0.15)' : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                outline: selected === key ? '1px solid rgba(245,158,11,0.45)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={selected === key ? GOLD : txtMut} style={{ marginBottom: 8, display: 'block' }} />
              <p style={{ fontSize: 12, fontWeight: 800, color: selected === key ? GOLD : txtMain, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 10.5, color: txtMut, margin: 0, lineHeight: 1.5 }}>{description}</p>
            </button>
          ))}
        </div>

        {/* Message textarea */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your request in detail — which product, what you need, any specific requirements…"
          rows={4}
          style={{
            width: '100%', borderRadius: 12, border: `1px solid rgba(245,158,11,0.3)`,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
            color: txtMain, fontSize: 13, padding: '12px 14px', resize: 'vertical',
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />

        {err && <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0' }}>{err}</p>}
        {success && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
          }}>
            <p style={{ fontSize: 12, color: '#34d399', margin: 0, fontWeight: 600 }}>{success}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            background: submitting ? 'rgba(245,158,11,0.4)' : 'linear-gradient(135deg,#f59e0b,#fbbf24)',
            color: '#000', fontSize: 13, fontWeight: 900,
            boxShadow: submitting ? 'none' : '0 4px 16px rgba(245,158,11,0.35)',
          }}
        >
          {submitting
            ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #00000030', borderTop: '2px solid #000', animation: 'vip-spin 0.7s linear infinite', display: 'inline-block' }} /> Submitting…</>
            : <><Crown size={14} /> Submit Request</>
          }
        </button>
        <style>{'@keyframes vip-spin{to{transform:rotate(360deg)}}'}</style>
      </div>

      {/* Past requests */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: txtMut, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          Your Requests
        </p>
        {reqLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: txtMut, fontSize: 13 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{
            background: cardBg, borderRadius: 16, border: `1px solid ${border}`,
            padding: '32px', textAlign: 'center',
          }}>
            <Crown size={28} color={GOLD} style={{ opacity: 0.4, margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>No requests yet. Submit your first VIP request above.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map(req => {
              const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
              const Icon = cfg.icon;
              return (
                <div key={req.id} style={{
                  background: cardBg, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color,
                  }}>
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: txtMain }}>{req.type_label}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                        background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
                        textTransform: 'uppercase' as const,
                      }}>{cfg.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: txtMut, margin: '0 0 4px', lineHeight: 1.5 }}>{req.message}</p>
                    {req.admin_note && (
                      <p style={{
                        fontSize: 11, color: txtMain, margin: 0, padding: '6px 10px', borderRadius: 8,
                        background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${border}`,
                      }}>
                        <strong>Team note:</strong> {req.admin_note}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: txtMut, flexShrink: 0 }}>
                    {new Date(req.created_at).toLocaleDateString('fr-TN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}