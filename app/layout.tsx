import type { Metadata, Viewport } from "next";
import { Fragment } from "react";
import { Syne, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { withoutSellerMessages } from "@/lib/i18n/messageScopes";
import "./globals.css";
import { dirOf, type Locale } from "@/i18n/config";
import { SITE_ORIGIN } from "@/lib/constants";
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/components/i18n/LanguageSwitcher';
import FlashToast from '@/components/FlashToast';
import CartDrawer from '@/components/CartDrawer';
import SupportChatWidget from '@/components/SupportChatWidget';
import SiteFooter from '@/components/layout/SiteFooter';
import ReviewPromptPopup from '@/app/components/reviews/ReviewPromptPopup';
import EntryPopup from '@/components/ads/EntryPopup';
import { NavigationLoaderProvider, NavigationLoaderHost } from '@/components/brand/NavigationLoader';
import Script from 'next/script';
import AuthSync from '@/components/auth/AuthSync';
import { SELLER_THEME_BOOT } from '@/app/seller/themeBoot';

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
  themeColor: "#db142e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const OG_LOCALE: Record<Locale, string> = { fr: "fr_TN", ar: "ar_TN", en: "en_US" };

// Icons come from the file conventions: app/favicon.ico, app/icon.png, app/apple-icon.png (+ app/manifest.ts).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = (await getLocale()) as Locale;
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: title, template: `%s | ChooseTounsi` },
    description,
    applicationName: "ChooseTounsi",
    openGraph: {
      type: "website",
      siteName: "ChooseTounsi",
      locale: OG_LOCALE[locale] ?? "fr_TN",
      title,
      description,
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "ChooseTounsi" }],
    },
    twitter: { card: "summary", title, description, images: ["/icon-512.png"] },
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
        <Script id="ct-seller-theme-boot" strategy="beforeInteractive">{SELLER_THEME_BOOT}</Script>
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
                {/* role / seller status: re-read from the API, no logout needed */}
                <AuthSync />
                <FlashToast />
                <CartDrawer />
                <SupportChatWidget />
                <ReviewPromptPopup />
                <EntryPopup />
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
