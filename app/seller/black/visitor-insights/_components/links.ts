/**
 * Where an Analyse des visiteurs action button goes: the existing flow, pre-filled.
 * `insight` / `problem` / `stage` travel along so the flow can record the action
 * when it is really applied (discount, boost: the API; listing edit, restock: the
 * products page after the save) — then "Résultats de vos actions" shows before/after.
 *
 * Price decreases always go through a discount, never a direct price edit.
 */
import type { FunnelStage, InsightAction, ProblemCode } from '@/lib/blackPepperApi';

export function insightActionHref(productId: number, a: InsightAction, problem: ProblemCode, stage: FunnelStage): string {
  const track = { insight: productId, problem, stage };
  const q = (o: Record<string, string | number | undefined>) =>
    new URLSearchParams(Object.entries({ ...o, ...track }).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  switch (a.kind) {
    case 'discount':
      return `/seller/promotions?${q({ create: 'discount', product: productId, discount_type: 'percentage', discount_value: a.pct ?? 10 })}`;
    case 'boost':
      return `/seller/promote/new?${q({ product_id: productId })}`;
    case 'restock':
      return `/seller/products?${q({ restock: productId })}`;
    case 'ai_description':
      // The AI description generator lives in the product form's description section
      return `/seller/products?${q({ edit: productId, focus: 'description' })}`;
    case 'listing_quality':
      return `/seller/black/listing-quality?product=${productId}`;
    case 'edit':
    default:
      // "shipping" = the delivery fee / free-delivery switch, in the form's pricing section
      return `/seller/products?${q({ edit: productId, focus: a.focus === 'shipping' ? 'price' : a.focus ?? 'description' })}`;
  }
}

/** Read back on the products page: which product / problem the save fixes. */
export function insightFromUrl(q: URLSearchParams): { productId: number; problem: string | null; stage: string | null } | null {
  const productId = Number(q.get('insight'));
  return productId > 0 ? { productId, problem: q.get('problem'), stage: q.get('stage') } : null;
}
