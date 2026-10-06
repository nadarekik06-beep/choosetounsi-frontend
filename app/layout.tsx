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
import EntryPopup from '@/components/ads/EntryPopup';
import ProfileGate from '@/components/profile/ProfileGate';
import { NavigationLoaderProvider, NavigationLoaderHost } from '@/components/brand/NavigationLoader';

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
    // suppressHydrationWarning: browser extensions (toolbars, Grammarly, translators…) add
    // attributes/nodes to <html>/<body> before React hydrates. It only covers these two
    // elements' own attributes, not the app below them.
    <html lang={locale} dir={dirOf(locale)} className={fontClass} suppressHydrationWarning>
      <body className="antialiased text-zinc-900" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider>
            <CartProvider>
              <NavigationLoaderProvider>
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
                <EntryPopup />
                <ProfileGate />
                {/* fullscreen; the seller dashboard mounts its own over its content area */}
                <NavigationLoaderHost />
              </NavigationLoaderProvider>
            </CartProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
