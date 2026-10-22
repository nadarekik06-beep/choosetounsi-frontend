import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { LegalDocument } from '@/components/legal/LegalPage'
import { PRIVACY } from '@/lib/legal/privacy'
import { MADE_BY } from '@/lib/legal/madeBy'
import { isLocale, defaultLocale } from '@/i18n/config'

// TODO(legal): the text in lib/legal/privacy.ts must be reviewed against Tunisian law (loi organique 2004-63, INPDP).

async function lang() {
  const locale = await getLocale()
  return isLocale(locale) ? locale : defaultLocale
}

async function doc() {
  return PRIVACY[await lang()]
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await doc()
  return { title: d.title, description: d.intro, alternates: { canonical: '/privacy' } }
}

export default async function PrivacyPage() {
  return <LegalDocument doc={await doc()} madeBy={MADE_BY[await lang()]} current="privacy" />
}
