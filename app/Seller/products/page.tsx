'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, storageUrl } from '@/lib/sellerApi';
import type { Product, PaginatedResponse } from '@/types/seller';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Loader2, Clock, Image as ImageIcon, Eye,
} from 'lucide-react';
import ProductModal from './ProductModal';
import { useTheme } from '../layout';

// ─── Modal state type ─────────────────────────────────────────────────────────
interface ModalState {
  open: boolean;
  product: Product | null;
}

// ─── Initial modal state — always CLOSED ─────────────────────────────────────
const MODAL_CLOSED: ModalState = { open: false, product: null };

export default function ProductsPage() {
  const router = useRouter();
  const { dark } = useTheme();

  const [data,       setData]       = useState<PaginatedResponse<Product> | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [isActive,   setIsActive]   = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<ModalState>(MODAL_CLOSED);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  // ── Close modal on Escape key ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.open) setModal(MODAL_CLOSED);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal.open]);

  // ── Fetch products ─────────────────────────────────────────────────────────
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
    } finally {
      setLoading(false);
    }
  }, [page, search, isActive, isApproved]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAddModal  = () => setModal({ open: true, product: null });
  const closeModal    = () => setModal(MODAL_CLOSED);
  const handleSaved   = () => { closeModal(); fetchProducts(); };

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

  // ── Theme ──────────────────────────────────────────────────────────────────
  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : '#94a3b8';
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .product-row:hover td { background: ${rowHover} !important; }
        .act-btn:hover { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
              Products
            </h1>
            <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>
              Manage your store listings
            </p>
          </div>
          <button
            onClick={openAddModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              background: 'linear-gradient(135deg,#db142e,#a00f22)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              borderRadius: 12, border: 'none', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(219,20,46,0.35)',
            }}
          >
            <Plus size={15} /> Add Product
          </button>
        </div>

        {/* Filters */}
        <div style={{
          background: cardBg, borderRadius: 16, padding: 16,
          border: `1px solid ${border}`,
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or SKU…"
              style={{ ...inputStyle, width: '100%', paddingLeft: 32 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={13} style={{ color: textMuted, flexShrink: 0 }} />
            <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select value={isApproved} onChange={e => { setIsApproved(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">All Approvals</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
          </div>
          {data && (
            <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, marginLeft: 'auto' }}>
              {data.total} product{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
              <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#db142e' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: theadBg }}>
                    {['Product', 'Category', 'Price', 'Stock', 'Status', 'Approval', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 20px',
                        fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: textMuted,
                        textAlign: ['Price', 'Stock'].includes(h) ? 'right'
                          : ['Status', 'Approval', 'Actions'].includes(h) ? 'center'
                          : 'left',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map(product => (
                    <tr key={product.id} className="product-row" style={{ borderTop: `1px solid ${border}` }}>

                      {/* Product */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                            border: `1px solid ${border}`,
                            flexShrink: 0, overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {(product as any).primary_image_url ? (
                              <img
                                src={storageUrl((product as any).primary_image_url) ?? ''}
                                alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ImageIcon size={14} style={{ color: textMuted, opacity: 0.5 }} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              fontWeight: 800, color: textMain,
                              margin: '0 0 2px',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: 180,
                            }}>
                              {product.name}
                            </p>
                            <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>
                              {(product as any).sku ? `SKU: ${(product as any).sku}` : `ID #${product.id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 500, color: textMuted }}>
                        {(product as any).category?.name ?? '—'}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 900, color: textMain }}>
                        {Number(product.price).toFixed(3)} TND
                      </td>

                      {/* Stock */}
                      <td style={{
                        padding: '12px 20px', textAlign: 'right', fontWeight: 800,
                        color: product.stock === 0 ? '#ef4444' : product.stock <= 10 ? '#f59e0b' : textMain,
                      }}>
                        {product.stock}
                        {product.stock === 0 && <span style={{ fontSize: 10, marginLeft: 4, color: '#ef4444' }}>(Out)</span>}
                        {product.stock > 0 && product.stock <= 10 && <span style={{ fontSize: 10, marginLeft: 4, color: '#f59e0b' }}>(Low)</span>}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                          background: product.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: product.is_active ? '#10b981' : '#ef4444',
                          border: `1px solid ${product.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        }}>
                          {product.is_active
                            ? <><CheckCircle size={9} />Active</>
                            : <><XCircle size={9} />Inactive</>}
                        </span>
                      </td>

                      {/* Approval */}
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                          background: product.is_approved ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                          color: product.is_approved ? '#3b82f6' : '#f59e0b',
                          border: `1px solid ${product.is_approved ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        }}>
                          {product.is_approved
                            ? <><CheckCircle size={9} />Approved</>
                            : <><Clock size={9} />Pending</>}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            onClick={() => router.push(`/seller/products/${product.id}`)}
                            className="act-btn"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#94a3b8', opacity: 0.7, transition: 'all 0.15s ease' }}
                            title="View"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="act-btn"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#94a3b8', opacity: 0.7, transition: 'all 0.15s ease' }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="act-btn"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#94a3b8', opacity: deleting === product.id ? 0.4 : 0.7, transition: 'all 0.15s ease' }}
                            title="Delete"
                          >
                            {deleting === product.id
                              ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                              : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                        <Package size={28} style={{ margin: '0 auto 10px', display: 'block', color: textMuted, opacity: 0.4 }} />
                        <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: '0 0 4px' }}>No products found</p>
                        <p style={{ fontSize: 11, color: textMuted, opacity: 0.6, margin: 0 }}>
                          Try adjusting your filters or add a new product
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.last_page > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: `1px solid ${border}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                Showing {data.from}–{data.to} of {data.total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 800, color: textMain, padding: '0 4px' }}>
                  {data.current_page}/{data.last_page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
                  disabled={page === data.last_page}
                  style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === data.last_page ? 0.4 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal — only rendered when open === true ── */}
      {modal.open && (
        <ProductModal
          product={modal.product}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}