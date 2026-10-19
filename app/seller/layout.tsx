import SellerMessagesProvider from '@/components/i18n/SellerMessagesProvider'
import SellerShell from './SellerShell'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerMessagesProvider>
      <SellerShell>{children}</SellerShell>
    </SellerMessagesProvider>
  )
}
