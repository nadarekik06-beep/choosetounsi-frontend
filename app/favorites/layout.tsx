import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('favorites')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
