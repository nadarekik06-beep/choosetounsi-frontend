import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalPage'
import { TERMS } from '@/lib/legal/terms'
import { MADE_BY } from '@/lib/legal/madeBy'
import { isLocale, defaultLocale } from '@/i18n/config'

// TODO(legal): text in lib/legal/terms.ts is a draft to review against Tunisian law (e-commerce, consumer protection, 2004-63).

async function lang() {
  const locale = await getLocale()
  return isLocale(locale) ? locale : defaultLocale
}

async function doc() {
  return TERMS[await lang()]
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await doc()
  return { title: d.title, description: d.intro, alternates: { canonical: '/terms' } }
}

export default async function TermsPage() {
  return <LegalDocument doc={await doc()} madeBy={MADE_BY[await lang()]} current="terms" />
}
