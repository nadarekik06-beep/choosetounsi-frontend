import { RouteLoading } from '@/components/brand/NavigationLoader'

// Holds the global navigation loader (one overlay, drawn by the root layout) while this route loads.
export default function Loading() {
  return <RouteLoading />
}
