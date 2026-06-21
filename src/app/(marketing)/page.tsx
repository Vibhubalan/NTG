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
import { prisma } from "@core/database/client";

export const dynamic = "force-dynamic";

export default async function MarketingHome() {
  const row = await prisma.homepageContent.findUnique({ where: { id: "singleton" } });
  const content = row?.content as any;

  return (
    <main id="main-content" className="relative min-h-screen">
      <LocalBusinessJsonLd />
      <Hero />
      <SpecsRibbon />
      <Performance 
        championshipSlides={content?.performance?.championshipSlides}
        auctionNightsImage={content?.performance?.auctionNightsImage}
      />
      <Arsenal />
      <TournamentVaultSection />
      <NtgStandard />
      <VisitLounge />
      <CtaBanner />
      <Footer />
    </main>
  );
}
