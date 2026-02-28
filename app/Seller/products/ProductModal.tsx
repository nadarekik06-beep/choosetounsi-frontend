'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  X, Upload, Trash2, Star, Loader2, AlertCircle,
  ImageIcon, GripVertical,
} from 'lucide-react';
import { productsApi, categoriesApi, storageUrl, type Category, type ProductPayload } from '@/lib/sellerApi';
import type { Product } from '@/types/seller';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingImage {
  id: number;
  url: string;
  image_path: string;
  is_primary: boolean;
  order: number;
}

interface PreviewImage {
  file: File;
  preview: string;
  id: string; // temporary client-side id
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Image Drop Zone ──────────────────────────────────────────────────────────

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

function ImageDropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length) onFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 border-2 border-dashed
        rounded-xl px-4 py-6 cursor-pointer transition-all select-none
        ${dragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload size={20} className="text-slate-400" />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-600">
          Drop images here or <span className="text-blue-600">browse</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          JPG, PNG, WebP · max 5 MB each · up to 8 images
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}

// ─── Image Thumbnail ──────────────────────────────────────────────────────────

interface ThumbProps {
  src: string;
  isPrimary: boolean;
  onRemove: () => void;
  onSetPrimary: () => void;
}

function ImageThumb({ src, isPrimary, onRemove, onSetPrimary }: ThumbProps) {
  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      <img src={src} alt="" className="w-full h-full object-cover" />

      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          Primary
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
        {!isPrimary && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSetPrimary(); }}
            title="Set as primary"
            className="p-1.5 rounded-lg bg-white/90 text-amber-500 hover:bg-white transition"
          >
            <Star size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove"
          className="p-1.5 rounded-lg bg-white/90 text-red-500 hover:bg-white transition"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300
   focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`;

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;

  // Form state
  const [form, setForm] = useState({
    name:              product?.name              ?? '',
    slug:              product?.slug              ?? '',
    sku:               product?.sku               ?? '',
    description:       product?.description       ?? '',
    short_description: product?.short_description ?? '',
    price:             product?.price?.toString() ?? '',
    stock:             product?.stock?.toString() ?? '',
    category_id:       product?.category_id?.toString() ?? '',
    is_active:         product?.is_active ?? true,
  });

  const [categories,     setCategories]     = useState<Category[]>([]);
  const [catLoading,     setCatLoading]     = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [apiError,       setApiError]       = useState('');

  // Existing images (edit mode)
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    (product as any)?.images?.map((img: any) => ({
      ...img,
      url: storageUrl(img.url ?? img.image_path) ?? img.image_path,
    })) ?? []
  );
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [primaryImageId,  setPrimaryImageId]  = useState<number | null>(
    existingImages.find((i) => i.is_primary)?.id ?? null
  );

  // New images to upload
  const [previews, setPreviews] = useState<PreviewImage[]>([]);

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Load categories
  useEffect(() => {
    categoriesApi.getAll()
      .then((res) => setCategories(res.data as unknown as Category[]))
      .catch(console.error)
      .finally(() => setCatLoading(false));
  }, []);

  // Auto-generate slug from name (only if slug is empty / untouched)
  const slugTouched = useRef(!!product?.slug);
  useEffect(() => {
    if (!slugTouched.current && form.name) {
      const slug = form.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      set('slug', slug);
    }
  }, [form.name]);

  // Cleanup preview object URLs on unmount
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  // ── Image handlers ────────────────────────────────────────────────────

  const totalImages = existingImages.length + previews.length;

  const handleNewFiles = (files: File[]) => {
    const remaining = 8 - totalImages;
    const toAdd = files.slice(0, remaining);
    const newPreviews: PreviewImage[] = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (id: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setDeletedImageIds((prev) => [...prev, id]);
    if (primaryImageId === id) {
      // Promote the first remaining image
      const next = existingImages.find((img) => img.id !== id);
      setPrimaryImageId(next?.id ?? null);
    }
  };

  const removePreview = (clientId: string) => {
    setPreviews((prev) => {
      const found = prev.find((p) => p.id === clientId);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((p) => p.id !== clientId);
    });
  };

  const setExistingPrimary = (id: number) => {
    setPrimaryImageId(id);
    setExistingImages((prev) =>
      prev.map((img) => ({ ...img, is_primary: img.id === id }))
    );
  };

  // ── Validation ────────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name        = 'Product name is required.';
    if (!form.category_id)        e.category_id = 'Please select a category.';
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)
                                  e.price       = 'Enter a valid price (≥ 0).';
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0)
                                  e.stock       = 'Enter a valid stock quantity (≥ 0).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setApiError('');

    try {
      const payload: ProductPayload = {
        name:              form.name.trim(),
        slug:              form.slug.trim() || undefined,
        sku:               form.sku.trim()  || undefined,
        description:       form.description.trim()       || null,
        short_description: form.short_description.trim() || null,
        price:             parseFloat(form.price),
        stock:             parseInt(form.stock, 10),
        category_id:       parseInt(form.category_id, 10),
        is_active:         form.is_active,
        images:            previews.map((p) => p.file),
        delete_image_ids:  deletedImageIds.length ? deletedImageIds : undefined,
      };

      if (isEdit) {
        await productsApi.update(product!.id, payload);
        // Update primary image if changed
        if (primaryImageId !== null) {
          const original = (product as any)?.images?.find((i: any) => i.is_primary);
          if (!original || original.id !== primaryImageId) {
            await productsApi.setPrimaryImage(product!.id, primaryImageId);
          }
        }
      } else {
        await productsApi.create(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      // Laravel validation errors
      if (data?.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(data.errors).forEach(([key, msgs]) => {
          mapped[key] = (msgs as string[])[0];
        });
        setErrors(mapped);
      } else {
        setApiError(
          data?.message ?? data?.error ?? 'Failed to save. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h2>
            {!isEdit && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Product will be reviewed by admin before going live.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">

          {/* API Error */}
          {apiError && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* ── Section: Basic Info ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">
              Basic Information
            </p>

            {/* Name */}
            <Field label="Product Name" required error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Handmade Pottery Mug"
                className={inputCls(errors.name)}
              />
            </Field>

            {/* Slug + SKU */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="URL Slug"
                hint="Auto-generated from name"
                error={errors.slug}
              >
                <input
                  value={form.slug}
                  onChange={(e) => {
                    slugTouched.current = true;
                    set('slug', e.target.value);
                  }}
                  placeholder="my-product-name"
                  className={inputCls(errors.slug)}
                />
              </Field>
              <Field
                label="SKU"
                hint="Auto-generated if empty"
                error={errors.sku}
              >
                <input
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className={inputCls(errors.sku)}
                />
              </Field>
            </div>

            {/* Short Description */}
            <Field label="Short Description" hint="Brief tagline shown in listings (max 500 chars)">
              <input
                value={form.short_description}
                onChange={(e) => set('short_description', e.target.value)}
                maxLength={500}
                placeholder="One-line product summary…"
                className={inputCls()}
              />
            </Field>

            {/* Description */}
            <Field label="Full Description">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe your product in detail…"
                className={`${inputCls()} resize-none`}
              />
            </Field>
          </div>

          {/* ── Section: Pricing & Inventory ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">
              Pricing & Inventory
            </p>

            <div className="grid grid-cols-3 gap-3">
              {/* Price */}
              <Field label="Price (TND)" required error={errors.price}>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="0.000"
                    className={`${inputCls(errors.price)} pr-12`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                    TND
                  </span>
                </div>
              </Field>

              {/* Stock */}
              <Field label="Stock" required error={errors.stock}>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  placeholder="0"
                  className={inputCls(errors.stock)}
                />
              </Field>

              {/* Status */}
              <Field label="Status">
                <select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => set('is_active', e.target.value === 'active')}
                  className={inputCls()}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            {/* Category */}
            <Field label="Category" required error={errors.category_id}>
              <select
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                className={inputCls(errors.category_id)}
                disabled={catLoading}
              >
                <option value="">
                  {catLoading ? 'Loading categories…' : '— Select a category —'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Section: Images ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Product Images
              </p>
              <span className="text-[11px] text-slate-400">
                {totalImages}/8 images
              </span>
            </div>

            {/* Existing images (edit mode) */}
            {existingImages.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 font-semibold mb-2">Current Images</p>
                <div className="grid grid-cols-4 gap-2">
                  {existingImages.map((img) => (
                    <ImageThumb
                      key={img.id}
                      src={img.url}
                      isPrimary={img.id === primaryImageId}
                      onRemove={() => removeExistingImage(img.id)}
                      onSetPrimary={() => setExistingPrimary(img.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* New image previews */}
            {previews.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 font-semibold mb-2">New Images</p>
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((p) => (
                    <ImageThumb
                      key={p.id}
                      src={p.preview}
                      isPrimary={existingImages.length === 0 && previews[0]?.id === p.id}
                      onRemove={() => removePreview(p.id)}
                      onSetPrimary={() => {/* new uploads: first = primary */}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Drop zone (only if under limit) */}
            {totalImages < 8 && (
              <ImageDropZone onFiles={handleNewFiles} disabled={saving} />
            )}

            {totalImages === 0 && (
              <p className="text-center text-[11px] text-slate-400 -mt-1">
                <ImageIcon size={11} className="inline mr-1" />
                No images yet — add some above
              </p>
            )}
          </div>

          {/* ── Approval notice ── */}
          {!isEdit && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3 text-xs text-amber-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Your product will be submitted for admin review and will go live once approved.
              </span>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || catLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}