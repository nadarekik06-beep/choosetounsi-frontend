import type { Metadata, Viewport } from "next";
import { Fragment } from "react";
import { Syne, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { withoutSellerMessages } from "@/lib/i18n/messageScopes";
import "./globals.css";
import { dirOf, type Locale } from "@/i18n/config";
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/components/i18n/LanguageSwitcher';
import FlashToast from '@/components/FlashToast';
import CartDrawer from '@/components/CartDrawer';
import SupportChatWidget from '@/components/SupportChatWidget';
import SiteFooter from '@/components/layout/SiteFooter';
import ReviewPromptPopup from '@/app/components/reviews/ReviewPromptPopup';

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

// Arabic typeface — only attached (and therefore only downloaded) for `ar`.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  preload: false,
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: `%s | ChooseTounsi` },
    description: t("description"),
    icons: { icon: "/favicon.ico" },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = withoutSellerMessages(await getMessages());
  const fontClass = locale === "ar" ? `${syne.variable} ${cairo.variable}` : syne.variable;

  return (
    <html lang={locale} dir={dirOf(locale)} className={fontClass}>
      <body className="antialiased text-zinc-900">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider>
            <CartProvider>
              {/* Keyed by locale: switching language remounts the page so it
                  refetches API content in the new language (cart/session live
                  in providers above and are kept). */}
              <Fragment key={locale}>
                {children}
                <SiteFooter />
              </Fragment>
              <FlashToast />
              <CartDrawer />
              <SupportChatWidget />
              <ReviewPromptPopup />
            </CartProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
