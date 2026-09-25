import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchLocalized } from '@/lib/i18n/metadata'

type Props = { params: Promise<{ id: string }>; children: React.ReactNode }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('storefront')
  const json = await fetchLocalized<{ data?: { business_name?: string } }>(`/sellers/${id}`)
  return { title: json?.data?.business_name ?? t('metaTitle') }
}

export default function Layout({ children }: Props) {
  return children
}
