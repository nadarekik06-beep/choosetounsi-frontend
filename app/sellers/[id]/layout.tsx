import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { fetchLocalized } from '@/lib/i18n/metadata'
import { parseSellerId, siteUrl, storeUrl } from '@/lib/storeLink'

type Props = { params: Promise<{ id: string }>; children: React.ReactNode }

interface SellerMeta {
  id: number
  business_name?: string
  business_description?: string | null
  avatar?: string | null
  cover_photo?: string | null
}

const STORAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')

function absoluteImage(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${STORAGE_BASE}/storage/${path.replace(/^\/?storage\//, '').replace(/^\//, '')}`
}

/** Origin of this request — only used when NEXT_PUBLIC_SITE_URL is missing. */
async function requestOrigin(): Promise<string | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return null
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

const OG_LOCALE: Record<string, string> = { fr: 'fr_TN', ar: 'ar_TN', en: 'en_US' }

// Rendered on the server, so Facebook / WhatsApp / X crawlers get the store's preview card.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: segment } = await params
  const t = await getTranslations('storefront')
  const id = parseSellerId(segment)
  const json = id ? await fetchLocalized<{ data?: SellerMeta }>(`/sellers/${id}`) : null
  const seller = json?.data
  if (!seller?.business_name) return { title: t('metaTitle'), robots: { index: false } }

  const origin = await requestOrigin()
  const name = seller.business_name
  const url = storeUrl(seller.id, name, origin)
  const description = (seller.business_description?.trim() || t('metaDescription', { name })).replace(/\s+/g, ' ').slice(0, 200)
  // The banner is the right shape for link previews; the logo is the fallback
  const cover = absoluteImage(seller.cover_photo)
  const image = cover ?? absoluteImage(seller.avatar)
  const images = image ? [{ url: image, alt: name }] : undefined

  return {
    ...(siteUrl(origin) ? { metadataBase: new URL(siteUrl(origin)) } : {}),
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'ChooseTounsi',
      locale: OG_LOCALE[await getLocale()] ?? 'fr_TN',
      url,
      title: name,
      description,
      images,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: name,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default function Layout({ children }: Props) {
  return children
}
