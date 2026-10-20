import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalPage'
import { TERMS } from '@/lib/legal/terms'
import { isLocale, defaultLocale } from '@/i18n/config'

// TODO(legal): text in lib/legal/terms.ts is a draft to review against Tunisian law (e-commerce, consumer protection, 2004-63).

async function doc() {
  const locale = await getLocale()
  return TERMS[isLocale(locale) ? locale : defaultLocale]
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await doc()
  return { title: d.title, description: d.intro, alternates: { canonical: '/terms' } }
}

export default async function TermsPage() {
  return <LegalDocument doc={await doc()} current="terms" />
}
