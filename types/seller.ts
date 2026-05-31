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
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  views: number;
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
  user?: { id: number; name: string };
}

export interface DashboardData {
  summary: SellerSummary;
  charts: { monthly_revenue: MonthlyDataPoint[] };
  order_status_distribution: OrderStatusDistribution;
  top_clients: TopClient[];
  top_wilayas: TopWilaya[];
  top_products: TopProduct[];
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
  rejection_reason?: string | null;
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
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'delivered'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod = 'cod' | 'card' | 'd17' | 'wallet';

/**
 * PRIVACY UPDATE: email intentionally removed.
 * Sellers only see customer name — email is private customer data
 * and is stripped server-side in SellerOrderController.
 */
export interface Customer {
  id?: number;
  name: string;
  // email: INTENTIONALLY OMITTED
  state?: string | null;
}

export interface Order {
  id: number;
  user_id: number;
  user?: Customer;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  wilaya: string | null;
  created_at: string;
}

/**
 * A single attribute on a variant, e.g. { slug: 'color', label: 'Color', value: 'Red', color_hex: '#ff0000' }
 */
export interface VariantAttribute {
  slug: string;
  label: string;
  value: string;
  color_hex: string | null;
}

/**
 * UPDATED: OrderItem now includes variant details for the seller.
 * All variant fields are nullable for backward compat with
 * items that have no variant (simple products).
 */
export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  price: number;
  total: number;

  // Variant fields (null for simple products)
  variant_id: number | null;
  variant_label: string | null;
  variant_attributes: VariantAttribute[];   // [{ slug, label, value, color_hex }]
  variant_image_url: string | null;
  // ── Commission snapshot fields (null for legacy orders) ──────────────
  has_commission: boolean;
  commission_percentage: number | null;  // e.g. 12 (stored as %)
  commission_amount: number | null;      // platform fee in TND
  seller_amount: number | null;          // what seller receives in TND
  plan_used: 'free' | 'red' | 'black' | null;
is_returned?: boolean
  item_status?: 'returned' | 'exchanged' | null
}
// ── Commission summary for the order detail modal ────────────────────────────
export interface OrderCommissionSummary {
  has_commission: boolean;
  total_gross: number;
  total_commission_amount: number | null;  // null for legacy orders
  total_seller_net: number | null;         // null for legacy orders
}

export interface OrderDetail {
  order: Order & { customer: Customer };
  items: OrderItem[];
  seller_subtotal: number;
  commission: OrderCommissionSummary;
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