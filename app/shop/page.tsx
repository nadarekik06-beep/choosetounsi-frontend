import { fetchLocalized } from '@/lib/i18n/metadata'
import type { ShopOverview } from '@/lib/shopPageApi'
import ShopPage from './_components/ShopPage'

// Hero numbers, categories, sellers and deals are rendered on the server so the
// first paint is complete; the personal rows and the catalogue load in the browser.
export default async function Page() {
  const res = await fetchLocalized<{ data: ShopOverview }>('/shop/overview')
  return <ShopPage initialOverview={res?.data ?? null} />
}
