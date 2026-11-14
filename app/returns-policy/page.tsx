import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalPage'
import { RETURNS_POLICY } from '@/lib/legal/returnsPolicy'
import { MADE_BY } from '@/lib/legal/madeBy'
import { isLocale, defaultLocale } from '@/i18n/config'

async function lang() {
  const locale = await getLocale()
  return isLocale(locale) ? locale : defaultLocale
}

async function doc() {
  return RETURNS_POLICY[await lang()]
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await doc()
  return { title: d.title, description: d.intro, alternates: { canonical: '/returns-policy' } }
}

export default async function ReturnsPolicyPage() {
  return <LegalDocument doc={await doc()} madeBy={MADE_BY[await lang()]} current="returns" />
}
