import Hero from "@/components/Hero";
import SpecsRibbon from "@/components/SpecsRibbon";
import Performance from "@/components/Performance";
import Arsenal from "@/components/Arsenal";
import TournamentCalendarSection from "@/components/tournaments/TournamentCalendarSection";
import NtgStandard from "@/components/NtgStandard";
import VisitLounge from "@/components/VisitLounge";
import PlansAndHostSection from "@/components/passes/PlansAndHostSection";
import BirthdaySection from "@/components/BirthdaySection";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";
import LocalBusinessJsonLd from "@/components/seo/LocalBusinessJsonLd";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function MarketingHome() {
  return (
    <main id="main-content" className="relative min-h-screen">
      <LocalBusinessJsonLd />
      <Hero />
      <SpecsRibbon />
      <Performance />
      <Arsenal />
      <TournamentCalendarSection />
      <NtgStandard />
      <PlansAndHostSection />
      <BirthdaySection />
      <VisitLounge />
      <CtaBanner />
      <Footer />
    </main>
  );
}
