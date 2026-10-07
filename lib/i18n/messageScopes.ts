// Message namespaces that only the seller area needs. The root layout leaves them out of the
// client payload so storefront pages stay light; seller pages add them with their own provider.
export const SELLER_NAMESPACES = ['seller', 'invoice', 'settlement'] as const

// Seller sub-namespaces that storefront components also render (the Navbar's NotificationBell
// uses `seller.bell`), so they stay in the root payload.
const SHARED_SELLER_KEYS = ['bell'] as const

export function withoutSellerMessages<T extends Record<string, unknown>>(messages: T): Partial<T> {
  const out: Record<string, unknown> = { ...messages }
  for (const ns of SELLER_NAMESPACES) delete out[ns]

  const seller = messages.seller as Record<string, unknown> | undefined
  if (seller) {
    const kept: Record<string, unknown> = {}
    for (const key of SHARED_SELLER_KEYS) if (key in seller) kept[key] = seller[key]
    if (Object.keys(kept).length) out.seller = kept
  }
  return out as Partial<T>
}
