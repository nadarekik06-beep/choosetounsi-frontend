import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchLocalized } from '@/lib/i18n/metadata'

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTranslations('packDetail')
  const json = await fetchLocalized<{ data?: { name?: string } }>(`/packs/${slug}`)
  return { title: json?.data?.name ?? t('metaTitle') }
}

export default function Layout({ children }: Props) {
  return children
}
