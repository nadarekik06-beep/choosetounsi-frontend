// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface SellerSummary {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  total_products: number;
  active_products: number;
  pending_product_approvals: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_growth: number;
}

export interface MonthlyDataPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopClient {
  id: number;
  name: string;
  email: string;
  state: string | null;
  total_revenue: number;
  total_orders: number;
}

export interface TopWilaya {
  wilaya: string;
  revenue: number;
  orders: number;
}

/* ── NEW: Top Products ── */
export interface TopProduct {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  is_approved: boolean;
  primary_image_url: string | null;
  category_name: string | null;
  total_sales: number;       // units sold across all orders
  total_revenue: number;     // revenue generated
  total_orders: number;      // number of distinct orders containing this product
  views: number;             // product view count (if tracked)
}

export type OrderStatusDistribution = Record<string, number>;

export interface RecentOrder {
  id: number;
  user_id: number;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  user?: { id: number; name: string; email: string };
}

export interface DashboardData {
  summary: SellerSummary;
  charts: { monthly_revenue: MonthlyDataPoint[] };
  order_status_distribution: OrderStatusDistribution;
  top_clients: TopClient[];
  top_wilayas: TopWilaya[];
  top_products: TopProduct[];   // ← NEW
  recent_orders: RecentOrder[];
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
}

export interface ProductImage {
  id: number;
  url?: string;
  image_path: string;
  is_primary: boolean;
  order: number;
}

export interface Product {
  id: number;
  seller_id: number;
  category_id: number;
  category?: Category;
  name: string;
  slug?: string;
  sku?: string;
  description: string | null;
  short_description?: string | null;
  price: number;
  stock: number;
  is_approved: boolean;
  is_active: boolean;
  images?: ProductImage[];
  primary_image_url?: string | null;
  views?: number;
  created_at: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  approved: number;
  pending_approval: number;
  total_stock: number;
  out_of_stock: number;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'delivered'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Customer {
  id: number;
  name: string;
  email: string;
  state: string | null;
}

export interface Order {
  id: number;
  user_id: number;
  user?: Customer;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  wilaya: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderDetail {
  order: Order & { customer: Customer };
  items: OrderItem[];
  seller_subtotal: number;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  delivered: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ─── API wrapper ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}