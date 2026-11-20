'use client';

/**
 * Quick stock editor of the Produits list.
 * Desktop: a full-width row under the product. Mobile: a bottom sheet with a sticky save bar.
 * One row per variant (swatch/photo + "Noir · M" + big stepper), or a single stepper for simple products.
 * Stock only — saving never touches price, status or validation (PATCH /seller/products/{id}/stock).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus, X, Layers, Loader2 } from 'lucide-react';
import { productsApi } from '@/lib/sellerApi';
import { ink } from '@/app/seller/ink';

const MAX_STOCK = 99999;
const LOW_MAX = 5;
const RED = '#db142e';
const GREEN = '#198f41';

export interface QuickStockProduct {
  id: number;
  name: string;
  stock: number;
  has_variants: boolean;
}

export type QuickStockPayload =
  | { stock: number }
  | { variants: Array<{ variant_id: number; stock: number }> };

interface Row {
  id: number;
  label: string;
  hex: string | null;
  image: string | null;
  active: boolean;
  orig: number;
  val: number | '';
}

interface Props {
  product: QuickStockProduct;
  dark: boolean;
  sheet: boolean;
  /** Resolves when saved; throws when it failed (the panel then stays open). */
  onSave: (payload: QuickStockPayload, newTotal: number) => Promise<void>;
  onClose: () => void;
}

const num = (v: number | ''): number => (v === '' ? 0 : v);
const clamp = (n: number) => Math.max(0, Math.min(MAX_STOCK, Math.floor(n)));

