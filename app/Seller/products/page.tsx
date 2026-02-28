'use client';

import { useEffect, useState, useCallback } from 'react';
import { productsApi }  from '@/lib/sellerApi';
import type { Product, PaginatedResponse } from '@/types/seller';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  X, Loader2, AlertCircle,
} from 'lucide-react';

// ─── Product Form Modal ───────────────────────────────────────────────────────

interface ModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ product, onClose, onSaved }: ModalProps) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    name:        product?.name        ?? '',
    description: product?.description ?? '',
    price:       product?.price?.toString()       ?? '',
    stock:       product?.stock?.toString()       ?? '',
    category_id: product?.category_id?.toString() ?? '',
    is_active:   product?.is_active   ?? true,
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())          e.name        = 'Product name is required.';
    if (!form.category_id.trim())   e.category_id = 'Category ID is required.';
    if (isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Valid price required.';
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) e.stock = 'Valid stock required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        price:       parseFloat(form.price),
        stock:       parseInt(form.stock, 10),
        category_id: parseInt(form.category_id, 10),
        is_active:   form.is_active,
      };
      if (isEdit) {
        await productsApi.update(product!.id, payload);
      } else {
        await productsApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setApiError(
        err?.response?.data?.message ??
        err?.response?.data?.error   ??
        'Failed to save. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Product Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Handmade Pottery Mug"
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300
                focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition
                ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe your product…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300
                focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition resize-none"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Price (TND) *
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition
                  ${errors.price ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Stock *
              </label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition
                  ${errors.stock ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Category ID *
              </label>
              <input
                type="number"
                min="1"
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                placeholder="e.g. 3"
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition
                  ${errors.category_id ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Status
              </label>
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => set('is_active', e.target.value === 'active')}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [data,       setData]       = useState<PaginatedResponse<Product> | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [isActive,   setIsActive]   = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [deleting,   setDeleting]   = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({
        page,
        per_page: 12,
        ...(search     && { search }),
        ...(isActive   && { is_active: isActive }),
        ...(isApproved && { is_approved: isApproved }),
      });
      setData(res.data as PaginatedResponse<Product>);
    } catch {
      // error handled per-action
    } finally {
      setLoading(false);
    }
  }, [page, search, isActive, isApproved]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      await productsApi.delete(id);
      fetch();
    } finally {
      setDeleting(null);
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
            placeholder="Search by name…"
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
                        ['Price', 'Stock'].includes(h) ? 'text-right' :
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
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                          <Package size={15} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">{product.name}</p>
                          <p className="text-[10px] text-slate-400">ID #{product.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">
                      {product.category?.name ?? `Cat. #${product.category_id}`}
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
                        product.stock === 0   ? 'text-red-500' :
                        product.stock <= 10   ? 'text-amber-500' :
                                                'text-slate-700'
                      }`}>
                        {product.stock}
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
                      <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${product.is_approved
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'}`}
                      >
                        {product.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModal({ open: true, product })}
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
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
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
          onSaved={fetch}
        />
      )}
    </div>
  );
}