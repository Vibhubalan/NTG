import Hero from "@/components/Hero";
import SpecsRibbon from "@/components/SpecsRibbon";
import Performance from "@/components/Performance";
import Arsenal from "@/components/Arsenal";
import TournamentVaultSection from "@/components/tournaments/TournamentVaultSection";
import NtgStandard from "@/components/NtgStandard";
import VisitLounge from "@/components/VisitLounge";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";
import LocalBusinessJsonLd from "@/components/seo/LocalBusinessJsonLd";

export const dynamic = "force-dynamic";

export default function MarketingHome() {
  return (
    <main id="main-content" className="relative min-h-screen">
      <LocalBusinessJsonLd />
      <Hero />
      <SpecsRibbon />
      <Performance />
      <Arsenal />
      <TournamentVaultSection />
      <NtgStandard />
      <VisitLounge />
      <CtaBanner />
      <Footer />
    </main>
  );
}
