import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import TournamentListFiltered from "@/components/platform/TournamentListFiltered";
import { listTournamentPreviews } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cups",
};

export default async function EsportsTournamentsPage() {
  const tournaments = await listTournamentPreviews();

  return (
    <>
      <PlatformHeader
        eyebrow="Tournaments"
        title="Every cup we've run"
        subtitle="Filter by upcoming or completed. Tap a cup for prizepool, results, and registration."
      />
      <TournamentListFiltered tournaments={tournaments} />
    </>
  );
}
