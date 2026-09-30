import SellerMessagesProvider from '@/components/i18n/SellerMessagesProvider'
import SellerShell from './SellerShell'

// Runs before first paint so the page background already matches the saved seller
// theme while SellerShell waits for localStorage (no white flash for dark users).
// A <style> in <head> (not an attribute on <html>) keeps React hydration clean.
// SellerShell keeps it in sync afterwards — keep the id, key and colours aligned.
const THEME_BOOT = `try{var s=document.createElement('style');s.id='ct-seller-theme-bg';s.textContent='body{background:'+(localStorage.getItem('ct_seller_theme')==='light'?'#f0f2f5':'#0D1117')+'}';document.head.appendChild(s)}catch(e){}`

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerMessagesProvider>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <SellerShell>{children}</SellerShell>
    </SellerMessagesProvider>
  )
}