export default function QuickStockEditor({ product, dark, sheet, onSave, onClose }: Props) {
  const t = useTranslations('seller.products.quickStock');
  const [rows, setRows] = useState<Row[]>([]);
  const [simple, setSimple] = useState<number | ''>(product.stock);
  const [loading, setLoading] = useState(product.has_variants);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [all, setAll] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);

  const text   = dark ? '#ffffff' : '#0f172a';
  const muted  = dark ? 'rgba(255,255,255,0.6)' : '#5b6472';
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const panel  = dark ? '#161b27' : '#ffffff';
  const soft   = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const inputBg = dark ? '#0d1117' : '#ffffff';

  // Variants are loaded when the panel opens (the list itself stays light)
  useEffect(() => {
    if (!product.has_variants) return;
    let alive = true;
    (async () => {
      try {
        const res: any = await productsApi.getOne(product.id);
        const full = (res.data ?? res) as any;
        const list: any[] = full.variant_rows ?? [];
        if (!alive) return;
        setRows(list.map(v => {
          const map = (v.option_map ?? {}) as Record<string, { value: string; color_hex?: string | null }>;
          const parts: string[] = [];
          if (map.color) parts.push(map.color.value);
          Object.entries(map).forEach(([slug, o]) => { if (slug !== 'color') parts.push(o.value); });
          return {
            id: v.id,
            label: parts.length ? parts.join(' · ') : (v.label || `#${v.id}`),
            hex: map.color?.color_hex ?? null,
            image: Array.isArray(v.image_urls) && v.image_urls.length ? v.image_urls[0] : null,
            active: v.is_active !== false,
            orig: Number(v.stock) || 0,
            val: Number(v.stock) || 0,
          };
        }));
      } catch {
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [product.id, product.has_variants]);

  const dirty = product.has_variants
    ? rows.some(r => num(r.val) !== r.orig)
    : num(simple) !== product.stock;

  const total = product.has_variants
    ? rows.filter(r => r.active).reduce((s, r) => s + num(r.val), 0)
    : num(simple);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm(t('discard'))) return;
    onClose();
  }, [dirty, saving, onClose, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); requestClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // Bottom sheet: lock the page scroll behind it
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sheet]);

  const setRow = (id: number, v: number | '') => setRows(rs => rs.map(r => (r.id === id ? { ...r, val: v } : r)));
  const parse = (raw: string): number | '' => {
    const digits = raw.replace(/\D/g, '').slice(0, 5);
    return digits === '' ? '' : clamp(Number(digits));
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving || !dirty) return;
    if (total === 0 && (product.has_variants ? rows.some(r => r.active) : true) && !window.confirm(t('allZero'))) return;
    setSaving(true);
    try {
      const payload: QuickStockPayload = product.has_variants
        ? { variants: rows.filter(r => num(r.val) !== r.orig).map(r => ({ variant_id: r.id, stock: num(r.val) })) }
        : { stock: num(simple) };
      await onSave(payload, total);
      onClose();
    } catch {
      setSaving(false); // the page already showed the error toast
    }
  };

  const stateOf = (n: number) => (n === 0 ? 'out' : n <= LOW_MAX ? 'low' : 'ok');
  const stateColor = (s: string) => (s === 'out' ? ink('#ef4444', dark) : s === 'low' ? ink('#f59e0b', dark) : text);

  const stepBtn: React.CSSProperties = {
    width: 44, height: 44, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, border: `1px solid ${border}`, background: soft, color: text, cursor: 'pointer', touchAction: 'manipulation',
  };

  const renderStepper = (value: number | "", onChange: (v: number | "") => void, label: string) => {
    const st = stateOf(num(value));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" style={stepBtn} aria-label={t('minus')} onClick={() => onChange(clamp(num(value) - 1))}>
          <Minus size={18} />
        </button>
        <input
          value={value}
          onChange={e => onChange(parse(e.target.value))}
          onFocus={e => e.target.select()}
          onBlur={() => { if (value === '') onChange(0); }}
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          aria-label={label}
          style={{
            width: 72, height: 44, textAlign: 'center', fontSize: 18, fontWeight: 900, borderRadius: 12,
            border: `1.5px solid ${st === 'out' ? RED : border}`, background: inputBg, color: stateColor(st), outline: 'none',
            minWidth: 0,
          }}
        />
        <button type="button" style={stepBtn} aria-label={t('plus')} onClick={() => onChange(clamp(num(value) + 1))}>
          <Plus size={18} />
        </button>
      </div>
    );
  };

  const badge = (s: string) =>
    s === 'ok' ? null : (
      <span style={{
        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
        background: s === 'out' ? 'rgba(219,20,46,0.12)' : 'rgba(245,158,11,0.14)',
        color: stateColor(s), border: `1px solid ${s === 'out' ? 'rgba(219,20,46,0.3)' : 'rgba(245,158,11,0.3)'}`,
      }}>
        {s === 'out' ? t('soldOut') : t('low')}
      </span>
    );

  const body = (
    <form
      ref={formRef}
      onSubmit={submit}
      style={{
        display: 'flex', flexDirection: 'column', background: panel, color: text, minWidth: 0,
        ...(sheet
          ? { maxHeight: '88vh', borderRadius: '20px 20px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,0.35)' }
          : { border: `1px solid ${border}`, borderRadius: 14 }),
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{t('title')}</div>
          <div style={{ fontSize: 12, color: muted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </div>
        </div>
        <button type="button" onClick={requestClose} aria-label={t('cancel')}
          style={{ ...stepBtn, border: 'none', background: 'transparent' }}>
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24, color: muted }}>
            <Loader2 size={22} style={{ animation: 'spin 0.9s linear infinite' }} />
          </div>
        )}
        {loadError && <p style={{ margin: 0, color: ink('#ef4444', dark), fontWeight: 700, fontSize: 13 }}>{t('loadFailed')}</p>}

        {!product.has_variants && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13 }}>
              {t('simple')} {badge(stateOf(num(simple)))}
            </span>
            {renderStepper(simple, setSimple, t("qty"))}
            <button type="button" onClick={() => setSimple(0)}
              style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: `1px solid rgba(219,20,46,0.35)`, background: 'rgba(219,20,46,0.08)', color: ink(RED, dark), fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              {t('soldOut')}
            </button>
          </div>
        )}

        {product.has_variants && !loading && !loadError && (
          <>
            {/* Same quantity for every variant */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, borderRadius: 12, background: soft, border: `1px dashed ${border}` }}>
              <Layers size={16} style={{ color: muted, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: 12, flex: '1 1 150px' }}>{t('applyAll')}</span>
              <input
                value={all}
                onChange={e => setAll(e.target.value.replace(/\D/g, '').slice(0, 5))}
                inputMode="numeric" pattern="[0-9]*" placeholder="0"
                aria-label={t('applyAllHint')}
                onKeyDown={e => {
                  if (e.key === 'Enter' && all !== '') { e.preventDefault(); setRows(rs => rs.map(r => ({ ...r, val: clamp(Number(all)) }))); }
                }}
                style={{ width: 72, height: 44, textAlign: 'center', fontSize: 16, fontWeight: 800, borderRadius: 12, border: `1px solid ${border}`, background: inputBg, color: text, outline: 'none', minWidth: 0 }}
              />
              <button type="button" disabled={all === ''}
                onClick={() => setRows(rs => rs.map(r => ({ ...r, val: clamp(Number(all)) })))}
                style={{ minHeight: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: all === '' ? border : GREEN, color: '#fff', fontWeight: 800, fontSize: 13, cursor: all === '' ? 'not-allowed' : 'pointer' }}>
                {t('apply')}
              </button>
            </div>

            {rows.map(r => {
              const st = stateOf(num(r.val));
              const changed = num(r.val) !== r.orig;
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 10, borderRadius: 14,
                  border: `1.5px solid ${changed ? GREEN : border}`,
                  background: changed ? (dark ? 'rgba(25,143,65,0.12)' : 'rgba(25,143,65,0.07)') : 'transparent',
                  opacity: r.active ? 1 : 0.65,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 140px', minWidth: 0 }}>
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${border}` }} />
                    ) : (
                      <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: r.hex || soft, border: `1px solid ${border}` }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, overflowWrap: 'anywhere' }}>{r.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, color: muted, fontWeight: 700 }}>
                        <span>{r.orig}</span>
                        {badge(st)}
                        {!r.active && <span>({t('inactive')})</span>}
                        {changed && <span style={{ color: ink(GREEN, dark) }}>· {t('changed')}</span>}
                      </div>
                    </div>
                  </div>
                  {renderStepper(r.val, v => setRow(r.id, v), `${t("qty")} — ${r.label}`)}
                  <button type="button" onClick={() => setRow(r.id, 0)} disabled={num(r.val) === 0}
                    style={{ minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid rgba(219,20,46,0.35)`, background: 'rgba(219,20,46,0.08)', color: ink(RED, dark), fontWeight: 800, fontSize: 12, cursor: num(r.val) === 0 ? 'default' : 'pointer', opacity: num(r.val) === 0 ? 0.45 : 1 }}>
                    {t('soldOut')}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer (sticky: it sits outside the scrolling body) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        padding: '12px 16px', borderTop: `1px solid ${border}`, background: panel,
        paddingBottom: sheet ? 'max(12px, env(safe-area-inset-bottom))' : 12,
        borderRadius: sheet ? 0 : '0 0 14px 14px',
      }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: muted }}>{t('total', { count: total })}</span>
        <div style={{ display: 'flex', gap: 8, flex: sheet ? '1 1 100%' : '0 0 auto' }}>
          {!sheet && (
            <button type="button" onClick={requestClose}
              style={{ minHeight: 44, padding: '0 18px', borderRadius: 12, border: `1px solid ${border}`, background: 'transparent', color: text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {t('cancel')}
            </button>
          )}
          <button type="submit" disabled={!dirty || saving || loading}
            style={{
              minHeight: 48, padding: '0 24px', borderRadius: 12, border: 'none', flex: sheet ? 1 : undefined,
              background: !dirty || saving ? (dark ? '#2a3344' : '#cbd5e1') : GREEN, color: '#fff', fontWeight: 900, fontSize: 15,
              cursor: !dirty || saving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {saving && <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </form>
  );

  if (!sheet) return body;

  return (
    <div role="dialog" aria-modal="true" aria-label={t('title')}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}>
      <div style={{ width: '100%', animation: 'sheetUp 0.22s ease-out' }}>{body}</div>
    </div>
  );
}
