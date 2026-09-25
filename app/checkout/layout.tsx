import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('checkout')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
