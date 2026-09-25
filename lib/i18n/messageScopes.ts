// Message namespaces that only the seller area needs. The root layout leaves them out of the
// client payload so storefront pages stay light; seller pages add them with their own provider.
export const SELLER_NAMESPACES = ['seller', 'invoice', 'settlement'] as const

export function withoutSellerMessages<T extends Record<string, unknown>>(messages: T): Partial<T> {
  const out: Record<string, unknown> = { ...messages }
  for (const ns of SELLER_NAMESPACES) delete out[ns]
  return out as Partial<T>
}
