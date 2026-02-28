'use client';

import { useEffect, useState, useCallback } from 'react';
import { productsApi, storageUrl } from '@/lib/sellerApi';
import type { Product, PaginatedResponse } from '@/types/seller';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Loader2, Clock, Image as ImageIcon,
} from 'lucide-react';
import ProductModal from './ProductModal';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [data,       setData]       = useState<PaginatedResponse<Product> | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [isActive,   setIsActive]   = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleting, setDeleting] = useState<number | null>(null);

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
      // silently fail per-action
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

  // ── Open edit — fetch fresh product with images ────────────────────
  const handleEdit = async (product: Product) => {
    try {
      const res = await productsApi.getOne(product.id);
      setModal({ open: true, product: res.data as unknown as Product });
    } catch {
      setModal({ open: true, product });
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Products</h1>
          <p className="text-xs text-slate-400 font-medium">Manage your store listings</p>
        </div>
        <button
          onClick={() => setModal({ open: true, product: null })}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/25"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or SKU…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 flex-shrink-0" />
          <select
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600
              focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            value={isApproved}
            onChange={(e) => { setIsApproved(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600
              focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
          >
            <option value="">All Approvals</option>
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </select>
        </div>

        {data && (
          <span className="text-xs font-semibold text-slate-400 ml-auto">
            {data.total} product{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                  {['Product', 'Category', 'Price', 'Stock', 'Status', 'Approval', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 font-bold ${
                        ['Price', 'Stock'].includes(h)         ? 'text-right' :
                        ['Status', 'Approval', 'Actions'].includes(h) ? 'text-center' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.data.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors group">

                    {/* Product */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                          {(product as any).primary_image_url ? (
                            <img
                              src={storageUrl((product as any).primary_image_url) ?? ''}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={14} className="text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">{product.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(product as any).sku ? `SKU: ${(product as any).sku}` : `ID #${product.id}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">
                      {(product as any).category?.name ?? '—'}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-extrabold text-slate-900 text-xs">
                        {Number(product.price).toFixed(3)} TND
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-bold text-xs ${
                        product.stock === 0 ? 'text-red-500' :
                        product.stock <= 10 ? 'text-amber-500' :
                                              'text-slate-700'
                      }`}>
                        {product.stock}
                        {product.stock === 0 && (
                          <span className="ml-1 text-[10px] font-bold text-red-400">(Out)</span>
                        )}
                        {product.stock > 0 && product.stock <= 10 && (
                          <span className="ml-1 text-[10px] font-bold text-amber-400">(Low)</span>
                        )}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${product.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'}`}
                      >
                        {product.is_active
                          ? <><CheckCircle size={9} /> Active</>
                          : <><XCircle    size={9} /> Inactive</>}
                      </span>
                    </td>

                    {/* Approval */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${product.is_approved
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'}`}
                      >
                        {product.is_approved
                          ? <><CheckCircle size={9} /> Approved</>
                          : <><Clock size={9} /> Pending</>}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deleting === product.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === product.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <Package size={28} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-400">No products found</p>
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your filters or add a new product</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">
              Showing {data.from}–{data.to} of {data.total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-600 px-1">
                {data.current_page} / {data.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
                disabled={page === data.last_page}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal({ open: false, product: null })}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}