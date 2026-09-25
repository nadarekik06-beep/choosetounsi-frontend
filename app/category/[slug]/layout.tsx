import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchLocalized } from '@/lib/i18n/metadata'

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTranslations('category')
  const json = await fetchLocalized<{ data?: { slug: string; name: string }[] }>('/categories')
  const name = json?.data?.find(c => c.slug === slug)?.name ?? slug.replace(/-/g, ' ')
  return { title: t('metaTitle', { name }), description: t('metaDescription', { name }) }
}

export default function Layout({ children }: Props) {
  return children
}
