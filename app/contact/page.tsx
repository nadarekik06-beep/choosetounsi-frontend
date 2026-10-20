import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Mail, MessageCircle } from 'lucide-react'
import { InfoShell } from '@/components/legal/LegalPage'
import ContactForm from '@/components/legal/ContactForm'
import { SUPPORT_GMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '@/lib/contactInfo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contactPage')
  return { title: t('metaTitle'), description: t('intro'), alternates: { canonical: '/contact' } }
}

export default async function ContactPage() {
  const t = await getTranslations('contactPage')
  return (
    <InfoShell current="contact" eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')}>
      <div className="lg-contact">
        <aside className="lg-card">
          <h2>{t('channels.title')}</h2>
          <p>{t('channels.subtitle')}</p>
          <div className="lg-channels">
            <a className="lg-channel" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <span className="lg-channel__icon lg-channel__icon--wa"><MessageCircle size={20} aria-hidden="true" /></span>
              <span>
                <span className="lg-channel__label">{t('channels.whatsapp')}</span>
                <span className="lg-channel__value">{WHATSAPP_DISPLAY}</span>
              </span>
            </a>
            {/* contact@choosetounsi.tn cannot receive mail yet (no MX record): show the inbox that works */}
            <a className="lg-channel" href={`mailto:${SUPPORT_GMAIL}`}>
              <span className="lg-channel__icon lg-channel__icon--mail"><Mail size={20} aria-hidden="true" /></span>
              <span>
                <span className="lg-channel__label">{t('channels.email')}</span>
                <span className="lg-channel__value">{SUPPORT_GMAIL}</span>
              </span>
            </a>
          </div>
          <p className="lg-note">{t('channels.hours')}</p>
          <p className="lg-note">
            {t.rich('channels.orders', {
              orders: chunks => <Link href="/orders">{chunks}</Link>,
              complaints: chunks => <Link href="/complaints">{chunks}</Link>,
            })}
          </p>
        </aside>
        <ContactForm />
      </div>
    </InfoShell>
  )
}
