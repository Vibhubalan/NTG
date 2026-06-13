import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpecsRibbon from "@/components/SpecsRibbon";
import Performance from "@/components/Performance";
import Arsenal from "@/components/Arsenal";
import TournamentVault from "@/components/TournamentVault";
import NtgStandard from "@/components/NtgStandard";
import VisitLounge from "@/components/VisitLounge";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Hero />
      <SpecsRibbon />
      <Performance />
      <Arsenal />
      <TournamentVault />
      <NtgStandard />
      <VisitLounge />
      <CtaBanner />
      <Footer />
    </main>
  );
}
