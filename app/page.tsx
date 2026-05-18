// app/page.tsx
// ADD RecommendedSection import and place it after SponsoredProductsSection.
// All other imports and components are UNCHANGED.

import Navbar from "./components/layout/Navbar";
import SponsoredProductsSection from "@/app/components/SponsoredProductsSection";
import HomeCategoryCarousel from "@/app/components/sections/HomeCategoryCarousel";
import AboveFoldProducts from "@/app/components/sections/AboveFoldProducts";
import HomeCtaSection from "@/app/components/sections/HomeCtaSection";
import FlashDealsSection from "@/app/components/sections/FlashDealsSection";
import BrandCollectionSection from "./components/sections/BrandCollectionSection";
import PacksSection from "./components/sections/PacksSection";
import RecommendedSection from "@/app/components/sections/RecommendedSection"; // ← NEW

export default function HomePage() {
  return (
    <main>
      <Navbar />

      {/* Sponsored trending products — global, no category filter */}
      <SponsoredProductsSection
        title="🔥 Trending Now"
        limit={8}
        layout="row"
        showBadge={true}
      />

      {/* NEW: Personalized feed — auth users get ranked recommendations,
           guests see popular products. Backend handles both cases. */}
      <RecommendedSection limit={16} />

      <HomeCategoryCarousel />
      <AboveFoldProducts />
      <FlashDealsSection />
      <PacksSection />
      <BrandCollectionSection />
      <HomeCtaSection />
    </main>
  );
}