'use client';

/**
 * components/seller/black/SmartPromoteCard.tsx  -- Phase 3
 *
 * AI Auto-Promotions: detects trending products NOT yet sponsored,
 * shows estimated revenue boost, one-click activation.
 *
 * UX: plain language only. Never say ROI, conversion rate, velocity.
 * Data: GET /api/seller/black/auto-promote-suggestions
 */

import { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, Star, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { blackPepperApi, type AutoPromoteSuggestion } from '@/lib/blackPepperApi';

const GOLD  = '#f59e0b';
const GOLD2 = '#fbbf24';

function SuggestionCard({
  item, dark,
}: {
  item: AutoPromoteSuggestion;
  dark: boolean;
}) {
  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const innerBg   = dark ? '#141209' : '#fff';
  const innerBdr  = dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.18)';

  return (
    <div style={{ background: innerBg, borderRadius: 14, border: '1px solid ' + innerBdr, overflow: 'hidden' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg,' + GOLD + ',' + GOLD2 + ')' }}/>
      <div style={{ padding: '14px 16px' }}>

        {/* Product header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.product_name}
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' as const, flexShrink: 0,
                border: '1px solid ' + GOLD + '30' }}/>
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: GOLD + '15', border: '1px solid ' + GOLD + '30',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color={GOLD}/>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.product_name}
            </p>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
              background: item.trend_signal === 'hot' ? 'rgba(239,68,68,0.15)' : GOLD + '18',
              color: item.trend_signal === 'hot' ? '#ef4444' : GOLD,
              border: '1px solid ' + (item.trend_signal === 'hot' ? 'rgba(239,68,68,0.3)' : GOLD + '35'),
              textTransform: 'uppercase' as const }}>
              {item.trend_signal === 'hot' ? 'Hot product' : 'Rising fast'}
            </span>
          </div>
        </div>

        {/* Why sponsor */}
        <div style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 12,
          background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid ' + GOLD + '20' }}>
          <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.55 }}>{item.rationale}</p>
        </div>

        {/* 3 impact stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Selling',    value: item.velocity_label,                   color: '#10b981' },
            { label: 'This week',  value: item.seven_day_revenue + ' TND',        color: GOLD       },
            { label: 'Est. boost', value: '+' + item.estimated_boost_tnd + ' TND', color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 8, padding: '7px 10px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', fontWeight: 700 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 900, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: textMuted, margin: '0 0 12px', lineHeight: 1.4 }}>
          {item.boost_explanation}
        </p>

        {/* CTA */}
        {/* CTA */}
<a href="/seller/promote" style={{
  width: '100%', padding: '11px 0', borderRadius: 11,
  background: 'linear-gradient(135deg,' + GOLD + ',' + GOLD2 + ')',
  color: '#000', fontSize: 13, fontWeight: 900,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  boxShadow: '0 4px 16px ' + GOLD + '40',
  textDecoration: 'none',
}}>
  <Star size={14}/> Go to Promote
</a>
      </div>
    </div>
  );
}

export default function SmartPromoteCard({ dark }: { dark: boolean }) {
  const [data,       setData]       = useState<AutoPromoteSuggestion[] | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [open,       setOpen]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const r = await blackPepperApi.autoPromoteSuggestions(); setData(r.data); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  

  const textMain  = dark ? '#fff' : '#111';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const cardBg    = dark ? '#0f0d0a' : '#fffdf5';
  const border    = 'rgba(245,158,11,0.2)';
  const unspon    = data ? data.filter(p => !p.already_sponsored) : [];
  const totalBoost = unspon.reduce((s, p) => s + p.estimated_boost_tnd, 0);

  return (
    <div style={{ background: cardBg, borderRadius: 20, border: '1px solid ' + border, overflow: 'hidden',
      boxShadow: dark ? '0 4px 32px rgba(245,158,11,0.06)' : '0 4px 24px rgba(245,158,11,0.08)' }}>

      {/* Header */}
      <div onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: open ? '1px solid ' + border : 'none', cursor: 'pointer',
        background: dark
          ? 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.03))'
          : 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
          <Zap size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: textMain, margin: 0 }}>Smart Promotions</p>
            {!loading && unspon.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                background: GOLD + '20', color: GOLD, border: '1px solid ' + GOLD + '40',
                textTransform: 'uppercase' as const }}>
                {unspon.length} ready
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>
            {unspon.length > 0
              ? unspon.length + ' trending product' + (unspon.length !== 1 ? 's' : '') + ' not yet sponsored — est. +' + totalBoost + ' TND'
              : 'All trending products are already sponsored'}
          </p>
        </div>
        <div style={{ color: textMuted, flexShrink: 0 }}>
          {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%',
                border: '3px solid ' + GOLD + '20', borderTop: '3px solid ' + GOLD,
                animation: 'sp3spin 0.8s linear infinite' }}/>
              <style>{'@keyframes sp3spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px' }}>Could not load suggestions.</p>
              <button onClick={load} style={{ fontSize: 11, fontWeight: 700, color: GOLD,
                background: GOLD + '12', border: '1px solid ' + GOLD + '30',
                borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {!loading && !error && data !== null && unspon.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle size={18} color="#10b981"/>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>
                All trending products are already sponsored. You are maximizing visibility.
              </p>
            </div>
          )}

          {!loading && !error && unspon.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10,
                background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                border: '1px solid ' + GOLD + '20' }}>
                <p style={{ fontSize: 12, color: textMain, margin: 0, lineHeight: 1.55 }}>
                  These products are selling fast but are not promoted yet.
                  Sponsoring them puts them in front of more buyers at exactly the right moment.
                </p>
              </div>
              {unspon.map(item => (
                <SuggestionCard key={item.product_id} item={item} dark={dark}/>

              ))}
            </div>
          )}
          <style>{'@keyframes sp3spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}
    </div>
  );
}