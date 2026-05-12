'use client';

/**
 * components/seller/black/ProductQualityAudit.tsx — FIXED v3
 *
 * Fixes:
 *  1. Card expansion no longer pushes sibling cards — selected card shows
 *     a detail drawer BELOW the entire grid row, not inside the card itself.
 *     Implemented via a "selected" state + detail panel rendered after grid.
 *  2. Image loading: proper onError fallback showing product initials.
 *  3. Grid uses fixed row height so cards stay aligned regardless of state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star, CheckCircle, Package, Image as ImageIcon,
  FileText, Tag, Layers, ArrowUpRight, X, Zap,
} from 'lucide-react';
import { blackPepperApi, type QualityAuditProduct } from '@/lib/blackPepperApi';
import SmartActionButton from '@/app/components/seller/black/SmartActionButton';

const GOLD = '#f59e0b';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return { main: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', track: 'rgba(16,185,129,0.12)' };
  if (score >= 60) return { main: GOLD,      bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', track: 'rgba(245,158,11,0.1)' };
  if (score >= 40) return { main: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', track: 'rgba(249,115,22,0.1)' };
  return               { main: '#ef4444',   bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   track: 'rgba(239,68,68,0.1)' };
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs work';
  return 'Incomplete';
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const TIP_ICON: Record<string, any> = {
  images: ImageIcon, description: FileText, title: Tag,
  attributes: Layers, stock: Package, default: Star,
};

// ─── Score ring (SVG) ─────────────────────────────────────────────────────────

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const { main } = scoreColor(score);
  const r    = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={main} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
    </svg>
  );
}

// ─── Product thumbnail with fallback ─────────────────────────────────────────

function ProductThumb({ url, name, size = 52, color }: { url: string | null; name: string; size?: number; color: string }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [url]); // reset on new url

  if (url && !err) {
    return (
      <img src={url} alt={name} onError={() => setErr(true)} style={{
        width: size, height: size, borderRadius: 13, objectFit: 'cover',
        border: '1.5px solid rgba(255,255,255,0.1)', flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
      }}/>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 13, flexShrink: 0,
      background: `${color}18`, border: `1.5px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 40 ? 15 : 11, fontWeight: 900, color,
    }}>
      {initials(name) || <Package size={size > 40 ? 20 : 14} color={color}/>}
    </div>
  );
}

// ─── Compact product card (fixed height, no expansion) ───────────────────────

function ProductCard({
  product, dark, isSelected, onClick,
}: {
  product: QualityAuditProduct;
  dark: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { main, bg, border } = scoreColor(product.score);
  const label = scoreLabel(product.score);
  const txtMain = dark ? '#f1f5f9' : '#0f172a';
  const txtMut  = dark ? 'rgba(255,255,255,0.38)' : '#64748b';
  const cardBg  = dark ? '#13110e' : '#ffffff';

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? `${main}12` : cardBg,
        borderRadius: 18,
        border: `1.5px solid ${isSelected ? border : (dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)')}`,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: isSelected ? `0 6px 28px ${main}22` : dark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)',
        userSelect: 'none',
      }}
      className="pqa-card"
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${main},${main}55,transparent)` }}/>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>

          <ProductThumb url={product.image_url} name={product.product_name} size={48} color={main}/>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 800, color: txtMain,
              margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {product.product_name}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 999,
                background: bg, color: main, border: `1px solid ${border}`,
                textTransform: 'uppercase' as const, letterSpacing: '0.07em',
              }}>
                {label}
              </span>
              {product.tips.length > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                  background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: txtMut,
                }}>
                  {product.tips.length} fix{product.tips.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Score ring */}
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            <ScoreRing score={product.score} size={52}/>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: main, lineHeight: 1 }}>{product.score}</span>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: txtMut, lineHeight: 1 }}>/100</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${product.score}%`, borderRadius: 999,
            background: `linear-gradient(90deg,${main}77,${main})`,
            transition: 'width 0.9s ease',
          }}/>
        </div>

        {/* Footer hint */}
        <p style={{ fontSize: 10, color: isSelected ? main : txtMut, fontWeight: 600, margin: '8px 0 0', transition: 'color 0.15s' }}>
          {isSelected ? '▲ Click to close' : product.tips.length > 0 ? `▼ View ${product.tips.length} improvement tip${product.tips.length !== 1 ? 's' : ''}` : '✓ Complete listing'}
        </p>
      </div>
    </div>
  );
}

// ─── Detail panel (rendered BELOW the grid, not inside a card) ───────────────

function DetailPanel({ product, dark, onClose }: {
  product: QualityAuditProduct; dark: boolean; onClose: () => void;
}) {
  const { main, bg, border } = scoreColor(product.score);
  const txtMain = dark ? '#f1f5f9' : '#0f172a';
  const txtMut  = dark ? 'rgba(255,255,255,0.4)' : '#64748b';
  const panelBg = dark ? '#13110e' : '#ffffff';
  const innerBg = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{
      background: panelBg, borderRadius: 18,
      border: `1.5px solid ${border}`,
      padding: '20px 22px',
      boxShadow: `0 8px 36px ${main}20`,
      animation: 'pqa-slidein 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <ProductThumb url={product.image_url} name={product.product_name} size={44} color={main}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: txtMain, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.product_name}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 999,
            background: bg, color: main, border: `1px solid ${border}`,
            textTransform: 'uppercase' as const, letterSpacing: '0.07em',
          }}>
            {scoreLabel(product.score)} — {product.score}/100
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 9, border: 'none',
          background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: txtMut, flexShrink: 0,
        }}>
          <X size={14}/>
        </button>
      </div>

      {product.tips.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
          background: 'rgba(16,185,129,0.08)', borderRadius: 12,
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <CheckCircle size={18} color="#10b981"/>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>
            This listing is complete — great work!
          </p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: txtMut, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Improvement tips — fix these to boost your score
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
            {product.tips.map((tip, i) => {
              const TipIcon  = TIP_ICON[tip.type] ?? TIP_ICON.default;
              const tipColor = tip.points >= 15 ? '#ef4444' : tip.points >= 10 ? GOLD : '#3b82f6';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px', borderRadius: 13,
                  background: innerBg, border: `1px solid ${divider}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: `${tipColor}15`, border: `1px solid ${tipColor}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TipIcon size={14} color={tipColor}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: txtMain, margin: '0 0 3px' }}>{tip.label}</p>
                    <p style={{ fontSize: 10, color: tipColor, margin: '0 0 8px', fontWeight: 800 }}>+{tip.points} pts to your score</p>
                    <SmartActionButton label="Fix it" icon={ArrowUpRight}
                      href={tip.action_href} color="blue" size="sm" dark={dark}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color, dark }: { label: string; value: string | number; color: string; dark: boolean }) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
      borderRadius: 16, padding: '16px 20px',
      border: `1px solid ${color}22`,
      boxShadow: dark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: 24, fontWeight: 900, color, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 800, color: dark ? 'rgba(255,255,255,0.35)' : '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductQualityAudit({ dark }: { dark: boolean }) {
  const [data,     setData]     = useState<QualityAuditProduct[] | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [filter,   setFilter]   = useState<'needs_work' | 'all'>('needs_work');
  const [selected, setSelected] = useState<number | null>(null); // product_id of selected card
  const detailRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(false); setSelected(null);
    try { const r = await blackPepperApi.qualityAudit(); setData(r.data); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll to detail panel when it opens
  useEffect(() => {
    if (selected !== null && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [selected]);

  const txtMain = dark ? '#f1f5f9' : '#0f172a';
  const txtMut  = dark ? 'rgba(255,255,255,0.38)' : '#64748b';
  const cardBg  = dark ? 'rgba(255,255,255,0.03)' : '#fff';
  const border  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const tabsBg  = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const avgScore  = data && data.length > 0
    ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0;
  const needsWork = data ? data.filter(p => p.score < 60).length : 0;
  const great     = data ? data.filter(p => p.score >= 80).length : 0;

  const filtered = data
    ? (filter === 'needs_work' ? data.filter(p => p.score < 80) : data)
      .slice().sort((a, b) => a.score - b.score)
    : [];

  const selectedProduct = data?.find(p => p.product_id === selected) ?? null;
  const { main: avgColor } = scoreColor(avgScore);

  const handleCardClick = (productId: number) => {
    setSelected(prev => prev === productId ? null : productId);
  };

  return (
    <>
      <style>{`
        @keyframes pqa-fadein  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pqa-slidein { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pqa-shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
        .pqa-card:hover { transform: translateY(-2px) !important; box-shadow: 0 10px 32px rgba(0,0,0,0.22) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Loading ── */}
        {loading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 78, borderRadius: 16, background: dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', animation: `pqa-shimmer 1.4s ease ${i*0.15}s infinite` }}/>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 120, borderRadius: 18, background: dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0', animation: `pqa-shimmer 1.4s ease ${i*0.1}s infinite` }}/>)}
            </div>
          </>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '48px', background: cardBg, borderRadius: 20, border: `1px solid ${border}` }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 12px' }}>Could not load listing quality data.</p>
            <button onClick={load} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `${GOLD}18`, color: GOLD, fontSize: 12, fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && data !== null && (
          <>
            {/* Stats */}
            {data.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <StatPill label="Avg score"      value={`${avgScore}/100`} color={avgColor}   dark={dark}/>
                <StatPill label="Need fixes"     value={needsWork}          color="#ef4444"    dark={dark}/>
                <StatPill label="Great listings" value={great}              color="#10b981"    dark={dark}/>
              </div>
            )}

            {/* Global bar */}
            {data.length > 0 && (
              <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, padding: '18px 22px', boxShadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: txtMain, margin: '0 0 2px' }}>Average listing quality</p>
                    <p style={{ fontSize: 11, color: txtMut, margin: 0 }}>Across all {data.length} products</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: avgColor, margin: 0, letterSpacing: '-0.03em' }}>
                    {avgScore}<span style={{ fontSize: 14, fontWeight: 600, color: txtMut }}>/100</span>
                  </p>
                </div>
                <div style={{ height: 8, background: dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${avgScore}%`, borderRadius: 999, background: `linear-gradient(90deg,${avgColor}77,${avgColor})`, transition: 'width 1s ease' }}/>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            {data.length > 0 && (
              <div style={{ display: 'flex', gap: 5, background: tabsBg, borderRadius: 14, padding: 5 }}>
                {[
                  { val: 'needs_work', label: `Needs Improvement (${data.filter(p => p.score < 80).length})` },
                  { val: 'all',        label: `All Products (${data.length})` },
                ].map(({ val, label }) => (
                  <button key={val} onClick={() => { setFilter(val as any); setSelected(null); }} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    background: filter === val ? (dark ? 'rgba(245,158,11,0.18)' : '#fff') : 'transparent',
                    border: filter === val ? '1px solid rgba(245,158,11,0.35)' : '1px solid transparent',
                    color: filter === val ? GOLD : txtMut,
                    boxShadow: filter === val && !dark ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}>{label}</button>
                ))}
              </div>
            )}

            {/* All good */}
            {filtered.length === 0 && filter === 'needs_work' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 20px', background: cardBg, borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={28} color="#10b981"/>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#10b981', margin: '0 0 4px' }}>All listings score 80+</p>
                  <p style={{ fontSize: 12, color: txtMut, margin: 0 }}>Every product has a complete, high-quality listing.</p>
                </div>
              </div>
            )}

            {/* ── Card grid (fixed height cards, NO expansion inside) ── */}
            {filtered.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(256px,1fr))', gap: 14 }}>
                {filtered.map((product, i) => (
                  <div key={product.product_id} style={{ animation: `pqa-fadein 0.35s ease ${i * 0.05}s both` }}>
                    <ProductCard
                      product={product}
                      dark={dark}
                      isSelected={selected === product.product_id}
                      onClick={() => handleCardClick(product.product_id)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Detail panel — renders BELOW the grid, never inside a card ── */}
            {selectedProduct && (
              <div ref={detailRef}>
                <DetailPanel product={selectedProduct} dark={dark} onClose={() => setSelected(null)}/>
              </div>
            )}

            {/* Empty */}
            {data.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', background: cardBg, borderRadius: 20, border: `1px solid ${border}` }}>
                <Zap size={28} color={GOLD} style={{ opacity: 0.4, margin: '0 auto 12px', display: 'block' }}/>
                <p style={{ fontSize: 13, color: txtMut, margin: 0 }}>No products to audit yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}