'use client';

/**
 * components/seller/black/ConversionFunnelCard.tsx
 * FIX line 15: import FunnelInsight (was missing from blackPepperApi exports)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Eye, CheckCircle, Zap, Image, FileText, Tag, TrendingDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import { blackPepperApi, type FunnelInsight } from '@/lib/blackPepperApi'; // ← FIX: FunnelInsight now exported
import SmartActionButton from '@/app/components/seller/black/SmartActionButton';

const GOLD = '#f59e0b';

const FIX_ICON: Record<string, any> = {
  image:       Image,
  price:       Tag,
  description: FileText,
  promote:     Zap,
  default:     TrendingDown,
};
const FIX_COLOR: Record<string, 'gold' | 'red' | 'green' | 'blue' | 'purple'> = {
  image:       'blue',
  price:       'gold',
  description: 'purple',
  promote:     'gold',
  default:     'gold',
};

export default function ConversionFunnelCard({ dark }: { dark: boolean }) {
  const [data,    setData]    = useState<FunnelInsight[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [open,    setOpen]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const r = await blackPepperApi.funnelInsights(); setData(r.data); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#0f0d0a' : '#fffdf5';
  const innerBg   = dark ? '#141209' : '#fff';
  const border    = 'rgba(245,158,11,0.2)';
  const innerBdr  = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';
  const count     = data?.length ?? 0;

  return (
    <div style={{
      background: cardBg, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden',
      boxShadow: dark ? '0 4px 32px rgba(245,158,11,0.06)' : '0 4px 24px rgba(245,158,11,0.08)',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderBottom: open ? `1px solid ${border}` : 'none', cursor: 'pointer',
          background: dark
            ? 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.03))'
            : 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
        }}>
          <Eye size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: 0 }}>Visitor Insights</p>
            {!loading && count > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
              }}>
                {count} need attention
              </span>
            )}
            {!loading && count === 0 && data !== null && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)', textTransform: 'uppercase' as const,
              }}>All good</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>
            {count > 0
              ? `${count} product${count !== 1 ? 's' : ''} getting visitors but not selling`
              : 'Products attracting and converting visitors well'}
          </p>
        </div>
        <div style={{ color: textMuted, flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `3px solid ${GOLD}20`, borderTop: `3px solid ${GOLD}`,
                animation: 'ff-spin 0.8s linear infinite',
              }} />
              <style>{'@keyframes ff-spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px' }}>Could not load visitor insights.</p>
              <button
                onClick={load}
                style={{
                  fontSize: 11, fontWeight: 700, color: GOLD,
                  background: `${GOLD}12`, border: `1px solid ${GOLD}30`,
                  borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data !== null && data.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              background: 'rgba(16,185,129,0.08)', borderRadius: 12,
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <CheckCircle size={18} color="#10b981" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: '0 0 2px' }}>
                  Everything is converting well
                </p>
                <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>
                  No products with high visits and low sales detected right now.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && data && data.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              }}>
                <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.55 }}>
                  These products are getting visitors but people are not buying.
                  A better photo, clearer title, or small discount can make a big difference.
                </p>
              </div>

              {data.map((item) => {
                const FixIcon  = FIX_ICON[item.fix_type] ?? FIX_ICON.default;
                const fixColor = FIX_COLOR[item.fix_type] ?? 'gold';
                return (
                  <div key={item.product_id} style={{
                    background: innerBg, borderRadius: 12,
                    border: `1px solid ${innerBdr}`, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 800, color: textMain, margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{item.product_name}</p>
                        <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{item.category}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Visitors',    value: item.views.toLocaleString(),   color: '#3b82f6' },
                        { label: 'Bought',      value: String(item.units_sold),        color: item.units_sold > 0 ? '#10b981' : '#ef4444' },
                        { label: 'Opportunity', value: item.opportunity_tnd + ' TND',  color: GOLD },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{
                          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          borderRadius: 8, padding: '7px 10px', textAlign: 'center',
                        }}>
                          <p style={{ fontSize: 11, color: textMuted, margin: '0 0 2px' }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 900, color, margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      padding: '9px 12px', borderRadius: 9,
                      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', marginBottom: 10,
                    }}>
                      <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.5 }}>
                        {item.diagnosis}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 8, flexWrap: 'wrap',
                    }}>
                      <p style={{ fontSize: 11, color: textMuted, margin: 0, flex: 1, minWidth: 120 }}>
                        <span style={{ color: textMain, fontWeight: 700 }}>Try: </span>
                        {item.fix_suggestion}
                      </p>
                      <SmartActionButton
                        label={item.fix_action_label}
                        icon={FixIcon}
                        href={item.fix_action_href}
                        color={fixColor}
                        size="sm"
                        dark={dark}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}