import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
// Self-hosted (app/fonts, built from google/fonts by subsetting to the same
// character sets next/font/google used): builds never need the internet.
import localFont from 'next/font/local'
import Navbar from '@/app/components/layout/Navbar'
import AboutHero from './_components/AboutHero'
import './_components/about.css'

// Display fonts used only on this page. The Arabic pair is attached (and downloaded) only for `ar`.
const fraunces = localFont({
  src: [
    { path: '../fonts/fraunces-latin.woff2', weight: '500 600', style: 'normal' },
    { path: '../fonts/fraunces-italic-latin.woff2', weight: '500 600', style: 'italic' },
  ],
  variable: '--ab-serif', display: 'swap',
})
const caveat = localFont({ src: '../fonts/caveat-latin.woff2', weight: '500 600', variable: '--ab-hand', display: 'swap' })
const amiri = localFont({ src: '../fonts/amiri-700-arabic.woff2', weight: '700', variable: '--ab-serif-ar', display: 'swap', preload: false })
const ruqaa = localFont({ src: '../fonts/aref-ruqaa-700-arabic.woff2', weight: '700', variable: '--ab-hand-ar', display: 'swap', preload: false })

const OG_LOCALE: Record<string, string> = { fr: 'fr_TN', ar: 'ar_TN', en: 'en_US' }
const OG_IMAGE = { url: '/images/about/about-1-together.jpg', width: 1200, height: 1600 }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about')
  const title = t('metaTitle')
  const description = t('metaDescription')
  const locale = await getLocale()
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: {
      type: 'website', siteName: 'ChooseTounsi', locale: OG_LOCALE[locale] ?? 'fr_TN',
      title, description, url: '/about', images: [{ ...OG_IMAGE, alt: t('alt1') }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  }
}

export default async function AboutPage() {
  const t = await getTranslations('about')
  const locale = await getLocale()
  const fonts = locale === 'ar'
    ? `${fraunces.variable} ${caveat.variable} ${amiri.variable} ${ruqaa.variable}`
    : `${fraunces.variable} ${caveat.variable}`

  const slides = [1, 2, 3, 4].map(n => ({
    name: ['about-1-together', 'about-2-proud', 'about-3-walking', 'about-4-next-chapter'][n - 1],
    alt: t(`alt${n}`),
  }))

  return (
    <div className={`ab ${fonts}`}>
      <Navbar />
      <main>
        <AboutHero
          slides={slides}
          text={{
            eyebrow: t('eyebrow'),
            headline: t('headline'),
            story: t('story'),
            signature: t('signature'),
            carousel: t('carousel'),
            pause: t('pause'),
            play: t('play'),
            slideLabels: slides.map((_, i) => t('slide', { n: i + 1, total: slides.length })),
            goTo: slides.map((_, i) => t('goTo', { n: i + 1 })),
          }}
        />
        <section className="ab-cta">
          <p className="ab-cta__line">{t('ctaLine')}</p>
          <div className="ab-cta__actions">
            <Link href="/become-a-vendor" className="ab-btn ab-btn--primary">{t('ctaVendor')}</Link>
            <Link href="/" className="ab-btn ab-btn--ghost">{t('ctaShop')}</Link>
          </div>
        </section>
      </main>
    </div>
  )
}
