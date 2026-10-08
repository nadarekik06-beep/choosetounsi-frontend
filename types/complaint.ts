/**
 * Returns ("réclamations"). The only resolution is return + refund — a client
 * who wants another item simply reorders. Legacy exchange records stay readable.
 *
 *   requested → seller_accepted | seller_rejected (→ escalated)
 *             → admin_approved → pickup_scheduled → picked_up
 *             → returned_to_seller (received & inspected) → refunded
 *   terminal: rejected | cancelled | closed
 */

export type ComplaintStatus =
  | 'requested'
  | 'seller_accepted'
  | 'seller_rejected'
  | 'escalated'
  | 'admin_approved'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'returned_to_seller'
  | 'refunded'
  | 'rejected'
  | 'cancelled'
  | 'closed'

export type ComplaintType =
  | 'wrong_product'
  | 'wrong_size'
  | 'wrong_color'
  | 'damaged_product'
  | 'other'

/** Legacy only: 'exchange' can't be requested any more. */
export type ResolutionType = 'return_refund' | 'exchange'

/** cash = paid back by the courier at pick-up (cash on delivery orders) */
export type RefundMethod = 'cash' | 'wallet' | 'bank_transfer' | 'd17' | 'original'

export type ItemCondition = 'resaleable' | 'damaged'

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  wrong_product:   'Wrong product received',
  wrong_size:      'Wrong size',
  wrong_color:     'Wrong color',
  damaged_product: 'Damaged / defective product',
  other:           'Other (specify below)',
}

/** Reasons where the seller is at fault → the seller pays the return shipping. */
export const SELLER_FAULT_TYPES: ComplaintType[] = ['wrong_product', 'wrong_size', 'wrong_color', 'damaged_product']

/** Colors per status (labels come from the `returns.status` translations). */
export const STATUS_CONFIG: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  requested:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '⏳' },
  seller_accepted:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: '👍' },
  seller_rejected:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: '✋' },
  escalated:          { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: '⚖️' },
  admin_approved:     { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  icon: '✅' },
  pickup_scheduled:   { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: '📅' },
  picked_up:          { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: '🚚' },
  returned_to_seller: { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  icon: '📦' },
  refunded:           { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '💸' },
  rejected:           { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '❌' },
  cancelled:          { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '⊘' },
  closed:             { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '✔' },
}

export const statusConfig = (s: string) =>
  STATUS_CONFIG[s as ComplaintStatus] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '•' }

/** One attribute of the bought variant, frozen at checkout. */
export interface PurchasedVariantAttribute {
  option_id?: number
  slug:       string
  label:      string
  value:      string
  color_hex:  string | null
}

/**
 * An order line exactly as bought (backend OrderItem::purchaseSnapshot):
 * image, name, variant and price come from the order, never the live product.
 * image_url null → show a placeholder.
 */
export interface PurchasedItem {
  id:                 number            // order_item_id — what a return selects
  order_id?:          number
  product_id?:        number | null
  variant_id?:        number | null
  product_name:       string
  variant_label:      string | null     // "Rouge / M"
  variant_attributes?: PurchasedVariantAttribute[]
  quantity:           number            // as ordered
  returned_quantity?: number
  return_state?:      'returned' | 'partially_returned' | null
  unit_price:         number
  total?:             number
  image_url:          string | null
}

export interface EligibleOrderItem extends PurchasedItem {
  returnable_quantity: number   // units still returnable (minus live returns)
  paid_unit_price:     number   // after coupon / flash price — what a unit refunds
}

export interface EligibleOrder {
  id:             number
  order_number:   string
  payment_method: string
  delivered_at:   string
  hours_left:     number
  days_left:      number
  total_amount:   number
  items:          EligibleOrderItem[]
}

/** A returned line: as bought + what this return covers. */
export interface ComplaintOrderItem extends PurchasedItem {
  return_quantity?:    number
  return_unit_price?:  number
  return_amount?:      number
  condition?:          ItemCondition | null
  restocked_quantity?: number
}

export interface ComplaintOrder {
  id:              number
  order_number:    string
  total_amount:    number
  status:          string
  return_status?:  'partial' | 'full' | null
  payment_method?: string
  created_at?:     string
  wilaya?:         string
  address?:        string
  phone?:          string
}

export interface ComplaintUser {
  id:    number
  name:  string
  email: string
}

export interface TimelineStep {
  key:     string
  status:  string
  at:      string | null
  done:    boolean
  current: boolean
  skipped: boolean
}

export interface ReturnEvent {
  status:     string
  at:         string
  note:       string | null
  method?:    RefundMethod | null
  reference?: string | null
}

export interface Complaint {
  id:                  number
  reference:           string | null
  user_id:             number
  order_id:            number
  order_item_ids:      number[] | null
  seller_id:           number | null
  complaint_type:      ComplaintType
  resolution_type:     ResolutionType | null
  return_scope:        'full' | 'partial' | null
  shipping_payer:      'seller' | 'client' | null
  return_shipping_fee: number | string
  items_amount:        number | string
  refund_amount:       number | string
  refund_method:       RefundMethod | null
  refund_reference:    string | null
  other_reason:        string | null
  description:         string
  image_path:          string | null
  image_url:           string | null
  image_urls:          string[]
  status:              ComplaintStatus
  can_escalate:        boolean
  cash_refund?:        boolean   // COD: the courier pays the client back in cash at pick-up
  rejection_reason:    string | null
  seller_note:         string | null
  seller_decision:     'approved' | 'rejected' | null
  seller_decided_at:   string | null
  escalated_at:        string | null
  pickup_scheduled_at: string | null
  picked_up_at:        string | null
  received_at:         string | null
  refunded_at:         string | null
  reviewed_at:         string | null
  resolved_at:         string | null
  created_at:          string
  updated_at:          string
  order?:              ComplaintOrder
  user?:               ComplaintUser
  seller?:             ComplaintUser
  complained_items?:   ComplaintOrderItem[]
  timeline?:           TimelineStep[]
  public_events?:      ReturnEvent[]
  refund_status?:      'pending' | 'assigned' | 'picked_up' | 'completed' | null
  refund_task_id?:     number | null
}

export interface ReturnLineInput {
  order_item_id: number
  quantity:      number
}

export interface ComplaintFormPayload {
  order_id:       number
  complaint_type: ComplaintType
  other_reason?:  string
  description:    string
  images:         File[]
  return_all?:    boolean
  items?:         ReturnLineInput[]
}
