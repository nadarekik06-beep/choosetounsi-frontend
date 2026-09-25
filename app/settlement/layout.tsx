import SellerMessagesProvider from '@/components/i18n/SellerMessagesProvider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SellerMessagesProvider>{children}</SellerMessagesProvider>
}
