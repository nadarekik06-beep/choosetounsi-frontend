import Navbar from "./components/layout/Navbar";
import SponsoredProductsSection from "@/app/components/SponsoredProductsSection";
import HomeCategoryCarousel from "@/app/components/sections/HomeCategoryCarousel";
import AboveFoldProducts from "@/app/components/sections/AboveFoldProducts";
import HomeCtaSection from "@/app/components/sections/HomeCtaSection";
import FlashDealsSection from "@/app/components/sections/FlashDealsSection";
import BrandCollectionSection from "./components/sections/BrandCollectionSection";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <SponsoredProductsSection
        title="🔥 Trending Now"
        limit={8}
        layout="row"
        showBadge={true}
      />
      <HomeCategoryCarousel />
      <AboveFoldProducts />
      <FlashDealsSection/>
      <BrandCollectionSection />
      
      <HomeCtaSection />
    </main>
  );
}
