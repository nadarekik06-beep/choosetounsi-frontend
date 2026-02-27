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
  timeout: 15_000,
});

// Attach Bearer token — MUST match the key used in lib/auth.ts
// lib/auth.ts saves the token under 'ct_auth_token'
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ct_auth_token'); // ← fixed key
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — token expired/invalid → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Clear session and send to login
      localStorage.removeItem('ct_auth_token');
      localStorage.removeItem('ct_auth_user');
      document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getOverview: (): Promise<ApiResponse<DashboardData>> =>
    api.get('/seller/dashboard').then((r) => r.data),
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

export const productsApi = {
  getAll: (filters: ProductFilters = {}): Promise<ApiResponse<PaginatedResponse<Product>>> =>
    api.get('/seller/products', { params: filters }).then((r) => r.data),

  getStats: (): Promise<ApiResponse<ProductStats>> =>
    api.get('/seller/products/stats').then((r) => r.data),

  getOne: (id: number): Promise<ApiResponse<Product>> =>
    api.get(`/seller/products/${id}`).then((r) => r.data),

  create: (payload: Partial<Product>): Promise<ApiResponse<Product>> =>
    api.post('/seller/products', payload).then((r) => r.data),

  update: (id: number, payload: Partial<Product>): Promise<ApiResponse<Product>> =>
    api.put(`/seller/products/${id}`, payload).then((r) => r.data),

  delete: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/seller/products/${id}`).then((r) => r.data),
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