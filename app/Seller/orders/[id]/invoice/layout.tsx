/**
 * app/seller/orders/[id]/invoice/layout.tsx
 *
 * Standalone layout — opts out of the seller dashboard shell completely.
 * This means: no sidebar, no top navbar, no theme providers that inject
 * dashboard chrome. The invoice page renders in a clean white browser tab.
 *
 * Next.js App Router layout nesting works by proximity: the closest layout
 * to the route wins. By defining a layout HERE (at the invoice route level),
 * we override the parent seller layout for this route only.
 */

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}