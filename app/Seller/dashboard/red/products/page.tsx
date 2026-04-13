'use client';
/**
 * app/seller/dashboard/red/products/page.tsx
 *
 * Red Pepper — Products
 * ──────────────────────
 * Same API logic as Green's /seller/products page (productsApi from sellerApi.ts).
 * Red design language. ProductModal is imported from the shared Green location
 * so create/edit logic is identical — no duplication.
 *
 * NOTE: ProductModal lives at app/seller/products/ProductModal.tsx
 *       We import it with a relative path adjusted for this directory depth.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi } from '@/lib/sellerApi';
import type { Product, PaginatedResponse } from '@/types/seller';
import {
  Plus, Search, Edit2, Trash2, Package,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Loader2, Clock, Eye, Layers, Filter,
} from 'lucide-react';
// ── Reuse the EXACT same modal as the Green dashboard ──
import ProductModal from '@/app/seller/products/ProductModal';

interface ModalState { open: boolean; product: Product | null; }
const MODAL_CLOSED: ModalState = { open: false, product: null };

export default function RedProductsPage() {
  const router = useRouter();

  const [data,       setData]       = useState<PaginatedResponse<Product> | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [isActive,   setIsActive]   = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<ModalState>(MODAL_CLOSED);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.open) setModal(MODAL_CLOSED);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal.open]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({
        page, per_page: 12,
        ...(search     && { search }),
        ...(isActive   && { is_active: isActive }),
        ...(isApproved && { is_approved: isApproved }),
      });
      setData(res.data as unknown as PaginatedResponse<Product>);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [page, search, isActive, isApproved]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await productsApi.delete(id);
      fetchProducts();
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

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        .rp-row:hover td { background: var(--surface3) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Products</h1>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>Manage your store listings</p>
          </div>
          <button
            onClick={() => setModal({ open: true, product: null })}
            className="red-btn"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: 14, border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or SKU…"
              className="red-input"
              style={{ paddingLeft: 32, margin: 0 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={12} style={{ color: 'var(--text2)', flexShrink: 0 }} />
            <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }} className="red-select" style={{ width: 'auto' }}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select value={isApproved} onChange={e => { setIsApproved(e.target.value); setPage(1); }} className="red-select" style={{ width: 'auto' }}>
              <option value="">All Approvals</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
          </div>
          {data && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginLeft: 'auto' }}>
              {data.total} product{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
              <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--red)' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {['Product', 'Category', 'Price', 'Stock', 'Status', 'Approval', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: ['Price', 'Stock'].includes(h) ? 'right' : ['Status', 'Approval', 'Actions'].includes(h) ? 'center' : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map(product => {
                    const hasVariants   = (product as any).has_variants;
                    const displayStock  = hasVariants ? (product as any).variant_stock : product.stock;
                    const thumbUrl      = (product as any).primary_image_url as string | null | undefined;

                    return (
                      <tr key={product.id} className="rp-row" style={{ transition: 'background 0.15s' }}>

                        {/* Product */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface3)', border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {thumbUrl
                                ? <img src={thumbUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                : <Package size={13} style={{ color: 'var(--text3)' }} />
                              }
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, fontSize: 13 }}>
                                {product.name}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>
                                  {(product as any).sku ? `SKU: ${(product as any).sku}` : `#${product.id}`}
                                </p>
                                {hasVariants && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', padding: '1px 5px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                    <Layers size={8} /> variants
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{(product as any).category?.name ?? '—'}</td>

                        {/* Price */}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text)', fontSize: 13 }}>
                          {Number(product.price).toFixed(3)} DT
                        </td>

                        {/* Stock */}
                        <td style={{ textAlign: 'right', fontWeight: 700, color: displayStock === 0 ? '#e74c3c' : displayStock <= 10 ? '#f39c12' : 'var(--text)' }}>
                          {displayStock}
                          {displayStock === 0 && <span style={{ fontSize: 10, marginLeft: 4, color: '#e74c3c' }}>(Out)</span>}
                          {displayStock > 0 && displayStock <= 10 && <span style={{ fontSize: 10, marginLeft: 4, color: '#f39c12' }}>(Low)</span>}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: product.is_active ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)', color: product.is_active ? '#27ae60' : '#e74c3c', border: `1px solid ${product.is_active ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.25)'}` }}>
                            {product.is_active ? <><CheckCircle size={8} />Active</> : <><XCircle size={8} />Inactive</>}
                          </span>
                        </td>

                        {/* Approval */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: product.is_approved ? 'rgba(52,152,219,0.12)' : 'rgba(243,156,18,0.12)', color: product.is_approved ? '#3498db' : '#f39c12', border: `1px solid ${product.is_approved ? 'rgba(52,152,219,0.25)' : 'rgba(243,156,18,0.25)'}` }}>
                            {product.is_approved ? <><CheckCircle size={8} />Approved</> : <><Clock size={8} />Pending</>}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button onClick={() => router.push(`/seller/products/${product.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, color: 'var(--text2)', transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#3498db'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'}
                              title="View">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => handleEdit(product)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, color: 'var(--text2)', transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f39c12'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'}
                              title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(product.id)} disabled={deleting === product.id} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, color: 'var(--text2)', opacity: deleting === product.id ? 0.4 : 1, transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'}
                              title="Delete">
                              {deleting === product.id
                                ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                        <Package size={28} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--text3)' }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: '0 0 4px' }}>No products found</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>Adjust your filters or add a new product</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.last_page > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                Showing {data.from}–{data.to} of {data.total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="ghost-btn" style={{ padding: '5px 8px', opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', padding: '0 6px' }}>
                  {data.current_page}/{data.last_page}
                </span>
                <button onClick={() => setPage(p => Math.min(data.last_page, p + 1))} disabled={page === data.last_page}
                  className="ghost-btn" style={{ padding: '5px 8px', opacity: page === data.last_page ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal(MODAL_CLOSED)}
          onSaved={() => { setModal(MODAL_CLOSED); fetchProducts(); }}
        />
      )}
    </>
  );
}