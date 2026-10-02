import { Barlow, Barlow_Condensed } from 'next/font/google'
import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('discover')

// Same type as /become-a-vendor, self-hosted by next/font (no render-blocking @import)
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-barlow', display: 'swap' })
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-barlow-c', display: 'swap' })

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${barlow.variable} ${barlowCondensed.variable}`}>{children}</div>
}
