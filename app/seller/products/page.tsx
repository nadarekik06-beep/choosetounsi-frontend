'use client';

/**
 * app/seller/products/page.tsx
 *
 * CHANGES vs previous version:
 *   1. Restock button appears when stock = 0 (or variant_stock = 0)
 *   2. RestockModal mounted + wired up
 *   3. After restock, list refreshes and product goes "back in stock"
 *   4. Restock button uses a green color to differentiate from Edit (grey)
 *   5. ProductAlertPanel + AlertIndicator wired up per row
 *   6. Critical/warning row highlight via borderLeft + background tint
 *
 * Everything else is IDENTICAL to the original.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, storageUrl, isNetworkError } from '@/lib/sellerApi';
import type { Product, PaginatedResponse } from '@/types/seller';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Clock, Image as ImageIcon, Eye, Layers,
  RefreshCw,
} from 'lucide-react';
import ProductModal, { PRODUCT_FORM_FOCUS, type ProductFormFocus, type ProductRadarPrefill } from './ProductModal';
import { growthRadarApi } from '@/lib/growthRadarApi';
import { blackPepperApi } from '@/lib/blackPepperApi';
import { insightFromUrl } from '../black/visitor-insights/_components/links';
import RestockModal, { type RestockProduct } from '../components/RestockModal';
import { useTheme } from '../SellerShell';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';
import ProductAlertPanel, {
  AlertIndicator,
  type ProductAlertData,
} from '@/app/components/seller/ProductAlertPanel';
import { ink } from '@/app/seller/ink';

import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import { RefreshCover } from '@/components/brand/BrandLoader'
interface ModalState {
  open: boolean;
  product: Product | null;
}

const MODAL_CLOSED: ModalState = { open: false, product: null };

export default function ProductsPage() {
  const router = useRouter();
  const { dark } = useTheme();
  const t = useTranslations('seller.products');
  const { price } = useFormat();

  const [data,       setData]       = useState<PaginatedResponse<Product> | null>(null);
  const [loading,    setLoading]    = useState(true);
  // holds the navigation loader until the first load is done
  const firstLoad = usePageLoading(loading);
  const [search,     setSearch]     = useState('');
  const [isActive,   setIsActive]   = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<ModalState>(MODAL_CLOSED);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = useCallback((msg: string, ok: boolean) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Restock modal state ───────────────────────────────────────────────────
  const [restockProduct, setRestockProduct] = useState<RestockProduct | null>(null);

  // Close modals on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (restockProduct) { setRestockProduct(null); return; }
        if (modal.open) setModal(MODAL_CLOSED);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal.open, restockProduct]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({
        page,
        per_page: 12,
        ...(search     && { search }),
        ...(isActive   && { is_active: isActive }),
        ...(isApproved && { is_approved: isApproved }),
      });
      setData(res.data as unknown as PaginatedResponse<Product>);
    } catch {
      // keep previous data on error
      showToast(t('loadFailed'), false);
    } finally {
      setLoading(false);
    }
  }, [page, search, isActive, isApproved, showToast, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Opened from a Growth Radar card: prefill + the card to mark as applied on save
  // (cardId 0 = a plain deep link with a focus, e.g. from Qualité des fiches)
  const [radar, setRadar] = useState<(ProductRadarPrefill & { cardId: number; kind: 'edit' | 'listing' }) | null>(null);
  // Opened from an Analyse des visiteurs action: record it once really saved (before/after funnel)
  const [insight, setInsight] = useState<{ productId: number; problem: string | null; stage: string | null } | null>(null);

  const openAddModal = () => setModal({ open: true, product: null });
  const closeModal   = () => { setModal(MODAL_CLOSED); setRadar(null); setInsight(null); };
  const handleSaved  = () => {
    if (radar?.cardId) growthRadarApi.applied(radar.cardId, radar.kind).catch(() => {});
    if (insight && modal.product?.id === insight.productId) {
      blackPepperApi.insightApplied(insight.productId, 'edit', insight.problem, insight.stage).catch(() => {});
    }
    closeModal(); fetchProducts();
  };

  /** After a delete the row must go: step back a page when it was the last one shown. */
  const refreshAfterDelete = () => {
    if (data && data.data.length <= 1 && page > 1) setPage(p => p - 1);
    else fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (deleting !== null || !confirm(t('confirmDelete'))) return;
    setDeleting(id);
    try {
      await productsApi.delete(id);
      showToast(t('deleted'), true);
      refreshAfterDelete();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        // Already gone (e.g. an earlier attempt went through): just drop it from the list
        showToast(t('deleteGone'), true);
        refreshAfterDelete();
      } else {
        showToast(isNetworkError(err) ? t('deleteNetwork') : t('deleteFailed'), false);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (product: Product) => {
    try {
      const res = await productsApi.getOne(product.id);
      setModal({ open: true, product: res.data as unknown as Product });
    } catch {
      setModal({ open: true, product });
    }
  };

  /**
   * Open the Restock modal for a product.
   * Fetches full variant data so the modal can show per-variant stock.
   */
  const handleRestock = async (product: Product) => {
    try {
      const res = await productsApi.getOne(product.id);
      const full = (res.data ?? res) as any;

      const hasVariants  = !!full.has_variants || (full.variant_rows?.length > 0);
      const variantStock = full.variant_stock ?? 0;

      const variants = (full.variant_rows ?? full.variants ?? []).map((v: any) => ({
        id:         v.id,
        label:      v.label ?? '',
        stock:      v.stock ?? 0,
        is_active:  v.is_active ?? true,
        option_ids: v.option_ids ?? [],
        option_map: v.option_map ?? {},   // ← FIX: pass option_map for rich labels
      }));

      setRestockProduct({
        id:            full.id,
        name:          full.name,
        stock:         full.stock ?? 0,
        has_variants:  hasVariants,
        variant_stock: variantStock,
        variants,
      });
    } catch {
      // Fallback with minimal data
      const hasVariants  = !!(product as any).has_variants;
      const variantStock = (product as any).variant_stock ?? 0;

      setRestockProduct({
        id:            product.id,
        name:          product.name,
        stock:         product.stock ?? 0,
        has_variants:  hasVariants,
        variant_stock: variantStock,
        variants:      [],
      });
    }
  };

  // Deep links from forecast actions / product alerts:
  //   /seller/products?restock=<id>  → restock modal
  //   /seller/products?edit=<id>     → product form (AI description panel included)
  // Growth Radar cards add: &focus=photos|description|price&price=…&card=…, or
  //   /seller/products?create=1&name=…&category=…&card=…  → new product form
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const restockId = Number(q.get('restock'));
    const editId    = Number(q.get('edit'));
    const create    = q.get('create') === '1';
    const cardId    = Number(q.get('card')) || 0;
    if (!restockId && !editId && !create) return;
    window.history.replaceState(null, '', window.location.pathname);
    const focus = q.get('focus');
    const validFocus = PRODUCT_FORM_FOCUS.includes(focus as ProductFormFocus) ? focus as ProductFormFocus : undefined;
    setInsight(insightFromUrl(q));
    if (cardId || validFocus) setRadar({
      cardId, kind: create ? 'listing' : 'edit',
      focus: validFocus,
      price: q.get('price') ? Number(q.get('price')) : undefined,
      name: q.get('name') ?? undefined,
      categoryId: Number(q.get('category')) || undefined,
    });
    if (restockId) handleRestock({ id: restockId } as Product);
    else if (create) openAddModal();
    else handleEdit({ id: editId } as Product);
  }, []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const inputBg   = dark ? '#0d1117' : '#f8fafc';
  const theadBg   = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const rowHover  = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 500,
    background: inputBg,
    color: textMain,
    outline: 'none',
  };

  return (
    <>
      <style>{`
        .product-row:hover td { background: ${rowHover} !important; }
        .act-btn:hover { opacity: 1 !important; }
        .restock-btn:hover { opacity: 1 !important; background: rgba(16,185,129,0.15) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes alertSlideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes alertPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
              {t('title')}
            </h1>
            <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,20,46,0.35)' }}
          >
            <Plus size={15} /> {t('add')}
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: cardBg, borderRadius: 16, padding: 16, border: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('searchPlaceholder')}
              style={{ ...inputStyle, width: '100%', paddingInlineStart: 32 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={13} style={{ color: textMuted, flexShrink: 0 }} />
            <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">{t('allStatus')}</option>
              <option value="true">{t('active')}</option>
              <option value="false">{t('inactive')}</option>
            </select>
            <select value={isApproved} onChange={e => { setIsApproved(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">{t('allApprovals')}</option>
              <option value="true">{t('approved')}</option>
              <option value="false">{t('pending')}</option>
            </select>
          </div>
          {data && (
            <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, marginInlineStart: 'auto' }}>
              {t('count', { count: data.total })}
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <RefreshCover active={loading} theme={dark ? 'dark' : 'light'} />
            {firstLoad ? (
              <BrandLoader variant="section" theme={dark ? 'dark' : 'light'} minHeight={220} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: theadBg }}>
                      {(['product', 'category', 'price', 'stock', 'status', 'approval', 'actions'] as const).map(h => (
                        <th key={h} style={{
                          padding: '10px 20px', fontSize: 9, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.1em', color: textMuted,
                          textAlign: ['price', 'stock'].includes(h) ? 'end' : ['status', 'approval', 'actions'].includes(h) ? 'center' : 'start',
                        }}>
                          {t(`cols.${h}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.map(product => {
                      const hasVariants  = (product as any).has_variants;
                      const variantStock = (product as any).variant_stock;
                      const displayStock = hasVariants ? variantStock : product.stock;
                      const thumbUrl     = (product as any).primary_image_url as string | null | undefined;
  
                      // ── Is out of stock? (triggers restock button) ──────────
                      const isOutOfStock = displayStock === 0;
  
                      // ── Alert data from backend ─────────────────────────────
                      const alertData = ((product as any).alert_data ?? { has_alert: false }) as ProductAlertData;
                      const isCritical = alertData.alert_level === 'critical';
                      const isWarning  = alertData.alert_level === 'warning';
  
                      return (
                        <React.Fragment key={product.id}>
                          <tr
                            className="product-row"
                            style={{
                              borderTop: `1px solid ${border}`,
                              background: isCritical
                                ? (dark ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)')
                                : isWarning
                                ? (dark ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.015)')
                                : 'transparent',
                              borderInlineStart: isCritical
                                ? '3px solid rgba(239,68,68,0.5)'
                                : isWarning
                                ? '3px solid rgba(245,158,11,0.5)'
                                : '3px solid transparent',
                              transition: 'background 0.2s ease',
                            }}
                          >
  
                            {/* Product */}
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${border}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={product.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={e => {
                                        const img = e.currentTarget;
                                        img.style.display = 'none';
                                        const parent = img.parentElement;
                                        if (parent && !parent.querySelector('svg')) {
                                          const wrap = document.createElement('div');
                                          wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%';
                                          wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                                          parent.appendChild(wrap);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <ImageIcon size={14} style={{ color: textMuted, opacity: 0.5 }} />
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontWeight: 800, color: textMain, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                    {product.name}
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                                      {(product as any).sku ? t('sku', { sku: (product as any).sku }) : t('id', { id: product.id })}
                                    </p>
                                    {hasVariants && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, color: ink('#6366f1', dark), background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 4 }}>
                                        <Layers size={8} /> {t('variantsBadge')}
                                      </span>
                                    )}
                                    {/* ── Alert indicator badge ── */}
                                    <AlertIndicator alertData={alertData} dark={dark} />
                                  </div>
                                </div>
                              </div>
                            </td>
  
                            {/* Category */}
                            <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 500, color: textMuted }}>
                              {(product as any).category?.name ?? '—'}
                            </td>
  
                            {/* Price */}
                            <td style={{ padding: '12px 20px', textAlign: 'end', fontWeight: 900, color: textMain }}>
                              {price(product.price, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                            </td>
  
                            {/* Stock */}
                            <td style={{ padding: '12px 20px', textAlign: 'end' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                <span style={{ fontWeight: 800, color: displayStock === 0 ? ink('#ef4444', dark) : displayStock <= 10 ? ink('#f59e0b', dark) : textMain }}>
                                  {displayStock}
                                  {displayStock === 0 && <span style={{ fontSize: 10, marginInlineStart: 4, color: ink('#ef4444', dark) }}>{t('outTag')}</span>}
                                  {displayStock > 0 && displayStock <= 10 && <span style={{ fontSize: 10, marginInlineStart: 4, color: ink('#f59e0b', dark) }}>{t('lowTag')}</span>}
                                </span>
                              </div>
                            </td>
  
                            {/* Status */}
                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: product.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: product.is_active ? ink('#10b981', dark) : ink('#ef4444', dark), border: `1px solid ${product.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                                {product.is_active ? <><CheckCircle size={9} />{t('active')}</> : <><XCircle size={9} />{t('inactive')}</>}
                              </span>
                            </td>
  
                            {/* Approval — replace the existing cell */}
  <td style={{ padding: '12px 20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
              background: product.is_approved
                  ? 'rgba(59,130,246,0.12)'
                  : (product as any).rejection_reason
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(245,158,11,0.12)',
              color: product.is_approved
                  ? ink('#3b82f6', dark)
                  : (product as any).rejection_reason
                  ? ink('#ef4444', dark)
                  : ink('#f59e0b', dark),
              border: `1px solid ${product.is_approved
                  ? 'rgba(59,130,246,0.25)'
                  : (product as any).rejection_reason
                  ? 'rgba(239,68,68,0.25)'
                  : 'rgba(245,158,11,0.25)'}`,
          }}>
              {product.is_approved
                  ? <><CheckCircle size={9} />{t('approved')}</>
                  : (product as any).rejection_reason
                  ? <><XCircle size={9} />{t('rejected')}</>
                  : (product as any).changes_requested_at
                  ? <><Clock size={9} />{t('changesRequested')}</>
                  : <><Clock size={9} />{t('pending')}</>
              }
          </span>
          {/* Reason snippet */}
          {!product.is_approved && (product as any).rejection_reason && (
              <span style={{
                  fontSize: 9, color: ink('#ef4444', dark), maxWidth: 120,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', display: 'block',
              }}
                  title={(product as any).rejection_reason}
              >
                  {(product as any).rejection_reason}
              </span>
          )}
      </div>
  </td>
  
                            {/* Actions */}
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
  
                                {/* View */}
                                <button
                                  onClick={() => router.push(`/seller/products/${product.id}`)}
                                  className="act-btn"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: ink('#94a3b8', dark), opacity: 0.7 }}
                                  title={t('view')}
                                  aria-label={t('view')}
                                >
                                  <Eye size={13} />
                                </button>
  
                                {/* Edit */}
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="act-btn"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: ink('#94a3b8', dark), opacity: 0.7 }}
                                  title={t('edit')}
                                  aria-label={t('edit')}
                                >
                                  <Edit2 size={13} />
                                </button>
  
                                {/* ── Restock button (only when out of stock) ── */}
                                {isOutOfStock && (
                                  <button
                                    onClick={() => handleRestock(product)}
                                    className="restock-btn"
                                    title={t('restockHint')}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      padding: '5px 10px',
                                      background: 'rgba(16,185,129,0.1)',
                                      border: '1px solid rgba(16,185,129,0.3)',
                                      borderRadius: 8, cursor: 'pointer',
                                      color: ink('#10b981', dark),
                                      fontSize: 10, fontWeight: 800,
                                      opacity: 0.9, transition: 'all 0.15s',
                                      fontFamily: 'inherit',
                                    }}
                                  >
                                    <RefreshCw size={11} />
                                    {t('restock')}
                                  </button>
                                )}
  
                                {/* Delete */}
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  disabled={deleting !== null}
                                  aria-busy={deleting === product.id}
                                  className="act-btn"
                                  style={{ background: 'transparent', border: 'none', cursor: deleting !== null ? 'not-allowed' : 'pointer', padding: 6, borderRadius: 8, color: ink('#94a3b8', dark), opacity: deleting === product.id ? 0.4 : 0.7 }}
                                  title={t('delete')}
                                  aria-label={t('delete')}
                                >
                                  {deleting === product.id
                                    ? <BrandLoader variant="inline" size={13} />
                                    : <Trash2 size={13} />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
  
                          {/* ── Alert panel (expands as a full-width row below the product row) ── */}
                          {alertData.has_alert && (
                            <ProductAlertPanel
                              key={`alert-${product.id}`}
                              productId={product.id}
                              productName={product.name}
                              alertData={alertData}
                              dark={dark}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
  
                    {data?.data.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                          <Package size={28} style={{ margin: '0 auto 10px', display: 'block', color: textMuted, opacity: 0.4 }} />
                          <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: '0 0 4px' }}>{t('empty')}</p>
                          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{t('emptyHint')}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.last_page > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                {t('showing', { from: data.from ?? 0, to: data.to ?? 0, total: data.total })}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 800, color: textMain, padding: '0 4px' }}>
                  {data.current_page}/{data.last_page}
                </span>
                <button onClick={() => setPage(p => Math.min(data.last_page, p + 1))} disabled={page === data.last_page} style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === data.last_page ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Add modal */}
      {modal.open && (
        <ProductModal product={modal.product} radar={radar} onClose={closeModal} onSaved={handleSaved} />
      )}

      {/* Toast */}
      {toast && (
        <div role={toast.ok ? 'status' : 'alert'} aria-live="polite" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: dark ? '#1a2235' : '#1e293b', color: '#fff',
          padding: '11px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 99999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxWidth: 'calc(100vw - 32px)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'toastIn 0.22s ease forwards',
        }}>
          {toast.ok ? <CheckCircle size={15} color="#10b981" /> : <XCircle size={15} color="#f87171" />}
          {toast.msg}
        </div>
      )}

      {/* Restock modal */}
      {restockProduct && (
        <RestockModal
          product={restockProduct}
          onClose={() => setRestockProduct(null)}
          onRestocked={() => {
            if (insight && restockProduct?.id === insight.productId) {
              blackPepperApi.insightApplied(insight.productId, 'restock', insight.problem, insight.stage).catch(() => {});
              setInsight(null);
            }
            setRestockProduct(null);
            fetchProducts();
          }}
        />
      )}
    </>
  );
}