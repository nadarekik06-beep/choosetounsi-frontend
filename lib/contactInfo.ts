// The one place for ChooseTounsi's public contact details (contact, privacy and terms pages).
//
// TODO(owner): choosetounsi.tn has no MX record (2026-10-20): mail sent to contact@choosetounsi.tn
// bounces until a mailbox (or forwarding) is set up for the domain. The backend contact form
// delivers to MAIL_CONTACT_TO (choosetounsi@gmail.com) meanwhile.

export const CONTACT_EMAIL = 'contact@choosetounsi.tn'
export const SUPPORT_GMAIL = 'choosetounsi@gmail.com'

export const WHATSAPP_DISPLAY = '+216 57 252 576'
export const WHATSAPP_URL = 'https://wa.me/21657252576'

export const COMPANY = {
  name: 'ChooseTounsi',
  city: 'Sfax',
  country: { fr: 'Tunisie', en: 'Tunisia', ar: 'تونس' },
} as const
