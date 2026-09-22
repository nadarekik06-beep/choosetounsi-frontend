'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi, storageUrl } from '@/lib/sellerApi';
import type { Product, ProductImage } from '@/types/seller';
import {
  ArrowLeft, Eye, Package, Tag, Layers, BarChart2,
  Calendar, Clock, Edit2, CheckCircle, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, Star, Hash, FileText,
} from 'lucide-react';
import ProductModal from '../ProductModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductDetail extends Product {
  updated_at: string;
  views: number;
  featured: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getImageUrl(image: ProductImage): string {
  if (image.url) return storageUrl(image.url) ?? '';
  return storageUrl(image.image_path) ?? '';
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ product }: { product: ProductDetail }) {
  if (!product.is_active) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">
        <XCircle size={12} /> Inactive
      </span>
    );
  }
  if (!product.is_approved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
        <AlertTriangle size={12} /> Pending Approval
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle size={12} /> Approved & Active
    </span>
  );
}

// ─── Stock Badge ───────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Out of Stock</span>;
  }
  if (stock < 10) {
    return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Low Stock</span>;
  }
  return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">In Stock</span>;
}

// ─── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: ProductImage[] }) {
  const [selected, setSelected] = useState(0);

  if (!images.length) {
    return (
      <div className="aspect-square w-full max-w-lg mx-auto rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
        <Package size={40} className="text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">No images uploaded</p>
      </div>
    );
  }

  const current = images[selected];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm group">
        <img
          src={getImageUrl(current)}
          alt="Product"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
        {current.is_primary && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-600 text-white shadow">
              <Star size={9} fill="currentColor" /> Primary
            </span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelected((s) => Math.max(0, s - 1))}
              disabled={selected === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setSelected((s) => Math.min(images.length - 1, s + 1))}
              disabled={selected === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}
        <div className="absolute bottom-3 right-3 text-[10px] font-bold bg-black/40 text-white px-2 py-1 rounded-full backdrop-blur-sm">
          {selected + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition flex-shrink-0
                ${i === selected
                  ? 'border-rose-500 shadow-md shadow-rose-100'
                  : 'border-slate-200 hover:border-slate-300'}`}
            >
              <img
                src={getImageUrl(img)}
                alt={`Thumb ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {img.is_primary && (
                <div className="absolute inset-0 bg-rose-500/10" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, valueClass = '' }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 mt-0.5 ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = Number(params.id);

  const [product,   setProduct]   = useState<ProductDetail | null>(null);
  const [allImages, setAllImages] = useState<ProductImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await productsApi.getOne(id);
      const data = (res as any).data ?? res;

      // Merge product-level images + all variant images into one flat array
      const productImgs: ProductImage[] = (data.images ?? []).map((img: any) => ({
        ...img,
        url: img.url ?? img.image_path,
      }));

      const variantImgs: ProductImage[] = [];
      if (Array.isArray(data.variant_rows)) {
        data.variant_rows.forEach((v: any) => {
          if (Array.isArray(v.images)) {
            v.images.forEach((img: any) => {
              variantImgs.push({
                ...img,
                url: img.url ?? img.image_path,
              });
            });
          }
        });
      }

      // Use product images if they exist, otherwise fall back to variant images
      const merged = productImgs.length > 0 ? productImgs : variantImgs;

      // Sort: primary first, then by order
      merged.sort((a: ProductImage, b: ProductImage) =>
        Number(b.is_primary) - Number(a.is_primary) || (a.order ?? 0) - (b.order ?? 0)
      );

      setAllImages(merged);
      setProduct(data as ProductDetail);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load product.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  const handleSaved = useCallback(() => {
    setModalOpen(false);
    fetchProduct();
  }, [fetchProduct]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-rose-500" />
          <p className="text-sm font-semibold text-slate-400">Loading product…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <Package size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-800">{error ?? 'Product not found'}</p>
          <p className="text-sm text-slate-400 mt-1">This product may have been deleted or doesn't belong to you.</p>
        </div>
        <button
          onClick={() => router.push('/seller/products')}
          className="flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700"
        >
          <ArrowLeft size={14} /> Back to Products
        </button>
      </div>
    );
  }

  const stockColor = product.stock === 0
    ? 'text-red-600'
    : product.stock < 10
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── Breadcrumb / Back ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/seller/products')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 font-semibold transition"
          >
            <ArrowLeft size={14} />
            Products
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 active:scale-95 transition shadow-lg shadow-rose-500/25"
        >
          <Edit2 size={13} />
          <span className="hidden sm:inline">Edit Product</span>
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

        {/* Left — Images + Descriptions */}
        <div className="space-y-5">

          {/* Image Gallery Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <ImageGallery images={allImages} />
          </div>

          {/* Descriptions */}
          {(product.short_description || product.description) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">

              {product.short_description && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText size={14} className="text-rose-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Short Description</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {product.short_description}
                  </p>
                </div>
              )}

              {product.description && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText size={14} className="text-rose-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Description</h3>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — Details Sidebar */}
        <div className="space-y-4">

          {/* Product Header Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <StatusBadge product={product} />
              {product.featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  <Star size={9} fill="currentColor" /> Featured
                </span>
              )}
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 leading-tight mb-2">
              {product.name}
            </h1>

            {product.slug && (
              <p className="text-xs text-slate-400 font-mono mb-4">/{product.slug}</p>
            )}

            <div className="flex items-end justify-between gap-3 pt-3 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                <p className="text-3xl font-black text-slate-900">
                  {Number(product.price).toFixed(3)}
                  <span className="text-base font-bold text-slate-400 ml-1">TND</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Stock</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className={`text-2xl font-black ${stockColor}`}>{product.stock}</p>
                  <StockBadge stock={product.stock} />
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Details</h3>

            <InfoRow
              icon={Layers}
              label="Category"
              value={product.category?.name ?? '—'}
            />
            <InfoRow
              icon={Hash}
              label="SKU"
              value={product.sku ?? <span className="text-slate-300 font-normal italic">Not set</span>}
              valueClass="font-mono"
            />
            <InfoRow
              icon={Tag}
              label="Product ID"
              value={`#${product.id}`}
              valueClass="font-mono"
            />
            <InfoRow
              icon={Eye}
              label="Views"
              value={`${(product.views ?? 0).toLocaleString()} view${product.views !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon={BarChart2}
              label="Images"
              value={`${allImages.length} image${allImages.length !== 1 ? 's' : ''}`}
            />
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Status</h3>

            {/* Status rows — clean space-y-2.5 with no interruptions */}
            <div className="space-y-2.5">

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center">
                    <CheckCircle size={11} className="text-slate-400" />
                  </div>
                  Active
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  product.is_active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {product.is_active ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center">
                    <CheckCircle size={11} className="text-slate-400" />
                  </div>
                  Admin Approval
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  product.is_approved
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {product.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center">
                    <Star size={11} className="text-slate-400" />
                  </div>
                  Featured
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  product.featured
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {product.featured ? 'Yes' : 'No'}
                </span>
              </div>

            </div>

            {/* ── Rejection Reason — outside space-y-2.5 so row spacing is undisturbed ── */}
            {!product.is_approved && (product as any).rejection_reason && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      {(product as any).rejection_reason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Timeline</h3>

            <InfoRow
              icon={Calendar}
              label="Created"
              value={product.created_at ? formatDateTime(product.created_at) : '—'}
            />
            <InfoRow
              icon={Clock}
              label="Last Updated"
              value={product.updated_at ? formatDateTime(product.updated_at) : '—'}
            />
          </div>

        </div>
      </div>

      {/* ── ProductModal ── */}
      {modalOpen && (
        <ProductModal
          product={product as unknown as Product}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}