import { Suspense } from 'react'
import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('orderTrack', 'hub.title')

// Suspense: the page reads ?order= with useSearchParams()
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
