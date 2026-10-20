import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

// Personal links (token in the URL): never indexed, never sent as a referrer to other sites.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('unsubscribe')
  return { title: t('metaTitle'), robots: { index: false, follow: false }, referrer: 'no-referrer' }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
