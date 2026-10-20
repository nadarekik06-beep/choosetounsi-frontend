// app/page.tsx
// Personalized rows (recommended, sponsored, trending, similar, favourites,
// favourite sellers, recently viewed — or cold-start rows for guests) come from
// a single deduplicated /api/home/feed call rendered by HomeFeed.

import Navbar from "./components/layout/Navbar";
import HomeFeed from "@/app/components/home/HomeFeed";
import HomeCategoryCarousel from "@/app/components/sections/HomeCategoryCarousel";
import DualCTASection from "@/app/components/home/DualCTASection";
import FlashDealsSection from "@/app/components/sections/FlashDealsSection";
import BrandCollectionSection from "./components/sections/BrandCollectionSection";
import PacksSection from "./components/sections/PacksSection";
import { SITE_ORIGIN } from "@/lib/constants";

// Organization + WebSite structured data: gives Google the brand name and logo for results.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: "ChooseTounsi",
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/icon-512.png`, width: 512, height: 512 },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      name: "ChooseTounsi",
      url: SITE_ORIGIN,
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Navbar />
      <HomeFeed />
      <HomeCategoryCarousel />
      <FlashDealsSection />
      <PacksSection />
      <BrandCollectionSection />
      <DualCTASection />
    </main>
  );
}
