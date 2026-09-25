import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchLocalized } from '@/lib/i18n/metadata'

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTranslations('product')
  const json = await fetchLocalized<{ data?: { name?: string; short_description?: string | null } }>(`/products/${slug}`)
  const name = json?.data?.name
  if (!name) return { title: t('metaFallbackTitle') }
  return {
    title: name,
    description: json?.data?.short_description || t('metaDescription', { name }),
  }
}

export default function Layout({ children }: Props) {
  return children
}
