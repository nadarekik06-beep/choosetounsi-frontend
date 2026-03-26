import { Syne } from "next/font/google";
import "./globals.css";
import { CartProvider } from '@/context/CartContext'
import FlashToast from '@/components/FlashToast'
import CartDrawer from '@/components/CartDrawer'   // ✅ NEW

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

export const metadata = {
  title: "ChooseTounsi — Tunisia's #1 Multi-Vendor Marketplace",
  description: "Shop from hundreds of local Tunisian vendors. Fashion, electronics, home goods and more.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={syne.variable}>
      <body className="antialiased bg-white text-zinc-900">
        <CartProvider>
          {children}
          <FlashToast />
          <CartDrawer />   {/* ✅ Drawer lives here — available on every page */}
        </CartProvider>
      </body>
    </html>
  );
}