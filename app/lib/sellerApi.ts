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

// Attach auth token when available (swap for cookie strategy if needed)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error logging — extend for toast notifications if desired
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // redirect to login when auth is wired
      console.warn('[sellerApi] 401 Unauthorised');
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
  is_active?: string;       // 'true' | 'false' | ''
  is_approved?: string;     // 'true' | 'false' | ''
  category_id?: string;
  page?: number;
  per_page?: number;
};

export const productsApi = {
  getAll: (
    filters: ProductFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Product>>> =>
    api.get('/seller/products', { params: filters }).then((r) => r.data),

  getStats: (): Promise<ApiResponse<ProductStats>> =>
    api.get('/seller/products/stats').then((r) => r.data),

  getOne: (id: number): Promise<ApiResponse<Product>> =>
    api.get(`/seller/products/${id}`).then((r) => r.data),

  create: (
    payload: Partial<Product>
  ): Promise<ApiResponse<Product>> =>
    api.post('/seller/products', payload).then((r) => r.data),

  update: (
    id: number,
    payload: Partial<Product>
  ): Promise<ApiResponse<Product>> =>
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
  getAll: (
    filters: OrderFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Order>>> =>
    api.get('/seller/orders', { params: filters }).then((r) => r.data),

  getStats: (): Promise<ApiResponse<OrderStats>> =>
    api.get('/seller/orders/stats').then((r) => r.data),

  getOne: (id: number): Promise<ApiResponse<OrderDetail>> =>
    api.get(`/seller/orders/${id}`).then((r) => r.data),

  updateStatus: (
    id: number,
    status: string
  ): Promise<ApiResponse<Order>> =>
    api.patch(`/seller/orders/${id}/status`, { status }).then((r) => r.data),
};

export default api;