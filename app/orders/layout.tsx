import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('orders')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
