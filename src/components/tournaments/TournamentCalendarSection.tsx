import { listTournamentPreviews } from "@/modules/tournaments-leagues/application/tournament.service";
import TournamentCalendar from "@/components/platform/TournamentCalendar";
import { sortTournamentsByHostingOrderNewestFirst } from "@/lib/tournament-display";
import type { TournamentPreview } from "@core/contracts";
import TournamentCalendarHeader from "@/components/tournaments/TournamentCalendarHeader";

export default async function TournamentCalendarSection() {
  let scheduleTournaments: TournamentPreview[] = [];
  try {
    const tournaments = await listTournamentPreviews();
    scheduleTournaments = sortTournamentsByHostingOrderNewestFirst(
      tournaments.filter((t) => t.status !== "DRAFT" && t.status !== "CANCELLED")
    );
  } catch (error) {
    console.error("Failed to load tournaments for landing calendar:", error);
  }

  if (scheduleTournaments.length === 0) return null;

  return (
    <section id="calendar" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/3 top-1/2 h-[50vh] w-[50vh] rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.08),transparent_65%)] blur-3xl" />
      </div>
      <TournamentCalendarHeader />
      <TournamentCalendar tournaments={scheduleTournaments} defaultToToday={true} />
    </section>
  );
}
