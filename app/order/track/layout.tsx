import type { Metadata } from 'next'
import { staticMeta } from '@/lib/i18n/metadata'

const meta = staticMeta('orderTrack')

// Personal order pages: never indexed.
export async function generateMetadata(): Promise<Metadata> {
  return { ...(await meta()), robots: { index: false, follow: false } }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
