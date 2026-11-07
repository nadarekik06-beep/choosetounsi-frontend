import { redirect } from 'next/navigation'

// The lookup moved to /track-order (orders saved on this phone + lookup).
export default function LegacyFindOrderPage() {
  redirect('/track-order')
}
