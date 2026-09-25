import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

/** Gives the seller area (dashboard, invoice, settlement) the full message catalog. */
export default async function SellerMessagesProvider({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
}
