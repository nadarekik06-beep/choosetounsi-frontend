// Self-hosted (app/fonts, built from google/fonts by subsetting to the same
// character sets next/font/google used): builds never need the internet.
import localFont from 'next/font/local'
import { staticMeta } from '@/lib/i18n/metadata'

export const generateMetadata = staticMeta('discover')

// Same type as /become-a-vendor, self-hosted by next/font (no render-blocking @import)
const barlow = localFont({
  src: [
    { path: '../fonts/barlow-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/barlow-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/barlow-600-latin.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/barlow-700-latin.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/barlow-800-latin.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-barlow', display: 'swap',
})
const barlowCondensed = localFont({
  src: [
    { path: '../fonts/barlow-condensed-700-latin.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/barlow-condensed-800-latin.woff2', weight: '800', style: 'normal' },
    { path: '../fonts/barlow-condensed-900-latin.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-barlow-c', display: 'swap',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${barlow.variable} ${barlowCondensed.variable}`}>{children}</div>
}
