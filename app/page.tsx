import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/Hero";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      {/* Next sections coming: Categories, Why Choose Us, Featured Products */}
    </main>
  );
}