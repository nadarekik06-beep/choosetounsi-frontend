// app/page.tsx
// Personalized rows (recommended, sponsored, trending, similar, favourites,
// favourite sellers, recently viewed — or cold-start rows for guests) come from
// a single deduplicated /api/home/feed call rendered by HomeFeed.

import Navbar from "./components/layout/Navbar";
import HomeFeed from "@/app/components/home/HomeFeed";
import HomeCategoryCarousel from "@/app/components/sections/HomeCategoryCarousel";
import HomeCtaSection from "@/app/components/sections/HomeCtaSection";
import FlashDealsSection from "@/app/components/sections/FlashDealsSection";
import BrandCollectionSection from "./components/sections/BrandCollectionSection";
import PacksSection from "./components/sections/PacksSection";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HomeFeed />
      <HomeCategoryCarousel />
      <FlashDealsSection />
      <PacksSection />
      <BrandCollectionSection />
      <HomeCtaSection />
    </main>
  );
}
