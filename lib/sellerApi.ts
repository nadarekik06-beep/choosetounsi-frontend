import axios from 'axios';
import type {
  ApiResponse,
  DashboardData,
  PaginatedResponse,
  Product,
  ProductStats,
  Order,
  OrderDetail,
  OrderStats,
} from '@/types/seller';

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ct_auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ct_auth_token');
      localStorage.removeItem('ct_auth_user');
      document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

// ─── Storage URL helper ───────────────────────────────────────────────────────
// Converts Laravel storage paths to full URLs pointing to the backend (port 8000)
// Fixes images loading from :3000 (Next.js) instead of :8000 (Laravel)

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  .replace(/\/api$/, '')

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const clean = path.replace(/^\/storage\//, '').replace(/^\//, '')
  return `${BASE}/storage/${clean}`
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getOverview: (): Promise<ApiResponse<DashboardData>> =>
    api.get('/seller/dashboard').then((r) => r.data),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  name_ar?: string;
  slug: string;
  icon?: string;
  image?: string;
}

export const categoriesApi = {
  getAll: (): Promise<ApiResponse<Category[]>> =>
    api.get('/categories').then((r) => r.data),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductFilters = {
  search?: string;
  is_active?: string;
  is_approved?: string;
  category_id?: string;
  page?: number;
  per_page?: number;
};

export type ProductPayload = {
  name: string;
  description?: string | null;
  short_description?: string | null;
  price: number;
  stock: number;
  category_id: number;
  sku?: string | null;
  slug?: string | null;
  is_active?: boolean;
  images?: File[];
  delete_image_ids?: number[];
};

function buildFormData(payload: ProductPayload, isUpdate = false): FormData {
  const fd = new FormData();

  if (isUpdate) {
    fd.append('_method', 'PUT');
  }

  fd.append('name', payload.name);
  fd.append('price', String(payload.price));
  fd.append('stock', String(payload.stock));
  fd.append('category_id', String(payload.category_id));
  fd.append('is_active', payload.is_active ? '1' : '0');

  if (payload.description != null) fd.append('description', payload.description);
  if (payload.short_description != null) fd.append('short_description', payload.short_description);
  if (payload.sku) fd.append('sku', payload.sku);
  if (payload.slug) fd.append('slug', payload.slug);

  if (payload.images?.length) {
    payload.images.forEach((file) => fd.append('images[]', file));
  }

  if (payload.delete_image_ids?.length) {
    payload.delete_image_ids.forEach((id) =>
      fd.append('delete_image_ids[]', String(id))
    );
  }

  return fd;
}

export const productsApi = {
  getAll: (filters: ProductFilters = {}): Promise<ApiResponse<PaginatedResponse<Product>>> =>
    api.get('/seller/products', { params: filters }).then((r) => r.data),

  getStats: (): Promise<ApiResponse<ProductStats>> =>
    api.get('/seller/products/stats').then((r) => r.data),

  getOne: (id: number): Promise<ApiResponse<Product>> =>
    api.get(`/seller/products/${id}`).then((r) => r.data),

  create: (payload: ProductPayload): Promise<ApiResponse<Product>> => {
    const fd = buildFormData(payload);
    return api.post('/seller/products', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  update: (id: number, payload: ProductPayload): Promise<ApiResponse<Product>> => {
    const fd = buildFormData(payload, true);
    return api.post(`/seller/products/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  delete: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/seller/products/${id}`).then((r) => r.data),

  deleteImage: (productId: number, imageId: number): Promise<ApiResponse<null>> =>
    api.delete(`/seller/products/${productId}/images/${imageId}`).then((r) => r.data),

  setPrimaryImage: (productId: number, imageId: number): Promise<ApiResponse<null>> =>
    api.patch(`/seller/products/${productId}/images/${imageId}/primary`).then((r) => r.data),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderFilters = {
  search?: string;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

export const ordersApi = {
  getAll: (filters: OrderFilters = {}): Promise<ApiResponse<PaginatedResponse<Order>>> =>
    api.get('/seller/orders', { params: filters }).then((r) => r.data),

  getStats: (): Promise<ApiResponse<OrderStats>> =>
    api.get('/seller/orders/stats').then((r) => r.data),

  getOne: (id: number): Promise<ApiResponse<OrderDetail>> =>
    api.get(`/seller/orders/${id}`).then((r) => r.data),

  updateStatus: (id: number, status: string): Promise<ApiResponse<Order>> =>
    api.patch(`/seller/orders/${id}/status`, { status }).then((r) => r.data),
};

export default api;